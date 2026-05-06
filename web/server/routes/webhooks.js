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
import { writeAuditLog } from '../lib/audit/audit-logger.js';

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

const HANDLED_WEBHOOK_TYPES = new Set([
  'checkout.session.completed',
  'invoice.payment_succeeded',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_failed',
  'charge.refunded',
  'charge.dispute.created',
  'charge.dispute.updated',
  'charge.dispute.closed'
]);

const WEBHOOK_PROCESSING_STALE_MS = 15 * 60 * 1000;


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
    void writeAuditLog({
      actorUserId: null,
      action: 'stripe_webhook_signature_failed',
      entityType: 'stripe_event',
      metadata: { error: err.message }
    });
    return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
  }

  console.log(`[Webhook] ✅ Verified event: ${event.type} (id: ${event.id})`);

  const reservation = await reserveStripeWebhookEvent(event);
  if (!reservation.ok) {
    console.error('[Webhook] ❌ Could not reserve webhook event in ledger:', reservation.error);
    return res.status(500).json({ error: 'Webhook ledger unavailable.' });
  }

  if (!reservation.shouldProcess) {
    void writeAuditLog({
      actorUserId: null,
      action: 'stripe_webhook_duplicate',
      entityType: 'stripe_event',
      entityId: event.id,
      metadata: {
        eventType: event.type,
        existingStatus: reservation.status
      }
    });
    return res.json({ received: true, duplicate: true });
  }

  let handled = HANDLED_WEBHOOK_TYPES.has(event.type);
  let handlerErrorMessage = null;

  if (!handled) {
    console.log(`[Webhook] ℹ️  Unhandled event type: ${event.type}`);
    await markStripeWebhookEvent(event.id, {
      status: 'skipped',
      handled: false
    });
    void writeAuditLog({
      actorUserId: null,
      action: 'stripe_webhook_skipped',
      entityType: 'stripe_event',
      entityId: event.id,
      metadata: { eventType: event.type, livemode: event.livemode }
    });
    return res.json({ received: true, skipped: true });
  }

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

      case 'charge.refunded':
        await handleChargeRefunded(event);
        break;

      case 'charge.dispute.created':
      case 'charge.dispute.updated':
      case 'charge.dispute.closed':
        await handleDisputeEvent(event);
        break;

      default:
        handled = false;
        console.log(`[Webhook] ℹ️  Unhandled event type: ${event.type}`);
    }
  } catch (handlerError) {
    handlerErrorMessage = handlerError.message;
    console.error(`[Webhook] ❌ Handler error for ${event.type}:`, handlerError.message);
    // Still return 200 so Stripe doesn't retry endlessly
  }

  await markStripeWebhookEvent(event.id, {
    status: handlerErrorMessage ? 'failed' : 'processed',
    handled,
    errorMessage: handlerErrorMessage
  });

  // ── 4. Always acknowledge receipt ──
  void writeAuditLog({
    actorUserId: null,
    action: handlerErrorMessage ? 'stripe_webhook_handler_failed' : 'stripe_webhook_processed',
    entityType: 'stripe_event',
    entityId: event.id,
    metadata: {
      eventType: event.type,
      livemode: event.livemode,
      handled,
      handlerError: handlerErrorMessage
    }
  });

  res.json({ received: true });
});


