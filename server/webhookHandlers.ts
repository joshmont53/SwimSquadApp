import { getStripeSync, getUncachableStripeClient } from './stripeClient';
import { storage } from './storage';
import { db } from './db';
import { clubs, coaches, users, emailVerificationTokens } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { generateSecureToken, getVerificationExpiry } from './tokenUtils';
import { sendVerificationEmail } from './emailService';
import crypto from 'crypto';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const sync = await getStripeSync();
    // This verifies the signature and syncs data to the stripe schema
    await sync.processWebhook(payload, signature);

    // Parse the (now verified) payload for our own business logic
    let event: any;
    try {
      event = JSON.parse(payload.toString('utf8'));
    } catch {
      return;
    }

    if (event.type === 'checkout.session.completed') {
      await WebhookHandlers.handleCheckoutSessionCompleted(event.data.object);
    }
  }

  private static async handleCheckoutSessionCompleted(session: any): Promise<void> {
    const sessionId = session.id;
    const customerId = session.customer;

    // Look up pending registration by Stripe session ID
    const pending = await storage.getPendingRegistrationBySessionId(sessionId);
    if (!pending) {
      // Not a club registration checkout — nothing to do
      console.log(`[Webhook] checkout.session.completed: no pending registration for session ${sessionId}`);
      return;
    }

    const formData = pending.formData as {
      clubName: string;
      clubColor: string;
      firstName: string;
      lastName: string;
      email: string;
      dob: string;
      level: string;
      passwordHash: string;
    };

    const isDevelopment = process.env.NODE_ENV === 'development';

    try {
      // Retrieve the setup intent's payment method so we can create the subscription
      let defaultPaymentMethodId: string | undefined;
      if (session.setup_intent) {
        const stripe = await getUncachableStripeClient();
        const setupIntent = await stripe.setupIntents.retrieve(session.setup_intent);
        defaultPaymentMethodId = setupIntent.payment_method as string | undefined;

        if (defaultPaymentMethodId) {
          // Attach payment method to customer and set as default for future invoices
          await stripe.paymentMethods.attach(defaultPaymentMethodId, { customer: customerId });
          await stripe.customers.update(customerId, {
            invoice_settings: { default_payment_method: defaultPaymentMethodId },
          });
        }
      }

      // Create club, coach, user and verification token in a single transaction
      const userId = crypto.randomUUID();
      const result = await db.transaction(async (tx) => {
        const validColor = formData.clubColor && /^#[0-9a-fA-F]{6}$/.test(formData.clubColor)
          ? formData.clubColor
          : '#4B9A4A';

        // 1. Create club with Stripe customer attached immediately
        const [club] = await tx.insert(clubs).values({
          clubName: formData.clubName,
          clubColor: validColor,
          stripeCustomerId: customerId,
          activeUsers: 0,
          clubStatus: 'active',
        }).returning();

        // 2. Create coach record (admin of the club)
        const [coach] = await tx.insert(coaches).values({
          clubId: club.id,
          firstName: formData.firstName,
          lastName: formData.lastName,
          level: formData.level || 'No Qualification',
          dob: formData.dob,
          recordStatus: 'active',
        }).returning();

        // 3. Set primaryCoachId on the club
        await tx.update(clubs).set({ primaryCoachId: coach.id }).where(eq(clubs.id, club.id));

        // 4. Create user account with admin role
        const [user] = await tx.insert(users).values({
          id: userId,
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          passwordHash: formData.passwordHash,
          isEmailVerified: isDevelopment,
          accountStatus: isDevelopment ? 'active' : 'pending',
          role: 'admin',
        }).returning();

        // 5. Link user to coach
        await tx.update(coaches).set({ userId: user.id }).where(eq(coaches.id, coach.id));

        // 6. Generate email verification token
        const verificationToken = generateSecureToken();
        await tx.insert(emailVerificationTokens).values({
          userId: user.id,
          token: verificationToken,
          expiresAt: getVerificationExpiry(),
        });

        return { user, club: { ...club, primaryCoachId: coach.id }, coach, verificationToken };
      });

      // Seed default coaching rates for the new club
      try {
        await storage.seedClubCoachingRates(result.club.id);
      } catch (err) {
        console.error('[Webhook] Failed to seed coaching rates:', err);
      }

      // Create Stripe Subscription with quantity=1 for the founding admin
      const priceId = process.env.STRIPE_SUBSCRIPTION_PRICE_ID;
      if (priceId && customerId) {
        try {
          const stripe = await getUncachableStripeClient();
          const subscriptionParams: any = {
            customer: customerId,
            items: [{ price: priceId, quantity: 1 }],
          };
          if (defaultPaymentMethodId) {
            subscriptionParams.default_payment_method = defaultPaymentMethodId;
          }
          const subscription = await stripe.subscriptions.create(subscriptionParams);

          // Attach subscription ID to the club and set active_users to 1
          await storage.updateClub(result.club.id, {
            stripeSubscriptionId: subscription.id,
            activeUsers: 1,
          });

          console.log(`[Webhook] Subscription ${subscription.id} created for club ${result.club.id}`);
        } catch (subError) {
          console.error('[Webhook] Failed to create subscription:', subError);
          // Non-fatal: club is created, subscription can be re-attempted later
          await storage.updateClub(result.club.id, { activeUsers: 1 });
        }
      } else {
        await storage.updateClub(result.club.id, { activeUsers: 1 });
      }

      // Clean up the pending registration record
      await storage.deletePendingRegistration(pending.id);

      // Send verification email (non-fatal in production)
      if (!isDevelopment) {
        try {
          await sendVerificationEmail(result.user.email!, result.verificationToken, formData.firstName);
        } catch (emailErr) {
          console.error('[Webhook] Failed to send verification email:', emailErr);
        }
      }

      console.log(`[Webhook] Club registration complete: club=${result.club.id} (${formData.clubName}) user=${userId}`);
    } catch (error) {
      console.error('[Webhook] Error handling checkout.session.completed:', error);
      throw error; // Re-throw so Stripe retries the event
    }
  }
}
