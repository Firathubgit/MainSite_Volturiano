# Garage Feature - Comprehensive Documentation

**Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Status:** Core Implementation Complete, Advanced Features Pending  
**Feature Owner:** Development Team

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Database Design](#database-design)
4. [API Layer](#api-layer)
5. [State Management](#state-management)
6. [UI Components](#ui-components)
7. [Filtering & Search](#filtering--search)
8. [Real-time Synchronization](#real-time-synchronization)
9. [Offline Support](#offline-support)
10. [Future Extensibility](#future-extensibility)
11. [Performance Considerations](#performance-considerations)
12. [Security & Privacy](#security--privacy)
13. [Testing Strategy](#testing-strategy)
14. [Known Limitations](#known-limitations)

---

## Executive Summary

### What is Garage?

Garage is a comprehensive vehicle configuration management system that allows users to save, organize, filter, and manage their vehicle configurations across different lifecycle states. It serves as the central hub where users can:

- **Save Builds**: Store configurations from the configurator for later review
- **Track Purchases**: Monitor ordered vehicles through delivery
- **Manage Prototypes**: Organize experimental or concept configurations
- **Maintain Wishlist**: Keep track of desired configurations

### Why Garage Exists

Garage addresses several critical user needs:

1. **Configuration Persistence**: Users can save their work and return later
2. **Comparison**: Users can compare multiple configurations side-by-side
3. **Sharing**: Users can share configurations with others (dealers, friends, family)
4. **History**: Users can track how their configurations evolved over time
5. **Organization**: Users can categorize and filter their saved configurations

### User Value Proposition

- **Instant Access**: All saved configurations available immediately
- **Cross-Device Sync**: Access garage from any device, changes sync in real-time
- **Offline Support**: View saved configurations even without internet
- **Smart Filtering**: Find configurations quickly with powerful filters
- **Seamless Integration**: Save directly from configurator, open in configurator

### Business Value

- **Increased Engagement**: Users return to review saved configurations
- **Higher Conversion**: Easy comparison leads to more purchases
- **Reduced Support**: Self-service configuration management
- **Data Insights**: Understand user preferences and popular configurations

---

## Architecture Overview

### Component Hierarchy

```
Garage Feature Structure:
├── pages/
│   └── Garage.jsx (main page, orchestrates layout + store)
├── components/
│   ├── GarageLayout.jsx (container, filters + lanes)
│   ├── GarageLane.jsx (single lane: Saved/Purchased/Prototype/Wishlist)
│   ├── CarCard.jsx (individual item display)
│   ├── GarageFilters.jsx (filter controls)
│   └── GarageEmptyState.jsx (empty state messages)
├── styles/
│   └── garage.module.css (scoped styles)
└── utils/ (future: diff calculation, export helpers)

Store:
└── garageStore.js (Zustand store for state management)

API:
└── features/account/api.js (garage API functions)
```

### Data Flow

```
User Action
    ↓
Component Event Handler
    ↓
Zustand Store Action (optimistic update)
    ↓
API Function (Supabase call)
    ↓
Supabase Database (RLS enforced)
    ↓
Realtime Subscription (broadcast change)
    ↓
Store Update (merge with optimistic)
    ↓
Component Re-render (React)
```

### Key Architectural Decisions

**1. Feature-Sliced Architecture**
- Garage is a self-contained feature slice
- Owns its components, styles, API functions, and store
- Minimal coupling with other features
- Easy to test and maintain

**2. Zustand for State Management**
- Chosen over Redux for simplicity
- Fine-grained subscriptions prevent unnecessary re-renders
- Minimal boilerplate
- Excellent TypeScript support (when we add TS)

**3. Optimistic Updates**
- UI updates immediately on user action
- Rollback on API failure
- Provides instant feedback
- Reduces perceived latency

**4. Client-Side Filtering for Search**
- Search filters client-side for instant feedback
- Date/price filters server-side for efficiency
- Best of both worlds: speed + accuracy

**5. Soft Delete Pattern**
- Items marked as `archived_at` instead of deleted
- Allows data recovery
- Maintains referential integrity
- Enables analytics on deleted items

---

## Database Design

### Schema Overview

The garage feature uses 8 main tables:

1. **garage_items** - Core item storage
2. **garage_versions** - Version history
3. **garage_item_tags** - Tag associations
4. **garage_milestones** - Lifecycle events
5. **garage_activity** - Audit log
6. **test_drive_requests** - Test drive scheduling
7. **model_subscriptions** - Launch notifications
8. **model_launches** - Launch announcements

### Core Table: garage_items

**Purpose**: Stores the main garage item records

**Schema**:
```sql
create table garage_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  description text,
  vehicle_model text not null,
  state text not null default 'wishlist',
  config_payload jsonb not null,
  schema_version integer not null default 1,
  price_cents bigint,
  currency char(3) default 'EUR',
  thumbnail_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  archived_at timestamptz
);
```

**Design Rationale**:

- **id (uuid)**: UUIDs prevent enumeration attacks and enable distributed ID generation
- **owner_id**: Foreign key to profiles ensures referential integrity, cascade delete cleans up on user deletion
- **title/description**: User-friendly text fields for quick identification
- **vehicle_model**: Denormalized for fast filtering (indexed separately)
- **state**: Enum-like text field ('saved', 'purchased', 'prototype', 'wishlist')
- **config_payload (jsonb)**: Flexible storage for configuration data, allows schema evolution
- **schema_version**: Enables client-side migrations when payload structure changes
- **price_cents**: Stored in cents to avoid floating-point precision issues
- **archived_at**: Soft delete pattern - NULL means active, timestamp means deleted

**Indexes**:
- `garage_items_owner_idx` on `(owner_id)` - Fast user queries
- `garage_items_state_idx` on `(state)` - Fast state filtering
- `garage_items_model_idx` on `(vehicle_model)` - Fast model filtering
- `garage_items_created_idx` on `(created_at DESC)` - Fast date sorting

**RLS Policy**:
```sql
create policy "garage_items_owner_access" on garage_items
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
```

This ensures users can only access their own items.

### Version History: garage_versions

**Purpose**: Tracks configuration changes over time

**Schema**:
```sql
create table garage_versions (
  id uuid primary key default gen_random_uuid(),
  garage_item_id uuid not null references garage_items(id) on delete cascade,
  version_number integer not null,
  diff_summary jsonb,
  snapshot jsonb not null,
  created_at timestamptz default now()
);
```

**Design Rationale**:

- **version_number**: Sequential versioning (1, 2, 3...)
- **diff_summary**: Stores array of changes for quick UI diffing
- **snapshot**: Full configuration payload at this version
- **Unique constraint**: Prevents duplicate version numbers per item

**Use Cases**:
- Show configuration evolution timeline
- Restore to previous version
- Compare versions side-by-side
- Audit trail of changes

### Tags: garage_item_tags

**Purpose**: Many-to-many relationship for goal tags

**Schema**:
```sql
create table garage_item_tags (
  garage_item_id uuid not null references garage_items(id) on delete cascade,
  tag text not null,
  primary key (garage_item_id, tag)
);
```

**Design Rationale**:

- Composite primary key prevents duplicates
- Simple structure for fast queries
- Tags are strings (not normalized) for flexibility
- Cascade delete removes tags when item deleted

**Common Tags**:
- 'track' - Track-focused configuration
- 'grand-tourer' - Long-distance touring
- 'concept' - Experimental design
- 'daily-driver' - Everyday use

### Milestones: garage_milestones

**Purpose**: Tracks lifecycle events (created, purchased, delivered, etc.)

**Schema**:
```sql
create table garage_milestones (
  id uuid primary key default gen_random_uuid(),
  garage_item_id uuid not null references garage_items(id) on delete cascade,
  milestone_type text not null,
  note text,
  occurred_at timestamptz not null default now()
);
```

**Design Rationale**:

- **milestone_type**: Flexible text field ('created', 'purchased', 'delivered', 'custom')
- **note**: Optional narrative for milestone
- **occurred_at**: When milestone happened (can be in past/future)

**Use Cases**:
- Timeline view showing configuration journey
- Delivery date tracking
- Custom user notes
- Integration with order system

### Activity Log: garage_activity

**Purpose**: Audit trail of all garage actions

**Schema**:
```sql
create table garage_activity (
  id uuid primary key default gen_random_uuid(),
  garage_item_id uuid references garage_items(id) on delete cascade,
  actor_id uuid references profiles(id) on delete set null,
  action text not null,
  metadata jsonb,
  created_at timestamptz default now()
);
```

**Design Rationale**:

- **actor_id**: Who performed the action (SET NULL on user delete to preserve history)
- **action**: Type of action ('created', 'updated', 'deleted', 'shared', etc.)
- **metadata**: Flexible JSON for action-specific data

**Use Cases**:
- Debugging user issues
- Analytics on feature usage
- Compliance/audit requirements
- User activity feed (future)

### JSONB Payload Structure

The `config_payload` JSONB field follows this schema (see `docs/garage-schema.md`):

```json
{
  "schemaVersion": 1,
  "vehicle": {
    "model": "Tornado GT",
    "trim": "Launch Edition",
    "year": 2025,
    "vin": null
  },
  "options": {
    "exterior": [
      { "id": "paint_orange_fury", "label": "Orange Fury", "price": 1800 }
    ],
    "interior": [
      { "id": "seat_carbon", "label": "Carbon Bucket Seats" }
    ],
    "performance": [
      { "id": "brakes_ceramic", "label": "Carbon Ceramic", "price": 6500 }
    ]
  },
  "pricing": {
    "basePriceCents": 18000000,
    "optionsTotalCents": 830000,
    "discountCents": 0,
    "currency": "EUR"
  },
  "media": {
    "heroImage": "https://cdn.volturiano.com/configs/123/hero.png",
    "gallery": []
  },
  "history": {
    "createdAt": "2025-11-11T12:34:56.000Z",
    "updatedAt": "2025-11-11T12:34:56.000Z",
    "source": "configurator",
    "notes": "Configured during Geneva teaser stream."
  },
  "metadata": {
    "goalTags": ["track", "concept"],
    "locale": "sv",
    "isPrototype": false,
    "relatedShowcaseId": null
  }
}
```

**Why JSONB?**

1. **Flexibility**: Schema can evolve without migrations
2. **Performance**: PostgreSQL JSONB is fast and indexable
3. **Simplicity**: Single column stores entire configuration
4. **Versioning**: `schema_version` enables client-side migrations

**Trade-offs**:

- Less type safety (mitigated by Zod validation)
- Harder to query nested fields (use JSONB operators)
- No foreign key constraints on nested data

---

## API Layer

### Function Overview

All garage API functions are in `web/src/features/account/api.js`:

1. `fetchGarage(filters, pagination)` - Fetch items with filtering
2. `createGarageItem(payload)` - Create new item
3. `updateGarageState(itemId, newState)` - Update state
4. `updateGarageItem(itemId, updates)` - Update fields
5. `deleteGarageItem(itemId)` - Soft delete
6. `fetchGarageVersions(itemId)` - Get version history

### fetchGarage

**Signature**:
```javascript
async function fetchGarage(filters = {}, pagination = {})
```

**Parameters**:
- `filters.state` - Filter by state ('saved', 'purchased', etc.)
- `filters.model` - Filter by vehicle model
- `filters.search` - Search term (handled client-side)
- `filters.dateRange` - Date range ('7d', '30d', '90d', '1y')
- `filters.dateField` - Field to filter ('created_at', 'updated_at')
- `filters.priceMin` - Minimum price in cents
- `filters.priceMax` - Maximum price in cents
- `pagination.page` - Page number (1-based)
- `pagination.pageSize` - Items per page

**Implementation Details**:

1. **Authentication Check**: Ensures user is logged in
2. **Query Building**: Uses `buildGarageQuery` helper
3. **Owner Filter**: Explicitly filters by `owner_id` (RLS backup)
4. **NULL Handling**: Uses `.is('archived_at', null)` for correct NULL comparison
5. **Pagination**: Uses `.range(from, to)` for efficient pagination
6. **Error Handling**: Returns `{data, error, count}` structure

**Example Usage**:
```javascript
const { data, error, count } = await fetchGarage(
  { state: 'saved', dateRange: '30d' },
  { page: 1, pageSize: 20 }
);
```

### createGarageItem

**Signature**:
```javascript
async function createGarageItem(payload)
```

**Parameters**:
- `payload.title` - Item title (required)
- `payload.description` - Item description
- `payload.vehicle_model` - Vehicle model name
- `payload.state` - Initial state (default: 'wishlist')
- `payload.config_payload` - Full configuration JSON
- `payload.price_cents` - Total price in cents
- `payload.currency` - Currency code (default: 'EUR')

**Implementation Details**:

1. **Validation**: Validates required fields
2. **Transaction**: Creates item + initial version in transaction
3. **Version Creation**: Creates version 1 with full snapshot
4. **Error Handling**: Rolls back on failure

**Example Usage**:
```javascript
const item = await createGarageItem({
  title: "My Dream GT",
  description: "Fully configured Tornado GT",
  vehicle_model: "Tornado GT",
  state: "saved",
  config_payload: { /* ... */ },
  price_cents: 18830000
});
```

### deleteGarageItem

**Signature**:
```javascript
async function deleteGarageItem(itemId)
```

**Implementation Details**:

1. **Soft Delete**: Sets `archived_at` timestamp (doesn't actually delete)
2. **Owner Check**: Verifies user owns the item
3. **Activity Log**: Creates activity log entry
4. **Error Handling**: Returns error if item not found or not owned

**Why Soft Delete?**

- Data recovery possible
- Maintains referential integrity
- Enables analytics on deleted items
- Allows "undo" functionality

---

## State Management

### Zustand Store Structure

The garage store (`web/src/stores/garageStore.js`) manages:

**State**:
- `items` - Map<id, GarageItem> for O(1) lookups
- `filters` - Current filter state
- `pagination` - Pagination state
- `loading` - Loading flag
- `error` - Error object
- `selectedItemId` - Currently selected item
- `realtimeChannel` - Supabase Realtime channel

**Actions**:
- `loadGarage(useCache)` - Load items from API
- `addItem(itemData)` - Optimistically add item
- `updateItem(itemId, updates)` - Optimistically update item
- `deleteItem(itemId)` - Optimistically delete item
- `setFilters(newFilters)` - Update filters and reload
- `getItemsByState(state)` - Get filtered items by state
- `subscribeRealtime()` - Subscribe to real-time updates
- `unsubscribeRealtime()` - Unsubscribe from updates

### Optimistic Updates Pattern

**Example: Delete Item**

```javascript
deleteItem: async (itemId) => {
  const state = get();
  const originalItems = new Map(state.items);
  
  // Optimistic update: remove immediately
  const newItems = new Map(state.items);
  newItems.delete(itemId);
  set({ items: newItems });
  
  try {
    // API call
    await deleteItemAPI(itemId);
  } catch (err) {
    // Rollback on error
    set({ items: originalItems, error: err });
    throw err;
  }
}
```

**Benefits**:
- Instant UI feedback
- Better perceived performance
- Rollback on failure
- User feels in control

### Caching Strategy

**localStorage Cache**:
- Key: `volturiano_garage_cache`
- Structure: `{ items: {...}, timestamp: number }`
- Expiry: 24 hours
- Usage: Load on app start if cache valid

**Cache Invalidation**:
- Invalidated on filter change (except search)
- Invalidated on manual refresh
- Expires after 24 hours
- Cleared on logout

**Why Cache?**
- Offline support
- Faster initial load
- Reduced API calls
- Better UX

---

## UI Components

### GarageLayout

**Purpose**: Main container component

**Props**: None (uses store directly)

**Responsibilities**:
- Render filter controls
- Render four lanes (or single lane if filtered)
- Handle delete/edit actions
- Show loading/error states

**Key Features**:
- Dynamic lane rendering based on filters
- Error handling with user-friendly messages
- Loading skeleton during fetch

### GarageLane

**Purpose**: Display items for a specific state

**Props**:
- `state` - Lane state ('saved', 'purchased', etc.)
- `title` - Lane title (i18n key)
- `emptyMessage` - Empty state message (i18n key)

**Responsibilities**:
- Filter items by state
- Render CarCard components
- Show empty state if no items
- Show loading skeleton

**Key Features**:
- Filters out archived items
- Applies search filter (client-side)
- Responsive grid layout

### CarCard

**Purpose**: Display individual garage item

**Props**:
- `item` - Garage item object
- `onEdit` - Edit handler
- `onDelete` - Delete handler

**Responsibilities**:
- Display item thumbnail
- Show title, model, price
- Render action buttons
- Handle click navigation

**Key Features**:
- Responsive card design
- Hover effects
- Loading placeholder for images
- Accessible buttons

### GarageFilters

**Purpose**: Filter and search controls

**Props**: None (uses store directly)

**Responsibilities**:
- Render filter controls
- Handle filter changes
- Debounce search input
- Persist filter preferences (future)

**Key Features**:
- State filter dropdown
- Date field selector
- Date range selector
- Price min/max inputs
- Search input with debouncing

---

## Filtering & Search

### Filter Architecture

**Client-Side Filters** (instant feedback):
- Search (title/description)
- Applied in `getItemsByState` selector

**Server-Side Filters** (efficient queries):
- State
- Model
- Date range
- Price range
- Applied in Supabase query

### Search Implementation

**Current Implementation**:
- Searches `title` and `description` fields only
- Case-insensitive matching
- Client-side filtering for instant feedback
- Debounced input (300ms)

**Why Client-Side?**
- Instant feedback (no API delay)
- Works offline
- Simple implementation
- Good enough for user's few items

**Future Enhancement**:
- Full-text search in PostgreSQL
- Search in config_payload JSONB
- Search in option labels
- Fuzzy matching

### Date Filtering

**Implementation**:
- Server-side filtering using `.gte()` on date field
- Supports: '7d', '30d', '90d', '1y'
- Field selection: 'created_at' or 'updated_at'
- Efficient with indexed `created_at` column

**Example Query**:
```javascript
if (dateRange === '30d') {
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  query = query.gte(dateField, startDate.toISOString());
}
```

### Price Filtering

**Implementation**:
- Server-side filtering using `.gte()` and `.lte()`
- Prices stored in cents (bigint)
- User inputs in EUR, converted to cents
- Debounced input (500ms)

**Example Query**:
```javascript
if (priceMin !== null) {
  query = query.gte('price_cents', priceMin);
}
if (priceMax !== null) {
  query = query.lte('price_cents', priceMax);
}
```

---

## Real-time Synchronization

### Supabase Realtime Integration

**Subscription Setup**:
```javascript
subscribeRealtime: () => {
  const channel = supabase
    .channel('garage-changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'garage_items',
      filter: `owner_id=eq.${userId}`
    }, (payload) => {
      // Handle change
    })
    .subscribe();
}
```

**Event Handling**:
- **INSERT**: Add new item to store
- **UPDATE**: Update existing item
- **DELETE**: Remove item (if archived_at set)

**Benefits**:
- Cross-device sync
- Collaborative editing (future)
- Live updates without refresh
- Better UX

### Subscription Lifecycle

1. **Subscribe**: On garage page mount
2. **Unsubscribe**: On garage page unmount
3. **Reconnect**: Automatic on network recovery
4. **Error Handling**: Log errors, continue without real-time

---

## Offline Support

### localStorage Caching

**Cache Structure**:
```json
{
  "items": {
    "item-id-1": { /* item data */ },
    "item-id-2": { /* item data */ }
  },
  "timestamp": 1704067200000
}
```

**Cache Lifecycle**:
1. **Save**: After successful API fetch
2. **Load**: On app start if cache valid
3. **Expire**: After 24 hours
4. **Invalidate**: On filter change (except search)

**Offline Behavior**:
- Show cached items immediately
- Show "offline" indicator
- Disable actions that require API
- Queue actions for when online (future)

---

## Future Extensibility

### Planned Features

1. **Edit Functionality**
   - Modal for editing title/description
   - Inline editing for title
   - Bulk edit operations

2. **Version History UI**
   - Timeline component
   - Diff visualization
   - Restore to version

3. **Sharing**
   - Share link generation
   - QR codes
   - Social sharing
   - Privacy controls

4. **Advanced Filtering**
   - Saved filter sets
   - Custom sorting
   - Tag filtering
   - Multi-select filters

5. **Export**
   - PDF spec sheets
   - Image exports
   - CSV export
   - Shareable links

6. **Integration**
   - Configurator deep links
   - Order system integration
   - Test drive scheduling
   - Showcase mode

### Extension Points

**Adding New Filters**:
1. Add filter to store `filters` object
2. Update `buildGarageQuery` to handle filter
3. Add UI control in `GarageFilters`
4. Update `setFilters` logic

**Adding New States**:
1. Add state to enum
2. Update lane rendering logic
3. Add i18n translations
4. Update state transition validation

**Adding New Actions**:
1. Add action to store
2. Create API function
3. Add UI button/control
4. Handle optimistic updates

---

## Performance Considerations

### Optimization Strategies

1. **Map Data Structure**: O(1) lookups instead of O(n) array searches
2. **Client-Side Filtering**: Instant search feedback
3. **Pagination**: Load items in chunks (20 per page)
4. **Debouncing**: Reduce API calls for filters
5. **Caching**: localStorage reduces API calls
6. **Indexes**: Database indexes for fast queries
7. **Optimistic Updates**: Instant UI feedback

### Performance Metrics

**Target Metrics**:
- Initial load: <500ms
- Filter change: <200ms
- Search: <50ms (client-side)
- Item render: <16ms (60fps)

**Monitoring**:
- Track API response times
- Monitor store update times
- Measure render performance
- Set up performance budgets

---

## Security & Privacy

### Row-Level Security (RLS)

**Policy**: Users can only access their own items

```sql
create policy "garage_items_owner_access" on garage_items
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
```

**Enforcement**:
- Applied at database level
- Cannot be bypassed by client
- Works with Supabase client library
- Explicit owner_id filter in API (defense in depth)

### Data Validation

**Client-Side**:
- Validate required fields
- Sanitize user input
- Check data types
- Enforce length limits

**Server-Side**:
- RLS policies enforce ownership
- Database constraints enforce data integrity
- API functions validate input
- JSONB schema validation (future: Zod)

### Privacy Considerations

**User Data**:
- Only owner can view items
- Sharing requires explicit opt-in
- Deleted items soft-deleted (recoverable)
- Activity logs for audit

**Compliance**:
- GDPR: Right to deletion (soft delete)
- GDPR: Data export (future)
- CCPA: Data access (future)

---

## Testing Strategy

### Unit Tests

**Store Tests**:
- Test optimistic updates
- Test rollback on error
- Test filter logic
- Test cache functions

**Component Tests**:
- Test rendering
- Test user interactions
- Test error states
- Test loading states

### Integration Tests

**API Tests**:
- Test API functions
- Test error handling
- Test RLS enforcement
- Test pagination

**E2E Tests**:
- Test full user flows
- Test real-time updates
- Test offline behavior
- Test cross-device sync

### Test Data

**Fixtures**:
- Sample garage items
- Test user accounts
- Mock API responses
- Test configurations

---

## Known Limitations

### Current Gaps

1. **Edit Functionality**: Not yet implemented (planned)
2. **Version History UI**: API exists but no UI (planned)
3. **Image Upload**: Thumbnail upload not implemented (planned)
4. **Pagination UI**: Pagination works but no "Load More" button (planned)
5. **Configurator Integration**: Deep links not implemented (planned)

### Workarounds

1. **Edit**: Users can delete and recreate (temporary)
2. **Version History**: Can view via API (developer only)
3. **Images**: Use placeholder images (temporary)
4. **Pagination**: All items load (acceptable for small collections)

### Planned Fixes

See Phase 2 roadmap in `docs/ULTIMATE_ROADMAP.md` for planned features and timelines.

---

## References

- **Schema Documentation**: `docs/garage-schema.md`
- **Database Setup**: `docs/garage/supabase-setup.md`
- **Implementation Summary**: `docs/garage/implementation-summary.md`
- **Testing Guide**: `docs/garage/testing-guide.md`
- **Roadmap**: `docs/ULTIMATE_ROADMAP.md` (Phase 2)

---

**End of Garage Feature Documentation**

