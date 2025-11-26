# Volturiano Agency Services Page - Frontend Development Brief

## About Volturiano

**Volturiano** is a premium luxury sports automotive platform that combines cutting-edge 3D visualization technology with comprehensive vehicle configuration capabilities. The platform enables users to customize luxury vehicles (specifically the Tornado GT model) through an immersive web-based configurator, save configurations to a personal garage, manage orders, and interact with an AI-powered assistant.

**Brand Identity:**
- **Vision:** "Commission, not purchase" - elevating the car buying experience through immersive visualization and personalized ownership journeys
- **Positioning:** Premium, investor-grade digital atelier for automotive configuration
- **Target Audience:** Luxury car enthusiasts, potential buyers, and high-end automotive consumers
- **Core Values:** Premium quality, cutting-edge technology, attention to detail, luxury experience

The platform represents the intersection of luxury automotive culture and advanced web technology, emphasizing sophistication, precision, and premium user experience.

---

## Brand Design Guidelines

### Color Palette

**Primary Colors:**
- **Background (Primary):** `#0a0a0a` - Very dark, almost black (main page background)
- **Background (Secondary):** `#1a1a1a` - Slightly lighter dark (cards, elevated surfaces)
- **Background (Tertiary):** `#27272a` - Dark gray (borders, dividers, subtle backgrounds)
- **Background (Quaternary):** `#050505` - Darker than primary (sidebars, deep backgrounds)

**Accent Color:**
- **Brand Orange:** `#ff4520` - Primary CTA color, brand identifier
  - Use for: Primary buttons, links, highlights, active states
  - Hover states: `rgba(255, 69, 32, 0.1)` for backgrounds, `rgba(255, 69, 32, 0.2)` for borders

**Text Colors:**
- **Primary Text:** `#ffffff` - White (headings, important text)
- **Secondary Text:** `#d4d4d8` - Light gray (body text, descriptions)
- **Tertiary Text:** `#a1a1aa` - Medium gray (labels, captions, less important text)
- **Quaternary Text:** `#71717a` - Darker gray (disabled states, subtle text)
- **Muted Text:** `#52525b` - Very muted gray (placeholders, very subtle text)

**Status Colors:**
- **Success:** `#10b981` - Green (success states, positive actions)
- **Warning:** `#eab308` - Yellow (warnings, attention needed)
- **Error:** `#ef4444` - Red (errors, destructive actions)

### Typography

- **Font Family:** Match existing Volturiano site font family (check existing components)
- **Headings:** Bold, white (`#ffffff`), clear hierarchy
- **Body Text:** Regular weight, light gray (`#d4d4d8` or `#a1a1aa`)
- **Line Height:** Generous spacing for readability
- **Letter Spacing:** Slightly increased for premium feel

### Design Principles

1. **Dark Theme First:** Everything built on dark backgrounds (`#0a0a0a` base)
2. **Minimalist Luxury:** Clean, spacious layouts with generous whitespace
3. **Subtle Elevations:** Use background color variations (`#1a1a1a`, `#27272a`) to create depth
4. **Smooth Animations:** All interactions should be smooth and polished (use Framer Motion)
5. **Premium Feel:** Every element should feel high-quality and intentional
6. **Accessibility:** WCAG 2.1 AA compliance - proper contrast ratios, keyboard navigation, screen reader support

### Component Patterns

**Buttons:**
- Primary: Orange (`#ff4520`) background, white text, rounded corners
- Secondary: Transparent with orange border (`rgba(255, 69, 32, 0.2)`), orange text
- Hover: Slight opacity change or background color shift
- Disabled: Reduced opacity, gray text (`#71717a`)

**Cards:**
- Background: `#1a1a1a` or `#27272a`
- Border: `#27272a` (subtle, 1px)
- Padding: Generous (1.5rem - 2rem)
- Border radius: Consistent (typically 8-12px)

**Modals:**
- Overlay: `rgba(0, 0, 0, 0.8)` - Dark backdrop
- Modal background: `#0a0a0a` or `#1a1a1a`
- Border: `#27272a`
- Smooth entrance/exit animations (Framer Motion)

