<!-- 9f5ca35d-4051-4400-8727-2c70ca04180b 04602220-37e9-4b04-8365-41c1f162cf74 -->
# Phase 10: Volturiano Agency Services Page - Backend Integration Plan

## Overview

This phase focuses on **backend functionality and integration** for the Volturiano Agency services page (`/agency`). The frontend will be developed by a senior frontend engineer, and this plan specifies the requirements, backend endpoints, database schema, and integration steps needed to connect the frontend to the Volturiano backend infrastructure.

## Implementation Approach

### Step 1: Frontend Requirements Specification
**Status:** ✅ Complete

Create a detailed specification document for the frontend engineer outlining:
- Required UI components and their functionality
- Button actions and expected behaviors
- Form fields and validation requirements
- API endpoints to call
- Expected data structures
- Integration points with existing Volturiano platform

### Step 2: Frontend Code Integration
**Status:** ✅ Complete (2025-01-XX)

Once frontend code is received:
- Integrate frontend components into main Volturiano codebase
- Set up routing (`/agency` route)
- Connect UI components to backend services
- Ensure styling matches Volturiano brand guidelines

### Step 3: Backend Implementation & Connection
**Status:** ⏳ Pending Backend Implementation

Build and connect backend functionality:
- Database schema for inquiries and demo requests
- Edge Functions for form submissions
- Email notification system
- Admin dashboard integration for lead management

---

## Step 1: Frontend Requirements Specification
**Status:** ✅ Complete

The frontend requirements specification has been created and provided to the frontend engineer. All required components, API endpoints, and integration points have been documented.

### 1.1 Page Structure Requirements

**Route:** `/agency` (public route, no authentication required)

**Required Sections:**
1. Hero Section
2. Service Showcase (5 service cards)
3. Case Study Section
4. Contact Form Modal
5. Demo Request Modal
6. Pricing Overview Section
7. FAQ Section (optional, future)
8. Testimonials Section (optional, future)

### 1.2 Required UI Components & Functionality

#### Hero Section
- **Headline:** "Transform Your Business with Premium Software Solutions"
- **Subheadline:** "3D Configurators • Fullstack Development • Luxury UI Design • Admin Dashboards • Supabase Backends"
- **Primary CTA Button:** "Get Started" 
  - Action: Opens Contact Form Modal
  - Button ID/Class: `agency-hero-cta-primary`
- **Secondary CTA Button:** "View Case Study"
  - Action: Smooth scroll to Case Study Section
  - Button ID/Class: `agency-hero-cta-secondary`

#### Service Cards (5 Services)
Each service card must include:
- Service icon/illustration
- Service title
- Brief description (2-3 sentences)
- Key features list (3-5 bullet points)
- **"Learn More" Button**
  - Action: Expand to detailed view OR open Service Detail Modal
  - Button ID/Class: `service-card-learn-more-{service-id}`
  - Data attribute: `data-service-id="{service-id}"`
- **"Request Demo" Button**
  - Action: Opens Demo Request Modal with pre-filled service
  - Button ID/Class: `service-card-demo-{service-id}`
  - Data attribute: `data-service-id="{service-id}"`
- **"Get Quote" Button**
  - Action: Opens Contact Form Modal with pre-filled service interest
  - Button ID/Class: `service-card-quote-{service-id}`
  - Data attribute: `data-service-id="{service-id}"`

**Service IDs:**
1. `3d-configurators`
2. `fullstack-websites`
3. `luxury-ui-design`
4. `admin-dashboards`
5. `supabase-backends`

#### Contact Form Modal
**Required Fields:**
- Name (text input, required)
- Email (email input, required)
- Company (text input, optional)
- Service Interest (multi-select checkbox group, at least one required)
  - Options: "3D Configurator", "Fullstack Website", "UI Design", "Admin Dashboard", "Supabase Backend"
- Budget Range (dropdown select, required)
  - Options: "$5k-$10k", "$10k-$25k", "$25k-$50k", "$50k-$100k", "$100k+", "Custom"
- Project Timeline (dropdown select, required)
  - Options: "1-2 months", "3-4 months", "5-6 months", "6+ months", "Flexible"
