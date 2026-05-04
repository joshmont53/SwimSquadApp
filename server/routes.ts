import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import type Stripe from "stripe";
import { storage } from "./storage";
import { registerPrivacyRoutes } from "./privacyRoutes";
import { setupNewAuth, requireAuth, requireAdmin } from "./newAuth";
import {
  insertCoachSchema,
  insertSquadSchema,
  insertSwimmerSchema,
  insertLocationSchema,
  insertSwimmingSessionSchema,
  insertAttendanceSchema,
  createInvitationSchema,
  insertCompetitionSchema,
  insertCompetitionCoachingSchema,
  updateCoachingRateSchema,
  insertSessionTemplateSchema,
  insertDrillSchema,
  insertSessionFeedbackSchema,
  type SessionFeedback,
} from "@shared/schema";
import type { CoachNote, CoachNoteItem } from "./storage";
import { sendInvitationEmail } from "./emailService";
import { randomBytes } from "crypto";
import { calculateSessionDistancesAI, validateDistances, detectDrillsInSession, type DrillReference } from "./aiParser";
import { parseSessionText } from "@shared/sessionParser";
import { getNextAvailableColor } from "./squadColors";
import { syncSubscriptionQuantity, cancelStripeSubscription } from "./stripeClient";

// Helper function to sanitize invitation data (remove sensitive fields)
function sanitizeInvitation(invitation: any) {
  const { inviteToken, ...sanitized } = invitation;
  return sanitized;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Privacy policy routes (public, no auth required)
  registerPrivacyRoutes(app);

  // Android TWA (Trusted Web Activity) domain verification
  // This file proves to Google Play that this server owns the domain.
  // It has no effect on iOS, Apple, or any existing functionality.
  // The sha256_cert_fingerprints value must be updated with the actual
  // fingerprint from your Android keystore once the Android app is created.
  app.get('/.well-known/assetlinks.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.json([
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: 'com.swimsquadapp',
          sha256_cert_fingerprints: [
            'BE:FD:5C:E1:4C:80:82:F8:39:2E:6E:04:39:3C:58:8D:19:1E:40:11:48:42:44:AA:6B:C7:A5:1F:EF:B8:3D:D9',
            '97:B6:EE:5A:56:5A:B3:52:14:3C:A5:60:A5:E5:23:18:AB:A0:00:C3:41:7C:64:39:D4:22:85:D4:0D:D4:4E:EE',
          ],
        },
      },
    ]);
  });

  // Email/password authentication
  setupNewAuth(app);

  // Auth routes
  app.get('/api/auth/user', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Club settings (admin only)
  app.patch('/api/club/settings', requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const clubId = req.user.clubId;
      const { clubColor } = req.body;

      if (!clubColor || typeof clubColor !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(clubColor)) {
        return res.status(400).json({ message: 'Invalid colour. Must be a 6-digit hex value, e.g. #4B9A4A' });
      }

      const updated = await storage.updateClub(clubId, { clubColor });
      res.json({ clubColor: updated.clubColor });
    } catch (error) {
      console.error('Error updating club settings:', error);
      res.status(500).json({ message: 'Failed to update club settings' });
    }
  });

  // Invitation management routes (Phase 3 - Admin only)
  // List all invitations
  app.get("/api/invitations", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const clubId = req.user.clubId;
      const invitations = await storage.getAllInvitations(clubId);
      // Sanitize invitations to remove sensitive fields (inviteToken)
      const sanitizedInvitations = invitations.map(sanitizeInvitation);
      res.json(sanitizedInvitations);
    } catch (error) {
      console.error("Error fetching invitations:", error);
      res.status(500).json({ message: "Failed to fetch invitations" });
    }
  });

  // Create new invitation and send email
  app.post("/api/invitations", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      
      // Validate request body (only email and coachId required)
      const validationResult = createInvitationSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid invitation data", 
          errors: validationResult.error.errors 
        });
      }

      const { email, coachId } = validationResult.data;

      // Check if coach exists
      const coach = await storage.getCoach(coachId);
      if (!coach) {
        return res.status(404).json({ message: "Coach not found" });
      }

      // Check if invitation already exists for this email
      const existingInvitation = await storage.getInvitationByEmail(email);
      if (existingInvitation && existingInvitation.status === 'pending') {
        return res.status(400).json({ message: "Invitation already sent to this email" });
      }

      // Generate unique invitation token
      const inviteToken = randomBytes(32).toString('hex');
      
      // Set expiration to 48 hours from now
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 48);

      // Get current user ID
      const createdBy = req.user?.id || req.user?.claims?.sub;

      // Create invitation
      const invitation = await storage.createInvitation({
        email,
        coachId,
        clubId: req.user.clubId,
        inviteToken,
        status: 'pending',
        expiresAt,
        createdBy,
      });

      // Send invitation email
      try {
        await sendInvitationEmail(
          email,
          inviteToken,
          `${coach.firstName} ${coach.lastName}`
        );
        console.log(`✅ Invitation email sent to ${email}`);
      } catch (emailError) {
        console.error('Email send error:', emailError);
        // Non-fatal: invitation created but email failed
        return res.status(201).json({
          ...sanitizeInvitation(invitation),
          emailSent: false,
          emailError: 'Failed to send email. Invitation created but email delivery failed.'
        });
      }

      // Return sanitized invitation (without inviteToken)
      res.status(201).json({ ...sanitizeInvitation(invitation), emailSent: true });
    } catch (error: any) {
      console.error("Error creating invitation:", error);
      res.status(500).json({ message: error.message || "Failed to create invitation" });
    }
  });

  // Resend invitation email
  app.post("/api/invitations/:id/resend", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;

      // Get invitation
      const invitations = await storage.getAllInvitations(req.user.clubId);
      const invitation = invitations.find(inv => inv.id === id);

      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }

      // Only resend if status is pending
      if (invitation.status !== 'pending') {
        return res.status(400).json({ 
          message: `Cannot resend invitation with status: ${invitation.status}` 
        });
      }

      // Check if expired
      if (new Date() > new Date(invitation.expiresAt)) {
        return res.status(400).json({ message: "Invitation has expired" });
      }

      // Get coach details
      const coach = await storage.getCoach(invitation.coachId);
      if (!coach) {
        return res.status(404).json({ message: "Coach not found" });
      }

      // Resend email
      try {
        await sendInvitationEmail(
          invitation.email,
          invitation.inviteToken,
          `${coach.firstName} ${coach.lastName}`
        );
        console.log(`✅ Invitation email resent to ${invitation.email}`);
        res.json({ message: "Invitation email resent successfully", emailSent: true });
      } catch (emailError) {
        console.error('Email send error:', emailError);
        res.status(500).json({ 
          message: "Failed to send email", 
          emailSent: false 
        });
      }
    } catch (error: any) {
      console.error("Error resending invitation:", error);
      res.status(500).json({ message: error.message || "Failed to resend invitation" });
    }
  });

  // Revoke invitation
  app.patch("/api/invitations/:id/revoke", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;

      // Get invitation
      const invitations = await storage.getAllInvitations(req.user.clubId);
      const invitation = invitations.find(inv => inv.id === id);

      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }

      // Can only revoke pending invitations
      if (invitation.status !== 'pending') {
        return res.status(400).json({ 
          message: `Cannot revoke invitation with status: ${invitation.status}` 
        });
      }

      // Update status to revoked
      const updatedInvitation = await storage.updateInvitationStatus(id, 'revoked');
      
      console.log(`✅ Invitation revoked: ${invitation.email}`);
      // Return sanitized invitation (without inviteToken)
      res.json(sanitizeInvitation(updatedInvitation));
    } catch (error: any) {
      console.error("Error revoking invitation:", error);
      res.status(500).json({ message: error.message || "Failed to revoke invitation" });
    }
  });

  // Coach routes
  app.get("/api/coaches", requireAuth, async (req: any, res) => {
    try {
      const clubId = req.user.clubId;
      const coaches = await storage.getCoaches(clubId);
      res.json(coaches);
    } catch (error) {
      console.error("Error fetching coaches:", error);
      res.status(500).json({ message: "Failed to fetch coaches" });
    }
  });

  app.get("/api/coaches/me", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const coach = await storage.getCoachByUserId(userId);
      if (!coach) {
        return res.status(404).json({ message: "Coach profile not found" });
      }
      res.json(coach);
    } catch (error) {
      console.error("Error fetching coach profile:", error);
      res.status(500).json({ message: "Failed to fetch coach profile" });
    }
  });

  // Get all coaches including inactive (admin only — must be declared before /api/coaches/:id)
  app.get("/api/coaches/all", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const coachList = await storage.getAllCoachesIncludingInactive(req.user.clubId);
      res.json(coachList);
    } catch (error) {
      console.error("Error fetching all coaches:", error);
      res.status(500).json({ message: "Failed to fetch coaches" });
    }
  });

  app.post("/api/coaches/link/:coachId", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const coachId = req.params.coachId;
      
      // Check if coach exists
      const coach = await storage.getCoach(coachId);
      if (!coach) {
        return res.status(404).json({ message: "Coach not found" });
      }
      
      // Check if coach is already linked
      if (coach.userId && coach.userId !== userId) {
        return res.status(400).json({ message: "Coach profile already linked to another user" });
      }
      
      // Link the coach to the user
      const updatedCoach = await storage.updateCoach(coachId, { userId });
      res.json(updatedCoach);
    } catch (error: any) {
      console.error("Error linking coach:", error);
      res.status(500).json({ message: error.message || "Failed to link coach profile" });
    }
  });

  app.post("/api/coaches", requireAuth, async (req: any, res) => {
    try {
      const body = { ...req.body };
      if (!body.dob) delete body.dob;
      const validatedData = insertCoachSchema.parse(body);
      const coach = await storage.createCoach({ ...validatedData, clubId: req.user.clubId });
      res.json(coach);
    } catch (error: any) {
      console.error("Error creating coach:", error);
      res.status(400).json({ message: error.message || "Failed to create coach" });
    }
  });

  app.patch("/api/coaches/:id", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      // Verify the coach belongs to the admin's club before acting (prevent cross-tenant IDOR)
      const existing = await storage.getCoachAnyStatus(req.params.id);
      if (!existing) return res.status(404).json({ message: "Coach not found" });
      if (existing.clubId !== req.user.clubId) return res.status(403).json({ message: "Forbidden" });
      const body = { ...req.body };
      if (!body.dob) delete body.dob;
      const validatedData = insertCoachSchema.partial().parse(body);
      const coach = await storage.updateCoach(req.params.id, validatedData);
      res.json(coach);
    } catch (error: any) {
      console.error("Error updating coach:", error);
      if (error.message === "Coach not found") {
        return res.status(404).json({ message: error.message });
      }
      res.status(400).json({ message: error.message || "Failed to update coach" });
    }
  });

  app.delete("/api/coaches/:id", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const existing = await storage.getCoachAnyStatus(req.params.id);
      if (!existing) return res.status(404).json({ message: "Coach not found" });
      if (existing.clubId !== req.user.clubId) return res.status(403).json({ message: "Forbidden" });
      await storage.deleteCoach(req.params.id);
      const clubId = req.user.clubId as string;
      await storage.recalculateActiveUsers(clubId);
      let billingWarning: string | undefined;
      try {
        await syncSubscriptionQuantity(storage, clubId);
      } catch (stripeErr: any) {
        console.error("Billing sync failed after coach delete:", stripeErr?.message ?? stripeErr);
        billingWarning = "Coach deleted but billing sync failed — please contact support.";
      }
      res.json({ message: "Coach deleted successfully", billingWarning });
    } catch (error: any) {
      console.error("Error deleting coach:", error);
      res.status(500).json({ message: "Failed to delete coach" });
    }
  });

  // Coach deactivate (admin only)
  app.patch("/api/coaches/:id/deactivate", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const existing = await storage.getCoachAnyStatus(req.params.id);
      if (!existing) return res.status(404).json({ message: "Coach not found" });
      if (existing.clubId !== req.user.clubId) return res.status(403).json({ message: "Forbidden" });
      const { coach, userId } = await storage.deactivateCoach(req.params.id);
      const clubId = req.user.clubId as string;
      await storage.recalculateActiveUsers(clubId);
      let billingWarning: string | undefined;
      try {
        await syncSubscriptionQuantity(storage, clubId);
      } catch (stripeErr: any) {
        console.error("Billing sync failed after coach deactivation:", stripeErr?.message ?? stripeErr);
        billingWarning = "Coach deactivated but billing sync failed — please contact support.";
      }
      res.json({ coach, userId, billingWarning });
    } catch (error: any) {
      console.error("Error deactivating coach:", error);
      res.status(500).json({ message: error.message || "Failed to deactivate coach" });
    }
  });

  // Coach reactivate (admin only)
  app.patch("/api/coaches/:id/reactivate", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const existing = await storage.getCoachAnyStatus(req.params.id);
      if (!existing) return res.status(404).json({ message: "Coach not found" });
      if (existing.clubId !== req.user.clubId) return res.status(403).json({ message: "Forbidden" });
      const { coach, userId } = await storage.reactivateCoach(req.params.id);
      const clubId = req.user.clubId as string;
      await storage.recalculateActiveUsers(clubId);
      let billingWarning: string | undefined;
      try {
        await syncSubscriptionQuantity(storage, clubId);
      } catch (stripeErr: any) {
        console.error("Billing sync failed after coach reactivation:", stripeErr?.message ?? stripeErr);
        billingWarning = "Coach reactivated but billing sync failed — please contact support.";
      }
      res.json({ coach, userId, billingWarning });
    } catch (error: any) {
      console.error("Error reactivating coach:", error);
      res.status(500).json({ message: error.message || "Failed to reactivate coach" });
    }
  });

  // Billing: get current subscription info for admin billing page (legacy path)
  app.get("/api/billing/subscription", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const club = await storage.getClub(req.user.clubId);
      if (!club) return res.status(404).json({ message: "Club not found" });
      if (!club.stripeSubscriptionId || !club.stripeCustomerId) {
        return res.json({ hasSubscription: false, activeUsers: club.activeUsers ?? 0 });
      }
      const stripe = await (await import("./stripeClient")).getUncachableStripeClient();
      const subscription = await stripe.subscriptions.retrieve(club.stripeSubscriptionId, {
        expand: ['items.data.price'],
      });
      const item = subscription.items.data[0];
      const price = item?.price as Stripe.Price | undefined;
      type LegacyTier = Stripe.Price.Tier;
      const priceTiers = price && 'tiers' in price ? (price as Stripe.Price & { tiers?: LegacyTier[] }).tiers : null;
      type SubWithPeriod = typeof subscription & { current_period_end: number };
      const legacySub = subscription as SubWithPeriod;
      res.json({
        hasSubscription: true,
        status: legacySub.status,
        currentPeriodEnd: legacySub.current_period_end,
        cancelAtPeriodEnd: legacySub.cancel_at_period_end,
        quantity: item?.quantity ?? club.activeUsers,
        activeUsers: club.activeUsers ?? 0,
        currency: price?.currency ?? 'gbp',
        unitAmount: price?.unit_amount ?? null,
        billingScheme: price?.billing_scheme ?? null,
        tiersMode: price?.tiers_mode ?? null,
        tiers: priceTiers ?? null,
        stripeCustomerId: club.stripeCustomerId,
      });
    } catch (error: any) {
      console.error("Error fetching billing info:", error);
      res.status(500).json({ message: error.message || "Failed to fetch billing info" });
    }
  });

  // Billing: create Stripe Customer Portal session (admin only, legacy path)
  app.post("/api/billing/portal", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const club = await storage.getClub(req.user.clubId);
      if (!club) return res.status(404).json({ message: "Club not found" });
      if (!club.stripeCustomerId) {
        return res.status(400).json({ message: "No Stripe customer associated with this club" });
      }
      const appBaseUrl = process.env.APP_BASE_URL || `https://${req.headers.host}`;
      const stripe = await (await import("./stripeClient")).getUncachableStripeClient();
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: club.stripeCustomerId,
        return_url: `${appBaseUrl}/billing`,
      });
      res.json({ url: portalSession.url });
    } catch (error: any) {
      console.error("Error creating portal session:", error);
      res.status(500).json({ message: error.message || "Failed to create billing portal session" });
    }
  });

  // Billing: get subscription info for a specific club (admin only) — task-specified contract
  app.get("/api/clubs/:id/billing", requireAuth, requireAdmin, async (req: any, res) => {
    type TierLineItem = { label: string; users: number; unit_pence: number; subtotal_pence: number };
    try {
      const clubId = req.params.id;
      if (clubId !== req.user.clubId) return res.status(403).json({ message: "Forbidden" });
      const club = await storage.getClub(clubId);
      if (!club) return res.status(404).json({ message: "Club not found" });
      if (!club.stripeSubscriptionId || !club.stripeCustomerId) {
        return res.json({
          has_subscription: false,
          active_users: club.activeUsers ?? 0,
          club_status: club.clubStatus ?? 'active',
          estimated_breakdown: null,
          estimated_monthly_total: 0,
        });
      }
      const stripe = await (await import("./stripeClient")).getUncachableStripeClient();
      const subscription = await stripe.subscriptions.retrieve(club.stripeSubscriptionId, {
        expand: ['items.data.price'],
      });
      // The Stripe SDK typedefs for the newer API version omit current_period_end;
      // the field still exists in the API response so we widen with an intersection.
      type SubscriptionWithPeriod = typeof subscription & { current_period_end: number };
      const sub = subscription as SubscriptionWithPeriod;
      const item = subscription.items.data[0];
      const price = item?.price as Stripe.Price | undefined;
      // Stripe tiers are only present on graduated/volume prices; the SDK
      // types them as Price.Tier[] (namespace under Stripe.Price).
      type PriceTierShape = Stripe.Price.Tier;
      const priceTiers: PriceTierShape[] | null =
        price && 'tiers' in price && Array.isArray((price as Stripe.Price & { tiers?: PriceTierShape[] }).tiers)
          ? ((price as Stripe.Price & { tiers: PriceTierShape[] }).tiers)
          : null;

      // Server-side graduated pricing estimate
      const activeUsers = club.activeUsers ?? 0;
      let estimated_breakdown: TierLineItem[] | null = null;
      let estimated_monthly_total = 0;
      if (priceTiers && price?.tiers_mode === 'graduated' && activeUsers > 0) {
        const parts: TierLineItem[] = [];
        let remaining = activeUsers;
        let prevUpTo = 0;
        for (const tier of priceTiers) {
          if (remaining <= 0) break;
          const tierCap = tier.up_to == null ? remaining : (tier.up_to - prevUpTo);
          const usersInTier = Math.min(remaining, tierCap);
          const unitPence: number =
            tier.unit_amount != null
              ? tier.unit_amount
              : Math.round(parseFloat(tier.unit_amount_decimal ?? '0'));
          const rangeEnd = tier.up_to ?? null;
          parts.push({
            label: rangeEnd ? `${prevUpTo + 1}–${rangeEnd}` : `${prevUpTo + 1}+`,
            users: usersInTier,
            unit_pence: unitPence,
            subtotal_pence: usersInTier * unitPence,
          });
          remaining -= usersInTier;
          prevUpTo = tier.up_to ?? prevUpTo;
        }
        estimated_monthly_total = parts.reduce((s, p) => s + p.subtotal_pence, 0);
        estimated_breakdown = parts;
      }

      res.json({
        has_subscription: true,
        status: sub.status,
        current_period_end: sub.current_period_end,
        cancel_at_period_end: sub.cancel_at_period_end,
        quantity: item?.quantity ?? club.activeUsers,
        active_users: activeUsers,
        club_status: club.clubStatus ?? 'active',
        currency: price?.currency ?? 'gbp',
        billing_scheme: price?.billing_scheme ?? null,
        tiers_mode: price?.tiers_mode ?? null,
        tiers: priceTiers ?? null,
        stripe_customer_id: club.stripeCustomerId,
        estimated_breakdown,
        estimated_monthly_total,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch billing info";
      console.error("Error fetching club billing info:", err);
      res.status(500).json({ message });
    }
  });

  // Billing: create Stripe Customer Portal session for a specific club (admin only) — task-specified contract
  app.post("/api/clubs/:id/billing/portal", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const clubId = req.params.id;
      if (clubId !== req.user.clubId) return res.status(403).json({ message: "Forbidden" });
      const club = await storage.getClub(clubId);
      if (!club) return res.status(404).json({ message: "Club not found" });
      if (!club.stripeCustomerId) {
        return res.status(400).json({ message: "No Stripe customer associated with this club" });
      }
      const appBaseUrl = process.env.APP_BASE_URL || `https://${req.headers.host}`;
      const stripe = await (await import("./stripeClient")).getUncachableStripeClient();
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: club.stripeCustomerId,
        return_url: `${appBaseUrl}/billing`,
      });
      res.json({ url: portalSession.url });
    } catch (error: any) {
      console.error("Error creating club billing portal session:", error);
      res.status(500).json({ message: error.message || "Failed to create billing portal session" });
    }
  });

  // Club cancel (admin only) — cancels Stripe subscription + marks all data inactive
  app.post("/api/clubs/:id/cancel", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const clubId = req.params.id;
      // Ensure the admin is cancelling their own club
      if (clubId !== req.user.clubId) {
        return res.status(403).json({ message: "Cannot cancel another club" });
      }
      const club = await storage.getClub(clubId);
      if (!club) return res.status(404).json({ message: "Club not found" });
      if (club.clubStatus === 'inactive') {
        return res.status(400).json({ message: "Club is already cancelled" });
      }
      // Cancel Stripe subscription first (before marking DB records inactive)
      if (club.stripeSubscriptionId) {
        await cancelStripeSubscription(club.stripeSubscriptionId);
      }
      // Mark all club data inactive and set active_users = 0
      await storage.cancelClub(clubId);
      res.json({ message: "Club cancelled successfully" });
    } catch (error: any) {
      console.error("Error cancelling club:", error);
      res.status(500).json({ message: error.message || "Failed to cancel club" });
    }
  });

  // Squad routes
  app.get("/api/squads", requireAuth, async (req: any, res) => {
    try {
      const squads = await storage.getSquads(req.user.clubId);
      res.json(squads);
    } catch (error) {
      console.error("Error fetching squads:", error);
      res.status(500).json({ message: "Failed to fetch squads" });
    }
  });

  app.post("/api/squads", requireAuth, async (req: any, res) => {
    try {
      const validatedData = insertSquadSchema.parse(req.body);
      
      if (!validatedData.color) {
        const existingSquads = await storage.getSquads(req.user.clubId);
        const existingColors = existingSquads.map(s => s.color);
        validatedData.color = getNextAvailableColor(existingColors);
      }
      
      const squad = await storage.createSquad({ ...validatedData, clubId: req.user.clubId });
      res.json(squad);
    } catch (error: any) {
      console.error("Error creating squad:", error);
      res.status(400).json({ message: error.message || "Failed to create squad" });
    }
  });

  app.patch("/api/squads/:id", requireAuth, async (req, res) => {
    try {
      const validatedData = insertSquadSchema.partial().parse(req.body);
      const squad = await storage.updateSquad(req.params.id, validatedData);
      res.json(squad);
    } catch (error: any) {
      console.error("Error updating squad:", error);
      if (error.message === "Squad not found") {
        return res.status(404).json({ message: error.message });
      }
      res.status(400).json({ message: error.message || "Failed to update squad" });
    }
  });

  app.delete("/api/squads/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteSquad(req.params.id);
      res.json({ message: "Squad deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting squad:", error);
      if (error.message === "Squad not found") {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to delete squad" });
    }
  });

  // Swimmer routes
  app.get("/api/swimmers", requireAuth, async (req: any, res) => {
    try {
      const swimmers = await storage.getSwimmers(req.user.clubId);
      res.json(swimmers);
    } catch (error) {
      console.error("Error fetching swimmers:", error);
      res.status(500).json({ message: "Failed to fetch swimmers" });
    }
  });

  app.post("/api/swimmers", requireAuth, async (req: any, res) => {
    try {
      const validatedData = insertSwimmerSchema.parse(req.body);
      const swimmer = await storage.createSwimmer({ ...validatedData, clubId: req.user.clubId });
      res.json(swimmer);
    } catch (error: any) {
      console.error("Error creating swimmer:", error);
      res.status(400).json({ message: error.message || "Failed to create swimmer" });
    }
  });

  app.patch("/api/swimmers/bulk-update-squad", requireAuth, async (req, res) => {
    try {
      const schema = z.object({
        swimmerIds: z.array(z.string()).min(1, 'At least one swimmer required'),
        newSquadId: z.string().min(1, 'Squad ID required'),
      });
      
      const { swimmerIds, newSquadId } = schema.parse(req.body);
      const updatedSwimmers = await storage.bulkUpdateSwimmerSquad(swimmerIds, newSquadId);
      res.json(updatedSwimmers);
    } catch (error: any) {
      console.error("Error bulk updating swimmers:", error);
      res.status(400).json({ message: error.message || "Failed to bulk update swimmers" });
    }
  });

  app.patch("/api/swimmers/:id", requireAuth, async (req, res) => {
    try {
      const validatedData = insertSwimmerSchema.partial().parse(req.body);
      const swimmer = await storage.updateSwimmer(req.params.id, validatedData);
      res.json(swimmer);
    } catch (error: any) {
      console.error("Error updating swimmer:", error);
      if (error.message === "Swimmer not found") {
        return res.status(404).json({ message: error.message });
      }
      res.status(400).json({ message: error.message || "Failed to update swimmer" });
    }
  });

  app.delete("/api/swimmers/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteSwimmer(req.params.id);
      res.json({ message: "Swimmer deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting swimmer:", error);
      if (error.message === "Swimmer not found") {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to delete swimmer" });
    }
  });

  // Location routes
  app.get("/api/locations", requireAuth, async (req: any, res) => {
    try {
      const locations = await storage.getLocations(req.user.clubId);
      res.json(locations);
    } catch (error) {
      console.error("Error fetching locations:", error);
      res.status(500).json({ message: "Failed to fetch locations" });
    }
  });

  app.post("/api/locations", requireAuth, async (req: any, res) => {
    try {
      const validatedData = insertLocationSchema.parse(req.body);
      const location = await storage.createLocation({ ...validatedData, clubId: req.user.clubId });
      res.json(location);
    } catch (error: any) {
      console.error("Error creating location:", error);
      res.status(400).json({ message: error.message || "Failed to create location" });
    }
  });

  app.patch("/api/locations/:id", requireAuth, async (req, res) => {
    try {
      const validatedData = insertLocationSchema.partial().parse(req.body);
      const location = await storage.updateLocation(req.params.id, validatedData);
      res.json(location);
    } catch (error: any) {
      console.error("Error updating location:", error);
      if (error.message === "Location not found") {
        return res.status(404).json({ message: error.message });
      }
      res.status(400).json({ message: error.message || "Failed to update location" });
    }
  });

  app.delete("/api/locations/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteLocation(req.params.id);
      res.json({ message: "Location deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting location:", error);
      if (error.message === "Location not found") {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to delete location" });
    }
  });

  // Session routes
  app.get("/api/sessions", requireAuth, async (req: any, res) => {
    try {
      const sessions = await storage.getSessions(req.user.clubId);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      res.status(500).json({ message: "Failed to fetch sessions" });
    }
  });

  app.get("/api/sessions/:id", requireAuth, async (req, res) => {
    try {
      const result = await storage.getSessionWithAttendance(req.params.id);
      if (!result) {
        return res.status(404).json({ message: "Session not found" });
      }
      // Return session with attendance embedded
      res.json({ ...result.session, attendance: result.attendance });
    } catch (error) {
      console.error("Error fetching session:", error);
      res.status(500).json({ message: "Failed to fetch session" });
    }
  });

  app.get("/api/session-squads", requireAuth, async (req, res) => {
    try {
      const allSessionSquads = await storage.getAllSessionSquads();
      res.json(allSessionSquads);
    } catch (error) {
      console.error("Error fetching all session squads:", error);
      res.status(500).json({ message: "Failed to fetch session squads" });
    }
  });

  app.get("/api/session-squads/:sessionId", requireAuth, async (req, res) => {
    try {
      const sessionSquadRecords = await storage.getSessionSquads(req.params.sessionId);
      res.json(sessionSquadRecords);
    } catch (error) {
      console.error("Error fetching session squads:", error);
      res.status(500).json({ message: "Failed to fetch session squads" });
    }
  });

  app.post("/api/sessions", requireAuth, async (req: any, res) => {
    try {
      const { squadIds, ...sessionBody } = req.body;
      const validatedData = insertSwimmingSessionSchema.parse(sessionBody);
      let session = await storage.createSession({ ...validatedData, clubId: req.user.clubId });

      // Create session_squads entries for multi-squad support
      const allSquadIds: string[] = squadIds && Array.isArray(squadIds) && squadIds.length > 0
        ? squadIds
        : [validatedData.squadId];
      
      for (const squadId of allSquadIds) {
        await storage.createSessionSquad({ sessionId: session.id, squadId });
      }

      res.json(session);
    } catch (error: any) {
      console.error("Error creating session:", error);
      res.status(400).json({ message: error.message || "Failed to create session" });
    }
  });

  app.post("/api/sessions/:id/duplicate", requireAuth, async (req: any, res) => {
    try {
      const sourceSession = await storage.getSession(req.params.id);
      if (!sourceSession) {
        return res.status(404).json({ message: "Source session not found" });
      }

      const userId = req.user?.id || req.user?.claims?.sub;
      const requestingUser = await storage.getUser(userId);
      const isAdmin = requestingUser?.role === 'admin';

      if (!isAdmin) {
        const requestingCoach = await storage.getCoachByUserId(userId);
        if (!requestingCoach) {
          return res.status(403).json({ message: "No coach profile found" });
        }
        const coachId = requestingCoach.id;
        const isInvolved = [sourceSession.leadCoachId, sourceSession.secondCoachId, sourceSession.helperId, sourceSession.setWriterId].includes(coachId);
        if (!isInvolved) {
          return res.status(403).json({ message: "You can only duplicate sessions you are involved in" });
        }
      }

      const { squadIds, sessionDate, startTime, endTime, locationId, focus, leadCoachId, secondCoachId, helperId, setWriterId } = req.body;
      if (!squadIds || !Array.isArray(squadIds) || squadIds.length === 0) {
        return res.status(400).json({ message: "At least one squad must be selected" });
      }
      if (!sessionDate || !startTime || !endTime) {
        return res.status(400).json({ message: "Date and times are required" });
      }

      const [startH, startM] = startTime.split(':').map(Number);
      const [endH, endM] = endTime.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
      if (endMinutes <= startMinutes) {
        return res.status(400).json({ message: "End time must be after start time" });
      }
      const duration = ((endMinutes - startMinutes) / 60).toFixed(2);
      const primarySquadId = squadIds[0];

      const newSessionData = {
        sessionDate,
        startTime,
        endTime,
        duration,
        poolId: locationId || sourceSession.poolId,
        squadId: primarySquadId,
        leadCoachId: leadCoachId || sourceSession.leadCoachId,
        secondCoachId: secondCoachId !== undefined ? secondCoachId : sourceSession.secondCoachId,
        helperId: helperId !== undefined ? helperId : sourceSession.helperId,
        setWriterId: setWriterId || sourceSession.setWriterId,
        focus: focus || sourceSession.focus,
        sessionContent: sourceSession.sessionContent,
        sessionContentHtml: sourceSession.sessionContentHtml,
        detectedDrillIds: sourceSession.detectedDrillIds,
        totalDistance: sourceSession.totalDistance,
        totalFrontCrawlSwim: sourceSession.totalFrontCrawlSwim,
        totalFrontCrawlDrill: sourceSession.totalFrontCrawlDrill,
        totalFrontCrawlKick: sourceSession.totalFrontCrawlKick,
        totalFrontCrawlPull: sourceSession.totalFrontCrawlPull,
        totalBackstrokeSwim: sourceSession.totalBackstrokeSwim,
        totalBackstrokeDrill: sourceSession.totalBackstrokeDrill,
        totalBackstrokeKick: sourceSession.totalBackstrokeKick,
        totalBackstrokePull: sourceSession.totalBackstrokePull,
        totalBreaststrokeSwim: sourceSession.totalBreaststrokeSwim,
        totalBreaststrokeDrill: sourceSession.totalBreaststrokeDrill,
        totalBreaststrokeKick: sourceSession.totalBreaststrokeKick,
        totalBreaststrokePull: sourceSession.totalBreaststrokePull,
        totalButterflySwim: sourceSession.totalButterflySwim,
        totalButterflyDrill: sourceSession.totalButterflyDrill,
        totalButterflyKick: sourceSession.totalButterflyKick,
        totalButterflyPull: sourceSession.totalButterflyPull,
        totalIMSwim: sourceSession.totalIMSwim,
        totalIMDrill: sourceSession.totalIMDrill,
        totalIMKick: sourceSession.totalIMKick,
        totalIMPull: sourceSession.totalIMPull,
        totalNo1Swim: sourceSession.totalNo1Swim,
        totalNo1Drill: sourceSession.totalNo1Drill,
        totalNo1Kick: sourceSession.totalNo1Kick,
        totalNo1Pull: sourceSession.totalNo1Pull,
        duplicatedFromSessionId: sourceSession.id,
      };

      const validatedData = insertSwimmingSessionSchema.parse(newSessionData);
      const newSession = await storage.createSession({ ...validatedData, clubId: req.user.clubId });

      for (const squadId of squadIds) {
        await storage.createSessionSquad({ sessionId: newSession.id, squadId });
      }

      console.log(`[Session Duplicate] Session ${newSession.id} duplicated from ${sourceSession.id}`);
      res.json(newSession);
    } catch (error: any) {
      console.error("Error duplicating session:", error);
      res.status(400).json({ message: error.message || "Failed to duplicate session" });
    }
  });

  app.put("/api/sessions/:id", requireAuth, async (req: any, res) => {
    try {
      const { squadIds, ...sessionBody } = req.body;
      const validatedData = insertSwimmingSessionSchema.partial().parse(sessionBody);
      let session = await storage.updateSession(req.params.id, validatedData);

      // Update session_squads if squadIds were provided
      if (squadIds && Array.isArray(squadIds) && squadIds.length > 0) {
        await storage.updateSessionSquads(session.id, squadIds);
      }

      res.json(session);
    } catch (error: any) {
      console.error("Error updating session:", error);
      if (error.message === "Session not found") {
        return res.status(404).json({ message: error.message });
      }
      res.status(400).json({ message: error.message || "Failed to update session" });
    }
  });

  // Background drill detection endpoint - called by frontend independently of the save
  app.post("/api/sessions/:id/detect-drills", requireAuth, async (req: any, res) => {
    try {
      const { sessionContent } = req.body;

      if (!sessionContent || !sessionContent.trim()) {
        return res.json({ detectedDrillIds: [] });
      }

      const allDrills = await storage.getDrills(req.user.clubId);
      const drillReferences: DrillReference[] = allDrills.map(drill => ({
        id: drill.id,
        drillName: drill.drillName,
        strokeType: drill.strokeType,
        drillDescription: drill.drillDescription,
      }));

      const detectedDrillIds = await detectDrillsInSession(sessionContent, drillReferences);

      await storage.updateSession(req.params.id, { detectedDrillIds });
      console.log(`[Drill Detection] Found ${detectedDrillIds.length} drills in session ${req.params.id}`);

      res.json({ detectedDrillIds });
    } catch (error: any) {
      console.error('[Drill Detection] Error detecting drills:', error);
      res.status(500).json({ message: 'Failed to detect drills' });
    }
  });

  app.delete("/api/sessions/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteSession(req.params.id);
      res.json({ message: "Session deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting session:", error);
      if (error.message === "Session not found") {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to delete session" });
    }
  });

  // AI Session Parsing endpoint
  app.post("/api/sessions/parse-ai", requireAuth, async (req, res) => {
    try {
      const { sessionContent } = req.body;
      
      console.log('[Parse AI] Request body keys:', Object.keys(req.body));
      console.log('[Parse AI] sessionContent type:', typeof sessionContent);
      console.log('[Parse AI] sessionContent length:', sessionContent?.length || 0);
      console.log('[Parse AI] sessionContent preview:', sessionContent?.substring(0, 200));

      // Validate that sessionContent exists and is a string
      if (sessionContent === undefined || sessionContent === null) {
        console.error('[Parse AI] sessionContent is null or undefined');
        return res.status(400).json({ error: 'Session content is required' });
      }
      
      if (typeof sessionContent !== 'string') {
        console.error('[Parse AI] sessionContent is not a string, type:', typeof sessionContent);
        return res.status(400).json({ error: 'Session content must be a string' });
      }
      
      // Allow empty strings - just return zero distances
      if (sessionContent.trim().length === 0) {
        console.log('[Parse AI] Empty session content - returning zero distances');
        return res.json({
          totalFrontCrawlSwim: 0,
          totalFrontCrawlDrill: 0,
          totalFrontCrawlKick: 0,
          totalFrontCrawlPull: 0,
          totalBackstrokeSwim: 0,
          totalBackstrokeDrill: 0,
          totalBackstrokeKick: 0,
          totalBackstrokePull: 0,
          totalBreaststrokeSwim: 0,
          totalBreaststrokeDrill: 0,
          totalBreaststrokeKick: 0,
          totalBreaststrokePull: 0,
          totalButterflySwim: 0,
          totalButterflyDrill: 0,
          totalButterflyKick: 0,
          totalButterflyPull: 0,
          totalIMSwim: 0,
          totalIMDrill: 0,
          totalIMKick: 0,
          totalIMPull: 0,
          totalNo1Swim: 0,
          totalNo1Drill: 0,
          totalNo1Kick: 0,
          totalNo1Pull: 0,
          totalDistance: 0,
          method: 'empty',
        });
      }

      // Try AI parsing first
      try {
        console.log('[AI Parser] Parsing session via GPT-5 Mini...');
        const startTime = Date.now();
        
        const distances = await calculateSessionDistancesAI(sessionContent);
        const validation = validateDistances(distances);
        
        const elapsed = Date.now() - startTime;
        console.log(`[AI Parser] Completed in ${elapsed}ms`);

        if (!validation.valid) {
          console.warn('[AI Parser] Validation failed:', validation.errors);
          console.log('[AI Parser] Falling back to rule-based parser');
          
          // Fallback to rule-based
          const fallback = parseSessionText(sessionContent);
          return res.json({
            ...fallback.totals,
            method: 'rule-based-fallback',
            aiErrors: validation.errors,
            aiWarnings: validation.warnings,
          });
        }

        if (validation.warnings.length > 0) {
          console.warn('[AI Parser] Warnings:', validation.warnings);
        }

        return res.json({
          ...distances,
          method: 'ai',
          warnings: validation.warnings,
        });

      } catch (aiError) {
        console.error('[AI Parser] Error:', aiError);
        console.log('[AI Parser] Falling back to rule-based parser');
        
        // Fallback to rule-based
        const fallback = parseSessionText(sessionContent);
        return res.json({
          ...fallback.totals,
          method: 'rule-based-fallback',
          error: aiError instanceof Error ? aiError.message : 'AI parsing unavailable',
        });
      }

    } catch (error) {
      console.error('[API Error] Parse endpoint failed:', error);
      res.status(500).json({ error: 'Failed to parse session' });
    }
  });

  // AI Assistant Chat endpoint - generate personalized AI responses
  app.post("/api/sessions/:id/ai-chat", requireAuth, async (req: any, res) => {
    try {
      const sessionId = req.params.id;
      const { message, history } = req.body;
      
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ message: "Message is required" });
      }
      
      // AI assistant module imported below for streaming
      
      // First, get the context (reusing the same logic)
      const sessionData = await storage.getSessionWithAttendance(sessionId);
      if (!sessionData) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      const { session } = sessionData;

      const allSessionSquads = await storage.getAllSessionSquads();
      const sessionSquadIds = allSessionSquads
        .filter(ss => ss.sessionId === sessionId && ss.recordStatus === 'active')
        .map(ss => ss.squadId);
      const effectiveSquadIds = sessionSquadIds.length > 0
        ? sessionSquadIds
        : (session.squadId ? [session.squadId] : []);

      const allSquads = await storage.getSquads(req.user.clubId);
      const sessionSquads = allSquads.filter(sq => effectiveSquadIds.includes(sq.id));
      const combinedSquadName = sessionSquads.map(sq => sq.squadName).join(', ');
      
      const allSwimmers = await storage.getSwimmers(req.user.clubId);
      const squadSwimmers = allSwimmers.filter(s => effectiveSquadIds.includes(s.squadId));
      
      const today = new Date();
      const swimmerAges = squadSwimmers.map(swimmer => {
        const dob = new Date(swimmer.dob);
        let age = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
          age--;
        }
        return age;
      });
      
      const avgAge = swimmerAges.length > 0 
        ? Math.round(swimmerAges.reduce((a, b) => a + b, 0) / swimmerAges.length * 10) / 10
        : null;
      const minAge = swimmerAges.length > 0 ? Math.min(...swimmerAges) : null;
      const maxAge = swimmerAges.length > 0 ? Math.max(...swimmerAges) : null;

      const sessionSquadMap = new Map<string, string[]>();
      for (const ss of allSessionSquads.filter(ss => ss.recordStatus === 'active')) {
        const existing = sessionSquadMap.get(ss.sessionId) || [];
        existing.push(ss.squadId);
        sessionSquadMap.set(ss.sessionId, existing);
      }
      
      const allSessions = await storage.getSessions(req.user.clubId);
      const squadSessions = effectiveSquadIds.length > 0
        ? allSessions
            .filter(s => {
              if (s.id === sessionId) return false;
              const sSquadIds = sessionSquadMap.get(s.id) || (s.squadId ? [s.squadId] : []);
              return sSquadIds.some(sid => effectiveSquadIds.includes(sid));
            })
            .sort((a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime())
            .slice(0, 10)
        : [];
      
      const recentDistances = squadSessions
        .filter(s => s.totalDistance > 0)
        .map(s => s.totalDistance);
      
      const avgDistance = recentDistances.length > 0
        ? Math.round(recentDistances.reduce((a, b) => a + b, 0) / recentDistances.length)
        : null;
      
      const focusCounts: Record<string, number> = {};
      squadSessions.forEach(s => {
        if (s.focus) {
          focusCounts[s.focus] = (focusCounts[s.focus] || 0) + 1;
        }
      });
      const commonFocuses = Object.entries(focusCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([focus]) => focus);
      
      const location = session.poolId ? await storage.getLocation(session.poolId) : null;
      
      const aiContext = {
        currentSession: {
          id: session.id,
          date: session.sessionDate,
          focus: session.focus,
          content: session.sessionContent,
          totalDistance: session.totalDistance || null,
        },
        squad: sessionSquads.length > 0 ? {
          id: sessionSquads[0].id,
          name: combinedSquadName,
          swimmerCount: squadSwimmers.length,
          ageRange: minAge && maxAge ? `${minAge}-${maxAge}` : null,
          averageAge: avgAge,
        } : null,
        location: location ? {
          name: location.poolName,
          poolLength: location.poolType === '50m' ? 50 : 25,
        } : null,
        history: {
          recentSessionCount: squadSessions.length,
          averageDistance: avgDistance,
          commonFocuses: commonFocuses,
          recentSessions: squadSessions.slice(0, 5).map(s => ({
            date: s.sessionDate,
            focus: s.focus,
            distance: s.totalDistance || null,
          })),
        },
      };
      
      // Import streaming function
      const { streamAssistantResponse } = await import('./aiAssistant');
      
      // Generate streaming AI response
      await streamAssistantResponse(message, aiContext, history || [], res);
    } catch (error) {
      console.error("Error in AI chat:", error);
      res.status(500).json({ message: "Failed to generate AI response" });
    }
  });

  // AI Assistant Context endpoint - gather rich context for personalized AI responses
  app.get("/api/sessions/:id/ai-context", requireAuth, async (req: any, res) => {
    try {
      const sessionId = req.params.id;
      
      // Get the current session
      const sessionData = await storage.getSessionWithAttendance(sessionId);
      if (!sessionData) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      const { session } = sessionData;
      
      const allSessionSquads = await storage.getAllSessionSquads();
      const sessionSquadIds = allSessionSquads
        .filter(ss => ss.sessionId === sessionId && ss.recordStatus === 'active')
        .map(ss => ss.squadId);
      const effectiveSquadIds = sessionSquadIds.length > 0
        ? sessionSquadIds
        : (session.squadId ? [session.squadId] : []);

      const allSquads = await storage.getSquads(req.user.clubId);
      const sessionSquads = allSquads.filter(sq => effectiveSquadIds.includes(sq.id));
      const combinedSquadName = sessionSquads.map(sq => sq.squadName).join(', ');
      
      const allSwimmers = await storage.getSwimmers(req.user.clubId);
      const squadSwimmers = allSwimmers.filter(s => effectiveSquadIds.includes(s.squadId));
      
      const today = new Date();
      const swimmerAges = squadSwimmers.map(swimmer => {
        const dob = new Date(swimmer.dob);
        let age = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
          age--;
        }
        return age;
      });
      
      const avgAge = swimmerAges.length > 0 
        ? Math.round(swimmerAges.reduce((a, b) => a + b, 0) / swimmerAges.length * 10) / 10
        : null;
      const minAge = swimmerAges.length > 0 ? Math.min(...swimmerAges) : null;
      const maxAge = swimmerAges.length > 0 ? Math.max(...swimmerAges) : null;

      const sessionSquadMap = new Map<string, string[]>();
      for (const ss of allSessionSquads.filter(ss => ss.recordStatus === 'active')) {
        const existing = sessionSquadMap.get(ss.sessionId) || [];
        existing.push(ss.squadId);
        sessionSquadMap.set(ss.sessionId, existing);
      }
      
      const allSessions = await storage.getSessions(req.user.clubId);
      const squadSessions = effectiveSquadIds.length > 0
        ? allSessions
            .filter(s => {
              if (s.id === sessionId) return false;
              const sSquadIds = sessionSquadMap.get(s.id) || (s.squadId ? [s.squadId] : []);
              return sSquadIds.some(sid => effectiveSquadIds.includes(sid));
            })
            .sort((a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime())
            .slice(0, 10)
        : [];
      
      const recentDistances = squadSessions
        .filter(s => s.totalDistance > 0)
        .map(s => s.totalDistance);
      
      const avgDistance = recentDistances.length > 0
        ? Math.round(recentDistances.reduce((a, b) => a + b, 0) / recentDistances.length)
        : null;
      
      const focusCounts: Record<string, number> = {};
      squadSessions.forEach(s => {
        if (s.focus) {
          focusCounts[s.focus] = (focusCounts[s.focus] || 0) + 1;
        }
      });
      const commonFocuses = Object.entries(focusCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([focus]) => focus);
      
      const location = session.poolId ? await storage.getLocation(session.poolId) : null;
      
      const aiContext = {
        currentSession: {
          id: session.id,
          date: session.sessionDate,
          focus: session.focus,
          content: session.sessionContent,
          totalDistance: session.totalDistance || null,
        },
        squad: sessionSquads.length > 0 ? {
          id: sessionSquads[0].id,
          name: combinedSquadName,
          swimmerCount: squadSwimmers.length,
          ageRange: minAge && maxAge ? `${minAge}-${maxAge}` : null,
          averageAge: avgAge,
        } : null,
        location: location ? {
          name: location.poolName,
          poolLength: location.poolType === '50m' ? 50 : 25,
        } : null,
        history: {
          recentSessionCount: squadSessions.length,
          averageDistance: avgDistance,
          commonFocuses: commonFocuses,
          recentSessions: squadSessions.slice(0, 5).map(s => ({
            date: s.sessionDate,
            focus: s.focus,
            distance: s.totalDistance || null,
          })),
        },
      };
      
      res.json(aiContext);
    } catch (error) {
      console.error("Error fetching AI context:", error);
      res.status(500).json({ message: "Failed to fetch AI context" });
    }
  });

  // Attendance routes
  app.get("/api/attendance", requireAuth, async (req: any, res) => {
    try {
      const attendanceRecords = await storage.getAllAttendance(req.user.clubId);
      res.json(attendanceRecords);
    } catch (error) {
      console.error("Error fetching all attendance:", error);
      res.status(500).json({ message: "Failed to fetch all attendance" });
    }
  });

  app.get("/api/attendance/:sessionId", requireAuth, async (req, res) => {
    try {
      const attendanceRecords = await storage.getAttendanceBySession(req.params.sessionId);
      res.json(attendanceRecords);
    } catch (error) {
      console.error("Error fetching attendance:", error);
      res.status(500).json({ message: "Failed to fetch attendance" });
    }
  });

  // ============================================================================
  // Attendance AI chat endpoint — must be registered BEFORE /:sessionId
  // ============================================================================
  app.post("/api/attendance/ai-chat", requireAuth, async (req: any, res) => {
    try {
      const { message, history = [] } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ message: 'Message is required' });
      }

      const clubId = req.user.clubId;

      // Fetch all club data scoped strictly to this club
      const [allAttendance, allSessions, allSquads, allSwimmers] = await Promise.all([
        storage.getAllAttendance(clubId),
        storage.getSessions(clubId),
        storage.getSquads(clubId),
        storage.getSwimmers(clubId),
      ]);

      // Build structured summary for the AI
      // Summarise attendance stats per swimmer per squad
      const squadSummaries = allSquads.map(squad => {
        const squadSessions = allSessions.filter(s => s.squadId === squad.id);
        const squadSwimmers = allSwimmers.filter(sw => sw.squadId === squad.id);

        const swimmerStats = squadSwimmers.map(sw => {
          const recs = allAttendance.filter(a => {
            const session = squadSessions.find(s => s.id === a.sessionId);
            return a.swimmerId === sw.id && !!session;
          });
          const attended = recs.filter(a =>
            a.status === 'Present' || a.status === 'First Half Only' || a.status === 'Second Half Only'
          ).length;
          const late = recs.filter(a => a.notes?.toLowerCase() === 'late').length;
          const veryLate = recs.filter(a => a.notes?.toLowerCase() === 'very late').length;
          const total = recs.length;
          return {
            name: `${sw.firstName} ${sw.lastName}`,
            totalSessions: total,
            attended,
            absent: total - attended,
            attendancePct: total > 0 ? Math.round((attended / total) * 100) : null,
            lateCount: late,
            veryLateCount: veryLate,
          };
        });

        // Squad-level summary by month (last 6 months)
        const now = new Date();
        const monthlyStats = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const start = new Date(d.getFullYear(), d.getMonth(), 1);
          const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
          const monthSessions = squadSessions.filter(s => {
            const sd = new Date(s.sessionDate);
            return sd >= start && sd <= end && sd <= now;
          });
          const sessionIds = new Set(monthSessions.map(s => s.id));
          const recs = allAttendance.filter(a => sessionIds.has(a.sessionId));
          const attended = recs.filter(a =>
            a.status === 'Present' || a.status === 'First Half Only' || a.status === 'Second Half Only'
          ).length;
          const total = recs.length;
          monthlyStats.push({
            month: `${d.toLocaleString('en-GB', { month: 'short' })} ${d.getFullYear()}`,
            sessions: monthSessions.length,
            avgAttendancePct: total > 0 ? Math.round((attended / total) * 100) : null,
          });
        }

        return {
          squadName: squad.squadName,
          totalSessions: squadSessions.length,
          swimmerCount: squadSwimmers.length,
          swimmers: swimmerStats,
          last6MonthsMonthly: monthlyStats,
        };
      });

      const systemPrompt = `You are an attendance analytics assistant for a swimming club. You have been given attendance data for this club only.

CRITICAL RULES:
1. You MUST only reference data that has been explicitly provided to you below. Do not infer, assume or reference data from any other club or source.
2. You can return figures, text summaries and tables. You cannot generate charts or graphs — if asked for a chart, politely explain this and offer the underlying figures instead.
3. Use plain, clear language suitable for swimming coaches.
4. If the data does not contain enough information to answer a question, say so clearly.
5. When presenting tables, use a markdown table format.
6. All percentages should be rounded to whole numbers unless a decimal is specifically helpful.

ATTENDANCE DATA FOR THIS CLUB:
${JSON.stringify(squadSummaries, null, 2)}

Note on definitions:
- "Present" includes status values: Present, First Half Only, Second Half Only
- "Absent" is recorded as Absent
- "Late" and "Very Late" are recorded in the notes field for present swimmers`;

      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system', content: systemPrompt },
        ...history.map((m: { role: string; content: string }) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user', content: message },
      ];

      const response = await openai.chat.completions.create({
        model: 'gpt-5-mini',
        messages,
        max_completion_tokens: 2048,
      });

      const reply = response.choices[0]?.message?.content || 'I was unable to generate a response.';
      res.json({ reply });
    } catch (error: any) {
      console.error('Error in attendance AI chat:', error);
      res.status(500).json({ message: error.message || 'Failed to process your question' });
    }
  });

  app.post("/api/attendance/:sessionId", requireAuth, async (req, res) => {
    try {
      const { attendance: attendanceData } = req.body;
      
      // Delete existing attendance for this session
      await storage.deleteAttendanceBySession(req.params.sessionId);
      
      // Create new attendance records
      const createdRecords = [];
      for (const record of attendanceData) {
        // Validate that notes is null when status is Absent
        const notes = record.status === "Absent" ? null : (record.notes || null);
        
        const validatedData = insertAttendanceSchema.parse({
          sessionId: req.params.sessionId,
          swimmerId: record.swimmerId,
          status: record.status,
          notes: notes,
        });
        const attendance = await storage.createAttendance(validatedData);
        createdRecords.push(attendance);
      }
      
      res.json(createdRecords);
    } catch (error: any) {
      console.error("Error saving attendance:", error);
      res.status(400).json({ message: error.message || "Failed to save attendance" });
    }
  });

  // ============================================================================
  // Competition routes (NEW - No impact on existing functionality)
  // ============================================================================

  // Get all competitions (all authenticated users)
  app.get("/api/competitions", requireAuth, async (req: any, res) => {
    try {
      const competitions = await storage.getCompetitions(req.user.clubId);
      res.json(competitions);
    } catch (error) {
      console.error("Error fetching competitions:", error);
      res.status(500).json({ message: "Failed to fetch competitions" });
    }
  });

  // Get single competition by ID (all authenticated users)
  app.get("/api/competitions/:id", requireAuth, async (req, res) => {
    try {
      const competition = await storage.getCompetition(req.params.id);
      if (!competition) {
        return res.status(404).json({ message: "Competition not found" });
      }
      res.json(competition);
    } catch (error) {
      console.error("Error fetching competition:", error);
      res.status(500).json({ message: "Failed to fetch competition" });
    }
  });

  // Create new competition (admin only)
  app.post("/api/competitions", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      // Validate request body
      const validationResult = insertCompetitionSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid competition data", 
          errors: validationResult.error.errors 
        });
      }

      const competitionData = validationResult.data;

      // Verify location exists
      const location = await storage.getLocation(competitionData.locationId);
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }

      // Create competition
      const competition = await storage.createCompetition({ ...competitionData, clubId: req.user.clubId });
      res.status(201).json(competition);
    } catch (error: any) {
      console.error("Error creating competition:", error);
      res.status(500).json({ message: error.message || "Failed to create competition" });
    }
  });

  // Update competition (admin only)
  app.patch("/api/competitions/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      // Verify competition exists
      const existing = await storage.getCompetition(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Competition not found" });
      }

      // Validate request body (partial update)
      const validationResult = insertCompetitionSchema.partial().safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid competition data", 
          errors: validationResult.error.errors 
        });
      }

      const updateData = validationResult.data;

      // If locationId is being updated, verify it exists
      if (updateData.locationId) {
        const location = await storage.getLocation(updateData.locationId);
        if (!location) {
          return res.status(404).json({ message: "Location not found" });
        }
      }

      // Update competition
      const updated = await storage.updateCompetition(req.params.id, updateData);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating competition:", error);
      res.status(500).json({ message: error.message || "Failed to update competition" });
    }
  });

  // Delete competition (admin only)
  app.delete("/api/competitions/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      // Verify competition exists
      const existing = await storage.getCompetition(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Competition not found" });
      }

      // Delete competition (soft delete, cascades to coaching records)
      await storage.deleteCompetition(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting competition:", error);
      res.status(500).json({ message: error.message || "Failed to delete competition" });
    }
  });

  // Get ALL coaching records across all competitions (all authenticated users)
  app.get("/api/competitions/coaching/all", requireAuth, async (req, res) => {
    try {
      const allCoaching = await storage.getAllCompetitionCoaching();
      res.json(allCoaching);
    } catch (error) {
      console.error("Error fetching all competition coaching:", error);
      res.status(500).json({ message: "Failed to fetch all competition coaching" });
    }
  });

  // Get coaching records for a competition (all authenticated users)
  app.get("/api/competitions/:id/coaching", requireAuth, async (req, res) => {
    try {
      const coachingRecords = await storage.getCompetitionCoachingByCompetition(req.params.id);
      res.json(coachingRecords);
    } catch (error) {
      console.error("Error fetching competition coaching:", error);
      res.status(500).json({ message: "Failed to fetch competition coaching" });
    }
  });

  // Create coaching record for a competition (admin only)
  app.post("/api/competitions/:id/coaching", requireAuth, requireAdmin, async (req, res) => {
    try {
      // Verify competition exists
      const competition = await storage.getCompetition(req.params.id);
      if (!competition) {
        return res.status(404).json({ message: "Competition not found" });
      }

      // Validate request body
      const validationResult = insertCompetitionCoachingSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid coaching data", 
          errors: validationResult.error.errors 
        });
      }

      const coachingData = validationResult.data;

      // Verify coach exists
      const coach = await storage.getCoach(coachingData.coachId);
      if (!coach) {
        return res.status(404).json({ message: "Coach not found" });
      }

      // Create coaching record
      const coaching = await storage.createCompetitionCoaching(coachingData);
      res.status(201).json(coaching);
    } catch (error: any) {
      console.error("Error creating coaching:", error);
      res.status(500).json({ message: error.message || "Failed to create coaching" });
    }
  });

  // Delete coaching record (admin only)
  app.delete("/api/competitions/coaching/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      await storage.deleteCompetitionCoaching(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting coaching:", error);
      res.status(500).json({ message: error.message || "Failed to delete coaching" });
    }
  });

  // ============================================================================
  // Coaching Rates API (NEW - No impact on existing functionality)
  // ============================================================================

  // Get all coaching rates (all authenticated users can view)
  app.get("/api/coaching-rates", requireAuth, async (req: any, res) => {
    try {
      const rates = await storage.getAllCoachingRates(req.user.clubId);
      res.json(rates);
    } catch (error: any) {
      console.error("Error fetching coaching rates:", error);
      res.status(500).json({ message: error.message || "Failed to fetch coaching rates" });
    }
  });

  // Update coaching rates (admin only)
  app.put("/api/coaching-rates", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      // Validate request body - expect array of rate updates
      if (!Array.isArray(req.body)) {
        return res.status(400).json({ message: "Request body must be an array of rate updates" });
      }

      // Validate each rate update
      const validatedRates = [];
      for (const rate of req.body) {
        const validationResult = updateCoachingRateSchema.safeParse(rate);
        if (!validationResult.success) {
          return res.status(400).json({ 
            message: "Invalid rate data", 
            errors: validationResult.error.errors,
            invalidRate: rate
          });
        }
        validatedRates.push(validationResult.data);
      }

      // Update each rate
      const updatedRates = [];
      for (const rate of validatedRates) {
        const updated = await storage.updateCoachingRate(req.user.clubId, rate.qualificationLevel, {
          hourlyRate: rate.hourlyRate.toString(),
          sessionWritingRate: rate.sessionWritingRate.toString(),
        });
        updatedRates.push(updated);
      }

      res.json(updatedRates);
    } catch (error: any) {
      console.error("Error updating coaching rates:", error);
      res.status(500).json({ message: error.message || "Failed to update coaching rates" });
    }
  });

  // ============================================================================
  // Session Template routes (Session Library Feature - No impact on existing functionality)
  // ============================================================================

  // Get all session templates
  app.get("/api/session-templates", requireAuth, async (req: any, res) => {
    try {
      const templates = await storage.getSessionTemplates(req.user.clubId);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching session templates:", error);
      res.status(500).json({ message: "Failed to fetch session templates" });
    }
  });

  // Get single session template
  app.get("/api/session-templates/:id", requireAuth, async (req, res) => {
    try {
      const template = await storage.getSessionTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ message: "Session template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error fetching session template:", error);
      res.status(500).json({ message: "Failed to fetch session template" });
    }
  });

  // Create new session template
  app.post("/api/session-templates", requireAuth, async (req: any, res) => {
    try {
      // Get current user's coach profile
      const userId = req.user?.id || req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const coach = await storage.getCoachByUserId(userId);
      
      // Verify coach profile exists before proceeding
      if (!coach) {
        return res.status(403).json({ message: "No coach profile found. Only coaches can create templates." });
      }

      // Now safe to validate and create - coach.id is guaranteed to be defined
      const validatedData = insertSessionTemplateSchema.parse({
        ...req.body,
        coachId: coach.id, // Ensure coachId is set to current user's coach
        clubId: req.user.clubId,
      });

      const template = await storage.createSessionTemplate(validatedData);
      res.status(201).json(template);
    } catch (error: any) {
      console.error("Error creating session template:", error);
      // Distinguish between validation errors and server errors
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid template data", errors: error.errors });
      }
      res.status(500).json({ message: error.message || "Failed to create session template" });
    }
  });

  // Update session template
  app.patch("/api/session-templates/:id", requireAuth, async (req: any, res) => {
    try {
      // Get current user's coach profile
      const userId = req.user?.id || req.user?.claims?.sub;
      const coach = await storage.getCoachByUserId(userId);
      
      if (!coach) {
        return res.status(403).json({ message: "No coach profile found" });
      }

      // Get existing template to check ownership
      const existingTemplate = await storage.getSessionTemplate(req.params.id);
      if (!existingTemplate) {
        return res.status(404).json({ message: "Session template not found" });
      }

      // Only the owner can update their template
      if (existingTemplate.coachId !== coach.id) {
        return res.status(403).json({ message: "You can only edit your own templates" });
      }

      // Validate and update (don't allow changing coachId)
      const { coachId, ...updateData } = req.body;
      const validatedData = insertSessionTemplateSchema.partial().parse(updateData);

      const updatedTemplate = await storage.updateSessionTemplate(req.params.id, validatedData);
      res.json(updatedTemplate);
    } catch (error: any) {
      console.error("Error updating session template:", error);
      if (error.message === "Session template not found") {
        return res.status(404).json({ message: error.message });
      }
      res.status(400).json({ message: error.message || "Failed to update session template" });
    }
  });

  // Delete session template
  app.delete("/api/session-templates/:id", requireAuth, async (req: any, res) => {
    try {
      // Get current user's coach profile
      const userId = req.user?.id || req.user?.claims?.sub;
      const coach = await storage.getCoachByUserId(userId);
      
      if (!coach) {
        return res.status(403).json({ message: "No coach profile found" });
      }

      // Get existing template to check ownership
      const existingTemplate = await storage.getSessionTemplate(req.params.id);
      if (!existingTemplate) {
        return res.status(404).json({ message: "Session template not found" });
      }

      // Only the owner can delete their template
      if (existingTemplate.coachId !== coach.id) {
        return res.status(403).json({ message: "You can only delete your own templates" });
      }

      await storage.deleteSessionTemplate(req.params.id);
      res.json({ message: "Session template deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting session template:", error);
      if (error.message === "Session template not found") {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to delete session template" });
    }
  });

  // ============================================================================
  // Drill routes (Drills Library Feature - No impact on existing functionality)
  // ============================================================================

  // Get all drills
  app.get("/api/drills", requireAuth, async (req: any, res) => {
    try {
      const drills = await storage.getDrills(req.user.clubId);
      res.json(drills);
    } catch (error) {
      console.error("Error fetching drills:", error);
      res.status(500).json({ message: "Failed to fetch drills" });
    }
  });

  // Get single drill
  app.get("/api/drills/:id", requireAuth, async (req, res) => {
    try {
      const drill = await storage.getDrill(req.params.id);
      if (!drill) {
        return res.status(404).json({ message: "Drill not found" });
      }
      res.json(drill);
    } catch (error) {
      console.error("Error fetching drill:", error);
      res.status(500).json({ message: "Failed to fetch drill" });
    }
  });

  // Create new drill
  app.post("/api/drills", requireAuth, async (req: any, res) => {
    try {
      // Get current user's coach profile
      const userId = req.user?.id || req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const coach = await storage.getCoachByUserId(userId);
      
      // Verify coach profile exists before proceeding
      if (!coach) {
        return res.status(403).json({ message: "No coach profile found. Only coaches can create drills." });
      }

      // Now safe to validate and create - coach.id is guaranteed to be defined
      const validatedData = insertDrillSchema.parse({
        ...req.body,
        coachId: coach.id, // Ensure coachId is set to current user's coach
        clubId: req.user.clubId,
      });

      const drill = await storage.createDrill(validatedData);
      res.status(201).json(drill);
    } catch (error: any) {
      console.error("Error creating drill:", error);
      // Distinguish between validation errors and server errors
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid drill data", errors: error.errors });
      }
      res.status(500).json({ message: error.message || "Failed to create drill" });
    }
  });

  // Update drill
  app.patch("/api/drills/:id", requireAuth, async (req: any, res) => {
    try {
      // Get current user's coach profile
      const userId = req.user?.id || req.user?.claims?.sub;
      const coach = await storage.getCoachByUserId(userId);
      
      if (!coach) {
        return res.status(403).json({ message: "No coach profile found" });
      }

      // Get existing drill to check ownership
      const existingDrill = await storage.getDrill(req.params.id);
      if (!existingDrill) {
        return res.status(404).json({ message: "Drill not found" });
      }

      // Only the owner can update their drill
      if (existingDrill.coachId !== coach.id) {
        return res.status(403).json({ message: "You can only edit your own drills" });
      }

      // Validate and update (don't allow changing coachId)
      const { coachId, ...updateData } = req.body;
      const validatedData = insertDrillSchema.partial().parse(updateData);

      const updatedDrill = await storage.updateDrill(req.params.id, validatedData);
      res.json(updatedDrill);
    } catch (error: any) {
      console.error("Error updating drill:", error);
      if (error.message === "Drill not found") {
        return res.status(404).json({ message: error.message });
      }
      res.status(400).json({ message: error.message || "Failed to update drill" });
    }
  });

  // Delete drill
  app.delete("/api/drills/:id", requireAuth, async (req: any, res) => {
    try {
      // Get current user's coach profile
      const userId = req.user?.id || req.user?.claims?.sub;
      const coach = await storage.getCoachByUserId(userId);
      
      if (!coach) {
        return res.status(403).json({ message: "No coach profile found" });
      }

      // Get existing drill to check ownership
      const existingDrill = await storage.getDrill(req.params.id);
      if (!existingDrill) {
        return res.status(404).json({ message: "Drill not found" });
      }

      // Only the owner can delete their drill
      if (existingDrill.coachId !== coach.id) {
        return res.status(403).json({ message: "You can only delete your own drills" });
      }

      await storage.deleteDrill(req.params.id);
      res.json({ message: "Drill deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting drill:", error);
      if (error.message === "Drill not found") {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to delete drill" });
    }
  });

  // ============================================================================
  // Invoice routes
  // ============================================================================

  // Get invoice data for a coach for a specific month
  app.get("/api/invoices/:coachId/:year/:month", requireAuth, async (req: any, res) => {
    try {
      const { coachId, year, month } = req.params;
      
      // Authorization: coaches can only view their own invoices, admins can view all
      const userId = req.user?.id || req.user?.claims?.sub;
      const requestingUser = await storage.getUser(userId);
      const isAdmin = requestingUser?.role === 'admin';
      
      // If not admin, must have a coach profile and can only view own invoices
      if (!isAdmin) {
        const requestingCoach = await storage.getCoachByUserId(userId);
        if (!requestingCoach) {
          return res.status(403).json({ message: "No coach profile found" });
        }
        if (requestingCoach.id !== coachId) {
          return res.status(403).json({ message: "You can only view your own invoices" });
        }
      }

      // Validate coach exists
      const coach = await storage.getCoach(coachId);
      if (!coach) {
        return res.status(404).json({ message: "Coach not found" });
      }

      // Get coaching rates based on qualification level
      const rate = await storage.getCoachingRate(req.user.clubId, coach.level || 'No Qualification');
      if (!rate) {
        return res.status(500).json({ message: "Coaching rates not configured for this qualification level" });
      }

      // Calculate date range for the month
      const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
      const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];

      // Get all sessions for this month
      const allSessions = await storage.getSessions(req.user.clubId);
      const monthSessions = allSessions.filter(s => 
        s.sessionDate >= startDate && s.sessionDate <= endDate
      );

      // Get all squads for name lookup
      const allSquads = await storage.getSquads(req.user.clubId);
      const squadMap = new Map(allSquads.map(squad => [squad.id, squad]));

      const allSessionSquads = await storage.getAllSessionSquads();
      const sessionSquadMap = new Map<string, string[]>();
      for (const ss of allSessionSquads.filter(ss => ss.recordStatus === 'active')) {
        const existing = sessionSquadMap.get(ss.sessionId) || [];
        existing.push(ss.squadId);
        sessionSquadMap.set(ss.sessionId, existing);
      }

      const getSquadName = (session: typeof monthSessions[0]) => {
        const squadIds = sessionSquadMap.get(session.id);
        if (squadIds && squadIds.length > 0) {
          return squadIds.map(id => squadMap.get(id)?.squadName || 'Unknown Squad').join(' & ');
        }
        const squad = squadMap.get(session.squadId);
        return squad?.squadName || 'Unknown Squad';
      };

      // Calculate coaching hours
      const coachingSessions = monthSessions.filter(s => 
        s.leadCoachId === coachId || s.secondCoachId === coachId || s.helperId === coachId
      );

      const sessionDetails = coachingSessions.map(s => {
        return {
          sessionId: s.id,
          sessionDate: s.sessionDate,
          squadId: s.squadId,
          squadName: getSquadName(s),
          startTime: s.startTime,
          endTime: s.endTime,
          duration: parseFloat(s.duration),
          role: s.leadCoachId === coachId ? 'lead' : (s.secondCoachId === coachId ? 'second' : 'helper'),
        };
      });

      const totalCoachingHours = sessionDetails.reduce((sum, s) => sum + s.duration, 0);

      // Calculate sessions written (duplicated sessions are zero-rated)
      const sessionsWritten = monthSessions.filter(s => s.setWriterId === coachId);
      const sessionWritingDetails = sessionsWritten.map(s => {
        return {
          sessionId: s.id,
          sessionDate: s.sessionDate,
          squadId: s.squadId,
          squadName: getSquadName(s),
          isDuplicated: !!s.duplicatedFromSessionId,
        };
      });

      // Get competition coaching
      const allCompetitionCoaching = await storage.getAllCompetitionCoaching();
      const competitionCoachingThisMonth = allCompetitionCoaching.filter(c => 
        c.coachId === coachId && c.coachingDate >= startDate && c.coachingDate <= endDate
      );

      // Get all competitions and locations for name lookup
      const allCompetitions = await storage.getCompetitions(req.user.clubId);
      const competitionMap = new Map(allCompetitions.map(comp => [comp.id, comp]));
      const allLocations = await storage.getLocations(req.user.clubId);
      const locationMap = new Map(allLocations.map(loc => [loc.id, loc]));

      const competitionDetails = competitionCoachingThisMonth.map(c => {
        const competition = competitionMap.get(c.competitionId);
        const location = competition ? locationMap.get(competition.locationId) : undefined;
        return {
          coachingId: c.id,
          competitionId: c.competitionId,
          competitionName: competition?.competitionName || 'Unknown Competition',
          locationName: location?.poolName || 'Unknown Location',
          coachingDate: c.coachingDate,
          duration: parseFloat(c.duration),
        };
      });

      const totalCompetitionHours = competitionDetails.reduce((sum, c) => sum + c.duration, 0);

      // Calculate totals (duplicated sessions don't count for writing earnings)
      const totalHours = totalCoachingHours + totalCompetitionHours;
      const originalSessionsWritten = sessionsWritten.filter(s => !s.duplicatedFromSessionId);
      const totalSessionsWritten = originalSessionsWritten.length;

      const hourlyRate = parseFloat(rate.hourlyRate);
      const sessionWritingRate = parseFloat(rate.sessionWritingRate);

      const coachingEarnings = totalHours * hourlyRate;
      const sessionWritingEarnings = totalSessionsWritten * sessionWritingRate;
      const totalEarnings = coachingEarnings + sessionWritingEarnings;

      // Build invoice data
      const invoiceData = {
        coachId: coach.id,
        coachName: `${coach.firstName} ${coach.lastName}`,
        qualificationLevel: coach.level || 'No Qualification',
        year: parseInt(year),
        month: parseInt(month),
        rates: {
          hourlyRate,
          sessionWritingRate,
        },
        coaching: {
          totalHours,
          breakdown: {
            sessionHours: totalCoachingHours,
            competitionHours: totalCompetitionHours,
          },
          sessions: sessionDetails,
          competitions: competitionDetails,
          earnings: coachingEarnings,
        },
        sessionWriting: {
          count: totalSessionsWritten,
          sessions: sessionWritingDetails,
          earnings: sessionWritingEarnings,
        },
        totals: {
          totalEarnings,
          totalHours,
          totalSessionsWritten,
        },
      };

      res.json(invoiceData);
    } catch (error: any) {
      console.error("Error generating invoice data:", error);
      res.status(500).json({ message: error.message || "Failed to generate invoice data" });
    }
  });

  // ============================================================================
  // Session Feedback routes (Feedback Feature - No impact on existing functionality)
  // ============================================================================

  // Get feedback for a specific session
  app.get("/api/feedback/session/:sessionId", requireAuth, async (req, res) => {
    try {
      const feedback = await storage.getFeedbackBySession(req.params.sessionId);
      if (!feedback) {
        return res.status(404).json({ message: "Feedback not found" });
      }
      res.json(feedback);
    } catch (error: any) {
      console.error("Error fetching feedback:", error);
      res.status(500).json({ message: error.message || "Failed to fetch feedback" });
    }
  });

  // Get all feedback (for analytics)
  app.get("/api/feedback", requireAuth, async (req: any, res) => {
    try {
      const feedback = await storage.getAllFeedback(req.user.clubId);
      res.json(feedback);
    } catch (error) {
      console.error("Error fetching all feedback:", error);
      res.status(500).json({ message: "Failed to fetch feedback" });
    }
  });

  // Create or update feedback for a session
  app.post("/api/feedback", requireAuth, async (req: any, res) => {
    try {
      const validatedData = insertSessionFeedbackSchema.parse(req.body);
      const feedback = await storage.createOrUpdateFeedback(validatedData);
      res.json(feedback);
    } catch (error: any) {
      console.error("Error saving feedback:", error);
      res.status(400).json({ message: error.message || "Failed to save feedback" });
    }
  });

  // Delete feedback
  app.delete("/api/feedback/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteFeedback(req.params.id);
      res.json({ message: "Feedback deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting feedback:", error);
      if (error.message === "Feedback not found") {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to delete feedback" });
    }
  });

  // ============================================================================
  // Feedback Analytics API (Phase 2 - Analytics Dashboard)
  // ============================================================================

  // Get analytics data with filters
  app.get("/api/feedback/analytics", requireAuth, async (req: any, res) => {
    try {
      const { squadId, coachId, startDate, endDate } = req.query;

      // Fetch all feedback
      const allFeedback = await storage.getAllFeedback(req.user.clubId);
      
      // Fetch sessions and squads for filtering
      const allSessions = await storage.getSessions(req.user.clubId);
      const allSquads = await storage.getSquads(req.user.clubId);
      const allCoaches = await storage.getCoaches(req.user.clubId);
      const allSessionSquads = await storage.getAllSessionSquads();

      // Build session-to-squads lookup (multi-squad support)
      const sessionSquadMap = new Map<string, string[]>();
      allSessionSquads.forEach(ss => {
        const existing = sessionSquadMap.get(ss.sessionId) || [];
        existing.push(ss.squadId);
        sessionSquadMap.set(ss.sessionId, existing);
      });

      // Create lookup maps
      const sessionMap = new Map(allSessions.map(s => [s.id, s]));
      const squadMap = new Map(allSquads.map(s => [s.id, s]));
      const coachMap = new Map(allCoaches.map(c => [c.id, c]));

      // Enrich feedback with session data
      const enrichedFeedback = allFeedback.map(f => {
        const session = sessionMap.get(f.sessionId);
        const squadIds = session ? (sessionSquadMap.get(session.id) || [session.squadId]) : [];
        const squadNames = squadIds.map(id => squadMap.get(id)?.squadName).filter(Boolean);
        const coach = coachMap.get(f.coachId);
        return {
          ...f,
          session,
          squadIds,
          squadId: session?.squadId,
          squadName: squadNames.join(', ') || undefined,
          sessionDate: session?.sessionDate,
          duration: session?.duration,
          coachName: coach ? `${coach.firstName} ${coach.lastName}` : undefined,
        };
      });

      // Apply filters
      let filteredFeedback = enrichedFeedback;

      if (squadId && typeof squadId === 'string') {
        filteredFeedback = filteredFeedback.filter(f => f.squadIds.includes(squadId));
      }

      if (coachId && typeof coachId === 'string') {
        filteredFeedback = filteredFeedback.filter(f => {
          const session = f.session;
          if (!session) return false;
          return session.leadCoachId === coachId || 
                 session.secondCoachId === coachId || 
                 session.helperId === coachId;
        });
      }

      if (startDate && typeof startDate === 'string') {
        filteredFeedback = filteredFeedback.filter(f => f.sessionDate && f.sessionDate >= startDate);
      }

      if (endDate && typeof endDate === 'string') {
        filteredFeedback = filteredFeedback.filter(f => f.sessionDate && f.sessionDate <= endDate);
      }

      // Calculate overall averages
      const ratingCategories = [
        'engagement', 'effortAndIntent', 'enjoyment', 
        'sessionClarity', 'appropriatenessOfChallenge', 'sessionFlow'
      ] as const;

      const calculateAverage = (data: typeof filteredFeedback, category: typeof ratingCategories[number]) => {
        if (data.length === 0) return 0;
        const sum = data.reduce((acc, f) => acc + (f[category] || 0), 0);
        return Math.round((sum / data.length) * 10) / 10;
      };

      const categoryAverages = Object.fromEntries(
        ratingCategories.map(cat => [cat, calculateAverage(filteredFeedback, cat)])
      );

      // Calculate overall average
      const allRatings = filteredFeedback.flatMap(f => 
        ratingCategories.map(cat => f[cat] || 0)
      );
      const overallAverage = allRatings.length > 0 
        ? Math.round((allRatings.reduce((a, b) => a + b, 0) / allRatings.length) * 10) / 10 
        : 0;

      // Calculate trends (last 15 days vs previous 15 days)
      const now = new Date();
      const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const recentFeedback = filteredFeedback.filter(f => 
        f.sessionDate && new Date(f.sessionDate) >= fifteenDaysAgo
      );
      const previousFeedback = filteredFeedback.filter(f => 
        f.sessionDate && new Date(f.sessionDate) >= thirtyDaysAgo && new Date(f.sessionDate) < fifteenDaysAgo
      );

      const recentAvg = recentFeedback.length > 0 
        ? recentFeedback.flatMap(f => ratingCategories.map(cat => f[cat] || 0)).reduce((a, b) => a + b, 0) / (recentFeedback.length * 6)
        : null;
      const previousAvg = previousFeedback.length > 0 
        ? previousFeedback.flatMap(f => ratingCategories.map(cat => f[cat] || 0)).reduce((a, b) => a + b, 0) / (previousFeedback.length * 6)
        : null;

      const trend = recentAvg !== null && previousAvg !== null 
        ? Math.round((recentAvg - previousAvg) * 10) / 10 
        : null;

      // Generate chart data (weekly averages for last 8 weeks)
      const chartData = [];
      for (let i = 7; i >= 0; i--) {
        const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
        const weekStart = new Date(weekEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        const weekFeedback = filteredFeedback.filter(f => {
          if (!f.sessionDate) return false;
          const date = new Date(f.sessionDate);
          return date >= weekStart && date < weekEnd;
        });

        const weekAvg = weekFeedback.length > 0
          ? weekFeedback.flatMap(f => ratingCategories.map(cat => f[cat] || 0)).reduce((a, b) => a + b, 0) / (weekFeedback.length * 6)
          : null;

        chartData.push({
          weekStart: weekStart.toISOString().split('T')[0],
          weekEnd: weekEnd.toISOString().split('T')[0],
          average: weekAvg !== null ? Math.round(weekAvg * 10) / 10 : null,
          count: weekFeedback.length,
        });
      }

      // Pattern detection engine - generate dynamic insights
      const patterns: Array<{ type: string; title: string; description: string; significance: number; direction: 'positive' | 'negative' | 'neutral'; category?: string }> = [];

      // 1. Identify strongest and weakest categories
      const categoryEntries = Object.entries(categoryAverages).sort((a, b) => b[1] - a[1]);
      const categoryLabels: Record<string, string> = {
        engagement: 'Engagement',
        effortAndIntent: 'Effort & Intent',
        enjoyment: 'Enjoyment',
        sessionClarity: 'Session Clarity',
        appropriatenessOfChallenge: 'Appropriateness of Challenge',
        sessionFlow: 'Session Flow',
      };

      if (categoryEntries.length > 0 && categoryEntries[0][1] > 0) {
        const strongest = categoryEntries[0];
        if (strongest[1] >= 7) {
          patterns.push({
            type: 'strength',
            title: `Strong ${categoryLabels[strongest[0]]}`,
            description: `${categoryLabels[strongest[0]]} is your highest-rated area with an average of ${strongest[1]}/10.`,
            significance: strongest[1],
            direction: 'positive',
            category: strongest[0],
          });
        }

        const weakest = categoryEntries[categoryEntries.length - 1];
        if (weakest[1] < 6 && weakest[1] > 0) {
          patterns.push({
            type: 'improvement',
            title: `Focus on ${categoryLabels[weakest[0]]}`,
            description: `${categoryLabels[weakest[0]]} has the lowest average at ${weakest[1]}/10. Consider strategies to improve this area.`,
            significance: 10 - weakest[1],
            direction: 'negative',
            category: weakest[0],
          });
        }
      }

      // 2. Duration-based patterns
      const durationBands = {
        short: filteredFeedback.filter(f => f.duration && parseFloat(f.duration) <= 60),
        medium: filteredFeedback.filter(f => f.duration && parseFloat(f.duration) > 60 && parseFloat(f.duration) <= 90),
        long: filteredFeedback.filter(f => f.duration && parseFloat(f.duration) > 90),
      };

      const durationAverages = {
        short: durationBands.short.length > 0 
          ? durationBands.short.flatMap(f => ratingCategories.map(cat => f[cat] || 0)).reduce((a, b) => a + b, 0) / (durationBands.short.length * 6)
          : null,
        medium: durationBands.medium.length > 0 
          ? durationBands.medium.flatMap(f => ratingCategories.map(cat => f[cat] || 0)).reduce((a, b) => a + b, 0) / (durationBands.medium.length * 6)
          : null,
        long: durationBands.long.length > 0 
          ? durationBands.long.flatMap(f => ratingCategories.map(cat => f[cat] || 0)).reduce((a, b) => a + b, 0) / (durationBands.long.length * 6)
          : null,
      };

      const validDurationAverages = Object.entries(durationAverages).filter(([, v]) => v !== null) as [string, number][];
      if (validDurationAverages.length >= 2) {
        const sorted = validDurationAverages.sort((a, b) => b[1] - a[1]);
        const best = sorted[0];
        const worst = sorted[sorted.length - 1];
        const diff = best[1] - worst[1];
        
        if (diff >= 0.5) {
          const durationLabels: Record<string, string> = { short: '60-minute', medium: '90-minute', long: '120-minute' };
          patterns.push({
            type: 'duration',
            title: `${durationLabels[best[0]]} sessions perform best`,
            description: `${durationLabels[best[0]]} sessions average ${Math.round(best[1] * 10) / 10}/10 vs ${Math.round(worst[1] * 10) / 10}/10 for ${durationLabels[worst[0]]} sessions.`,
            significance: diff,
            direction: 'neutral',
          });
        }
      }

      // 3. Squad-based patterns (if not filtered by squad)
      if (!squadId) {
        const squadAverages: Record<string, { total: number; count: number; name: string }> = {};
        filteredFeedback.forEach(f => {
          if (f.squadId && f.squadName) {
            if (!squadAverages[f.squadId]) {
              squadAverages[f.squadId] = { total: 0, count: 0, name: f.squadName };
            }
            const avgForFeedback = ratingCategories.reduce((sum, cat) => sum + (f[cat] || 0), 0) / 6;
            squadAverages[f.squadId].total += avgForFeedback;
            squadAverages[f.squadId].count += 1;
          }
        });

        const squadResults = Object.entries(squadAverages)
          .filter(([, v]) => v.count >= 2)
          .map(([id, v]) => ({ id, name: v.name, average: v.total / v.count }))
          .sort((a, b) => b.average - a.average);

        if (squadResults.length >= 2) {
          const best = squadResults[0];
          const worst = squadResults[squadResults.length - 1];
          if (best.average - worst.average >= 1) {
            patterns.push({
              type: 'squad',
              title: `${best.name} leads in satisfaction`,
              description: `${best.name} has the highest average rating at ${Math.round(best.average * 10) / 10}/10, while ${worst.name} averages ${Math.round(worst.average * 10) / 10}/10.`,
              significance: best.average - worst.average,
              direction: 'positive',
            });
          }
        }
      }

      // 4. Trend-based pattern
      if (trend !== null && Math.abs(trend) >= 0.3) {
        patterns.push({
          type: 'trend',
          title: trend > 0 ? 'Ratings are improving' : 'Ratings are declining',
          description: `Average ratings ${trend > 0 ? 'increased' : 'decreased'} by ${Math.abs(trend).toFixed(1)} points over the last 15 days compared to the previous period.`,
          significance: Math.abs(trend),
          direction: trend > 0 ? 'positive' : 'negative',
        });
      }

      // Sort patterns by significance and take top 3
      const topPatterns = patterns.sort((a, b) => b.significance - a.significance).slice(0, 3);

      // Build response
      const analyticsData = {
        overview: {
          overallAverage,
          totalFeedbackCount: filteredFeedback.length,
          categoryAverages,
          trend,
          trendPeriod: '15 days',
        },
        chartData,
        patterns: topPatterns,
        filters: {
          squadId: squadId || null,
          coachId: coachId || null,
          startDate: startDate || null,
          endDate: endDate || null,
        },
        meta: {
          squads: allSquads.filter(s => s.recordStatus === 'active').map(s => ({ id: s.id, name: s.squadName })),
          coaches: allCoaches.filter(c => c.recordStatus === 'active').map(c => ({ id: c.id, name: `${c.firstName} ${c.lastName}` })),
        },
      };

      res.json(analyticsData);
    } catch (error: any) {
      console.error("Error fetching feedback analytics:", error);
      res.status(500).json({ message: error.message || "Failed to fetch analytics" });
    }
  });

  // Session Attributes Analytics endpoint
  app.get("/api/feedback/analytics/attributes", requireAuth, async (req: any, res) => {
    try {
      const { attribute, category, squadId, coachId } = req.query;
      
      // Validate required parameters
      if (!attribute || !category) {
        return res.status(400).json({ message: "attribute and category are required" });
      }
      
      const validAttributes = ['dayOfWeek', 'timeOfDay', 'duration', 'focus', 'squad', 'staffing'];
      const validCategories = ['engagement', 'effortAndIntent', 'enjoyment', 'sessionClarity', 'appropriatenessOfChallenge', 'sessionFlow'];
      
      if (!validAttributes.includes(attribute as string)) {
        return res.status(400).json({ message: `Invalid attribute. Must be one of: ${validAttributes.join(', ')}` });
      }
      
      if (!validCategories.includes(category as string)) {
        return res.status(400).json({ message: `Invalid category. Must be one of: ${validCategories.join(', ')}` });
      }

      // Fetch all feedback with their sessions
      const allFeedback = await storage.getAllFeedback(req.user.clubId);
      const allSessions = await storage.getSessions(req.user.clubId);
      const allSquads = await storage.getSquads(req.user.clubId);
      const allSessionSquads = await storage.getAllSessionSquads();
      
      // Build session-to-squads lookup (multi-squad support)
      const sessionSquadMap = new Map<string, string[]>();
      allSessionSquads.forEach(ss => {
        const existing = sessionSquadMap.get(ss.sessionId) || [];
        existing.push(ss.squadId);
        sessionSquadMap.set(ss.sessionId, existing);
      });

      // Create lookup maps
      const sessionMap = new Map(allSessions.map(s => [s.id, s]));
      const squadMap = new Map(allSquads.filter(s => s.recordStatus === 'active').map(s => [s.id, s.squadName]));
      
      // Filter feedback based on squad/coach filters
      let filteredFeedback = allFeedback.filter((f: SessionFeedback) => {
        const session = sessionMap.get(f.sessionId);
        if (!session) return false;
        if (squadId) {
          const sessionSquadIds = sessionSquadMap.get(session.id) || [session.squadId];
          if (!sessionSquadIds.includes(squadId as string)) return false;
        }
        if (coachId) {
          const isInvolved = session.leadCoachId === coachId || 
                            session.secondCoachId === coachId || 
                            session.helperId === coachId;
          if (!isInvolved) return false;
        }
        return true;
      });

      // Helper to get attribute value for a session
      const getAttributeValue = (session: any): string => {
        switch (attribute) {
          case 'dayOfWeek': {
            const date = new Date(session.sessionDate);
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            return days[date.getDay()];
          }
          case 'timeOfDay': {
            const hour = parseInt(session.startTime.split(':')[0]);
            if (hour < 12) return 'Morning';
            if (hour < 17) return 'Afternoon';
            return 'Evening';
          }
          case 'duration': {
            const mins = parseFloat(session.duration);
            if (mins <= 60) return '≤60 min';
            if (mins <= 90) return '60-90 min';
            return '>90 min';
          }
          case 'focus': {
            return session.focus || 'Unknown';
          }
          case 'squad': {
            const sSquadIds = sessionSquadMap.get(session.id) || [session.squadId];
            const names = sSquadIds.map((id: string) => squadMap.get(id)).filter(Boolean);
            return names.join(', ') || 'Unknown';
          }
          case 'staffing': {
            let count = 1; // Lead coach always present
            if (session.secondCoachId) count++;
            if (session.helperId) count++;
            return `${count} coach${count > 1 ? 'es' : ''}`;
          }
          default:
            return 'Unknown';
        }
      };

      // Group and aggregate data
      const aggregated: Record<string, { total: number; count: number }> = {};
      
      filteredFeedback.forEach((feedback: SessionFeedback) => {
        const session = sessionMap.get(feedback.sessionId);
        if (!session) return;
        
        const attrValue = getAttributeValue(session);
        const categoryValue = (feedback as any)[category as string] as number;
        
        if (!aggregated[attrValue]) {
          aggregated[attrValue] = { total: 0, count: 0 };
        }
        aggregated[attrValue].total += categoryValue;
        aggregated[attrValue].count++;
      });

      // Convert to array and sort by attribute order
      const getAttributeOrder = (attr: string, value: string): number => {
        if (attr === 'dayOfWeek') {
          const order = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
          const idx = order.indexOf(value);
          return idx >= 0 ? idx : 999;
        }
        if (attr === 'timeOfDay') {
          const order = ['Morning', 'Afternoon', 'Evening'];
          const idx = order.indexOf(value);
          return idx >= 0 ? idx : 999;
        }
        if (attr === 'duration') {
          const order = ['≤60 min', '60-90 min', '>90 min'];
          const idx = order.indexOf(value);
          return idx >= 0 ? idx : 999;
        }
        if (attr === 'staffing') {
          const order = ['1 coach', '2 coaches', '3 coaches'];
          const idx = order.indexOf(value);
          return idx >= 0 ? idx : 999;
        }
        // For focus, squad, and other attributes - sort alphabetically
        return 0;
      };

      const chartData = Object.entries(aggregated)
        .map(([name, data]) => ({
          name,
          rating: data.count > 0 ? Math.round((data.total / data.count) * 10) / 10 : 0,
          count: data.count,
        }))
        .sort((a, b) => {
          const orderA = getAttributeOrder(attribute as string, a.name);
          const orderB = getAttributeOrder(attribute as string, b.name);
          if (orderA !== orderB) return orderA - orderB;
          // Fallback to alphabetical for same order or unknown values
          return a.name.localeCompare(b.name);
        });

      res.json({
        attribute,
        category,
        chartData,
        totalEntries: filteredFeedback.length,
      });
    } catch (error: any) {
      console.error("Error fetching attribute analytics:", error);
      res.status(500).json({ message: error.message || "Failed to fetch attribute analytics" });
    }
  });

  // In-memory cache for AI insights (10 minute TTL)
  const insightsCache = new Map<string, { data: any; timestamp: number; dataHash: string }>();
  const INSIGHTS_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  // AI-Powered Insights endpoint
  app.get("/api/feedback/analytics/insights", requireAuth, async (req: any, res) => {
    try {
      const { squadId, coachId, forceRefresh } = req.query;
      
      // Fetch all data
      const allFeedback = await storage.getAllFeedback(req.user.clubId);
      const allSessions = await storage.getSessions(req.user.clubId);
      const allSquads = await storage.getSquads(req.user.clubId);
      const allCoaches = await storage.getCoaches(req.user.clubId);
      const allSessionSquads = await storage.getAllSessionSquads();
      
      // Build session-to-squads lookup (multi-squad support)
      const sessionSquadMap = new Map<string, string[]>();
      allSessionSquads.forEach(ss => {
        const existing = sessionSquadMap.get(ss.sessionId) || [];
        existing.push(ss.squadId);
        sessionSquadMap.set(ss.sessionId, existing);
      });

      // Create lookup maps
      const sessionMap = new Map(allSessions.map(s => [s.id, s]));
      const squadMap = new Map(allSquads.filter(s => s.recordStatus === 'active').map(s => [s.id, s.squadName]));
      const coachMap = new Map(allCoaches.filter(c => c.recordStatus === 'active').map(c => [c.id, `${c.firstName} ${c.lastName}`]));
      
      // Filter feedback based on squad/coach filters
      const filteredFeedback = allFeedback.filter((f: SessionFeedback) => {
        const session = sessionMap.get(f.sessionId);
        if (!session) return false;
        if (squadId) {
          const sessionSquadIds = sessionSquadMap.get(session.id) || [session.squadId];
          if (!sessionSquadIds.includes(squadId as string)) return false;
        }
        if (coachId) {
          const isInvolved = session.leadCoachId === coachId || 
                            session.secondCoachId === coachId || 
                            session.helperId === coachId;
          if (!isInvolved) return false;
        }
        return true;
      });

      if (filteredFeedback.length < 3) {
        return res.json({
          insights: null,
          message: "Not enough feedback data to generate insights (minimum 3 sessions required)",
          cached: false,
        });
      }

      // Create data hash for cache invalidation
      const dataHash = `${filteredFeedback.length}-${filteredFeedback.reduce((sum, f) => sum + f.engagement + f.enjoyment, 0)}`;
      const cacheKey = `${squadId || 'all'}-${coachId || 'all'}`;
      
      // Check cache
      const cached = insightsCache.get(cacheKey);
      if (!forceRefresh && cached && 
          Date.now() - cached.timestamp < INSIGHTS_CACHE_TTL && 
          cached.dataHash === dataHash) {
        return res.json({
          ...cached.data,
          cached: true,
          cachedAt: new Date(cached.timestamp).toISOString(),
        });
      }

      // Aggregate discipline data (swim, drill, kick, pull totals across all strokes)
      const disciplineStats: Record<string, { totalDistance: number; sessionCount: number; feedbackTotals: Record<string, number>; feedbackCount: number }> = {
        swim: { totalDistance: 0, sessionCount: 0, feedbackTotals: { engagement: 0, effortAndIntent: 0, enjoyment: 0, sessionClarity: 0, appropriatenessOfChallenge: 0, sessionFlow: 0 }, feedbackCount: 0 },
        drill: { totalDistance: 0, sessionCount: 0, feedbackTotals: { engagement: 0, effortAndIntent: 0, enjoyment: 0, sessionClarity: 0, appropriatenessOfChallenge: 0, sessionFlow: 0 }, feedbackCount: 0 },
        kick: { totalDistance: 0, sessionCount: 0, feedbackTotals: { engagement: 0, effortAndIntent: 0, enjoyment: 0, sessionClarity: 0, appropriatenessOfChallenge: 0, sessionFlow: 0 }, feedbackCount: 0 },
        pull: { totalDistance: 0, sessionCount: 0, feedbackTotals: { engagement: 0, effortAndIntent: 0, enjoyment: 0, sessionClarity: 0, appropriatenessOfChallenge: 0, sessionFlow: 0 }, feedbackCount: 0 },
      };

      // Aggregate stroke data
      const strokeStats: Record<string, { totalDistance: number; sessionCount: number; avgEnjoyment: number; avgEngagement: number; feedbackCount: number }> = {};
      const strokes = ['FrontCrawl', 'Backstroke', 'Breaststroke', 'Butterfly', 'IM'];
      strokes.forEach(s => {
        strokeStats[s] = { totalDistance: 0, sessionCount: 0, avgEnjoyment: 0, avgEngagement: 0, feedbackCount: 0 };
      });

      // Aggregate coach data
      const coachStats: Record<string, { name: string; sessionCount: number; totalRating: number; feedbackCount: number }> = {};
      
      // Process each feedback with its session
      filteredFeedback.forEach((f: SessionFeedback) => {
        const session = sessionMap.get(f.sessionId);
        if (!session) return;

        // Discipline aggregation
        const swimTotal = (session.totalFrontCrawlSwim || 0) + (session.totalBackstrokeSwim || 0) + 
                         (session.totalBreaststrokeSwim || 0) + (session.totalButterflySwim || 0) + 
                         (session.totalIMSwim || 0) + (session.totalNo1Swim || 0);
        const drillTotal = (session.totalFrontCrawlDrill || 0) + (session.totalBackstrokeDrill || 0) + 
                          (session.totalBreaststrokeDrill || 0) + (session.totalButterflyDrill || 0) + 
                          (session.totalIMDrill || 0) + (session.totalNo1Drill || 0);
        const kickTotal = (session.totalFrontCrawlKick || 0) + (session.totalBackstrokeKick || 0) + 
                         (session.totalBreaststrokeKick || 0) + (session.totalButterflyKick || 0) + 
                         (session.totalIMKick || 0) + (session.totalNo1Kick || 0);
        const pullTotal = (session.totalFrontCrawlPull || 0) + (session.totalBackstrokePull || 0) + 
                         (session.totalBreaststrokePull || 0) + (session.totalButterflyPull || 0) + 
                         (session.totalIMPull || 0) + (session.totalNo1Pull || 0);

        if (swimTotal > 0) {
          disciplineStats.swim.totalDistance += swimTotal;
          disciplineStats.swim.sessionCount++;
          disciplineStats.swim.feedbackTotals.engagement += f.engagement;
          disciplineStats.swim.feedbackTotals.enjoyment += f.enjoyment;
          disciplineStats.swim.feedbackTotals.effortAndIntent += f.effortAndIntent;
          disciplineStats.swim.feedbackCount++;
        }
        if (drillTotal > 0) {
          disciplineStats.drill.totalDistance += drillTotal;
          disciplineStats.drill.sessionCount++;
          disciplineStats.drill.feedbackTotals.engagement += f.engagement;
          disciplineStats.drill.feedbackTotals.enjoyment += f.enjoyment;
          disciplineStats.drill.feedbackTotals.effortAndIntent += f.effortAndIntent;
          disciplineStats.drill.feedbackCount++;
        }
        if (kickTotal > 0) {
          disciplineStats.kick.totalDistance += kickTotal;
          disciplineStats.kick.sessionCount++;
          disciplineStats.kick.feedbackTotals.engagement += f.engagement;
          disciplineStats.kick.feedbackTotals.enjoyment += f.enjoyment;
          disciplineStats.kick.feedbackCount++;
        }
        if (pullTotal > 0) {
          disciplineStats.pull.totalDistance += pullTotal;
          disciplineStats.pull.sessionCount++;
          disciplineStats.pull.feedbackTotals.engagement += f.engagement;
          disciplineStats.pull.feedbackTotals.enjoyment += f.enjoyment;
          disciplineStats.pull.feedbackCount++;
        }

        // Stroke aggregation
        strokes.forEach(stroke => {
          const strokeKey = `total${stroke}Swim` as keyof typeof session;
          const strokeDistance = (session[strokeKey] as number) || 0;
          if (strokeDistance > 0) {
            strokeStats[stroke].totalDistance += strokeDistance;
            strokeStats[stroke].sessionCount++;
            strokeStats[stroke].avgEnjoyment += f.enjoyment;
            strokeStats[stroke].avgEngagement += f.engagement;
            strokeStats[stroke].feedbackCount++;
          }
        });

        // Coach aggregation (lead coach)
        if (session.leadCoachId) {
          const coachName = coachMap.get(session.leadCoachId) || 'Unknown';
          if (!coachStats[session.leadCoachId]) {
            coachStats[session.leadCoachId] = { name: coachName, sessionCount: 0, totalRating: 0, feedbackCount: 0 };
          }
          const avgRating = (f.engagement + f.effortAndIntent + f.enjoyment + f.sessionClarity + f.appropriatenessOfChallenge + f.sessionFlow) / 6;
          coachStats[session.leadCoachId].sessionCount++;
          coachStats[session.leadCoachId].totalRating += avgRating;
          coachStats[session.leadCoachId].feedbackCount++;
        }
      });

      // Calculate averages
      const disciplineImpact = Object.entries(disciplineStats)
        .filter(([, v]) => v.feedbackCount >= 2)
        .map(([discipline, stats]) => ({
          discipline,
          avgDistance: Math.round(stats.totalDistance / stats.sessionCount),
          sessionCount: stats.sessionCount,
          avgEngagement: Math.round((stats.feedbackTotals.engagement / stats.feedbackCount) * 10) / 10,
          avgEnjoyment: Math.round((stats.feedbackTotals.enjoyment / stats.feedbackCount) * 10) / 10,
        }));

      const strokeImpact = Object.entries(strokeStats)
        .filter(([, v]) => v.feedbackCount >= 2)
        .map(([stroke, stats]) => ({
          stroke: stroke === 'FrontCrawl' ? 'Freestyle' : stroke,
          totalDistance: stats.totalDistance,
          sessionCount: stats.sessionCount,
          avgEnjoyment: Math.round((stats.avgEnjoyment / stats.feedbackCount) * 10) / 10,
          avgEngagement: Math.round((stats.avgEngagement / stats.feedbackCount) * 10) / 10,
        }));

      const coachInfluence = Object.entries(coachStats)
        .filter(([, v]) => v.feedbackCount >= 2)
        .map(([id, stats]) => ({
          coach: stats.name,
          sessionCount: stats.sessionCount,
          avgRating: Math.round((stats.totalRating / stats.feedbackCount) * 10) / 10,
        }))
        .sort((a, b) => b.avgRating - a.avgRating);

      // Overall category averages
      const categoryAverages: Record<string, number> = {};
      const categories = ['engagement', 'effortAndIntent', 'enjoyment', 'sessionClarity', 'appropriatenessOfChallenge', 'sessionFlow'];
      categories.forEach(cat => {
        const total = filteredFeedback.reduce((sum, f: any) => sum + (f[cat] || 0), 0);
        categoryAverages[cat] = Math.round((total / filteredFeedback.length) * 10) / 10;
      });

      // Build the AI prompt payload
      const payload = {
        filters: {
          squad: squadId ? squadMap.get(squadId as string) || 'Selected Squad' : 'All Squads',
          coach: coachId ? coachMap.get(coachId as string) || 'Selected Coach' : 'All Coaches',
        },
        overview: {
          totalSessions: filteredFeedback.length,
          overallAverage: Math.round(Object.values(categoryAverages).reduce((a, b) => a + b, 0) / 6 * 10) / 10,
        },
        categoryAverages,
        disciplineImpact,
        strokeImpact,
        coachInfluence: coachInfluence.slice(0, 5), // Top 5 coaches
      };

      // Call OpenAI for insights
      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const systemPrompt = `You are an elite swimming performance analyst discovering hidden trends that coaches couldn't spot without database analysis.
Your job is to find NON-OBVIOUS correlations and patterns - not just restate the numbers.
Always frame insights as comparative trends (e.g., "Sessions with X tend to show Y compared to baseline").
Write naturally and conversationally - never use technical abbreviations or JSON field names.
The overall average rating is ${payload.overview.overallAverage}/10 - use this as your baseline for comparisons.`;

      const userPrompt = `Analyze this swimming coaching data to find hidden patterns:

${JSON.stringify(payload, null, 2)}

Generate insights in exactly 3 sections with 1-2 bullet points each:

**Training Load Patterns**
- Compare how different training types (swim vs drill vs kick) correlate with engagement and enjoyment
- Look for: Does more drill work lead to better or worse feedback? Do high-volume swim sessions differ from shorter ones?

**Stroke Sentiment Trends**
- Identify which strokes swimmers respond to most/least positively
- Look for: Are certain strokes consistently underperforming? Any surprising outliers?

**Coach Highlights**
- Note any standout coach performance relative to the ${payload.overview.overallAverage}/10 average
- Look for: Who is exceeding expectations? Any patterns in their session approach?

CRITICAL RULES:
1. Frame each insight as a TREND or CORRELATION, not a data dump (e.g., "Sessions heavy on drill work tend to score lower on enjoyment" not "Drill: 5.3 enjoyment")
2. Compare metrics against each other or describe them as "above/below average" - do NOT repeatedly mention the specific baseline number
3. Include 1-2 specific numbers per insight to support your claim
4. Each bullet should be 30-50 words - enough depth to be useful
5. If a pattern seems significant but data is limited (<10 sessions), note it as an "emerging trend"
6. Never list raw numbers without context or comparison
7. Write as if explaining to a head coach who wants actionable intelligence`;

      const response = await openai.chat.completions.create({
        model: 'gpt-5-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_completion_tokens: 4096,
      });

      console.log("OpenAI response received:", JSON.stringify(response, null, 2));
      
      const insightsText = response.choices[0]?.message?.content || 'Unable to generate insights.';

      const result = {
        insights: insightsText,
        dataUsed: payload,
        generatedAt: new Date().toISOString(),
      };

      // Cache the result
      insightsCache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
        dataHash,
      });

      res.json({
        ...result,
        cached: false,
      });
    } catch (error: any) {
      console.error("Error generating AI insights:", error);
      res.status(500).json({ 
        message: error.message || "Failed to generate insights",
        insights: null,
      });
    }
  });

  // ============================================================================
  // Session Writer Helper Endpoints
  // ============================================================================

  // In-memory cache for session helper AI insights
  const sessionHelperCache = new Map<string, { data: any; timestamp: number; dataHash: string }>();
  const SESSION_HELPER_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  // Session Writer Helper - Non-AI data endpoint
  app.get("/api/feedback/session-helper/:squadId/:sessionFocus?", requireAuth, async (req: any, res) => {
    try {
      const { squadId, sessionFocus } = req.params;
      
      if (!squadId) {
        return res.status(400).json({ message: "squadId is required" });
      }

      const allFeedback = await storage.getAllFeedback(req.user.clubId);
      const allSessions = await storage.getSessions(req.user.clubId);
      const allSessionSquads = await storage.getAllSessionSquads();
      
      // Build session-to-squads lookup (multi-squad support)
      const sessionSquadMap = new Map<string, string[]>();
      allSessionSquads.forEach(ss => {
        const existing = sessionSquadMap.get(ss.sessionId) || [];
        existing.push(ss.squadId);
        sessionSquadMap.set(ss.sessionId, existing);
      });

      // Create session lookup map
      const sessionMap = new Map(allSessions.map(s => [s.id, s]));
      
      // Filter feedback by squad (and optionally focus) using session_squads
      let filteredFeedback = allFeedback.filter((f: SessionFeedback) => {
        const session = sessionMap.get(f.sessionId);
        if (!session) return false;
        const sessionSquadIds = sessionSquadMap.get(session.id) || [session.squadId];
        if (!sessionSquadIds.includes(squadId)) return false;
        if (sessionFocus && session.focus !== sessionFocus) return false;
        return true;
      });

      // Fallback to all squad data if focus-specific data is insufficient
      let usingFallback = false;
      if (filteredFeedback.length < 3 && sessionFocus) {
        filteredFeedback = allFeedback.filter((f: SessionFeedback) => {
          const session = sessionMap.get(f.sessionId);
          if (!session) return false;
          const sessionSquadIds = sessionSquadMap.get(session.id) || [session.squadId];
          return sessionSquadIds.includes(squadId);
        });
        usingFallback = filteredFeedback.length >= 1;
      }

      if (filteredFeedback.length === 0) {
        return res.json({
          sessionCount: 0,
          averages: null,
          trends: null,
          lowestCategory: null,
          highestCategory: null,
          usingFallback: false,
        });
      }

      // Sort feedback by session date (most recent first)
      const sortedFeedback = filteredFeedback
        .map((f: SessionFeedback) => ({
          feedback: f,
          session: sessionMap.get(f.sessionId),
        }))
        .filter(item => item.session)
        .sort((a, b) => {
          const dateA = new Date(a.session!.sessionDate);
          const dateB = new Date(b.session!.sessionDate);
          return dateB.getTime() - dateA.getTime();
        })
        .map(item => item.feedback);

      // Calculate averages
      const categories = ['engagement', 'effortAndIntent', 'enjoyment', 'sessionClarity', 'appropriatenessOfChallenge', 'sessionFlow'] as const;
      const averages: Record<string, number> = {};
      
      categories.forEach(cat => {
        const total = sortedFeedback.reduce((sum: number, f: any) => sum + (f[cat] || 0), 0);
        averages[cat] = Math.round((total / sortedFeedback.length) * 10) / 10;
      });

      // Calculate trends (compare last 5 vs previous 5)
      const trends: Record<string, 'up' | 'down' | 'stable'> = {};
      const recent5 = sortedFeedback.slice(0, 5);
      const previous5 = sortedFeedback.slice(5, 10);
      
      if (previous5.length >= 2) {
        categories.forEach(cat => {
          const recentAvg = recent5.reduce((sum: number, f: any) => sum + (f[cat] || 0), 0) / recent5.length;
          const prevAvg = previous5.reduce((sum: number, f: any) => sum + (f[cat] || 0), 0) / previous5.length;
          const diff = recentAvg - prevAvg;
          
          if (diff >= 0.5) trends[cat] = 'up';
          else if (diff <= -0.5) trends[cat] = 'down';
          else trends[cat] = 'stable';
        });
      } else {
        categories.forEach(cat => {
          trends[cat] = 'stable';
        });
      }

      // Find highest and lowest categories
      const sortedCategories = Object.entries(averages).sort((a, b) => b[1] - a[1]);
      const highestCategory = sortedCategories[0]?.[0] || 'engagement';
      const lowestCategory = sortedCategories[sortedCategories.length - 1]?.[0] || 'enjoyment';

      res.json({
        sessionCount: sortedFeedback.length,
        averages,
        trends,
        lowestCategory,
        highestCategory,
        usingFallback,
      });
    } catch (error: any) {
      console.error("Error fetching session helper data:", error);
      res.status(500).json({ message: error.message || "Failed to fetch session helper data" });
    }
  });

  // Session Writer Helper - AI Insights endpoint
  app.get("/api/feedback/session-helper/insights/:squadId/:sessionFocus?", requireAuth, async (req: any, res) => {
    try {
      const { squadId, sessionFocus } = req.params;
      const { forceRefresh } = req.query;
      
      if (!squadId) {
        return res.status(400).json({ message: "squadId is required" });
      }

      const allFeedback = await storage.getAllFeedback(req.user.clubId);
      const allSessions = await storage.getSessions(req.user.clubId);
      const allSquads = await storage.getSquads(req.user.clubId);
      const allSessionSquads = await storage.getAllSessionSquads();
      
      // Build session-to-squads lookup (multi-squad support)
      const sessionSquadMap = new Map<string, string[]>();
      allSessionSquads.forEach(ss => {
        const existing = sessionSquadMap.get(ss.sessionId) || [];
        existing.push(ss.squadId);
        sessionSquadMap.set(ss.sessionId, existing);
      });

      // Create lookup maps
      const sessionMap = new Map(allSessions.map(s => [s.id, s]));
      const squadMap = new Map(allSquads.map(s => [s.id, s.squadName]));
      
      const squadName = squadMap.get(squadId as string) || 'Unknown Squad';
      
      // Filter feedback by squad (and optionally focus) using session_squads
      let filteredFeedback = allFeedback.filter((f: SessionFeedback) => {
        const session = sessionMap.get(f.sessionId);
        if (!session) return false;
        const sessionSquadIds = sessionSquadMap.get(session.id) || [session.squadId];
        if (!sessionSquadIds.includes(squadId)) return false;
        if (sessionFocus && session.focus !== sessionFocus) return false;
        return true;
      });

      // Fallback to all squad data if focus-specific data is insufficient
      let usingFallback = false;
      if (filteredFeedback.length < 3 && sessionFocus) {
        filteredFeedback = allFeedback.filter((f: SessionFeedback) => {
          const session = sessionMap.get(f.sessionId);
          if (!session) return false;
          const sessionSquadIds = sessionSquadMap.get(session.id) || [session.squadId];
          return sessionSquadIds.includes(squadId);
        });
        usingFallback = filteredFeedback.length >= 3;
      }

      if (filteredFeedback.length < 3) {
        return res.json({
          whatsWorking: [],
          areasToAddress: [],
          focusTips: [],
          message: "Not enough feedback data (minimum 3 sessions required)",
          usingFallback: false,
        });
      }

      // Create data hash for cache invalidation
      const dataHash = `${squadId}-${sessionFocus || 'all'}-${filteredFeedback.length}-${filteredFeedback.reduce((sum: number, f: SessionFeedback) => sum + f.engagement + f.enjoyment, 0)}`;
      const cacheKey = `helper-${squadId}-${sessionFocus || 'all'}`;
      
      // Check cache
      const cached = sessionHelperCache.get(cacheKey);
      if (!forceRefresh && cached && 
          Date.now() - cached.timestamp < SESSION_HELPER_CACHE_TTL && 
          cached.dataHash === dataHash) {
        return res.json({
          ...cached.data,
          cached: true,
        });
      }

      // Calculate category averages
      const categories = ['engagement', 'effortAndIntent', 'enjoyment', 'sessionClarity', 'appropriatenessOfChallenge', 'sessionFlow'] as const;
      const categoryAverages: Record<string, number> = {};
      
      categories.forEach(cat => {
        const total = filteredFeedback.reduce((sum: number, f: any) => sum + (f[cat] || 0), 0);
        categoryAverages[cat] = Math.round((total / filteredFeedback.length) * 10) / 10;
      });

      // Calculate discipline impact (swim, drill, kick, pull)
      const disciplineStats: Record<string, { total: number; count: number; avgEngagement: number; avgEnjoyment: number }> = {
        swim: { total: 0, count: 0, avgEngagement: 0, avgEnjoyment: 0 },
        drill: { total: 0, count: 0, avgEngagement: 0, avgEnjoyment: 0 },
        kick: { total: 0, count: 0, avgEngagement: 0, avgEnjoyment: 0 },
        pull: { total: 0, count: 0, avgEngagement: 0, avgEnjoyment: 0 },
      };

      filteredFeedback.forEach((f: SessionFeedback) => {
        const session = sessionMap.get(f.sessionId);
        if (!session) return;

        const swimTotal = (session.totalFrontCrawlSwim || 0) + (session.totalBackstrokeSwim || 0) + 
                         (session.totalBreaststrokeSwim || 0) + (session.totalButterflySwim || 0) + 
                         (session.totalIMSwim || 0) + (session.totalNo1Swim || 0);
        const drillTotal = (session.totalFrontCrawlDrill || 0) + (session.totalBackstrokeDrill || 0) + 
                          (session.totalBreaststrokeDrill || 0) + (session.totalButterflyDrill || 0) + 
                          (session.totalIMDrill || 0) + (session.totalNo1Drill || 0);
        const kickTotal = (session.totalFrontCrawlKick || 0) + (session.totalBackstrokeKick || 0) + 
                         (session.totalBreaststrokeKick || 0) + (session.totalButterflyKick || 0) + 
                         (session.totalIMKick || 0) + (session.totalNo1Kick || 0);
        const pullTotal = (session.totalFrontCrawlPull || 0) + (session.totalBackstrokePull || 0) + 
                         (session.totalBreaststrokePull || 0) + (session.totalButterflyPull || 0) + 
                         (session.totalIMPull || 0) + (session.totalNo1Pull || 0);

        if (swimTotal > 0) {
          disciplineStats.swim.count++;
          disciplineStats.swim.avgEngagement += f.engagement;
          disciplineStats.swim.avgEnjoyment += f.enjoyment;
        }
        if (drillTotal > 0) {
          disciplineStats.drill.count++;
          disciplineStats.drill.avgEngagement += f.engagement;
          disciplineStats.drill.avgEnjoyment += f.enjoyment;
        }
        if (kickTotal > 0) {
          disciplineStats.kick.count++;
          disciplineStats.kick.avgEngagement += f.engagement;
          disciplineStats.kick.avgEnjoyment += f.enjoyment;
        }
        if (pullTotal > 0) {
          disciplineStats.pull.count++;
          disciplineStats.pull.avgEngagement += f.engagement;
          disciplineStats.pull.avgEnjoyment += f.enjoyment;
        }
      });

      // Calculate discipline averages
      const disciplineImpact = Object.entries(disciplineStats)
        .filter(([, v]) => v.count >= 2)
        .map(([discipline, stats]) => ({
          discipline,
          sessionCount: stats.count,
          avgEngagement: Math.round((stats.avgEngagement / stats.count) * 10) / 10,
          avgEnjoyment: Math.round((stats.avgEnjoyment / stats.count) * 10) / 10,
        }));

      // Find lowest and highest categories
      const sortedCategories = Object.entries(categoryAverages).sort((a, b) => b[1] - a[1]);
      const highestCat = sortedCategories[0];
      const lowestCat = sortedCategories[sortedCategories.length - 1];

      // Build AI payload
      const payload = {
        squadName,
        sessionFocus: sessionFocus || 'All focuses',
        sessionCount: filteredFeedback.length,
        categoryAverages,
        highestCategory: { name: highestCat[0], value: highestCat[1] },
        lowestCategory: { name: lowestCat[0], value: lowestCat[1] },
        disciplineImpact,
      };

      console.log("[SessionHelper] Generating AI insights for squad:", squadName, "with", filteredFeedback.length, "sessions");

      // Call OpenAI for insights
      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const systemPrompt = `You are an expert swimming coaching advisor who provides specific, actionable recommendations.
Your role is to analyze feedback data and suggest concrete actions the coach can take.
Every recommendation must include: (1) the insight with a number, (2) a specific action to take, and (3) why it will help.
Write conversationally. Never just describe the data - always recommend what to DO about it.`;

      const focusTipsContext = sessionFocus 
        ? `The coach is planning a "${sessionFocus}" session.` 
        : `The coach hasn't specified a session focus yet.`;

      const userPrompt = `Based on this feedback data for ${squadName}:

${JSON.stringify(payload, null, 2)}

${focusTipsContext}

Generate recommendations in valid JSON format. Each recommendation MUST follow this pattern:
"[Insight with number] — [specific action to try] [why it helps]"

Examples of GOOD recommendations:
- "Technique scores are strong (avg 4.2) — build on this by adding progressive complexity to drills, keeping swimmers challenged while confident"
- "Engagement has dipped to 3.1 — try incorporating butterfly drills which historically score 4.5+ for engagement across sessions"
- "Energy levels peak in shorter sets — consider 25m sprint intervals with active recovery to maintain intensity without fatigue"

Examples of BAD recommendations (don't do this):
- "Engagement is low at 3.1" (no action)
- "Consider varying the training" (too vague)
- "Swimmers responded well to drills" (no specific recommendation)

{
  "whatsWorking": [
    "2-3 things going well, each with a specific way to build on the success"
  ],
  "areasToAddress": [
    "2-3 areas needing improvement, each with a concrete drill/approach to try and why"
  ],
  "focusTips": [
    "2-3 specific tips for ${sessionFocus || 'this session'}, suggesting particular exercises or formats that would work well based on the data"
  ]
}

CRITICAL RULES:
1. Every recommendation MUST include a specific action (e.g., "try X", "consider adding Y", "use Z format")
2. Reference the discipline data to suggest specific training types that historically work well
3. Connect recommendations to the data (e.g., "since kick work scores 4.3, incorporate more kick sets")
4. Keep each recommendation 25-45 words
5. Return ONLY valid JSON, no markdown or explanation`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 2048,
      });

      let insights: { whatsWorking: string[]; areasToAddress: string[]; focusTips: string[] };
      
      try {
        const content = response.choices[0]?.message?.content || '{}';
        // Clean up potential markdown formatting
        const cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
        insights = JSON.parse(cleanedContent);
      } catch (parseError) {
        console.error("[SessionHelper] Failed to parse AI response:", parseError);
        // Fallback to empty arrays
        insights = {
          whatsWorking: [],
          areasToAddress: [],
          focusTips: [],
        };
      }

      const result = {
        whatsWorking: insights.whatsWorking || [],
        areasToAddress: insights.areasToAddress || [],
        focusTips: insights.focusTips || [],
        generatedAt: new Date().toISOString(),
      };

      // Cache the result
      sessionHelperCache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
        dataHash,
      });

      res.json({
        ...result,
        cached: false,
      });
    } catch (error: any) {
      console.error("[SessionHelper] Error generating insights:", error.message);
      res.status(500).json({ 
        message: error.message || "Failed to generate insights",
        whatsWorking: [],
        areasToAddress: [],
        focusTips: [],
      });
    }
  });

  // ============================================================================
  // Device Token Routes (Push Notifications Feature - No impact on existing functionality)
  // ============================================================================

  // Register or update device token for push notifications
  app.post("/api/device-tokens", requireAuth, async (req: any, res) => {
    console.log('[DeviceToken] Received registration request');
    try {
      const { deviceToken, platform = 'ios' } = req.body;
      console.log('[DeviceToken] Token length:', deviceToken?.length, 'Platform:', platform);

      if (!deviceToken || typeof deviceToken !== 'string') {
        console.log('[DeviceToken] Invalid token format');
        return res.status(400).json({ message: "Device token is required" });
      }

      // Get the coach linked to the current user
      const userId = req.user?.id || req.user?.claims?.sub;
      const coach = await storage.getCoachByUserId(userId);
      
      if (!coach) {
        return res.status(404).json({ message: "Coach profile not found for this user" });
      }

      // Create or update the device token
      const token = await storage.createOrUpdateDeviceToken(coach.id, deviceToken, platform);
      
      console.log(`✅ Device token registered for coach ${coach.firstName} ${coach.lastName}`);
      res.status(201).json({ 
        message: "Device token registered successfully",
        tokenId: token.id 
      });
    } catch (error: any) {
      console.error("Error registering device token:", error);
      res.status(500).json({ message: "Failed to register device token" });
    }
  });

  // Remove device token (for logout or uninstall)
  app.delete("/api/device-tokens", requireAuth, async (req: any, res) => {
    try {
      const { deviceToken } = req.body;

      if (!deviceToken || typeof deviceToken !== 'string') {
        return res.status(400).json({ message: "Device token is required" });
      }

      await storage.deleteDeviceToken(deviceToken);
      
      console.log(`✅ Device token removed`);
      res.json({ message: "Device token removed successfully" });
    } catch (error: any) {
      console.error("Error removing device token:", error);
      res.status(500).json({ message: "Failed to remove device token" });
    }
  });

  // ============================================================================
  // Coach Notes routes (Handbook Notes Feature)
  // ============================================================================

  // GET /api/coach-notes?coachId=xxx — fetch all notes for a coach
  app.get("/api/coach-notes", requireAuth, async (req: any, res) => {
    try {
      const { coachId } = req.query;
      if (!coachId || typeof coachId !== "string") {
        return res.status(400).json({ message: "coachId query param is required" });
      }
      const notes = await storage.getCoachNotes(coachId, req.user.clubId);
      res.json(notes);
    } catch (error: any) {
      console.error("Error fetching coach notes:", error);
      res.status(500).json({ message: "Failed to fetch coach notes" });
    }
  });

  // POST /api/coach-notes — create a new note
  app.post("/api/coach-notes", requireAuth, async (req: any, res) => {
    try {
      const { title, type, content, status, creatorId, items, squadIds } = req.body;
      if (!title || !type || !creatorId || !squadIds || squadIds.length === 0) {
        return res.status(400).json({ message: "title, type, creatorId, and at least one squadId are required" });
      }
      const note = await storage.createCoachNote(
        { title, type, content: content || null, status: status || "open", creatorId, clubId: req.user.clubId },
        items || [],
        squadIds,
      );
      res.status(201).json(note);
    } catch (error: any) {
      console.error("Error creating coach note:", error);
      res.status(500).json({ message: "Failed to create coach note" });
    }
  });

  // PATCH /api/coach-notes/:id — update note (title/content/status/items/squads)
  app.patch("/api/coach-notes/:id", requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { title, content, status, items, squadIds } = req.body;
      const noteFields: Record<string, any> = {};
      if (title !== undefined) noteFields.title = title;
      if (content !== undefined) noteFields.content = content;
      if (status !== undefined) noteFields.status = status;

      const updated = await storage.updateCoachNote(id, noteFields, items, squadIds);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating coach note:", error);
      res.status(500).json({ message: "Failed to update coach note" });
    }
  });

  // DELETE /api/coach-notes/:id — delete note (cascades to items and squad links)
  app.delete("/api/coach-notes/:id", requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteCoachNote(id);
      res.json({ message: "Note deleted" });
    } catch (error: any) {
      console.error("Error deleting coach note:", error);
      res.status(500).json({ message: "Failed to delete coach note" });
    }
  });

  // PATCH /api/coach-note-items/:itemId — toggle a checklist item's completed state
  app.patch("/api/coach-note-items/:itemId", requireAuth, async (req: any, res) => {
    try {
      const { itemId } = req.params;
      const { completed } = req.body;
      if (typeof completed !== "boolean") {
        return res.status(400).json({ message: "completed (boolean) is required" });
      }
      const updated = await storage.updateCoachNoteItem(itemId, completed);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating coach note item:", error);
      res.status(500).json({ message: "Failed to update note item" });
    }
  });

  // ============================================================================
  // Handbook Documents API
  // ============================================================================

  // GET /api/handbook-documents — fetch all active documents for the coach's club
  app.get("/api/handbook-documents", requireAuth, async (req: any, res) => {
    try {
      const docs = await storage.getHandbookDocuments(req.user.clubId);
      res.json(docs);
    } catch (error: any) {
      console.error("Error fetching handbook documents:", error);
      res.status(500).json({ message: "Failed to fetch handbook documents" });
    }
  });

  // POST /api/handbook-documents — upload a new document
  app.post("/api/handbook-documents", requireAuth, async (req: any, res) => {
    try {
      const { name, fileType, size, category, fileData, uploadedBy } = req.body;
      if (!name || !fileType || !size || !category || !fileData || !uploadedBy) {
        return res.status(400).json({ message: "name, fileType, size, category, fileData, and uploadedBy are required" });
      }
      const doc = await storage.createHandbookDocument({
        clubId: req.user.clubId,
        uploadedByUserId: req.user.id,
        name,
        fileType,
        size,
        category,
        fileData,
        uploadedBy,
      });
      res.status(201).json(doc);
    } catch (error: any) {
      console.error("Error creating handbook document:", error);
      res.status(500).json({ message: "Failed to upload document" });
    }
  });

  // ============================================================================
  // Recurring Sessions API (admin only)
  // ============================================================================

  app.get("/api/recurring-sessions", requireAuth, async (req: any, res) => {
    try {
      const rows = await storage.getRecurringSessions(req.user.clubId);
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch recurring sessions" });
    }
  });

  app.post("/api/recurring-sessions", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const { squadIds, ...data } = req.body;
      if (!data.dayOfWeek || !data.startTime || !data.endTime || !data.locationId || !data.leadCoachId || !data.setWriterId) {
        return res.status(400).json({ message: "dayOfWeek, startTime, endTime, locationId, leadCoachId, setWriterId are required" });
      }
      if (!squadIds || !Array.isArray(squadIds) || squadIds.length === 0) {
        return res.status(400).json({ message: "At least one squad is required" });
      }
      const rs = await storage.createRecurringSession({ ...data, clubId: req.user.clubId }, squadIds);
      res.status(201).json(rs);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to create recurring session" });
    }
  });

  app.patch("/api/recurring-sessions/:id", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { squadIds, ...data } = req.body;
      const rs = await storage.updateRecurringSession(id, req.user.clubId, data, squadIds);
      res.json(rs);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to update recurring session" });
    }
  });

  app.delete("/api/recurring-sessions/:id", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteRecurringSession(id, req.user.clubId);
      res.json({ message: "Deleted" });
    } catch (e: any) {
      res.status(500).json({ message: "Failed to delete recurring session" });
    }
  });

  // ============================================================================
  // Absence Periods API
  // ============================================================================

  app.get("/api/absence-periods", requireAuth, async (req: any, res) => {
    try {
      const rows = await storage.getAbsencePeriods(req.user.clubId);
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch absence periods" });
    }
  });

  app.post("/api/absence-periods", requireAuth, async (req: any, res) => {
    try {
      const { startDate, endDate, absenceType } = req.body;
      if (!startDate || !endDate || !absenceType) {
        return res.status(400).json({ message: "startDate, endDate, absenceType are required" });
      }
      const coachId = req.user.coachId;
      if (!coachId) return res.status(400).json({ message: "No coach profile found" });
      const row = await storage.createAbsencePeriod({
        ...req.body,
        coachId,
        clubId: req.user.clubId,
      });
      res.status(201).json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to create absence period" });
    }
  });

  app.delete("/api/absence-periods/:id", requireAuth, async (req: any, res) => {
    try {
      const coachId = req.user.coachId;
      if (!coachId) return res.status(400).json({ message: "No coach profile found" });
      await storage.deleteAbsencePeriod(req.params.id, coachId);
      res.json({ message: "Deleted" });
    } catch (e: any) {
      res.status(500).json({ message: "Failed to delete absence period" });
    }
  });

  // ============================================================================
  // Cover Opportunities API
  // ============================================================================

  app.get("/api/cover-opportunities", requireAuth, async (req: any, res) => {
    try {
      const rows = await storage.getCoverOpportunities(req.user.clubId);
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch cover opportunities" });
    }
  });

  app.post("/api/cover-opportunities", requireAuth, async (req: any, res) => {
    try {
      const { sessionId, role, reason } = req.body;
      if (!sessionId || !role) {
        return res.status(400).json({ message: "sessionId and role are required" });
      }

      const validRoles = ["lead", "second", "helper"];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ message: "role must be one of: lead, second, helper" });
      }

      const coachId = req.user.coachId;
      if (!coachId) return res.status(400).json({ message: "No coach profile found" });

      // Verify the session belongs to this coach's club
      const session = await storage.getSession(sessionId);
      if (!session || session.clubId !== req.user.clubId) {
        return res.status(403).json({ message: "Session not found or access denied" });
      }

      // Verify the session date is today or in the future
      const today = new Date().toISOString().slice(0, 10);
      if (session.sessionDate < today) {
        return res.status(400).json({ message: "Cannot request cover for past sessions" });
      }

      // Verify the requesting coach is assigned to the selected role on this session
      const roleCoachMap: Record<string, string | null | undefined> = {
        lead: session.leadCoachId,
        second: session.secondCoachId,
        helper: session.helperId,
      };
      if (roleCoachMap[role] !== coachId) {
        return res.status(403).json({ message: "You are not assigned to the selected role on this session" });
      }

      const row = await storage.createCoverOpportunity({
        sessionId,
        role,
        reason: reason ?? null,
        requesterCoachId: coachId,
        clubId: req.user.clubId,
        coverStatus: "pending",
      });
      res.status(201).json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to create cover opportunity" });
    }
  });

  app.patch("/api/cover-opportunities/:id/volunteer", requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const coachId = req.user.coachId;
      if (!coachId) return res.status(400).json({ message: "No coach profile found" });

      const opportunities = await storage.getCoverOpportunities(req.user.clubId);
      const opp = opportunities.find(o => o.id === id);
      if (!opp) return res.status(404).json({ message: "Cover opportunity not found" });

      // Guard: must be in pending state
      if (opp.coverStatus !== "pending") {
        return res.status(409).json({ message: "Cover request is no longer open" });
      }

      // Guard: cannot self-volunteer (requester cannot cover their own request)
      if (opp.requesterCoachId === coachId) {
        return res.status(400).json({ message: "You cannot volunteer to cover your own request" });
      }

      // Verify the referenced session belongs to this club before updating it
      const session = await storage.getSession(opp.sessionId);
      if (!session || session.clubId !== req.user.clubId) {
        return res.status(403).json({ message: "Session not found or access denied" });
      }

      const updated = await storage.updateCoverOpportunity(id, req.user.clubId, {
        coverStatus: "covered",
        coverCoachId: coachId,
      });

      // Update the swimming session with the volunteering coach in the relevant role
      let sessionUpdate: { leadCoachId?: string; secondCoachId?: string; helperId?: string } | undefined;
      if (opp.role === "lead") sessionUpdate = { leadCoachId: coachId };
      else if (opp.role === "second") sessionUpdate = { secondCoachId: coachId };
      else if (opp.role === "helper") sessionUpdate = { helperId: coachId };
      if (sessionUpdate) {
        await storage.updateSession(opp.sessionId, sessionUpdate);
      }

      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to volunteer for cover" });
    }
  });

  app.delete("/api/cover-opportunities/:id", requireAuth, async (req: any, res) => {
    try {
      const coachId = req.user.coachId;
      if (!coachId) return res.status(400).json({ message: "No coach profile found" });
      await storage.deleteCoverOpportunity(req.params.id, coachId);
      res.json({ message: "Deleted" });
    } catch (e: any) {
      res.status(500).json({ message: "Failed to delete cover opportunity" });
    }
  });

  // ============================================================================
  // Float Sessions API
  // ============================================================================

  app.get("/api/float-sessions", requireAuth, async (req: any, res) => {
    try {
      const rows = await storage.getFloatSessions(req.user.clubId);
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch float sessions" });
    }
  });

  app.post("/api/float-sessions", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const { sessionDate, startTime, endTime, coachId, locationId } = req.body;
      if (!sessionDate || !startTime || !endTime || !coachId || !locationId) {
        return res.status(400).json({ message: "sessionDate, startTime, endTime, coachId, locationId are required" });
      }
      const row = await storage.createFloatSession({ ...req.body, clubId: req.user.clubId });
      res.status(201).json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to create float session" });
    }
  });

  app.delete("/api/float-sessions/:id", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      await storage.deleteFloatSession(req.params.id, req.user.clubId);
      res.json({ message: "Deleted" });
    } catch (e: any) {
      res.status(500).json({ message: "Failed to delete float session" });
    }
  });

  // DELETE /api/handbook-documents/:id — soft-delete a document
  app.delete("/api/handbook-documents/:id", requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteHandbookDocument(id);
      res.json({ message: "Document deleted" });
    } catch (error: any) {
      console.error("Error deleting handbook document:", error);
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
