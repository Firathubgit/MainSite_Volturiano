# Admin Account & User Role System - Implementation Checklist

**Version:** 1.0  
**Created:** 2025-01-XX  
**Status:** Ready for Implementation  
**Estimated Total Time:** 8-12 weeks

---

## Phase 0: Admin Role Foundation (Week 1)

### Database Schema Setup

- [x] Create `supabase/sql/admin_role_schema.sql` file
- [x] Add `role` column to `profiles` table:
  ```sql
  alter table profiles 
  add column if not exists role text default 'user' 
  check (role in ('user', 'support_admin', 'content_admin', 'super_admin'));
  ```
- [x] Add index on `profiles.role`:
  ```sql
  create index if not exists profiles_role_idx on profiles(role);
  ```
- [x] Create `admin_audit_logs` table:
  ```sql
  create table admin_audit_logs (
    id uuid primary key default gen_random_uuid(),
    admin_id uuid references profiles(id) on delete set null,
    action text not null,
    resource_type text not null,
    resource_id uuid,
    details jsonb default '{}'::jsonb,
    ip_address inet,
    user_agent text,
    created_at timestamptz default now()
  );
  ```
- [x] Add indexes to `admin_audit_logs`:
  - [x] Index on `admin_id`
  - [x] Index on `action`
  - [x] Index on `created_at`
- [ ] Test schema migration in local Supabase
- [ ] Verify all constraints work correctly
- [ ] Document schema changes in migration notes

### RLS Policies

- [x] Create `supabase/sql/admin_rls_policies.sql` file
- [x] Create `is_admin()` helper function:
  ```sql
  create or replace function is_admin()
  returns boolean as $$
  begin
    return exists (
      select 1 from profiles
      where id = auth.uid()
      and role in ('support_admin', 'content_admin', 'super_admin')
    );
  end;
  $$ language plpgsql security definer;
  ```
- [x] Create `has_admin_role(required_role text)` function:
  ```sql
  create or replace function has_admin_role(required_role text)
  returns boolean as $$
  declare
    user_role text;
  begin
    select role into user_role from profiles where id = auth.uid();
    if required_role = 'super_admin' then
      return user_role = 'super_admin';
    elsif required_role = 'content_admin' then
      return user_role in ('content_admin', 'super_admin');
    elsif required_role = 'support_admin' then
      return user_role in ('support_admin', 'content_admin', 'super_admin');
    end if;
    return false;
  end;
  $$ language plpgsql security definer;
  ```
- [x] Update RLS policy on `config_2d_manifests` for admin write access
- [x] Update RLS policy on `vehicles` for admin CRUD access
- [x] Update RLS policy on `vehicle_options` for admin CRUD access
- [x] Update RLS policy on `garage_items` for admin read access
- [x] Update RLS policy on `configurations` for admin read access
- [ ] Test RLS policies with different role scenarios
- [ ] Verify service_role still works correctly

### Permission System

- [x] Create `supabase/sql/admin_permissions.sql` file
- [x] Create `admin_permissions` table:
  ```sql
  create table admin_permissions (
    id uuid primary key default gen_random_uuid(),
    role text not null,
    resource text not null,
    action text not null,
    created_at timestamptz default now(),
    unique(role, resource, action)
  );
  ```
- [x] Seed default permissions for `super_admin`:
  ```sql
  insert into admin_permissions (role, resource, action) values
    ('super_admin', '*', '*');
  ```
- [x] Seed default permissions for `content_admin`:
  ```sql
  insert into admin_permissions (role, resource, action) values
    ('content_admin', 'manifests', 'read'),
    ('content_admin', 'manifests', 'write'),
    ('content_admin', 'manifests', 'publish'),
    ('content_admin', 'vehicles', 'read'),
    ('content_admin', 'vehicles', 'write');
  ```
- [x] Seed default permissions for `support_admin`:
  ```sql
  insert into admin_permissions (role, resource, action) values
    ('support_admin', 'users', 'read'),
    ('support_admin', 'users', 'write'),
    ('support_admin', 'orders', 'read');
  ```
- [x] Create `check_admin_permission(required_resource text, required_action text)` function
- [ ] Test permission checking with different roles
- [ ] Verify permission inheritance works (super_admin > content_admin > support_admin)

### Audit Logging

- [x] Create `supabase/sql/admin_audit_functions.sql` file
- [x] Create `log_admin_action()` function:
  ```sql
  create or replace function log_admin_action(
    p_action text,
    p_resource_type text,
    p_resource_id uuid default null,
    p_details jsonb default '{}'::jsonb
  )
  returns uuid as $$
  declare
    v_log_id uuid;
    v_admin_id uuid;
    v_ip_address inet;
    v_user_agent text;
  begin
    v_admin_id := auth.uid();
    v_ip_address := inet_client_addr();
    v_user_agent := current_setting('request.headers', true)::json->>'user-agent';
    
    insert into admin_audit_logs (
      admin_id, action, resource_type, resource_id, details, ip_address, user_agent
    )
    values (
      v_admin_id, p_action, p_resource_type, p_resource_id, p_details, v_ip_address, v_user_agent
    )
    returning id into v_log_id;
    
    return v_log_id;
  end;
  $$ language plpgsql security definer;
  ```
- [ ] Test audit logging function
- [ ] Verify IP address and user agent are captured correctly
- [ ] Test with null resource_id
- [ ] Test with complex JSON details

