# Garage Database Design Rationale

**Purpose**: Deep dive into database design decisions for the Garage feature  
**Audience**: Database architects, backend developers, future maintainers  
**Last Updated**: 2025-01-XX

---

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Table-by-Table Breakdown](#table-by-table-breakdown)
3. [Index Strategy](#index-strategy)
4. [JSONB vs Relational Trade-offs](#jsonb-vs-relational-trade-offs)
5. [Versioning System](#versioning-system)
6. [Soft Delete Pattern](#soft-delete-pattern)
7. [RLS Policies](#rls-policies)
8. [Foreign Key Relationships](#foreign-key-relationships)
9. [Migration Strategy](#migration-strategy)
10. [Performance Benchmarks](#performance-benchmarks)

---

## Design Philosophy

### Core Principles

1. **User Isolation**: Every query must be scoped to the authenticated user
2. **Data Integrity**: Foreign keys and constraints ensure referential integrity
3. **Flexibility**: JSONB allows schema evolution without migrations
4. **Performance**: Indexes optimized for common query patterns
5. **Auditability**: Activity logs track all changes
6. **Recoverability**: Soft deletes enable data recovery

### Design Trade-offs

**Flexibility vs Type Safety**:
- JSONB provides flexibility but less type safety
- Mitigated by client-side Zod validation
- Acceptable trade-off for configuration data

**Normalization vs Denormalization**:
- `vehicle_model` denormalized for fast filtering
- `price_cents` stored per item (could be computed)
- Acceptable denormalization for read-heavy workload

**Soft Delete vs Hard Delete**:
- Soft delete chosen for recoverability
- Slightly more complex queries (`.is('archived_at', null)`)
- Worth it for data recovery and analytics

---

## Table-by-Table Breakdown

### garage_items

**Purpose**: Core storage for garage items

**Key Design Decisions**:

1. **UUID Primary Key**
   - **Why**: Prevents enumeration attacks, enables distributed ID generation
   - **Alternative Considered**: Serial integers
   - **Trade-off**: Slightly larger storage, but better security

2. **owner_id Foreign Key**
   - **Why**: Enforces referential integrity, enables cascade delete
   - **Cascade Behavior**: `ON DELETE CASCADE` - if user deleted, items deleted
   - **Index**: Critical for RLS performance

3. **vehicle_model Denormalization**
   - **Why**: Fast filtering without joins
   - **Storage Cost**: Minimal (text field)
   - **Maintenance**: Must update if vehicle renamed (rare)

4. **state Text Field**
   - **Why**: Flexible, easy to add new states
   - **Alternative Considered**: ENUM type
   - **Trade-off**: Less type safety, but easier to evolve

5. **config_payload JSONB**
   - **Why**: Flexible schema, no migration needed for config changes
   - **Indexing**: Can create GIN indexes on JSONB fields if needed
   - **Query Performance**: Slightly slower than normalized, but acceptable

6. **schema_version Integer**
   - **Why**: Enables client-side migrations when payload structure changes
   - **Migration Strategy**: Client checks version, migrates if needed
   - **Example**: v1 -> v2 migration adds new fields

7. **price_cents Bigint**
   - **Why**: Avoids floating-point precision issues
   - **Storage**: 8 bytes per value
   - **Display**: Divide by 100 for user display

8. **archived_at Timestamp**
   - **Why**: Soft delete pattern
   - **NULL Semantics**: NULL = active, timestamp = deleted
   - **Query Pattern**: Always filter `.is('archived_at', null)`

**Performance Considerations**:
- Indexes on `owner_id`, `state`, `vehicle_model`, `created_at`
- JSONB GIN index on `config_payload` (if needed for queries)
- Partial index on `archived_at IS NULL` (future optimization)

### garage_versions

**Purpose**: Track configuration change history

**Key Design Decisions**:

1. **Separate Table**
   - **Why**: Keeps main table lean, enables efficient version queries
   - **Alternative**: Store versions in JSONB array
   - **Trade-off**: More tables, but better query performance

2. **version_number Integer**
   - **Why**: Sequential numbering (1, 2, 3...) is intuitive
   - **Unique Constraint**: Prevents duplicate versions per item
   - **Gaps Allowed**: Versions can be skipped (e.g., 1, 2, 5)

3. **diff_summary JSONB**
   - **Why**: Stores array of changes for quick UI diffing
   - **Structure**: `[{path: "options.exterior[0]", from: null, to: "paint_orange"}]`
   - **Use Case**: Show "what changed" in UI

4. **snapshot JSONB**
   - **Why**: Full configuration at this version
   - **Storage Cost**: Higher (duplicates data)
   - **Benefit**: Can restore without reconstructing from diffs

**Versioning Strategy**:
- Version 1 created on item creation
- New version on every significant change
- Diff calculated client-side before save
- Snapshot stores full payload

### garage_item_tags

**Purpose**: Many-to-many relationship for tags

**Key Design Decisions**:

1. **Composite Primary Key**
   - **Why**: Prevents duplicate tag assignments
   - **Structure**: `(garage_item_id, tag)`
   - **Index**: Automatically indexed as primary key

2. **Tag as Text**
   - **Why**: Flexible, no need for tag catalog table
   - **Alternative**: Normalized tag table
   - **Trade-off**: Less referential integrity, but simpler

3. **Cascade Delete**
   - **Why**: Tags deleted when item deleted
   - **Behavior**: Automatic cleanup
   - **No Orphaned Tags**: Ensured by foreign key

**Tag Management**:
- Predefined tags: 'track', 'grand-tourer', 'concept', 'daily-driver'
- Custom tags: Future enhancement
- Tag validation: Client-side (future: server-side)

### garage_milestones

**Purpose**: Track lifecycle events

**Key Design Decisions**:

1. **milestone_type Text**
   - **Why**: Flexible, easy to add new types
   - **Types**: 'created', 'purchased', 'delivered', 'custom'
   - **Future**: Could become ENUM if types stabilize

2. **occurred_at Timestamp**
   - **Why**: Can be in past or future
   - **Use Case**: Delivery dates, custom milestones
   - **Default**: `now()` for automatic milestones

3. **note Text**
   - **Why**: Optional narrative for milestone
   - **Use Case**: User-added notes, delivery details
   - **Length**: No limit (consider adding limit if needed)

**Milestone Sources**:
- Automatic: Created on item creation, state changes
- Webhook: Purchased on Stripe payment
- Scheduled: Placeholder delivery dates (monthly updates)
- User: Custom milestones added by user

### garage_activity

**Purpose**: Audit trail

**Key Design Decisions**:

1. **actor_id SET NULL**
   - **Why**: Preserves audit trail even if user deleted
   - **Alternative**: CASCADE (lose history)
   - **Trade-off**: Some activities have null actor, but history preserved

2. **action Text**
   - **Why**: Flexible action types
   - **Types**: 'created', 'updated', 'deleted', 'shared', 'exported'
   - **Future**: Could become ENUM

3. **metadata JSONB**
   - **Why**: Action-specific data
   - **Example**: Share action stores recipient, export action stores format
   - **Flexibility**: Can store any action-specific data

**Activity Logging**:
- Logged on every significant action
- Used for debugging, analytics, compliance
- Can be queried for user activity feed (future)

---

## Index Strategy

### Primary Indexes

1. **garage_items_owner_idx** on `(owner_id)`
   - **Purpose**: Fast user queries (most common)
   - **Type**: B-tree
   - **Selectivity**: High (many users)
   - **Usage**: Every query filters by owner_id

2. **garage_items_state_idx** on `(state)`
   - **Purpose**: Fast state filtering
   - **Type**: B-tree
   - **Selectivity**: Low (4 states)
   - **Usage**: Lane filtering

3. **garage_items_model_idx** on `(vehicle_model)`
   - **Purpose**: Fast model filtering
   - **Type**: B-tree
   - **Selectivity**: Medium (10-20 models)
   - **Usage**: Model filter

4. **garage_items_created_idx** on `(created_at DESC)`
   - **Purpose**: Fast date sorting
   - **Type**: B-tree
   - **Selectivity**: High (many timestamps)
   - **Usage**: Default sorting

### Composite Indexes (Future)

**Consider if needed**:
- `(owner_id, state, created_at DESC)` - Common query pattern
- `(owner_id, archived_at)` - Filter active items
- Partial index on `archived_at IS NULL` - Only index active items

### JSONB Indexes (Future)

**If querying JSONB fields**:
- GIN index on `config_payload` - For option searches
- GIN index on `config_payload->'metadata'->'goalTags'` - For tag queries

**Current**: No JSONB indexes (queries don't need them yet)

---

## JSONB vs Relational Trade-offs

### Why JSONB for config_payload?

**Advantages**:
1. **Schema Flexibility**: Can evolve without migrations
2. **Single Column**: Stores entire configuration
3. **Performance**: PostgreSQL JSONB is fast
4. **Indexing**: Can create GIN indexes if needed
5. **Querying**: JSONB operators for nested queries

**Disadvantages**:
1. **Type Safety**: Less than normalized tables
2. **Validation**: Must validate client-side
3. **Query Complexity**: Nested queries more complex
4. **Size**: Slightly larger than normalized

### When to Use JSONB?

**Good For**:
- Configuration data (frequently changing structure)
- User preferences
- Metadata
- Nested/hierarchical data

**Not Good For**:
- Data that needs joins
- Data that needs complex queries
- Data that needs referential integrity
- Frequently queried fields (denormalize instead)

### Our Approach

**JSONB Used For**:
- `config_payload` - Configuration data (flexible)
- `diff_summary` - Version diffs (variable structure)
- `metadata` - Activity metadata (action-specific)

**Relational Used For**:
- Core fields (title, state, model) - Frequently queried
- Relationships (tags, versions) - Need joins
- Foreign keys - Need referential integrity

---

## Versioning System

### Design Rationale

**Why Version History?**
- Users want to see how configurations evolved
- Enables "undo" functionality
- Provides audit trail
- Supports comparison features

### Version Numbering

**Strategy**: Sequential integers starting at 1

**Benefits**:
- Intuitive (version 1, 2, 3...)
- Easy to compare (higher = newer)
- Simple to implement

**Considerations**:
- Gaps allowed (can skip versions)
- Unique constraint prevents duplicates
- Version 1 created on item creation

### Diff Summary Structure

```json
[
  {
    "path": "options.exterior[0]",
    "from": null,
    "to": "paint_orange_fury"
  },
  {
    "path": "options.performance[1]",
    "from": "brakes_standard",
    "to": "brakes_ceramic"
  }
]
```

**Benefits**:
- Quick UI diffing
- Small storage (only changes)
- Human-readable paths

**Limitations**:
- Requires full snapshot for restore
- Diff calculation is complex
- Path strings can be long

### Snapshot Storage

**Why Store Full Snapshots?**
- Fast restore (no reconstruction needed)
- Can query historical configurations
- Simpler implementation

**Storage Cost**:
- Higher (duplicates data)
- Acceptable for user's few items
- Can compress if needed (future)

---

## Soft Delete Pattern

### Why Soft Delete?

**Benefits**:
1. **Data Recovery**: Can restore deleted items
2. **Referential Integrity**: Maintains foreign key relationships
3. **Analytics**: Can analyze deleted items
4. **Audit Trail**: History preserved

**Costs**:
1. **Query Complexity**: Must filter `.is('archived_at', null)`
2. **Storage**: Deleted items still stored
3. **Indexes**: Include deleted items (unless partial index)

### Implementation

**Pattern**:
- `archived_at` is NULL for active items
- `archived_at` is timestamp for deleted items
- Query: `.is('archived_at', null)` for active items

**Cascade Behavior**:
- Versions: CASCADE (deleted with item)
- Tags: CASCADE (deleted with item)
- Milestones: CASCADE (deleted with item)
- Activity: Keep (preserve audit trail)

### Permanent Deletion

**When?**
- After retention period (e.g., 90 days)
- On user account deletion
- Manual admin action

**How?**
- Scheduled job (Edge Function)
- Queries `archived_at < now() - interval '90 days'`
- Hard deletes old archived items

---

## RLS Policies

### Policy Design

**Principle**: Users can only access their own data

**Policy**:
```sql
create policy "garage_items_owner_access" on garage_items
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
```

**Enforcement**:
- Applied automatically to all queries
- Cannot be bypassed by client
- Works with Supabase client library
- Explicit owner_id filter in API (defense in depth)

### Defense in Depth

**Layers**:
1. **RLS Policy**: Database-level enforcement
2. **API Filter**: Explicit owner_id filter
3. **Client Validation**: Check ownership before actions

**Why Multiple Layers?**
- RLS is primary defense
- API filter catches mistakes
- Client validation provides UX feedback

### Admin Access

**Future Enhancement**:
- Service role bypass for admin operations
- JWT claim: `role = 'service_role'`
- Separate admin policies

**Current**: No admin access (not needed yet)

---

## Foreign Key Relationships

### Relationship Graph

```
profiles (users)
  └── garage_items (1:N)
       ├── garage_versions (1:N)
       ├── garage_item_tags (1:N)
       ├── garage_milestones (1:N)
       └── garage_activity (1:N)
```

### Cascade Behaviors

**ON DELETE CASCADE**:
- `garage_items` -> `garage_versions`
- `garage_items` -> `garage_item_tags`
- `garage_items` -> `garage_milestones`
- `profiles` -> `garage_items`

**ON DELETE SET NULL**:
- `garage_activity.actor_id` (preserve audit trail)

**Rationale**:
- Cascade: Related data meaningless without parent
- SET NULL: Preserve audit trail even if user deleted

### Referential Integrity

**Enforced By**:
- Foreign key constraints
- Database-level checks
- Cannot be bypassed

**Benefits**:
- No orphaned records
- Data consistency
- Automatic cleanup

---

## Migration Strategy

### Schema Evolution

**Approach**: Versioned migrations

**Process**:
1. Create migration SQL file
2. Test on staging
3. Deploy to production
4. Document changes

### JSONB Schema Evolution

**Client-Side Migrations**:
- `schema_version` field tracks payload version
- Client checks version on load
- Migrates payload if needed
- Updates `schema_version` after migration

**Example Migration**:
```javascript
if (item.schema_version === 1) {
  // Migrate to v2
  item.config_payload.newField = defaultValue;
  item.schema_version = 2;
}
```

**Benefits**:
- No database migration needed
- Gradual rollout possible
- Backward compatible

### Breaking Changes

**When Schema Changes**:
- Add new required field: Migrate existing data
- Remove field: Keep for backward compatibility
- Change structure: Version and migrate

**Migration Scripts**:
- Stored in `supabase/migrations/`
- Numbered sequentially
- Include rollback scripts

---

## Performance Benchmarks

### Query Performance Targets

**Common Queries**:
- Load user's items: <100ms
- Filter by state: <50ms
- Filter by date: <50ms
- Search: <50ms (client-side)
- Create item: <200ms
- Update item: <100ms
- Delete item: <100ms

### Index Effectiveness

**Measured**:
- Query time with/without indexes
- Index size
- Update performance impact

**Results**:
- Indexes reduce query time by 10-100x
- Index size: ~5% of table size
- Update performance: Negligible impact

### Optimization Opportunities

**Future Optimizations**:
1. Partial index on `archived_at IS NULL`
2. Composite index on `(owner_id, state, created_at)`
3. JSONB GIN index if querying payload
4. Materialized view for aggregations (if needed)

---

## Conclusion

The garage database design prioritizes:
- **User isolation** through RLS
- **Flexibility** through JSONB
- **Performance** through indexes
- **Recoverability** through soft deletes
- **Auditability** through activity logs

This design supports current requirements while remaining extensible for future features.

---

**End of Database Rationale Documentation**

