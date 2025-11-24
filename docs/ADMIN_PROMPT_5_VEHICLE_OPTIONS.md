# Admin Frontend Implementation - Prompt 5: Vehicle Options Management

**Dependencies:** Prompt 1 (UI Components) must be complete

---

## Objective

Build the Vehicle Options Management system - pages for content admins to manage vehicle configuration options. This is separate from the Manifest Editor and focuses on CRUD operations for vehicle options.

---

## 1. Option List Page

**File:** `web/src/pages/Admin/Content/Options/OptionList.jsx`  
**CSS:** `web/src/pages/Admin/Content/Options/OptionList.module.css`

### Features

**Vehicle Selector:**
- Dropdown at top of page to filter by vehicle
- "All Vehicles" option to show all options
- Load vehicles from `getVehicles()` API
- Show selected vehicle name in header

**Table with Columns:**
- **Category** - Option category (paint, wheels, accessories, etc.)
- **Code** - Unique option code (e.g., "red_paint_001")
- **Label** - Human-readable name (e.g., "Classic Red")
- **Price** - Formatted price with currency (e.g., "€500.00")
- **Configurator Visible** - Badge showing if visible in configurator (Yes/No)
- **Actions** - [Edit] [Delete] buttons

**Search Functionality:**
- Search input at top (use AdminSearch component)
- Search by code or label
- Debounced search (300ms)
- Clear button

**Filtering:**
- Filter by category dropdown
- Filter by configurator visibility (All / Visible / Hidden)
- Combine filters with search

**Sorting:**
- Sort by any column (click header)
- Toggle ascending/descending
- Show sort indicator (arrow)

**Pagination:**
- 50 options per page (configurable)
- Page navigation (use AdminPagination component)
- Show "Showing X-Y of Z options"

**Actions:**
- **Create Option button:** Navigate to Option Create page
- **Bulk actions:** (Optional) Select multiple options, bulk delete or bulk update visibility
- **Export CSV button:** Export filtered results to CSV

### Data Source

Use `getOptions(filters)` from `admin/api/content.js`:

```javascript
const { data, error } = await getOptions({
  vehicleId: selectedVehicleId,
  category: selectedCategory,
  search: searchQuery,
  page: currentPage,
  limit: 50
});
```

### Layout

```
┌─ Vehicle Options ─────────────────────────────┐
│ Vehicle: [Select Vehicle ▼]                  │
│                                                │
│ [Search options...] [Filter ▼] [+ Create]    │
│                                                │
│ ┌──────────────────────────────────────────┐ │
│ │ Category │ Code │ Label │ Price │ ... │ │
│ ├──────────────────────────────────────────┤ │
│ │ paint    │ red  │ Red   │ €500  │ ... │ │
│ │ wheels   │ 18in │ 18"   │ €800  │ ... │ │
│ └──────────────────────────────────────────┘ │
│                                                │
│ [< Prev] [1] [2] [3] [Next >]                │
└────────────────────────────────────────────────┘
```

---

## 2. Option Detail/Edit Page

**File:** `web/src/pages/Admin/Content/Options/OptionDetail.jsx`  
**CSS:** `web/src/pages/Admin/Content/Options/OptionDetail.module.css`

### Form Fields

**Basic Information:**
- **Vehicle selector:** Dropdown (read-only if editing, shows current vehicle)
- **Category input:** Text input (paint, wheels, accessories, etc.)
- **Code input:** Text input (read-only if editing, must be unique per vehicle)
- **Label input:** Text input (human-readable name)
- **Description textarea:** Multi-line text (optional)

**Pricing:**
- **Price input:** Number input (in cents, e.g., 50000 = €500.00)
- **Currency select:** Dropdown (EUR, USD, GBP, etc.)
- **Price display:** Show formatted price below input (e.g., "€500.00")

**Media:**
- **Media URL input:** Text input (image URL)
- **Media preview:** Show image thumbnail if URL provided
- **Upload button:** Upload image to Supabase Storage
- **Remove button:** Clear media URL

**Configurator Settings:**
- **Visible in configurator:** Checkbox
- **Configurator group:** Text input (group options together)
- **Configurator order:** Number input (display order within group)

**Dependencies Section:**
- **Current dependencies:** List of option codes this option depends on
- **Add Dependency button:** Opens modal to select other options
- **Remove button:** Per dependency, removes dependency
- **Dependency validation:** Check for circular dependencies

**Actions:**
- **Save button:** Updates option, shows loading state, handles errors
- **Cancel button:** Navigate back to Option List
- **Delete button:** Shows confirmation modal, deletes option