### Phase 0 Testing & Validation

- [ ] Run all SQL migrations in order
- [ ] Verify no errors in migration logs
- [ ] Test role assignment to test user
- [ ] Test admin helper functions return correct values
- [ ] Test RLS policies block unauthorized access
- [ ] Test audit logging captures actions
- [ ] Create test admin user with each role type
- [ ] Document any issues or edge cases found

---

## Phase 1: Admin Authentication & Authorization (Week 1-2)

### Admin Store Setup

- [x] Create `web/src/stores/adminStore.js` file
- [x] Import Zustand and Supabase client
- [x] Create store with initial state:
  - [ ] `isAdmin: false`
  - [ ] `adminRole: null`
  - [ ] `permissions: []`
  - [ ] `loading: true`
- [x] Implement `checkAdminStatus()` async function:
  - [x] Get current session
  - [x] Query profiles table for user role
  - [x] Check if role is admin type
  - [x] Query admin_permissions if admin
  - [x] Update store state
- [x] Implement `hasPermission(resource, action)` function:
  - [x] Check if super_admin (always true)
  - [x] Check permissions array for match
  - [x] Handle wildcard permissions
- [x] Implement `reset()` function to clear state
- [x] Add error handling for failed queries
- [ ] Test store with different user roles
- [ ] Verify store updates on auth state changes

### RequireAdmin Component

- [x] Create `web/src/features/admin/components/RequireAdmin.jsx` file
- [x] Import React hooks and router components
- [x] Import `useAdminStore` and `LoadingOverlay`
- [x] Create component with `children` and `requiredRole` props
- [x] Implement `useEffect` to check admin status on mount
- [x] Show loading overlay while checking
- [x] Redirect to login if not admin
- [x] Check required role if specified
- [x] Redirect to admin dashboard if role insufficient
- [x] Return children if authorized
- [ ] Test component with different scenarios:
  - [ ] Non-authenticated user
  - [ ] Regular user (not admin)
  - [ ] Admin user
  - [ ] Admin with insufficient role
- [ ] Add proper error boundaries

### Admin API Client

- [x] Create `web/src/features/admin/api/adminClient.js` file
- [x] Import Supabase client and admin store
- [x] Create `adminRequest(table, method, options)` wrapper function:
  - [x] Check admin status from store
  - [x] Throw error if not admin
  - [x] Execute Supabase query
  - [x] Return data or throw error
- [x] Create `logAdminAction(action, resourceType, resourceId, details)` function:
  - [x] Call Supabase RPC `log_admin_action`
  - [x] Handle errors gracefully
  - [x] Return log ID
- [x] Add TypeScript-style JSDoc comments
- [ ] Test API client with different operations
- [ ] Verify audit logging works

### Admin Routes Setup

- [x] Open `web/src/app/App.jsx` file
- [x] Import `RequireAdmin` component
- [x] Create `/admin` route with `RequireAdmin` wrapper
- [x] Create `/admin/users` route
- [x] Create `/admin/content/vehicles` route
- [x] Create `/admin/manifests` route
- [x] Create `/admin/analytics` route
- [x] Create `/admin/settings` route
- [ ] Test route protection:
  - [ ] Try accessing without login
  - [ ] Try accessing as regular user
  - [ ] Try accessing as admin
- [x] Add route-level code splitting (lazy loading)
- [ ] Verify routes load correctly

### Phase 1 Testing & Validation

- [ ] Test admin store initialization
- [ ] Test role checking on page load
- [ ] Test permission checking logic
- [ ] Test route guards work correctly
- [ ] Test API client error handling
- [ ] Test audit logging integration
- [ ] Verify session refresh updates admin status
- [ ] Test with multiple admin users simultaneously

---

## Phase 2: Admin UI Dashboard (Week 2-3)

### Admin Layout Component

- [x] Create `web/src/features/admin/components/AdminLayout/AdminLayout.jsx`
- [x] Create `web/src/features/admin/components/AdminLayout/AdminLayout.module.css`
- [x] Design layout structure:
  - [x] Sidebar navigation (left)
  - [x] Top bar (header)
  - [x] Main content area
- [x] Implement sidebar with menu items:
  - [x] Dashboard (icon + text)
  - [x] Users (icon + text)
  - [x] Vehicles (icon + text)
  - [x] Manifests (icon + text)
  - [x] Analytics (icon + text)
  - [x] Settings (icon + text)
- [x] Add active route highlighting
- [x] Implement collapsible sidebar for mobile
- [x] Create top bar with:
  - [x] User role display
  - [x] Logout button
- [x] Add responsive breakpoints
- [x] Style with dark theme matching brand
- [ ] Test layout on different screen sizes
- [ ] Add keyboard navigation support

### Dashboard Overview Page

- [x] Create `web/src/pages/Admin/Dashboard/Dashboard.jsx`
- [x] Create `web/src/pages/Admin/Dashboard/Dashboard.module.css`
- [x] Set up data fetching with useState/useEffect
- [x] Create widget components:
  - [x] Total users count widget
  - [x] Active configurations count widget
  - [x] Published manifests count widget
  - [x] Recent activity feed widget
- [x] Implement quick actions section:
  - [x] "Create User" button
  - [x] "Manage Manifests" button
  - [x] "Manage Vehicles" button
