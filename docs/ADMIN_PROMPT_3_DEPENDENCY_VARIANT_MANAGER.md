# Admin Frontend Implementation - Prompt 3: Dependency Matrix & Variant Manager


---

## Objective

Complete the Manifest Editor's core functionality by building the Dependency Matrix (for managing layer dependencies) and Variant Manager (for managing configuration variants and assets). These are the most complex parts of the editor.

---

## 1. Dependency Matrix Component

**File:** `web/src/features/admin/components/ManifestEditor/DependencyMatrix.jsx`  
**CSS:** `web/src/features/admin/components/ManifestEditor/DependencyMatrix.module.css`

### Visual Design

```
┌─ Dependency Matrix ─────────────────────────────┐
│        Layer1  Layer2  Layer3  Layer4           │
│ Layer1   -     ✓       ✗      ✗                │
│ Layer2   ✗      -      ✓      ✗                │
│ Layer3   ✗     ✗       -      ✗                │
│ Layer4   ✗     ✗       ✗      -                │
│                                                  │
│ ⚠️ Circular dependency detected:                │
│    Layer1 → Layer2 → Layer1                    │
│                                                  │
│ [Clear All] [Auto-detect Dependencies]         │
└──────────────────────────────────────────────────┘
```

### Features

**Matrix View:**
- Grid showing all layers (rows) vs all layers (columns)
- Checkbox at each intersection (layer X depends on layer Y)
- Diagonal cells disabled (layer can't depend on itself)
- Visual indicators:
  - ✓ = Dependency exists (checked)
  - ✗ = No dependency (unchecked)
  - ⚠️ = Would create cycle (disabled, red highlight)

**Dependency Management:**
- Click checkbox to add/remove dependency
- Real-time update of manifest data
- Visual feedback on change (highlight affected cells)

**Circular Dependency Detection:**
- Check for cycles on every checkbox change
- Use depth-first search (DFS) algorithm:
  1. On checkbox change, check if adding this dependency creates a cycle
  2. Traverse dependency graph starting from target layer
  3. If we can reach source layer, cycle exists
  4. Show error and prevent change

**Visual Warnings:**
- Highlight circular paths in red
- Show warning message with path details (e.g., "Layer1 → Layer2 → Layer1")
- Disable checkbox if it would create a cycle
- Show all detected cycles, not just the first one

**Bulk Operations:**
- **Clear All button:** Removes all dependencies (with confirmation)
- **Auto-detect button:** Suggests dependencies based on layer types
  - Example: "paint" layers typically depend on "base" layers
  - Show suggestions in a modal for user to approve

**Alternative View (Optional):**
- Toggle between matrix view and graph view
- Graph view shows layers as nodes with arrows for dependencies
- Use a library like `react-flow` or `vis-network` for graph visualization

### Algorithm for Circular Detection

```javascript
function hasCycle(layers, fromLayerId, toLayerId) {
  // Check if adding dependency fromLayerId → toLayerId creates a cycle
  const visited = new Set();
  
  function dfs(layerId) {
    if (visited.has(layerId)) return false;
    if (layerId === fromLayerId) return true; // Found cycle!
    
    visited.add(layerId);
    const layer = layers.find(l => l.id === layerId);
    
    for (const depId of layer.dependencies) {
      if (dfs(depId)) return true;
    }
    
    return false;
  }
  
  const targetLayer = layers.find(l => l.id === toLayerId);
  for (const depId of targetLayer.dependencies) {
    if (dfs(depId)) return true;
  }
  
  return false;
}
```

### Integration

- Update `manifestData.layers[].dependencies` array on checkbox change
- Trigger validation after each change
- Show validation errors in main editor's error panel

---

## 2. Variant Manager Component

**File:** `web/src/features/admin/components/ManifestEditor/VariantManager.jsx`  
**CSS:** `web/src/features/admin/components/ManifestEditor/VariantManager.module.css`

### Visual Design

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
│ │ Dependencies: [base_layer] [Remove]                  │  │
│ │ Incompatibilities: [blue_paint] [Remove]            │  │
│ │ Default: ☑                                           │  │
│ │                                                       │  │
│ │ Asset URLs:                                           │  │
│ │   front: [Upload] [Preview] [Remove]                 │  │
│ │   side:  [Upload] [Preview] [Remove]                  │  │
│ │   back:  [Upload] [Preview] [Remove]                  │  │
│ └───────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### Features

**Variant List:**
- Group variants by category (collapsible sections)
- Search/filter variants (by key or label)
- Show variant key, label, and default indicator (★ icon)
- Actions per variant: [Edit] [Delete] [Set Default]
- Click variant to select (shows details in panel)

**Variant Form (Inline or Modal):**
- **Key input:** Read-only if editing (must be unique per manifest)
- **Label input:** Human-readable name (e.g., "Classic Red")
- **Category select:** Dropdown (paint, wheels, accessories, etc.)
- **Dependencies multi-select:** Other variants this depends on
  - Use AdminSelect component with `multiple={true}`
  - Show selected dependencies as chips
- **Incompatibilities multi-select:** Variants that can't be selected together
  - Example: red_paint incompatible with blue_paint
- **Default checkbox:** Only one default per category
  - Unchecking one automatically checks another if needed

**Asset URL Mapping:**
- List of angles (front, side, back, top, etc.)
- For each angle:
  - URL input field (text)
  - Upload button (opens file picker)
  - Preview button (opens image in modal/lightbox)
  - Remove button (clears URL)
- Upload to Supabase Storage bucket `vehicle-assets`
- Show upload progress bar during upload
- Update URL input after successful upload

**Asset Upload Functionality:**
- Use `uploadImage(file, bucket)` from `admin/api/content.js`
- Accept image files (PNG, JPG, WebP)
- Validate file size (max 10MB)
- Show upload progress (percentage)
- Handle upload errors gracefully
- Update variant asset URL after upload

**Asset Preview:**
- Thumbnail grid showing all angles for selected variant
- Click thumbnail to view full-size in modal
- Show "Missing" placeholder if URL not set
- Lazy load images (only load visible thumbnails)

**Variant Actions:**
- **Add Variant:** Opens modal with form, creates new variant
- **Edit Variant:** Opens modal or inline edit
- **Delete Variant:** Shows confirmation modal, removes from manifest
- **Set Default:** Sets this variant as default for its category

### Data Structure

Variants stored in `manifestData.variants` object:
```javascript
{
  "red_paint": {
    "key": "red_paint",
    "label": "Classic Red",
    "category": "paint",
    "dependencies": ["base_layer"],
    "incompatibilities": ["blue_paint"],
    "default": true,
    "assets": {
      "front": "https://cdn.volturiano.com/vehicles/red_front.png",
      "side": "https://cdn.volturiano.com/vehicles/red_side.png",
      "back": "https://cdn.volturiano.com/vehicles/red_back.png"
    }
  }
}
```

### Integration with Properties Panel

- When variant selected in Variant Manager, show details in Properties Panel
- When variant edited in Properties Panel, update Variant Manager
- Sync state between components (use shared state/context)

---

## 3. Enhanced Properties Panel

**File:** `web/src/features/admin/components/ManifestEditor/PropertiesPanel.jsx`  
**CSS:** `web/src/features/admin/components/ManifestEditor/PropertiesPanel.module.css`

### Complete Implementation

**When Layer Selected:**
- Layer ID (editable text input)
- Layer type (AdminSelect dropdown)
- Z-index (number input, min: 0)
- Dependencies list:
  - Show list of dependent layer IDs
  - [Add Dependency] button (opens Dependency Matrix or modal)
  - [Remove] button per dependency

**When Variant Selected:**
- Variant key (read-only, shows in header)
- Variant label (editable text input)
- Category (AdminSelect dropdown)
- Dependencies (multi-select, shows chips)
- Incompatibilities (multi-select, shows chips)
- Default checkbox
- Asset URLs section:
  - List all angles with URL inputs
  - Upload buttons per angle
  - Preview buttons

**When Nothing Selected:**
- Show message: "Select a layer or variant to edit properties"
- Optional: Show manifest-level properties (slug, vehicle_model, version)

---

## Implementation Notes

- **State Management:** Use Context API or Zustand to share state between Variant Manager and Properties Panel
- **File Upload:** Use Supabase Storage client for uploads, show progress with progress bar component
- **Image Preview:** Use `<img>` tags with lazy loading, modal for full-size preview
- **Validation:** Validate variant keys are unique, categories are valid, etc.
- **Performance:** Virtualize long variant lists if needed (react-window)

---

## Deliverables

1. Dependency Matrix component with circular dependency detection
2. Variant Manager component with full CRUD operations
3. Asset upload functionality integrated
4. Enhanced Properties Panel
5. State synchronization between components
6. Validation and error handling

---

## Next Steps

After completing this prompt, proceed to **Prompt 4: Live Preview & Publishing** which will complete the Manifest Editor.

