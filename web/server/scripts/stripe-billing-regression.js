import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  markStripeWebhookEvent,
  reserveStripeWebhookEvent
} from '../routes/webhooks.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..', '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function makeStripeEvent(id = 'evt_test', type = 'checkout.session.completed') {
  return {
    id,
    type,
    livemode: false,
    api_version: '2024-12-18.acacia',
    created: 1700000000,
    data: {
      object: {
        id: 'cs_test',
        object: 'checkout.session',
        customer: 'cus_test',
        payment_intent: 'pi_test',
        metadata: { user_id: 'user_test' }
      }
    }
  };
}

function createLedgerMock({ insertError = null, existingStatus = 'processed', existingUpdatedAt = new Date().toISOString() } = {}) {
  const calls = [];
  const existingRow = {
    id: 'row-existing',
    status: existingStatus,
    duplicate_count: 0,
    updated_at: existingUpdatedAt,
    received_at: existingUpdatedAt
  };

  const singleResult = (data, error = null) => ({
    single: async () => ({ data, error }),
    maybeSingle: async () => ({ data, error })
  });

  const queryAfterEq = (data, error = null) => ({
    eq() { return queryAfterEq(data, error); },
    select() { return singleResult(data, error); },
    maybeSingle: async () => ({ data, error })
  });

  const updateBuilder = (payload) => ({
    eq() {
      calls.push({ op: 'update:eq', payload });
      return {
        select() {
          return singleResult({ id: existingRow.id, status: payload.status || existingRow.status });
        },
        then(resolve) {
          return Promise.resolve({ data: null, error: null }).then(resolve);
        }
      };
    }
  });

  return {
    calls,
    from(table) {
      assert(table === 'stripe_webhook_events', 'ledger helper should use stripe_webhook_events');
      return {
        insert(payload) {
          calls.push({ op: 'insert', payload });
          return {
            select() {
              return singleResult({ id: 'row-new', status: 'processing' }, insertError);
            }
          };
        },
        select() {
          return {
            eq() {
              return queryAfterEq(existingRow);
            }
          };
        },
        update(payload) {
          calls.push({ op: 'update', payload });
          return updateBuilder(payload);
        }
      };
    }
  };
}

async function testLedgerReservation() {
  const client = createLedgerMock();
  const result = await reserveStripeWebhookEvent(makeStripeEvent(), client);
  assert(result.ok === true, 'new event reservation should succeed');
  assert(result.shouldProcess === true, 'new event should process');
  assert(client.calls[0].op === 'insert', 'new event should insert ledger row');
  assert(client.calls[0].payload.status === 'processing', 'new event starts as processing');
}

async function testDuplicateSkip() {
  const duplicateError = { code: '23505', message: 'duplicate key value violates unique constraint' };
  const client = createLedgerMock({ insertError: duplicateError, existingStatus: 'processed' });
  const result = await reserveStripeWebhookEvent(makeStripeEvent('evt_dup'), client);
  assert(result.ok === true, 'duplicate lookup should succeed');
  assert(result.shouldProcess === false, 'processed duplicate should not process');
  assert(result.duplicate === true, 'processed duplicate should be marked duplicate');
}

async function testFailedRetry() {
  const duplicateError = { code: '23505', message: 'duplicate key value violates unique constraint' };
  const client = createLedgerMock({ insertError: duplicateError, existingStatus: 'failed' });
  const result = await reserveStripeWebhookEvent(makeStripeEvent('evt_retry'), client);
  assert(result.ok === true, 'failed event retry lookup should succeed');
  assert(result.shouldProcess === true, 'failed event should be retryable');
  assert(result.retrying === true, 'failed event should report retrying');
}

async function testStaleProcessingRetry() {
  const duplicateError = { code: '23505', message: 'duplicate key value violates unique constraint' };
  const staleUpdatedAt = new Date(Date.now() - 20 * 60 * 1000).toISOString();
  const client = createLedgerMock({
    insertError: duplicateError,
    existingStatus: 'processing',
    existingUpdatedAt: staleUpdatedAt
  });
  const result = await reserveStripeWebhookEvent(makeStripeEvent('evt_stale'), client);
  assert(result.ok === true, 'stale processing event lookup should succeed');
  assert(result.shouldProcess === true, 'stale processing event should be retryable');
  assert(result.retrying === true, 'stale processing event should report retrying');
}

async function testMarkProcessed() {
  const client = createLedgerMock();
  const result = await markStripeWebhookEvent('evt_mark', {
    status: 'processed',
    handled: true
  }, client);
  assert(result?.status === 'processed', 'mark helper should store processed state');
}

function testStaticWiring() {
  const index = read('server/index.js');
  assert(
    index.indexOf("app.use('/api/webhooks/stripe', express.raw") < index.indexOf('app.use(express.json'),
    'Stripe raw body middleware must stay before express.json'
  );

  const migration = read('server/migrations/018_stripe_event_ledger_refunds.sql');
  assert(migration.includes('CREATE TABLE IF NOT EXISTS public.stripe_webhook_events'), 'migration should create webhook ledger');
  assert(migration.includes('stripe_event_id TEXT NOT NULL UNIQUE'), 'webhook ledger should have unique event id');
  assert(migration.includes('CREATE TABLE IF NOT EXISTS public.refund_requests'), 'migration should create refund_requests');
  assert(migration.includes('idx_credit_transactions_external_event_unique'), 'credit transaction external event id should be unique');

  const webhooks = read('server/routes/webhooks.js');
  assert(webhooks.includes('reserveStripeWebhookEvent(event)'), 'webhook should reserve event before handling');
  assert(webhooks.includes('isStaleProcessingEvent'), 'processing events should have stale retry handling');
  assert(webhooks.includes("case 'charge.refunded'"), 'webhook should handle charge.refunded');
  assert(webhooks.includes("case 'charge.dispute.created'"), 'webhook should handle disputes');
  assert(webhooks.includes('findExistingDisputeReversal'), 'dispute reversals should be keyed by dispute id');
  assert(webhooks.includes('stripe_webhook_duplicate'), 'webhook should audit duplicate events');

  const billing = read('server/routes/billing.js');
  assert(billing.includes("router.post('/refund-request'"), 'billing should expose refund request endpoint');
  assert(billing.includes("router.get('/finance-export'"), 'billing should expose admin finance export endpoint');
  assert(billing.includes('requireBuilderAdmin'), 'finance export should require admin access');
  assert(billing.includes('stripe_webhook_events'), 'finance export should include webhook evidence');
}

async function main() {
  await testLedgerReservation();
  await testDuplicateSkip();
  await testFailedRetry();
  await testStaleProcessingRetry();
  await testMarkProcessed();
  testStaticWiring();
  console.log('Stripe billing regression checks passed.');
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
