// New Email/Password Authentication endpoints
// Separate from existing Replit OAuth (server/replitAuth.ts)
import { Express, RequestHandler } from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { storage } from './storage';
import { db } from './db';
import { users, coaches, clubs, authorizedInvitations, emailVerificationTokens, passwordResetTokens } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { hashPassword, verifyPassword } from './passwordUtils';
import { generateSecureToken, getInvitationExpiry, getVerificationExpiry, getPasswordResetExpiry, isTokenExpired } from './tokenUtils';
import { sendInvitationEmail, sendVerificationEmail, sendPasswordResetEmail } from './emailService';
import { getUncachableStripeClient, syncSubscriptionQuantity } from './stripeClient';
import crypto from 'crypto';

/**
 * Setup new email/password authentication routes
 * These are separate from the existing Replit OAuth routes
 */
export function setupNewAuth(app: Express) {
  // Trust proxy for secure cookies in production (Replit runs behind reverse proxy)
  // This allows Express to recognize HTTPS connections via X-Forwarded-Proto header
  app.set('trust proxy', 1);
  
  // Initialize PostgreSQL session store
  const PgSession = connectPgSimple(session);
  
  // Configure session middleware
  const sessionStore = new PgSession({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    // Suppress console errors during table creation (they're harmless)
    errorLog: (error: string) => {
      // Only log real errors, not "already exists" errors
      if (!error.includes('already exists')) {
        console.error('Session store error:', error);
      }
    },
  });
  
  app.use(
    session({
      store: sessionStore,
      secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      },
    })
  );
  
  // Register endpoint - validates invitation token and creates user account
  app.post('/api/auth/register', async (req, res) => {
    // Declare invitation outside try block so catch can access it for rollback
    let invitation: any = null;
    
    try {
      const { inviteToken, password, passwordConfirm, email } = req.body;
      
      // Validate required fields
      if (!inviteToken || !password || !passwordConfirm || !email) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      
      // Validate password confirmation
      if (password !== passwordConfirm) {
        return res.status(400).json({ message: 'Passwords do not match' });
      }
      
      // Validate password strength
      if (password.length < 12) {
        return res.status(400).json({ message: 'Password must be at least 12 characters' });
      }
      
      // Password complexity check: must contain at least one uppercase, lowercase, number, and special char
      const hasUppercase = /[A-Z]/.test(password);
      const hasLowercase = /[a-z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
      
      if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
        return res.status(400).json({ 
          message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character' 
        });
      }
      
      // Find invitation by token
      invitation = await storage.getInvitationByToken(inviteToken);
      
      if (!invitation) {
        return res.status(400).json({ message: 'Invalid invitation token' });
      }
      
      // Check if invitation is expired
      if (isTokenExpired(invitation.expiresAt)) {
        return res.status(400).json({ message: 'Invitation has expired' });
      }
      
      // CRITICAL: Verify email matches invitation BEFORE claiming
      // This prevents invitation from being stuck in 'processing' if email doesn't match
      if (invitation.email.toLowerCase() !== email.toLowerCase()) {
        return res.status(400).json({ message: 'Email does not match invitation' });
      }
      
      // CRITICAL: Atomically claim the invitation (only succeeds if status='pending')
      // This prevents race conditions where multiple requests try to use the same invitation
      try {
        await storage.claimInvitation(invitation.id);
      } catch (error) {
        // Claim failed - reload invitation to check current status and provide helpful message
        const currentInvitation = await storage.getInvitationByToken(inviteToken);
        
        if (!currentInvitation) {
          return res.status(400).json({ message: 'Invitation not found' });
        }
        
        if (currentInvitation.status === 'accepted') {
          // Invitation was already successfully used - this is a retry
          return res.status(400).json({ 
            message: 'This invitation has already been used. If you created an account, please log in.' 
          });
        }
        
        if (currentInvitation.status === 'expired' || currentInvitation.status === 'revoked') {
          return res.status(400).json({ 
            message: `Invitation is ${currentInvitation.status}. Please contact an administrator.` 
          });
        }
        
        if (currentInvitation.status === 'processing') {
          // Invitation is stuck in processing from a previous failed attempt
          // Revert it to pending so user can retry
          try {
            await storage.revertInvitationToPending(currentInvitation.id);
            return res.status(400).json({ 
              message: 'Previous registration attempt failed. Please try again.' 
            });
          } catch (revertError) {
            return res.status(500).json({ 
              message: 'Invitation is being processed. Please wait a moment and try again.' 
            });
          }
        }
        
        // Unknown status or other error
        return res.status(400).json({ message: 'Invitation is not available for use' });
      }
      
      // Check if user already exists (outside transaction)
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        // Revert invitation back to pending
        await storage.revertInvitationToPending(invitation.id);
        return res.status(400).json({ message: 'User already exists' });
      }
      
      // Get coach details for the user (outside transaction)
      const coach = await storage.getCoach(invitation.coachId);
      if (!coach) {
        // Revert invitation back to pending
        await storage.revertInvitationToPending(invitation.id);
        return res.status(400).json({ message: 'Coach profile not found' });
      }
      
      // Hash password (CPU-intensive, do outside transaction)
      const passwordHash = await hashPassword(password);
      
      // Generate user ID
      const userId = crypto.randomUUID();
      
      // CRITICAL: Execute all database mutations in a single atomic transaction
      // If any step fails, entire transaction rolls back (including invitation claim)
      const result = await db.transaction(async (tx) => {
        // Development mode: Auto-activate accounts to simplify testing
        const isDevelopment = process.env.NODE_ENV === 'development';
        
        // Create user account
        const [user] = await tx.insert(users).values({
          id: userId,
          email: email.toLowerCase(),
          firstName: coach.firstName,
          lastName: coach.lastName,
          passwordHash,
          isEmailVerified: isDevelopment, // Auto-verify in development
          accountStatus: isDevelopment ? 'active' : 'pending', // Auto-activate in development
          role: 'coach',
        }).returning();
        
        // Link user to coach profile
        await tx.update(coaches)
          .set({ userId: user.id })
          .where(eq(coaches.id, invitation.coachId));
        
        // Mark invitation as accepted
        await tx.update(authorizedInvitations)
          .set({ status: 'accepted', acceptedAt: new Date() })
          .where(eq(authorizedInvitations.id, invitation.id));
        
        // Generate and store email verification token
        const verificationToken = generateSecureToken();
        await tx.insert(emailVerificationTokens).values({
          userId: user.id,
          token: verificationToken,
          expiresAt: getVerificationExpiry(),
        });
        
        return { user, verificationToken };
      });
      
      // Send verification email (non-fatal - if this fails, user can request new verification email later)
      // Skip in development mode since account is auto-verified
      const isDevelopment = process.env.NODE_ENV === 'development';
      let emailSent = false;
      
      if (!isDevelopment) {
        try {
          await sendVerificationEmail(result.user.email!, result.verificationToken, result.user.firstName!);
          emailSent = true;
        } catch (emailError: any) {
          console.error('Failed to send verification email:', emailError);
          emailSent = false;
          // TODO: Queue email for retry or alert admins
          // For now, log the failure and continue - user account is created successfully
        }
      }
      
      // Return success - account was created even if email failed
      res.status(201).json({ 
        message: isDevelopment 
          ? 'Registration successful! Your account is ready (development mode: auto-verified).'
          : emailSent 
            ? 'Registration successful. Please check your email to verify your account.'
            : 'Registration successful, but we could not send the verification email. Please contact support.',
        userId: result.user.id,
        emailSent,
      });
      
    } catch (error: any) {
      console.error('Registration error:', error);
      
      // CRITICAL: Only revert invitation if transaction failed (status is still 'processing')
      // If transaction succeeded (status='accepted'), don't revert - user account exists
      if (invitation?.id) {
        try {
          // This will only revert if status is currently 'processing'
          // If transaction succeeded, invitation is 'accepted' and this is a no-op
          await storage.revertInvitationToPending(invitation.id);
          console.log('Reverted invitation to pending after transaction failure');
        } catch (revertError) {
          console.error('Failed to revert invitation status:', revertError);
        }
      }
      
      res.status(500).json({ message: error.message || 'Registration failed' });
    }
  });
  
  // Club self-registration endpoint — validates form, creates Stripe Customer + Checkout session
  // Club/user/coach records are created by the webhook after payment method is confirmed
  app.post('/api/auth/register-club', async (req, res) => {
    try {
      const { clubName, clubColor, firstName, lastName, email, password, passwordConfirm, level, dob } = req.body;

      // Validate required fields
      if (!clubName || !firstName || !lastName || !email || !password || !passwordConfirm || !dob) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      if (password !== passwordConfirm) {
        return res.status(400).json({ message: 'Passwords do not match' });
      }

      if (password.length < 12) {
        return res.status(400).json({ message: 'Password must be at least 12 characters' });
      }

      const hasUppercase = /[A-Z]/.test(password);
      const hasLowercase = /[a-z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

      if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
        return res.status(400).json({
          message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
        });
      }

      // Check email not already in use
      const existingUser = await storage.getUserByEmail(email.toLowerCase());
      if (existingUser) {
        return res.status(400).json({ message: 'An account with this email already exists' });
      }

      // Hash password before storing in pending registration
      const passwordHash = await hashPassword(password);

      // Determine the base URL for success/cancel redirect URLs.
      // Use APP_BASE_URL env var if set (recommended for production to avoid host-header issues);
      // otherwise fall back to inferring from the trusted request headers.
      const baseUrl = process.env.APP_BASE_URL ||
        (() => {
          const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
          const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:5000';
          return `${protocol}://${host}`;
        })();

      const stripe = await getUncachableStripeClient();

      // Create Stripe Customer for the club admin
      const customer = await stripe.customers.create({
        email: email.toLowerCase(),
        name: `${firstName} ${lastName}`,
        metadata: { clubName, registrationSource: 'club-self-register' },
      });

      // Create Stripe Checkout session in "setup" mode to collect payment method
      // Actual subscription is created by the webhook after this session completes
      const session = await stripe.checkout.sessions.create({
        mode: 'setup',
        customer: customer.id,
        payment_method_types: ['card'],
        success_url: `${baseUrl}/register/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/register/cancelled?session_id={CHECKOUT_SESSION_ID}`,
        custom_text: {
          submit: {
            message: 'After saving your card, your club will be created and billed monthly based on active users (£20/user for 1–5, £15 for 6–10, £10 for 11+).',
          },
        },
        metadata: { registrationType: 'club-self-register', clubName },
      });

      // Store pending registration so webhook can complete the club setup
      const validColor = clubColor && /^#[0-9a-fA-F]{6}$/.test(clubColor) ? clubColor : '#4B9A4A';
      await storage.createPendingRegistration({
        stripeCheckoutSessionId: session.id,
        formData: {
          clubName,
          clubColor: validColor,
          firstName,
          lastName,
          email: email.toLowerCase(),
          dob,
          level: level || 'No Qualification',
          passwordHash,
        },
      });

      if (!session.url) {
        console.error('[Auth] Stripe returned a checkout session without a URL:', session.id);
        throw new Error('Stripe checkout session URL is missing — please try again');
      }
      res.status(200).json({ checkoutUrl: session.url });
    } catch (error: any) {
      console.error('Club registration error:', error);
      res.status(500).json({ message: error.message || 'Club registration failed' });
    }
  });

  // Cancel registration endpoint — immediately cleans up a pending registration when user aborts checkout.
  // This is called by the /register/cancelled page on mount with the session_id from the Stripe redirect.
  app.post('/api/auth/cancel-registration', async (req, res) => {
    try {
      const { sessionId } = req.body;
      // Stripe checkout session IDs always start with "cs_" and are high-entropy; validate format
      // as a lightweight guard against arbitrary deletion of unrelated records.
      if (!sessionId || typeof sessionId !== 'string' || !sessionId.startsWith('cs_')) {
        return res.status(400).json({ message: 'Invalid sessionId' });
      }
      const pending = await storage.getPendingRegistrationBySessionId(sessionId);
      if (pending) {
        await storage.deletePendingRegistration(pending.id);
        console.log(`[Auth] Cancelled pending registration for session ${sessionId}`);
      }
      res.status(200).json({ ok: true });
    } catch (error: any) {
      console.error('Cancel registration error:', error);
      res.status(500).json({ message: error.message || 'Failed to cancel registration' });
    }
  });

  // Email verification endpoint
  app.get('/api/auth/verify-email', async (req, res) => {
    try {
      const { token } = req.query;
      
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ message: 'Invalid verification token' });
      }
      
      // Find verification token
      const verificationToken = await storage.getVerificationToken(token);
      
      if (!verificationToken) {
        return res.status(400).json({ message: 'Invalid or expired verification link' });
      }
      
      // Check if token is expired
      if (isTokenExpired(verificationToken.expiresAt)) {
        await storage.deleteVerificationToken(verificationToken.id);
        return res.status(400).json({ message: 'Verification link has expired' });
      }
      
      // Get user
      const user = await storage.getUser(verificationToken.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Update user to verified and active
      await storage.upsertUser({
        ...user,
        isEmailVerified: true,
        accountStatus: 'active',
      });
      
      // Delete used verification token
      await storage.deleteVerificationToken(verificationToken.id);

      // Sync active_users count and Stripe subscription quantity now that a user is activated
      try {
        const coach = await storage.getCoachByUserId(user.id);
        if (coach?.clubId) {
          await storage.recalculateActiveUsers(coach.clubId);
          await syncSubscriptionQuantity(storage, coach.clubId);
        }
      } catch (syncErr: any) {
        // Non-fatal: log but do not fail the verification response
        console.error('[verify-email] Failed to sync active_users/Stripe after activation:', syncErr?.message ?? syncErr);
      }
      
      res.json({ 
        message: 'Email verified successfully. You can now log in.',
        success: true,
      });
      
    } catch (error: any) {
      console.error('Email verification error:', error);
      res.status(500).json({ message: error.message || 'Verification failed' });
    }
  });
  
  // Login endpoint - validates email and password
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      // Validate required fields
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }
      
      // Find user by email
      const user = await storage.getUserByEmail(email.toLowerCase());
      
      if (!user || !user.passwordHash) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      
      // Verify password
      const isValidPassword = await verifyPassword(password, user.passwordHash);
      
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      
      // Check if email is verified
      if (!user.isEmailVerified) {
        return res.status(403).json({ message: 'Please verify your email before logging in' });
      }
      
      // Check account status
      if (user.accountStatus !== 'active') {
        return res.status(403).json({ message: 'Your account is not active. Please contact administrator.' });
      }
      
      // CRITICAL: Regenerate session ID to prevent session fixation attacks
      // When elevating from anonymous to authenticated, always create a new session
      await new Promise<void>((resolve, reject) => {
        req.session.regenerate((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      
      // Store user info in the new session
      req.session.userId = user.id;
      req.session.userEmail = user.email;
      req.session.authMethod = 'email_password'; // Distinguish from Replit OAuth
      
      // Save session before responding
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      
      res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
      });
      
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(500).json({ message: error.message || 'Login failed' });
    }
  });
  
  // Check authentication status
  app.get('/api/auth/status', async (req, res) => {
    try {
      // Check if user has a session with userId
      if (req.session?.userId) {
        // Fetch current user data from database
        const user = await storage.getUser(req.session.userId);
        
        if (!user) {
          // Session exists but user deleted - clear session
          req.session.destroy(() => {});
          return res.json({ authenticated: false });
        }
        
        // Check account is still active
        if (user.accountStatus !== 'active' || !user.isEmailVerified) {
          // Account no longer active - clear session
          req.session.destroy(() => {});
          return res.json({ authenticated: false });
        }
        
        // Fetch club data for this user
        let clubColor: string = '#4B9A4A';
        let clubId: string | null = null;
        try {
          const coach = await storage.getCoachByUserId(user.id);
          if (coach?.clubId) {
            clubId = coach.clubId;
            const club = await storage.getClub(coach.clubId);
            if (club?.clubColor) clubColor = club.clubColor;
          }
        } catch { /* non-fatal */ }

        return res.json({
          authenticated: true,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            clubColor,
            clubId,
          },
        });
      }
      
      // No session - unauthenticated
      res.json({ authenticated: false });
      
    } catch (error: any) {
      console.error('Status check error:', error);
      res.status(500).json({ message: error.message || 'Failed to check authentication status' });
    }
  });
  
  // Resend verification email endpoint
  app.post('/api/auth/resend-verification', async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }
      
      // Find user by email
      const user = await storage.getUserByEmail(email.toLowerCase());
      
      if (!user) {
        // Don't reveal if email exists or not for security
        return res.json({ message: 'If an account exists with this email, a verification link has been sent.' });
      }
      
      // Check if already verified
      if (user.isEmailVerified && user.accountStatus === 'active') {
        return res.status(400).json({ message: 'Email is already verified. Please try logging in.' });
      }
      
      // Delete any existing verification tokens for this user
      await storage.deleteVerificationTokensForUser(user.id);
      
      // Generate new verification token
      const verificationToken = generateSecureToken();
      await db.insert(emailVerificationTokens).values({
        userId: user.id,
        token: verificationToken,
        expiresAt: getVerificationExpiry(),
      });
      
      // Send verification email
      try {
        await sendVerificationEmail(user.email!, verificationToken, user.firstName || 'Coach');
        res.json({ message: 'Verification email sent. Please check your inbox.' });
      } catch (emailError: any) {
        console.error('Failed to send verification email:', emailError);
        res.status(500).json({ message: 'Failed to send verification email. Please try again later.' });
      }
      
    } catch (error: any) {
      console.error('Resend verification error:', error);
      res.status(500).json({ message: error.message || 'Failed to resend verification email' });
    }
  });
  
  // Validate password reset token (called on page load)
  app.get('/api/auth/reset-password/validate', async (req, res) => {
    try {
      const { token } = req.query;

      if (!token || typeof token !== 'string') {
        return res.status(400).json({ valid: false, message: 'Missing token' });
      }

      const resetToken = await storage.getPasswordResetToken(token);

      if (!resetToken) {
        return res.status(400).json({ valid: false, message: 'Invalid or expired reset link' });
      }

      if (resetToken.usedAt) {
        return res.status(400).json({ valid: false, message: 'This reset link has already been used' });
      }

      if (isTokenExpired(resetToken.expiresAt)) {
        return res.status(400).json({ valid: false, message: 'This reset link has expired' });
      }

      res.json({ valid: true });

    } catch (error: any) {
      console.error('Token validation error:', error);
      res.status(500).json({ valid: false, message: 'Failed to validate token' });
    }
  });

  // Forgot password endpoint - sends reset email
  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      // Always return a neutral response regardless of whether the email exists
      // This prevents account enumeration attacks
      const neutralResponse = { message: 'If an account exists with this email, a password reset link has been sent.' };

      const user = await storage.getUserByEmail(email.toLowerCase());

      if (!user || !user.passwordHash) {
        // No account found or account uses OAuth - return neutral response
        return res.json(neutralResponse);
      }

      if (user.accountStatus !== 'active') {
        // Account not active - return neutral response
        return res.json(neutralResponse);
      }

      // Delete any existing unused reset tokens for this user
      await storage.deletePasswordResetTokensForUser(user.id);

      // Generate new reset token
      const resetToken = generateSecureToken();
      await storage.createPasswordResetToken({
        userId: user.id,
        token: resetToken,
        expiresAt: getPasswordResetExpiry(),
        usedAt: null,
      });

      // Send reset email (non-fatal - return neutral response either way)
      try {
        await sendPasswordResetEmail(user.email!, resetToken, user.firstName || 'Coach');
      } catch (emailError: any) {
        console.error('Failed to send password reset email:', emailError);
        // Still return neutral response to avoid leaking info
      }

      res.json(neutralResponse);

    } catch (error: any) {
      console.error('Forgot password error:', error);
      res.status(500).json({ message: error.message || 'Failed to process request' });
    }
  });

  // Reset password endpoint - validates token and updates password
  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const { token, password, passwordConfirm } = req.body;

      if (!token || !password || !passwordConfirm) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      if (password !== passwordConfirm) {
        return res.status(400).json({ message: 'Passwords do not match' });
      }

      // Password strength validation
      if (password.length < 12) {
        return res.status(400).json({ message: 'Password must be at least 12 characters' });
      }

      const hasUppercase = /[A-Z]/.test(password);
      const hasLowercase = /[a-z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

      if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
        return res.status(400).json({
          message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
        });
      }

      // Find the reset token
      const resetToken = await storage.getPasswordResetToken(token);

      if (!resetToken) {
        return res.status(400).json({ message: 'Invalid or expired reset link' });
      }

      // Check if token has already been used
      if (resetToken.usedAt) {
        return res.status(400).json({ message: 'This reset link has already been used. Please request a new one.' });
      }

      // Check if token is expired (1 hour)
      if (isTokenExpired(resetToken.expiresAt)) {
        return res.status(400).json({ message: 'This reset link has expired. Please request a new one.' });
      }

      // Get user
      const user = await storage.getUser(resetToken.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Hash the new password
      const passwordHash = await hashPassword(password);

      // Update user password and mark token as used atomically
      await db.transaction(async (tx) => {
        await tx.update(users)
          .set({ passwordHash, updatedAt: new Date() })
          .where(eq(users.id, user.id));

        await tx.update(passwordResetTokens)
          .set({ usedAt: new Date() })
          .where(eq(passwordResetTokens.id, resetToken.id));
      });

      res.json({ message: 'Password reset successfully. You can now log in with your new password.' });

    } catch (error: any) {
      console.error('Reset password error:', error);
      res.status(500).json({ message: error.message || 'Failed to reset password' });
    }
  });

  // Logout endpoint
  app.post('/api/auth/logout', async (req, res) => {
    try {
      if (req.session) {
        req.session.destroy((err) => {
          if (err) {
            console.error('Logout error:', err);
            return res.status(500).json({ message: 'Logout failed' });
          }
          res.json({ message: 'Logged out successfully' });
        });
      } else {
        res.json({ message: 'No active session' });
      }
    } catch (error: any) {
      console.error('Logout error:', error);
      res.status(500).json({ message: error.message || 'Logout failed' });
    }
  });
}

