# Timeline & Milestones Feature

## Overview

The Timeline feature provides a visual history of important events for each garage item (saved configuration). It tracks the journey from creation through purchase to delivery, allowing users to see the complete lifecycle of their configurations.

## Purpose

Timeline serves multiple purposes:
- **Journey Tracking**: Visualize the complete lifecycle of a configuration from creation to delivery
- **User Notes**: Allow users to add custom milestones and notes
- **Delivery Tracking**: Show estimated and actual delivery dates for purchased vehicles
- **History**: See when and why configurations were updated or changed
- **Integration Ready**: Prepared for future Stripe webhook integration for automatic milestone creation

## Milestone Types

### Standard Types

1. **Created** (`'created'`)
   - Automatically created when a garage item is first saved
   - Represents the initial creation of the configuration

2. **Updated** (`'updated'`)
   - Automatically created when a garage item's state changes
   - Maps from legacy `'state_change'` type
   - Shows configuration evolution

3. **Purchased** (`'purchased'`)
   - Created when a configuration is purchased
   - Maps from legacy `'payment'` type
   - Will be automatically created via Stripe webhooks in the future

4. **Delivered** (`'delivered'`)
   - Represents vehicle delivery
   - Can be placeholder (future date) or actual delivery date
   - Prepared for Edge Function integration for automatic placeholder updates

5. **Custom** (`'custom'`)
   - User-added milestones
   - Allows users to add their own notes and events
   - Can be any date (past, present, or future)

## Component Structure

### Timeline Components

Located in `web/src/features/garage/components/Timeline/`:

- **Timeline.jsx** - Main timeline component
  - Displays list of milestones in chronological order
  - Handles loading, error, and empty states
  - Manages expanded/collapsed state for each milestone

- **TimelineItem.jsx** - Individual milestone display
  - Shows milestone icon, type, date, and note
  - Expandable details section for metadata
  - Future date indicators for placeholder milestones

- **MilestoneIcon.jsx** - Icon component
  - Displays appropriate icon for each milestone type
  - Color-coded by type
  - Supports future/placeholder styling

- **TimelineModal.jsx** - Modal wrapper
  - Portal rendering for proper z-index layering
  - Header with "Add Custom Milestone" button
  - Integrates with garage store for milestone loading

- **AddMilestoneDialog.jsx** - Custom milestone creation
  - Form with type selector, date/time picker, and note field
  - Validation and error handling
  - Optimistic updates

### Utility Files

Located in `web/src/features/garage/utils/`:

- **milestoneTypes.js**
  - Type constants (`MILESTONE_TYPES`)
  - Legacy type mapping (`mapLegacyMilestoneType()`)
  - Type validation (`isValidMilestoneType()`)
  - Label key generation (`getMilestoneLabelKey()`)

- **dateFormatting.js**
  - `formatMilestoneDate()` - Format dates for milestone display
  - `formatRelativeDate()` - Relative dates ("2 days ago", "in 3 months")
  - `isFutureDate()` - Check if date is in the future
  - Locale-aware formatting (Swedish/English)

- **placeholderMilestones.js**
  - Placeholder milestone logic
  - Delivery date estimation
  - Prepared for Edge Function integration
  - `needsDeliveryPlaceholder()` - Check if item needs placeholder
  - `createDeliveryPlaceholderData()` - Create placeholder milestone data

## API Functions

### `fetchMilestones(itemId, options)`

Fetches milestones for a garage item with optional filtering and ordering.

**Parameters:**
- `itemId` (string) - Garage item ID
- `options` (object, optional):
  - `order` (string) - `'asc'` (oldest first) or `'desc'` (newest first), default: `'desc'`
  - `type` (string|null) - Filter by milestone type, default: `null` (all types)

**Returns:**
- `{ data: Array<Milestone>, error: Error|null }`

**Example:**
```javascript
// Get all milestones, oldest first (for timeline)
const { data, error } = await fetchMilestones(itemId, { order: 'asc' });

// Get only purchased milestones
const { data, error } = await fetchMilestones(itemId, { type: 'purchased' });
```

