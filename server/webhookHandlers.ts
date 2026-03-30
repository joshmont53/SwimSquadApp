import Stripe from 'stripe';
import { getStripeSync, getUncachableStripeClient } from './stripeClient';
import { storage } from './storage';
import { db } from './db';
import { clubs, coaches, users, emailVerificationTokens } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { generateSecureToken, getVerificationExpiry } from './tokenUtils';
import { sendVerificationEmail } from './emailService';
import crypto from 'crypto';

// Shape stored in pending_registrations.form_data
interface PendingFormData {
  clubName: string;
  clubColor: string;
  firstName: string;
  lastName: string;
  email: string;
  dob: string;
  level: string;
  passwordHash: string;
}

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
    // Verifies signature and syncs raw Stripe data to the stripe schema.
    // We isolate this in a try/catch so that a sync failure (e.g. missing
    // line items on testmode sessions) does not prevent our own business
    // logic from running — the webhook is already signature-verified above.
    try {
      await sync.processWebhook(payload, signature);
    } catch (syncErr: unknown) {
      const msg = syncErr instanceof Error ? syncErr.message : String(syncErr);
      console.warn('[Webhook] StripeSync.processWebhook non-fatal error (continuing):', msg);
    }

    // Parse the (now verified) payload for our own business logic
    let event: Stripe.Event;
    try {
      event = JSON.parse(payload.toString('utf8')) as Stripe.Event;
    } catch {
      return;
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      await WebhookHandlers.handleCheckoutSessionCompleted(session);
    } else if (event.type === 'checkout.session.expired') {
      const session = event.data.object as Stripe.Checkout.Session;
      await WebhookHandlers.handleCheckoutSessionExpired(session);
    }
  }

  /**
   * Cleans up abandoned checkout sessions.
   * Called when the Stripe session expires without the user completing payment setup.
   */
  private static async handleCheckoutSessionExpired(session: Stripe.Checkout.Session): Promise<void> {
    const pending = await storage.getPendingRegistrationBySessionId(session.id);
    if (!pending) return;

    await storage.deletePendingRegistration(pending.id);
    console.log(`[Webhook] Expired checkout session ${session.id}: pending registration ${pending.id} removed`);
  }

  /**
   * Finalises club registration after the Stripe Checkout setup session completes.
   * Idempotent: if the club was already created (e.g. on a previous retry) it skips
   * record creation and only ensures the subscription exists.
   */
  private static async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const customerId = session.customer as string;

    // Look up pending registration by Stripe session ID
    const pending = await storage.getPendingRegistrationBySessionId(session.id);
    if (!pending) {
      console.log(`[Webhook] checkout.session.completed: no pending registration for session ${session.id}`);
      return;
    }

    const formData = pending.formData as PendingFormData;
    const isDevelopment = process.env.NODE_ENV === 'development';

    // ── Retrieve & attach the saved payment method ────────────────────────────
    let defaultPaymentMethodId: string | undefined;
    if (session.setup_intent) {
      const stripe = await getUncachableStripeClient();
      const setupIntent = await stripe.setupIntents.retrieve(session.setup_intent as string);
      defaultPaymentMethodId = typeof setupIntent.payment_method === 'string'
        ? setupIntent.payment_method
        : setupIntent.payment_method?.id;

      if (defaultPaymentMethodId) {
        // Attach the payment method only if not already attached (Stripe may attach it automatically
        // during setup checkout — re-attaching an already-attached method can throw in some API versions)
        try {
          await stripe.paymentMethods.attach(defaultPaymentMethodId, { customer: customerId });
        } catch (attachErr: any) {
          const isAlreadyAttached = attachErr?.message?.includes('already been attached') ||
            attachErr?.code === 'payment_method_already_attached';
          if (!isAlreadyAttached) throw attachErr;
          console.log(`[Webhook] Payment method ${defaultPaymentMethodId} already attached — continuing`);
        }
        await stripe.customers.update(customerId, {
          invoice_settings: { default_payment_method: defaultPaymentMethodId },
        });
      }
    }

    // ── Idempotency check: skip DB creation if club already exists ────────────
    let clubId: string;
    const existingClub = await storage.getClubByStripeCustomerId(customerId);
    if (!existingClub) {
      // ── Create club / coach / user in a single atomic transaction ─────────
      const userId = crypto.randomUUID();
      const result = await db.transaction(async (tx) => {
        const validColor = /^#[0-9a-fA-F]{6}$/.test(formData.clubColor)
          ? formData.clubColor
          : '#4B9A4A';

        const [club] = await tx.insert(clubs).values({
          clubName: formData.clubName,
          clubColor: validColor,
          stripeCustomerId: customerId,
          activeUsers: 0,
          clubStatus: 'active',
        }).returning();

        const [coach] = await tx.insert(coaches).values({
          clubId: club.id,
          firstName: formData.firstName,
          lastName: formData.lastName,
          level: formData.level || 'No Qualification',
          dob: formData.dob,
          recordStatus: 'active',
        }).returning();

        await tx.update(clubs).set({ primaryCoachId: coach.id }).where(eq(clubs.id, club.id));

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

        await tx.update(coaches).set({ userId: user.id }).where(eq(coaches.id, coach.id));

        const verificationToken = generateSecureToken();
        await tx.insert(emailVerificationTokens).values({
          userId: user.id,
          token: verificationToken,
          expiresAt: getVerificationExpiry(),
        });

        return { user, club, coach, verificationToken };
      });

      clubId = result.club.id;

      // Seed default coaching rates (non-fatal)
      try {
        await storage.seedClubCoachingRates(clubId);
      } catch (err) {
        console.error('[Webhook] Failed to seed coaching rates:', err);
      }

      // Send verification email (non-fatal in production)
      if (!isDevelopment) {
        try {
          await sendVerificationEmail(result.user.email!, result.verificationToken, formData.firstName);
        } catch (emailErr) {
          console.error('[Webhook] Failed to send verification email:', emailErr);
        }
      }

      console.log(`[Webhook] Club ${clubId} (${formData.clubName}) created for customer ${customerId}`);
    } else {
      clubId = existingClub.id;
      console.log(`[Webhook] Club ${clubId} already exists for customer ${customerId} (retry scenario)`);
    }

    // ── Create Stripe Subscription (required — rethrow on failure so Stripe retries) ──
    const priceId = process.env.STRIPE_SUBSCRIPTION_PRICE_ID;
    if (!priceId) {
      console.error('[Webhook] STRIPE_SUBSCRIPTION_PRICE_ID is not set — cannot create subscription');
      throw new Error('STRIPE_SUBSCRIPTION_PRICE_ID env var missing');
    }

    const currentClub = await storage.getClub(clubId);
    if (!currentClub?.stripeSubscriptionId) {
      const stripe = await getUncachableStripeClient();
      const subscriptionParams: Stripe.SubscriptionCreateParams = {
        customer: customerId,
        items: [{ price: priceId, quantity: 1 }],
      };
      if (defaultPaymentMethodId) {
        subscriptionParams.default_payment_method = defaultPaymentMethodId;
      }
      // Use a deterministic idempotency key tied to the session so that partial-failure retries
      // (e.g., subscription created but DB update failed) don't produce duplicate subscriptions.
      const idempotencyKey = `sub-create-${session.id}`;
      const subscription = await stripe.subscriptions.create(subscriptionParams, {
        idempotencyKey,
      });

      await storage.updateClub(clubId, {
        stripeSubscriptionId: subscription.id,
        activeUsers: 1,
      });

      console.log(`[Webhook] Subscription ${subscription.id} created for club ${clubId}`);
    } else {
      // Subscription already exists (idempotent retry) — just ensure activeUsers=1
      if (!currentClub.activeUsers) {
        await storage.updateClub(clubId, { activeUsers: 1 });
      }
      console.log(`[Webhook] Subscription already exists for club ${clubId} (retry scenario)`);
    }

    // ── Remove pending registration only after full success ───────────────────
    await storage.deletePendingRegistration(pending.id);
    console.log(`[Webhook] Registration complete: club=${clubId} (${formData.clubName})`);
  }
}
