# Garage API Reference

## Milestone Functions

### `fetchMilestones(itemId, options)`

Fetches milestones for a garage item with optional filtering and ordering.

**Location:** `web/src/features/account/api.js`

**Parameters:**
- `itemId` (string, required) - Garage item ID
- `options` (object, optional) - Fetch options:
  - `order` (string) - Order direction: `'asc'` (oldest first) or `'desc'` (newest first), default: `'desc'`
  - `type` (string|null) - Filter by milestone type, default: `null` (all types)

**Returns:**
- `Promise<{ data: Array<Milestone>, error: Error|null }>`

**Example:**
```javascript
import { fetchMilestones } from '../features/account/api';

// Get all milestones, oldest first (for timeline display)
const { data, error } = await fetchMilestones(itemId, { order: 'asc' });

// Get only purchased milestones
const { data, error } = await fetchMilestones(itemId, { 
  type: 'purchased',
  order: 'desc' 
});
```

**Milestone Object Structure:**
```typescript
interface Milestone {
  id: string;                    // UUID
  garage_item_id: string;        // UUID reference to garage_items
  milestone_type: string;        // 'created' | 'updated' | 'purchased' | 'delivered' | 'custom'
  note: string | null;           // Optional note
  from_state: string | null;     // Previous state (for state transitions)
  to_state: string | null;       // New state (for state transitions)
  metadata: object | null;       // Additional data (JSONB)
  occurred_at: string;          // ISO timestamp
}
```

### `createMilestone(itemId, milestoneData)`

Creates a new milestone for a garage item.

**Location:** `web/src/features/account/api.js`

**Parameters:**
- `itemId` (string, required) - Garage item ID
- `milestoneData` (object, required) - Milestone data:
  - `milestone_type` (string, required) - Type of milestone
  - `note` (string|null, optional) - Optional note
  - `occurred_at` (string, optional) - ISO date string (defaults to now)
  - `from_state` (string|null, optional) - Previous state
  - `to_state` (string|null, optional) - New state
  - `metadata` (object|null, optional) - Additional metadata

**Returns:**
- `Promise<{ data: Milestone, error: Error|null }>`

**Example:**
```javascript
import { createMilestone } from '../features/account/api';

// Create custom milestone
const { data, error } = await createMilestone(itemId, {
  milestone_type: 'custom',
  note: 'Confirmed with dealer',
  occurred_at: new Date().toISOString(),
  metadata: { source: 'manual', custom: true }
});

// Create milestone for state change
const { data, error } = await createMilestone(itemId, {
  milestone_type: 'updated',
  from_state: 'saved',
  to_state: 'purchased',
  note: 'Order placed',
  metadata: { source: 'stripe', order_id: 'order_123' }
});
```

### `fetchGarageItemById(itemId)`

Fetches a single garage item by ID with tags.

**Location:** `web/src/features/account/api.js`

**Parameters:**
- `itemId` (string, required) - Garage item ID

**Returns:**
- `Promise<{ data: GarageItem, error: Error|null }>`

**Example:**
```javascript
import { fetchGarageItemById } from '../features/account/api';

const { data, error } = await fetchGarageItemById(itemId);
if (error) {
  console.error('Failed to fetch item:', error);
} else {
  console.log('Item:', data);
}
```

## Store Methods

### `loadMilestones(itemId, options)`

Loads milestones with caching and optional filtering.

**Location:** `web/src/stores/garageStore.js`

**Parameters:**
- `itemId` (string, required) - Garage item ID
- `options` (object, optional) - Load options:
  - `forceRefresh` (boolean) - Force refresh even if cached, default: `false`
  - `order` (string) - Order direction: `'asc'` or `'desc'`, default: `'desc'`
  - `type` (string|null) - Filter by milestone type, default: `null`

**Returns:**
- `Promise<{ data: Array<Milestone>, error: Error|null }>`

**Example:**
```javascript
import { useGarageStore } from '../stores/garageStore';

const loadMilestones = useGarageStore((state) => state.loadMilestones);

// Load milestones for timeline (oldest first)
const { data, error } = await loadMilestones(itemId, {
  order: 'asc',
  forceRefresh: false
});
```

### `getMilestonesByType(itemId, type)`

Gets milestones filtered by type from cache.

**Location:** `web/src/stores/garageStore.js`

**Parameters:**
- `itemId` (string, required) - Garage item ID
- `type` (string, required) - Milestone type to filter by

**Returns:**
- `Array<Milestone>` - Filtered milestones array (synchronous, from cache)

**Example:**
```javascript
import { useGarageStore } from '../stores/garageStore';

const getMilestonesByType = useGarageStore((state) => state.getMilestonesByType);

// Get purchased milestones from cache
const purchasedMilestones = getMilestonesByType(itemId, 'purchased');
```

