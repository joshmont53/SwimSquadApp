-- Migration: add pending_registrations table
-- Purpose: Temporary store for club registrations awaiting Stripe Checkout completion.
-- Records are created when the register-club endpoint is called and deleted by the webhook
-- handler once the checkout.session.completed event fires (or checkout.session.expired fires).

CREATE TABLE IF NOT EXISTS pending_registrations (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_checkout_session_id VARCHAR NOT NULL UNIQUE,
  form_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