// ═══════════════════════════════════════════════════════════════
// HANDLER 1: checkout.session.completed
//
// Fires when a customer completes Stripe Checkout.
// Routes to subscription activation OR credit pack fulfillment
// based on session.mode.
// ═══════════════════════════════════════════════════════════════
export async function reserveStripeWebhookEvent(event, client = supabaseAdmin) {
  if (!client || !event?.id) {
    return { ok: false, shouldProcess: false, error: 'Missing database client or event id' };
  }

  const payload = {
    stripe_event_id: event.id,
    event_type: event.type,
    livemode: Boolean(event.livemode),
    api_version: event.api_version || null,
    payload: compactStripeEventPayload(event),
    status: 'processing',
    handled: false,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await client
    .from('stripe_webhook_events')
    .insert(payload)
    .select('id,status')
    .single();

  if (!error) {
    return { ok: true, shouldProcess: true, status: data?.status || 'processing', id: data?.id };
  }

  if (!isDuplicateStripeEventError(error)) {
    return { ok: false, shouldProcess: false, error: error.message || String(error) };
  }

  const { data: existing, error: lookupError } = await client
    .from('stripe_webhook_events')
    .select('id,status,duplicate_count,updated_at,received_at')
    .eq('stripe_event_id', event.id)
    .maybeSingle();

  if (lookupError) {
    return { ok: false, shouldProcess: false, error: lookupError.message || String(lookupError) };
  }

  if (!existing) {
    return { ok: false, shouldProcess: false, error: 'Duplicate event exists but could not be loaded' };
  }

  if (existing.status === 'processed' || existing.status === 'skipped') {
    await client
      .from('stripe_webhook_events')
      .update({
        duplicate_count: Number(existing.duplicate_count || 0) + 1,
        last_duplicate_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id);

    return { ok: true, shouldProcess: false, duplicate: true, status: existing.status, id: existing.id };
  }

  if (existing.status === 'processing' && !isStaleProcessingEvent(existing)) {
    await client
      .from('stripe_webhook_events')
      .update({
        duplicate_count: Number(existing.duplicate_count || 0) + 1,
        last_duplicate_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id);

    return { ok: true, shouldProcess: false, duplicate: true, status: existing.status, id: existing.id };
  }

  const { error: updateError } = await client
    .from('stripe_webhook_events')
    .update({
      status: 'processing',
      error_message: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', existing.id);

  if (updateError) {
    return { ok: false, shouldProcess: false, error: updateError.message || String(updateError) };
  }

  return { ok: true, shouldProcess: true, status: 'processing', id: existing.id, retrying: true };
}

function isStaleProcessingEvent(row) {
  const timestamp = row?.updated_at || row?.received_at;
  if (!timestamp) return false;
  const updatedAt = new Date(timestamp).getTime();
  return Number.isFinite(updatedAt) && Date.now() - updatedAt > WEBHOOK_PROCESSING_STALE_MS;
}

export async function markStripeWebhookEvent(stripeEventId, { status, handled = false, errorMessage = null } = {}, client = supabaseAdmin) {
  if (!client || !stripeEventId || !status) return null;

  try {
    const now = new Date().toISOString();
    const { data, error } = await client
      .from('stripe_webhook_events')
      .update({
        status,
        handled,
        error_message: errorMessage ? String(errorMessage).slice(0, 1000) : null,
        processed_at: ['processed', 'failed', 'skipped'].includes(status) ? now : null,
        updated_at: now
      })
      .eq('stripe_event_id', stripeEventId)
      .select('id,status')
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.warn('[Webhook] Could not mark Stripe webhook event:', error?.message || error);
    return null;
  }
}

export function isDuplicateStripeEventError(error) {
  return error?.code === '23505' || /duplicate|unique/i.test(error?.message || '');
}

function compactStripeEventPayload(event) {
  const object = event?.data?.object || {};
  return {
    id: event.id,
    type: event.type,
    created: event.created || null,
    livemode: Boolean(event.livemode),
    apiVersion: event.api_version || null,
    object: {
      id: object.id || null,
      object: object.object || null,
      customer: object.customer || null,
      subscription: object.subscription || null,
      invoice: object.invoice || null,
      paymentIntent: object.payment_intent || null,
      charge: object.charge || null,
      status: object.status || null,
      amount: object.amount || null,
      amountRefunded: object.amount_refunded || null,
      currency: object.currency || null,
      metadata: object.metadata || {}
    }
  };
}

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
    throw new Error(`Missing user_id in checkout session ${session.id}`);
  }

  const credits = parseInt(credit_amount, 10);
  if (!credits || credits <= 0 || isNaN(credits)) {
    console.error(`[Webhook] ❌ CRITICAL: Invalid credit_amount "${credit_amount}" in session:`, session.id);
    throw new Error(`Invalid credit_amount in checkout session ${session.id}`);
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
    await fulfillSubscription(session, user_id, plan_id, credits, event.id);
  } else if (session.mode === 'payment') {
    await fulfillCreditPack(session, user_id, pack_id, pack_name, credits, event.id);
  } else {
    console.warn(`[Webhook] ⚠️  Unknown session mode: ${session.mode}`);
    throw new Error(`Unknown checkout session mode: ${session.mode}`);
  }
}


// ── Subscription Fulfillment ──
async function fulfillSubscription(session, userId, planId, credits, eventId = null) {
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
      throw profileError;
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
      throw error;
    }

    if (data?.success) {
      console.log(`[Webhook] ✅ Subscription activated: ${planId} for user ${userId} (+${credits} credits)`);
      await annotateCreditTransaction({
        stripePaymentId: session.id,
        checkoutSessionId: session.id,
        customerId: session.customer,
        subscriptionId: session.subscription,
        eventId,
        metadata: { planId, credits, creditType: 'subscription' }
      });
    } else {
      console.error('[Webhook] ❌ add_credits_safe returned failure:', data?.error);
      console.error('[Webhook] ❌ MANUAL FIX REQUIRED: Session:', session.id, 'User:', userId);
      throw new Error(data?.error || 'Subscription credit fulfillment failed');
    }

  } catch (err) {
    console.error('[Webhook] ❌ Subscription fulfillment error:', err.message);
    console.error('[Webhook] ❌ MANUAL FIX REQUIRED: Session:', session.id, 'User:', userId, 'Credits:', credits);
    throw err;
  }
}


// ── Credit Pack Fulfillment ──
async function fulfillCreditPack(session, userId, packId, packName, credits, eventId = null) {
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
      throw error;
    }

    if (data?.success) {
      console.log(`[Webhook] ✅ Credit pack purchased: ${packId} for user ${userId} (+${credits} credits)`);
      console.log(`[Webhook]    New purchased balance: ${data.new_balance}`);
      await annotateCreditTransaction({
        stripePaymentId: session.id,
        checkoutSessionId: session.id,
        paymentIntentId: session.payment_intent || null,
        customerId: session.customer,
        eventId,
        metadata: { packId, packName, credits, creditType: 'purchased' }
      });
    } else {
      console.error('[Webhook] ❌ add_credits_safe returned failure:', data?.error);
      console.error('[Webhook] ❌ MANUAL FIX REQUIRED: Session:', session.id, 'User:', userId);
      throw new Error(data?.error || 'Credit pack fulfillment failed');
    }

  } catch (err) {
    console.error('[Webhook] ❌ Credit pack fulfillment error:', err.message);
    console.error('[Webhook] ❌ MANUAL FIX REQUIRED: Session:', session.id, 'User:', userId, 'Credits:', credits);
    throw err;
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
    throw lookupError || new Error(`No profile for Stripe customer ${invoice.customer}`);
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
    throw error;
  }

  if (data?.success) {
    console.log(`[Webhook] ✅ Subscription renewed for user ${userId}, plan: ${plan} (+${data.credits_allocated} credits)`);
    await annotateLatestSubscriptionTransaction({
      userId,
      invoiceId: invoice.id,
      customerId: invoice.customer,
      subscriptionId: invoice.subscription,
      eventId: event.id,
      metadata: { plan, creditsAllocated: data.credits_allocated }
    });
  } else {
    console.error('[Webhook] ❌ Renewal RPC returned failure:', data?.error);
    throw new Error(data?.error || 'Subscription renewal failed');
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
    throw lookupError || new Error(`No profile for subscription ${subscription.id}`);
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
    throw updateError;
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
    throw lookupError || new Error(`No profile for deleted subscription ${subscription.id}`);
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
    throw updateError;
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
    throw lookupError || new Error(`No profile for failed invoice customer ${invoice.customer}`);
  }

  const userId = profile.id;

  // Mark subscription as past_due
  const { error: updateError } = await supabaseAdmin
    .from('profiles')
    .update({ subscription_status: 'past_due' })
    .eq('id', userId);

  if (updateError) {
    console.error('[Webhook] ❌ Failed to mark subscription as past_due:', updateError.message);
    throw updateError;
  }

  console.log(`[Webhook] ❌ Payment failed for user ${userId} — subscription marked as past_due`);
}