### `createMilestone(itemId, milestoneData)`

Creates a new milestone for a garage item.

**Parameters:**
- `itemId` (string) - Garage item ID
- `milestoneData` (object):
  - `milestone_type` (string) - Type of milestone
  - `note` (string|null) - Optional note
  - `occurred_at` (string) - ISO date string (defaults to now)
  - `from_state` (string|null) - Previous state (for state changes)
  - `to_state` (string|null) - New state (for state changes)
  - `metadata` (object|null) - Additional metadata (JSONB)

**Returns:**
- `{ data: Milestone, error: Error|null }`

**Example:**
```javascript
const { data, error } = await createMilestone(itemId, {
  milestone_type: 'custom',
  note: 'Confirmed with dealer',
  occurred_at: new Date().toISOString(),
  metadata: { source: 'manual', custom: true }
});
```

## Store Methods

### `loadMilestones(itemId, options)`

Loads milestones with caching and optional filtering.

**Parameters:**
- `itemId` (string) - Garage item ID
- `options` (object, optional):
  - `forceRefresh` (boolean) - Force refresh even if cached
  - `order` (string) - `'asc'` or `'desc'`
  - `type` (string|null) - Filter by type

**Returns:**
- `Promise<{ data: Array<Milestone>, error: Error|null }>`

### `getMilestonesByType(itemId, type)`

Gets milestones filtered by type from cache.

**Parameters:**
- `itemId` (string) - Garage item ID
- `type` (string) - Milestone type to filter by

**Returns:**
- `Array<Milestone>` - Filtered milestones array

### `createMilestone(itemId, milestoneData)`

Creates a milestone and invalidates cache.

**Parameters:**
- `itemId` (string) - Garage item ID
- `milestoneData` (object) - Milestone data

**Returns:**
- `Promise<{ data: Milestone, error: Error|null }>`

## Database Schema

### Table: `garage_milestones`

```sql
CREATE TABLE garage_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  garage_item_id uuid NOT NULL REFERENCES garage_items(id) ON DELETE CASCADE,
  milestone_type text NOT NULL,
  note text,
  from_state text,
  to_state text,
  metadata jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
```

### Columns

- **id** - Primary key (UUID)
- **garage_item_id** - Foreign key to garage_items
- **milestone_type** - Type of milestone (`'created'`, `'updated'`, `'purchased'`, `'delivered'`, `'custom'`)
- **note** - Optional user note or description
- **from_state** - Previous state (for state transitions)
- **to_state** - New state (for state transitions)
- **metadata** - Additional data (JSONB) - can store Stripe order info, etc.
- **occurred_at** - When milestone occurred (can be future date for placeholders)

### Index

```sql
CREATE INDEX garage_milestones_item_idx 
  ON garage_milestones (garage_item_id, occurred_at DESC);
```

### RLS Policy

```sql
CREATE POLICY "garage_milestones_owner" ON garage_milestones
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM garage_items gi
      WHERE gi.id = garage_milestones.garage_item_id
      AND gi.owner_id = auth.uid()
    )
  );
```

## Automatic Milestone Creation

### On Item Creation

When a garage item is created via `SaveToGarageButton`, a `'created'` milestone is automatically created:

```javascript
await createMilestone(itemId, {
  milestone_type: 'created',
  from_state: null,
  to_state: initialState,
  note: 'Initial creation',
  metadata: { source: 'manual' }
});
```

### On State Change

When a garage item's state changes via `stateChangeService`, an `'updated'` milestone is automatically created:

```javascript
// Maps legacy types to standardized types
const milestoneType = source === 'stripe' ? 'purchased' : 'updated';

await createMilestone(itemId, {
  milestone_type: milestoneType,
  from_state: fromState,
  to_state: newState,
  note: reason || null,
  metadata: { source, reason, ...metadata }
});
```

## User Interface

### Accessing Timeline

1. Open garage item card
2. Click "More..." menu
3. Select "Timeline"

### Timeline View

