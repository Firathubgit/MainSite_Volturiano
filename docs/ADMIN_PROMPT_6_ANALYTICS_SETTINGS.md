# Admin Frontend Implementation - Prompt 6: Advanced Analytics & Settings

**Priority:** Medium (polish and enhancements)  
**Estimated Time:** 4-5 days  
**Dependencies:** Prompt 1 (UI Components) must be complete

---

## Objective

Complete the admin system with advanced analytics features and enhanced settings pages. These are the final polish features that make the admin system production-ready.

---

## 1. User Activity Reports

**File:** `web/src/pages/Admin/Analytics/UserActivity.jsx`  
**CSS:** `web/src/pages/Admin/Analytics/UserActivity.module.css`

### Features

**User Activity Timeline:**
- Timeline view showing user actions over time
- Filter by user (dropdown with search)
- Filter by action type (dropdown: login, config_save, garage_add, etc.)
- Date range selector (start date, end date)
- Group by: Day / Week / Month
- Visual timeline with events plotted

**Most Active Users Section:**
- Top 10 users by activity count
- Bar chart showing activity counts
- Click user to see detailed activity
- Show: User email, activity count, last active date

**Sign-Up Trends Chart:**
- Line chart showing sign-ups over time
- X-axis: Time (days/weeks/months)
- Y-axis: Number of sign-ups
- Group by: Day / Week / Month (dropdown)
- Show trend line (increasing/decreasing)
- Use recharts library (already installed)

**Login Frequency Metrics:**
- Average logins per user (number)
- Most frequent loggers (top 10 list)
- Login frequency distribution chart (histogram)
- Show: User email, login count, last login

**Feature Usage Statistics:**
- Configurator usage (count, percentage)
- Garage usage (count, percentage)
- Sharing usage (count, percentage)
- Pie chart showing feature distribution
- Time period selector (last 7 days, 30 days, 90 days, all time)

### Data Source

Use functions from `web/src/features/admin/api/analytics.js`:
- `getUserActivity(filters)` - Get activity timeline
- `getSignUpTrends(groupBy)` - Get sign-up data
- `getLoginFrequency()` - Get login metrics
- `getFeatureUsage(dateRange)` - Get feature usage stats

### Layout

```
┌─ User Activity Reports ──────────────────────┐
│ [Last 7 days ▼] [Export CSV]                 │
│                                                │
│ ┌─ Filters ───────────────────────────────┐ │
│ │ User: [All Users ▼]                      │ │
│ │ Action: [All Actions ▼]                 │ │
│ │ Date Range: [Start] [End]                │ │
│ └──────────────────────────────────────────┘ │
│                                                │
│ ┌─ Sign-Up Trends ────────────────────────┐ │
│ │ [Line Chart]                              │ │
│ └───────────────────────────────────────────┘ │
│                                                │
│ ┌─ Most Active Users ─────────────────────┐ │
│ │ [Bar Chart]                               │ │
│ └──────────────────────────────────────────┘ │
│                                                │
│ ┌─ Feature Usage ─────────────────────────┐ │
│ │ [Pie Chart]                               │ │
│ └───────────────────────────────────────────┘ │
└────────────────────────────────────────────────┘
```

---

## 2. Enhanced Audit Log Viewer

**File:** `web/src/pages/Admin/Analytics/AuditLogs.jsx`  
**Current:** Basic table exists  
**Enhancements Needed:**

### Enhanced Features

**Detailed Action View:**
- Click row to expand details (accordion or modal)
- Show full JSON details (formatted, syntax highlighted)
- Show IP address and user agent
- Show timestamp (formatted, relative time)
- Show admin email and role

**Better Filtering UI:**
- Date range picker (calendar component)
- Multi-select dropdowns for:
  - Admin (multiple admins)
  - Action type (multiple actions)
  - Resource type (multiple resources)
- Filter chips showing active filters
- Clear all filters button

**Export Functionality:**
- Export filtered results to CSV
- Export filtered results to JSON
- Export button in toolbar
- Show export progress

**Real-Time Updates:**
- Poll every 30 seconds for new logs (optional toggle)
- Or use Supabase realtime subscriptions
- Show "New logs available" indicator
- Auto-scroll to top when new logs arrive