- Message (textarea, optional, max 2000 chars)
- Privacy Consent (checkbox, required)
  - Text: "I agree to be contacted by Volturiano regarding my inquiry"

**Buttons:**
- **Submit Button**
  - Action: Validate form → Call API endpoint → Show success/error message
  - Button ID/Class: `contact-form-submit`
  - Disable during submission, show loading state
- **Cancel/Close Button**
  - Action: Close modal, reset form
  - Button ID/Class: `contact-form-cancel`

**API Endpoint to Call:** `POST /functions/v1/send-agency-inquiry`
**Expected Request Body:**
```json
{
  "name": "string",
  "email": "string",
  "company": "string | null",
  "service_interests": ["string"],
  "budget_range": "string",
  "project_timeline": "string",
  "message": "string | null"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Thank you! We'll be in touch soon.",
  "inquiry_id": "uuid"
}
```

#### Demo Request Modal
**Required Fields:**
- Name (text input, required)
- Email (email input, required)
- Company (text input, optional)
- Preferred Service (dropdown select, required)
  - Options: Same as service cards
- Preferred Date (date picker, required)
- Preferred Time (time picker, required)
- Timezone (dropdown select, required)
  - Options: Common timezones (UTC, EST, PST, CET, etc.)
- Meeting Type (radio buttons, required)
  - Options: "Video Call", "Phone Call", "In-Person"
- Additional Notes (textarea, optional, max 1000 chars)

**Buttons:**
- **Submit Button**
  - Action: Validate form → Call API endpoint → Show success/error message
  - Button ID/Class: `demo-request-submit`
  - Disable during submission, show loading state
- **Cancel/Close Button**
  - Action: Close modal, reset form
  - Button ID/Class: `demo-request-cancel`

**API Endpoint to Call:** `POST /functions/v1/schedule-demo`
**Expected Request Body:**
```json
{
  "name": "string",
  "email": "string",
  "company": "string | null",
  "preferred_service": "string",
  "preferred_datetime": "ISO 8601 datetime string",
  "timezone": "string",
  "meeting_type": "video" | "phone" | "in-person",
  "additional_notes": "string | null"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Demo request received! We'll confirm the time shortly.",
  "demo_request_id": "uuid"
}
```

#### Case Study Section
- Visual showcase of Volturiano platform
- Sections: Challenge, Solution, Results
- Tech stack badges
- **"See it in Action" Button**
  - Action: Navigate to `/configurator` (public route)
  - Button ID/Class: `case-study-cta`

#### Pricing Overview Section
- Service-based pricing cards
- "Starting from" pricing (if applicable)
- "Custom pricing" for enterprise
- **"Contact for Quote" Buttons**
  - Action: Opens Contact Form Modal
  - Button ID/Class: `pricing-contact-{service-id}`

### 1.3 Design Requirements