- **Vertical Timeline**: Chronological list of milestones (oldest → newest)
- **Milestone Icons**: Color-coded icons for each type
- **Expandable Details**: Click milestone to see metadata and state transitions
- **Future Indicators**: Placeholder milestones show "Future" badge
- **Empty State**: Shows "No milestones yet" when empty

### Adding Custom Milestones

1. Click "Add Custom Milestone" button in timeline modal
2. Select milestone type
3. Choose date and time
4. Add note (required)
5. Click "Add Milestone"

## Internationalization

All UI strings are internationalized via `react-i18next`:

**Translation Keys:**
- `garage.timeline.title` - "Timeline" / "Tidslinje"
- `garage.timeline.empty` - "No milestones yet" / "Inga milstolpar ännu"
- `garage.timeline.addCustom` - "Add Custom Milestone" / "Lägg till anpassad milstolpe"
- `garage.timeline.milestone.*` - Milestone type labels
- `garage.timeline.addDialog.*` - Add dialog form labels
- `garage.timeline.details.*` - Detail section labels

See `web/src/i18n/en/account.json` and `web/src/i18n/sv/account.json` for complete translations.

## Future Enhancements

### Edge Function Integration

Prepared for monthly Edge Function that will:
- Add placeholder delivery milestones for purchased items
- Update delivery estimates based on production queue
- Send notifications for approaching delivery dates

### Stripe Webhook Integration

When Stripe integration is ready, webhooks will automatically create `'purchased'` milestones:

```javascript
// Future webhook handler
await createMilestone(garageItemId, {
  milestone_type: 'purchased',
  metadata: {
    order_id: event.data.object.id,
    payment_intent_id: event.data.object.payment_intent,
    amount: event.data.object.amount_total,
    source: 'stripe'
  }
});
```

### Milestone Editing/Deletion

Future feature to allow users to:
- Edit custom milestones
- Delete milestones (with restrictions)
- Bulk operations

## Files Created/Modified

### New Files

- `web/src/features/garage/components/Timeline/Timeline.jsx`
- `web/src/features/garage/components/Timeline/Timeline.module.css`
- `web/src/features/garage/components/Timeline/TimelineItem.jsx`
- `web/src/features/garage/components/Timeline/MilestoneIcon.jsx`
- `web/src/features/garage/components/Timeline/MilestoneIcon.module.css`
- `web/src/features/garage/components/Timeline/TimelineModal.jsx`
- `web/src/features/garage/components/Timeline/TimelineModal.module.css`
- `web/src/features/garage/components/Timeline/AddMilestoneDialog.jsx`
- `web/src/features/garage/components/Timeline/AddMilestoneDialog.module.css`
- `web/src/features/garage/utils/milestoneTypes.js`
- `web/src/features/garage/utils/dateFormatting.js`
- `web/src/features/garage/utils/placeholderMilestones.js`

### Modified Files

- `web/src/features/account/api.js` - Enhanced `fetchMilestones()` with options
- `web/src/stores/garageStore.js` - Added `milestones` to initial state, enhanced methods
- `web/src/features/garage/services/stateChangeService.js` - Updated milestone type mapping
- `web/src/features/garage/components/CarCard.jsx` - Added Timeline integration
- `web/src/features/garage/components/CarCardMoreMenu.jsx` - Added Timeline menu option
- `web/src/i18n/en/account.json` - Added timeline translations
- `web/src/i18n/sv/account.json` - Added timeline translations

## Testing

### Manual Testing Checklist

- [x] Timeline opens from CarCard menu
- [x] Milestones display in chronological order
- [x] Icons show correctly for each type
- [x] Expandable details work
- [x] Custom milestone creation works
- [x] Date formatting displays correctly
- [x] Future dates show "Future" badge
- [x] Empty state displays when no milestones
- [x] Loading state displays during fetch
- [x] Error state displays on failure
- [x] i18n works in both languages
- [x] Modal overlay displays correctly
- [x] Z-index layering works (AddMilestoneDialog above TimelineModal)

## Related Documentation

- [Database Schema](../garage/feature-documentation.md#milestones-garage_milestones)
- [State Transitions](../garage/state-transitions.md)
- [API Functions](../../web/src/features/account/api.js)