**Enhanced Table:**
- Better column formatting
- Truncate long JSON details (show "View Details" link)
- Color-code by action type (create=green, update=blue, delete=red)
- Show relative time (e.g., "2 hours ago")

### Layout Updates

```
┌─ Audit Logs ─────────────────────────────────┐
│ [Export CSV] [Export JSON] [Auto-refresh ☑] │
│                                                │
│ ┌─ Filters ───────────────────────────────┐ │
│ │ Admin: [Select admins...]                │ │
│ │ Action: [Select actions...]              │ │
│ │ Resource: [Select resources...]          │ │
│ │ Date Range: [Start] [End]                │ │
│ │ [Clear Filters]                          │ │
│ └──────────────────────────────────────────┘ │
│                                                │
│ ┌─ Logs Table ─────────────────────────────┐ │
│ │ Time │ Admin │ Action │ Resource │ ... │ │
│ ├──────────────────────────────────────────┤ │
│ │ 2h   │ admin │ Create │ User     │ ... │ │
│ │      │       │        │          │     │ │
│ │      │ [Expanded Details]                │ │
│ │      │ IP: 192.168.1.1                    │ │
│ │      │ User Agent: Chrome...              │ │
│ │      │ Details: { ... }                   │ │
│ └──────────────────────────────────────────┘ │
└────────────────────────────────────────────────┘
```

---

## 3. System Settings Form

**File:** `web/src/pages/Admin/Settings/SystemSettings.jsx`  
**Current:** Basic page exists  
**Enhancements Needed:**

### General Settings Section

- **Site name input:** Text input
- **Logo URL input:** Text input with preview
- **Default locale select:** Dropdown (en, sv, etc.)
- **Maintenance mode toggle:** Switch (enable/disable maintenance mode)
- **Maintenance message textarea:** Shown when maintenance mode is on

### Email Settings Section

- **SMTP host input:** Text input
- **SMTP port input:** Number input
- **SMTP username input:** Text input
- **SMTP password input:** Password input (masked)
- **From email input:** Email input
- **Test email button:** Sends test email, shows success/error

### Storage Settings Section

- **CDN base URL input:** Text input (e.g., "https://cdn.volturiano.com")
- **Storage bucket names:** Read-only display (list of buckets)
- **Storage bucket configuration:** Read-only display (bucket settings)

### Feature Flags Section

- **Toggle switches for each feature:**
  - Configurator enabled
  - Garage enabled
  - Sharing enabled
  - Analytics enabled
  - (Add more as needed)
- **Feature description:** Show description below each toggle
- **Feature status badge:** Show enabled/disabled status

### Save Functionality

- **Save button:** Saves all settings
- **Save per section:** Optional - save buttons per section
- **Loading state:** Show while saving
- **Success message:** Show "Settings saved" notification
- **Error handling:** Show error messages per field or general

### API Integration

Create/update `web/src/features/admin/api/settings.js`:

```javascript
export async function getSystemSettings() {
  // Fetch from Supabase or Edge Function
}

export async function updateSystemSettings(settings) {
  // Update settings
  // Log admin action
}
```

### Layout

```
┌─ System Settings ────────────────────────────┐
│                                                │
│ ┌─ General Settings ───────────────────────┐ │
│ │ Site Name: [Volturiano]                   │ │
│ │ Logo URL: [https://...] [Preview]        │ │
│ │ Default Locale: [English ▼]              │ │
│ │ Maintenance Mode: [Toggle]                │ │
│ └──────────────────────────────────────────┘ │
│                                                │
│ ┌─ Email Settings ─────────────────────────┐ │
│ │ SMTP Host: [smtp.example.com]            │ │
│ │ SMTP Port: [587]                          │ │
│ │ SMTP Username: [user@example.com]        │ │
│ │ SMTP Password: [••••••••]                │ │
│ │ From Email: [noreply@volturiano.com]     │ │
│ │ [Send Test Email]                         │ │
│ └──────────────────────────────────────────┘ │
│                                                │
│ ┌─ Feature Flags ───────────────────────────┐ │
│ │ Configurator: [Toggle] Enabled            │ │
│ │ Garage: [Toggle] Enabled                 │ │
│ │ Sharing: [Toggle] Enabled                │ │
│ └──────────────────────────────────────────┘ │
│                                                │
│ [Cancel]              [Save All Settings]     │
└────────────────────────────────────────────────┘
```