- [x] Add loading states for widgets
- [x] Add error states for widgets
- [x] Implement auto-refresh (30 second intervals)
- [x] Style widgets with cards and icons
- [ ] Test dashboard loads correctly
- [ ] Verify real-time updates work

### Admin UI Component Library

- [ ] Create `web/src/features/admin/components/ui/` directory
- [ ] Create `AdminTable.jsx` component:
  - [ ] Props: columns, data, onSort, onFilter, pagination
  - [ ] Sortable columns
  - [ ] Filterable rows
  - [ ] Row selection (checkbox)
  - [ ] Loading state
  - [ ] Empty state
- [ ] Create `AdminCard.jsx` component:
  - [ ] Props: title, children, actions, footer
  - [ ] Header with title and actions
  - [ ] Body content area
  - [ ] Optional footer
- [ ] Create `AdminButton.jsx` component:
  - [ ] Props: variant, size, loading, disabled, icon
  - [ ] Primary, secondary, danger variants
  - [ ] Small, medium, large sizes
  - [ ] Loading spinner state
  - [ ] Icon support
- [ ] Create `AdminInput.jsx` component:
  - [ ] Props: label, error, helperText, required
  - [ ] Input with label
  - [ ] Error state styling
  - [ ] Helper text support
  - [ ] Required indicator
- [ ] Create `AdminSelect.jsx` component:
  - [ ] Props: options, value, onChange, placeholder
  - [ ] Dropdown select
  - [ ] Searchable (optional)
  - [ ] Multi-select support (optional)
- [ ] Create `AdminModal.jsx` component:
  - [ ] Props: open, onClose, title, children, footer
  - [ ] Overlay backdrop
  - [ ] Centered modal
  - [ ] Close button
  - [ ] Footer actions
  - [ ] Escape key to close
- [ ] Create `AdminPagination.jsx` component:
  - [ ] Props: currentPage, totalPages, onPageChange
  - [ ] Page numbers
  - [ ] Previous/Next buttons
  - [ ] Page size selector
- [ ] Create `AdminSearch.jsx` component:
  - [ ] Props: value, onChange, placeholder, debounceMs
  - [ ] Search input with icon
  - [ ] Debounced onChange
  - [ ] Clear button
- [ ] Create `AdminBadge.jsx` component:
  - [ ] Props: variant, children
  - [ ] Success, warning, error, info variants
  - [ ] Small, medium sizes
- [ ] Create `AdminLoading.jsx` component:
  - [ ] Props: size, fullScreen
  - [ ] Spinner animation
  - [ ] Full screen overlay option
- [ ] Create CSS modules for each component
- [ ] Test all components in isolation
- [ ] Document component props and usage

### Admin Navigation System

- [x] Implement menu items based on permissions (in AdminLayout):
  - [x] Check admin role from store
  - [x] Filter menu items by role
  - [x] Hide unauthorized items
- [ ] Add breadcrumb navigation:
  - [ ] Show current page path
  - [ ] Make breadcrumbs clickable
  - [ ] Style breadcrumbs
- [ ] Implement keyboard shortcuts (optional):
  - [ ] Cmd/Ctrl + K for search
  - [ ] Arrow keys for navigation
- [x] Add mobile menu toggle (in AdminLayout)
- [ ] Test navigation with different roles
- [x] Verify menu items filter correctly

### Phase 2 Testing & Validation

- [ ] Test layout responsiveness
- [ ] Test navigation between pages
- [ ] Test component library usage
- [ ] Test dashboard widgets load data
- [ ] Test real-time updates
- [ ] Verify role-based menu filtering
- [ ] Test on mobile devices
- [ ] Check accessibility (keyboard navigation, screen readers)

---

## Phase 3: User Management System (Week 3-4)

### User List Page

- [ ] Create `web/src/pages/Admin/Users/UserList.jsx`
- [ ] Create `web/src/pages/Admin/Users/UserList.module.css`
- [ ] Set up React Query for user data
- [ ] Create table with columns:
  - [ ] Checkbox (for selection)
  - [ ] ID (truncated)
  - [ ] Email
  - [ ] Display Name
  - [ ] Role (with badge)
  - [ ] Created At (formatted)
  - [ ] Last Login (formatted)
  - [ ] Actions (Edit, Delete buttons)
- [x] Implement search functionality:
  - [x] Search by display name
  - [x] Debounced search input
- [x] Implement filtering:
  - [x] Filter by role dropdown
- [x] Implement sorting:
  - [x] Sort by any column
  - [x] Ascending/descending toggle
- [x] Implement pagination:
  - [x] 50 users per page (configurable)
  - [x] Page navigation
  - [x] Total count display
- [x] Add bulk actions:
  - [x] Select all checkbox
  - [x] Bulk role assignment dropdown
  - [x] Export to CSV button
- [x] Add loading state
- [x] Add empty state
- [x] Add error state
- [ ] Test search functionality
- [ ] Test filtering and sorting
- [ ] Test pagination
- [ ] Test bulk operations

### User Detail Page

- [x] Create `web/src/pages/Admin/Users/UserDetail.jsx`
- [x] Create `web/src/pages/Admin/Users/UserDetail.module.css`
- [x] Set up data fetching with useState/useEffect
- [x] Create user profile section:
  - [ ] Avatar display
  - [ ] Email (read-only)
  - [ ] Display name (editable)
  - [ ] Role (editable dropdown)
  - [ ] Created at timestamp
  - [ ] Last login timestamp
