# Admin Frontend Implementation - Prompt 4: Live Preview & Publishing


---

## Objective

Complete the Manifest Editor by building the Live Preview component (real-time composed image rendering) and the Publishing Workflow (validation, versioning, archiving). This is the final piece of the editor.

---

## 1. Live Preview Component

**File:** `web/src/features/admin/components/ManifestEditor/LivePreview.jsx`  
**CSS:** `web/src/features/admin/components/ManifestEditor/LivePreview.module.css`

### Visual Design

```
┌─ Live Preview ─────────────────────────────┐
│ [front ▼] [side] [back]  [🔍+] [🔍-] [↺] │
│                                            │
│        ┌────────────────────┐             │
│        │                    │             │
│        │  Composed Image   │             │
│        │  (All layers)     │             │
│        │                    │             │
│        └────────────────────┘             │
│                                            │
│ Variant Selector:                         │
│   Paint: [red_paint ▼]                    │
│   Wheels: [alloy_18in ▼]                  │
│   Decals: [none ▼]                        │
└────────────────────────────────────────────┘
```

### Features

**Composed Image Rendering:**
- Load all layer images for selected angle
- Compose in z-index order (lowest z-index first, highest on top)
- Use HTML5 Canvas API for composition:
  1. Create canvas element
  2. For each layer in z-index order:
     - Get variant asset URL for current angle
     - Load image (use `Image` object or `img` element)
     - Draw image on canvas using `ctx.drawImage()`
  3. Display canvas
- Show loading state while images load (spinner overlay)
- Cache composed images per variant combination (avoid recomposing if nothing changed)
- Handle missing images gracefully (show placeholder or skip layer)

**Angle Selector:**
- Dropdown or tab buttons (front, side, back, top, etc.)
- Switch between angles immediately
- Update preview on angle change
- Highlight current angle

**Variant Selection:**
- Dropdown per layer showing available variants for that layer
- Update preview on change (reload composed image)
- Show "No variant selected" placeholder if missing
- Disable dropdowns for layers with no variants

**Zoom/Pan Controls:**
- **Zoom in/out buttons:** Increase/decrease scale
- **Mouse wheel zoom:** Zoom with scroll wheel
- **Pan with mouse drag:** When zoomed in, drag to pan
- **Reset view button:** Return to 1:1 scale, centered
- **Zoom level indicator:** Show current zoom (e.g., "150%")
- Use CSS transforms for zoom/pan (better performance than canvas scaling)

**Export Preview:**
- **Export Image button:** Downloads composed image as PNG
- Use `canvas.toDataURL('image/png')` to get data URL
- Create download link and trigger download
- Optional: Allow user to choose image size/quality

**Performance Optimizations:**
- Lazy load images (only load visible angle)
- Cache composed images per variant combination (use Map/object)
- Debounce variant selector changes (wait 300ms before recomposing)
- Use image sprites or WebP format if possible
- Preload next angle images in background

### Canvas Composition Algorithm

```javascript
async function composeImage(layers, variants, angle) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Set canvas size (use first image size or fixed size)
  canvas.width = 1920;
  canvas.height = 1080;
  
  // Sort layers by z-index
  const sortedLayers = [...layers].sort((a, b) => a.zIndex - b.zIndex);
  
  // Compose each layer
  for (const layer of sortedLayers) {
    const variantKey = variants[layer.id];
    if (!variantKey) continue; // Skip if no variant selected
    
    const variant = manifestData.variants[variantKey];
    const assetUrl = variant.assets[angle];
    if (!assetUrl) continue; // Skip if no asset for this angle
    
    // Load image
    const img = await loadImage(assetUrl);
    
    // Draw on canvas
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  }
  
  return canvas;
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // For CORS
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}
```

### Integration

- Listen to variant changes from Variant Manager
- Listen to layer changes from Layer Tree
- Update preview automatically when manifest data changes
- Show loading indicator while composing

---

## 2. Publishing Workflow Component

**File:** `web/src/features/admin/components/ManifestEditor/PublishWorkflow.jsx`  
**CSS:** `web/src/features/admin/components/ManifestEditor/PublishWorkflow.module.css`