**Forms:**
- Input background: `#27272a` or `rgba(39, 39, 42, 0.5)`
- Input text: `#ffffff` or `#d4d4d8`
- Input border: `#3f3f46` (default), `#ff4520` (focus)
- Placeholder: `#71717a`
- Labels: `#a1a1aa` or `#71717a`

**Transitions:**
- Duration: 150-200ms for most interactions
- Easing: Smooth, natural curves
- Use Framer Motion for complex animations

---

## Technical Stack & Patterns

### Technology Stack

- **Framework:** React 18.3.1 + Vite 5.4.2
- **Styling:** CSS Modules (`.module.css` files) - **NO Tailwind, NO inline styles**
- **State Management:** Zustand (if needed for local state)
- **Routing:** React Router DOM 6.26.2
- **Animations:** Framer Motion 11.0.0
- **Icons:** Lucide React 0.554.0
- **Internationalization:** i18next (if needed, but English is fine for this page)

### Code Organization

**File Structure:**
```
web/src/pages/Agency/
├── Agency.jsx (main page component)
├── Agency.module.css (main styles)
├── components/
│   ├── HeroSection.jsx
│   ├── HeroSection.module.css
│   ├── ServiceCard.jsx
│   ├── ServiceCard.module.css
│   ├── ServiceDetailModal.jsx (optional)
│   ├── ServiceDetailModal.module.css
│   ├── CaseStudy.jsx
│   ├── CaseStudy.module.css
│   ├── ContactFormModal.jsx
│   ├── ContactFormModal.module.css
│   ├── DemoRequestModal.jsx
│   ├── DemoRequestModal.module.css
│   ├── PricingOverview.jsx
│   └── PricingOverview.module.css
```

**CSS Modules Pattern:**
- One `.module.css` file per component
- Use camelCase for class names
- Import as `import styles from './Component.module.css'`
- Use as `className={styles.className}`

**Component Pattern:**
- Functional components with hooks
- Props destructuring
- Clean, readable code
- Comments for complex logic

**Modal Pattern (Reference Existing):**
- Use `createPortal` from React DOM
- Use Framer Motion for animations (`motion`, `AnimatePresence`)
- Overlay with backdrop click to close
- Escape key to close
- Focus trap (accessibility)

---

## What Needs to Be Created

### Page Route: `/agency`

This will be a **public route** (no authentication required) accessible from the main Volturiano website. It will be added to the navigation bar as "Agency" link, positioned after "Models" and before "Configurator".

### Required Sections

#### 1. Hero Section
**Purpose:** First impression, clear value proposition, primary CTAs

**Content:**
- **Headline:** "Transform Your Business with Premium Software Solutions"
- **Subheadline:** "3D Configurators • Fullstack Development • Luxury UI Design • Admin Dashboards • Supabase Backends"
- **Visual:** High-quality hero image or abstract luxury tech illustration

**Buttons:**
- **Primary CTA:** "Get Started" 
  - Opens Contact Form Modal
  - Class: `agency-hero-cta-primary`
  - Style: Orange (`#ff4520`) background, white text, prominent
  
- **Secondary CTA:** "View Case Study"
  - Smooth scroll to Case Study Section
  - Class: `agency-hero-cta-secondary`
  - Style: Transparent with orange border, orange text

**Design Notes:**
- Full-width section
- Centered content
- Generous padding
- Dark background (`#0a0a0a`)

#### 2. Service Showcase Section
**Purpose:** Display 5 core services Volturiano offers

**5 Service Cards Required:**

1. **3D Configurators**
   - Service ID: `3d-configurators`
   - Description: Interactive 3D product configurators for e-commerce
   - Key Features: Real-time rendering, WebGL support, mobile-responsive, custom integrations

2. **Fullstack Websites**
   - Service ID: `fullstack-websites`
   - Description: Complete web applications from frontend to backend
   - Key Features: React/Next.js, Supabase backend, responsive design, SEO optimized

3. **Luxury UI Design**
   - Service ID: `luxury-ui-design`
   - Description: Premium user interface and user experience design
   - Key Features: Dark themes, smooth animations, accessibility, brand consistency

