import { describe, it } from 'vitest';
import { expectContains, expectMatches, readWeb } from './sourceAssertions';

describe('launch safety: Stripe webhook signature and idempotency', () => {
  it('keeps raw-body signature verification before JSON parsing', () => {
    const index = readWeb('server/index.js');
    expectMatches(
      index,
      /app\.use\('\/api\/webhooks\/stripe', express\.raw\(\{ type: 'application\/json' \}\)\);[\s\S]*?app\.use\(express\.json/,
      'raw Stripe body must be registered before express.json'
    );
  });

  it('persists Stripe event ids and handles duplicates before fulfillment', () => {
    const webhooks = readWeb('server/routes/webhooks.js');
    expectContains(webhooks, 'stripe.webhooks.constructEvent', 'Stripe signature verification');
    expectContains(webhooks, 'stripe_webhook_events', 'webhook event ledger');
    expectContains(webhooks, 'stripe_event_id', 'unique Stripe event id');
    expectContains(webhooks, 'duplicate_count', 'duplicate tracking');
    expectContains(webhooks, 'reserveStripeEvent', 'event reservation before handling');
    expectContains(webhooks, 'markStripeEventProcessed', 'processed event marker');
    expectContains(webhooks, 'handleChargeRefunded', 'refund reversal handler');
    expectContains(webhooks, 'handleDisputeEvent', 'dispute handler');
  });
});
