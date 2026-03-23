/**
 * ═══════════════════════════════════════════════════════════════
 * Phase S25: Stripe Webhook — Full Subscription Lifecycle
 * ═══════════════════════════════════════════════════════════════
 * 
 * Handles ALL Stripe events for both one-time credit pack
 * purchases and subscription lifecycle management.
 * 
 * Events Handled:
 *   1. checkout.session.completed  → Subscription activation OR credit pack fulfillment
 *   2. invoice.payment_succeeded   → Subscription renewal (monthly credit reset)
 *   3. customer.subscription.updated → Plan change or status change
 *   4. customer.subscription.deleted → Cancellation
 *   5. invoice.payment_failed      → Mark subscription as past_due
 * 
 * Security Model:
 *   - Stripe signs every webhook payload with STRIPE_WEBHOOK_SECRET.
 *   - We verify the signature before processing.
 *   - Credits are added via SECURITY DEFINER Postgres functions
 *     called through supabaseAdmin (service_role).
 *   - Idempotency: checkout.session.completed checks for duplicate fulfillment.
 * 
 * IMPORTANT: This route MUST receive the RAW request body (not parsed JSON).
 * The raw body middleware is configured in index.js BEFORE express.json().
 */

import { Router } from 'express';
import Stripe from 'stripe';
import { supabaseAdmin } from '../lib/supabase-admin.js';

const router = Router();

// ─────────────────────────────────────────────────────────────
// Stripe Initialization
// ─────────────────────────────────────────────────────────────
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

let stripe = null;

if (stripeSecretKey) {
  stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-12-18.acacia' });
}

if (!webhookSecret) {
  console.warn('[Webhook] ⚠️  STRIPE_WEBHOOK_SECRET not set — webhook signature verification will fail.');
}


// ─────────────────────────────────────────────────────────────
// Price ID → Plan mapping (must match billing.js definitions)
// Used to detect plan changes in subscription.updated events.
// ─────────────────────────────────────────────────────────────
const PRICE_TO_PLAN = {};
if (process.env.STRIPE_PRICE_STARTER_SUB) PRICE_TO_PLAN[process.env.STRIPE_PRICE_STARTER_SUB] = 'starter';
if (process.env.STRIPE_PRICE_PRO_SUB) PRICE_TO_PLAN[process.env.STRIPE_PRICE_PRO_SUB] = 'pro';
if (process.env.STRIPE_PRICE_STUDIO_SUB) PRICE_TO_PLAN[process.env.STRIPE_PRICE_STUDIO_SUB] = 'studio';


// ─────────────────────────────────────────────────────────────
// POST /api/webhooks/stripe
// 
// Receives events from Stripe. The request body is RAW bytes
// (configured via express.raw in index.js) so we can verify
// the cryptographic signature.
// ─────────────────────────────────────────────────────────────
router.post('/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];

  // ── 1. Verify Stripe is configured ──
  if (!stripe || !webhookSecret) {
    console.error('[Webhook] ❌ Stripe or webhook secret not configured.');
    return res.status(503).json({ error: 'Webhook service not configured.' });
  }

  // ── 2. Verify the signature ──
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('[Webhook] ❌ Signature verification FAILED:', err.message);
    return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
  }

  console.log(`[Webhook] ✅ Verified event: ${event.type} (id: ${event.id})`);

  // ── 3. Handle specific event types ──
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event);
        break;

      default:
        console.log(`[Webhook] ℹ️  Unhandled event type: ${event.type}`);
    }
  } catch (handlerError) {
    console.error(`[Webhook] ❌ Handler error for ${event.type}:`, handlerError.message);
    // Still return 200 so Stripe doesn't retry endlessly
  }

  // ── 4. Always acknowledge receipt ──
  res.json({ received: true });
});