**Brand Guidelines:**
- Base: Volturiano dark theme (#0a0a0a background)
- Accents: Brand orange (#ff4520) for CTAs
- Sections: Lighter backgrounds (#1a1a1a) for service cards
- Typography: Match existing Volturiano site font family
- Responsive: Mobile-first, breakpoints match main site

**Component Styling:**
- Use CSS Modules (`.module.css` files)
- Match existing Volturiano component patterns
- Smooth animations/transitions (Framer Motion preferred)
- Accessible (WCAG 2.1 AA compliance)

### 1.4 Integration Points

**Navigation:**
- Add "Agency" link to main NavBar component
- Position: After "Models", before "Configurator"
- Highlight when on `/agency` route

**Routing:**
- Add route in `web/src/app/App.jsx`: `/agency` → `<Agency />`
- Update `usePageTitle` hook: `/agency` → "Volturiano Agency – Premium Software Services"

**File Structure Expected:**
```
web/src/pages/Agency/
├── Agency.jsx (main page component)
├── Agency.module.css
├── components/
│   ├── HeroSection.jsx
│   ├── ServiceCard.jsx
│   ├── ServiceDetailModal.jsx (optional)
│   ├── CaseStudy.jsx
│   ├── ContactFormModal.jsx
│   ├── DemoRequestModal.jsx
│   └── PricingOverview.jsx
```

### 1.5 Frontend Requirements Summary (600 chars)

**Agency Page Requirements:**
Create `/agency` page with hero, 5 service cards (3D Configurators, Fullstack Websites, Luxury UI Design, Admin Dashboards, Supabase Backends), case study section, contact form modal (name, email, company, service interests multi-select, budget, timeline, message), demo request modal (name, email, company, service, datetime, timezone, meeting type), pricing overview. All modals must call Supabase Edge Functions: `send-agency-inquiry` and `schedule-demo`. Use Volturiano dark theme (#0a0a0a) with orange CTAs (#ff4520). CSS Modules, responsive, accessible. Add "Agency" link to NavBar. Match existing Volturiano design patterns.

---

## Step 2: Frontend Code Integration
**Status:** ✅ Complete

All frontend components have been successfully integrated into the main Volturiano codebase. The Agency page is accessible at `/agency` route, navigation has been added, and all modals are configured to call the backend Edge Functions.

### 2.1 Integration Checklist

Once frontend code is received:

- [x] Review frontend code structure and component organization
- [x] Verify all required components are present
- [x] Check that button IDs/classes match specification
- [x] Ensure CSS Modules are used (not inline styles or Tailwind)
- [x] Verify responsive design works on mobile/tablet/desktop
- [x] Add route to `web/src/app/App.jsx`
- [x] Add navigation link to `web/src/components/NavDrawer/NavDrawer.jsx`
- [x] Update `web/src/hooks/usePageTitle.js` for page title
- [x] Test routing and navigation
- [x] Verify modals open/close correctly
- [x] Check form validation (client-side)
- [x] Ensure API endpoint URLs are correct (point to Supabase Edge Functions)

### 2.2 API Integration Points

**Contact Form Modal:**
- Endpoint: `https://{project-ref}.supabase.co/functions/v1/send-agency-inquiry`
- Method: POST
- Headers: `Content-Type: application/json`
- Authentication: None (public endpoint)
- Error handling: Display user-friendly error messages

**Demo Request Modal:**
- Endpoint: `https://{project-ref}.supabase.co/functions/v1/schedule-demo`
- Method: POST
- Headers: `Content-Type: application/json`
- Authentication: None (public endpoint)
- Error handling: Display user-friendly error messages

---

## Step 3: Backend Implementation & Connection

### 3.1 Database Schema
**Status:** ⏳ Pending

#### Table: `agency_inquiries`

```sql
CREATE TABLE agency_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  service_interests TEXT[] NOT NULL,
  budget_range TEXT NOT NULL,
  project_timeline TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: Admin-only access
ALTER TABLE agency_inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view agency inquiries"
  ON agency_inquiries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can update agency inquiries"
  ON agency_inquiries
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Index for admin queries
CREATE INDEX idx_agency_inquiries_status ON agency_inquiries(status);
CREATE INDEX idx_agency_inquiries_created_at ON agency_inquiries(created_at DESC);
```

#### Table: `demo_requests`

```sql
CREATE TABLE demo_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  preferred_service TEXT NOT NULL,
  preferred_datetime TIMESTAMPTZ NOT NULL,
  timezone TEXT NOT NULL,
  meeting_type TEXT NOT NULL CHECK (meeting_type IN ('video', 'phone', 'in-person')),
  additional_notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: Admin-only access
ALTER TABLE demo_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view demo requests"
  ON demo_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can update demo requests"
  ON demo_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Index for admin queries
CREATE INDEX idx_demo_requests_status ON demo_requests(status);
CREATE INDEX idx_demo_requests_preferred_datetime ON demo_requests(preferred_datetime);
CREATE INDEX idx_demo_requests_created_at ON demo_requests(created_at DESC);
```

### 3.2 Edge Functions
**Status:** ⏳ Pending

#### Function: `send-agency-inquiry`

**File:** `supabase/functions/send-agency-inquiry/index.ts`

**Purpose:**
- Receive contact form submissions
- Store inquiry in database
- Send email notification to sales team
- Send confirmation email to submitter

**Request Body:**
```typescript
{
  name: string;
  email: string;
  company?: string;
  service_interests: string[];
  budget_range: string;
  project_timeline: string;
  message?: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  message: string;
  inquiry_id?: string;
  error?: string;
}
```

**Implementation Steps:**
1. Validate request body
2. Insert into `agency_inquiries` table
3. Generate email template for sales team
4. Generate confirmation email for submitter
5. Send emails via Resend API
6. Return success response with inquiry_id

#### Function: `schedule-demo`

**File:** `supabase/functions/schedule-demo/index.ts`

**Purpose:**
- Receive demo request submissions
- Store demo request in database
- Send email notification to sales team
- Send confirmation email to requester

**Request Body:**
```typescript
{
  name: string;
  email: string;
  company?: string;
  preferred_service: string;
  preferred_datetime: string; // ISO 8601
  timezone: string;
  meeting_type: 'video' | 'phone' | 'in-person';
  additional_notes?: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  message: string;
  demo_request_id?: string;
  error?: string;
}
```

**Implementation Steps:**
1. Validate request body
2. Validate datetime is in the future
3. Insert into `demo_requests` table
4. Generate email template for sales team
5. Generate confirmation email for requester
6. Send emails via Resend API
7. Return success response with demo_request_id

### 3.3 Email Templates
**Status:** ⏳ Pending

**Email Service:** Resend (using existing `RESEND_API_KEY` secret)

**Templates Needed:**
1. **New Inquiry Notification** (to sales team)
   - Subject: "New Agency Inquiry: {service_interests}"
   - Include all form fields
   - Link to admin dashboard for inquiry management

2. **Inquiry Confirmation** (to submitter)
   - Subject: "Thank you for your inquiry - Volturiano Agency"
   - Thank you message
   - Next steps information
   - Contact information

3. **Demo Request Notification** (to sales team)
   - Subject: "New Demo Request: {preferred_service}"
   - Include all request details
   - Calendar-friendly format
   - Link to admin dashboard

4. **Demo Request Confirmation** (to requester)
   - Subject: "Demo Request Received - Volturiano Agency"
   - Confirmation of requested time
   - Next steps (we'll confirm shortly)
   - Contact information

### 3.4 Admin Dashboard Integration
**Status:** ⏳ Pending

**New Admin Pages Needed:**

1. **Agency Inquiries Page** (`/admin/agency/inquiries`)
   - Table view of all inquiries
   - Filter by status, service interest, date range
   - View inquiry details modal
   - Update status (new → contacted → qualified → closed)
   - Export to CSV

2. **Demo Requests Page** (`/admin/agency/demos`)
   - Calendar view of scheduled demos
   - Table view of all requests
   - Filter by status, service, date range
   - View request details modal
   - Update status (pending → scheduled → completed → cancelled)
   - Export to CSV

**Integration Points:**
- Add navigation items to AdminLayout
- Use existing admin table components
- Follow existing admin design patterns
- Add to admin routes in `App.jsx`

### 3.5 Rate Limiting & Spam Protection
**Status:** ⏳ Pending

**Edge Function Protection:**
- Rate limit: Max 3 submissions per email per hour
- Rate limit: Max 10 submissions per IP per hour
- Basic validation: Email format, required fields
- Honeypot field (optional, if frontend includes)

**Implementation:**
- Check submission count in last hour before processing
- Return 429 status if rate limit exceeded
- Log suspicious activity for review

---

## Step 4: Testing & Validation

### 4.1 Frontend Integration Testing

- [ ] Contact form submission works
- [ ] Demo request submission works
- [ ] Error handling displays correctly
- [ ] Success messages display correctly
- [ ] Form validation works (client-side)
- [ ] Modals open/close correctly
- [ ] Navigation works
- [ ] Responsive design works
- [ ] Page loads correctly
- [ ] All buttons trigger correct actions

### 4.2 Backend Integration Testing

- [ ] Edge Functions respond correctly
- [ ] Database inserts work
- [ ] Emails send successfully
- [ ] Rate limiting works
- [ ] Error handling works
- [ ] Admin dashboard shows inquiries
- [ ] Admin dashboard shows demo requests
- [ ] RLS policies work correctly
- [ ] Status updates work in admin

### 4.3 End-to-End Testing

- [ ] Submit contact form → Check database → Check email received
- [ ] Submit demo request → Check database → Check email received
- [ ] Admin views inquiries → Updates status → Status persists
- [ ] Admin views demo requests → Updates status → Status persists

---

## Step 5: Deployment Checklist

### 5.1 Pre-Deployment

- [ ] Database migrations created and tested
- [ ] Edge Functions deployed and tested
- [ ] Email templates tested
- [ ] RESEND_API_KEY secret configured
- [ ] Frontend code integrated and tested
- [ ] Admin pages created and tested
- [ ] Rate limiting tested
- [ ] Error handling tested

### 5.2 Deployment Steps

1. Run database migrations
2. Deploy Edge Functions
3. Deploy frontend code
4. Test live endpoints
5. Verify email delivery
6. Test admin dashboard access

### 5.3 Post-Deployment

- [ ] Monitor Edge Function logs
- [ ] Monitor email delivery rates
- [ ] Check for error rates
- [ ] Verify admin dashboard works
- [ ] Test on production environment

---

## Files to Create/Update

### New Files (Backend)

- `supabase/migrations/XXXXXX_create_agency_tables.sql` - Database schema
- `supabase/functions/send-agency-inquiry/index.ts` - Contact form handler
- `supabase/functions/send-agency-inquiry/deno.json` - Deno config
- `supabase/functions/send-agency-inquiry/email-templates.ts` - Email templates
- `supabase/functions/schedule-demo/index.ts` - Demo request handler
- `supabase/functions/schedule-demo/deno.json` - Deno config
- `supabase/functions/schedule-demo/email-templates.ts` - Email templates

### New Files (Frontend - After Receipt)

- `web/src/pages/Agency/Agency.jsx` - Main page (from frontend dev)
- `web/src/pages/Agency/Agency.module.css` - Styles (from frontend dev)
- `web/src/pages/Agency/components/*` - All components (from frontend dev)

### New Files (Admin)

- `web/src/pages/admin/AgencyInquiries/AgencyInquiries.jsx` - Admin inquiries page
- `web/src/pages/admin/AgencyInquiries/AgencyInquiries.module.css` - Styles
- `web/src/pages/admin/DemoRequests/DemoRequests.jsx` - Admin demos page
- `web/src/pages/admin/DemoRequests/DemoRequests.module.css` - Styles

### Files to Update

- `web/src/app/App.jsx` - Add `/agency` route, admin routes
- `web/src/components/NavBar/NavBar.jsx` - Add Agency link
- `web/src/hooks/usePageTitle.js` - Add agency page title
- `web/src/features/admin/components/AdminLayout/AdminLayout.jsx` - Add navigation items
- `docs/ULTIMATE_ROADMAP.md` - Add Phase 10 section
- `docs/VOLTURIANO_COMPLETE_DOCUMENTATION.txt` - Add agency page documentation

---

## Success Metrics

**Technical Metrics:**
- Contact form submission success rate: >95%
- Demo request submission success rate: >95%
- Email delivery rate: >98%
- Edge Function response time: <500ms
- Zero data loss

**Business Metrics:**
- Contact form submissions per week
- Demo requests per week
- Conversion rate (visitor → inquiry)
- Admin response time to inquiries

---

## Dependencies

**Required:**
- Phase 0 (Foundation) - Routing, styling system
- Phase 8 (Admin Panel) - For admin dashboard integration
- Resend API key configured
- Supabase Edge Functions infrastructure

**Optional:**
- Phase 7 (Operations) - Analytics infrastructure
- Phase 9 (Marketing) - Content marketing system

---

## Timeline

**Step 1: Requirements Specification** - 1 day
**Step 2: Frontend Development** - External (frontend engineer)
**Step 3: Frontend Integration** - 2-3 days
**Step 4: Backend Implementation** - 3-5 days
**Step 5: Testing & Deployment** - 2-3 days

**Total Timeline: ~2 weeks** (excluding frontend development time)

---

## Next Steps

1. ✅ Create frontend requirements specification (this document)
2. ✅ Send requirements to frontend engineer
3. ✅ Receive frontend code
4. ✅ Integrate frontend code
5. ⏳ Implement backend functionality
6. ⏳ Connect frontend to backend
7. ⏳ Test end-to-end
8. ⏳ Deploy to production