async function handleChargeRefunded(event) {
  const charge = event.data.object;
  const originalTx = await findOriginalCreditTransactionForCharge(charge);
  if (!originalTx) {
    console.warn('[Webhook] Refund received but no matching credit transaction was found:', charge.id);
    return;
  }

  const refund = charge.refunds?.data?.[0] || null;
  const refundedAmount = Number(refund?.amount || charge.amount_refunded || charge.amount || 0);
  const chargeAmount = Number(charge.amount || refundedAmount || 0);
  const originalCredits = Math.abs(Number(originalTx.amount || 0));
  const creditsToReverse = calculateCreditReversalAmount(originalCredits, refundedAmount, chargeAmount);

  await recordCreditReversal({
    originalTx,
    creditsToReverse,
    reason: 'refund',
    description: `Stripe refund reversal (${charge.id})`,
    eventId: event.id,
    chargeId: charge.id,
    refundId: refund?.id || null,
    metadata: {
      amountRefunded: refundedAmount,
      chargeAmount,
      currency: charge.currency || null,
      paymentIntentId: charge.payment_intent || null
    }
  });
}

async function handleDisputeEvent(event) {
  const dispute = event.data.object;
  const charge = await resolveChargeForDispute(dispute);
  if (!charge) {
    console.warn('[Webhook] Dispute received but charge could not be resolved:', dispute.id);
    return;
  }

  const originalTx = await findOriginalCreditTransactionForCharge(charge);
  if (!originalTx) {
    console.warn('[Webhook] Dispute received but no matching credit transaction was found:', dispute.id);
    return;
  }

  if (event.type === 'charge.dispute.closed' && dispute.status === 'won') {
    await recordCreditRestoration({
      originalTx,
      creditsToRestore: Math.abs(Number(originalTx.amount || 0)),
      description: `Stripe dispute won restoration (${dispute.id})`,
      eventId: event.id,
      chargeId: charge.id,
      disputeId: dispute.id,
      metadata: {
        disputeStatus: dispute.status,
        reason: dispute.reason || null
      }
    });
    return;
  }

  await recordCreditReversal({
    originalTx,
    creditsToReverse: Math.abs(Number(originalTx.amount || 0)),
    reason: 'dispute',
    description: `Stripe dispute reversal (${dispute.id})`,
    eventId: event.id,
    chargeId: charge.id,
    disputeId: dispute.id,
    metadata: {
      disputeStatus: dispute.status || null,
      reason: dispute.reason || null
    }
  });
}