// ═══════════════════════════════════════════════════════════════
// HANDLER 1: checkout.session.completed
//
// Fires when a customer completes Stripe Checkout.
// Routes to subscription activation OR credit pack fulfillment
// based on session.mode.
// ═══════════════════════════════════════════════════════════════
async function handleCheckoutCompleted(event) {
  const session = event.data.object;
  const metadata = session.metadata || {};
  const { user_id, credit_amount, plan_id, pack_id, pack_name } = metadata;

  console.log(`[Webhook] 💳 Checkout completed (${session.mode}):`, {
    sessionId: session.id,
    subscriptionId: session.subscription,
    customerId: session.customer,
    userId: user_id,
    creditAmount: credit_amount,
    planId: plan_id,
    packId: pack_id,
    paymentStatus: session.payment_status,
  });

  // ── Sanity Checks ──
  if (!user_id) {
    console.error('[Webhook] ❌ CRITICAL: No user_id in session metadata! Session:', session.id);
    return;
  }

  const credits = parseInt(credit_amount, 10);
  if (!credits || credits <= 0 || isNaN(credits)) {
    console.error(`[Webhook] ❌ CRITICAL: Invalid credit_amount "${credit_amount}" in session:`, session.id);
    return;
  }

  if (session.payment_status !== 'paid') {
    console.warn(`[Webhook] ⚠️  Payment not yet confirmed (status: ${session.payment_status}). Skipping fulfillment.`);
    return;
  }

  // ── Idempotency Check ──
  const { data: existingTx, error: checkError } = await supabaseAdmin
    .from('credit_transactions')
    .select('id')
    .eq('stripe_payment_id', session.id)
    .in('type', ['purchase', 'subscription', 'signup_bonus'])
    .limit(1);

  if (checkError) {
    console.error('[Webhook] ❌ Idempotency check failed:', checkError.message);
  }

  if (existingTx && existingTx.length > 0) {
    console.warn(`[Webhook] ⚠️  Session ${session.id} already fulfilled. Skipping duplicate.`);
    return;
  }

  // ── Route by session mode ──
  if (session.mode === 'subscription') {
    await fulfillSubscription(session, user_id, plan_id, credits);
  } else if (session.mode === 'payment') {
    await fulfillCreditPack(session, user_id, pack_id, pack_name, credits);
  } else {
    console.warn(`[Webhook] ⚠️  Unknown session mode: ${session.mode}`);
  }
}


// ── Subscription Fulfillment ──
async function fulfillSubscription(session, userId, planId, credits) {
  try {
    // 1. Update profile with subscription details
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        subscription_plan: planId,
        subscription_status: 'active',
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
      })
      .eq('id', userId);

    if (profileError) {
      console.error('[Webhook] ❌ Failed to update subscription on profile:', profileError.message);
    }

    // 2. Add subscription credits via RPC
    const { data, error } = await supabaseAdmin.rpc('add_credits_safe', {
      p_user_id: userId,
      p_amount: credits,
      p_description: `${planId} plan activated (${credits} credits/month)`,
      p_stripe_payment_id: session.id,
      p_credit_type: 'subscription'
    });

    if (error) {
      console.error('[Webhook] ❌ add_credits_safe (subscription) failed:', error.message);
      console.error('[Webhook] ❌ MANUAL FIX REQUIRED: Session:', session.id, 'User:', userId, 'Credits:', credits);
      return;
    }

    if (data?.success) {
      console.log(`[Webhook] ✅ Subscription activated: ${planId} for user ${userId} (+${credits} credits)`);
    } else {
      console.error('[Webhook] ❌ add_credits_safe returned failure:', data?.error);
      console.error('[Webhook] ❌ MANUAL FIX REQUIRED: Session:', session.id, 'User:', userId);
    }

  } catch (err) {
    console.error('[Webhook] ❌ Subscription fulfillment error:', err.message);
    console.error('[Webhook] ❌ MANUAL FIX REQUIRED: Session:', session.id, 'User:', userId, 'Credits:', credits);
  }
}


