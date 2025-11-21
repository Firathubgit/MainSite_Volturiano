# VOLTURIANO Ultimate Development Roadmap
## Comprehensive 2000+ Line Strategic Plan

**Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Status:** Active Planning Document  
**Scope:** Complete project roadmap covering all features, phases, dependencies, and technical considerations

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Project Vision & Goals](#project-vision--goals)
3. [Architecture Overview](#architecture-overview)
4. [Phase 0: Foundation & Infrastructure](#phase-0-foundation--infrastructure)
5. [Phase 1: Supabase Platform & Core Data Layer](#phase-1-supabase-platform--core-data-layer)
6. [Phase 2: Account & My Garage Feature](#phase-2-account--my-garage-feature)
7. [Phase 3: Configurator 2D Pipeline](#phase-3-configurator-2d-pipeline)
8. [Phase 4: Configurator 3D Pipeline](#phase-4-configurator-3d-pipeline)
9. [Phase 5: Account Settings & Profile Management](#phase-5-account-settings--profile-management)
10. [Phase 6: AI Assistant & Support System](#phase-6-ai-assistant--support-system)
11. [Phase 7: Operations & Observability](#phase-7-operations--observability)
12. [Phase 8: Advanced Features & Integrations](#phase-8-advanced-features--integrations)
13. [Phase 9: Product Launches & Marketing Communications](#phase-9-product-launches--marketing-communications)
14. [Dependencies & Critical Path](#dependencies--critical-path)
14. [Risk Assessment & Mitigation](#risk-assessment--mitigation)
15. [Success Metrics & KPIs](#success-metrics--kpis)
16. [Timeline Estimates](#timeline-estimates)
17. [Resource Requirements](#resource-requirements)
18. [Appendix: Technical Specifications](#appendix-technical-specifications)

---

## Executive Summary

The VOLTURIANO Ultimate Roadmap provides a comprehensive, phase-by-phase plan for building a premium automotive configurator and ownership experience platform. This roadmap covers approximately 80+ major features across 8 distinct phases, with detailed implementation steps, technical considerations, dependencies, and success criteria for each.

**Key Highlights:**
- **Total Estimated Timeline:** 18-24 months for full feature completion
- **Core MVP Timeline:** 4-6 months (Phases 0-2)
- **Critical Path:** Foundation → Garage → Configurator 2D → Commerce
- **Technology Stack:** React + Vite, Supabase, Zustand, React Three Fiber, Stripe
- **Architecture:** Feature-sliced design, dual visualization engine (2D/3D), serverless backend

**Current Status:**
- ✅ Phase 0: Foundation (80% complete)
- ✅ Phase 2: Garage Feature (Core UI complete, filtering/search implemented)
  - ✅ Phase 2.1: Core Garage UI
  - ✅ Phase 2.2: Save to Garage Integration
  - ✅ Phase 2.4: Version History & Diff View
  - ✅ Phase 2.5: Sharing & Deep Links
  - ✅ Phase 2.7: Tags & Goal Configuration
  - ✅ Phase 2.8: Open in Configurator Deep Link
  - ✅ Phase 2.9: Timeline & Milestones View
  - ✅ Phase 2.10: Advanced Filtering & Sorting
  - ✅ Phase 2.11: PDF Export
  - ✅ Phase 2.12: Test Drive Scheduling
- 🔄 Phase 1: Supabase Platform (Schema designed, migrations pending)
- ⏳ Phase 3-8: Planned

---

## Project Vision & Goals

### Vision Statement
Build a premium, investor-grade digital atelier for automotive configuration and ownership. The platform should feel like "commission, not purchase" - elevating the car buying experience through immersive visualization, personalized ownership journeys, and seamless integration between configuration, purchase, and post-purchase services.

### Core Goals

1. **User Experience Excellence**
   - Instant visual feedback (<100ms option swaps)
   - Seamless cross-device synchronization
   - Offline-capable core features
   - Accessible to all users (WCAG 2.1 AA)

2. **Technical Excellence**
   - 60fps animations on mid-tier devices
   - <2.5s Largest Contentful Paint (LCP)
   - 99.9% uptime SLA
   - Zero-downtime deployments

3. **Business Goals**
   - Enable self-service configuration for 80% of use cases
   - Reduce sales cycle time by 40%
   - Increase conversion rate by 25%
   - Support 10,000+ concurrent users

4. **Scalability**
   - Support unlimited vehicle models and options
   - Handle 1M+ saved configurations
   - Process 10,000+ orders/month
   - Scale to multiple brands/regions

---

## Architecture Overview

### Technology Stack

**Frontend:**
- React 18+ with Vite (JavaScript, no TypeScript initially)
- React Router v6 for navigation
- Zustand for state management
- Framer Motion for animations
- React Three Fiber + Drei for 3D visualization
- i18next for internationalization
- CSS Modules + PostCSS for styling

**Backend:**
- Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- Stripe for payments (via Edge Functions only)
- Supabase Realtime for live updates

**Infrastructure:**
- Supabase Storage CDN for assets
- Vercel/Netlify for frontend hosting
- GitHub Actions for CI/CD
- Sentry for error monitoring

### Architecture Principles

1. **Feature-Sliced Design:** Each feature is self-contained with its own components, API, store, and styles
2. **Dual Visualization Engine:** 2D layered images (primary) + optional 3D (R3F) for immersion
3. **Data-Driven Configuration:** Manifests, SQL rules, i18n JSON - minimal hardcoded logic
4. **Performance First:** Code splitting, lazy loading, optimistic UI, prefetching
5. **Security by Default:** RLS on all tables, service keys never exposed, input validation
6. **Offline Support:** localStorage caching, service worker (future), graceful degradation

### Key Architectural Decisions

**Why Zustand over Redux?**
- Minimal boilerplate, fine-grained subscriptions
- Better TypeScript inference (when we add TS)
- Smaller bundle size
- Simpler mental model for team

**Why Supabase over custom backend?**
- Rapid development, built-in auth/RLS
- Real-time subscriptions out of the box
- Edge Functions for serverless logic
- PostgreSQL for complex queries
- Storage CDN included

**Why 2D + 3D dual engine?**
- 2D: Universal device support, photorealism, instant swaps
- 3D: Immersive experiences, AR/VR readiness, cinematic moments
- Users can choose based on device capability and preference

**Why CSS Modules over Tailwind?**
- Better component isolation
- No build-time class generation overhead
- Easier to maintain design tokens
- Better for theme switching (base/sport/luxury)

---

## Phase 0: Foundation & Infrastructure

**Status:** 80% Complete  
**Timeline:** 2-3 months  
**Priority:** Critical (blocks all other phases)

### Overview
Establish the foundational infrastructure, development environment, core architecture patterns, and essential tooling required for all subsequent development.

### Completed Items ✅

1. **Project Structure**
   - ✅ React + Vite setup with proper folder structure
   - ✅ Feature-sliced architecture (`features/` organization)
   - ✅ CSS Modules configuration
   - ✅ i18next integration with English/Swedish

2. **Core Components**
   - ✅ Navigation system (NavBar, NavDrawer)
   - ✅ Page transitions (PageTransition component)
   - ✅ Loading overlay with brand animation
   - ✅ Start animation (intro sequence)

3. **State Management**
   - ✅ Zustand stores (userStore, uiStore, configStore, garageStore)
   - ✅ Auth session management
   - ✅ UI state (menu toggles, audio mute, viewer mode)

4. **Routing & Navigation**
   - ✅ React Router setup with protected routes
   - ✅ IndexGate for intro animation
   - ✅ Route-level code splitting

5. **Styling System**
   - ✅ CSS variables for design tokens
   - ✅ Dark theme implementation
   - ✅ Responsive breakpoints
   - ✅ Brand color palette

### Remaining Tasks

#### 0.1 Development Environment Setup
**Priority:** Critical  
**Estimated Time:** 1 week

**Tasks:**
1. **Documentation Setup**
   - Create comprehensive README.md with setup instructions
   - Document environment variables (`.env.example`)
   - Create troubleshooting guide
   - Add contribution guidelines

2. **CI/CD Pipeline**
   - Set up GitHub Actions workflows
   - Configure automated testing
   - Set up deployment pipelines (staging/production)
   - Add Lighthouse CI for performance budgets

3. **Development Tools**
   - Configure ESLint with project rules
   - Set up Prettier with shared config
   - Add pre-commit hooks (Husky)
   - Configure VS Code workspace settings

4. **Local Supabase Setup**
   - Document Supabase CLI installation
   - Create local development guide
   - Set up database seeding scripts
   - Configure local storage buckets

**Deliverables:**
- `README.md` with complete setup guide
- `.github/workflows/ci.yml` and `deploy.yml`
- `.vscode/settings.json` and `.prettierrc`
- `docs/development/local-setup.md`

**Success Criteria:**
- New developer can set up environment in <30 minutes
- All CI checks pass on PR
- Local Supabase instance runs successfully

#### 0.2 Error Handling & Logging Infrastructure
**Priority:** High  
**Estimated Time:** 1 week

**Tasks:**
1. **Error Boundary Implementation**
   - Create global error boundary component
   - Add route-level error boundaries
   - Implement error reporting to Sentry
   - Create user-friendly error pages

2. **Logging System**
   - Create `web/src/lib/logger.js` utility
   - Implement log levels (debug, info, warn, error)
   - Add request ID correlation
   - Configure console vs. production logging

3. **Monitoring Integration**
   - Set up Sentry project
   - Configure error tracking
   - Add performance monitoring
   - Set up alerting rules

**Deliverables:**
- `web/src/components/ErrorBoundary/ErrorBoundary.jsx`
- `web/src/lib/logger.js`
- `web/src/lib/monitoring.js`
- Error tracking dashboard configured

**Success Criteria:**
- All errors are captured and reported
- Error boundaries prevent full app crashes
- Logs include request IDs for correlation

#### 0.3 Testing Infrastructure
**Priority:** High  
**Estimated Time:** 2 weeks

**Tasks:**
1. **Unit Testing Setup**
   - Configure Vitest for unit tests
   - Set up testing utilities (React Testing Library)
   - Create test helpers and mocks
   - Write example tests for core utilities

2. **Integration Testing**
   - Set up Playwright for E2E tests
   - Create test fixtures for Supabase
   - Write critical path tests (auth, garage, configurator)
   - Set up visual regression testing

3. **Performance Testing**
   - Configure Lighthouse CI
   - Set performance budgets
   - Create performance test suite
   - Document performance benchmarks

**Deliverables:**
- `vitest.config.js` configuration
- `playwright.config.js` setup
- Example test files for each feature
- Performance test suite

**Success Criteria:**
- Test coverage >70% for core utilities
- E2E tests cover critical user flows
- Performance budgets enforced in CI

#### 0.4 Documentation Framework
**Priority:** Medium  
**Estimated Time:** 1 week

**Tasks:**
1. **Architecture Documentation**
   - Complete architecture overview docs
   - Document design patterns
   - Create component API documentation
   - Document state management patterns

2. **Developer Guides**
   - Create "Getting Started" guide
   - Document coding conventions
   - Create feature development checklist
   - Document debugging procedures

3. **API Documentation**
   - Document Supabase schema
   - Create API endpoint documentation
   - Document Edge Functions
   - Create integration guides

**Deliverables:**
- `docs/architecture/` complete
- `docs/development/` guides
- `docs/api/` documentation
- Component storybook (future)

**Success Criteria:**
- All major systems documented
- New developers can understand architecture
- API contracts clearly defined

---

## Phase 1: Supabase Platform & Core Data Layer

**Status:** Schema Designed, Implementation Pending  
**Timeline:** 3-4 weeks  
**Priority:** Critical (required for Configurator and Garage)

### Overview
Establish the core database schema, RLS policies, storage buckets, and foundational RPCs that power the configurator, garage, and order management systems.

### 1.1 Core Schema Implementation
**Priority:** Critical  
**Estimated Time:** 1 week  
**Dependencies:** None

**Detailed Steps:**

**Step 1.1.1: Vehicles & Options Schema**
- Create `vehicles` table with columns:
  - `id` (uuid, primary key)
  - `name` (text, not null) - e.g., "Tornado GT"
  - `trim` (text) - e.g., "Launch Edition"
  - `base_price_cents` (bigint, not null)
  - `currency` (char(3), default 'EUR')
  - `description` (text)
  - `performance_specs` (jsonb) - horsepower, torque, 0-60, etc.
  - `segment` (text) - 'coupe', 'roadster', 'suv', 'concept'
  - `drivetrain` (text) - 'ice', 'phev', 'bev'
  - `subbrand` (text) - 'base', 'sport', 'luxury'
  - `year` (integer)
  - `generation` (integer)
  - `media` (jsonb) - hero images, gallery URLs
  - `created_at`, `updated_at` (timestamptz)

- Create `option_groups` table:
  - `id` (uuid, primary key)
  - `name` (text, not null) - e.g., "Exterior", "Interior", "Performance"
  - `display_order` (integer)
  - `vehicle_id` (uuid, references vehicles) - null for universal options
  - `created_at` (timestamptz)

- Create `options` table:
  - `id` (uuid, primary key)
  - `group_id` (uuid, references option_groups)
  - `name` (text, not null) - e.g., "Paint Color", "Wheel Style"
  - `ui_control_type` (text) - 'select', 'radio', 'checkbox', 'slider'
  - `is_required` (boolean, default false)
  - `display_order` (integer)
  - `created_at` (timestamptz)

- Create `option_values` table:
  - `id` (uuid, primary key)
  - `option_id` (uuid, references options)
  - `name` (text, not null) - e.g., "Nero Black", "Orange Fury"
  - `price_delta_cents` (bigint, default 0)
  - `image_url` (text) - preview/swatch image
  - `material_id` (uuid, references materials) - for 3D materials
  - `is_default` (boolean, default false)
  - `display_order` (integer)
  - `metadata` (jsonb) - additional properties
  - `created_at` (timestamptz)

- Create `materials` table:
  - `id` (uuid, primary key)
  - `name` (text, not null)
  - `properties` (jsonb) - shader properties for 3D
  - `created_at` (timestamptz)

**Step 1.1.2: Compatibility Rules Schema**
- Create `compatibility_rules` table:
  - `id` (uuid, primary key)
  - `rule_type` (enum: 'requires', 'incompatible')
  - `primary_option_value_id` (uuid, references option_values)
  - `secondary_option_value_id` (uuid, references option_values)
  - `message_key` (text) - i18n key for user message
  - `auto_resolve` (boolean) - whether to auto-select/enable
  - `created_at` (timestamptz)

**Step 1.1.3: Configurations & Orders Schema**
- Create `user_configurations` table:
  - `id` (uuid, primary key)
  - `owner_id` (uuid, references profiles, not null)
  - `vehicle_id` (uuid, references vehicles, not null)
  - `name` (text)
  - `selected_options` (jsonb, not null) - {option_id: option_value_id}
  - `config_code` (text, unique) - shareable code
  - `pricing_summary` (jsonb) - cached totals
  - `garage_item_id` (uuid, references garage_items) - optional link
  - `created_at`, `updated_at` (timestamptz)

- Create `orders` table:
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles, not null)
  - `configuration_id` (uuid, references user_configurations)
  - `status` (enum: 'pending', 'paid', 'processing', 'completed', 'cancelled', 'refunded')
  - `stripe_session_id` (text)
  - `stripe_payment_intent_id` (text)
  - `total_cents` (bigint, not null)
  - `currency` (char(3), default 'EUR')
  - `metadata` (jsonb) - additional order data
  - `created_at`, `updated_at` (timestamptz)

- Create `order_items` table:
  - `id` (uuid, primary key)
  - `order_id` (uuid, references orders, not null)
  - `option_value_id` (uuid, references option_values)
  - `quantity` (integer, default 1)
  - `unit_price_cents` (bigint)
  - `total_cents` (bigint)
  - `metadata` (jsonb)
  - `created_at` (timestamptz)

**Step 1.1.4: Indexes & Performance**
- Create indexes:
  - `vehicles(segment, subbrand)` - for filtering
  - `options(group_id, display_order)` - for UI ordering
  - `option_values(option_id, display_order)` - for UI ordering
  - `compatibility_rules(primary_option_value_id)` - for rule lookup
  - `user_configurations(owner_id, created_at DESC)` - for user's configs
  - `user_configurations(config_code)` - for shareable links
  - `orders(user_id, created_at DESC)` - for user's orders
  - `orders(status, created_at)` - for admin queries

**Deliverables:**
- `supabase/sql/platform_schema.sql` - complete schema
- Migration script with rollback capability
- Index optimization documentation

**Success Criteria:**
- All tables created successfully
- Indexes support fast queries (<50ms for common queries)
- Foreign keys enforce referential integrity
- Schema supports all planned features

### 1.2 Row-Level Security (RLS) Policies
**Priority:** Critical  
**Estimated Time:** 3 days  
**Dependencies:** 1.1

**Detailed Steps:**

**Step 1.2.1: User-Owned Tables RLS**
- `user_configurations`: Users can only read/write their own configs
  ```sql
  CREATE POLICY "users_own_configurations" ON user_configurations
    USING (owner_id = auth.uid())
    WITH CHECK (owner_id = auth.uid());
  ```

- `orders`: Users can only read their own orders
  ```sql
  CREATE POLICY "users_own_orders" ON orders
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
  ```

**Step 1.2.2: Public Read Tables**
- `vehicles`: Public read, admin write
- `options`, `option_values`: Public read, admin write
- `option_groups`: Public read, admin write
- `materials`: Public read, admin write
- `compatibility_rules`: Public read, admin write

**Step 1.2.3: Admin Bypass**
- Create service role policies for admin operations
- Use JWT claims: `request.jwt().claims.role = 'service_role'`
- Document admin API usage

**Deliverables:**
- RLS policies for all tables
- Admin bypass documentation
- Security testing checklist

**Success Criteria:**
- Users cannot access other users' data
- Public data is readable by all
- Admin operations work correctly
- Security audit passes

### 1.3 Storage Buckets Configuration
**Priority:** High  
**Estimated Time:** 2 days  
**Dependencies:** None

**Detailed Steps:**

**Step 1.3.1: Create Storage Buckets**
- `renders` bucket (private):
  - Purpose: High-res configurator renders
  - Access: Signed URLs with expiry
  - Size limit: 10MB per file
  - MIME types: image/jpeg, image/png, image/webp

- `models` bucket (private):
  - Purpose: 3D GLB models, textures, HDRIs
  - Access: Signed URLs
  - Size limit: 100MB per file
  - MIME types: model/gltf-binary, image/ktx2, image/hdr

- `garage-thumbnails` bucket (private):
  - Purpose: User-uploaded garage item thumbnails
  - Access: Owner-only with RLS
  - Size limit: 5MB per file
  - MIME types: image/jpeg, image/png, image/webp

- `documents` bucket (private):
  - Purpose: User documents (NDAs, contracts, specs)
  - Access: Owner-only with RLS
  - Size limit: 10MB per file
  - MIME types: application/pdf, image/*

**Step 1.3.2: Storage Policies**
- Create RLS policies for each bucket
- Implement signed URL generation utility
- Add client-side caching for signed URLs
- Document storage usage patterns

**Deliverables:**
- All storage buckets created
- Storage policies configured
- `web/src/lib/storage.js` utility
- Storage usage documentation

**Success Criteria:**
- Buckets are properly secured
- Signed URLs work correctly
- Client can upload/download files
- Storage costs are reasonable

### 1.4 RPC Functions
**Priority:** High  
**Estimated Time:** 3 days  
**Dependencies:** 1.1

**Detailed Steps:**

**Step 1.4.1: Configuration Totals RPC**
- Create `get_configuration_totals(config_id uuid)` function
- Calculate:
  - Base vehicle price
  - Sum of selected option prices
  - Taxes (based on region)
  - Incentives/discounts
  - Total
- Return JSON with breakdown
- Cache results in `user_configurations.pricing_summary`

**Step 1.4.2: Compatibility Check RPC**
- Create `check_compatibility(selected_options jsonb)` function
- Evaluate all compatibility rules
- Return violations with messages
- Suggest auto-resolutions

**Step 1.4.3: Config Code Generation**
- Create `generate_config_code(config_id uuid)` function
- Generate unique, shareable code
- Store in `user_configurations.config_code`
- Validate uniqueness

**Deliverables:**
- All RPC functions implemented
- Client-side wrappers in `web/src/features/configurator/api.js`
- Function documentation
- Performance benchmarks

**Success Criteria:**
- RPCs return correct results
- Performance <100ms for typical queries
- Error handling is robust
- Functions are well-documented

### 1.5 Seed Data & Demo Content
**Priority:** Medium  
**Estimated Time:** 2 days  
**Dependencies:** 1.1, 1.2

**Detailed Steps:**

**Step 1.5.1: Vehicle Seed Data**
- Create 2-3 demo vehicles:
  - Tornado GT (coupe, sport)
  - SUV Prototype (suv, luxury)
  - Concept Car (concept)
- Include realistic pricing, specs, media

**Step 1.5.2: Options Seed Data**
- Create option groups for each vehicle:
  - Exterior (paint, wheels, calipers, aero)
  - Interior (seats, trim, stitching)
  - Performance (brakes, suspension, exhaust)
- Create 5-10 options per group
- Create 3-5 values per option

**Step 1.5.3: Compatibility Rules Seed**
- Create 10-15 example rules:
  - Paint + wheel combinations
  - Performance package requirements
  - Incompatible options

**Step 1.5.4: Demo Configurations**
- Create 3-5 sample saved configurations
- Link to demo user accounts
- Include realistic option selections

**Deliverables:**
- `supabase/seeds/platform_seed.sql`
- Seed data documentation
- Reset script for development

**Success Criteria:**
- Seed data loads successfully
- Demo configurator works with seed data
- Data is realistic and useful for testing
- Seed script is idempotent

### 1.6 Migration & Deployment Workflow
**Priority:** High  
**Estimated Time:** 2 days  
**Dependencies:** 1.1-1.5

**Detailed Steps:**

**Step 1.6.1: Migration Scripts**
- Create numbered migration files
- Include rollback scripts
- Test migrations on staging
- Document migration process

**Step 1.6.2: Deployment Documentation**
- Document Supabase CLI usage
- Create deployment checklist
- Document rollback procedures
- Add troubleshooting guide

**Deliverables:**
- Migration workflow documentation
- Deployment runbook
- Rollback procedures

**Success Criteria:**
- Migrations run successfully
- Rollback works correctly
- Team can deploy confidently
- Documentation is clear

---

## Phase 2: Account & My Garage Feature

**Status:** Core UI Complete, Advanced Features Pending  
**Timeline:** 6-8 weeks  
**Priority:** High (enables user retention and configurator integration)

### Overview
Build a comprehensive garage management system where users can save, organize, filter, and manage their vehicle configurations across different states (saved builds, purchases, prototypes, wishlist).

### 2.1 Core Garage UI (COMPLETED ✅)
**Status:** Complete  
**Completion Date:** 2025-01-XX

**What Was Built:**
- ✅ Four-lane UI (Saved Builds, Purchases, Prototypes, Wishlist)
- ✅ Filtering by state, date range, price range
- ✅ Search functionality (title/description)
- ✅ Real-time synchronization via Supabase Realtime
- ✅ Optimistic updates with rollback
- ✅ localStorage caching for offline support
- ✅ Responsive design with loading states
- ✅ Internationalization (English/Swedish)

**Files Created:**
- `web/src/features/garage/components/GarageLayout.jsx`
- `web/src/features/garage/components/GarageLane.jsx`
- `web/src/features/garage/components/CarCard.jsx`
- `web/src/features/garage/components/GarageFilters.jsx`
- `web/src/features/garage/components/GarageEmptyState.jsx`
- `web/src/features/garage/styles/garage.module.css`
- `web/src/stores/garageStore.js`
- `supabase/sql/garage_schema.sql`

**Architecture Decisions:**
- Zustand store for state management (simple, performant)
- Map data structure for O(1) item lookups
- Client-side filtering for search (instant feedback)
- Server-side filtering for date/price (efficient queries)
- Soft delete pattern (`archived_at`) for data recovery

### 2.2 Save to Garage Integration ✅ COMPLETE
**Priority:** High  
**Estimated Time:** 1 week  
**Dependencies:** Phase 1 (Configurations), Phase 2.1  
**Status:** ✅ **COMPLETE AND WORKING**

**Detailed Steps:**

**Step 2.2.1: SaveToGarageButton Component** ✅
- Create reusable button component:
  - Location: `web/src/features/garage/components/SaveToGarageButton.jsx`
  - Props: `configuration`, `initialState`, `onSuccess`, `onError`
  - States: idle, saving, success, error
  - Handles auth check (redirect if not logged in)
  - **Status:** ✅ Implemented with proper authentication handling

**Step 2.2.2: Save Flow Implementation** ✅
- On click:
  1. Validate configuration payload ✅
  2. Check if user is authenticated ✅
  3. Call `createGarageItem` API ✅
  4. Create initial version entry ✅
  5. Generate diff summary (empty for first save) ✅
  6. Show optimistic update ✅
  7. Show success toast ✅
  8. Navigate to garage (optional) ✅

**Step 2.2.3: Integration Points** ✅
- Add to Configurator page (primary CTA) - Ready for Phase 3
- Add to Showroom car cards - Ready for integration
- Add to comparison view - Ready for integration
- Add keyboard shortcut (Ctrl+S / Cmd+S) - Can be added when configurator is built
- **Test Page:** `web/src/pages/Debug/TestSaveToGarage.jsx` - Available for testing

**Step 2.2.4: Error Handling** ✅
- Handle validation errors (show field-specific messages) ✅
- Handle network errors (retry logic) ✅
- Handle duplicate saves (merge or update) - Future enhancement
- Handle quota limits (if implemented) - Future enhancement

**Deliverables:**
- ✅ `SaveToGarageButton.jsx` component
- ✅ Integration ready for configurator (when Phase 3 is built)
- ✅ Error handling and user feedback
- ✅ Analytics events (ready for integration)

**Success Criteria:**
- ✅ Users can save configurations (tested via debug page)
- ✅ Save is fast (<500ms perceived time)
- ✅ Errors are handled gracefully
- ✅ Success feedback is clear
- ✅ Authentication flow works correctly

**Implementation Notes:**
- **Component:** `web/src/features/garage/components/SaveToGarageButton.jsx`
- **API Function:** `web/src/features/account/api.js` → `createGarageItem()`
- **Storage:** Full car JSON stored in `garage_items.config_payload` (JSONB)
- **Version History:** Automatically creates entry in `garage_versions.snapshot`
- **Test Page:** Available at `/debug/test-save-to-garage` (development mode)
- **Documentation:** See `docs/development/save-to-garage-implementation.md`

**How to Test:**
1. Navigate to `/debug/test-save-to-garage` (development mode)
2. Ensure you're logged in
3. Click "Save to Garage" button
4. Verify success message and check Garage page for saved item
5. Check Supabase `garage_items` table to see `config_payload` JSON

### 2.3 Edit & Rename Functionality
**Priority:** High  
**Estimated Time:** 1 week  
**Dependencies:** Phase 2.1

**Detailed Steps:**

**Step 2.3.1: Edit Modal Component**
- Create `GarageItemEditModal.jsx`:
  - Fields: title, description, state
  - Validation: title required, max lengths
  - Save/Cancel buttons
  - Loading states

**Step 2.3.2: Update API Integration**
- Extend `updateGarageItem` API:
  - Support partial updates
  - Validate input
  - Update `updated_at` timestamp
  - Create version snapshot if config changes

**Step 2.3.3: Inline Editing (Future)**
- Consider inline editing for title
- Double-click to edit
- Auto-save on blur
- Escape to cancel

**Deliverables:**
- Edit modal component
- Update API function
- Integration in CarCard
- User testing feedback

**Success Criteria:**
- Users can edit title/description
- Changes save successfully
- UI updates optimistically
- Validation prevents invalid data

### 2.4 Version History & Diff View ✅
**Priority:** Medium  
**Estimated Time:** 2 weeks  
**Dependencies:** Phase 2.1, Phase 2.2
**Status:** Complete

**Detailed Steps:**

**Step 2.4.1: Version History UI**
- Create `VersionHistory.jsx` component:
  - Vertical timeline of versions
  - Version number, date, diff summary
  - Click to view full snapshot
  - Restore to version action

**Step 2.4.2: Diff Visualization**
- Create `ConfigDiff.jsx` component:
  - Show added/removed/changed options
  - Highlight differences
  - Show price changes
  - Visual before/after comparison

**Step 2.4.3: Diff Calculation**
- Create `web/src/features/garage/utils/diffConfig.js`:
  - Compare two config payloads
  - Generate diff summary array
  - Calculate price delta
  - Identify option changes

**Step 2.4.4: Restore Functionality**
- Add "Restore to this version" button
- Create new version from restored state
- Update garage item
- Show confirmation dialog

**Deliverables:** ✅
- Version history component ✅
- Diff visualization component ✅
- Diff calculation utility ✅
- Restore functionality ✅
- Integration in CarCard ✅

**Success Criteria:** ✅
- Users can view version history ✅
- Diffs are clear and understandable ✅
- Restore works correctly ✅
- Performance is acceptable (<1s load) ✅

**Implementation Notes:**
- All components implemented in `web/src/features/garage/components/`
- Diff utility in `web/src/features/garage/utils/diffConfig.js`
- API functions enhanced in `web/src/features/account/api.js`
- Store methods added to `web/src/stores/garageStore.js`
- Full documentation in `docs/garage/version-history.md`

### 2.5 Sharing & Deep Links ✅
**Priority:** Medium  
**Estimated Time:** 1.5 weeks  
**Dependencies:** Phase 2.1
**Status:** Complete

**Detailed Steps:**

**Step 2.5.1: Share Link Generation** ✅
- Create Supabase RPC `create_share_link`: ✅
  - Generate unique share code ✅
  - Store in `garage_share_links` table ✅
  - Set expiry (optional) ✅
  - Track access count ✅

**Step 2.5.2: Share UI** ✅
- Add share button to CarCard ✅
- Show share modal with: ✅
  - Copy link button ✅
  - QR code (for mobile) ✅
  - Privacy/expiry controls ✅
  - Access settings (public/private/unlisted) ✅

**Step 2.5.3: Deep Link Handler** ✅
- Create route `/garage/share/:shareCode` ✅
- Load shared configuration ✅
- Show read-only view ✅
- Option to "Save to my garage" ✅

**Step 2.5.4: Privacy Controls** ✅
- Add privacy setting per item ✅
- Public: anyone with link can view ✅
- Private: only owner can view ✅
- Unlisted: only people with link (default) ✅

**Deliverables:** ✅
- Share link generation ✅
- Share UI component ✅
- Deep link handler ✅
- Privacy controls ✅
- Caching with background refresh ✅
- Comprehensive debug logging ✅

**Success Criteria:** ✅
- Users can share configurations ✅
- Shared links work correctly ✅
- Privacy is respected ✅
- Fast loading with cache ✅
- Background Supabase verification ✅

**Implementation Notes:**
- All components implemented in `web/src/features/garage/components/`
- Share modal: `ShareModal.jsx` with QR code support
- Shared view: `SharedGarageView.jsx` for read-only access
- API functions in `web/src/features/account/api.js`
- Supabase RPC functions: `create_share_link`, `get_shared_item`, `update_share_settings`
- Database table: `garage_share_links` with RLS policies
- Caching implemented in `garageStore` for instant loading
- Background refresh ensures data stays current

### 2.6 State Transitions & Stripe Integration
**Priority:** High  
**Estimated Time:** 2 weeks  
**Dependencies:** Phase 1 (Orders), Phase 7 (Stripe Webhooks)

**Detailed Steps:**

**Step 2.6.1: State Management**
- Define state enum: 'saved', 'purchased', 'prototype', 'wishlist', 'archived'
- Create state transition helper
- Validate transitions (e.g., can't go from archived to purchased)
- Update UI based on state

**Step 2.6.2: Stripe Webhook Integration**
- Extend `functions/stripe-webhook/index.ts`:
  - On payment success:
    - Find garage item by order
    - Update state to 'purchased'
    - Create milestone entry
    - Send notification email
  - On refund:
    - Update state back to 'saved'
    - Create refund milestone

**Step 2.6.3: Manual State Changes**
- Allow users to move items between lanes
- Show confirmation for state changes
- Create activity log entry
- Update UI optimistically

**Deliverables:**
- State transition logic
- Stripe webhook updates
- Manual state change UI
- Activity logging

**Success Criteria:**
- States update automatically on payment
- Users can manually change states
- Transitions are validated
- Activity is logged

### 2.7 Tags & Goal Configuration ✅
**Priority:** Medium  
**Estimated Time:** 1 week  
**Dependencies:** Phase 2.1  
**Status:** ✅ **COMPLETE**

**Detailed Steps:**

**Step 2.7.1: Tag Management** ✅
- Create tag selector component: ✅
  - Chip-based multi-select ✅
  - Predefined tags: 'track', 'grand-tourer', 'concept', 'daily-driver' ✅
  - Custom tags (future) ✅
  - Visual tag display on cards ✅

**Step 2.7.2: Tag API** ✅
- Extend garage API: ✅
  - `addTag(itemId, tag)` ✅
  - `removeTag(itemId, tag)` ✅
  - `getTags(itemId)` ✅
- Update `garage_item_tags` table ✅
- Optimistic updates ✅

**Step 2.7.3: Tag Filtering** ✅
- Add tag filter to GarageFilters ✅
- Filter by multiple tags (AND/OR logic) ✅
- Show tag counts ✅
- Persist filter preferences ✅

**Deliverables:** ✅
- Tag selector component ✅
- Tag API functions ✅
- Tag filtering UI ✅
- Tag display on cards ✅

**Success Criteria:** ✅
- Users can add/remove tags ✅
- Tags filter correctly ✅
- UI is intuitive ✅
- Performance is good ✅

**Implementation Notes:**
- **Components:** `TagSelector.jsx`, `TagSelectorDialog.jsx`, `TagDisplay.jsx`, `TagFilter.jsx`
- **API Functions:** `addTag()`, `removeTag()`, `getTags()`, `getAllTags()` in `web/src/features/account/api.js`
- **Utilities:** `tagConstants.js` (predefined tags, validation), `tagUtils.js` (filtering logic)
- **Store Integration:** Optimistic updates in `garageStore.js` with rollback support
- **Database:** `garage_item_tags` table with RLS policies
- **Filtering:** AND/OR logic implemented in `filterItemsByTags()` utility
- **Persistence:** Tag filter preferences saved to localStorage
- **Integration:** TagFilter integrated into GarageFilters, TagDisplay shown on CarCard

### 2.8 Open in Configurator Deep Link ✅
**Priority:** High  
**Estimated Time:** 1 week  
**Dependencies:** Phase 2.1 (Garage), Phase 2.2 (Save to Garage)  
**Status:** ✅ **COMPLETE**

**Detailed Steps:**

**Step 2.8.1: Route Handler** ✅
- Create route `/configurator/:garageItemId` ✅
- Load garage item configuration ✅
- Extract garage payload to configurator state ✅
- Navigate to configurator with pre-filled options ✅

**Step 2.8.2: State Conversion** ✅
- Create `extractGarageConfigForConfigurator` helper: ✅
  - Extract vehicle selection ✅
  - Map option selections ✅
  - Extract pricing state ✅
  - Handle missing options gracefully ✅

**Step 2.8.3: UI Integration** ✅
- Add "Configure" button to CarCard (already exists, updated navigation) ✅
- Show loading state during conversion ✅
- Handle errors (missing vehicle/options) ✅
- Pre-fill configurator with correct colors and options ✅

**Deliverables:** ✅
- Deep link route handler ✅
- State extraction utility ✅
- UI integration ✅
- Error handling ✅

**Success Criteria:** ✅
- Deep links work correctly ✅
- Configurator loads with correct options ✅
- Errors are handled gracefully ✅
- User experience is smooth ✅

**Implementation Notes:**
- **Route Handler:** `ConfiguratorFromGarage.jsx` - loads garage item, extracts config, redirects to configurator
- **Extraction Utility:** `extractGarageConfigForConfigurator.js` - extracts and normalizes config_payload
- **API Function:** `fetchGarageItemById()` in `api.js` - fetches single garage item with tags
- **Configurator Enhancement:** Updated `Configurator.jsx` to accept `garageConfig` from location state
- **CarCard Integration:** Updated navigation to use URL param `/configurator/:id`
- **Option Mapping:** `mapOptionIdToViewerKey()`, `findPaintColorFromOptions()`, `findRimColorFromOptions()` utilities
- **Error Handling:** Comprehensive error states with retry functionality
- **i18n Support:** Complete translations in English and Swedish
- **Route:** `/configurator/:garageItemId` with RequireAuth wrapper

### 2.9 Timeline & Milestones View ✅
**Priority:** Low  
**Estimated Time:** 2 weeks  
**Dependencies:** Phase 2.1, Phase 2.6  
**Status:** ✅ **COMPLETE**

**Detailed Steps:**

**Step 2.9.1: Timeline Component** ✅
- Create `Timeline.jsx` component: ✅
  - Vertical timeline layout ✅
  - Milestone entries with icons ✅
  - Date formatting ✅
  - Expandable details ✅

**Step 2.9.2: Milestone Types** ✅
- Define milestone types: ✅
  - 'created' - item created ✅
  - 'updated' - configuration updated ✅
  - 'purchased' - order placed ✅
  - 'delivered' - vehicle delivered (future) ✅
  - 'custom' - user-added note ✅

**Step 2.9.3: Milestone Data** ✅
- Load from `garage_milestones` table ✅
- Combine with webhook events (prepared) ✅
- Add placeholder milestones (future delivery dates) ✅
- Allow user to add custom milestones ✅

**Step 2.9.4: Offline Placeholder Updates** ⏳
- Create scheduled job (Edge Function): (Future work)
  - Run monthly
  - Add placeholder milestones for purchased items
  - Update delivery estimates
  - Send notifications

**Deliverables:** ✅
- Timeline component ✅
- Milestone management ✅
- Placeholder update system (structure prepared) ✅
- User testing ✅

**Success Criteria:** ✅
- Timeline displays correctly ✅
- Milestones are accurate ✅
- Placeholders update monthly (structure ready, Edge Function pending)
- UI is intuitive ✅

**Implementation Notes:**
- **Components Created:**
  - `Timeline/Timeline.jsx` - Main timeline component with vertical layout
  - `Timeline/TimelineItem.jsx` - Individual milestone item with expandable details
  - `Timeline/MilestoneIcon.jsx` - Icon component for milestone types
  - `Timeline/TimelineModal.jsx` - Modal wrapper for timeline view
  - `Timeline/AddMilestoneDialog.jsx` - Dialog for adding custom milestones
- **Utilities Created:**
  - `utils/milestoneTypes.js` - Milestone type constants and mapping
  - `utils/dateFormatting.js` - Centralized date formatting utilities
  - `utils/placeholderMilestones.js` - Placeholder milestone logic (prepared for Edge Function)
- **API Enhancements:**
  - `fetchMilestones()` - Enhanced with order and type filtering options
  - `createMilestone()` - Already existed, now uses standardized types
- **Store Enhancements:**
  - `loadMilestones()` - Enhanced with order and type options
  - `getMilestonesByType()` - Helper to filter milestones by type
- **Integration:**
  - Added Timeline option to `CarCardMoreMenu`
  - Integrated `TimelineModal` into `CarCard` component
  - Full i18n support (English and Swedish)
- **Database:**
  - Schema already existed, verified columns: `from_state`, `to_state`, `metadata`
  - Index `garage_milestones_item_idx` exists for efficient queries
  - RLS policies configured
- **Milestone Type Standardization:**
  - Legacy types mapped: `'state_change'` → `'updated'`, `'payment'` → `'purchased'`
  - Backward compatible with existing milestones
- **UI/UX:**
  - Dark theme consistent with Volturiano design
  - Portal rendering for proper z-index layering
  - Responsive design
  - Loading, error, and empty states
  - Expandable milestone details
  - Future date indicators for placeholder milestones

### 2.10 Advanced Filtering & Sorting ✅
**Priority:** Medium  
**Estimated Time:** 1 week  
**Dependencies:** Phase 2.1 (partially complete)

**Current Status:**
- ✅ Filter by state
- ✅ Filter by date range (created/updated)
- ✅ Filter by price range
- ✅ Search by title/description

**Remaining Tasks:**

**Step 2.10.1: Model Filtering** ✅
- ✅ Add model dropdown to filters
- ✅ Filter by vehicle_model
- ✅ Show model counts
- ✅ Persist filter preference

**Step 2.10.2: Tag Filtering** ✅
- ✅ Add tag chips to filters
- ✅ Multi-select tag filtering
- ✅ Show tag counts
- ✅ AND/OR logic toggle

**Step 2.10.3: Sorting Options** ✅
- ✅ Add sort dropdown:
  - ✅ Date (newest/oldest)
  - ✅ Price (high/low)
  - ✅ Name (A-Z)
  - ⏳ Custom order (drag to reorder, future)
- ✅ Persist sort preference

**Step 2.10.4: Saved Filter Sets** ✅
- ✅ Allow users to save filter combinations
- ✅ Quick filter buttons
- ✅ "Clear all filters" button
- ✅ Filter presets (e.g., "My Purchases")

**Deliverables:** ✅
- ✅ Enhanced filtering UI
- ✅ Sorting functionality
- ✅ Saved filter sets
- ✅ Performance optimization

**Success Criteria:** ✅
- ✅ All filters work together
- ✅ Sorting is fast
- ✅ Filter presets are useful
- ✅ UI is intuitive

### 2.11 PDF Export ✅
**Priority:** Low  
**Estimated Time:** 2 weeks  
**Dependencies:** Phase 2.1, Phase 7 (Edge Functions)  
**Status:** ✅ **COMPLETE**

**Detailed Steps:**

**Step 2.11.1: Edge Function** ✅
- ✅ Create `functions/generate-pdf/index.ts`:
  - ✅ Accept garage_item_id
  - ✅ Load configuration data
  - ✅ Generate PDF using PDFKit
  - ✅ Include:
    - ✅ Vehicle details
    - ✅ Selected options
    - ✅ Pricing breakdown
    - ✅ Render images
    - ✅ QR code (links to shared config)
    - ✅ Optional watermark

**Step 2.11.2: PDF Template** ✅
- ✅ Design PDF layout:
  - ✅ Header with Volturiano branding
  - ✅ Vehicle image support
  - ✅ Configuration summary
  - ✅ Options list with prices
  - ✅ Footer with contact info
  - ✅ Premium Volturiano styling (orange accents, styled boxes)

**Step 2.11.3: Job Queue System** ✅
- ✅ Implement job queue for PDF generation:
  - ✅ Store job in `pdf_export_jobs` table
  - ✅ Process asynchronously
  - ✅ Store PDF in `documents` storage bucket
  - ✅ Generate signed URL
  - ✅ Status tracking (queued, processing, completed, failed)

**Step 2.11.4: UI Integration** ✅
- ✅ Add "Export PDF" to CarCardMoreMenu dropdown
- ✅ Show job status (pending, processing, ready)
- ✅ Download button when ready
- ✅ Status badges and modals
- ⏳ Email option (future)

**Deliverables:** ✅
- ✅ PDF generation Edge Function (`supabase/functions/generate-pdf/`)
- ✅ PDF template design (Volturiano-branded)
- ✅ Job queue system (`pdf_export_jobs` table)
- ✅ UI integration (PdfExportModal, PdfJobStatus components)

**Success Criteria:** ✅
- ✅ PDFs generate correctly
- ✅ Quality is high (premium Volturiano design)
- ✅ Generation time <30s (typically 2-5s)
- ✅ Users can download PDFs
- ✅ QR codes work correctly
- ✅ Share links auto-created (public, 1 week expiry)

**Implementation Notes:**
- **Edge Function:** `supabase/functions/generate-pdf/standalone-index.ts` (for manual deployment)
- **Database:** `pdf_export_jobs` table with RLS policies
- **Storage:** `documents` bucket with RLS policies
- **Components:** `PdfExportModal.jsx`, `PdfJobStatus.jsx`, integrated into `CarCardMoreMenu.jsx`
- **API Functions:** `createPdfExportJob()`, `getPdfJobStatus()`, `getPdfDownloadUrl()`, `listPdfExports()` in `web/src/features/account/api.js`
- **Store Integration:** PDF export actions in `web/src/stores/garageStore.js`
- **Share Links:** Automatically creates public share links expiring in 1 week if none exist
- **PDF Design:** Premium Volturiano branding with orange accents, styled boxes, and professional layout

### 2.12 Test Drive Scheduling ✅
**Priority:** Medium  
**Estimated Time:** 1.5 weeks  
**Dependencies:** Phase 2.1  
**Status:** ✅ **COMPLETE**

**Detailed Steps:**

**Step 2.12.1: Request Schema** ✅
- ✅ Use existing `test_drive_requests` table
- ✅ Fields: model, preferred_date, dealer, status
- ✅ Link to garage_item (optional)
- ✅ Enhanced schema with dealer_id FK, contact fields, status constraints, and indexes

**Step 2.12.2: Scheduling Modal** ✅
- ✅ Create `TestDriveModal.jsx`:
  - ✅ Model selector (pre-filled from garage item)
  - ✅ Date picker (future dates only)
  - ✅ Dealer selector (dynamic, supports multiple dealers)
  - ✅ Contact info form (pre-filled from profile)
  - ✅ Submit button with loading states

**Step 2.12.3: Request Processing** ✅
- ✅ On submit:
  - ✅ Create request record
  - ✅ Send email to dealer/sales team (Edge Function ready, requires RESEND_API_KEY)
  - ✅ Send confirmation to user (Edge Function ready)
  - ✅ Create activity log entry
  - ✅ Show success message

**Step 2.12.4: Status Updates** ✅
- ✅ Allow dealers to update status (API functions implemented)
- ✅ Send notifications to user (Edge Function ready)
- ✅ Show status in garage UI (TestDriveStatus component created)
- ✅ Cancel functionality (API function implemented)

**Deliverables:** ✅
- ✅ Scheduling modal (`TestDriveModal.jsx`)
- ✅ Request processing (`createTestDriveRequest` API)
- ✅ Email notifications (Edge Function infrastructure ready)
- ✅ Status tracking (`TestDriveStatus.jsx` component)

**Success Criteria:** ✅
- ✅ Users can request test drives
- ✅ Requests are processed correctly
- ✅ Notifications infrastructure ready (requires RESEND_API_KEY configuration)
- ✅ Status updates work (API functions implemented)

**Implementation Notes:**
- **Database Schema:** `supabase/sql/test_drive_schema_enhanced.sql` - Enhanced test_drive_requests table with dealer_id FK, contact fields, status enum, and comprehensive RLS policies
- **Dealers Table:** Created with public read access for active dealers, supports multi-dealership system
- **Components:** `TestDriveModal.jsx`, `TestDriveStatus.jsx` integrated into `CarCardMoreMenu.jsx`
- **API Functions:** `createTestDriveRequest()`, `fetchTestDriveRequests()`, `updateTestDriveRequestStatus()`, `cancelTestDriveRequest()`, `fetchDealers()` in `web/src/features/account/api.js`
- **Store Integration:** Test drive actions in `web/src/stores/garageStore.js`
- **Email Infrastructure:** Edge Function `send-test-drive-notification` ready (inactive until RESEND_API_KEY configured)
- **Activity Logging:** All test drive actions logged to `garage_activity` table
- **RLS Policies:** Comprehensive policies for test_drive_requests (users can only access their own requests) and dealers (public read for active dealers)
- **Integration:** "Schedule Test Drive" button added to CarCardMoreMenu dropdown between Timeline and Export PDF

---

## Phase 3: Configurator 2D Pipeline

**Status:** Planned  
**Timeline:** 8-10 weeks  
**Priority:** Critical (core product feature)

### Overview
Build the primary 2D configurator experience using layered image composition. This is the main product feature that enables users to configure vehicles with instant visual feedback, compatibility checking, and seamless option selection.

### 3.1 Manifest Authoring Tool
**Priority:** Critical  
**Estimated Time:** 2 weeks  
**Dependencies:** Phase 1 (Schema), Phase 0 (Foundation)

**Detailed Steps:**

**Step 3.1.1: Manifest Schema Definition**
- Document complete manifest JSON structure in `docs/configurator/manifest-schema.md`
- Define layer structure:
  ```json
  {
    "modelId": "tornado-gt",
    "angles": ["front-3q", "side", "rear-3q", "interior"],
    "layers": [
      {
        "id": "body",
        "zIndex": 1,
        "dependencies": [],
        "variants": {
          "nero": { "url": "...", "materialId": "..." },
          "orange-fury": { "url": "...", "materialId": "..." }
        }
      },
      {
        "id": "wheels",
        "zIndex": 2,
        "dependencies": ["body"],
        "variants": { ... }
      }
    ],
    "metadata": {
      "version": 1,
      "lastUpdated": "2025-01-XX"
    }
  }
  ```
- Define dependency graph (which layers depend on others)
- Define variant mapping (option_value_id -> asset URL)
- Document translation keys for option labels

**Step 3.1.2: Manifest Editor UI**
- Create React editor under `web/src/features/configurator/manifest/`:
  - `ManifestEditor.jsx` - main editor component
  - `LayerTree.jsx` - hierarchical layer display
  - `DependencyMatrix.jsx` - visualize dependencies
  - `VariantManager.jsx` - manage option variants
  - `LivePreview.jsx` - preview composed image
- Features:
  - Drag-and-drop layer reordering
  - Visual dependency graph
  - Upload assets directly to Supabase Storage
  - Generate manifest JSON
  - Validate manifest structure
  - Export/import manifests

**Step 3.1.3: Supabase Manifest Storage**
- Create `config_2d_manifests` table:
  - `id` (uuid, primary key)
  - `model_id` (text, references vehicles.name)
  - `manifest_data` (jsonb, not null)
  - `status` (enum: 'draft', 'published', 'archived')
  - `version` (integer)
  - `created_by` (uuid, references profiles)
  - `created_at`, `updated_at` (timestamptz)
- Create RLS policies (admin write, public read published)
- Create API functions for CRUD operations

**Step 3.1.4: Versioning & Publishing**
- Implement manifest versioning:
  - Increment version on publish
  - Keep draft versions
  - Archive old versions
  - Rollback capability
- Publishing workflow:
  - Validate manifest
  - Check asset URLs exist
  - Update configurator to use new manifest
  - Invalidate CDN cache (if needed)

**Deliverables:**
- Complete manifest schema documentation
- Manifest editor UI
- Supabase manifest storage
- Publishing workflow

**Success Criteria:**
- Editors can create/manage manifests
- Manifests validate correctly
- Publishing works smoothly
- Versioning is reliable

### 3.2 Adaptive Image Quality Scaling
**Priority:** High  
**Estimated Time:** 1.5 weeks  
**Dependencies:** Phase 3.1 (Manifests)

**Detailed Steps:**

**Step 3.2.1: Breakpoint & DPR Strategy**
- Document strategy in `docs/performance/configurator-image-scaling.md`
- Define breakpoints:
  - Mobile: <768px, DPR 1-3
  - Tablet: 768-1024px, DPR 1-2
  - Desktop: >1024px, DPR 1-2
- Define quality tiers:
  - Low: 800px width, 70% quality
  - Medium: 1200px width, 85% quality
  - High: 2000px width, 95% quality
  - Ultra: Original, 100% quality

**Step 3.2.2: Image Loader Implementation**
- Create `web/src/features/configurator/utils/imageLoader.js`:
  - Detect viewport size and DPR
  - Detect network speed (navigator.connection)
  - Choose appropriate image variant
  - Generate CDN URLs with size parameters
  - Implement progressive loading
- Use IntersectionObserver for lazy loading
- Prefetch on hover for swatches

**Step 3.2.3: CDN Configuration**
- Configure Supabase Storage CDN:
  - Enable image transformations
  - Set up size variants
  - Configure cache headers
  - Set up cache invalidation

**Step 3.2.4: Performance Monitoring**
- Add Lighthouse CI checks
- Monitor LCP (Largest Contentful Paint)
- Track image load times
- Set performance budgets:
  - LCP < 2.5s
  - Image load < 1s on 3G
  - No layout shift on image load

**Deliverables:**
- Image scaling strategy document
- Adaptive image loader
- CDN configuration
- Performance monitoring

**Success Criteria:**
- Images load quickly on all devices
- Quality is appropriate for device
- Performance budgets met
- No layout shifts

### 3.3 Compatibility Rules Engine
**Priority:** Critical  
**Estimated Time:** 2 weeks  
**Dependencies:** Phase 1 (Compatibility Rules), Phase 3.1

**Detailed Steps:**

**Step 3.3.1: Rules Evaluation Engine**
- Create `web/src/features/configurator/rules/evaluateRules.ts`:
  - Load compatibility rules from Supabase
  - Evaluate current selection against rules
  - Return violations with:
    - Rule type (requires/incompatible)
    - Affected options
    - Message key
    - Auto-resolve suggestion
- Cache rules in Zustand store
- Re-evaluate on option change

**Step 3.3.2: UI Feedback System**
- Create `CompatibilityAlert.jsx` component:
  - Show violation messages
  - Highlight affected options
  - Suggest resolutions
  - Auto-resolve button (if applicable)
- Create inline hints on option controls
- Use i18n for all messages
- Animate alerts (Framer Motion)

**Step 3.3.3: Automatic Reconciliation**
- Implement auto-resolve logic:
  - If "requires" rule: auto-select required option
  - If "incompatible" rule: disable incompatible option
  - Show notification of auto-action
  - Allow undo
- Handle multiple conflicting rules
- Prioritize rules (user preference > auto-resolve)

**Step 3.3.4: Rule Management UI (Admin)**
- Create admin interface for managing rules:
  - List all rules
  - Create/edit/delete rules
  - Test rules
  - Bulk import/export
- Validate rule logic
- Preview rule effects

**Deliverables:**
- Rules evaluation engine
- UI feedback components
- Auto-resolve logic
- Admin rule management

**Success Criteria:**
- Rules evaluate correctly
- Users understand violations
- Auto-resolve works smoothly
- Admin can manage rules easily

### 3.4 Pricing Panel
**Priority:** Critical  
**Estimated Time:** 2 weeks  
**Dependencies:** Phase 1 (RPC), Phase 3.1

**Detailed Steps:**

**Step 3.4.1: RPC Integration**
- Create client wrapper in `web/src/features/configurator/api.js`:
  - `getConfigurationTotals(configId)` - call RPC
  - Cache results in Zustand store
  - Invalidate cache on option change
  - Handle errors gracefully

**Step 3.4.2: Pricing Components**
- Create `PricingSummary.jsx`:
  - Display base price
  - List selected options with prices
  - Show subtotals
  - Calculate total
  - Format currency (EUR, USD, etc.)
- Create `FinanceBreakdown.jsx`:
  - Show taxes breakdown
  - Show incentives/discounts
  - Show financing options (future)
  - Show monthly payment estimate (future)

**Step 3.4.3: Real-time Updates**
- Update pricing on every option change
- Show loading state during calculation
- Animate price changes
- Highlight price increases/decreases
- Debounce rapid changes

**Step 3.4.4: Finance Calculators (Stub)**
- Create placeholder finance calculators:
  - APR calculator
  - Lease calculator
  - Residual value calculator
- Note: Full integration requires financial data feeds
- Document future integration points

**Deliverables:**
- Pricing panel components
- RPC integration
- Real-time updates
- Finance calculator stubs

**Success Criteria:**
- Pricing updates instantly
- Calculations are accurate
- UI is clear and readable
- Performance is good

### 3.5 Undo/Redo System
**Priority:** High  
**Estimated Time:** 1.5 weeks  
**Dependencies:** Phase 3.1

**Detailed Steps:**

**Step 3.5.1: History Stack Implementation**
- Extend configurator Zustand store:
  - `history.past` - array of previous states
  - `history.present` - current state
  - `history.future` - array of future states (for redo)
- Implement immutable state snapshots
- Limit history size (e.g., 50 states)

**Step 3.5.2: Command Pattern**
- Create command helpers:
  - `selectOption(optionId, valueId)` - record inverse
  - `deselectOption(optionId)` - record inverse
  - `setVehicle(vehicleId)` - record inverse
- Each command records inverse operation
- Commands are reversible

**Step 3.5.3: UI Controls**
- Add toolbar buttons:
  - Undo button (disabled if no past)
  - Redo button (disabled if no future)
  - Keyboard shortcuts (Ctrl+Z, Ctrl+Y)
- Show history count in tooltip
- Animate state transitions

**Step 3.5.4: History Persistence (Optional)**
- Save history to localStorage
- Restore on page reload
- Limit persisted history size
- Clear on explicit save

**Deliverables:**
- History stack implementation
- Command pattern helpers
- UI controls
- Keyboard shortcuts

**Success Criteria:**
- Undo/redo works correctly
- History doesn't grow unbounded
- Keyboard shortcuts work
- Performance is acceptable

### 3.6 Compare Mode
**Priority:** Medium  
**Estimated Time:** 2 weeks  
**Dependencies:** Phase 3.1, Phase 2 (Garage)

**Detailed Steps:**

**Step 3.6.1: Snapshot Data Contract**
- Define snapshot structure:
  - Configuration ID
  - Selected options
  - Render references
  - Price breakdown
  - Highlighted diffs

**Step 3.6.2: Compare Drawer Component**
- Create `CompareDrawer.jsx`:
  - Side-by-side layout
  - Two configuration panels
  - Diff highlighting
  - Price comparison
  - Option-by-option comparison
- Reuse existing configurator components
- Responsive design (stack on mobile)

**Step 3.6.3: Diff Calculation**
- Create diff utility:
  - Compare two configurations
  - Identify added/removed/changed options
  - Calculate price differences
  - Generate visual diff markers

**Step 3.6.4: Persistence (Future)**
- Plan Supabase storage for comparisons
- Create `comparisons` table
- Allow sharing comparisons
- Save comparison history

**Deliverables:**
- Compare drawer component
- Diff calculation utility
- UI integration
- Future persistence plan

**Success Criteria:**
- Compare mode works smoothly
- Diffs are clear
- Performance is good
- UI is intuitive

### 3.7 Camera Angle Transitions
**Priority:** Medium  
**Estimated Time:** 1.5 weeks  
**Dependencies:** Phase 3.1

**Detailed Steps:**

**Step 3.7.1: Motion Specification**
- Document in `docs/ux/motion.md`:
  - Easing functions
  - Transition durations
  - Parallax depth mapping
  - Layer animation delays

**Step 3.7.2: Transition Implementation**
- Create `CameraView.jsx` component:
  - Handle angle switching
  - Animate layer transitions
  - Implement parallax effect
  - Use Framer Motion or requestAnimationFrame
- Respect prefers-reduced-motion

**Step 3.7.3: Parallax System**
- Use manifest metadata for depth weights
- Calculate parallax offsets based on:
  - Layer z-index
  - Camera angle change
  - Viewport size
- Smooth 60fps animations

**Deliverables:**
- Motion specification
- Camera transition component
- Parallax implementation

**Success Criteria:**
- Transitions are smooth
- Parallax effect is subtle
- Performance is 60fps
- Accessibility respected

### 3.8 Variant Availability Alerts
**Priority:** Medium  
**Estimated Time:** 1 week  
**Dependencies:** Phase 1 (Inventory), Phase 3.1

**Detailed Steps:**

**Step 3.8.1: Inventory Table**
- Create `variant_inventory` table:
  - `option_value_id` (uuid)
  - `region` (text)
  - `stock_count` (integer)
  - `threshold` (integer) - alert threshold
  - `updated_at` (timestamptz)

**Step 3.8.2: Realtime Subscription**
- Subscribe to inventory changes in configurator store
- Update UI state when stock changes
- Disable unavailable options
- Show availability status

**Step 3.8.3: Alert UI**
- Create `AvailabilityAlert.jsx`:
  - Show low stock warnings
  - Show out of stock messages
  - Dismissible alerts
  - Persist dismiss state

**Deliverables:**
- Inventory table
- Realtime subscription
- Alert UI component

**Success Criteria:**
- Alerts show correctly
- Options disable when unavailable
- Realtime updates work
- UI is clear

### 3.9 AR Preview Integration
**Priority:** Low  
**Estimated Time:** 1.5 weeks  
**Dependencies:** Phase 3.1, Phase 4 (3D Assets)

**Detailed Steps:**

**Step 3.9.1: AR Asset URLs**
- Add AR asset URLs to manifest:
  - USDZ format (iOS)
  - GLB format (Android/Web)
  - Thumbnail images

**Step 3.9.2: Capability Detection**
- Detect device AR support:
  - WebXR API
  - ARKit (iOS)
  - ARCore (Android)
- Show AR button only if supported

**Step 3.9.3: AR Launch**
- Create AR launcher:
  - Check device capability
  - Load appropriate asset format
  - Launch WebXR or deep link
  - Handle errors gracefully

**Deliverables:**
- AR asset integration
- Capability detection
- AR launcher

**Success Criteria:**
- AR works on supported devices
- Assets load correctly
- Errors handled gracefully

### 3.10 Preset Configurations
**Priority:** High  
**Estimated Time:** 1.5 weeks  
**Dependencies:** Phase 1 (Presets), Phase 3.1

**Detailed Steps:**

**Step 3.10.1: Preset Seed Data**
- Create `supabase/seeds/configurator_presets.sql`:
  - Performance Pack preset
  - Winter Pack preset
  - Launch Edition preset
  - Reference manifest IDs
  - Include metadata (name, description, thumbnail)

**Step 3.10.2: Preset Gallery UI**
- Create preset gallery on configurator entry:
  - Grid of preset cards
  - Thumbnail images
  - Preset names and descriptions
  - "Start with this" button
- Show "Start from scratch" option

**Step 3.10.3: Preset Application**
- Create `applyPresetToConfigurator` helper:
  - Load preset configuration
  - Hydrate configurator store
  - Apply all option selections
  - Navigate to configurator
  - Log diff (empty, since starting point)

**Deliverables:**
- Preset seed data
- Preset gallery UI
- Preset application logic

**Success Criteria:**
- Presets load correctly
- Application is smooth
- Users can start from scratch
- UI is appealing

### 3.11 Studio Lighting Filter
**Priority:** Medium  
**Estimated Time:** 1 week  
**Dependencies:** Phase 3.1

**Detailed Steps:**

**Step 3.11.1: Lighting Presets**
- Map lighting presets to background assets in manifest:
  - Studio (neutral)
  - Track (dynamic)
  - Gallery (dramatic)
  - Sunset (warm)

**Step 3.11.2: Lighting Control UI**
- Add segmented control for lighting:
  - Visual preset thumbnails
  - Smooth transitions
  - Cache loaded backgrounds
- Persist user preference

**Step 3.11.3: Background Switching**
- Implement background swap:
  - Preload next background
  - Fade transition
  - Update all angles
  - Update manifest references

**Deliverables:**
- Lighting presets
- Control UI
- Background switching

**Success Criteria:**
- Lighting switches smoothly
- Preferences persist
- Performance is good

### 3.12 Wishlist Overlay
**Priority:** High  
**Estimated Time:** 1 week  
**Dependencies:** Phase 2 (Garage), Phase 3.1

**Detailed Steps:**

**Step 3.12.1: Overlay Component**
- Create wishlist overlay:
  - Appears on configurator
  - "Add to Wishlist" button
  - Check auth state (redirect if guest)
  - Reuse SaveToGarageButton logic

**Step 3.12.2: Integration**
- Add overlay to configurator page
- Position: floating button or toolbar
- Show toast feedback
- Track analytics

**Deliverables:**
- Wishlist overlay
- Integration
- Analytics

**Success Criteria:**
- Overlay is accessible
- Save works correctly
- Feedback is clear

### 3.13 Watermark Rendering
**Priority:** Low  
**Estimated Time:** 1.5 weeks  
**Dependencies:** Phase 3.1, Phase 7 (Edge Functions)

**Detailed Steps:**

**Step 3.13.1: Design Decision**
- Document in `docs/operations/render-watermarking.md`:
  - Client-side vs server-side
  - Watermark design
  - Positioning and opacity
  - User preference toggle

**Step 3.13.2: Client-Side Implementation**
- Implement canvas watermarking:
  - Overlay watermark on render
  - Configurable opacity
  - Position (corner)
  - User toggle

**Step 3.13.3: Server-Side Pipeline (Future)**
- Plan Edge Function for high-res:
  - Accept render request
  - Apply watermark
  - Store in storage
  - Return signed URL

**Deliverables:**
- Watermarking documentation
- Client-side implementation
- Server-side plan

**Success Criteria:**
- Watermarks render correctly
- Toggle works
- Performance is acceptable

### 3.14 Showcase Mode
**Priority:** Low  
**Estimated Time:** 2 weeks  
**Dependencies:** Phase 3.1 (Manifests), Phase 3.7 (Camera Angles), Phase 3.11 (Studio Lighting), Phase 4.4 (Studio Light Presets - 3D)

**Detailed Steps:**

**Step 3.14.1: Showcase Presets**
- Define preset JSON structure:
  - Environment (winter/summer/studio/track/gallery)
  - Lighting setup (2D background + 3D HDRI if available)
  - Background assets (2D images or 3D environments)
  - Copy/text overlays
  - Camera angles (from manifest)
  - Optional: 3D scenario presets integration

**Step 3.14.2: Showcase View Component**
- Create `ShowcaseMode.jsx` component:
  - Full-screen immersive layout
  - Environment switching (2D/3D aware)
  - Render car with current configuration
  - Overlay text/copy system
  - Share button (generates shareable URL)
  - Integration with 2D configurator renderer
  - Optional: 3D configurator integration

**Step 3.14.3: Preset Management**
- Store presets in Supabase `showcase_presets` table:
  - Link to vehicle models
  - Reference manifest angles
  - Store environment assets (2D/3D)
  - Store overlay text templates
  - Allow switching between presets
  - Persist user preference per configuration
  - Admin interface for creating presets

**Step 3.14.4: Configurator Integration**
- Add "Showcase" button to configurator toolbar
- Navigate to showcase view with current config
- Support deep linking: `/showcase/:configId?preset=winter`
- Link back to configurator
- Support both 2D and 3D render modes
- Analytics tracking

**Deliverables:**
- Showcase mode component
- Preset system (Supabase schema)
- UI integration in configurator
- Shareable showcase URLs
- User testing

**Success Criteria:**
- Showcase mode works with 2D configurator
- Presets are visually appealing
- Switching between environments is smooth
- Shareable URLs work correctly
- Optional: 3D showcase mode works (if Phase 4 complete)
- Users enjoy the feature

---

## Phase 4: Configurator 3D Pipeline

**Status:** Planned  
**Timeline:** 10-12 weeks  
**Priority:** High (premium feature, optional)

### Overview
Build an optional high-fidelity 3D configurator using React Three Fiber. This provides immersive experiences for users with capable devices and enables AR/VR features.

### 4.1 React Three Fiber Scene Setup
**Priority:** Critical  
**Estimated Time:** 2 weeks  
**Dependencies:** Phase 0 (Foundation), Phase 4.2 (Assets)

**Detailed Steps:**

**Step 4.1.1: Scene Architecture Documentation**
- Document in `docs/configurator3d/scene-architecture.md`:
  - Camera rig setup
  - Control layers (orbit, pan, zoom)
  - Lighting stacks (HDRI, directional, ambient)
  - Scene graph structure
  - LOD strategy

**Step 4.1.2: Bootstrap Codebase**
- Create `web/src/features/configurator3d/` structure:
  - `components/` - React Three Fiber components
  - `hooks/` - custom hooks (useCamera, useLighting)
  - `materials/` - custom materials (PaintMaterial)
  - `systems/` - systems (animation, physics)
  - `utils/` - helpers (loaders, converters)

**Step 4.1.3: Basic Scene Setup**
- Create `Configurator3DScene.jsx`:
  - Set up Canvas with proper settings
  - Configure camera (perspective, FOV, position)
  - Add orbit controls (drei)
  - Set up lighting (HDRI + directional)
  - Add ground plane
  - Implement frameloop="demand"

**Step 4.1.4: LOD Implementation**
- Implement LOD heuristics:
  - Detect device capability (GPU, memory)
  - Calculate camera distance
  - Switch between LOD meshes
  - Use drei `<Detailed>` component
  - Fallback to 2D on low-end devices

**Deliverables:**
- Scene architecture docs
- Codebase structure
- Basic scene component
- LOD system

**Success Criteria:**
- Scene renders correctly
- Performance is acceptable
- LOD switches smoothly
- Fallback works

### 4.2 GLB Streaming & Caching
**Priority:** Critical  
**Estimated Time:** 2 weeks  
**Dependencies:** Phase 1 (Storage), Phase 4.1

**Detailed Steps:**

**Step 4.2.1: Asset Pipeline**
- Define asset processing workflow:
  - Source GLB files
  - Compress with Draco
  - Convert textures to KTX2
  - Optimize geometry
  - Generate LOD variants
  - Upload to Supabase Storage

**Step 4.2.2: Loader Implementation**
- Create loader utility:
  - Integrate DRACOLoader
  - Integrate KTX2Loader
  - Progressive loading
  - Placeholder meshes
  - Error handling
  - Retry logic

**Step 4.2.3: IndexedDB Caching**
- Implement caching strategy:
  - Cache decoded buffers in IndexedDB
  - Version assets (cache invalidation)
  - Check cache before download
  - Background updates
  - Cache size limits

**Deliverables:**
- Asset pipeline documentation
- Loader utility
- Caching implementation

**Success Criteria:**
- Assets load efficiently
- Caching works correctly
- Performance is good
- Errors handled

### 4.3 Interior/Exterior Toggles
**Priority:** High  
**Estimated Time:** 1.5 weeks  
**Dependencies:** Phase 4.1, Phase 4.2

**Detailed Steps:**

**Step 4.3.1: GLB Node Partitioning**
- Partition GLB nodes:
  - Interior group
  - Exterior group
  - Shared nodes (windows)
- Define in manifest
- Control visibility

**Step 4.3.2: Toggle UI**
- Create toggle component:
  - Interior/Exterior buttons
  - Smooth camera transition
  - Light rig swap
  - Animate visibility

**Step 4.3.3: Camera & Lighting**
- Implement camera presets:
  - Exterior: wide angle, elevated
  - Interior: closer, lower angle
- Swap light rigs:
  - Exterior: HDRI + sun
  - Interior: ambient + accent lights

**Deliverables:**
- Node partitioning
- Toggle UI
- Camera/lighting system

**Success Criteria:**
- Toggle works smoothly
- Camera transitions are natural
- Lighting is appropriate
- Performance is good

### 4.4 Studio Light Presets
**Priority:** Medium  
**Estimated Time:** 1.5 weeks  
**Dependencies:** Phase 1 (Schema), Phase 4.1

**Detailed Steps:**

**Step 4.4.1: Preset Schema**
- Create `studio_light_presets` table:
  - `id` (uuid)
  - `name` (text)
  - `hdri_path` (text)
  - `intensity` (float)
  - `color_temp` (float)
  - `metadata` (jsonb)

**Step 4.4.2: Preset Loader**
- Create API loader:
  - Fetch presets from Supabase
  - Cache in store
  - Fallback to defaults
  - Handle offline mode

**Step 4.4.3: Preset Picker UI**
- Create preset picker:
  - Grid of preset thumbnails
  - Preview on hover
  - Smooth transitions
  - Persist selection

**Deliverables:**
- Preset schema
- Loader implementation
- Picker UI

**Success Criteria:**
- Presets load correctly
- Switching is smooth
- Selection persists
- UI is intuitive

### 4.5 Paint Shader System
**Priority:** High  
**Estimated Time:** 2 weeks  
**Dependencies:** Phase 4.1, Phase 4.2

**Detailed Steps:**

**Step 4.5.1: Shader Specification**
- Document in `docs/configurator3d/paint-shader.md`:
  - Physical parameters (base color, metallic, roughness)
  - Flake parameters (density, size, color)
  - Clearcoat parameters (strength, roughness)
  - Polarization (optional)
  - Reference MeshPhysicalMaterial

**Step 4.5.2: Material Factory**
- Create `PaintMaterial.ts`:
  - Factory function
  - Expose uniforms
  - Handle texture maps
  - Support material presets
  - Optimize shader compilation

**Step 4.5.3: Control Panel**
- Create control panel:
  - Sliders for each parameter
  - Color pickers
  - Preset buttons
  - Real-time preview
  - Save presets

**Deliverables:**
- Shader specification
- Material factory
- Control panel

**Success Criteria:**
- Shader looks realistic
- Controls are responsive
- Presets work
- Performance is good

### 4.6 Animated Parts System
**Priority:** Medium  
**Estimated Time:** 2 weeks  
**Dependencies:** Phase 4.2, Phase 4.1

**Detailed Steps:**

**Step 4.6.1: Animation Conventions**
- Establish GLTF naming:
  - Doors: "door_*_open"
  - Spoiler: "spoiler_extend"
  - Aero: "aero_*_deploy"
- Document in asset validation checklist

**Step 4.6.2: Timeline Scrubber**
- Create timeline component:
  - Visual timeline
  - Play/pause controls
  - Scrub handle
  - Speed control
  - Loop toggle

**Step 4.6.3: Animation Controller**
- Create `useAnimationController` hook:
  - Load animation tracks
  - Control playback
  - Handle collisions
  - Sync with other systems

**Deliverables:**
- Animation conventions
- Timeline component
- Controller hook

**Success Criteria:**
- Animations play correctly
- Timeline is intuitive
- Performance is good

### 4.7 Volumetric Lighting & Fog
**Priority:** Low  
**Estimated Time:** 1.5 weeks  
**Dependencies:** Phase 4.1

**Detailed Steps:**

**Step 4.7.1: Quality Tiers**
- Document in `docs/performance/configurator3d-lighting.md`:
  - Low: no volumetric
  - Medium: basic fog
  - High: full volumetric
  - Performance safeguards

**Step 4.7.2: Implementation**
- Integrate volumetric pass:
  - Use postprocessing or drei
  - Adjustable density
  - Color controls
  - Performance monitoring

**Step 4.7.3: Toggle & Settings**
- Add toggle in settings:
  - Default off for low-power devices
  - User override
  - Quality selector

**Deliverables:**
- Quality tier documentation
- Volumetric implementation
- Settings toggle

**Success Criteria:**
- Volumetric looks good
- Performance is acceptable
- Toggle works
- Quality tiers respected

### 4.8 Background Stage Configuration
**Priority:** Medium  
**Estimated Time:** 1 week  
**Dependencies:** Phase 4.1, Phase 4.4

**Detailed Steps:**

**Step 4.8.1: HDRI Management**
- Document HDRI workflow:
  - Prefiltered PMREM generation
  - Storage paths
  - Loading strategy
  - Cache management

**Step 4.8.2: Controls Implementation**
- Create controls:
  - Rotation slider
  - Blur amount slider
  - HDRI selector
  - Real-time updates

**Step 4.8.3: Preference Persistence**
- Persist preferences:
  - Per user profile
  - Per configuration
  - Defaults

**Deliverables:**
- HDRI management docs
- Controls implementation
- Preference persistence

**Success Criteria:**
- Controls work smoothly
- Preferences persist
- Performance is good

### 4.9 WebXR Integration
**Priority:** Low  
**Estimated Time:** 2 weeks  
**Dependencies:** Phase 4.1, Phase 4.2

**Detailed Steps:**

**Step 4.9.1: Capability Detection**
- Detect WebXR support:
  - Check WebXR API
  - Check device capability
  - Surface onboarding
  - Graceful fallback

**Step 4.9.2: XR Integration**
- Integrate `@react-three/xr`:
  - Set up XR session
  - Teleport controls
  - Safe boundaries
  - Hand tracking (optional)

**Step 4.9.3: Session Management**
- Manage XR session:
  - Start/stop session
  - Sync with analytics
  - Allow graceful exit
  - Handle errors

**Deliverables:**
- Capability detection
- XR integration
- Session management

**Success Criteria:**
- XR works on supported devices
- Controls are intuitive
- Performance is acceptable
- Errors handled

### 4.10 Render Export System
**Priority:** Medium  
**Estimated Time:** 2 weeks  
**Dependencies:** Phase 4.1, Phase 7 (Edge Functions)

**Detailed Steps:**

**Step 4.10.1: Capture Pipeline**
- Document in `docs/operations/render-export.md`:
  - Multi-pass rendering
  - Supersampling
  - Resolution presets
  - Format options

**Step 4.10.2: Edge Function**
- Create Edge Function:
  - Accept render request
  - Queue job
  - Render server-side (if possible)
  - Store in storage
  - Return signed URL

**Step 4.10.3: UI Integration**
- Add export dialog:
  - Resolution presets
  - Format selector
  - Watermark toggle
  - Job status
  - Download button

**Deliverables:**
- Capture pipeline docs
- Edge Function
- Export UI

**Success Criteria:**
- Exports work correctly
- Quality is high
- Jobs process reliably
- UI is intuitive

### 4.11 Sound Design Integration
**Priority:** Low  
**Estimated Time:** 1.5 weeks  
**Dependencies:** Phase 4.1, Phase 1 (Storage)

**Detailed Steps:**

**Step 4.11.1: Audio Mapping**
- Map interactions to audio:
  - Option selection: click sound
  - Camera movement: whoosh
  - Door open: mechanical sound
  - Engine start: rev sound
- Store in Supabase Storage `audio` bucket

**Step 4.11.2: Audio Manager**
- Create audio manager:
  - Load audio files
  - Playback control
  - Spatialization (3D audio)
  - Debounce rapid sounds
  - Volume control

**Step 4.11.3: Settings Integration**
- Add settings toggle:
  - Default muted
  - User override
  - Volume slider
  - Respect user interaction requirement

**Deliverables:**
- Audio mapping
- Audio manager
- Settings integration

**Success Criteria:**
- Sounds play correctly
- Performance is good
- Mute works
- Accessibility respected

### 4.12 Wheel & Brake Animation
**Priority:** Low  
**Estimated Time:** 1 week  
**Dependencies:** Phase 4.6, Phase 4.2

**Detailed Steps:**

**Step 4.12.1: Animation Tracks**
- Ensure GLB includes:
  - Wheel rotation tracks
  - Brake animation tracks
  - Consistent naming

**Step 4.12.2: Hook Implementation**
- Create `useWheelAnimation` hook:
  - Trigger on performance package hover/select
  - Control animation speed
  - Sync with audio
  - Handle timeline scrubbing

**Step 4.12.3: Integration**
- Integrate with configurator:
  - Detect performance package selection
  - Trigger animation
  - Show visual feedback
  - Sync with other systems

**Deliverables:**
- Animation tracks
- Hook implementation
- Integration

**Success Criteria:**
- Animations trigger correctly
- Sync works
- Performance is good

### 4.13 3D Asset Validation Tool
**Priority:** Medium  
**Estimated Time:** 1.5 weeks  
**Dependencies:** Phase 4.2

**Detailed Steps:**

**Step 4.13.1: Validation Checklist**
- Document in `docs/checklists/3d-asset-validation.md`:
  - Scale requirements
  - Pivot points
  - Naming conventions
  - Texture budgets
  - Geometry limits
  - Animation requirements

**Step 4.13.2: CLI Tool**
- Develop Node CLI `tools/validate-3d-asset.ts`:
  - Use gltf-transform inspector
  - Check all validation rules
  - Generate report
  - Exit with error code

**Step 4.13.3: CI Integration**
- Wire into CI:
  - Run on asset commits
  - Fail build on violations
  - Generate reports
  - Block merges

**Deliverables:**
- Validation checklist
- CLI tool
- CI integration

**Success Criteria:**
- Validation catches issues
- CI blocks bad assets
- Reports are clear

### 4.14 Interior Lighting Customization
**Priority:** Low  
**Estimated Time:** 1.5 weeks  
**Dependencies:** Phase 4.1, Phase 1 (Schema)

**Detailed Steps:**

**Step 4.14.1: Schema Extension**
- Extend `interior_light_profiles` table:
  - RGB/HSV presets
  - Intensity values
  - Per-configuration storage

**Step 4.14.2: Color Picker UI**
- Create color picker:
  - RGB/HSV controls
  - Visual color wheel
  - Preset colors
  - Real-time preview

**Step 4.14.3: Shader Integration**
- Control shader uniforms:
  - Update emissive buffers
  - Apply to interior lights
  - Persist selection
  - Log analytics

**Deliverables:**
- Schema extension
- Color picker UI
- Shader integration

**Success Criteria:**
- Color picker works
- Lighting updates correctly
- Persistence works
- Performance is good

### 4.15 Scenario Presets
**Priority:** Low  
**Estimated Time:** 2 weeks  
**Dependencies:** Phase 4.1, Phase 1 (Schema), Phase 4.11

**Detailed Steps:**

**Step 4.15.1: Preset Schema**
- Model `scenario_presets` table:
  - Link to manifests
  - Props configuration
  - Audio cues
  - Lighting setup
  - Environment assets

**Step 4.15.2: Scenario Picker**
- Create scenario picker overlay:
  - Grid of scenarios
  - Preview thumbnails
  - Switch environment/props/audio simultaneously
  - Smooth transitions

**Step 4.15.3: Shareable URLs**
- Support shareable URLs:
  - Capture scenario + configuration
  - Generate unique URL
  - Load scenario on visit
  - Track analytics

**Deliverables:**
- Preset schema
- Scenario picker
- Shareable URLs

**Success Criteria:**
- Scenarios switch smoothly
- URLs work correctly
- Performance is good

---

## Phase 5: Account Settings & Profile Management

**Status:** Planned  
**Timeline:** 6-8 weeks  
**Priority:** Medium (enhances user experience)

### Overview
Build comprehensive account management system allowing users to manage their profile, preferences, security settings, payment methods, and ownership history.

### 5.1 Profile Editor
**Priority:** High  
**Estimated Time:** 1.5 weeks

**Steps**:
- Create profile editor UI with form validation
- Extend `profiles` table schema if needed
- Add API functions for profile updates
- Implement optimistic updates
- Add i18n support

### 5.2 Authentication Flows
**Priority:** High  
**Estimated Time:** 2 weeks

**Steps**:
- Password change flow via Supabase Auth
- Email change flow with verification
- MFA enrollment (TOTP/passkey)
- Document flows in `docs/account/mfa-plan.md`

### 5.3 WebAuthn Integration
**Priority:** Medium  
**Estimated Time:** 2 weeks

**Steps**:
- Document requirements in `docs/account/webauthn.md`
- Implement capability detection
- Create registration/auth flows
- Store credential metadata
- Handle unsupported devices

### 5.4 Notification Preferences
**Priority:** Medium  
**Estimated Time:** 1.5 weeks

**Steps**:
- Create `notification_preferences` table
- Build toggle matrix UI
- Integrate with messaging provider (Resend)
- Add i18n copy

### 5.5 Ownership History
**Priority:** Low  
**Estimated Time:** 2 weeks

**Steps**:
- Create `vehicle_ownerships` and `service_plans` tables
- Build timeline UI component
- Document in `docs/account/ownership-history.md`
- Plan admin import tooling

### 5.6 Address Book
**Priority:** Medium  
**Estimated Time:** 1.5 weeks

**Steps**:
- Create `account_addresses` table with RLS
- Build CRUD drawer with validation
- Expose to checkout/logistics flows
- Sync with Supabase

### 5.7 Connected Services
**Priority:** Low  
**Estimated Time:** 1.5 weeks

**Steps**:
- Document OAuth linking strategy
- Create connected services panel
- Handle unlink flows
- Show provider status

### 5.8 Payment Methods
**Priority:** High  
**Estimated Time:** 2 weeks

**Steps**:
- Plan Stripe setup intents
- Create Edge Functions for customer portal
- Build payment method list UI
- Show invoice history
- Store receipts in Supabase Storage

### 5.9 Loyalty & Achievements
**Priority:** Low  
**Estimated Time:** 2 weeks

**Steps**:
- Create `loyalty_status` table
- Design achievement grid UI
- Hook progress updates to events
- Plan automation

### 5.10 Document Vault
**Priority:** Low  
**Estimated Time:** 2 weeks

**Steps**:
- Set up `documents` storage bucket
- Create metadata table
- Build upload/list UI
- Implement access logs
- Provide download audit trail

### 5.11 Profile Completeness
**Priority:** Low  
**Estimated Time:** 1 week

**Steps**:
- Define completion scoring
- Implement progress indicator
- Create actionable checklist
- Trigger contextual nudges

### 5.12 Event Management
**Priority:** Low  
**Estimated Time:** 1.5 weeks

**Steps**:
- Model `account_events` table
- Create event list/calendar UI
- Add RSVP actions
- Integrate with notifications

### 5.13 Service Appointments
**Priority:** Low  
**Estimated Time:** 2 weeks

**Steps**:
- Define `service_appointments` table
- Create scheduling Edge Function
- Build booking wizard
- Wire reminder notifications

### 5.14 Digital Car Key
**Priority:** Low  
**Estimated Time:** 1.5 weeks

**Steps**:
- Author simulation spec (`docs/account/digital-key.md`)
- Implement staged UI
- Log interactions for analytics
- Clarify simulation nature

### 5.15 Impact Preferences
**Priority:** Low  
**Estimated Time:** 1 week

**Steps**:
- Create `impact_preferences` table
- Build preference chips UI
- Connect to marketing automation
- Track analytics

### 5.16 In-Car Sync Simulation
**Priority:** Low  
**Estimated Time:** 1 week

**Steps**:
- Provide mock API service
- Build sync status component
- Store sync timestamp
- Clarify fictional nature

---

## Phase 6: AI Assistant & Support System

**Status:** Planned  
**Timeline:** 6-8 weeks  
**Priority:** Medium (enhances user support)

### Overview
Build an AI-powered assistant that provides brand-aware support, answers questions, and guides users through the platform.

### 6.1 Chat Widget
**Priority:** High  
**Estimated Time:** 2 weeks

**Steps**:
- Define conversation architecture (`docs/ai/chat-widget.md`)
- Create feature slice `web/src/features/ai/`
- Implement widget UI and message store
- Create Edge Function `functions/ai-chat/index.ts`
- Add guardrails and rate limiting

### 6.2 Voice Support
**Priority:** Medium  
**Estimated Time:** 2 weeks

**Steps**:
- Evaluate Web Speech API vs external TTS
- Build speech recognition/synthesis hooks
- Tie to i18n locale
- Add captions/transcripts
- Implement accessibility controls

### 6.3 Human Handoff
**Priority:** High  
**Estimated Time:** 1.5 weeks

**Steps**:
- Document escalation criteria (`docs/ai/handoff.md`)
- Add widget CTA for call/email
- Log audit events
- Integrate with notification/CRM pipeline

### 6.4 Page Redirects
**Priority:** Medium  
**Estimated Time:** 1 week

**Steps**:
- Create intent-to-route mapping
- Implement suggestion chips
- Trigger React Router navigation
- Track redirects via analytics

### 6.5 Translation Layer
**Priority:** Medium  
**Estimated Time:** 1.5 weeks

**Steps**:
- Ensure prompts respect i18n locale
- Update Edge Function for language requests
- Use translation API fallback if needed
- QA multilingual flows
- Document test checklist (`docs/ai/testing.md`)

### 6.6 Data Integration
**Priority:** Medium  
**Estimated Time:** 2 weeks

**Steps**:
- Expose safe read-only APIs/RPCs
- Curate knowledge snippets
- Create response templates
- Add compliance guardrails
- Log recommendations to user profile

---

## Phase 7: Operations & Observability

**Status:** Planned  
**Timeline:** 4-6 weeks  
**Priority:** High (required for production)

### Overview
Establish comprehensive logging, monitoring, health checks, and operational procedures for production readiness.

### 7.1 Logging Infrastructure
**Priority:** Critical  
**Estimated Time:** 1 week

**Steps**:
- Document logging strategy (`docs/operations/logging.md`)
- Implement `web/src/lib/logger.js`
- Create shared Edge wrapper
- Inject request IDs
- Verify in browser console and Supabase logs

### 7.2 Error Monitoring
**Priority:** Critical  
**Estimated Time:** 1.5 weeks

**Steps**:
- Outline monitoring setup (`docs/operations/monitoring.md`)
- Add Sentry client integration
- Capture exceptions with request IDs
- Wrap Edge functions for error reporting
- Ensure staging/prod separation

### 7.3 Health Endpoint
**Priority:** High  
**Estimated Time:** 1 week

**Steps**:
- Specify health check contract (`docs/operations/health-endpoint.md`)
- Implement Edge/Vite endpoint
- Include request ID header
- Configure external uptime monitor
- Document alert routing

### 7.4 Deployment Runbook
**Priority:** High  
**Estimated Time:** 1 week

**Steps**:
- Author `docs/operations/runbook.md`
- Detail deploy pipeline
- Document rollback procedures
- List support contacts
- Include feature flag considerations

### 7.5 Launch Checklist
**Priority:** High  
**Estimated Time:** 0.5 weeks

**Steps**:
- Create `docs/checklists/launch-checklist.md`
- List pre-launch tasks
- Integrate with PR template
- Include manual sign-off process

### 7.6 Weekly Review Process
**Priority:** Medium  
**Estimated Time:** 0.5 weeks

**Steps**:
- Document review cadence (`docs/operations/weekly-review.md`)
- Provide query templates
- Guide metric export from Supabase
- Document logging outcomes

---

## Phase 8: Advanced Features & Integrations

**Status:** Planned  
**Timeline:** 12+ weeks  
**Priority:** Low (post-MVP enhancements)

### Overview
Advanced features including Volturiano World experiences, investor microsite enhancements, advanced analytics, and future integrations.

### 8.1 Volturiano World Enhancements
**Priority:** Medium  
**Estimated Time:** 4-6 weeks

**Features**:
- Enhanced ownership experiences
- Connectivity features
- Service integration
- Event management
- Community features

### 8.2 Investor Microsite
**Priority:** Low  
**Estimated Time:** 2-3 weeks

**Features**:
- Pitch deck hosting
- Metrics dashboard
- Investor portal
- Secure document sharing

### 8.3 Advanced Analytics
**Priority:** Low  
**Estimated Time:** 3-4 weeks

**Features**:
- User behavior tracking
- Configuration analytics
- Conversion funnel analysis
- A/B testing framework

### 8.4 CRM Integration
**Priority:** Medium  
**Estimated Time:** 3-4 weeks

**Features**:
- Lead sync
- Test drive requests
- Order synchronization
- Customer data sync

### 8.5 Marketing Automation
**Priority:** Low  
**Estimated Time:** 2-3 weeks

**Features**:
- Email campaigns
- Segmentation
- Personalization
- Event triggers

---

## Phase 9: Product Launches & Marketing Communications

**Status:** Planned  
**Timeline:** 4-6 weeks  
**Priority:** Medium (growth and engagement features)

### Overview
Build comprehensive product launch and marketing communication systems that enable proactive engagement with users, announce new vehicle models, and maintain brand awareness through targeted notifications and announcements. This phase focuses on creating a scalable marketing infrastructure that supports product launches, user engagement, and growth initiatives.

### 9.1 Model Launch Notification System
**Priority:** High  
**Estimated Time:** 2 weeks  
**Dependencies:** Phase 2 (Garage), Phase 7 (Notifications), Phase 1 (Schema)

**Detailed Steps:**

**Step 9.1.1: Subscription Management Infrastructure**
- Create `model_subscriptions` table:
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `model_id` (text, references vehicles.name)
  - `notification_preferences` (jsonb) - email, push, in-app
  - `subscribed_at` (timestamptz)
  - `unsubscribed_at` (timestamptz, nullable)
  - Unique constraint on (user_id, model_id)
- Create RLS policies (users manage own subscriptions)
- Add subscription toggle in garage settings UI
- Allow subscribing to multiple models simultaneously
- Implement unsubscribe functionality with confirmation

**Step 9.1.2: Launch Announcement System**
- Create `model_launches` table:
  - `id` (uuid, primary key)
  - `model_id` (text, references vehicles.name)
  - `launch_date` (date, not null)
  - `announcement_date` (date) - when to send notifications
  - `title` (text, not null)
  - `teaser_content` (text)
  - `full_content` (text)
  - `hero_image_url` (text)
  - `configurator_link` (text) - deep link to new model
  - `status` (enum: 'draft', 'scheduled', 'announced', 'launched')
  - `created_by` (uuid, references profiles)
  - `created_at`, `updated_at` (timestamptz)
- Create admin interface for managing launches
- Support rich content (images, videos, links)
- Schedule announcements in advance

**Step 9.1.3: Notification Delivery System**
- Create Edge Function `functions/notify-launch/index.ts`:
  - Accept launch announcement ID
  - Query subscribed users for the model
  - Respect user notification preferences
  - Generate personalized email templates
  - Send via email provider (Resend/SendGrid)
  - Support batch processing for large subscriber lists
  - Log delivery status in `notification_deliveries` table
  - Track open rates, click rates, and engagement metrics
  - Handle bounces and unsubscribes gracefully
  - Retry failed deliveries with exponential backoff

**Step 9.1.4: User Interface Integration**
- Add subscription management to garage settings:
  - Show subscription status per model
  - Toggle subscriptions with visual feedback
  - Display upcoming launches for subscribed models
- Create launch announcements banner/component:
  - Display active and upcoming launches
  - Show teaser content with images
  - Link to configurator for new model
  - Dismissible announcements
- Add in-app notification center:
  - Show launch notifications
  - Mark as read/unread
  - Link to relevant content
- Email templates:
  - On-brand design with Volturiano styling
  - Responsive layout
  - Clear call-to-action buttons
  - Unsubscribe link in footer
  - Preference center link

**Deliverables:**
- Model subscription system (database + UI)
- Launch announcement management (admin interface)
- Notification delivery Edge Function
- Email templates (responsive, on-brand)
- In-app notification center
- Analytics and tracking dashboard

**Success Criteria:**
- Users can easily subscribe/unsubscribe to model launches
- Launch announcements are created and scheduled successfully
- Notifications are delivered reliably (>99% delivery rate)
- Email design is on-brand and responsive
- Unsubscribe process is simple and immediate
- Engagement metrics are tracked accurately
- System scales to 10,000+ subscribers per launch

### 9.2 Product Update Communications
**Priority:** Medium  
**Estimated Time:** 1.5 weeks  
**Dependencies:** Phase 9.1

**Detailed Steps:**

**Step 9.2.1: Update Categories**
- Define communication types:
  - New features (configurator enhancements, garage features)
  - Product updates (new options, compatibility changes)
  - Service announcements (maintenance, downtime)
  - Special offers (limited editions, promotions)
- Create `product_updates` table:
  - `id` (uuid, primary key)
  - `category` (enum: 'feature', 'product', 'service', 'offer')
  - `title` (text, not null)
  - `content` (text)
  - `target_audience` (jsonb) - all users, specific segments
  - `published_at` (timestamptz)
  - `expires_at` (timestamptz, nullable)

**Step 9.2.2: User Segmentation**
- Create user segments based on:
  - Activity level (active, inactive)
  - Garage item count
  - Configuration history
  - Purchase history
  - Preferences
- Store segments in `user_segments` table
- Update segments periodically (daily job)

**Step 9.2.3: Targeted Delivery**
- Extend notification system:
  - Target specific user segments
  - A/B test different messaging
  - Personalize content based on user history
  - Track segment-specific engagement

**Deliverables:**
- Product update system
- User segmentation infrastructure
- Targeted delivery capabilities
- Analytics dashboard

**Success Criteria:**
- Updates can be targeted to specific segments
- Personalization improves engagement
- A/B testing provides actionable insights

### 9.3 Launch Event Management
**Priority:** Low  
**Estimated Time:** 1.5 weeks  
**Dependencies:** Phase 9.1, Phase 5 (Account Settings)

**Detailed Steps:**

**Step 9.3.1: Event Schema**
- Create `launch_events` table:
  - `id` (uuid, primary key)
  - `model_id` (text, references vehicles.name)
  - `event_type` (enum: 'reveal', 'preview', 'launch', 'test-drive')
  - `event_date` (timestamptz)
  - `location` (text) - physical or virtual
  - `description` (text)
  - `registration_required` (boolean)
  - `max_attendees` (integer, nullable)

**Step 9.3.2: Event Registration**
- Create `event_registrations` table:
  - `id` (uuid, primary key)
  - `event_id` (uuid, references launch_events)
  - `user_id` (uuid, references profiles)
  - `status` (enum: 'registered', 'confirmed', 'cancelled', 'attended')
  - `registered_at` (timestamptz)
- Build registration UI
- Send confirmation emails
- Send reminder notifications (24h before event)

**Step 9.3.3: Integration**
- Link events to launch announcements
- Show upcoming events in garage
- Allow RSVP from notification emails
- Track attendance and engagement

**Deliverables:**
- Event management system
- Registration interface
- Reminder notifications
- Attendance tracking

**Success Criteria:**
- Users can register for launch events
- Reminders are sent reliably
- Event capacity is managed correctly
- Attendance is tracked accurately

---

## Dependencies & Critical Path

### Critical Path Analysis

**Foundation → Garage → Configurator → Commerce**

1. **Phase 0 (Foundation)**: Blocks everything
2. **Phase 1 (Supabase Platform)**: Required for Garage and Configurator
3. **Phase 2 (Garage)**: Can proceed in parallel with Phase 1
4. **Phase 3 (Configurator 2D)**: Requires Phase 1, integrates with Phase 2
5. **Phase 4 (Configurator 3D)**: Requires Phase 3, optional
6. **Phase 5 (Account Settings)**: Can proceed in parallel
7. **Phase 6 (AI Assistant)**: Can proceed in parallel
8. **Phase 7 (Operations)**: Required before production launch
9. **Phase 8 (Advanced Features)**: Post-MVP
10. **Phase 9 (Product Launches & Marketing)**: Growth phase, can proceed in parallel with Phase 8

### Dependency Graph

```
Phase 0 (Foundation)
    ↓
Phase 1 (Supabase Platform) ──┐
    ↓                           │
Phase 2 (Garage) ───────────────┼──→ Phase 3 (Configurator 2D)
    ↓                           │           ↓
Phase 5 (Account) ──────────────┼──→ Phase 4 (Configurator 3D)
    ↓                           │
Phase 6 (AI Assistant) ─────────┤
    ↓                           │
Phase 7 (Operations) ────────────┘
    ↓
Phase 8 (Advanced Features)
    ↓
Phase 9 (Product Launches & Marketing)
```

---

## Risk Assessment & Mitigation

### Technical Risks

**Risk 1: Supabase Performance at Scale**
- **Impact**: High
- **Probability**: Medium
- **Mitigation**: Index optimization, query monitoring, caching strategy
- **Contingency**: Consider read replicas, connection pooling

**Risk 2: 3D Performance on Low-End Devices**
- **Impact**: Medium
- **Probability**: High
- **Mitigation**: LOD system, quality tiers, 2D fallback
- **Contingency**: Disable 3D on low-end devices

**Risk 3: Real-time Subscription Limits**
- **Impact**: Medium
- **Probability**: Low
- **Mitigation**: Monitor subscription count, optimize channels
- **Contingency**: Polling fallback

**Risk 4: Data Migration Complexity**
- **Impact**: High
- **Probability**: Medium
- **Mitigation**: Versioned migrations, thorough testing, rollback plans
- **Contingency**: Staged rollouts, feature flags

### Business Risks

**Risk 1: Scope Creep**
- **Impact**: High
- **Probability**: High
- **Mitigation**: Strict prioritization, roadmap adherence
- **Contingency**: Regular scope reviews

**Risk 2: Timeline Delays**
- **Impact**: Medium
- **Probability**: Medium
- **Mitigation**: Buffer time, parallel work streams
- **Contingency**: Feature de-scoping, phased releases

---

## Success Metrics & KPIs

### Phase 0 (Foundation)
- Setup time: <30 minutes for new developers
- Build time: <2 minutes
- Test coverage: >70% for core utilities

### Phase 1 (Supabase Platform)
- Query performance: <100ms for common queries
- Migration success rate: 100%
- RLS policy coverage: 100%

### Phase 2 (Garage)
- Load time: <500ms initial load
- Filter performance: <200ms
- Search performance: <50ms (client-side)
- User retention: 40% return within 7 days

### Phase 3 (Configurator 2D)
- Option swap time: <100ms
- Image load time: <1s on 3G
- LCP: <2.5s
- Conversion rate: 25% increase

### Phase 4 (Configurator 3D)
- FPS: 60fps on mid-tier devices
- Load time: <5s for GLB
- Fallback rate: <10% to 2D

### Phase 5 (Account Settings)
- Profile completion: 80% complete profiles
- MFA adoption: 30% of users
- Support ticket reduction: 40%

### Phase 6 (AI Assistant)
- Response time: <2s
- Resolution rate: 70% without human
- User satisfaction: 4.5/5 stars

### Phase 7 (Operations)
- Uptime: 99.9%
- Error rate: <0.1%
- Mean time to resolution: <1 hour

### Phase 9 (Product Launches & Marketing)
- Email delivery rate: >99%
- Open rate: >25% (industry average: 20%)
- Click-through rate: >5% (industry average: 3%)
- Subscription conversion: 30% of active users
- Unsubscribe rate: <0.5% per campaign
- Event registration rate: 15% of notified users
- Notification system uptime: 99.9%

---

## Timeline Estimates

### Overall Timeline

**MVP (Phases 0-3)**: 4-6 months
**Full Feature Set (Phases 0-7)**: 12-18 months
**Advanced Features (Phase 8)**: 6+ months (ongoing)
**Growth & Marketing (Phase 9)**: 4-6 weeks

### Phase Breakdown

- **Phase 0**: 2-3 months (80% complete)
- **Phase 1**: 3-4 weeks
- **Phase 2**: 6-8 weeks (core complete, advanced pending)
- **Phase 3**: 8-10 weeks
- **Phase 4**: 10-12 weeks
- **Phase 5**: 6-8 weeks
- **Phase 6**: 6-8 weeks
- **Phase 7**: 4-6 weeks
- **Phase 8**: 12+ weeks (ongoing)
- **Phase 9**: 4-6 weeks

### Critical Path Timeline

**Fastest Path to MVP**:
1. Complete Phase 0: 1 month
2. Complete Phase 1: 1 month
3. Complete Phase 2 core: 1 month (done)
4. Complete Phase 3: 2 months
5. Complete Phase 7: 1 month

**Total**: ~6 months to production-ready MVP

---

## Resource Requirements

### Team Composition

**Minimum Team**:
- 1 Full-stack developer (React + Supabase)
- 1 Designer (UI/UX)
- 0.5 DevOps (deployment, monitoring)
- 0.5 Product Manager (prioritization, requirements)

**Ideal Team**:
- 2-3 Full-stack developers
- 1 Frontend specialist (React, 3D)
- 1 Backend specialist (Supabase, Edge Functions)
- 1 Designer
- 1 DevOps engineer
- 1 Product Manager

### Infrastructure Costs

**Supabase**:
- Pro plan: ~$25/month (scales with usage)
- Storage: ~$0.021/GB/month
- Edge Functions: Included

**Hosting**:
- Vercel/Netlify: Free tier (scales with usage)
- CDN: Included

**Monitoring**:
- Sentry: Free tier (scales with usage)
- Uptime monitoring: Free tier available

**Estimated Monthly Cost**: $50-200 (scales with users)

---

## Appendix: Technical Specifications

### Performance Targets

**Frontend**:
- Initial JS bundle: <200KB gzipped
- LCP: <2.5s
- FID: <100ms
- CLS: <0.1
- FPS: 60fps (animations)

**Backend**:
- API response time: <200ms (p95)
- Database query time: <100ms (p95)
- Edge Function execution: <1s (p95)

**Scalability**:
- Support 10,000+ concurrent users
- Handle 1M+ saved configurations
- Process 10,000+ orders/month

### Security Requirements

**Authentication**:
- Supabase Auth (email/password)
- MFA support (TOTP/passkey)
- Social login (optional)

**Authorization**:
- RLS on all user-owned tables
- Service role for admin operations
- JWT-based access control

**Data Protection**:
- Encryption at rest (Supabase)
- Encryption in transit (HTTPS)
- PII handling per GDPR/CCPA

### Accessibility Requirements

**WCAG 2.1 AA Compliance**:
- Keyboard navigation
- Screen reader support
- Color contrast ratios
- Focus indicators
- Alt text for images
- ARIA labels where needed

### Browser Support

**Target Browsers**:
- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile: iOS Safari, Chrome Android

**Progressive Enhancement**:
- Core features work without JS (basic)
- Enhanced features with JS
- 3D requires WebGL support

---

## Conclusion

This Ultimate Roadmap provides a comprehensive, phase-by-phase plan for building the VOLTURIANO platform. Each phase builds upon previous work, with clear dependencies, timelines, and success criteria.

**Key Takeaways**:
- **MVP Timeline**: 4-6 months (Phases 0-3)
- **Full Feature Set**: 12-18 months (Phases 0-7)
- **Advanced Features**: 6+ months (Phase 8, ongoing)
- **Growth & Marketing**: 4-6 weeks (Phase 9)
- **Critical Path**: Foundation → Garage → Configurator → Commerce
- **Success Metrics**: Defined for each phase
- **Risk Mitigation**: Identified and planned

**Next Steps**:
1. Review and prioritize phases
2. Assign resources
3. Begin Phase 1 (Supabase Platform)
4. Continue Phase 2 (Garage advanced features)
5. Plan Phase 3 (Configurator 2D)

**Documentation**:
- Feature docs: `docs/[feature]/feature-documentation.md`
- Database rationale: `docs/[feature]/database-rationale.md`
- Development guides: `docs/development/`
- Roadmap: `docs/ULTIMATE_ROADMAP.md` (this file)

---

**End of Ultimate Roadmap**

**Total Lines**: 2800+  
**Last Updated**: 2025-01-XX  
**Status**: Active Planning Document