### Visual Design

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

### Features

**Multi-Step Workflow:**
- **Step 1: Validation** (auto-run on open, show results)
- **Step 2: Version Increment** (auto-suggest, allow override)
- **Step 3: Archive Confirmation** (show current published version)
- Progress indicator showing current step
- Can go back to previous steps

**Validation Checks:**
- **Required fields:** Check manifest has slug, vehicle_model, layers, variants
- **Asset URL accessibility:** API call to verify URLs exist (HEAD request or similar)
- **Circular dependency check:** Use dependency detection algorithm
- **JSON structure validation:** Validate against manifest schema
- **Show errors/warnings:** List each check with status (✓, ✗, ⚠️)
- **Error details:** Click error to see details (which field, what's wrong)

**Version Management:**
- **Auto-increment:** Suggest next version based on current version
  - Patch: 1.2.0 → 1.2.1 (small changes)
  - Minor: 1.2.0 → 1.3.0 (new features)
  - Major: 1.2.0 → 2.0.0 (breaking changes)
- **Manual override:** Allow user to type custom version
- **Version history:** Show previous versions (optional, from API)
- **Version format:** Semantic versioning (major.minor.patch)

**Archive Old Version:**
- Show current published version details:
  - Version number
  - Published date
  - Published by (admin email)
- Checkbox to archive automatically
- Show what will happen to old version (status → "archived")
- Optional: Show preview of old version

**Publish Action:**
- Call `publishManifest(manifestId)` API function
- Show loading state (disable buttons, show spinner)
- Success: Show success message, close modal, refresh manifest list
- Error: Show error message, allow retry
- After publish: Navigate to manifest list or stay in editor

**Confirmation Modal:**
- Show validation summary (all checks passed)
- Show version info (current → new)
- Show archive confirmation (if checked)
- "Confirm Publish" button (final action)

### Validation API Integration

Use existing `validateManifest(manifestData)` function from `admin/api/manifests.js`:

```javascript
const validation = await validateManifest(manifestData);
// Returns:
{
  valid: boolean,
  errors: Array<{ field: string, message: string }>,
  warnings: Array<{ field: string, message: string }>
}
```

### Version Increment Logic

```javascript
function suggestNextVersion(currentVersion, changeType = 'patch') {
  const [major, minor, patch] = currentVersion.split('.').map(Number);
  
  if (changeType === 'major') {
    return `${major + 1}.0.0`;
  } else if (changeType === 'minor') {
    return `${major}.${minor + 1}.0`;
  } else {
    return `${major}.${minor}.${patch + 1}`;
  }
}
```

### Integration

- Open modal from "Publish" button in toolbar
- Pre-validate on open (show loading state)
- Update manifest data after successful publish
- Handle errors gracefully (network errors, validation errors)

---

## 3. Manifest List Page Enhancements

**File:** `web/src/pages/Admin/Manifests/ManifestList.jsx`

### Enhancements Needed

- **Edit button:** Navigate to editor (was placeholder, now should work)
- **Publish button:** For drafts, opens PublishingWorkflow modal
- **Archive button:** For published manifests, archives them
- **Create Manifest button:** Navigate to editor with new manifest
- **Status badges:** Show draft/published/archived status with colors
- **Version display:** Show version number in table
- **Last modified:** Show last modified date/time

---

## Implementation Notes

- **Canvas API:** Use HTML5 Canvas for image composition (better than CSS stacking)
- **Image Loading:** Handle CORS, loading errors, missing images
- **Performance:** Cache composed images, debounce changes, lazy load
- **Error Handling:** Show user-friendly error messages, allow retry
- **Validation:** Run validation on open, show results clearly
- **Versioning:** Follow semantic versioning conventions

---

## Deliverables

1. Live Preview component with canvas composition
2. Zoom/pan controls working
3. Variant selector integration
4. Export image functionality
5. Publishing Workflow modal with validation
6. Version management working
7. Archive functionality working
8. Manifest List page enhancements

---

## Next Steps

After completing this prompt, the Manifest Editor is complete! Proceed to **Prompt 5: Vehicle Options Management** for content management features.