// ── Credit Pack Fulfillment ──
async function fulfillCreditPack(session, userId, packId, packName, credits) {
  try {
    const { data, error } = await supabaseAdmin.rpc('add_credits_safe', {
      p_user_id: userId,
      p_amount: credits,
      p_description: `${packName || 'Credit Pack'} purchase (${credits} credits)`,
      p_stripe_payment_id: session.id,
      p_credit_type: 'purchased'
    });

    if (error) {
      console.error('[Webhook] ❌ add_credits_safe (purchased) failed:', error.message);
      console.error('[Webhook] ❌ MANUAL FIX REQUIRED: Session:', session.id, 'User:', userId, 'Credits:', credits);
      return;
    }

    if (data?.success) {
      console.log(`[Webhook] ✅ Credit pack purchased: ${packId} for user ${userId} (+${credits} credits)`);
      console.log(`[Webhook]    New purchased balance: ${data.new_balance}`);
    } else {
      console.error('[Webhook] ❌ add_credits_safe returned failure:', data?.error);
      console.error('[Webhook] ❌ MANUAL FIX REQUIRED: Session:', session.id, 'User:', userId);
    }

  } catch (err) {
    console.error('[Webhook] ❌ Credit pack fulfillment error:', err.message);
    console.error('[Webhook] ❌ MANUAL FIX REQUIRED: Session:', session.id, 'User:', userId, 'Credits:', credits);
  }
}


// ═══════════════════════════════════════════════════════════════
// HANDLER 2: invoice.payment_succeeded
//
// Fires on every successful invoice payment. For subscriptions,
// this triggers on each monthly renewal. We skip the first
// invoice (handled by checkout.session.completed) and only
// process renewals.
// ═══════════════════════════════════════════════════════════════
async function handleInvoicePaymentSucceeded(event) {
  const invoice = event.data.object;

  // Only process subscription invoices
  if (!invoice.subscription) {
    console.log('[Webhook] ℹ️  Non-subscription invoice, skipping.');
    return;
  }

  // Skip the first invoice — that's handled by checkout.session.completed
  if (invoice.billing_reason === 'subscription_create') {
    console.log('[Webhook] ℹ️  Initial subscription invoice, skipping (handled by checkout.session.completed).');
    return;
  }

  console.log(`[Webhook] 🔄 Subscription renewal invoice:`, {
    invoiceId: invoice.id,
    customerId: invoice.customer,
    subscriptionId: invoice.subscription,
    billingReason: invoice.billing_reason,
    periodEnd: invoice.lines?.data?.[0]?.period?.end,
  });

  // Look up the user by stripe_customer_id
  const { data: profile, error: lookupError } = await supabaseAdmin
    .from('profiles')
    .select('id, subscription_plan')
    .eq('stripe_customer_id', invoice.customer)
    .single();

  if (lookupError || !profile) {
    console.error('[Webhook] ❌ Could not find user for customer:', invoice.customer, lookupError?.message);
    return;
  }

  const userId = profile.id;
  const plan = profile.subscription_plan;

  // Get the period end from the invoice line items
  const periodEndUnix = invoice.lines?.data?.[0]?.period?.end;
  const periodEnd = periodEndUnix ? new Date(periodEndUnix * 1000).toISOString() : null;

  // Call the renewal RPC
  const { data, error } = await supabaseAdmin.rpc('handle_subscription_renewal', {
    p_user_id: userId,
    p_plan: plan,
    p_period_end: periodEnd,
  });

  if (error) {
    console.error('[Webhook] ❌ handle_subscription_renewal failed:', error.message);
    console.error('[Webhook] ❌ MANUAL FIX REQUIRED: User:', userId, 'Plan:', plan);
    return;
  }

  if (data?.success) {
    console.log(`[Webhook] ✅ Subscription renewed for user ${userId}, plan: ${plan} (+${data.credits_allocated} credits)`);
  } else {
    console.error('[Webhook] ❌ Renewal RPC returned failure:', data?.error);
  }
}


