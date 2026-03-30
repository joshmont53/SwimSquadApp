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

// ── Subscription quantity sync ────────────────────────────────────────────────
// Call this whenever active_users changes for a club.
// Reads the current active_users count from storage and updates the Stripe
// subscription item quantity to match, so billing is always accurate.
// Non-fatal: logs and swallows Stripe errors so they never break the main flow.
export async function syncSubscriptionQuantity(
  storage: { getClub: (id: string) => Promise<any> },
  clubId: string,
): Promise<void> {
  try {
    const club = await storage.getClub(clubId);
    if (!club?.stripeSubscriptionId) {
      console.log(`[Stripe] Club ${clubId} has no subscription — skipping quantity sync`);
      return;
    }
    const activeUsers = club.activeUsers ?? 0;
    // Stripe requires subscription quantity >= 1. When activeUsers reaches 0,
    // we set quantity to 1 as a billing floor so the subscription stays valid.
    // The admin must explicitly cancel the club to end the subscription.
    const quantity = Math.max(1, activeUsers);
    const stripe = await getUncachableStripeClient();
    const subscription = await stripe.subscriptions.retrieve(club.stripeSubscriptionId);
    const itemId = subscription.items?.data?.[0]?.id;
    if (!itemId) {
      console.error(`[Stripe] No subscription item found for subscription ${club.stripeSubscriptionId}`);
      return;
    }
    await stripe.subscriptionItems.update(itemId, { quantity });
    console.log(`[Stripe] Updated subscription ${club.stripeSubscriptionId} quantity to ${quantity} for club ${clubId}`);
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
