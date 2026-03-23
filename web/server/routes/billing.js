/**
 * ═══════════════════════════════════════════════════════════════
 * Phase S25: Billing Routes — Stripe Checkout & Subscription
 * ═══════════════════════════════════════════════════════════════
 * 
 * This module handles the Stripe payment flow for both
 * subscriptions and one-time credit pack purchases.
 * 
 * Security Model:
 *   - Plans and packs are defined SERVER-SIDE only (never trust frontend).
 *   - User identity comes from JWT (req.user.id), not request body.
 *   - Stripe handles all card data — we never see credit card numbers.
 *   - Credits are NOT added here — only the Webhook does that.
 * 
 * Endpoints:
 *   GET  /api/billing/plans                  — List subscription plans
 *   GET  /api/billing/packs                  — List credit packs
 *   POST /api/billing/subscribe              — Start subscription checkout
 *   POST /api/billing/buy-credits            — Start credit pack checkout
 *   POST /api/billing/manage                 — Open Stripe Customer Portal
 *   GET  /api/billing/balance                — Get current credit balance
 *   GET  /api/billing/history                — Get transaction history
 */

import { Router } from 'express';
import Stripe from 'stripe';
import { requireAuth } from '../middleware/authMiddleware.js';
import { supabaseAdmin } from '../lib/supabase-admin.js';

const router = Router();

// ─────────────────────────────────────────────────────────────
// Stripe Initialization
// ─────────────────────────────────────────────────────────────
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
let stripe = null;

if (stripeSecretKey) {
  stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-12-18.acacia' });
  console.log('[Billing] ✅ Stripe client initialized.');
} else {
  console.warn('[Billing] ⚠️  STRIPE_SECRET_KEY not set — billing endpoints will return 503.');
}

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://volturiano.com';


// ─────────────────────────────────────────────────────────────
// Subscription Plan Definitions (SERVER-SIDE ONLY, SEK)
// ─────────────────────────────────────────────────────────────
const SUBSCRIPTION_PLANS = {
  starter: {
    id: 'starter',
    name: 'Starter',
    credits: 20,
    priceSek: 249,
    priceDisplay: '249 kr/mo',
    priceId: process.env.STRIPE_PRICE_STARTER_SUB || 'price_starter_sub_placeholder',
    description: '20 credits per month for curious builders',
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    credits: 55,
    priceSek: 499,
    priceDisplay: '499 kr/mo',
    priceId: process.env.STRIPE_PRICE_PRO_SUB || 'price_pro_sub_placeholder',
    description: '55 credits per month for serious creators',
    popular: true,
  },
  studio: {
    id: 'studio',
    name: 'Studio',
    credits: 120,
    priceSek: 999,
    priceDisplay: '999 kr/mo',
    priceId: process.env.STRIPE_PRICE_STUDIO_SUB || 'price_studio_sub_placeholder',
    description: '120 credits per month for agencies & teams',
  },
};


// ─────────────────────────────────────────────────────────────
// One-Time Credit Pack Definitions (SERVER-SIDE ONLY, SEK)
// ─────────────────────────────────────────────────────────────
const CREDIT_PACKS = {
  pack_10: {
    id: 'pack_10',
    name: '10 Credits',
    credits: 10,
    priceSek: 129,
    priceDisplay: '129 kr',
    priceId: process.env.STRIPE_PRICE_PACK_10 || 'price_pack_10_placeholder',
    description: '10 build credits — try before you subscribe',
  },
  pack_25: {
    id: 'pack_25',
    name: '25 Credits',
    credits: 25,
    priceSek: 329,
    priceDisplay: '329 kr',
    priceId: process.env.STRIPE_PRICE_PACK_25 || 'price_pack_25_placeholder',
    description: '25 build credits — great for a project sprint',
    popular: true,
  },
  pack_60: {
    id: 'pack_60',
    name: '60 Credits',
    credits: 60,
    priceSek: 749,
    priceDisplay: '749 kr',
    priceId: process.env.STRIPE_PRICE_PACK_60 || 'price_pack_60_placeholder',
    description: '60 build credits — best one-time value',
  },
};