// Middleware to check if user is authenticated (for new auth system)
// This is separate from the existing isAuthenticated middleware for Replit auth
export const requireAuth: RequestHandler = async (req, res, next) => {
  try {
    // Check if user has a session with userId
    if (!req.session?.userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Fetch current user data
    const user = await storage.getUser(req.session.userId);
    
    if (!user) {
      // Session exists but user deleted
      req.session.destroy(() => {});
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Check account is still active
    if (user.accountStatus !== 'active' || !user.isEmailVerified) {
      req.session.destroy(() => {});
      return res.status(403).json({ message: 'Account is not active' });
    }
    
    // Look up coach profile to get clubId
    const coach = await storage.getCoachByUserId(user.id);
    const clubId = coach?.clubId ?? null;

    // Attach user to request for downstream handlers
    // Structure is backward-compatible with old Replit OAuth routes that expect req.user.claims.sub
    (req as any).user = {
      id: user.id,
      email: user.email,
      role: user.role,
      coachId: coach?.id ?? null,
      clubId,
      claims: {
        sub: user.id  // Backward compatibility for routes that use req.user.claims.sub
      }
    };
    next();
    
  } catch (error: any) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ message: 'Authentication check failed' });
  }
};

// Middleware to check if user is an admin (must be used after requireAuth)
export const requireAdmin: RequestHandler = async (req: any, res, next) => {
  try {
    // Ensure user is authenticated first
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Check if user has admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Forbidden: Admin access required' 
      });
    }
    
    next();
  } catch (error: any) {
    console.error('Admin auth middleware error:', error);
    res.status(500).json({ message: 'Authorization check failed' });
  }
};