4. **Admin Dashboards**
   - Service ID: `admin-dashboards`
   - Description: Comprehensive admin panels and content management systems
   - Key Features: Role-based access, analytics, real-time updates, intuitive UX

5. **Supabase Backends**
   - Service ID: `supabase-backends`
   - Description: Scalable backend infrastructure using Supabase
   - Key Features: PostgreSQL database, authentication, storage, edge functions, real-time

**Each Service Card Must Include:**
- Service icon/illustration (can be simple SVG or icon from Lucide React)
- Service title (large, white text)
- Brief description (2-3 sentences, light gray text)
- Key features list (3-5 bullet points, smaller text)
- **Three Action Buttons:**
  - **"Learn More"** - Expands card to detailed view OR opens Service Detail Modal
    - Class: `service-card-learn-more-{service-id}`
    - Data attribute: `data-service-id="{service-id}"`
    - Style: Secondary button (transparent, orange border)
  
  - **"Request Demo"** - Opens Demo Request Modal with service pre-filled
    - Class: `service-card-demo-{service-id}`
    - Data attribute: `data-service-id="{service-id}"`
    - Style: Primary button (orange background)
  
  - **"Get Quote"** - Opens Contact Form Modal with service interest pre-filled
    - Class: `service-card-quote-{service-id}`
    - Data attribute: `data-service-id="{service-id}"`
    - Style: Secondary button

**Card Design:**
- Background: `#1a1a1a`
- Border: `1px solid #27272a`
- Padding: `2rem`
- Border radius: `12px`
- Hover: Slight elevation (background `#27272a` or subtle shadow)
- Grid layout: Responsive (1 column mobile, 2-3 columns tablet, 3-5 columns desktop)

#### 3. Case Study Section
**Purpose:** Showcase Volturiano platform as a case study

**Content Structure:**
- **Challenge:** Brief description of the problem Volturiano solved
- **Solution:** How Volturiano platform addresses it
- **Results:** Key achievements and metrics
- **Visual:** Screenshots or mockups of Volturiano platform
- **Tech Stack Badges:** React, Supabase, Three.js, etc.

**CTA Button:**
- **"See it in Action"**
  - Navigates to `/configurator` (public route)
  - Class: `case-study-cta`
  - Style: Primary button (orange)

**Design:**
- Alternating layout (text left, image right, then reverse)
- Dark background section (`#0a0a0a` or `#1a1a1a`)

#### 4. Contact Form Modal
**Purpose:** Capture business inquiries and quote requests

**Modal Requirements:**
- Opens from "Get Started" button and "Get Quote" buttons
- Can be pre-filled with service interest when opened from service card
- Smooth open/close animation (Framer Motion)
- Backdrop click to close
- Escape key to close
- Focus trap for accessibility

**Form Fields:**

1. **Name** (text input, required)
   - Placeholder: "Your full name"
   - Validation: Required, min 2 characters

2. **Email** (email input, required)
   - Placeholder: "your.email@example.com"
   - Validation: Required, valid email format

3. **Company** (text input, optional)
   - Placeholder: "Your company name (optional)"

4. **Service Interest** (multi-select checkbox group, at least one required)
   - Options:
     - "3D Configurator"
     - "Fullstack Website"
     - "UI Design"
     - "Admin Dashboard"
     - "Supabase Backend"
   - Validation: At least one must be selected

5. **Budget Range** (dropdown select, required)
   - Options:
     - "$5k-$10k"
     - "$10k-$25k"
     - "$25k-$50k"
     - "$50k-$100k"
     - "$100k+"
     - "Custom"
   - Placeholder: "Select budget range"

6. **Project Timeline** (dropdown select, required)
   - Options:
     - "1-2 months"
     - "3-4 months"
     - "5-6 months"
     - "6+ months"
     - "Flexible"
   - Placeholder: "Select timeline"

7. **Message** (textarea, optional, max 2000 characters)
   - Placeholder: "Tell us about your project (optional)"
   - Character counter: Show remaining characters

