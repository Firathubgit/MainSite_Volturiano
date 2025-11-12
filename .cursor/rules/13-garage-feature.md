---
title: Garage Feature Development Rules
description: Cursor-aware rules for Garage feature development, patterns, and conventions.
status: active
apply_to: [web/src/features/garage, web/src/stores/garageStore.js, web/src/features/account/api.js (garage functions)]
labels: [garage, feature, patterns]
---

## Feature Boundaries

### What Belongs in Garage

**In Scope**:
- Saving configurations from configurator
- Managing saved configurations (CRUD)
- Filtering and searching configurations
- Version history and diffs
- Sharing configurations
- State management (saved/purchased/prototype/wishlist)
- Tags and categorization
- Timeline and milestones

**Out of Scope**:
- Configuration creation (belongs to configurator)
- Order processing (belongs to orders/commerce)
- Payment processing (belongs to Stripe integration)
- User authentication (belongs to auth system)

### File Organization

**Garage Feature Files**:
- `web/src/features/garage/components/` - All garage UI components
- `web/src/features/garage/styles/` - Garage-specific styles
- `web/src/features/garage/utils/` - Garage utilities (diff, export, etc.)
- `web/src/stores/garageStore.js` - Garage Zustand store
- `web/src/features/account/api.js` - Garage API functions (shared with account)

**Do NOT**:
- Create garage files outside `features/garage/`
- Mix garage logic with other features
- Create global garage utilities (use feature folder)

## Code Patterns

### Zustand Store Structure

**Required Pattern**:
```javascript
export const useGarageStore = create((set, get) => ({
  // State
  items: new Map(), // Always use Map for O(1) lookups
  filters: { /* ... */ },
  loading: false,
  error: null,

  // Actions (always async, return Promise)
  loadGarage: async (useCache = true) => {
    // Implementation
  },

  // Selectors (pure functions, use get())
  getItemsByState: (state) => {
    const storeState = get();
    // Filter logic
  },
}));
```

**Rules**:
- Use `Map` for items (not array) - O(1) lookups
- Always return Promise from async actions
- Use `get()` in selectors to access current state
- Optimistic updates with rollback on error
- Clear error state on new actions

### API Function Pattern

**Required Pattern**:
```javascript
export async function garageFunctionName(params) {
  const { client, error } = ensureClient();
  if (error) return { data: null, error };

  try {
    // Explicit owner_id filter (defense in depth)
    const { data, error: queryError } = await client
      .from('garage_items')
      .select('*')
      .eq('owner_id', user.id) // Always filter by owner
      .is('archived_at', null); // Always exclude archived

    if (queryError) throw queryError;
    return { data, error: null };
  } catch (err) {
    console.error('[API] Error:', err);
    return { data: null, error: err };
  }
}
```

**Rules**:
- Always return `{data, error}` structure
- Always filter by `owner_id` explicitly (RLS backup)
- Always exclude archived items with `.is('archived_at', null)`
- Log errors with `[API]` prefix
- Never throw unhandled errors

### Component Pattern

**Required Pattern**:
```jsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useGarageStore } from '../../../stores/garageStore';
import styles from './Component.module.css';

export default function GarageComponent({ prop1 }) {
  const { t } = useTranslation('account'); // Use 'account' namespace
  const { state, action } = useGarageStore();

  // Always handle loading/error states
  if (state.loading) return <LoadingSkeleton />;
  if (state.error) return <ErrorMessage error={state.error} />;

  return (
    <div className={styles.container}>
      {/* Component JSX */}
    </div>
  );
}
```

**Rules**:
- Always use `useTranslation('account')` for garage components
- Always handle loading/error states
- Use CSS Modules (never global styles)
- Extract complex logic to custom hooks
- Keep components small and focused

## Database Patterns

### RLS Policy Template

**Always Use**:
```sql
create policy "table_name_owner_access" on table_name
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
```

**Rules**:
- Always check `owner_id = auth.uid()`
- Use descriptive policy names
- Enable RLS on all user-owned tables
- Test RLS with multiple users

### Query Patterns

**Always Filter**:
```javascript
// 1. Owner filter (explicit, defense in depth)
.eq('owner_id', user.id)

// 2. Archived filter (exclude soft-deleted)
.is('archived_at', null)

// 3. Additional filters
.eq('state', 'saved')
.gte('created_at', startDate)
```

**Rules**:
- Always filter by owner_id first
- Always exclude archived items
- Use `.is()` for NULL checks (not `.eq()`)
- Use `.gte()`/`.lte()` for date/price ranges

### Index Usage

**Required Indexes**:
- `owner_id` - Every query filters by this
- `state` - Lane filtering
- `vehicle_model` - Model filtering
- `created_at DESC` - Default sorting