- [x] Create statistics section:
  - [x] Garage items count
  - [x] Configurations count
- [ ] Create activity timeline:
  - [ ] Recent actions
  - [ ] Configuration saves
  - [ ] Login history
- [x] Create edit user form:
  - [x] Display name input
  - [x] Role select dropdown
  - [x] Avatar URL input
  - [x] Save button
  - [x] Cancel button
- [x] Add action buttons:
  - [x] Reset password (placeholder)
  - [ ] Impersonate user (future, disabled)
  - [x] Delete user (with confirmation modal)
- [x] Implement form validation
- [x] Add loading states
- [x] Add error handling
- [ ] Test user detail view
- [ ] Test edit functionality
- [ ] Test delete with confirmation

### User Creation Form

- [x] Create `web/src/pages/Admin/Users/UserCreate.jsx`
- [x] Create `web/src/pages/Admin/Users/UserCreate.module.css`
- [x] Create form with fields:
  - [x] Email input (required)
  - [x] Display name input (optional)
  - [x] Role select dropdown (required)
  - [x] Send welcome email checkbox
- [x] Implement form validation:
  - [x] Email format validation
  - [x] Required field validation
  - [x] Role must be valid
- [x] Add form submission handler:
  - [x] Call create user API
  - [x] Show loading state
  - [x] Handle success (redirect to user detail)
  - [x] Handle errors (show error message)
- [x] Add cancel button (navigate back)
- [ ] Test form validation
- [ ] Test form submission
- [ ] Test error handling
- [ ] Verify welcome email is sent (if checked)

### User API Functions

- [x] Create `web/src/features/admin/api/users.js` file
- [x] Implement `getUsers(filters)` function:
  - [ ] Accept filters object (role, search, page, limit)
  - [ ] Build Supabase query with filters
  - [ ] Handle pagination
  - [ ] Return users and total count
- [x] Implement `getUserById(userId)` function:
  - [x] Fetch user profile
  - [x] Fetch related data (garage items, configurations)
  - [x] Return combined data
- [x] Implement `updateUser(userId, updates)` function:
  - [x] Update profile record
  - [x] Log admin action via `logAdminAction`
  - [x] Return updated user
- [x] Implement `deleteUser(userId)` function:
  - [x] Soft delete (sets role to 'user')
  - [x] Log admin action
  - [x] Return success status
- [x] Implement `createUser(userData)` function:
  - [x] Call Edge Function for user creation
  - [x] Log admin action
  - [x] Return created user
- [x] Add error handling for all functions
- [x] Add JSDoc comments
- [ ] Test all API functions
- [ ] Verify audit logging works

### Edge Function for User Creation

- [x] Create `supabase/functions/admin-create-user/` directory
- [x] Create `index.ts` file
- [x] Create `deno.json` configuration
- [x] Implement function:
  - [x] Verify admin role from JWT
  - [x] Extract user data from request
  - [x] Validate input data
  - [x] Create user via Supabase Admin API
  - [x] Create profile record
  - [x] Send welcome email placeholder
  - [x] Return success response
- [x] Add error handling
- [x] Add input validation
- [ ] Test Edge Function locally
- [ ] Deploy Edge Function
- [ ] Test deployed function
- [ ] Verify user creation works end-to-end

### Phase 3 Testing & Validation

- [ ] Test user list page loads correctly
- [ ] Test search and filtering
- [ ] Test user detail page
- [ ] Test user creation
- [ ] Test user update
- [ ] Test user deletion
- [ ] Test bulk operations
- [ ] Verify all actions are logged
- [ ] Test error scenarios
- [ ] Test with different admin roles

---

## Phase 4: Content Management System (Week 4-5)

### Vehicle Management Pages

- [ ] Create `web/src/pages/Admin/Content/Vehicles/VehicleList.jsx`
- [ ] Create `web/src/pages/Admin/Content/Vehicles/VehicleList.module.css`
- [ ] Implement vehicle list table:
  - [ ] Columns: Name, Slug, Trim, Year, Base Price, Actions
  - [ ] Search by name or slug
  - [ ] Sort by any column
  - [ ] Pagination
- [ ] Create `web/src/pages/Admin/Content/Vehicles/VehicleDetail.jsx`
- [ ] Create vehicle detail/edit form:
  - [ ] Slug input (read-only if editing)
  - [ ] Name input
  - [ ] Trim input
  - [ ] Year input (number)
  - [ ] Base price input (cents)
  - [ ] Currency select
  - [ ] Hero image URL input
  - [ ] Image preview
  - [ ] Linked options section (list)
- [x] Add delete button with cascade warning
- [ ] Create `web/src/pages/Admin/Content/Vehicles/VehicleCreate.jsx`
- [ ] Create vehicle creation form (similar to detail form)
- [x] Implement form validation (in detail form)
- [ ] Test vehicle CRUD operations

### Vehicle Options Management

- [ ] Create `web/src/pages/Admin/Content/Options/OptionList.jsx`
- [ ] Create option list filtered by vehicle:
  - [ ] Vehicle selector dropdown
  - [ ] Table with: Category, Code, Label, Price, Actions
  - [ ] Search functionality
  - [ ] Filter by category
