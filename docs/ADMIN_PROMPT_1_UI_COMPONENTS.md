# Admin Frontend Implementation - Prompt 1: UI Component Library

---

## Objective

Create a reusable UI component library for the admin system. These components will be used throughout all admin pages for consistency. Follow Volturiano design guidelines (dark theme, minimalist, aggressive styling).

---

## Components to Build

### 1. AdminTable Component

**File:** `web/src/features/admin/components/ui/AdminTable.jsx`  
**CSS:** `web/src/features/admin/components/ui/AdminTable.module.css`

**Props Interface:**
```javascript
{
  columns: Array<{
    key: string,                    // Unique column identifier
    label: string,                   // Display label
    sortable?: boolean,              // Can this column be sorted?
    render?: (value, row) => ReactNode // Custom render function
  }>,
  data: Array<Object>,               // Row data objects
  onSort?: (columnKey, direction) => void,  // 'asc' | 'desc' | null
  onFilter?: (filters) => void,      // Optional filtering callback
  pagination?: {
    currentPage: number,
    totalPages: number,
    onPageChange: (page) => void,
    pageSize?: number,               // Optional page size selector
    totalItems?: number              // For showing "Showing X of Y"
  },
  selectable?: boolean,              // Show checkbox column for row selection
  onSelectionChange?: (selectedRows) => void, // Callback when selection changes
  loading?: boolean,                 // Show skeleton loader
  emptyMessage?: string              // Custom empty state message
}
```

**Key Features:**
- Sortable columns: Click header to sort, show arrow indicator (↑↓), toggle between asc/desc/null
- Row selection: Checkbox column if `selectable={true}`, "Select All" checkbox in header
- Loading state: Skeleton rows with shimmer effect
- Empty state: Show message when no data
- Responsive: Horizontal scroll on mobile, sticky header optional
- Row hover effects: Subtle background change
- Selected row highlighting: Orange accent color

**Usage Example:**
```javascript
<AdminTable
  columns={[
    { key: 'email', label: 'Email', sortable: true },
    { key: 'role', label: 'Role', sortable: true },
    { key: 'created', label: 'Created', sortable: true, render: (value) => formatDate(value) }
  ]}
  data={users}
  onSort={(key, dir) => handleSort(key, dir)}
  pagination={{
    currentPage: 1,
    totalPages: 10,
    onPageChange: (page) => setPage(page)
  }}
  selectable={true}
  onSelectionChange={(selected) => setSelected(selected)}
  loading={isLoading}
/>
```

---

### 2. AdminModal Component

**File:** `web/src/features/admin/components/ui/AdminModal.jsx`  
**CSS:** `web/src/features/admin/components/ui/AdminModal.module.css`

**Props Interface:**
```javascript
{
  open: boolean,                     // Control visibility
  onClose: () => void,                // Close handler
  title: string,                      // Modal title
  children: ReactNode,                // Modal content
  footer?: ReactNode,                // Optional footer (buttons, etc.)
  size?: 'sm' | 'md' | 'lg' | 'xl',  // Modal width
  closeOnOverlayClick?: boolean      // Close when clicking backdrop
}
```

**Key Features:**
- Overlay backdrop: Dark semi-transparent overlay
- Centered modal: Max-width based on size prop
- Close button: X icon in top-right corner
- Keyboard support: Escape key closes modal
- Focus trap: Keep focus inside modal when open
- Animations: Smooth open/close transitions
- Scrollable content: Content area scrolls if too tall
- Click outside: Option to close on backdrop click

**Size Guidelines:**
- `sm`: ~400px max-width
- `md`: ~600px max-width  
- `lg`: ~800px max-width
- `xl`: ~1200px max-width

**Usage Example:**
```javascript
<AdminModal
  open={isOpen}
  onClose={() => setIsOpen(false)}
  title="Delete User"
  size="md"
  footer={
    <>
      <AdminButton variant="secondary" onClick={() => setIsOpen(false)}>Cancel</AdminButton>
      <AdminButton variant="danger" onClick={handleDelete}>Delete</AdminButton>
    </>
  }
>
  <p>Are you sure you want to delete this user?</p>
</AdminModal>
```

---

### 3. AdminInput Component

**File:** `web/src/features/admin/components/ui/AdminInput.jsx`  
**CSS:** `web/src/features/admin/components/ui/AdminInput.module.css`

**Props Interface:**
```javascript
{
  label: string,                    // Label text above input
  value: string,                     // Controlled value
  onChange: (value) => void,         // Change handler
  type?: 'text' | 'email' | 'password' | 'number' | 'url',
  error?: string,                    // Error message (shows below input)
  helperText?: string,               // Helper text below input
  required?: boolean,                // Show asterisk and validate
  disabled?: boolean,
  placeholder?: string,
  icon?: ReactNode                   // Optional left icon
}
```