async function annotateCreditTransaction({
  stripePaymentId,
  checkoutSessionId = null,
  paymentIntentId = null,
  chargeId = null,
  customerId = null,
  subscriptionId = null,
  invoiceId = null,
  eventId = null,
  metadata = {}
} = {}) {
  if (!supabaseAdmin || !stripePaymentId) return null;

  const { data, error } = await supabaseAdmin
    .from('credit_transactions')
    .update({
      stripe_checkout_session_id: checkoutSessionId || null,
      stripe_payment_intent_id: paymentIntentId || null,
      stripe_charge_id: chargeId || null,
      stripe_customer_id: customerId || null,
      stripe_invoice_id: invoiceId || null,
      external_event_id: eventId || null,
      status: 'applied',
      metadata: {
        ...metadata,
        subscriptionId: subscriptionId || null
      }
    })
    .eq('stripe_payment_id', stripePaymentId)
    .select('id')
    .maybeSingle();

  if (error) {
    console.warn('[Webhook] Could not annotate credit transaction:', error.message);
    return null;
  }

  return data;
}

async function annotateLatestSubscriptionTransaction({ userId, invoiceId, customerId, subscriptionId, eventId, metadata = {} } = {}) {
  if (!supabaseAdmin || !userId) return null;

  const { data: tx, error: lookupError } = await supabaseAdmin
    .from('credit_transactions')
    .select('id')
    .eq('user_id', userId)
    .eq('type', 'subscription')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lookupError || !tx) return null;

  const { error } = await supabaseAdmin
    .from('credit_transactions')
    .update({
      stripe_invoice_id: invoiceId || null,
      stripe_customer_id: customerId || null,
      external_event_id: eventId || null,
      status: 'applied',
      metadata: {
        ...metadata,
        subscriptionId: subscriptionId || null
      }
    })
    .eq('id', tx.id);

  if (error) {
    console.warn('[Webhook] Could not annotate subscription renewal transaction:', error.message);
  }
}

