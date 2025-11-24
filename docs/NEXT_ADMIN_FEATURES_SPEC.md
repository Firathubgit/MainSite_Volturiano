# Next Admin Frontend Features - Detailed Implementation Specification

**Version:** 1.0  
**Created:** 2025-11-24  
**Priority:** Critical for Manifest Editor & Content Management  
**Estimated Time:** 6-8 weeks

---

## Overview

This document describes the next critical frontend features to be implemented in the Volturiano Admin system. The current admin system has a solid foundation (authentication, routing, basic dashboard, user management), but several key features are missing or incomplete. This specification focuses on the highest-priority frontend components needed to complete the admin system.

**Current Status:**
- ✅ Admin authentication & authorization (100%)
- ✅ Admin layout & navigation (100%)
- ✅ Dashboard overview (100%)
- ✅ User management (95%)
- ⚠️ Manifest Editor UI (60% - API complete, UI missing)
- ⚠️ Vehicle Options Management (0% - completely missing)
- ⚠️ UI Component Library (20% - only StatCard exists)
- ⚠️ Advanced Analytics (80% - basic features done)
- ⚠️ Settings UI (50% - basic page exists)

---

## Priority 1: Manifest Editor UI Components (CRITICAL)

### Context
The Manifest Editor is the core content creation tool for Volturiano. The backend API is complete, but the entire UI is missing. This is a complex, multi-panel editor similar to Figma or Adobe XD, but for vehicle configuration manifests.

### 1.1 Manifest Editor Main Component

**File:** `web/src/features/admin/components/ManifestEditor/ManifestEditor.jsx`  
**CSS:** `web/src/features/admin/components/ManifestEditor/ManifestEditor.module.css`

**Layout Structure:**
```
┌─────────────────────────────────────────────────────────┐
│ Toolbar: [Save] [Publish] [Preview] [Export JSON]      │
├──────────┬──────────────────────────┬──────────────────┤
│          │                          │                   │
│ Layer    │   Live Preview           │  Properties       │
│ Tree     │   (Composed Image)       │  Panel           │
│          │                          │                   │
│ (Left)   │   [Angle Selector]       │  [Layer Props]   │
│          │   [Zoom Controls]        │  [Variant Props]  │
│          │                          │                   │
├──────────┴──────────────────────────┴──────────────────┤
│ Variant Manager (Bottom Panel)                          │
│ [Variant List] [Add Variant] [Asset Mapping]          │
└─────────────────────────────────────────────────────────┘
```

**State Management:**
- `manifestData` - Full manifest JSON object
- `selectedLayerId` - Currently selected layer ID (null if none)
- `selectedVariantKey` - Currently selected variant key
- `currentAngle` - Current preview angle (e.g., "front", "side", "back")
- `isDirty` - Whether manifest has unsaved changes
- `autoSaveTimer` - Reference to auto-save timer
- `validationErrors` - Array of validation error objects

**Key Features:**
- **Auto-save draft:** Debounced save every 30 seconds, save on blur, show "Saving..." / "Saved" indicator
- **Real-time validation:** Validate JSON structure, required fields, circular dependencies on every change
- **Toolbar actions:**
  - Save button (manual save, shows loading state)
  - Publish button (opens PublishingWorkflow modal)
  - Preview button (opens preview in new tab)
  - Export JSON button (downloads current manifest as JSON file)
- **Panel resizing:** Draggable dividers between panels (use react-resizable-panels or similar)
- **Keyboard shortcuts:**
  - `Cmd/Ctrl + S` - Save
  - `Cmd/Ctrl + P` - Publish
  - `Escape` - Deselect layer
  - `Delete` - Delete selected layer/variant
- **Error handling:** Show validation errors in a dedicated error panel or inline