### Data Loading

On mount, if `optionId` in URL params:
```javascript
const option = await getOptionById(optionId);
// Populate form fields
```

### Form Validation

- Code: Required, unique per vehicle, alphanumeric + underscores
- Label: Required, max 100 characters
- Price: Required, positive number
- Category: Required, must be valid category
- Dependencies: Check for circular dependencies

### Layout

```
┌─ Edit Option ────────────────────────────────┐
│ [← Back to Options]                          │
│                                                │
│ Basic Information                            │
│ Vehicle: [Model X ▼] (read-only)             │
│ Category: [paint]                             │
│ Code: [red_paint_001] (read-only)            │
│ Label: [Classic Red]                         │
│ Description: [Multi-line text...]            │
│                                                │
│ Pricing                                       │
│ Price: [50000] (cents)                        │
│ Currency: [EUR ▼]                            │
│ Display: €500.00                              │
│                                                │
│ Media                                         │
│ URL: [https://...] [Upload] [Preview]        │
│ [Image thumbnail]                             │
│                                                │
│ Configurator Settings                        │
│ ☑ Visible in configurator                    │
│ Group: [paint_options]                        │
│ Order: [1]                                    │
│                                                │
│ Dependencies                                  │
│ • base_layer [Remove]                         │
│ [+ Add Dependency]                           │
│                                                │
│ [Cancel]              [Save Changes] [Delete]│
└────────────────────────────────────────────────┘
```

---

## 3. Option Create Page

**File:** `web/src/pages/Admin/Content/Options/OptionCreate.jsx`  
**CSS:** `web/src/pages/Admin/Content/Options/OptionCreate.module.css`

### Features

- Similar form to Option Detail page, but:
  - Vehicle selector is editable (required)
  - Code input is editable (required, must be unique)
  - No Delete button
- On submit: Call `createOption(optionData)` API
- On success: Navigate to Option Detail page for new option
- On error: Show error message, allow retry

### Form Fields

Same as Option Detail, but all fields editable.

---

## 4. API Integration

Use existing functions from `web/src/features/admin/api/content.js`:

- `getOptions(filters)` - List options with filters
- `getOptionById(optionId)` - Get single option
- `createOption(optionData)` - Create new option
- `updateOption(optionId, updates)` - Update option
- `deleteOption(optionId)` - Delete option
- `uploadImage(file, bucket)` - Upload media

### Option Data Structure

```javascript
{
  id: "uuid",
  vehicle_id: "uuid",
  category: "paint",
  code: "red_paint_001",
  label: "Classic Red",
  description: "A vibrant red paint option",
  price_cents: 50000,
  currency: "EUR",
  media_url: "https://cdn.../red.png",
  configurator_visible: true,
  configurator_group: "paint_options",
  configurator_order: 1,
  dependencies: ["base_layer"],
  created_at: "2025-11-24T...",
  updated_at: "2025-11-24T..."
}
```

---

## 5. Route Setup

Add routes to `web/src/app/App.jsx`:

```javascript
<Route
  path="/admin/content/options"
  element={
    <RequireAdmin requiredRole="content_admin">
      <OptionList />
    </RequireAdmin>
  }
/>
<Route
  path="/admin/content/options/create"
  element={
    <RequireAdmin requiredRole="content_admin">
      <OptionCreate />
    </RequireAdmin>
  }
/>
<Route
  path="/admin/content/options/:optionId"
  element={
    <RequireAdmin requiredRole="content_admin">
      <OptionDetail />
    </RequireAdmin>
  }
/>
```

---

## 6. Navigation Updates

Update `AdminLayout` sidebar to include Options link:
- Add "Options" menu item under "Vehicles & Assets"
- Only visible to `content_admin` and `super_admin` roles
- Link to `/admin/content/options`

---

## Implementation Notes

- **Form Management:** Use `react-hook-form` for form state and validation
- **Image Upload:** Use Supabase Storage, show progress bar
- **Dependencies:** Reuse circular dependency detection from Manifest Editor
- **Validation:** Client-side validation + API validation
- **Error Handling:** Show user-friendly error messages
- **Loading States:** Show loading indicators during API calls

---

## Deliverables

1. Option List page with filtering, search, sorting, pagination
2. Option Detail/Edit page with full form
3. Option Create page
4. Image upload functionality
5. Dependency management
6. Routes configured
7. Navigation updated

---

## Next Steps

After completing this prompt, proceed to **Prompt 6: Advanced Analytics & Settings** to complete the admin system.