// ═══════════════════════════════════════════════════════════════
// HANDLER 3: customer.subscription.updated
//
// Fires when a subscription is modified (plan change, status
// change, payment method update, etc.).
// ═══════════════════════════════════════════════════════════════
async function handleSubscriptionUpdated(event) {
  const subscription = event.data.object;

  console.log(`[Webhook] 🔄 Subscription updated:`, {
    subscriptionId: subscription.id,
    status: subscription.status,
    currentPeriodEnd: subscription.current_period_end,
  });

  // Look up user by stripe_subscription_id
  const { data: profile, error: lookupError } = await supabaseAdmin
    .from('profiles')
    .select('id, subscription_plan')
    .eq('stripe_subscription_id', subscription.id)
    .single();

  if (lookupError || !profile) {
    console.error('[Webhook] ❌ Could not find user for subscription:', subscription.id, lookupError?.message);
    return;
  }

  const userId = profile.id;
  const updateData = {
    subscription_status: subscription.cancel_at_period_end ? 'canceling' : subscription.status,
    subscription_period_end: subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null,
  };

  // Check if the plan changed by inspecting the price ID
  const currentPriceId = subscription.items?.data?.[0]?.price?.id;
  if (currentPriceId && PRICE_TO_PLAN[currentPriceId]) {
    const newPlan = PRICE_TO_PLAN[currentPriceId];
    if (newPlan !== profile.subscription_plan) {
      console.log(`[Webhook] 🔄 Plan changed: ${profile.subscription_plan} → ${newPlan} for user ${userId}`);
      updateData.subscription_plan = newPlan;
    }
  }

  const { error: updateError } = await supabaseAdmin
    .from('profiles')
    .update(updateData)
    .eq('id', userId);

  if (updateError) {
    console.error('[Webhook] ❌ Failed to update subscription status:', updateError.message);
    return;
  }

  console.log(`[Webhook] ℹ️  Subscription updated for user ${userId} — status: ${subscription.status}`);
}


// ═══════════════════════════════════════════════════════════════
// HANDLER 4: customer.subscription.deleted
//
// Fires when a subscription is fully cancelled (end of period
// or immediate cancellation).
// ═══════════════════════════════════════════════════════════════
async function handleSubscriptionDeleted(event) {
  const subscription = event.data.object;

  console.log(`[Webhook] ⚠️  Subscription deleted:`, {
    subscriptionId: subscription.id,
    status: subscription.status,
  });

  // Look up user by stripe_subscription_id
  const { data: profile, error: lookupError } = await supabaseAdmin
    .from('profiles')
    .select('id, subscription_plan')
    .eq('stripe_subscription_id', subscription.id)
    .single();

  if (lookupError || !profile) {
    console.error('[Webhook] ❌ Could not find user for deleted subscription:', subscription.id, lookupError?.message);
    return;
  }

  const userId = profile.id;

  // Downgrade to free plan
  const { error: updateError } = await supabaseAdmin
    .from('profiles')
    .update({
      subscription_plan: 'free',
      subscription_status: 'cancelled',
      subscription_credits: 0,
      stripe_subscription_id: null,
      daily_credits_limit: 3,
    })
    .eq('id', userId);

  if (updateError) {
    console.error('[Webhook] ❌ Failed to downgrade user on cancellation:', updateError.message);
    return;
  }

  console.log(`[Webhook] ⚠️  Subscription cancelled for user ${userId} — downgraded to free plan`);
}


// ═══════════════════════════════════════════════════════════════
// HANDLER 5: invoice.payment_failed
//
// Fires when a subscription payment fails. Marks the user's
// subscription as past_due for UI warnings.
// ═══════════════════════════════════════════════════════════════
async function handleInvoicePaymentFailed(event) {
  const invoice = event.data.object;

  console.log(`[Webhook] ❌ Payment failed:`, {
    invoiceId: invoice.id,
    customerId: invoice.customer,
    subscriptionId: invoice.subscription,
    attemptCount: invoice.attempt_count,
  });

  if (!invoice.customer) {
    console.warn('[Webhook] ⚠️  No customer on failed invoice, skipping.');
    return;
  }

  // Look up user by stripe_customer_id
  const { data: profile, error: lookupError } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', invoice.customer)
    .single();

  if (lookupError || !profile) {
    console.error('[Webhook] ❌ Could not find user for failed payment, customer:', invoice.customer);
    return;
  }

  const userId = profile.id;

  // Mark subscription as past_due
  const { error: updateError } = await supabaseAdmin
    .from('profiles')
    .update({ subscription_status: 'past_due' })
    .eq('id', userId);

  if (updateError) {
    console.error('[Webhook] ❌ Failed to mark subscription as past_due:', updateError.message);
    return;
  }

  console.log(`[Webhook] ❌ Payment failed for user ${userId} — subscription marked as past_due`);
}


export default router;
