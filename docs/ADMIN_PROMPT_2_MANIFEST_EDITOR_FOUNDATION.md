# Admin Frontend Implementation - Prompt 2: Manifest Editor Foundation


---

## Objective

Build the foundation of the Manifest Editor - the main component structure and Layer Tree. This is a complex multi-panel editor for creating vehicle configuration manifests. The backend API is already complete, so focus on the UI/UX.

---

## 1. Manifest Editor Main Component

**File:** `web/src/features/admin/components/ManifestEditor/ManifestEditor.jsx`  
**CSS:** `web/src/features/admin/components/ManifestEditor/ManifestEditor.module.css`

### Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│ Toolbar: [Save] [Publish] [Preview] [Export JSON]       │
│ Status: [● Saving...] or [✓ Saved]                      │
├──────────┬──────────────────────────┬──────────────────┤
│          │                          │                   │
│ Layer    │   Live Preview          │  Properties       │
│ Tree     │   (Composed Image)      │  Panel           │
│          │                          │                   │
│ (Left)   │   [Angle Selector]      │  [Layer Props]   │
│          │   [Zoom Controls]        │  [Variant Props]  │
│          │                          │                   │
├──────────┴──────────────────────────┴──────────────────┤
│ Variant Manager (Bottom Panel)                          │
│ [Variant List] [Add Variant] [Asset Mapping]          │
└─────────────────────────────────────────────────────────┘
```

### State Management

Use React hooks to manage:
- `manifestData` - Full manifest JSON object (from API)
- `selectedLayerId` - Currently selected layer ID (null if none)
- `selectedVariantKey` - Currently selected variant key
- `currentAngle` - Current preview angle ("front", "side", "back", etc.)
- `isDirty` - Whether manifest has unsaved changes
- `autoSaveTimer` - Reference to auto-save timer
- `validationErrors` - Array of validation error objects
- `isSaving` - Loading state for save operation

### Key Features

**Auto-save Draft:**
- Debounced save every 30 seconds (use `use-debounce` hook)
- Save on blur (when user navigates away)
- Show save indicator: "Saving..." (spinner) → "Saved" (checkmark) → disappears after 2s
- Use `updateManifest(manifestId, updates)` API function

**Real-time Validation:**
- Validate JSON structure on every change
- Check required fields (slug, vehicle_model, layers, variants)
- Check for circular dependencies (call validation API)
- Show validation errors in dedicated panel or inline
- Use `validateManifest(manifestData)` API function

**Toolbar Actions:**
- **Save button:** Manual save, shows loading state, calls `updateManifest()`
- **Publish button:** Opens PublishingWorkflow modal (will be built in Prompt 4)
- **Preview button:** Opens preview in new tab/window (use manifest preview URL)
- **Export JSON button:** Downloads current manifest as JSON file

**Panel Resizing:**
- Use `react-resizable-panels` or similar library
- Draggable dividers between panels
- Min-width constraints (sidebar: 200px, preview: 400px, properties: 300px)
- Save panel sizes to localStorage

**Keyboard Shortcuts:**
- `Cmd/Ctrl + S` - Save
- `Cmd/Ctrl + P` - Publish (opens modal)
- `Escape` - Deselect layer
- `Delete` - Delete selected layer/variant (with confirmation)

**Error Handling:**
- Show validation errors in error panel (top of editor or bottom)
- Network errors: Show toast/notification
- API errors: Display in error panel with retry button

### Props Interface

```javascript
{
  manifestId: string,                 // ID of manifest being edited
  onClose?: () => void                // Optional close handler
}
```

### API Integration

Use existing functions from `web/src/features/admin/api/manifests.js`:
- `getManifestById(manifestId)` - Load manifest on mount
- `updateManifest(manifestId, updates)` - Save changes
- `validateManifest(manifestData)` - Validate structure

---

## 2. Layer Tree Component

**File:** `web/src/features/admin/components/ManifestEditor/LayerTree.jsx`  
**CSS:** `web/src/features/admin/components/ManifestEditor/LayerTree.module.css`

### Visual Design

```
┌─ Layer Tree ─────────────────────┐
│ [+ Add Layer]                    │
│                                  │
│ ▼ Layer 1 (base)        [z: 0]  │
│   ▼ Layer 2 (paint)     [z: 1]  │
│     ▼ Layer 3 (decals)  [z: 2]  │
│   ▼ Layer 4 (wheels)     [z: 1]  │
│                                  │
│ [Selected: Layer 2]              │
└──────────────────────────────────┘
```

### Features

**Hierarchical Display:**
- Show layers in z-index order (lowest first)
- Indent based on dependencies (child layers indented under parents)
- Show layer ID (editable inline on double-click)
- Show layer type badge (e.g., "base", "paint", "decals")
- Show z-index number (editable inline)

**Drag-and-Drop Reordering:**
- Use `@dnd-kit/core` or `react-beautiful-dnd`
- Drag layer to reorder (automatically updates z-index)
- Visual feedback during drag (ghost/preview)
- Prevent invalid reorders (e.g., dragging dependent layer above dependency)
- Update manifest data on drop

**Layer Selection:**
- Click layer to select (highlights in orange)
- Selected layer shows in Properties panel (will be built in Prompt 3)
- Double-click to edit layer ID inline
- Show "Selected: [Layer ID]" indicator at bottom

**Layer Actions:**
- **Add Layer button:** Opens modal with layer type selector
  - Types: "base", "paint", "decals", "wheels", "accessories", etc.
  - Creates new layer with auto-generated ID
  - Adds to manifest.layers array
- **Edit button:** Opens layer edit modal (or inline edit)
- **Duplicate button:** Creates copy of layer with new ID
- **Delete button:** Shows confirmation modal, removes from manifest

**Visual Indicators:**
- Dependency arrows/connectors (show which layers depend on this)
- Highlight layers that depend on selected layer
- Warning icon if layer has circular dependency
- Expand/collapse arrows for layers with children

**Right-Click Context Menu:**
- [Edit Layer]
- [Duplicate Layer]
- [Delete Layer]
- [Add Dependency]
- [View Dependencies]

### Data Structure

Layers stored in `manifestData.layers` array:
```javascript
{
  id: "layer_1",
  type: "base",
  zIndex: 0,
  dependencies: [],  // Array of layer IDs this depends on
  // ... other layer properties
}
```

### Interaction Details

- **Hover effects:** Subtle background color change
- **Selected state:** Orange border-left (4px) + background highlight
- **Loading state:** Skeleton loader while fetching manifest
- **Empty state:** "No layers yet. Click 'Add Layer' to get started."

---

## 3. Properties Panel (Basic)

**File:** `web/src/features/admin/components/ManifestEditor/PropertiesPanel.jsx`  
**CSS:** `web/src/features/admin/components/ManifestEditor/PropertiesPanel.module.css`

### Basic Implementation

For now, create a simple properties panel that shows:
- **When layer selected:**
  - Layer ID (editable)
  - Layer type (dropdown)
  - Z-index (number input)
  - Dependencies list (will be enhanced in Prompt 3)

- **When variant selected:**
  - Variant key (read-only)
  - Variant label (editable)
  - Category (dropdown)

- **When nothing selected:**
  - "Select a layer or variant to edit properties"

This will be fully implemented in Prompt 3 with the Variant Manager.

---

## Implementation Notes

- **Panel Resizing:** Use `react-resizable-panels` - it's the most modern solution
- **State Management:** Consider using Zustand or Context API for shared state between components
- **Auto-save:** Use `useDebounce` hook from `use-debounce` package
- **Keyboard Shortcuts:** Use `react-hotkeys-hook` or similar
- **Error Boundaries:** Wrap editor in error boundary to catch crashes

---

## Deliverables

1. ManifestEditor main component with 4-panel layout
2. Layer Tree component with drag-and-drop
3. Basic Properties Panel (placeholder for now)
4. Toolbar with Save, Publish, Preview, Export actions
5. Auto-save functionality working
6. Keyboard shortcuts implemented
7. Panel resizing working
8. Integration with manifest API functions

---

## Next Steps

After completing this prompt, proceed to **Prompt 3: Dependency Matrix & Variant Manager** which will complete the editor's core functionality.