async function findOriginalCreditTransactionForCharge(charge) {
  if (!supabaseAdmin || !charge) return null;

  const chargeId = charge.id || null;
  const paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : null;
  const customerId = typeof charge.customer === 'string' ? charge.customer : null;

  const directLookups = [
    ['stripe_charge_id', chargeId],
    ['stripe_payment_intent_id', paymentIntentId]
  ].filter(([, value]) => Boolean(value));

  for (const [column, value] of directLookups) {
    const tx = await findCreditTransactionBy(column, value);
    if (tx) return tx;
  }

  const checkoutSession = await findCheckoutSessionForPaymentIntent(paymentIntentId);
  if (checkoutSession?.id) {
    const tx = await findCreditTransactionBy('stripe_payment_id', checkoutSession.id);
    if (tx) {
      await annotateCreditTransaction({
        stripePaymentId: checkoutSession.id,
        checkoutSessionId: checkoutSession.id,
        paymentIntentId,
        chargeId,
        customerId
      });
      return { ...tx, stripe_payment_intent_id: paymentIntentId, stripe_charge_id: chargeId };
    }
  }

  return null;
}

async function findCreditTransactionBy(column, value, { includeReversals = false } = {}) {
  let query = supabaseAdmin
    .from('credit_transactions')
    .select('*')
    .eq(column, value)
    .order('created_at', { ascending: false })
    .limit(1);

  if (!includeReversals && column !== 'external_event_id') {
    query = query.in('type', ['purchase', 'subscription', 'signup_bonus']);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.warn(`[Webhook] Credit transaction lookup failed for ${column}:`, error.message);
    return null;
  }

  return data || null;
}

async function findCheckoutSessionForPaymentIntent(paymentIntentId) {
  if (!stripe || !paymentIntentId) return null;

  try {
    const sessions = await stripe.checkout.sessions.list({
      payment_intent: paymentIntentId,
      limit: 1
    });
    return sessions?.data?.[0] || null;
  } catch (error) {
    console.warn('[Webhook] Could not resolve checkout session for payment intent:', error.message);
    return null;
  }
}

async function resolveChargeForDispute(dispute) {
  if (!dispute?.charge) return null;
  if (!stripe) return { id: dispute.charge };

  try {
    return await stripe.charges.retrieve(dispute.charge);
  } catch (error) {
    console.warn('[Webhook] Could not retrieve disputed charge:', error.message);
    return { id: dispute.charge };
  }
}

function calculateCreditReversalAmount(originalCredits, refundedAmount, chargeAmount) {
  if (!originalCredits || originalCredits <= 0) return 0;
  if (!chargeAmount || refundedAmount >= chargeAmount) return originalCredits;
  return Math.max(1, Math.ceil(originalCredits * (refundedAmount / chargeAmount)));
}

async function recordCreditReversal({ originalTx, creditsToReverse, reason, description, eventId, chargeId = null, refundId = null, disputeId = null, metadata = {} }) {
  if (!originalTx?.user_id || !creditsToReverse) return null;

  const existing = await findCreditTransactionBy('external_event_id', eventId);
  if (existing) return existing;

  if (refundId) {
    const existingRefund = await findCreditTransactionBy('stripe_refund_id', refundId, { includeReversals: true });
    if (existingRefund) return existingRefund;
  }

  if (disputeId) {
    const existingDisputeReversal = await findExistingDisputeReversal(disputeId);
    if (existingDisputeReversal) return existingDisputeReversal;
  }

  await applyCreditBalanceAdjustment({
    userId: originalTx.user_id,
    amount: -Math.abs(creditsToReverse),
    sourceType: originalTx.type
  });

  const { data, error } = await supabaseAdmin
    .from('credit_transactions')
    .insert({
      user_id: originalTx.user_id,
      amount: -Math.abs(creditsToReverse),
      type: 'refund',
      description,
      stripe_payment_id: originalTx.stripe_payment_id || originalTx.stripe_checkout_session_id || null,
      stripe_invoice_id: originalTx.stripe_invoice_id || null,
      stripe_checkout_session_id: originalTx.stripe_checkout_session_id || originalTx.stripe_payment_id || null,
      stripe_payment_intent_id: originalTx.stripe_payment_intent_id || null,
      stripe_charge_id: chargeId,
      stripe_refund_id: refundId,
      stripe_dispute_id: disputeId,
      stripe_customer_id: originalTx.stripe_customer_id || null,
      reversal_of_transaction_id: originalTx.id,
      external_event_id: eventId,
      status: reason === 'dispute' ? 'disputed_reversed' : 'refunded',
      metadata
    })
    .select('id')
    .maybeSingle();

  if (error && !isDuplicateStripeEventError(error)) throw error;
  return data || null;
}

