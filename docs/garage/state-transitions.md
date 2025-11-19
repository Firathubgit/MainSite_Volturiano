# State Transitions & Milestones

## Overview

The garage system includes a comprehensive state transition system that tracks how garage items move between different states (saved, purchased, prototype, wishlist, archived). All state changes are validated, logged, and can be triggered manually via UI or automatically via Stripe webhooks.

## Valid States

- **saved**: A saved configuration ready for purchase
- **purchased**: A completed purchase (can transition back to saved or archived)
- **prototype**: A prototype build (can transition to saved, wishlist, or archived)
- **wishlist**: A wishlist item (can transition to saved, prototype, or archived)
- **archived**: Terminal state - no transitions allowed (permanent archive)

## Valid Transitions

### From `saved`:
- → `purchased`
- → `prototype`
- → `wishlist`
- → `archived`

### From `purchased`:
- → `saved` (can revert purchase)
- → `archived`

**Note**: Cannot go back to `prototype` or `wishlist` once purchased.

### From `prototype`:
- → `saved`
- → `wishlist`
- → `archived`

### From `wishlist`:
- → `saved`
- → `prototype`
- → `archived`

### From `archived`:
- No transitions allowed (terminal state)

## State Change Service

All state changes go through the centralized `stateChangeService` (`web/src/features/garage/services/stateChangeService.js`). This ensures:

1. **Validation**: Transitions are validated before execution
2. **Milestone Creation**: Automatic milestone creation for state changes
3. **Activity Logging**: All state changes are logged to `garage_activity`
4. **Consistency**: Same logic for manual UI, Stripe webhooks, admin tools, etc.

### Usage

```javascript
import { changeItemState } from '../features/garage/services/stateChangeService';

// Manual state change
await changeItemState(itemId, 'purchased', {
  source: 'manual',
  reason: 'User marked as purchased',
  metadata: {}
});

// Stripe webhook (future)
await changeItemState(itemId, 'purchased', {
  source: 'stripe',
  reason: 'Payment completed',
  metadata: {
    order_id: 'order_123',
    payment_intent_id: 'pi_123',
    amount: 50000
  }
});
```

## Milestones

Milestones are automatically created when state changes occur. They track:

- **milestone_type**: `'created'`, `'state_change'`, `'payment'`
- **from_state**: Previous state (null for initial creation)
- **to_state**: New state
- **note**: Optional note
- **metadata**: Additional data (Stripe order info, etc.)

### Milestone Types

- **created**: Initial creation of garage item
- **state_change**: Manual state transition
- **payment**: State change triggered by Stripe payment

## Activity Logging

All state changes are logged to `garage_activity` table with:

- **action**: `'state_changed'`
- **metadata**: `{ from_state, to_state, source, reason }`
- **actor_id**: User who triggered the change

## Database Schema

### `garage_milestones` Table

```sql
CREATE TABLE garage_milestones (
  id uuid PRIMARY KEY,
  garage_item_id uuid REFERENCES garage_items(id),
  milestone_type text NOT NULL,
  from_state text,
  to_state text,
  note text,
  metadata jsonb,
  occurred_at timestamptz DEFAULT now()
);
```

### `garage_activity` Table

```sql
CREATE TABLE garage_activity (
  id uuid PRIMARY KEY,
  garage_item_id uuid REFERENCES garage_items(id),
  actor_id uuid REFERENCES profiles(id),
  action text NOT NULL,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);
```

### `garage_items` Table

```sql
-- Added column for Stripe integration
ALTER TABLE garage_items
  ADD COLUMN order_id uuid REFERENCES orders(id);
```

## UI Components

### StateChangeButton

Dropdown button component that allows users to change item state. Located in `CarCard` component.

- Shows current state
- Lists valid target states
- Requires confirmation for important transitions (→ purchased, → archived)
- Disabled for terminal states (archived)

### StateChangeDialog

Confirmation modal for state changes that require user confirmation.

- Shows transition details
- Warns for terminal states (archived)
- Warns for purchased state (can't undo easily)

## Future Stripe Integration

When Stripe is ready, webhook handlers will call the same `changeItemState` service:

```typescript
// supabase/functions/stripe-webhook/index.ts
import { changeItemState } from '../../web/src/features/garage/services/stateChangeService';

// On payment success
await changeItemState(garageItemId, 'purchased', {
  source: 'stripe',
  metadata: {
    order_id: event.data.object.id,
    payment_intent_id: event.data.object.payment_intent,
    amount: event.data.object.amount_total
  }
});
```

No changes to core logic needed - just webhook → service call.

## API Functions

### `updateGarageState(itemId, newState)`
Low-level API function that updates state in database. Includes transition validation.

### `createMilestone(itemId, milestoneData)`
Creates a milestone record for a garage item.

### `fetchMilestones(itemId)`
Fetches all milestones for a garage item, ordered by `occurred_at desc`.

### `createActivityLog(itemId, action, metadata)`
Creates an activity log entry.

### `fetchActivityLog(itemId, limit)`
Fetches activity log entries for a garage item.

## Store Methods

### `updateItemState(itemId, newState, options)`
Zustand store method that uses `stateChangeService` to change state with optimistic updates.

### `loadMilestones(itemId, forceRefresh)`
Loads milestones with caching (returns cached data immediately, refreshes in background).

### `createMilestone(itemId, milestoneData)`
Creates a milestone via API and invalidates cache.

### `loadActivityLog(itemId, limit)`
Loads activity log entries.

### `createActivityLog(itemId, action, metadata)`
Creates an activity log entry.

## Validation Utilities

Located in `web/src/features/garage/utils/stateTransitions.js`:

- `canTransition(fromState, toState)`: Returns boolean
- `validateTransition(fromState, toState)`: Throws error if invalid
- `getValidTargetStates(fromState)`: Returns array of valid targets
- `isTerminalState(state)`: Returns boolean
- `isValidState(state)`: Returns boolean

## Error Handling

- Invalid transitions throw errors with clear messages
- Optimistic updates rollback on failure
- Milestone/activity logging failures don't fail the state change (non-critical)

## Internationalization

All UI strings are internationalized via `react-i18next`:

- `garage.stateChange.title`
- `garage.stateChange.message`
- `garage.stateChange.states.*`
- `garage.stateChange.confirmArchived`
- `garage.stateChange.confirmPurchased`

See `web/src/i18n/en/account.json` and `web/src/i18n/sv/account.json` for translations.

