import Stripe from 'stripe';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? 'depl ' + process.env.WEB_REPL_RENEWAL
      : null;

  if (!xReplitToken) {
    throw new Error('X-Replit-Token not found for repl/depl');
  }

  const connectorName = 'stripe';
  const isProduction = process.env.REPLIT_DEPLOYMENT === '1';
  const targetEnvironment = isProduction ? 'production' : 'development';

  const url = new URL(`https://${hostname}/api/v2/connection`);
  url.searchParams.set('include_secrets', 'true');
  url.searchParams.set('connector_names', connectorName);
  url.searchParams.set('environment', targetEnvironment);

  const response = await fetch(url.toString(), {
    headers: {
      'Accept': 'application/json',
      'X-Replit-Token': xReplitToken,
    },
  });

  const data = await response.json();
  connectionSettings = data.items?.[0];

  if (!connectionSettings || (!connectionSettings.settings.publishable || !connectionSettings.settings.secret)) {
    throw new Error(`Stripe ${targetEnvironment} connection not found`);
  }

  return {
    publishableKey: connectionSettings.settings.publishable,
    secretKey: connectionSettings.settings.secret,
  };
}

// WARNING: Never cache this client.
// Always call this function again to get a fresh client.
export async function getUncachableStripeClient() {
  const { secretKey } = await getCredentials();
  return new Stripe(secretKey, {
    apiVersion: '2025-08-27.basil',
  });
}

export async function getStripePublishableKey() {
  const { publishableKey } = await getCredentials();
  return publishableKey;
}

export async function getStripeSecretKey() {
  const { secretKey } = await getCredentials();
  return secretKey;
}

// ── Storage interface for subscription sync ───────────────────────────────────
interface SyncStorage {
  getClub(id: string): Promise<any>;
  updateClub(id: string, data: any): Promise<any>;
}

// ── Subscription quantity sync ────────────────────────────────────────────────
// Call this whenever active_users changes for a club.
// Reads the current active_users count from storage and:
//   - activeUsers >= 1 + subscription exists: updates Stripe quantity to match
//   - activeUsers >= 1 + no subscription: creates a new subscription (reactivation path)
//   - activeUsers = 0 + subscription exists: cancels subscription + clears stripeSubscriptionId
//   - activeUsers = 0 + no subscription: no-op
// Non-fatal: logs and swallows Stripe errors so they never break the main flow.
export async function syncSubscriptionQuantity(
  storage: SyncStorage,
  clubId: string,
): Promise<void> {
  try {
    const club = await storage.getClub(clubId);
    if (!club) {
      console.log(`[Stripe] Club ${clubId} not found — skipping quantity sync`);
      return;
    }

    const activeUsers = club.activeUsers ?? 0;
    const stripe = await getUncachableStripeClient();

    // ── Case: no active users ──────────────────────────────────────────────
    if (activeUsers === 0) {
      if (!club.stripeSubscriptionId) {
        // Already cancelled or never subscribed — nothing to do
        console.log(`[Stripe] Club ${clubId} has 0 active users and no subscription — no-op`);
        return;
      }
      // Cancel the subscription so Stripe quantity truly matches 0 (by ending billing)
      console.log(`[Stripe] Club ${clubId} has 0 active users — cancelling subscription ${club.stripeSubscriptionId}`);
      await stripe.subscriptions.cancel(club.stripeSubscriptionId);
      // Clear stripeSubscriptionId in DB so the reactivation path can create a new one
      await storage.updateClub(clubId, { stripeSubscriptionId: null });
      console.log(`[Stripe] Cleared stripeSubscriptionId for club ${clubId}`);
      return;
    }

    // ── Case: active users >= 1, has existing subscription ────────────────
    if (club.stripeSubscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(club.stripeSubscriptionId);
      // Guard: subscription may already be cancelled (e.g. webhook raced ahead)
      if (subscription.status === 'canceled') {
        console.log(`[Stripe] Subscription ${club.stripeSubscriptionId} already canceled — will create new one`);
        await storage.updateClub(clubId, { stripeSubscriptionId: null });
        // Fall through to create a new subscription below
      } else {
        const itemId = subscription.items?.data?.[0]?.id;
        if (!itemId) {
          console.error(`[Stripe] No subscription item found for ${club.stripeSubscriptionId}`);
          return;
        }
        await stripe.subscriptionItems.update(itemId, { quantity: activeUsers });
        console.log(`[Stripe] Updated subscription ${club.stripeSubscriptionId} quantity to ${activeUsers} for club ${clubId}`);
        return;
      }
    }

    // ── Case: active users >= 1, no subscription (create / reactivate) ────
    if (!club.stripeCustomerId) {
      console.log(`[Stripe] Club ${clubId} has no Stripe customer — cannot create subscription`);
      return;
    }
    const priceId = process.env.STRIPE_SUBSCRIPTION_PRICE_ID;
    if (!priceId) {
      console.error(`[Stripe] STRIPE_SUBSCRIPTION_PRICE_ID not set — cannot create subscription for club ${clubId}`);
      return;
    }
    console.log(`[Stripe] Club ${clubId} has ${activeUsers} active users but no subscription — creating new one`);
    const newSub = await stripe.subscriptions.create({
      customer: club.stripeCustomerId,
      items: [{ price: priceId, quantity: activeUsers }],
    });
    await storage.updateClub(clubId, { stripeSubscriptionId: newSub.id });
    console.log(`[Stripe] Created new subscription ${newSub.id} for club ${clubId} with quantity ${activeUsers}`);
  } catch (err: any) {
    // Non-fatal: log the error but don't rethrow — billing discrepancies can be fixed manually
    console.error(`[Stripe] Failed to sync subscription quantity for club ${clubId}:`, err?.message ?? err);
  }
}

// ── Subscription cancellation ─────────────────────────────────────────────────
// Cancels the Stripe subscription immediately. Called when a club is cancelled.
export async function cancelStripeSubscription(subscriptionId: string): Promise<void> {
  const stripe = await getUncachableStripeClient();
  await stripe.subscriptions.cancel(subscriptionId);
  console.log(`[Stripe] Cancelled subscription ${subscriptionId}`);
}

// StripeSync singleton for webhook processing and data sync
let stripeSync: any = null;

export async function getStripeSync() {
  if (!stripeSync) {
    const { StripeSync } = await import('stripe-replit-sync');
    const secretKey = await getStripeSecretKey();
    stripeSync = new StripeSync({
      poolConfig: {
        connectionString: process.env.DATABASE_URL!,
        max: 2,
      },
      stripeSecretKey: secretKey,
    });
  }
  return stripeSync;
}