// ─────────────────────────────────────────────────────────────
// Helper: Get or Create Stripe Customer
// ─────────────────────────────────────────────────────────────
async function getOrCreateStripeCustomer(userId, userEmail) {
  // 1. Check if user already has a stripe_customer_id in our DB
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single();

  if (profileError) {
    console.error('[Billing] Profile lookup failed:', profileError.message);
    throw new Error('Failed to look up user profile.');
  }

  if (profile?.stripe_customer_id) {
    console.log(`[Billing] Found existing Stripe customer: ${profile.stripe_customer_id}`);
    return profile.stripe_customer_id;
  }

  // 2. Check if a Stripe customer already exists with this email
  const existingCustomers = await stripe.customers.list({
    email: userEmail,
    limit: 1,
  });

  let customerId;

  if (existingCustomers.data.length > 0) {
    customerId = existingCustomers.data[0].id;
    console.log(`[Billing] Found Stripe customer by email: ${customerId}`);
  } else {
    // 3. Create a new Stripe customer
    const customer = await stripe.customers.create({
      email: userEmail,
      metadata: { user_id: userId },
    });
    customerId = customer.id;
    console.log(`[Billing] Created new Stripe customer: ${customerId}`);
  }

  // 4. Store the stripe_customer_id on the profile (via service_role, bypasses RLS)
  const { error: updateError } = await supabaseAdmin
    .from('profiles')
    .update({ stripe_customer_id: customerId })
    .eq('id', userId);

  if (updateError) {
    console.warn('[Billing] Failed to store stripe_customer_id:', updateError.message);
    // Non-fatal — we can still proceed with checkout
  }

  return customerId;
}


// ─────────────────────────────────────────────────────────────
// GET /api/billing/plans
// Public endpoint — returns subscription plans for the frontend.
// ─────────────────────────────────────────────────────────────
router.get('/plans', (req, res) => {
  const plans = Object.values(SUBSCRIPTION_PLANS).map(plan => ({
    id: plan.id,
    name: plan.name,
    credits: plan.credits,
    priceSek: plan.priceSek,
    priceDisplay: plan.priceDisplay,
    description: plan.description,
    popular: plan.popular || false,
  }));

  res.json({ success: true, plans });
});


// ─────────────────────────────────────────────────────────────
// GET /api/billing/packs
// Public endpoint — returns credit packs for the frontend.
// ─────────────────────────────────────────────────────────────
router.get('/packs', (req, res) => {
  const packs = Object.values(CREDIT_PACKS).map(pack => ({
    id: pack.id,
    name: pack.name,
    credits: pack.credits,
    priceSek: pack.priceSek,
    priceDisplay: pack.priceDisplay,
    description: pack.description,
    popular: pack.popular || false,
  }));

  res.json({ success: true, packs });
});


// ─────────────────────────────────────────────────────────────
// POST /api/billing/subscribe
// Protected — creates a Stripe Checkout Session for a
// monthly subscription plan.
// ─────────────────────────────────────────────────────────────
router.post('/subscribe', requireAuth, async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({
        success: false,
        error: 'Payment service is not configured. Please contact support.',
      });
    }

    // 1. Validate the requested plan
    const { planId } = req.body;

    if (!planId || !SUBSCRIPTION_PLANS[planId]) {
      return res.status(400).json({
        success: false,
        error: `Invalid plan ID: "${planId}". Valid options: ${Object.keys(SUBSCRIPTION_PLANS).join(', ')}`,
      });
    }

    const plan = SUBSCRIPTION_PLANS[planId];
    const userId = req.user.id;
    const userEmail = req.user.email;

    console.log(`[Billing] Creating subscription checkout: user=${userId}, plan=${planId}, credits=${plan.credits}`);

    // 2. Get or create Stripe Customer
    const customerId = await getOrCreateStripeCustomer(userId, userEmail);

    // 3. Create Stripe Checkout Session (subscription mode)
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [
        {
          price: plan.priceId,
          quantity: 1,
        },
      ],
      metadata: {
        user_id: userId,
        plan_id: planId,
        credit_amount: String(plan.credits),
      },
      subscription_data: {
        metadata: {
          user_id: userId,
          plan_id: planId,
          credit_amount: String(plan.credits),
        },
      },
      success_url: `${FRONTEND_URL}/builder?billing=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${FRONTEND_URL}/builder?billing=cancelled`,
    });

    console.log(`[Billing] ✅ Subscription checkout created: ${session.id} → ${planId}`);

    res.json({
      success: true,
      sessionId: session.id,
      url: session.url,
    });

  } catch (err) {
    console.error('[Billing] ❌ Subscription checkout failed:', err.message);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to create subscription checkout. Please try again.',
    });
  }
});


