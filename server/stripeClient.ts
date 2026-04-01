import Stripe from 'stripe';

let connectionSettings: any;

async function getCredentials() {
  const isProduction = process.env.REPLIT_DEPLOYMENT === '1';

  // In production the Replit connector is sandbox-only, so use env vars directly.
  if (isProduction) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) throw new Error('STRIPE_SECRET_KEY not configured for production');
    return { secretKey, publishableKey: process.env.STRIPE_PUBLISHABLE_KEY ?? '' };
  }

  // In development use the Replit Stripe connector (sandbox credentials).
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? 'depl ' + process.env.WEB_REPL_RENEWAL
      : null;

  if (!xReplitToken) {
    throw new Error('X-Replit-Token not found for repl/depl');
  }

  const url = new URL(`https://${hostname}/api/v2/connection`);
  url.searchParams.set('include_secrets', 'true');
  url.searchParams.set('connector_names', 'stripe');
  url.searchParams.set('environment', 'development');

  const response = await fetch(url.toString(), {
    headers: {
      'Accept': 'application/json',
      'X-Replit-Token': xReplitToken,
    },
  });

  const data = await response.json();
  connectionSettings = data.items?.[0];

  if (!connectionSettings || (!connectionSettings.settings.publishable || !connectionSettings.settings.secret)) {
    throw new Error('Stripe development connection not found');
  }

  return {
    publishableKey: connectionSettings.settings.publishable,
    secretKey: connectionSettings.settings.secret,
  };
}

// WARNING: Never cache this client. Always call this function again for a fresh client.
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

interface SyncStorage {
  getClub(id: string): Promise<{ stripeSubscriptionId?: string | null; stripeCustomerId?: string | null; activeUsers?: number | null } | undefined>;
  updateClub(id: string, data: Record<string, unknown>): Promise<unknown>;
}

/**
 * Synchronises the club's Stripe subscription quantity with active_users.
 *
 * Lifecycle:
 *   activeUsers >= 1 + subscription active  → update item quantity
 *   activeUsers >= 1 + no subscription      → create new subscription (reactivation path)
 *   activeUsers = 0  + subscription active  → cancel subscription + clear stripeSubscriptionId
 *   activeUsers = 0  + no subscription      → no-op
 *
 * Throws on Stripe or storage failure so callers can decide how to respond.
 */
export async function syncSubscriptionQuantity(
  storage: SyncStorage,
  clubId: string,
): Promise<void> {
  const club = await storage.getClub(clubId);
  if (!club) {
    console.log(`[Stripe] Club ${clubId} not found — skipping quantity sync`);
    return;
  }

  const activeUsers = club.activeUsers ?? 0;
  const stripe = await getUncachableStripeClient();

  if (activeUsers === 0) {
    if (!club.stripeSubscriptionId) {
      return; // already in sync — no subscription, no active users
    }
    console.log(`[Stripe] Club ${clubId} reached 0 active users — cancelling subscription ${club.stripeSubscriptionId}`);
    await stripe.subscriptions.cancel(club.stripeSubscriptionId);
    await storage.updateClub(clubId, { stripeSubscriptionId: null });
    console.log(`[Stripe] Subscription cancelled and stripeSubscriptionId cleared for club ${clubId}`);
    return;
  }

  // activeUsers >= 1
  if (club.stripeSubscriptionId) {
    const subscription = await stripe.subscriptions.retrieve(club.stripeSubscriptionId);
    if (subscription.status !== 'canceled') {
      const itemId = subscription.items.data[0]?.id;
      if (!itemId) throw new Error(`No subscription item found for ${club.stripeSubscriptionId}`);
      await stripe.subscriptionItems.update(itemId, {
        quantity: activeUsers,
        proration_behavior: 'none',
      });
      console.log(`[Stripe] Club ${clubId} subscription quantity updated to ${activeUsers} (no proration)`);
      return;
    }
    // Subscription was already cancelled externally — clear the stale ID and fall through
    await storage.updateClub(clubId, { stripeSubscriptionId: null });
  }

  // No active subscription — create one (reactivation path)
  if (!club.stripeCustomerId) {
    console.log(`[Stripe] Club ${clubId} has no Stripe customer — cannot create subscription`);
    return;
  }
  const priceId = process.env.STRIPE_SUBSCRIPTION_PRICE_ID;
  if (!priceId) {
    throw new Error(`STRIPE_SUBSCRIPTION_PRICE_ID not set — cannot create subscription for club ${clubId}`);
  }
  const newSub = await stripe.subscriptions.create({
    customer: club.stripeCustomerId,
    items: [{ price: priceId, quantity: activeUsers }],
  });
  await storage.updateClub(clubId, { stripeSubscriptionId: newSub.id });
  console.log(`[Stripe] Created new subscription ${newSub.id} for club ${clubId} with quantity ${activeUsers}`);
}

/**
 * Cancels the Stripe subscription immediately.
 * Throws on failure — caller is responsible for error handling.
 */
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