8. **Privacy Consent** (checkbox, required)
   - Text: "I agree to be contacted by Volturiano regarding my inquiry"
   - Must be checked to submit

**Form Buttons:**
- **Submit Button**
  - Class: `contact-form-submit`
  - Style: Primary button (orange)
  - Behavior: 
    - Validate all fields
    - Show loading state (disabled, spinner)
    - Call API endpoint (see API section)
    - Show success message on success
    - Show error message on failure
    - Close modal on success after 2 seconds
  
- **Cancel/Close Button**
  - Class: `contact-form-cancel`
  - Style: Secondary button or text link
  - Behavior: Close modal, reset form

**API Integration:**
- **Endpoint:** `POST https://{project-ref}.supabase.co/functions/v1/send-agency-inquiry`
- **Headers:** `Content-Type: application/json`
- **Request Body:**
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
- **Success Response:**
```json
{
  "success": true,
  "message": "Thank you! We'll be in touch soon.",
  "inquiry_id": "uuid"
}
```
- **Error Response:**
```json
{
  "success": false,
  "error": "Error message"
}
```

**Error Handling:**
- Display user-friendly error messages
- Show validation errors inline
- Handle network errors gracefully
- Show generic error if API fails

#### 5. Demo Request Modal
**Purpose:** Schedule demo calls with potential clients

**Modal Requirements:**
- Opens from "Request Demo" buttons
- Can be pre-filled with service when opened from service card
- Same modal behavior as Contact Form Modal

**Form Fields:**

1. **Name** (text input, required)
   - Placeholder: "Your full name"

2. **Email** (email input, required)
   - Placeholder: "your.email@example.com"

3. **Company** (text input, optional)
   - Placeholder: "Your company name (optional)"

4. **Preferred Service** (dropdown select, required)
   - Options: Same as service cards
   - Can be pre-filled from button click

5. **Preferred Date** (date picker, required)
   - Min date: Today
   - Placeholder: "Select date"

6. **Preferred Time** (time picker, required)
   - Placeholder: "Select time"
   - Format: HH:MM (24-hour or 12-hour, your choice)

7. **Timezone** (dropdown select, required)
   - Options: Common timezones
     - "UTC"
     - "EST (UTC-5)"
     - "PST (UTC-8)"
     - "CET (UTC+1)"
     - "GMT (UTC+0)"
     - Add more as needed
   - Placeholder: "Select timezone"

8. **Meeting Type** (radio buttons, required)
   - Options:
     - "Video Call"
     - "Phone Call"
     - "In-Person"
   - Default: "Video Call"

9. **Additional Notes** (textarea, optional, max 1000 characters)
   - Placeholder: "Any additional information (optional)"
   - Character counter

**Form Buttons:**
- **Submit Button**
  - Class: `demo-request-submit`
  - Same behavior as Contact Form Submit
  
- **Cancel/Close Button**
  - Class: `demo-request-cancel`
  - Same behavior as Contact Form Cancel

**API Integration:**
- **Endpoint:** `POST https://{project-ref}.supabase.co/functions/v1/schedule-demo`
- **Headers:** `Content-Type: application/json`
- **Request Body:**
```json
{
  "name": "string",
  "email": "string",
  "company": "string | null",
  "preferred_service": "string",
  "preferred_datetime": "2024-01-15T14:30:00Z", // ISO 8601 format
  "timezone": "string",
  "meeting_type": "video" | "phone" | "in-person",
  "additional_notes": "string | null"
}
```
- **Note:** Combine date and time into ISO 8601 datetime string before sending
- **Success/Error responses:** Same format as Contact Form

#### 6. Pricing Overview Section
**Purpose:** Give potential clients pricing context

**Content:**
- Service-based pricing cards (if applicable)
- "Starting from" pricing
- "Custom pricing" for enterprise
- Note: "Pricing varies based on project scope"

**CTA Buttons:**
- **"Contact for Quote"** on each pricing card
  - Opens Contact Form Modal
  - Class: `pricing-contact-{service-id}`

**Design:**
- Similar to Service Cards layout
- Background: `#1a1a1a`
- Clear pricing display (if available)

---

## Integration Requirements