- [ ] Create `web/src/pages/Admin/Content/Options/OptionDetail.jsx`
- [ ] Create option detail/edit form:
  - [ ] Vehicle selector (read-only if editing)
  - [ ] Category input
  - [ ] Code input (read-only if editing)
  - [ ] Label input
  - [ ] Description textarea
  - [ ] Price input (cents)
  - [ ] Currency select
  - [ ] Media URL input
  - [ ] Image preview
  - [ ] Configurator visibility checkbox
  - [ ] Configurator group input
  - [ ] Configurator order input
- [ ] Add option dependencies section:
  - [ ] List dependencies
  - [ ] Add dependency button
  - [ ] Remove dependency button
- [ ] Create option creation form
- [ ] Add bulk import from CSV (optional, future):
  - [ ] CSV upload button
  - [ ] CSV parsing
  - [ ] Preview imported data
  - [ ] Confirm import
- [ ] Test option CRUD operations

### Content API Functions

- [x] Create `web/src/features/admin/api/content.js` file
- [x] Implement `getVehicles(filters)` function
- [x] Implement `getVehicleById(vehicleId)` function
- [x] Implement `createVehicle(vehicleData)` function
- [x] Implement `updateVehicle(vehicleId, updates)` function
- [x] Implement `deleteVehicle(vehicleId)` function
- [x] Implement `getOptions(filters)` function
- [x] Implement `getOptionById(optionId)` function
- [x] Implement `createOption(optionData)` function
- [x] Implement `updateOption(optionId, updates)` function
- [x] Implement `deleteOption(optionId)` function
- [x] Implement `uploadImage(file, bucket)` function:
  - [x] Upload to Supabase Storage
  - [x] Return public URL
  - [x] Handle errors
- [x] Add validation helpers
- [x] Add audit logging to all functions
- [ ] Test all API functions
- [ ] Test image upload functionality

### Phase 4 Testing & Validation

- [ ] Test vehicle management
- [ ] Test options management
- [ ] Test image uploads
- [ ] Test form validations
- [ ] Test delete with cascade warnings
- [ ] Verify audit logging
- [ ] Test with different admin roles

---

## Phase 5: Manifest Editor (Week 5-7)

### Manifest List Page

- [ ] Create `web/src/pages/Admin/Manifests/ManifestList.jsx`
- [ ] Create manifest list table:
  - [ ] Columns: Slug, Vehicle Model, Version, Status, Created By, Created At, Published At, Actions
  - [ ] Filter by status (draft/published/archived)
  - [ ] Filter by vehicle model
  - [ ] Search by slug
  - [ ] Sort by any column
- [x] Add action buttons:
  - [x] Edit button (navigate to editor - placeholder)
  - [x] Publish button (for drafts)
  - [x] Archive button (for published)
- [x] Add "Create Manifest" button (placeholder)
- [ ] Test manifest list page

### Manifest Editor Main Component

- [ ] Create `web/src/features/admin/components/ManifestEditor/ManifestEditor.jsx`
- [ ] Create `web/src/features/admin/components/ManifestEditor/ManifestEditor.module.css`
- [ ] Design editor layout:
  - [ ] Left sidebar (LayerTree)
  - [ ] Center (LivePreview)
  - [ ] Right panel (Properties)
  - [ ] Bottom panel (VariantManager)
- [ ] Set up state management:
  - [ ] Manifest data state
  - [ ] Selected layer state
  - [ ] Selected variant state
  - [ ] Current angle state
- [ ] Implement auto-save draft:
  - [ ] Debounced save (every 30 seconds)
  - [ ] Save on blur
  - [ ] Show save indicator
- [ ] Implement validation on change:
  - [ ] Validate JSON structure
  - [ ] Check required fields
  - [ ] Show validation errors
- [ ] Add toolbar:
  - [ ] Save button
  - [ ] Publish button
  - [ ] Preview button
  - [ ] Export JSON button
- [ ] Test editor layout
- [ ] Test state management
- [ ] Test auto-save

### Layer Tree Component

- [ ] Create `web/src/features/admin/components/ManifestEditor/LayerTree.jsx`
- [ ] Create `web/src/features/admin/components/ManifestEditor/LayerTree.module.css`
- [ ] Implement hierarchical layer display:
  - [ ] Render layers in order
  - [ ] Show layer ID and type
  - [ ] Indent based on dependencies
- [ ] Implement drag-and-drop reordering:
  - [ ] Use react-beautiful-dnd or similar
  - [ ] Update z-index on reorder
  - [ ] Prevent invalid reorders
- [ ] Add layer actions:
  - [ ] Add layer button
  - [ ] Remove layer button
  - [ ] Duplicate layer button
- [ ] Implement layer selection:
  - [ ] Highlight selected layer
  - [ ] Show layer in properties panel
- [ ] Add z-index visualization:
  - [ ] Show z-index number
  - [ ] Visual indicator of order
- [ ] Add dependency indicators:
  - [ ] Show dependency icons
  - [ ] Highlight dependent layers
- [ ] Test layer tree functionality
- [ ] Test drag-and-drop
- [ ] Test layer selection

### Dependency Matrix Component

- [ ] Create `web/src/features/admin/components/ManifestEditor/DependencyMatrix.jsx`
- [ ] Create `web/src/features/admin/components/ManifestEditor/DependencyMatrix.module.css`
- [ ] Implement visual dependency graph:
  - [ ] Matrix view (layers x layers)
  - [ ] Checkboxes for dependencies
  - [ ] Visual connections