**Styling Requirements:**
- Dark theme matching Volturiano admin (#050505 background, #1a1a1a panels)
- Panel borders: #27272a
- Selected layer highlight: rgba(255, 69, 32, 0.1) with border
- Toolbar: Fixed at top, height 48px
- Panels: Resizable with min-width constraints
- Use CSS Modules, no Tailwind

**Dependencies:**
- `react-resizable-panels` or `react-split-pane` for panel resizing
- `react-beautiful-dnd` or `@dnd-kit/core` for drag-and-drop
- `use-debounce` for auto-save debouncing
- Existing manifest API functions from `admin/api/manifests.js`

---

### 1.2 Layer Tree Component

**File:** `web/src/features/admin/components/ManifestEditor/LayerTree.jsx`  
**CSS:** `web/src/features/admin/components/ManifestEditor/LayerTree.module.css`

**Visual Design:**
```
┌─ Layer Tree ─────────────────────┐
│ [+ Add Layer]                    │
│                                  │
│ ▼ Layer 1 (base)        [z: 0]   │
│   ▼ Layer 2 (paint)     [z: 1]  │
│     ▼ Layer 3 (decals)  [z: 2]  │
│   ▼ Layer 4 (wheels)     [z: 1]  │
│                                  │
│ [Selected: Layer 2]              │
└──────────────────────────────────┘
```

**Features:**
- **Hierarchical display:** Show layers in z-index order, indent based on dependencies
- **Layer item display:**
  - Layer ID (editable inline)
  - Layer type badge (e.g., "base", "paint", "decals")
  - Z-index number (editable)
  - Dependency indicators (small icons showing which layers depend on this)
  - Actions: [Edit] [Duplicate] [Delete]
- **Drag-and-drop reordering:**
  - Drag layer to reorder (updates z-index automatically)
  - Visual feedback during drag
  - Prevent invalid reorders (e.g., dragging dependent layer above dependency)
- **Layer selection:**
  - Click layer to select (highlights in orange)
  - Selected layer shows in Properties panel
  - Double-click to edit layer ID inline
- **Add/Remove layers:**
  - "+ Add Layer" button at top
  - Opens modal with layer type selector
  - Delete button shows confirmation modal
- **Visual indicators:**
  - Show dependency arrows/connectors
  - Highlight layers that depend on selected layer
  - Show warning icon if layer has circular dependency

**Interaction Details:**
- Right-click context menu: [Edit] [Duplicate] [Delete] [Add Dependency]
- Hover effects: Subtle background color change
- Selected state: Orange border-left (4px) + background highlight
- Loading state: Skeleton loader while fetching manifest

**Data Structure:**
Layers are stored in `manifestData.layers` array, each with:
- `id` - Unique identifier
- `type` - Layer type (string)
- `zIndex` - Rendering order
- `dependencies` - Array of layer IDs this depends on

---

### 1.3 Dependency Matrix Component

**File:** `web/src/features/admin/components/ManifestEditor/DependencyMatrix.jsx`  
**CSS:** `web/src/features/admin/components/ManifestEditor/DependencyMatrix.module.css`

**Visual Design:**
```
┌─ Dependency Matrix ─────────────────────────────┐
│        Layer1  Layer2  Layer3  Layer4           │
│ Layer1   -     ✓       ✗      ✗                │
│ Layer2   ✗      -      ✓      ✗                │
│ Layer3   ✗     ✗       -      ✗                │
│ Layer4   ✗     ✗       ✗      -                │
│                                                  │
│ ⚠️ Circular dependency detected: Layer1 → Layer2 → Layer1 │
└──────────────────────────────────────────────────┘
```

**Features:**
- **Matrix view:** Grid showing all layers vs all layers
- **Checkbox interface:** Click checkbox to add/remove dependency
- **Visual connections:** Draw lines between dependent layers (optional, advanced)
- **Circular dependency detection:**
  - Real-time check on every change
  - Highlight circular paths in red
  - Show warning message with path details
  - Disable checkbox if it would create a cycle
- **Dependency visualization:**
  - ✓ = Dependency exists
  - ✗ = No dependency
  - ⚠️ = Would create cycle (disabled)
- **Bulk operations:**
  - "Clear All" button
  - "Auto-detect" button (suggest dependencies based on layer types)

**Algorithm for Circular Detection:**
Use depth-first search (DFS) to detect cycles:
1. On checkbox change, check if adding this dependency creates a cycle
2. Traverse dependency graph starting from target layer
3. If we can reach source layer, cycle exists
4. Show error and prevent change

---

### 1.4 Variant Manager Component

**File:** `web/src/features/admin/components/ManifestEditor/VariantManager.jsx`  
**CSS:** `web/src/features/admin/components/ManifestEditor/VariantManager.module.css`

**Visual Design:**
```
┌─ Variant Manager ───────────────────────────────────────┐
│ [Search variants...] [+ Add Variant]                    │
│                                                          │
│ Category: Paint                                          │
│   • red_paint      [Edit] [Delete] [Default]             │
│   • blue_paint     [Edit] [Delete]                      │
│                                                          │
│ Category: Wheels                                         │
│   • alloy_18in     [Edit] [Delete]                      │
│   • steel_16in     [Edit] [Delete] [Default]            │
│                                                          │
│ Selected: red_paint                                      │
│ ┌─ Variant Details ─────────────────────────────────┐  │
│ │ Key: red_paint                                        │  │
│ │ Label: Classic Red                                   │  │
│ │ Category: paint                                       │  │
│ │ Dependencies: [base_layer]                            │  │
│ │ Incompatibilities: [blue_paint]                      │  │
│ │ Default: ✓                                           │  │
│ │                                                       │  │
│ │ Asset URLs:                                           │  │
│ │   front: [Upload] [Preview] [Remove]                  │  │
│ │   side:  [Upload] [Preview] [Remove]                  │  │
│ │   back:  [Upload] [Preview] [Remove]                  │  │
│ └───────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

**Features:**
- **Variant list:**
  - Group by category (collapsible sections)
  - Search/filter variants
  - Show variant key, label, and default indicator
  - Actions: [Edit] [Delete] [Set Default]
- **Variant form (inline or modal):**
  - Key input (read-only if editing, must be unique)
  - Label input (human-readable name)
  - Category select dropdown
  - Dependencies multi-select (other variants this depends on)
  - Incompatibilities multi-select (variants that can't be selected together)
  - Default checkbox (only one default per category)
- **Asset URL mapping:**
  - List of angles (front, side, back, etc.)
  - For each angle: URL input + Upload button + Preview + Remove
  - Upload to Supabase Storage bucket `vehicle-assets`
  - Show upload progress bar
  - Preview opens image in modal/lightbox
- **Asset preview:**
  - Thumbnail grid showing all angles for selected variant
  - Click to view full-size
  - Show "Missing" placeholder if URL not set

**Data Structure:**
Variants stored in `manifestData.variants` object:
```json
{
  "red_paint": {
    "key": "red_paint",
    "label": "Classic Red",
    "category": "paint",
    "dependencies": ["base_layer"],
    "incompatibilities": ["blue_paint"],
    "default": true,
    "assets": {
      "front": "https://cdn.../red_front.png",
      "side": "https://cdn.../red_side.png",
      "back": "https://cdn.../red_back.png"
    }
  }
}
```

---

### 1.5 Live Preview Component

**File:** `web/src/features/admin/components/ManifestEditor/LivePreview.jsx`  
**CSS:** `web/src/features/admin/components/ManifestEditor/LivePreview.module.css`

**Visual Design:**
```
┌─ Live Preview ─────────────────────────────┐
│ [front ▼] [side] [back]  [🔍+] [🔍-] [↺] │
│                                            │
│        ┌────────────────────┐             │
│        │                    │             │
│        │  Composed Image    │             │
│        │  (All layers)     │             │
│        │                    │             │
│        └────────────────────┘             │
│                                            │
│ Variant Selector:                         │
│   Paint: [red_paint ▼]                    │
│   Wheels: [alloy_18in ▼]                  │
└────────────────────────────────────────────┘
```

**Features:**
- **Composed image rendering:**
  - Load all layer images for selected angle
  - Compose in z-index order (lowest first, highest on top)
  - Use HTML5 Canvas or CSS stacking
  - Show loading state while images load
  - Cache loaded images
- **Angle selector:**
  - Dropdown or tab buttons
  - Switch between angles (front, side, back, top, etc.)
  - Update preview immediately
- **Variant selection:**
  - Dropdown per layer showing available variants
  - Update preview on change (reload composed image)
  - Show "No variant selected" placeholder if missing
- **Zoom/pan controls:**
  - Zoom in/out buttons (+/-)
  - Mouse wheel zoom
  - Pan with mouse drag (when zoomed)
  - Reset view button (1:1 scale, centered)
  - Show zoom level indicator (e.g., "150%")
- **Export preview:**
  - "Export Image" button
  - Downloads composed image as PNG
  - Use canvas.toDataURL() or similar

**Performance Optimizations:**
- Lazy load images (only load visible angle)
- Cache composed images per variant combination
- Use image sprites or WebP format if possible
- Debounce variant selector changes (wait 300ms before recomposing)

**Canvas Composition Algorithm:**
```javascript
1. Create canvas element
2. For each layer in z-index order:
   a. Get variant asset URL for current angle
   b. Load image
   c. Draw image on canvas
3. Display canvas
```

---

### 1.6 Publishing Workflow Component

**File:** `web/src/features/admin/components/ManifestEditor/PublishWorkflow.jsx`  
**CSS:** `web/src/features/admin/components/ManifestEditor/PublishWorkflow.module.css`

**Visual Design:**
```
┌─ Publish Manifest ─────────────────────────────┐
│                                                │
│ Step 1: Validation                            │
│ ✓ Required fields present                     │
│ ✓ All asset URLs accessible                  │
│ ⚠️ Warning: Layer 3 has no variants           │
│ ✓ No circular dependencies                   │
│ ✓ JSON structure valid                       │
│                                                │
│ Step 2: Version                               │
│ Current version: 1.2.0                        │
│ New version: 1.3.0                           │
│ [Override version]                            │
│                                                │
│ Step 3: Archive Old Version                  │
│ Current published: v1.2.0 (2025-11-20)      │
│ ☑ Archive old version automatically          │
│                                                │
│ [Cancel]              [Publish Manifest]      │
└────────────────────────────────────────────────┘
```

**Features:**
- **Multi-step workflow:**
  - Step 1: Validation (auto-run, show results)
  - Step 2: Version increment (auto-suggest, allow override)
  - Step 3: Archive confirmation (show current published version)
- **Validation checks:**
  - Required fields (slug, vehicle_model, layers, variants)
  - Asset URL accessibility (API call to verify URLs exist)
  - Circular dependency check
  - JSON structure validation
  - Show errors/warnings with details
- **Version management:**
  - Auto-increment: patch (1.2.0 → 1.2.1), minor (1.2.0 → 1.3.0), or major
  - Manual override input
  - Show version history (optional)
- **Archive old version:**
  - Show current published version details
  - Checkbox to archive automatically
  - Show what will happen to old version
- **Publish action:**
  - Call `publishManifest()` API
  - Show loading state
  - Success: Show success message, close modal, refresh manifest list
  - Error: Show error message, allow retry

**Validation API Integration:**
Use existing `validateManifest()` function from `admin/api/manifests.js`, which returns:
```javascript
{
  valid: boolean,
  errors: Array<{ field: string, message: string }>,
  warnings: Array<{ field: string, message: string }>
}
```

---

## Priority 2: UI Component Library

### Context
Currently only `StatCard` exists. We need a complete set of reusable admin components to maintain consistency and speed up development.

### 2.1 AdminTable Component

**File:** `web/src/features/admin/components/ui/AdminTable.jsx`  
**CSS:** `web/src/features/admin/components/ui/AdminTable.module.css`

**Props:**
```javascript
{
  columns: Array<{
    key: string,
    label: string,
    sortable?: boolean,
    render?: (value, row) => ReactNode
  }>,
  data: Array<Object>,
  onSort?: (columnKey, direction) => void,
  onFilter?: (filters) => void,
  pagination?: {
    currentPage: number,
    totalPages: number,
    onPageChange: (page) => void
  },
  selectable?: boolean,
  onSelectionChange?: (selectedRows) => void,
  loading?: boolean,
  emptyMessage?: string
}
```

**Features:**
- Sortable columns (click header to sort, show arrow indicator)
- Row selection (checkbox column if `selectable={true}`)
- Loading state (skeleton rows)
- Empty state (customizable message)
- Responsive (horizontal scroll on mobile)
- Hover effects on rows
- Sticky header (optional prop)

**Styling:**
- Dark theme (#1a1a1a background, #27272a borders)
- Row hover: #27272a background
- Selected row: rgba(255, 69, 32, 0.1) background
- Sort indicator: Orange arrow (↑↓)

---

### 2.2 AdminModal Component

**File:** `web/src/features/admin/components/ui/AdminModal.jsx`  
**CSS:** `web/src/features/admin/components/ui/AdminModal.module.css`

**Props:**
```javascript
{
  open: boolean,
  onClose: () => void,
  title: string,
  children: ReactNode,
  footer?: ReactNode,
  size?: 'sm' | 'md' | 'lg' | 'xl',
  closeOnOverlayClick?: boolean
}
```

**Features:**
- Overlay backdrop (dark, semi-transparent)
- Centered modal (max-width based on size prop)
- Close button (X in top-right)
- Escape key to close
- Click outside to close (if `closeOnOverlayClick={true}`)
- Smooth open/close animations
- Focus trap (keep focus inside modal)
- Scrollable content area

**Sizes:**
- `sm`: 400px max-width
- `md`: 600px max-width
- `lg`: 800px max-width
- `xl`: 1200px max-width

---

### 2.3 AdminInput Component

**File:** `web/src/features/admin/components/ui/AdminInput.jsx`  
**CSS:** `web/src/features/admin/components/ui/AdminInput.module.css`

**Props:**
```javascript
{
  label: string,
  value: string,
  onChange: (value) => void,
  type?: 'text' | 'email' | 'password' | 'number',
  error?: string,
  helperText?: string,
  required?: boolean,
  disabled?: boolean,
  placeholder?: string,
  icon?: ReactNode
}
```

**Features:**
- Label above input
- Required indicator (*)
- Error state (red border, error message below)
- Helper text (gray text below input)
- Icon support (left side)
- Disabled state (grayed out, not interactive)

**Styling:**
- Input: #1a1a1a background, #27272a border, white text
- Focus: Orange border (#ff4520)
- Error: Red border (#ef4444)
- Disabled: #27272a background, #71717a text

---

### 2.4 AdminSelect Component

**File:** `web/src/features/admin/components/ui/AdminSelect.jsx`  
**CSS:** `web/src/features/admin/components/ui/AdminSelect.module.css`

**Props:**
```javascript
{
  label: string,
  value: string | Array<string>,
  onChange: (value) => void,
  options: Array<{ value: string, label: string }>,
  placeholder?: string,
  multiple?: boolean,
  searchable?: boolean,
  error?: string,
  required?: boolean,
  disabled?: boolean
}
```

**Features:**
- Single or multi-select
- Searchable dropdown (filter options as you type)
- Custom dropdown (not native select, for better styling)
- Selected value display (chips for multi-select)
- Keyboard navigation (arrow keys, enter to select)
- Clear button (X icon)

**Styling:**
- Match AdminInput styling
- Dropdown: #1a1a1a background, #27272a border
- Option hover: #27272a background
- Selected option: Orange highlight

---

### 2.5 AdminButton Component

**File:** `web/src/features/admin/components/ui/AdminButton.jsx`  
**CSS:** `web/src/features/admin/components/ui/AdminButton.module.css`

**Props:**
```javascript
{
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost',
  size?: 'sm' | 'md' | 'lg',
  loading?: boolean,
  disabled?: boolean,
  icon?: ReactNode,
  children: ReactNode,
  onClick: () => void
}
```

**Variants:**
- `primary`: White background, black text, orange hover
- `secondary`: Transparent, white border, white text
- `danger`: Red background (#ef4444), white text
- `ghost`: Transparent, no border, gray text

**Sizes:**
- `sm`: 32px height, 0.75rem padding
- `md`: 40px height, 1rem padding
- `lg`: 48px height, 1.25rem padding

**Features:**
- Loading state (spinner replaces text)
- Icon support (left side)
- Disabled state
- Hover/active states

---

### 2.6 Additional Components Needed

- **AdminPagination:** Page numbers, prev/next buttons, page size selector
- **AdminSearch:** Search input with icon, debounced onChange, clear button
- **AdminBadge:** Status badges (success, warning, error, info variants)
- **AdminLoading:** Spinner component (full-screen overlay option)
- **AdminCard:** Container component with header, body, footer sections

---

## Priority 3: Vehicle Options Management

### Context
Vehicle management exists, but Options management is completely missing. This is needed for content admins to manage vehicle configuration options.

### 3.1 Option List Page

**File:** `web/src/pages/Admin/Content/Options/OptionList.jsx`  
**CSS:** `web/src/pages/Admin/Content/Options/OptionList.module.css`

**Features:**
- Vehicle selector dropdown (filter by vehicle)
- Table with columns:
  - Category
  - Code
  - Label
  - Price (formatted)
  - Configurator Visible (badge)
  - Actions ([Edit] [Delete])
- Search by code or label
- Filter by category
- Sort by any column
- Pagination (50 per page)
- "Create Option" button

**Data Source:**
Use `getOptions(filters)` from `admin/api/content.js`

---

### 3.2 Option Detail/Edit Page

**File:** `web/src/pages/Admin/Content/Options/OptionDetail.jsx`  
**CSS:** `web/src/pages/Admin/Content/Options/OptionDetail.module.css`

**Form Fields:**
- Vehicle selector (read-only if editing)
- Category input (text)
- Code input (read-only if editing, must be unique per vehicle)
- Label input (text)
- Description textarea
- Price input (number, in cents)
- Currency select (EUR, USD, etc.)
- Media URL input (with preview)
- Configurator visibility checkbox
- Configurator group input (text)
- Configurator order input (number)

**Dependencies Section:**
- List current dependencies
- "Add Dependency" button (opens modal to select other options)
- Remove dependency button per item

**Actions:**
- Save button
- Cancel button (navigate back)
- Delete button (with confirmation modal)

---

## Priority 4: Advanced Analytics Features

### 4.1 User Activity Reports

**File:** `web/src/pages/Admin/Analytics/UserActivity.jsx`

**Features:**
- User activity timeline (timeline view showing actions over time)
- Filter by user (dropdown)
- Filter by action type (dropdown)
- Date range selector
- Most active users section (top 10 list with activity counts)
- Sign-up trends chart (line chart, group by day/week/month)
- Login frequency metrics (average logins per user)
- Feature usage statistics (configurator, garage, sharing usage)

**Charts Needed:**
- Line chart for sign-up trends (use recharts)
- Bar chart for most active users
- Pie chart for feature usage

---

### 4.2 Enhanced Audit Log Viewer

**Current:** Basic table exists  
**Enhancements Needed:**
- Detailed action view (click row to expand, show full JSON details)
- IP address and user agent display
- Export filtered results to CSV/JSON
- Better filtering UI (date range picker, multi-select dropdowns)
- Real-time updates (poll every 30 seconds or use Supabase realtime)

---

## Priority 5: Settings UI Improvements

### 5.1 System Settings Form

**Current:** Basic page exists  
**Enhancements Needed:**
- General settings section:
  - Site name input
  - Logo URL input with preview
  - Default locale select
  - Maintenance mode toggle
- Email settings section:
  - SMTP configuration form
  - Test email button
- Storage settings section:
  - CDN base URL input
  - Storage bucket configuration (read-only display)
- Feature flags section:
  - Toggle switches for each feature
  - Feature descriptions
- Save functionality (API integration)

---

### 5.2 Role Management Page (Super Admin Only)

**File:** `web/src/pages/Admin/Settings/RoleManagement.jsx`

**Features:**
- Role list view (show all roles with permissions summary)
- Permission editor:
  - Select role
  - Show permissions grid (resource × action matrix)
  - Toggle permissions (checkboxes)
  - Save button
- Assign roles to users:
  - User selector dropdown
  - Role selector dropdown
  - Assign button

**Access Control:**
- Wrap with `<RequireAdmin requiredRole="super_admin" />`

---

## Technical Requirements

### Styling Guidelines
- **Color Scheme:**
  - Background: #050505 (sidebar), #1a1a1a (panels)
  - Borders: #27272a
  - Text: #ffffff (primary), #a1a1aa (secondary), #71717a (tertiary)
  - Accent: #ff4520 (orange)
  - Success: #10b981 (green)
  - Error: #ef4444 (red)
  - Warning: #eab308 (yellow)

- **Typography:**
  - Font: Inter (already in project)
  - Headings: 700 weight
  - Body: 400-500 weight
  - Monospace: For code/IDs (use 'Courier New' or 'Monaco')

- **Spacing:**
  - Use consistent spacing scale (0.25rem, 0.5rem, 0.75rem, 1rem, 1.5rem, 2rem)
  - Component padding: 1rem-1.5rem
  - Section gaps: 2rem

- **CSS Modules:**
  - All components use CSS Modules (`.module.css`)
  - No Tailwind classes
  - BEM naming convention optional but recommended

### Dependencies to Add
```json
{
  "react-resizable-panels": "^2.0.0",
  "@dnd-kit/core": "^6.0.0",
  "@dnd-kit/sortable": "^7.0.0",
  "use-debounce": "^10.0.0",
  "react-hook-form": "^7.0.0" // For form management
}
```

### Performance Considerations
- Lazy load images in preview
- Debounce search inputs (300ms)
- Virtualize long lists (react-window)
- Memoize expensive computations
- Cache API responses where appropriate

### Accessibility
- Keyboard navigation support
- ARIA labels on interactive elements
- Focus indicators (orange outline)
- Screen reader friendly
- Proper heading hierarchy

---

## Implementation Order

1. **Week 1-2:** UI Component Library (AdminTable, AdminModal, AdminInput, AdminSelect, AdminButton)
2. **Week 3-4:** Manifest Editor Main Component + Layer Tree
3. **Week 5:** Dependency Matrix + Variant Manager
4. **Week 6:** Live Preview + Publishing Workflow
5. **Week 7:** Options Management Pages
6. **Week 8:** Advanced Analytics + Settings Improvements

---

## Testing Requirements

Each component should have:
- Unit tests for core functionality
- Integration tests for user flows
- Visual regression tests (optional but recommended)
- Accessibility tests (keyboard navigation, screen readers)

---

## Notes for Developer

- All API functions already exist in `web/src/features/admin/api/`
- Use existing `AdminLayout` wrapper for all pages
- Follow existing code patterns (CSS Modules, functional components, hooks)
- Match the Volturiano admin design aesthetic (minimalist, aggressive, dark)
- Ensure mobile responsiveness (sidebar collapses, tables scroll horizontally)
- All components should handle loading and error states gracefully

---

**End of Specification**

