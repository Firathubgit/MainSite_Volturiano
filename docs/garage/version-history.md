# Version History & Diff View - Feature Documentation

**Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Status:** Complete  
**Feature Owner:** Development Team

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Components](#components)
4. [API Functions](#api-functions)
5. [Diff Calculation](#diff-calculation)
6. [Usage Examples](#usage-examples)
7. [Performance Considerations](#performance-considerations)

---

## Overview

Version History & Diff View allows users to track changes to their garage item configurations over time. Users can view a timeline of all versions, see what changed between versions, and restore previous configurations.

**Enhanced with configurator-aware support**: The system now fully supports both 2D and 3D configurators, automatically detects configurator types, handles conversions between formats, and provides detailed diff visualization for configurator-specific changes.

### Key Features

- **Version Timeline**: Visual timeline showing all versions of a garage item
- **Diff Visualization**: Color-coded display of changes (added/removed/changed)
- **Configurator Type Tracking**: Automatic detection and display of configurator type (2D/3D/Hybrid)
- **Type Conversion Support**: Convert configurations between 2D and 3D formats
- **Price Delta**: Shows price changes between versions
- **Restore Functionality**: Restore any previous version (creates new version)
- **Snapshot View**: View full configuration snapshot for any version
- **Configurator-Specific Diffs**: Highlights configurator type changes and configurator-specific field changes

### User Value

- Track configuration evolution
- Understand what changed and when
- Restore previous configurations
- Compare versions side-by-side

---

## Architecture

### Data Flow

```
User clicks "View History"
    ↓
CarCard opens VersionHistory modal
    ↓
VersionHistory loads versions via garageStore.loadVersions()
    ↓
garageStore calls fetchGarageVersions API
    ↓
API fetches from garage_versions table
    ↓
Auto-migration runs on version snapshots (legacy → new format)
    ↓
Configurator types detected and displayed
    ↓
Versions displayed in timeline with type badges
    ↓
User clicks "Restore"
    ↓
RestoreVersionDialog shows confirmation with diff preview
    ↓
User confirms
    ↓
garageStore.restoreVersion() called
    ↓
API restores version and creates new version entry
    ↓
Configurator type normalized during restore
    ↓
Store updates item and invalidates version cache
```

### Configurator Type Detection

The system automatically detects configurator types when:
- Creating new garage items
- Updating existing items
- Loading versions from database
- Comparing versions for diff

Detection logic:
- **2D Indicators**: `manifestId`, `cameraAngle`, option IDs (e.g., "paint_blu_blue")
- **3D Indicators**: `materialSettings`, `environment`, hex colors in options
- **Hybrid**: Contains indicators from both 2D and 3D

### Component Hierarchy

```
CarCard
  └── VersionHistory (modal)
      ├── Version timeline items
      │   └── ConfigDiff (expanded view)
      └── RestoreVersionDialog (confirmation)
          └── ConfigDiff (preview)
```

---

## Components

### VersionHistory

**Location**: `web/src/features/garage/components/VersionHistory.jsx`

**Purpose**: Main component displaying version timeline

**Props**:
- `show` (boolean) - Whether to show the modal
- `itemId` (string) - Garage item ID
- `onClose` (function) - Callback when modal closes

**Features**:
- Vertical timeline layout
- Version number and date display
- Diff summary preview
- Expandable snapshot view
- Restore button (except for latest version)
- Loading and error states
- Empty state handling

**Usage**:
```jsx
<VersionHistory
  show={showHistory}
  itemId={item.id}
  onClose={() => setShowHistory(false)}
/>
```

### ConfigDiff

**Location**: `web/src/features/garage/components/ConfigDiff.jsx`

**Purpose**: Visualize differences between two configurations

**Props**:
- `oldConfig` (Object) - Old configuration payload
- `newConfig` (Object) - New configuration payload
- `diffSummary` (Array, optional) - Pre-calculated diff summary

**Features**:
- Color-coded diff display (green=added, red=removed, yellow=changed)
- Grouped by category (exterior, interior, performance, etc.)
- Price delta display
- Human-readable option labels

**Usage**:
```jsx
<ConfigDiff
  oldConfig={previousVersion.snapshot}
  newConfig={currentVersion.snapshot}
  diffSummary={version.diff_summary}
/>
```

### RestoreVersionDialog

**Location**: `web/src/features/garage/components/RestoreVersionDialog.jsx`

**Purpose**: Confirmation dialog for version restore

**Props**:
- `show` (boolean) - Whether to show dialog
- `version` (Object) - Version object to restore
- `currentConfig` (Object) - Current configuration payload
- `onConfirm` (function) - Callback when user confirms
- `onCancel` (function) - Callback when user cancels
- `loading` (boolean) - Loading state during restore

**Features**:
- Version details display
- Diff preview (expandable)
- Warning message
- Confirm/Cancel buttons
- Loading state

---

## API Functions

### fetchGarageVersions

**Location**: `web/src/features/account/api.js`

**Signature**:
```javascript
export async function fetchGarageVersions(itemId)
```

**Returns**: `{data: Array<Version>, error: Error|null}`

**Security**:
- Verifies user authentication
- Verifies item ownership via garage_items table
- Only returns versions for items owned by current user

**Example**:
```javascript
const { data: versions, error } = await fetchGarageVersions(itemId);
```

### restoreGarageVersion

**Location**: `web/src/features/account/api.js`

**Signature**:
```javascript
export async function restoreGarageVersion(itemId, versionNumber)
```

**Returns**: `{data: GarageItem, error: Error|null}`

**Behavior**:
1. Verifies user authentication and ownership
2. Fetches version snapshot
3. Calculates diff between current and restored config
4. Updates garage item with restored config
5. Creates new version entry with diff summary

**Security**:
- Explicit owner_id filtering
- Verifies item ownership before restore
- Verifies version exists and belongs to item

**Example**:
```javascript
const { data: restoredItem, error } = await restoreGarageVersion(itemId, 2);
```

### updateGarageItem (Enhanced)

**Location**: `web/src/features/account/api.js`

**Enhancement**: Automatically creates version snapshot when `config_payload` changes

**Behavior**:
1. Fetches current item config_payload
2. Compares with new config_payload
3. If changed:
   - Gets latest version number
   - Calculates diff using diffConfig utility
   - Creates new version entry in garage_versions
   - Stores diff_summary

**Note**: Version creation is non-blocking - update succeeds even if version creation fails

---

## Diff Calculation

### diffConfig Utility

**Location**: `web/src/features/garage/utils/diffConfig.js`

**Functions**:

1. **`diffConfig(oldConfig, newConfig)`**
   - Main diff calculation function
   - Returns array of diff entries
   - Format: `[{path: "options.exterior[0]", from: null, to: "paint_blu_blue", type: "added"}, ...]`

2. **`calculatePriceDelta(oldConfig, newConfig)`**
   - Calculates total price difference
   - Returns delta in cents (new - old)

3. **`getDiffSummary(diffSummary)`**
   - Generates human-readable summary
   - Returns string like "2 added, 1 removed, 3 changed"

4. **`configsAreEqual(config1, config2)`**
   - Checks if two configs are identical
   - Returns boolean

### Diff Entry Format

```javascript
{
  path: "options.exterior[0]",  // Path to changed field
  from: "paint_orange_fury",     // Old value (null if added)
  to: "paint_blu_blue",          // New value (null if removed)
  type: "changed"                // "added" | "removed" | "changed"
}
```

### Supported Paths

- `options.exterior[N]` - Exterior options array
- `options.interior[N]` - Interior options array
- `options.performance[N]` - Performance options array
- `vehicle.*` - Vehicle information fields
- `pricing.*` - Pricing fields
- `metadata.*` - Metadata fields

---

## Usage Examples

### Loading Version History

```javascript
import { useGarageStore } from '../../../stores/garageStore';

function MyComponent() {
  const loadVersions = useGarageStore((state) => state.loadVersions);
  
  const handleLoadVersions = async (itemId) => {
    const { data: versions, error } = await loadVersions(itemId);
    if (error) {
      console.error('Failed to load versions:', error);
    } else {
      console.log('Versions:', versions);
    }
  };
}
```

### Restoring a Version

```javascript
import { useGarageStore } from '../../../stores/garageStore';

function MyComponent() {
  const restoreVersion = useGarageStore((state) => state.restoreVersion);
  
  const handleRestore = async (itemId, versionNumber) => {
    const { data: restoredItem, error } = await restoreVersion(itemId, versionNumber);
    if (error) {
      console.error('Failed to restore:', error);
    } else {
      console.log('Restored item:', restoredItem);
    }
  };
}
```

### Calculating Diff Manually

```javascript
import { diffConfig, calculatePriceDelta } from '../utils/diffConfig';

const oldConfig = { /* ... */ };
const newConfig = { /* ... */ };

const diff = diffConfig(oldConfig, newConfig);
const priceDelta = calculatePriceDelta(oldConfig, newConfig);
```

---

## Performance Considerations

### Caching

- Version data is cached in `garageStore.versions` Map
- Cache key: `itemId`
- Cache invalidated on restore (reloads on next access)

### Loading Strategy

- Versions loaded on-demand when modal opens
- No preloading (reduces initial load time)
- Cache prevents redundant API calls

### Diff Calculation

- Diff calculation is synchronous but fast
- Handles configs with up to 100+ options efficiently
- Memoized in components where possible

### Database Queries

- `fetchGarageVersions`: Single query with ordering
- `restoreGarageVersion`: Multiple queries (item fetch, version fetch, update, version create)
- All queries use indexes (garage_item_id, version_number)

### Optimization Tips

1. **Limit Version Display**: Consider pagination if items have 50+ versions
2. **Lazy Load Snapshots**: Only load full snapshot when expanded
3. **Debounce Restore**: Prevent rapid restore clicks
4. **Cache Diff Summaries**: Store calculated summaries in version entries

---

## Database Schema

### garage_versions Table

```sql
create table garage_versions (
  id uuid primary key default gen_random_uuid(),
  garage_item_id uuid not null references garage_items(id) on delete cascade,
  version_number integer not null,
  diff_summary jsonb,           -- Array of diff entries
  snapshot jsonb not null,       -- Full configuration payload
  created_at timestamptz default now()
);

create unique index garage_versions_unique
  on garage_versions (garage_item_id, version_number);
```

### Version Creation

- Version 1 created automatically on `createGarageItem`
- Subsequent versions created when `config_payload` changes in `updateGarageItem`
- Restore creates new version (doesn't modify existing versions)

---

## Error Handling

### API Errors

- Network failures: Displayed to user with retry option
- Permission errors: Handled by RLS policies (user sees empty/error state)
- Invalid version: Error message shown, restore prevented

### Component Errors

- Missing itemId: Modal doesn't open
- Failed version load: Error state displayed
- Failed restore: Error alert shown, item not modified

---

## Accessibility

### Keyboard Navigation

- Tab navigation through version items
- Enter/Space to expand/collapse versions
- Escape to close modals
- Focus management on modal open/close

### Screen Readers

- ARIA labels on all interactive elements
- Role="dialog" on modals
- Descriptive text for diff changes
- Status announcements for loading/error states

---

## Configurator Integration

### Type Detection

Configurator types are automatically detected when:
- Saving configurations from configurator
- Loading existing garage items
- Comparing versions

Detection is based on:
- **2D**: Presence of `manifestId`, `cameraAngle`, option IDs
- **3D**: Presence of `materialSettings`, `environment`, hex colors
- **Hybrid**: Contains both 2D and 3D indicators

### Conversion Support

The system supports converting between configurator types:
- **2D → 3D**: Option IDs converted to hex colors, camera angles to 3D positions
- **3D → 2D**: Hex colors converted to option IDs, 3D positions to camera angles

Conversions are handled automatically during:
- Version restore
- Config updates
- Diff comparison

### Configurator-Specific Diff Display

Diff visualization includes:
- Configurator type badges (2D/3D)
- Type change indicators
- Conversion notes when types differ
- Configurator-specific field changes (camera angles, material settings, etc.)

## Future Enhancements

### Planned Features

1. **Version Comparison**: Side-by-side comparison view
2. **Bulk Restore**: Restore multiple items to same version
3. **Version Tags**: Tag important versions (e.g., "Production", "Testing")
4. **Export Version**: Export version snapshot as JSON
5. **Version Comments**: Add notes to versions
6. **Configurator Type Filter**: Filter versions by configurator type
7. **Conversion Preview**: Preview conversion before applying

### Performance Improvements

1. **Pagination**: For items with many versions
2. **Virtual Scrolling**: For long version lists
3. **Diff Compression**: Store only essential diff data
4. **Background Sync**: Preload versions in background
5. **Lazy Type Detection**: Detect types only when needed

---

## References

- **Feature Documentation**: `docs/garage/feature-documentation.md`
- **Database Schema**: `supabase/sql/garage_schema.sql`
- **API Functions**: `web/src/features/account/api.js`
- **Store**: `web/src/stores/garageStore.js`
- **Roadmap**: `docs/ULTIMATE_ROADMAP.md` (Phase 2.4)

---

**End of Version History Documentation**