- [ ] Add dependency management:
  - [ ] Add dependency (check checkbox)
  - [ ] Remove dependency (uncheck checkbox)
- [ ] Implement circular dependency detection:
  - [ ] Check for cycles on change
  - [ ] Show warning if cycle detected
  - [ ] Prevent invalid dependencies
- [ ] Add visual warnings:
  - [ ] Highlight circular dependencies
  - [ ] Show error messages
- [ ] Test dependency matrix
- [ ] Test circular detection
- [ ] Test dependency management

### Variant Manager Component

- [ ] Create `web/src/features/admin/components/ManifestEditor/VariantManager.jsx`
- [ ] Create `web/src/features/admin/components/ManifestEditor/VariantManager.module.css`
- [ ] Implement variant list:
  - [ ] Show all variants
  - [ ] Group by category (optional)
  - [ ] Search variants
- [ ] Add variant actions:
  - [ ] Add variant button
  - [ ] Edit variant button
  - [ ] Delete variant button
- [ ] Create variant form:
  - [ ] Key input
  - [ ] Label input
  - [ ] Category select
  - [ ] Dependencies multi-select
  - [ ] Incompatibilities multi-select
  - [ ] Default checkbox
- [ ] Implement variant to asset URL mapping:
  - [ ] Show asset URLs per variant
  - [ ] Edit asset URLs
  - [ ] Add/remove asset URLs
- [ ] Add asset upload functionality:
  - [ ] Upload button per asset
  - [ ] Upload to Supabase Storage
  - [ ] Show upload progress
  - [ ] Update asset URL after upload
- [ ] Add asset preview:
  - [ ] Show image preview
  - [ ] Show for each angle
- [ ] Test variant management
- [ ] Test asset upload
- [ ] Test asset mapping

### Live Preview Component

- [ ] Create `web/src/features/admin/components/ManifestEditor/LivePreview.jsx`
- [ ] Create `web/src/features/admin/components/ManifestEditor/LivePreview.module.css`
- [ ] Implement composed image rendering:
  - [ ] Load images from manifest
  - [ ] Compose layers in z-index order
  - [ ] Show selected angle
- [ ] Add angle selector:
  - [ ] Dropdown or tabs
  - [ ] Switch between angles
- [ ] Implement variant selection:
  - [ ] Select variants per layer
  - [ ] Update preview on change
- [ ] Add zoom/pan controls:
  - [ ] Zoom in/out buttons
  - [ ] Pan with mouse drag
  - [ ] Reset view button
- [ ] Add export preview image:
  - [ ] Export button
  - [ ] Download composed image
- [ ] Optimize image loading:
  - [ ] Lazy load images
  - [ ] Cache loaded images
- [ ] Test preview rendering
- [ ] Test variant switching
- [ ] Test zoom/pan

### Publishing Workflow Component

- [ ] Create `web/src/features/admin/components/ManifestEditor/PublishWorkflow.jsx`
- [ ] Create `web/src/features/admin/components/ManifestEditor/PublishWorkflow.module.css`
- [ ] Implement validation step:
  - [ ] Check required fields
  - [ ] Verify asset URLs exist (API call)
  - [ ] Check for circular dependencies
  - [ ] Validate JSON structure
  - [ ] Show validation results
- [ ] Add version increment:
  - [ ] Show current version
  - [ ] Show new version
  - [ ] Allow manual version override
- [ ] Implement archive old version:
  - [ ] Show current published version
  - [ ] Confirm archiving
- [ ] Add publish action:
  - [ ] Call publish API
  - [ ] Show loading state
  - [ ] Handle success (show success message)
  - [ ] Handle errors (show error message)
- [ ] Add confirmation modal:
  - [ ] Show validation summary
  - [ ] Show version info
  - [ ] Confirm publish button
- [ ] Test validation
- [ ] Test publishing workflow
- [ ] Test error handling

### Manifest API Functions

- [x] Create `web/src/features/admin/api/manifests.js` file
- [x] Implement `getManifests(filters)` function
- [x] Implement `getManifestById(manifestId)` function
- [x] Implement `createManifest(manifestData)` function
- [x] Implement `updateManifest(manifestId, updates)` function
- [x] Implement `publishManifest(manifestId)` function:
  - [x] Archive old version
  - [x] Increment version
  - [x] Update status to published
  - [x] Log admin action
- [x] Implement `archiveManifest(manifestId)` function
- [x] Implement `getManifestVersions(manifestSlug)` function
- [x] Implement `rollbackManifest(manifestId, targetVersion)` function
- [x] Implement `validateManifest(manifestData)` function
- [x] Add validation helpers
- [x] Add audit logging
- [ ] Test all API functions
- [ ] Test publishing workflow end-to-end

### Phase 5 Testing & Validation

- [ ] Test manifest editor loads correctly
- [ ] Test layer management
- [ ] Test dependency management
- [ ] Test variant management
- [ ] Test asset uploads
- [ ] Test live preview
- [ ] Test publishing workflow
- [ ] Test validation
- [ ] Test rollback functionality
- [ ] Test with different admin roles

---

## Phase 6: Analytics & Monitoring Dashboard (Week 7-8)

### Analytics Dashboard