**Key Features:**
- Label with required indicator (*)
- Error state: Red border, error message below
- Helper text: Gray text below input (for hints)
- Icon support: Left-side icon
- Disabled state: Visual feedback
- Focus state: Orange accent border

**Usage Example:**
```javascript
<AdminInput
  label="Email Address"
  value={email}
  onChange={(value) => setEmail(value)}
  type="email"
  required={true}
  error={errors.email}
  helperText="We'll never share your email"
  icon={<Mail size={16} />}
/>
```

---

### 4. AdminSelect Component

**File:** `web/src/features/admin/components/ui/AdminSelect.jsx`  
**CSS:** `web/src/features/admin/components/ui/AdminSelect.module.css`

**Props Interface:**
```javascript
{
  label: string,
  value: string | Array<string>,     // Single value or array for multi-select
  onChange: (value) => void,
  options: Array<{ value: string, label: string }>,
  placeholder?: string,
  multiple?: boolean,                // Multi-select mode
  searchable?: boolean,              // Filter options as you type
  error?: string,
  required?: boolean,
  disabled?: boolean
}
```

**Key Features:**
- Custom dropdown (not native `<select>` for better styling)
- Single or multi-select modes
- Searchable: Filter options in real-time
- Selected value display: Chips for multi-select
- Keyboard navigation: Arrow keys, Enter to select, Escape to close
- Clear button: X icon to clear selection

**Usage Example:**
```javascript
<AdminSelect
  label="User Role"
  value={role}
  onChange={(value) => setRole(value)}
  options={[
    { value: 'user', label: 'User' },
    { value: 'admin', label: 'Admin' },
    { value: 'super_admin', label: 'Super Admin' }
  ]}
  required={true}
  searchable={true}
/>
```

---

### 5. AdminButton Component

**File:** `web/src/features/admin/components/ui/AdminButton.jsx`  
**CSS:** `web/src/features/admin/components/ui/AdminButton.module.css`

**Props Interface:**
```javascript
{
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost',
  size?: 'sm' | 'md' | 'lg',
  loading?: boolean,                  // Show spinner, disable interaction
  disabled?: boolean,
  icon?: ReactNode,                   // Optional left icon
  children: ReactNode,
  onClick: () => void,
  type?: 'button' | 'submit' | 'reset' // For forms
}
```

**Variants:**
- `primary`: White background, black text, orange hover (main CTA)
- `secondary`: Transparent, white border, white text
- `danger`: Red background, white text (destructive actions)
- `ghost`: Transparent, no border, gray text (subtle actions)

**Sizes:**
- `sm`: ~32px height
- `md`: ~40px height (default)
- `lg`: ~48px height

**Key Features:**
- Loading state: Spinner replaces text, disables button
- Icon support: Left-side icon
- Disabled state: Visual and functional
- Hover/active states: Smooth transitions

**Usage Example:**
```javascript
<AdminButton
  variant="primary"
  size="md"
  loading={isSaving}
  icon={<Save size={16} />}
  onClick={handleSave}
>
  Save Changes
</AdminButton>
```

---

### 6. Additional Utility Components

**AdminPagination** (`AdminPagination.jsx`):
- Page numbers with ellipsis for many pages
- Previous/Next buttons
- Optional page size selector
- Shows "Showing X-Y of Z" text

**AdminSearch** (`AdminSearch.jsx`):
- Search input with magnifying glass icon
- Debounced onChange (300ms default)
- Clear button (X icon) when has value
- Placeholder text support

**AdminBadge** (`AdminBadge.jsx`):
- Status indicators (success, warning, error, info variants)
- Small and medium sizes
- Used for role badges, status indicators, etc.

**AdminLoading** (`AdminLoading.jsx`):
- Spinner component
- Full-screen overlay option
- Size variants (sm, md, lg)

---

## Implementation Notes

- **Styling:** Follow Volturiano design system (dark theme, orange accents, minimalist)
- **CSS Modules:** Use CSS Modules for all components (`.module.css`)
- **Accessibility:** Include ARIA labels, keyboard navigation, focus indicators
- **TypeScript:** Consider adding PropTypes or TypeScript types
- **Testing:** Each component should handle edge cases (empty data, null values, etc.)

---

## Deliverables

1. All 9 components implemented and working
2. Each component exported from `web/src/features/admin/components/ui/index.js`
3. Components handle loading, error, and empty states
4. Responsive design (mobile-friendly)
5. Keyboard navigation support
6. Components are reusable and well-documented

---

## Next Steps

After completing this prompt, proceed to **Prompt 2: Manifest Editor Foundation** which will use these components.