async function recordCreditRestoration({ originalTx, creditsToRestore, description, eventId, chargeId = null, disputeId = null, metadata = {} }) {
  if (!originalTx?.user_id || !creditsToRestore) return null;

  const existing = await findCreditTransactionBy('external_event_id', eventId);
  if (existing) return existing;

  if (disputeId) {
    const existingRestoration = await findExistingDisputeRestoration(disputeId);
    if (existingRestoration) return existingRestoration;
  }

  await applyCreditBalanceAdjustment({
    userId: originalTx.user_id,
    amount: Math.abs(creditsToRestore),
    sourceType: originalTx.type
  });

  const { data, error } = await supabaseAdmin
    .from('credit_transactions')
    .insert({
      user_id: originalTx.user_id,
      amount: Math.abs(creditsToRestore),
      type: originalTx.type === 'subscription' ? 'subscription' : 'purchase',
      description,
      stripe_payment_id: originalTx.stripe_payment_id || originalTx.stripe_checkout_session_id || null,
      stripe_invoice_id: originalTx.stripe_invoice_id || null,
      stripe_checkout_session_id: originalTx.stripe_checkout_session_id || originalTx.stripe_payment_id || null,
      stripe_payment_intent_id: originalTx.stripe_payment_intent_id || null,
      stripe_charge_id: chargeId,
      stripe_dispute_id: disputeId,
      stripe_customer_id: originalTx.stripe_customer_id || null,
      reversal_of_transaction_id: originalTx.id,
      external_event_id: eventId,
      status: 'dispute_won_restored',
      metadata
    })
    .select('id')
    .maybeSingle();

  if (error && !isDuplicateStripeEventError(error)) throw error;
  return data || null;
}

async function findExistingDisputeReversal(disputeId) {
  if (!disputeId) return null;

  const { data, error } = await supabaseAdmin
    .from('credit_transactions')
    .select('*')
    .eq('stripe_dispute_id', disputeId)
    .eq('status', 'disputed_reversed')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn('[Webhook] Existing dispute reversal lookup failed:', error.message);
    return null;
  }

  return data || null;
}

async function findExistingDisputeRestoration(disputeId) {
  if (!disputeId) return null;

  const { data, error } = await supabaseAdmin
    .from('credit_transactions')
    .select('*')
    .eq('stripe_dispute_id', disputeId)
    .eq('status', 'dispute_won_restored')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn('[Webhook] Existing dispute restoration lookup failed:', error.message);
    return null;
  }

  return data || null;
}

async function applyCreditBalanceAdjustment({ userId, amount, sourceType }) {
  const { data: profile, error: lookupError } = await supabaseAdmin
    .from('profiles')
    .select('purchased_credits,subscription_credits,total_credits_purchased,total_credits_remaining')
    .eq('id', userId)
    .maybeSingle();

  if (lookupError || !profile) {
    throw lookupError || new Error(`Profile not found for credit adjustment: ${userId}`);
  }

  const updates = { updated_at: new Date().toISOString() };
  if (sourceType === 'subscription') {
    updates.subscription_credits = Math.max(0, Number(profile.subscription_credits || 0) + amount);
  } else {
    updates.purchased_credits = Math.max(0, Number(profile.purchased_credits || 0) + amount);
    updates.total_credits_purchased = Math.max(0, Number(profile.total_credits_purchased || 0) + amount);
  }

  if (profile.total_credits_remaining !== undefined && profile.total_credits_remaining !== null) {
    updates.total_credits_remaining = Math.max(0, Number(profile.total_credits_remaining || 0) + amount);
  }

  const { error } = await supabaseAdmin
    .from('profiles')
    .update(updates)
    .eq('id', userId);

  if (error) throw error;
}

export default router;