- [ ] Create `web/src/pages/Admin/Analytics/AnalyticsDashboard.jsx`
- [ ] Create `web/src/pages/Admin/Analytics/AnalyticsDashboard.module.css`
- [ ] Set up React Query for analytics data
- [ ] Create key metrics widgets:
  - [ ] Total users count (with growth chart)
  - [ ] Active configurations count
  - [ ] Most popular options (top 10 list)
  - [ ] Configurator usage by angle (pie chart)
  - [ ] User retention metrics (line chart)
- [x] Add date range selector:
  - [x] Start date picker
  - [x] End date picker
- [x] Implement data fetching with date range
- [ ] Add export functionality:
  - [ ] Export to CSV button
  - [ ] Export to PDF button (optional)
- [x] Add loading states
- [x] Add error states
- [ ] Test dashboard loads correctly
- [ ] Test date range filtering
- [ ] Test export functionality

### User Activity Reports

- [ ] Create `web/src/pages/Admin/Analytics/UserActivity.jsx`
- [ ] Create user activity timeline:
  - [ ] Show user actions over time
  - [ ] Filter by user
  - [ ] Filter by action type
- [ ] Create most active users section:
  - [ ] List top users by activity
  - [ ] Show activity count
- [ ] Create sign-up trends chart:
  - [ ] Line chart of sign-ups over time
  - [ ] Group by day/week/month
- [ ] Create login frequency metrics:
  - [ ] Average logins per user
  - [ ] Most frequent loggers
- [ ] Create feature usage statistics:
  - [ ] Configurator usage
  - [ ] Garage usage
  - [ ] Sharing usage
- [ ] Test user activity reports
- [ ] Test filtering and grouping

### Audit Log Viewer

- [x] Create `web/src/pages/Admin/Analytics/AuditLogs.jsx`
- [x] Create filterable audit log table:
  - [ ] Columns: Timestamp, Admin, Action, Resource Type, Resource ID, Details, IP Address
  - [ ] Filter by admin (dropdown)
  - [ ] Filter by action (dropdown)
  - [ ] Filter by resource type (dropdown)
  - [ ] Filter by date range
  - [ ] Search in details (JSON search)
- [x] Add pagination (100 logs per page)
- [ ] Add export audit logs:
  - [ ] Export filtered results to CSV
  - [ ] Export to JSON
- [ ] Add detailed action view:
  - [ ] Click row to expand details
  - [ ] Show full JSON details
  - [ ] Show IP address and user agent
- [ ] Test audit log viewer
- [ ] Test filtering
- [ ] Test export

### Analytics API Functions

- [x] Create `web/src/features/admin/api/analytics.js` file
- [x] Implement `getUserMetrics(dateRange)` function
- [x] Implement `getConfigurationMetrics(dateRange)` function
- [x] Implement `getAuditLogs(filters)` function
- [x] Add date range filtering to functions
- [ ] Implement `getPopularOptions(limit)` function
- [ ] Implement `getConfiguratorUsage(dateRange)` function
- [ ] Implement `getUserRetention(dateRange)` function
- [ ] Implement `getUserActivity(filters)` function
- [ ] Implement `getSignUpTrends(groupBy)` function
- [ ] Implement `getLoginFrequency()` function
- [ ] Implement `getFeatureUsage(dateRange)` function
- [ ] Add caching for performance (optional)
- [ ] Test all analytics functions
- [ ] Verify data accuracy

### Phase 6 Testing & Validation

- [ ] Test analytics dashboard loads
- [ ] Test all metrics widgets
- [ ] Test date range filtering
- [ ] Test user activity reports
- [ ] Test audit log viewer
- [ ] Test export functionality
- [ ] Verify data accuracy
- [ ] Test performance with large datasets

---

## Phase 7: System Settings & Configuration (Week 8)

### System Settings Page

- [x] Create `web/src/pages/Admin/Settings/SystemSettings.jsx`
- [x] Create `web/src/pages/Admin/Settings/SystemSettings.module.css`
- [x] Create general settings section:
  - [ ] Site name input
  - [ ] Logo URL input
  - [ ] Logo preview
  - [ ] Default locale select
  - [ ] Maintenance mode toggle
- [ ] Create email settings section:
  - [ ] SMTP host input
  - [ ] SMTP port input
  - [ ] SMTP username input
  - [ ] SMTP password input (masked)
  - [ ] From email input
  - [ ] Test email button
- [ ] Create email templates section:
  - [ ] Welcome email template editor
  - [ ] Password reset template editor
  - [ ] Order confirmation template editor
- [ ] Create storage settings section:
  - [ ] CDN base URL input
  - [ ] Storage bucket names (read-only)
  - [ ] Storage bucket configuration
- [ ] Create feature flags section:
  - [ ] Toggle for each feature
  - [ ] Feature description
  - [ ] A/B test configuration (optional)
- [x] Implement save functionality:
  - [x] Save button with placeholder
  - [x] Show save success message
  - [x] Handle errors
- [ ] Test system settings page
- [ ] Test saving settings
- [ ] Verify settings persist

### Role Management Page (Super Admin Only)

- [ ] Create `web/src/pages/Admin/Settings/RoleManagement.jsx`
- [ ] Create `web/src/pages/Admin/Settings/RoleManagement.module.css`
- [ ] Add RequireAdmin with `requiredRole="super_admin"`
- [ ] Create role list view:
  - [ ] Show all roles
  - [ ] Show permissions per role
