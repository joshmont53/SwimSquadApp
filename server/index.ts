import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { startNotificationScheduler } from "./notifications/scheduler";
import { WebhookHandlers } from "./webhookHandlers";
import { runMigrations } from "stripe-replit-sync";
import { getStripeSync } from "./stripeClient";
import { pool, db } from "./db";
import {
  clubs, coaches, squads, swimmers, swimmingSessions,
  locations, competitions, authorizedInvitations, coachingRates,
  drills, sessionTemplates,
} from "@shared/schema";
import { eq } from "drizzle-orm";

const app = express();

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}

// CRITICAL: Register Stripe webhook route BEFORE express.json() middleware.
// Stripe signature verification requires the raw Buffer body.
app.post(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  async (req: Request, res: Response) => {
    const signature = req.headers['stripe-signature'];

    if (!signature) {
      res.status(400).json({ error: 'Missing stripe-signature header' });
      return;
    }

    const sig = Array.isArray(signature) ? signature[0] : signature;

    if (!Buffer.isBuffer(req.body)) {
      console.error(
        'STRIPE WEBHOOK ERROR: req.body is not a Buffer. ' +
        'This means express.json() ran before this webhook route.'
      );
      res.status(500).json({ error: 'Webhook processing error' });
      return;
    }

    try {
      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('Webhook error:', error.message);
      if (error.message?.includes('payload must be provided as a string or a Buffer')) {
        console.error(
          'STRIPE WEBHOOK ERROR: Payload is not a Buffer. ' +
          'Ensure the webhook route is registered BEFORE app.use(express.json()).'
        );
      }
      res.status(400).json({ error: 'Webhook processing error' });
    }
  }
);

app.use(express.json({
  limit: '10mb',
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.warn('[Stripe] DATABASE_URL not set — skipping Stripe initialization');
    return;
  }

  const replitDomain = process.env.REPLIT_DOMAINS?.split(',')[0];
  if (!replitDomain) {
    console.error('[Stripe] REPLIT_DOMAINS not set — webhook registration will be skipped. Payments will not function until this is resolved.');
  }

  try {
    log('Initializing Stripe schema...');
    await runMigrations({ databaseUrl, schema: 'stripe' });
    log('Stripe schema ready');

    const stripeSync = await getStripeSync();

    if (replitDomain) {
      log('Setting up managed Stripe webhook...');
      const webhookUrl = `https://${replitDomain}/api/stripe/webhook`;
      await stripeSync.findOrCreateManagedWebhook(webhookUrl);
      log('Stripe webhook configured');
    } else {
      console.warn('[Stripe] Skipping webhook registration — REPLIT_DOMAINS is not set');
    }

    // Run syncBackfill in the background — don't block server startup
    stripeSync.syncBackfill()
      .then(() => log('Stripe data backfill complete'))
      .catch((err: any) => console.error('[Stripe] syncBackfill error:', err));
  } catch (error) {
    console.error('[Stripe] CRITICAL: Failed to initialize Stripe — payments will not function until resolved:', error);
    // Don't throw — allow server to start even if Stripe init fails
  }
}

async function ensurePasswordResetTokensTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        used_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token
        ON password_reset_tokens(token)
    `);
    log('password_reset_tokens table ready');
  } catch (error) {
    console.error('[Migration] Failed to ensure password_reset_tokens table:', error);
  }
}

async function initializeHartSwimmingClub() {
  try {
    const existingClubs = await db.select().from(clubs);
    if (existingClubs.length > 0) {
      log('[Init] Club already exists — skipping Hart Swimming Club initialization');
      return;
    }

    log('[Init] No clubs found — initializing Hart Swimming Club...');

    // 1. Create the club
    // active_users = 2: only Josh Montgomery and Will Fuller have active user accounts
    const [club] = await db.insert(clubs).values({
      clubName: 'Hart Swimming Club',
      clubColor: '#4B9A4A',
      clubStatus: 'active',
      activeUsers: 2,
    }).returning();

    log(`[Init] Created club: ${club.id}`);

    // 2. Set Josh Montgomery as primary coach
    const JOSH_COACH_ID = '73e876d4-4d72-4f06-84ae-4b9adec7ac75';
    await db.update(clubs).set({ primaryCoachId: JOSH_COACH_ID }).where(eq(clubs.id, club.id));

    // 3. Link all existing data to Hart Swimming Club
    await db.update(coaches).set({ clubId: club.id });
    log('[Init] Coaches linked');

    await db.update(squads).set({ clubId: club.id });
    log('[Init] Squads linked');

    await db.update(swimmers).set({ clubId: club.id });
    log('[Init] Swimmers linked');

    await db.update(swimmingSessions).set({ clubId: club.id });
    log('[Init] Sessions linked');

    await db.update(locations).set({ clubId: club.id });
    log('[Init] Locations linked');

    await db.update(competitions).set({ clubId: club.id });
    log('[Init] Competitions linked');

    await db.update(authorizedInvitations).set({ clubId: club.id });
    log('[Init] Invitations linked');

    await db.update(coachingRates).set({ clubId: club.id });
    log('[Init] Coaching rates linked');

    await db.update(drills).set({ clubId: club.id });
    log('[Init] Drills linked');

    await db.update(sessionTemplates).set({ clubId: club.id });
    log('[Init] Session templates linked');

    // 4. Set up Stripe customer and subscription
    // Quantity = 2: only Josh Montgomery and Will Fuller have active user accounts
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const stripePriceId = process.env.STRIPE_SUBSCRIPTION_PRICE_ID;

    if (stripeSecretKey && stripePriceId) {
      try {
        const Stripe = (await import('stripe')).default;
        const stripe = new Stripe(stripeSecretKey, { apiVersion: '2025-08-27.basil' });

        const customer = await stripe.customers.create({
          name: 'Hart Swimming Club',
          metadata: { clubId: club.id },
        });
        log(`[Init] Stripe customer created: ${customer.id}`);

        const subscription = await stripe.subscriptions.create({
          customer: customer.id,
          items: [{ price: stripePriceId, quantity: 2 }],
        });
        log(`[Init] Stripe subscription created: ${subscription.id}`);

        await db.update(clubs).set({
          stripeCustomerId: customer.id,
          stripeSubscriptionId: subscription.id,
        }).where(eq(clubs.id, club.id));

        log('[Init] Stripe IDs saved to club record');
      } catch (stripeErr) {
        console.error('[Init] Stripe setup failed (non-fatal — apply manually in Stripe dashboard):', stripeErr);
      }
    } else {
      console.warn('[Init] STRIPE_SECRET_KEY or STRIPE_SUBSCRIPTION_PRICE_ID not set — skipping Stripe setup');
    }

    log('[Init] Hart Swimming Club initialization complete');
  } catch (err) {
    console.error('[Init] Hart Swimming Club initialization failed:', err);
  }
}

(async () => {
  // Ensure auth-related tables exist (idempotent schema migrations)
  await ensurePasswordResetTokensTable();

  // One-time production initialization: create Hart Swimming Club and link all data
  await initializeHartSwimmingClub();

  // Initialize Stripe schema and webhook before registering routes
  await initStripe();

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);

    // Start the push notification scheduler
    startNotificationScheduler();
  });
})();
