import { getUncachableStripeClient } from '../server/stripeClient';

/**
 * Seed script: creates the "Club Subscription" product in Stripe with graduated GBP pricing.
 *
 * Pricing tiers (per user per month):
 *   - Users 1–5:   £20 each
 *   - Users 6–10:  £15 each
 *   - Users 11+:   £10 each
 *
 * This script is idempotent — safe to run multiple times.
 * Run with: npx tsx scripts/seed-stripe-products.ts
 *
 * After running, the STRIPE_SUBSCRIPTION_PRICE_ID env var should be set
 * to the price ID printed by this script.
 */

const PRODUCT_NAME = 'Club Subscription';

async function seedStripeProducts() {
  const stripe = await getUncachableStripeClient();

  console.log('Checking for existing Club Subscription product...');

  const existingProducts = await stripe.products.search({
    query: `name:'${PRODUCT_NAME}' AND active:'true'`,
  });

  let productId: string;

  if (existingProducts.data.length > 0) {
    productId = existingProducts.data[0].id;
    console.log(`Product already exists: ${PRODUCT_NAME} (${productId})`);

    // Check if a graduated GBP price already exists for this product
    const existingPrices = await stripe.prices.list({
      product: productId,
      active: true,
    });

    const existingGraduatedGbp = existingPrices.data.find(
      (p) =>
        p.currency === 'gbp' &&
        p.recurring?.interval === 'month' &&
        p.billing_scheme === 'tiered' &&
        p.tiers_mode === 'graduated'
    );

    if (existingGraduatedGbp) {
      console.log(`Graduated GBP price already exists: ${existingGraduatedGbp.id}`);
      console.log('');
      console.log('Set the following environment variable:');
      console.log(`  STRIPE_SUBSCRIPTION_PRICE_ID=${existingGraduatedGbp.id}`);
      return;
    }
  } else {
    console.log(`Creating product: ${PRODUCT_NAME}...`);
    const product = await stripe.products.create({
      name: PRODUCT_NAME,
      description: 'Monthly subscription for swimming clubs. Billed per active user with graduated pricing.',
    });
    productId = product.id;
    console.log(`Created product: ${product.name} (${productId})`);
  }

  // Create graduated monthly GBP price
  // Tiers: 1–5 users @ £20, 6–10 users @ £15, 11+ users @ £10
  console.log('Creating graduated GBP monthly price...');

  const price = await stripe.prices.create({
    product: productId,
    currency: 'gbp',
    billing_scheme: 'tiered',
    tiers_mode: 'graduated',
    recurring: {
      interval: 'month',
      usage_type: 'licensed',
    },
    tiers: [
      {
        up_to: 5,
        unit_amount: 2000, // £20.00 per user (in pence)
      },
      {
        up_to: 10,
        unit_amount: 1500, // £15.00 per user (in pence)
      },
      {
        up_to: 'inf',
        unit_amount: 1000, // £10.00 per user (in pence)
      },
    ],
  });

  console.log(`Created graduated monthly GBP price: ${price.id}`);
  console.log('');
  console.log('Tiers:');
  console.log('  Users 1–5:   £20.00 / user / month');
  console.log('  Users 6–10:  £15.00 / user / month');
  console.log('  Users 11+:   £10.00 / user / month');
  console.log('');
  console.log('IMPORTANT — Set this environment variable:');
  console.log(`  STRIPE_SUBSCRIPTION_PRICE_ID=${price.id}`);
  console.log('');
  console.log('Done.');
}

seedStripeProducts().catch((err) => {
  console.error('Error seeding Stripe products:', err);
  process.exit(1);
});