- [ ] Create permission editor:
  - [ ] Select role
  - [ ] Show permissions grid (resource x action)
  - [ ] Toggle permissions (checkboxes)
  - [ ] Save permissions
- [ ] Add create custom role (future, optional):
  - [ ] Role name input
  - [ ] Select permissions
  - [ ] Create role button
- [ ] Add assign roles to users:
  - [ ] User selector
  - [ ] Role selector
  - [ ] Assign button
- [ ] Test role management
- [ ] Test permission editing
- [ ] Verify only super_admin can access

### Settings API Functions

- [ ] Create `web/src/features/admin/api/settings.js` file
- [ ] Implement `getSystemSettings()` function
- [ ] Implement `updateSystemSettings(settings)` function
- [ ] Implement `getRolePermissions(role)` function
- [ ] Implement `updateRolePermissions(role, permissions)` function
- [ ] Implement `assignRoleToUser(userId, role)` function
- [ ] Add validation
- [ ] Add audit logging
- [ ] Test all settings API functions
- [ ] Verify settings persist correctly

### Phase 7 Testing & Validation

- [ ] Test system settings page
- [ ] Test role management (as super_admin)
- [ ] Test role management access (as non-super_admin)
- [ ] Test settings persistence
- [ ] Test permission updates
- [ ] Verify audit logging

---

## Final Testing & Deployment

### Integration Testing

- [ ] Test complete admin workflow:
  - [ ] Login as admin
  - [ ] Create user
  - [ ] Edit user
  - [ ] Create vehicle
  - [ ] Create manifest
  - [ ] Publish manifest
  - [ ] View analytics
- [ ] Test with different admin roles:
  - [ ] Super admin (full access)
  - [ ] Content admin (limited access)
  - [ ] Support admin (limited access)
- [ ] Test unauthorized access attempts
- [ ] Test audit logging for all actions
- [ ] Test error scenarios
- [ ] Test performance with large datasets

### Security Testing

- [ ] Test RLS policies block unauthorized access
- [ ] Test role checks on all endpoints
- [ ] Test permission checks work correctly
- [ ] Test session expiration handling
- [ ] Test CSRF protection (if implemented)
- [ ] Test XSS prevention in admin inputs
- [ ] Test SQL injection prevention
- [ ] Review audit logs for security events

### Performance Testing

- [ ] Test dashboard load time (<2s target)
- [ ] Test API response times (<500ms target)
- [ ] Test with 1000+ users
- [ ] Test with 100+ manifests
- [ ] Test real-time updates latency
- [ ] Optimize slow queries
- [ ] Add database indexes if needed
- [ ] Test pagination performance

### Documentation

- [ ] Document admin roles and permissions
- [ ] Document admin API functions
- [ ] Create admin user guide
- [ ] Document deployment process
- [ ] Create troubleshooting guide
- [ ] Document security considerations
- [ ] Update main README with admin info

### Deployment

- [ ] Run all SQL migrations in production
- [ ] Deploy Edge Functions
- [ ] Deploy frontend changes
- [ ] Create first admin user
- [ ] Test admin access in production
- [ ] Monitor error logs
- [ ] Set up monitoring alerts
- [ ] Create backup of admin data

---

## Maintenance & Future Enhancements

### Ongoing Tasks

- [ ] Monitor admin audit logs weekly
- [ ] Review admin user access quarterly
- [ ] Update admin documentation as needed
- [ ] Review and optimize slow queries monthly
- [ ] Update dependencies regularly
- [ ] Review security policies quarterly

### Future Enhancements (Not in Scope)

- [ ] Two-factor authentication for admins
- [ ] Admin activity notifications
- [ ] Advanced analytics with ML insights
- [ ] Custom role creation UI
- [ ] Admin impersonation feature
- [ ] Advanced search across all resources
- [ ] Bulk operations improvements
- [ ] Admin mobile app (optional)

---

**End of Checklist**

**Total Checklist Items:** ~400+  
**Estimated Completion Time:** 8-12 weeks  
**Priority:** Critical for Phase 3.1 Manifest Editor

---

## Implementation Status Summary

**Last Updated:** 2025-01-XX

### Completed ✅
- **Phase 0:** Database schema, RLS policies, permissions, audit logging (100%)
- **Phase 1:** Admin auth store, route guards, API client, routes (100%)
- **Phase 2:** Admin layout, dashboard, UI component library (100%)
- **Phase 3:** User management (list, detail, create, API, Edge Function) (95%)
- **Phase 4:** Vehicle management (list, detail, API) (80% - missing options pages)
- **Phase 5:** Manifest list, API functions, publishing workflow (60% - missing editor UI)
- **Phase 6:** Analytics dashboard, audit logs viewer, API functions (80%)
- **Phase 7:** System settings page (basic implementation) (50%)

### Remaining Work 🔄
- **Phase 3:** User activity timeline, email fetching improvements
- **Phase 4:** Options management pages, vehicle creation page
- **Phase 5:** Manifest Editor UI components (LayerTree, DependencyMatrix, VariantManager, LivePreview)
- **Phase 6:** Advanced analytics (user activity reports, sign-up trends)
- **Phase 7:** Settings API functions, role management UI, email/storage settings

### Next Steps
1. Run SQL migrations in Supabase
2. Deploy Edge Function
3. Create first admin user
4. Test admin routes and functionality
5. Complete manifest editor UI components