**Rules**:
- Always index foreign keys
- Index frequently filtered columns
- Use DESC for date sorting indexes
- Consider composite indexes for common query patterns

## Component Patterns

### Lane Component

**Pattern**:
```jsx
<GarageLane
  state="saved"
  title={t('garage.lanes.savedBuilds')}
  emptyMessage={t('garage.empty.saved')}
/>
```

**Rules**:
- Always pass `state` prop
- Use i18n keys for title/empty message
- Lane filters items by state internally
- Shows loading skeleton when loading AND empty

### Card Component

**Pattern**:
```jsx
<CarCard
  item={item}
  onEdit={handleEdit}
  onDelete={handleDelete}
/>
```

**Rules**:
- Always pass full `item` object
- Handle edit/delete in parent (GarageLayout)
- Show loading placeholder for images
- Make card accessible (keyboard navigation)

### Filter Component

**Pattern**:
```jsx
<GarageFilters />
// Uses store directly, no props needed
```

**Rules**:
- No props needed (uses store)
- Debounce search input (300ms)
- Debounce price inputs (500ms)
- Update store filters on change
- Client-side search, server-side other filters

## Testing Patterns

### Store Tests

**Pattern**:
```javascript
describe('garageStore', () => {
  it('should load garage items', async () => {
    const store = useGarageStore.getState();
    await store.loadGarage();
    expect(store.items.size).toBeGreaterThan(0);
  });

  it('should rollback on error', async () => {
    // Test optimistic update rollback
  });
});
```

**Rules**:
- Test all store actions
- Test optimistic updates
- Test error handling
- Test selectors
- Mock API calls

### Component Tests

**Pattern**:
```javascript
describe('GarageLane', () => {
  it('should filter items by state', () => {
    // Test filtering logic
  });

  it('should show empty state', () => {
    // Test empty state
  });
});
```

**Rules**:
- Test rendering
- Test user interactions
- Test loading/error states
- Test i18n
- Mock store state

## Common Pitfalls

### ❌ Don't Do This

1. **Don't use arrays for items**
   ```javascript
   // ❌ Bad
   items: []
   
   // ✅ Good
   items: new Map()
   ```

2. **Don't forget owner_id filter**
   ```javascript
   // ❌ Bad
   .from('garage_items').select('*')
   
   // ✅ Good
   .from('garage_items').select('*').eq('owner_id', user.id)
   ```

3. **Don't use .eq() for NULL**
   ```javascript
   // ❌ Bad
   .eq('archived_at', null)
   
   // ✅ Good
   .is('archived_at', null)
   ```

4. **Don't forget archived filter**
   ```javascript
   // ❌ Bad
   .select('*')
   
   // ✅ Good
   .select('*').is('archived_at', null)
   ```

5. **Don't throw errors**
   ```javascript
   // ❌ Bad
   throw new Error('Failed');
   
   // ✅ Good
   return { data: null, error: new Error('Failed') };
   ```

## Extension Points

### Adding New Filters

1. Add to store `filters` object
2. Update `buildGarageQuery` in `api.js`
3. Add UI control in `GarageFilters.jsx`
4. Update `setFilters` logic
5. Update `getItemsByState` if client-side

### Adding New States

1. Add state to enum (document)
2. Update lane rendering in `GarageLayout`
3. Add i18n translations
4. Update state transition validation
5. Update RLS if needed

### Adding New Actions

1. Add action to store
2. Create API function
3. Add UI button/control
4. Handle optimistic updates
5. Add error handling
6. Write tests

## Performance Guidelines

### Store Performance

- Use Map for O(1) lookups (not array.find())
- Memoize expensive selectors
- Debounce rapid actions
- Limit history size (prevent memory leaks)

### Query Performance

- Always use indexes
- Limit result sets (pagination)
- Cache when appropriate
- Client-side filter for search (instant)

### Render Performance

- Use React.memo for expensive components
- Avoid unnecessary re-renders
- Lazy load heavy components
- Optimize image loading

## Security Guidelines

### Always Enforce

1. **RLS Policies**: Every table has RLS
2. **Owner Filter**: Explicit owner_id filter in API
3. **Input Validation**: Validate all user input
4. **Error Messages**: Don't expose sensitive data

### Never Do

1. **Never bypass RLS**: Even in admin code
2. **Never trust client**: Always validate server-side
3. **Never expose secrets**: No API keys in code
4. **Never skip owner check**: Always verify ownership

## References

- **Feature Docs**: `docs/garage/feature-documentation.md`
- **Database Docs**: `docs/garage/database-rationale.md`
- **API Functions**: `web/src/features/account/api.js`
- **Store**: `web/src/stores/garageStore.js`
- **Schema**: `supabase/sql/garage_schema.sql`

---

**End of Garage Feature Rules**