### Navigation Integration

**Add to NavBar:**
- Add "Agency" link to main navigation
- Position: After "Models", before "Configurator"
- Route: `/agency`
- Style: Match existing navigation links
- Active state: Highlight when on `/agency` route

**File to Update:** `web/src/components/NavBar/NavBar.jsx`

### Routing Integration

**Add Route:**
- Add route in `web/src/app/App.jsx`
- Route: `/agency` → `<Agency />` component
- Public route (no authentication required)

**File to Update:** `web/src/app/App.jsx`

### Page Title Integration

**Update Hook:**
- Add page title for `/agency` route
- Title: "Volturiano Agency – Premium Software Services"

**File to Update:** `web/src/hooks/usePageTitle.js` (if exists)

### Responsive Design

**Breakpoints:**
- Mobile: < 768px (single column, stacked layout)
- Tablet: 768px - 1024px (2 columns where applicable)
- Desktop: > 1024px (full layout, 3-5 columns)

**Mobile Considerations:**
- Modals should be full-screen or near full-screen on mobile
- Touch-friendly button sizes (min 44x44px)
- Readable text sizes
- Proper spacing for touch targets

### Accessibility Requirements

**WCAG 2.1 AA Compliance:**
- Keyboard navigation (Tab, Enter, Escape)
- Screen reader support (proper ARIA labels)
- Color contrast ratios (4.5:1 for text, 3:1 for UI components)
- Focus indicators (visible outline on focus)
- Alt text for images
- Semantic HTML (proper heading hierarchy, form labels)

**Focus Management:**
- Focus trap in modals
- Return focus to trigger button when modal closes
- Skip links for main content

---

## API Endpoints Summary

### 1. Contact Form Submission
- **URL:** `POST /functions/v1/send-agency-inquiry`
- **Base URL:** `https://{project-ref}.supabase.co`
- **Authentication:** None (public endpoint)
- **Request:** See Contact Form Modal section
- **Response:** Success/error JSON

### 2. Demo Request Submission
- **URL:** `POST /functions/v1/schedule-demo`
- **Base URL:** `https://{project-ref}.supabase.co`
- **Authentication:** None (public endpoint)
- **Request:** See Demo Request Modal section
- **Response:** Success/error JSON

**Note:** The `{project-ref}` will be provided by the backend team. For now, you can use an environment variable or placeholder.

---

## Design Mockups & References

**Reference Existing Components:**
- Check `web/src/features/garage/components/TestDriveModal.jsx` for modal pattern
- Check `web/src/features/admin/components/AdminLayout/AdminLayout.module.css` for color usage
- Check `web/src/components/NavBar/NavBar.jsx` for navigation pattern

**Visual Style:**
- Match the dark, premium aesthetic of the main Volturiano site
- Use existing component patterns where possible
- Maintain consistency with admin panel styling (dark theme, orange accents)

---

## Deliverables Checklist

- [ ] Hero Section component with CTAs
- [ ] 5 Service Cards with all required buttons
- [ ] Case Study Section
- [ ] Contact Form Modal (fully functional with API integration)
- [ ] Demo Request Modal (fully functional with API integration)
- [ ] Pricing Overview Section
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] Accessibility features (keyboard nav, screen readers, focus management)
- [ ] Smooth animations (Framer Motion)
- [ ] CSS Modules (no inline styles, no Tailwind)
- [ ] Error handling and validation
- [ ] Loading states for form submissions
- [ ] Success/error messages
- [ ] Integration with NavBar
- [ ] Route setup in App.jsx
- [ ] Page title setup

---

## Questions & Clarifications

If you need clarification on:
- Specific design details
- API endpoint structure
- Component patterns
- Integration points
- Any other technical questions

Please reach out before starting development to ensure alignment.

---

## Timeline & Next Steps

1. **Review this brief** and ask any clarifying questions
2. **Create the frontend code** following all specifications
3. **Deliver the code** in the specified file structure
4. **Backend team will integrate** the code and connect APIs
5. **Testing and refinement** together

---

**Thank you for your work on this project! We're excited to see the Agency page come to life with your expertise.**