// ─────────────────────────────────────────────────────────────
// POST /api/billing/buy-credits
// Protected — creates a Stripe Checkout Session for a
// one-time credit pack purchase.
// ─────────────────────────────────────────────────────────────
router.post('/buy-credits', requireAuth, async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({
        success: false,
        error: 'Payment service is not configured. Please contact support.',
      });
    }

    // 1. Validate the requested pack
    const { packId } = req.body;

    if (!packId || !CREDIT_PACKS[packId]) {
      return res.status(400).json({
        success: false,
        error: `Invalid pack ID: "${packId}". Valid options: ${Object.keys(CREDIT_PACKS).join(', ')}`,
      });
    }

    const pack = CREDIT_PACKS[packId];
    const userId = req.user.id;
    const userEmail = req.user.email;

    console.log(`[Billing] Creating credit pack checkout: user=${userId}, pack=${packId}, credits=${pack.credits}`);

    // 2. Get or create Stripe Customer
    const customerId = await getOrCreateStripeCustomer(userId, userEmail);

    // 3. Create Stripe Checkout Session (payment mode — one-time)
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: customerId,
      line_items: [
        {
          price: pack.priceId,
          quantity: 1,
        },
      ],
      metadata: {
        user_id: userId,
        pack_id: packId,
        credit_amount: String(pack.credits),
        pack_name: pack.name,
      },
      success_url: `${FRONTEND_URL}/builder?billing=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${FRONTEND_URL}/builder?billing=cancelled`,
    });

    console.log(`[Billing] ✅ Credit pack checkout created: ${session.id} → ${packId}`);

    res.json({
      success: true,
      sessionId: session.id,
      url: session.url,
    });

  } catch (err) {
    console.error('[Billing] ❌ Credit pack checkout failed:', err.message);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to create credit pack checkout. Please try again.',
    });
  }
});


// ─────────────────────────────────────────────────────────────
// POST /api/billing/manage
// Protected — creates a Stripe Customer Portal session so
// the user can manage/cancel their subscription.
// ─────────────────────────────────────────────────────────────
router.post('/manage', requireAuth, async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({
        success: false,
        error: 'Payment service is not configured. Please contact support.',
      });
    }

    const userId = req.user.id;

    // 1. Get the user's stripe_customer_id from their profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (profileError || !profile?.stripe_customer_id) {
      console.warn(`[Billing] No stripe_customer_id for user ${userId}`);
      return res.status(400).json({
        success: false,
        error: 'No active subscription found. Please subscribe to a plan first.',
      });
    }

    console.log(`[Billing] Creating portal session for customer: ${profile.stripe_customer_id}`);

    // 2. Create Stripe Billing Portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${FRONTEND_URL}/builder`,
    });

    console.log(`[Billing] ✅ Portal session created: ${portalSession.id}`);

    res.json({
      success: true,
      url: portalSession.url,
    });

  } catch (err) {
    console.error('[Billing] ❌ Portal session creation failed:', err.message);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to open subscription management. Please try again.',
    });
  }
});


// ─────────────────────────────────────────────────────────────
// GET /api/billing/balance
// Protected — returns the user's full wallet state from
// the get_credit_balance() Supabase function.
// ─────────────────────────────────────────────────────────────
router.get('/balance', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabaseAdmin.rpc('get_credit_balance', {
      p_user_id: userId,
    });

    if (error) {
      console.error('[Billing] Balance check failed:', error.message);
      return res.status(500).json({ success: false, error: 'Failed to fetch credit balance.' });
    }

    res.json(data);

  } catch (err) {
    console.error('[Billing] ❌ Balance endpoint error:', err.message);
    res.status(500).json({ success: false, error: 'Internal server error.' });
  }
});


// ─────────────────────────────────────────────────────────────
// GET /api/billing/history
// Protected — returns the user's credit transaction history.
// ─────────────────────────────────────────────────────────────
router.get('/history', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = parseInt(req.query.offset) || 0;

    const { data, error, count } = await supabaseAdmin
      .from('credit_transactions')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[Billing] History fetch failed:', error.message);
      return res.status(500).json({ success: false, error: 'Failed to fetch transaction history.' });
    }

    res.json({
      success: true,
      transactions: data,
      total: count,
      limit,
      offset,
    });

  } catch (err) {
    console.error('[Billing] ❌ History endpoint error:', err.message);
    res.status(500).json({ success: false, error: 'Internal server error.' });
  }
});


export default router;