### `createMilestone(itemId, milestoneData)`

Creates a milestone and invalidates cache.

**Location:** `web/src/stores/garageStore.js`

**Parameters:**
- `itemId` (string, required) - Garage item ID
- `milestoneData` (object, required) - Milestone data

**Returns:**
- `Promise<{ data: Milestone, error: Error|null }>`

**Example:**
```javascript
import { useGarageStore } from '../stores/garageStore';

const createMilestone = useGarageStore((state) => state.createMilestone);

const { data, error } = await createMilestone(itemId, {
  milestone_type: 'custom',
  note: 'Custom note',
  occurred_at: new Date().toISOString()
});
```

## Utility Functions

### Milestone Types

**Location:** `web/src/features/garage/utils/milestoneTypes.js`

```javascript
import { 
  MILESTONE_TYPES, 
  mapLegacyMilestoneType,
  getMilestoneLabelKey,
  isValidMilestoneType,
  getValidMilestoneTypes
} from '../utils/milestoneTypes';

// Constants
MILESTONE_TYPES.CREATED    // 'created'
MILESTONE_TYPES.UPDATED   // 'updated'
MILESTONE_TYPES.PURCHASED // 'purchased'
MILESTONE_TYPES.DELIVERED // 'delivered'
MILESTONE_TYPES.CUSTOM    // 'custom'

// Map legacy type to standardized type
const standardType = mapLegacyMilestoneType('state_change'); // Returns 'updated'

// Get i18n label key
const labelKey = getMilestoneLabelKey('created'); // Returns 'garage.timeline.milestone.created'

// Validate type
const isValid = isValidMilestoneType('created'); // Returns true

// Get all valid types
const types = getValidMilestoneTypes(); // Returns ['created', 'updated', 'purchased', 'delivered', 'custom']
```

### Date Formatting

**Location:** `web/src/features/garage/utils/dateFormatting.js`

```javascript
import {
  formatMilestoneDate,
  formatRelativeDate,
  isFutureDate,
  formatDate // Backward compatibility
} from '../utils/dateFormatting';

// Format milestone date
const formatted = formatMilestoneDate(date, 'full', 'sv-SE');
// 'full' | 'short' | 'relative'

// Format relative date
const relative = formatRelativeDate(date, 'sv-SE');
// "För 2 dagar sedan" | "Om 3 månader"

// Check if future
const isFuture = isFutureDate(date); // Returns boolean
```

### Placeholder Milestones

**Location:** `web/src/features/garage/utils/placeholderMilestones.js`

```javascript
import {
  isPlaceholderMilestone,
  calculateEstimatedDeliveryDate,
  needsDeliveryPlaceholder,
  createDeliveryPlaceholderData,
  addDeliveryPlaceholders
} from '../utils/placeholderMilestones';

// Check if milestone is placeholder
const isPlaceholder = isPlaceholderMilestone(milestone);

// Calculate estimated delivery date
const estimatedDate = calculateEstimatedDeliveryDate(item, purchaseDate);

// Check if item needs placeholder
const needsPlaceholder = needsDeliveryPlaceholder(item, milestones);

// Create placeholder data
const placeholderData = createDeliveryPlaceholderData(item, estimatedDate);
```

## Automatic Milestone Creation

### On Item Creation

When `SaveToGarageButton` creates a new garage item, it automatically creates a `'created'` milestone:

```javascript
// In SaveToGarageButton.jsx
await createMilestone(result.data.id, {
  milestone_type: 'created',
  from_state: null,
  to_state: initialState,
  note: 'Initial creation',
  metadata: { source: 'manual' }
});
```

### On State Change

When `stateChangeService` changes an item's state, it automatically creates an `'updated'` milestone:

```javascript
// In stateChangeService.js
const milestoneType = source === 'stripe' ? 'purchased' : 'updated';

await createMilestone(itemId, {
  milestone_type: milestoneType,
  from_state: fromState,
  to_state: newState,
  note: reason || null,
  metadata: { source, reason, ...metadata }
});
```

## Error Handling

All API functions return `{ data, error }` objects:

```javascript
const { data, error } = await fetchMilestones(itemId);

if (error) {
  // Handle error
  console.error('Failed to fetch milestones:', error);
  // Error can be:
  // - Authentication error
  // - Network error
  // - Not found error
  // - Generic error
} else {
  // Use data
  console.log('Milestones:', data);
}
```

## Authentication

All milestone API functions require authentication. They will:
1. Check for valid Supabase session
2. Verify ownership via RLS policies
3. Return error if not authenticated or unauthorized

## Related Documentation

- [Timeline Feature Documentation](./timeline-feature.md)
- [Database Schema](./feature-documentation.md#milestones-garage_milestones)
- [State Transitions](./state-transitions.md)