---

## 4. Role Management Page (Super Admin Only)

**File:** `web/src/pages/Admin/Settings/RoleManagement.jsx`  
**CSS:** `web/src/pages/Admin/Settings/RoleManagement.module.css`

### Features

**Role List View:**
- Show all roles (super_admin, content_admin, support_admin, user)
- Show permissions summary per role (e.g., "Full access", "Content only")
- Show user count per role
- Click role to edit permissions

**Permission Editor:**
- Select role dropdown
- Show permissions grid (resource × action matrix)
- Resources: users, vehicles, options, manifests, settings, analytics
- Actions: read, write, delete, publish (varies by resource)
- Toggle permissions (checkboxes)
- Save button (updates permissions in database)

**Assign Roles to Users:**
- User selector dropdown (searchable)
- Role selector dropdown
- Assign button (updates user role)
- Show current role for selected user
- Confirmation modal before assigning

### Access Control

Wrap with `<RequireAdmin requiredRole="super_admin" />` to restrict access.

### Layout

```
┌─ Role Management ────────────────────────────┐
│                                                │
│ ┌─ Roles ─────────────────────────────────┐ │
│ │ • Super Admin (5 users) [Edit]          │ │
│ │ • Content Admin (3 users) [Edit]        │ │
│ │ • Support Admin (2 users) [Edit]        │ │
│ └──────────────────────────────────────────┘ │
│                                                │
│ ┌─ Permissions ────────────────────────────┐ │
│ │ Role: [Content Admin ▼]                  │ │
│ │                                            │ │
│ │        Read  Write  Delete  Publish       │ │
│ │ Users   ✓     ✗      ✗       ✗           │ │
│ │ Vehicles ✓   ✓      ✓       ✗           │ │
│ │ Manifests ✓  ✓      ✓       ✓           │ │
│ │                                            │ │
│ │ [Save Permissions]                        │ │
│ └──────────────────────────────────────────┘ │
│                                                │
│ ┌─ Assign Role ────────────────────────────┐ │
│ │ User: [Select user...]                    │ │
│ │ Role: [Select role...]                   │ │
│ │ [Assign Role]                             │ │
│ └──────────────────────────────────────────┘ │
└────────────────────────────────────────────────┘
```

---

## 5. API Functions Needed

Create/update `web/src/features/admin/api/settings.js`:

```javascript
export async function getSystemSettings() {
  // Fetch from Supabase table or Edge Function
}

export async function updateSystemSettings(settings) {
  // Update settings
  // Log admin action
}

export async function getRolePermissions(role) {
  // Fetch permissions for role
}

export async function updateRolePermissions(role, permissions) {
  // Update permissions
  // Log admin action
}

export async function assignRoleToUser(userId, role) {
  // Update user role in profiles table
  // Log admin action
}

export async function sendTestEmail(emailSettings) {
  // Call Edge Function to send test email
}
```

---

## 6. Route Setup

Add routes to `web/src/app/App.jsx`:

```javascript
<Route
  path="/admin/analytics/user-activity"
  element={
    <RequireAdmin>
      <UserActivity />
    </RequireAdmin>
  }
/>

<Route
  path="/admin/settings/roles"
  element={
    <RequireAdmin requiredRole="super_admin">
      <RoleManagement />
    </RequireAdmin>
  }
/>
```

---

## Implementation Notes

- **Charts:** Use recharts library (already installed) for all charts
- **Date Pickers:** Use a date picker library or native HTML5 date inputs
- **Form Management:** Use react-hook-form for settings forms
- **Real-time:** Consider Supabase realtime for audit logs
- **Export:** Use CSV/JSON export libraries or manual formatting
- **Permissions:** Store in `admin_permissions` table (already exists)

---

## Deliverables

1. User Activity Reports page with charts
2. Enhanced Audit Log Viewer with filtering and export
3. System Settings form with all sections
4. Role Management page (super admin only)
5. Settings API functions
6. Routes configured
7. Navigation updated

---

## Completion

After completing this prompt, the admin system is **complete**! All major features are implemented and ready for production use.

