# VOLTURIANO Project Structure

**Purpose**: Complete directory tree with file purposes and organization  
**Last Updated**: 2025-01-XX

---

## Root Directory

```
MainSite_Volturiano/
├── .cursor/              # Cursor IDE rules and configuration
├── docs/                 # Project documentation
├── supabase/             # Supabase migrations, seeds, SQL
├── web/                  # Frontend React application
├── TODO.txt              # Project backlog and status
├── everything.txt        # Comprehensive project overview
└── README.md             # Project README
```

---

## .cursor/ Directory

**Purpose**: Cursor IDE-specific rules and configuration files

```
.cursor/
└── rules/                # Cursor-aware development rules
    ├── 00-repo-overview.md
    ├── 01-architecture.md
    ├── 02-conventions.md
    ├── 03-workflow.md
    ├── 04-security.md
    ├── 05-i18n.md
    ├── 06-performance.md
    ├── 07-extensibility.md
    ├── 08-ai-helper.md
    ├── 09-style-system.md
    ├── 10-testing-observability.md
    ├── 11-feature-flags.md
    ├── 12-git.md
    └── 13-garage-feature.md  # Garage-specific rules
```

**File Purposes**:
- Each rule file defines patterns and conventions for specific areas
- Cursor IDE reads these to provide context-aware suggestions
- Format: Markdown with YAML frontmatter

---

## docs/ Directory

**Purpose**: Comprehensive project documentation

```
docs/
├── account/              # Account settings documentation
│   ├── digital-key.md
│   ├── mfa-plan.md
│   ├── notification-preferences.md
│   ├── ownership-history.md
│   ├── profile-editor.md
│   └── webauthn.md
├── ai/                   # AI assistant documentation
│   ├── assistant.md
│   ├── chat-widget.md
│   ├── handoff.md
│   └── testing.md
├── architecture/         # System architecture docs
│   ├── auth.md
│   ├── backend.md
│   ├── extensibility.md
│   ├── folder-structure.md
│   ├── frontend.md
│   └── overview.md
├── checklists/           # Development checklists
│   ├── 3d-asset-validation.md
│   ├── launch-checklist.md
│   └── ultimate-configurator.md
├── configurator/         # 2D configurator docs
│   └── manifest-schema.md
├── configurator3d/       # 3D configurator docs
│   ├── paint-shader.md
│   └── scene-architecture.md
├── data/                 # Data schema docs
│   ├── asset-manifest.md
│   ├── compatibility-rules.md
│   └── taxonomy.md
├── development/          # Developer guides
│   ├── dev-loop-guide.md
│   └── context-preservation.md
├── env/                  # Environment docs
│   └── variables.md
├── future/               # Future vision
│   └── vision.md
├── garage/               # Garage feature docs
│   ├── feature-documentation.md
│   ├── database-rationale.md
│   ├── future-roadmap.md
│   ├── implementation-summary.md
│   ├── supabase-setup.md
│   └── testing-guide.md
├── how-to/               # How-to guides
│   ├── add-language.md
│   ├── add-option.md
│   ├── add-vehicle.md
│   ├── enable-3d.md
│   └── upload-assets.md
├── i18n/                 # Internationalization
│   └── guide.md
├── operations/           # Operations docs
│   ├── health-endpoint.md
│   ├── logging.md
│   ├── monitoring.md
│   ├── observability.md
│   ├── render-export.md
│   ├── render-watermarking.md
│   ├── runbook.md
│   └── weekly-review.md
├── performance/          # Performance docs
│   ├── asset-pipeline.md
│   ├── configurator-image-scaling.md
│   └── configurator3d-lighting.md
├── quality/              # Quality assurance
│   └── testing.md
├── security/             # Security policies
│   └── security-policies.md
├── style/                # Style guide
│   └── guide.md
├── ux/                   # UX guidelines
│   ├── breadcrumbs.md
│   └── motion.md
├── garage-schema.md      # Garage JSON schema
├── platform-schema.md    # Platform schema
├── project-structure.md  # This file
├── README.md             # Docs index
├── roadmap.md            # High-level roadmap
└── ULTIMATE_ROADMAP.md   # Comprehensive 2000+ line roadmap
```

---

## supabase/ Directory

**Purpose**: Database migrations, seeds, and SQL scripts

```
supabase/
├── migrations/           # Versioned database migrations
│   └── 20251110000000_initial_schema.sql
├── seeds/                # Seed data for development
│   ├── account_settings_seed.sql
│   ├── assistant_seed.sql
│   ├── configurator_presets.sql
│   ├── configurator3d_seed.sql
│   ├── garage_diagnose.sql
│   ├── garage_test_data.sql
│   ├── garage_test_data_simple.sql
│   └── platform_seed.sql
└── sql/                  # SQL schema files
    ├── account_settings_schema.sql
    ├── ai_assistant_schema.sql
    ├── configurator_2d_schema.sql
    ├── configurator3d_schema.sql
    ├── garage_schema.sql
    ├── platform_schema.sql          # Core platform schema (Phase 1)
    ├── prepare_configurator_support.sql  # ⭐ Configurator prep (run after platform_schema)
    ├── storage_policies.sql
    ├── add_check_compatibility_rpc.sql
    └── platform_schema_cleanup.sql
```

**File Purposes**:
- **migrations/**: Versioned, sequential migrations (applied in order)
- **seeds/**: Test/demo data for local development
- **sql/**: Complete schema files (for reference, not migrations)

**Important:** After running `platform_schema.sql`, **always run `prepare_configurator_support.sql`** to prepare the database for Phase 3 configurator editing. This script is already deployed in production.

---

## web/ Directory

**Purpose**: Frontend React application

```
web/
├── dist/                 # Build output (gitignored)
├── node_modules/         # Dependencies (gitignored)
├── public/               # Static assets
├── src/                  # Source code
│   ├── app/              # App-level setup
│   │   └── App.jsx       # Main app component, routing
│   ├── assets/           # Static assets (images, videos)
│   │   ├── H1/           # Homepage assets
│   │   ├── Logo/         # Logo assets
│   │   ├── showroom/     # Showroom assets
│   │   └── start/        # Start animation assets
│   ├── components/       # Shared UI components
│   │   ├── LoadingOverlay/
│   │   ├── NavBar/
│   │   ├── NavDrawer/
│   │   ├── PageTransition/
│   │   └── Showroom/
│   ├── debug/            # Debug utilities
│   │   ├── checkSupabase.js
│   │   └── useRenderLogger.js
│   ├── features/         # Feature-sliced modules
│   │   ├── account/      # Account feature
│   │   │   ├── api.js    # Account + Garage API functions
│   │   │   ├── components/
│   │   │   │   └── AccountMenu.jsx
│   │   │   └── pages/
│   │   │       ├── Garage.jsx
│   │   │       ├── Login.jsx
│   │   │       ├── Profile.jsx
│   │   │       └── VolturianoWorld.jsx
│   │   └── garage/       # Garage feature
│   │       ├── components/
│   │       │   ├── CarCard.jsx
│   │       │   ├── GarageEmptyState.jsx
│   │       │   ├── GarageFilters.jsx
│   │       │   ├── GarageLane.jsx
│   │       │   └── GarageLayout.jsx
│   │       └── styles/
│   │           └── garage.module.css
│   ├── i18n/             # Internationalization
│   │   ├── en/           # English translations
│   │   │   ├── account.json
│   │   │   ├── common.json
│   │   │   ├── configurator.json
│   │   │   ├── home.json
│   │   │   ├── models.json
│   │   │   ├── nav.json
│   │   │   ├── showroom.json
│   │   │   ├── start.json
│   │   │   ├── world.json
│   │   │   └── investor.json
│   │   └── sv/           # Swedish translations
│   │       └── [same structure as en/]
│   ├── lib/               # Library utilities
│   │   └── supabaseClient.js
│   ├── pages/             # Page components
│   │   ├── Configurator/
│   │   ├── Debug/
│   │   ├── Home/
│   │   ├── Investor/
│   │   ├── Models/
│   │   ├── Start/
│   │   └── World/
│   ├── providers/         # React context providers
│   │   └── i18n.js
│   ├── stores/            # Zustand stores
│   │   ├── configStore.js
│   │   ├── garageStore.js
│   │   ├── uiStore.js
│   │   └── userStore.js
│   ├── styles/            # Global styles
│   │   ├── base.css
│   │   ├── reset.css
│   │   ├── utilities.css
│   │   └── variables.css
│   ├── viewers/            # Visualization engines
│   │   ├── three-d/       # 3D viewer (React Three Fiber)
│   │   └── two-d/         # 2D viewer (layered images)
│   └── main.jsx           # Application entry point
├── index.html             # HTML template
├── package.json           # Dependencies and scripts
├── package-lock.json      # Locked dependency versions
├── postcss.config.js      # PostCSS configuration
└── vite.config.js         # Vite build configuration
```

### Key Directories Explained

**src/app/**: Application shell, routing, providers
**src/features/**: Feature-sliced modules (account, garage, configurator, etc.)
**src/components/**: Shared UI components used across features
**src/pages/**: Route-level page components
**src/stores/**: Zustand state management stores
**src/lib/**: Utility libraries and helpers
**src/i18n/**: Internationalization translation files
**src/styles/**: Global styles and design tokens

---

## Configuration Files

### Root Level

- **TODO.txt**: Project backlog with status tracking
- **everything.txt**: Comprehensive project overview and principles
- **README.md**: Project README (setup instructions)

### web/ Level

- **package.json**: Node.js dependencies and npm scripts
- **vite.config.js**: Vite build tool configuration
- **postcss.config.js**: PostCSS processing configuration
- **.env.local**: Environment variables (gitignored, create from .env.example)

---

## Asset Organization

### Image Assets

**Location**: `web/src/assets/`

**Organization**:
- **H1/**: Homepage hero images and videos
- **Logo/**: Brand logos and icons
- **showroom/**: Showroom car images
- **start/**: Start animation card images

**Naming Convention**:
- Descriptive names (e.g., `TornadoLogo.png`)
- No spaces, use PascalCase or kebab-case
- Include purpose in name (e.g., `LeftArrowShowroomBlack.png`)

### Storage Assets (Supabase)

**Buckets**:
- `renders` - High-res configurator renders (private)
- `models` - 3D GLB models and textures (private)
- `garage-thumbnails` - User-uploaded thumbnails (private)
- `documents` - User documents (private)
- `audio` - Sound effects (private)

---

## Build Artifacts

### Generated Files (Gitignored)

- **web/dist/**: Production build output
- **web/node_modules/**: Installed dependencies
- **.env.local**: Local environment variables
- **.supabase/**: Local Supabase instance data

### Build Process

1. **Development**: `npm run dev` - Vite dev server with HMR
2. **Build**: `npm run build` - Production build to `dist/`
3. **Preview**: `npm run preview` - Preview production build locally

---

## File Naming Conventions

### Components

- **PascalCase**: `GarageLayout.jsx`, `CarCard.jsx`
- **One component per file**: Export default component
- **Co-located styles**: `Component.module.css` next to component

### Utilities

- **camelCase**: `useRenderLogger.js`, `checkSupabase.js`
- **Hook prefix**: `use` for React hooks
- **Utility suffix**: No suffix for pure functions

### Styles

- **CSS Modules**: `Component.module.css`
- **Global styles**: `base.css`, `variables.css`
- **No inline styles**: Use CSS Modules or global tokens

### i18n Files

- **kebab-case**: `account.json`, `common.json`
- **Namespace matches**: File name matches namespace key
- **Locale folders**: `en/`, `sv/` for languages

---

## Import Patterns

### Absolute vs Relative Imports

**Current**: Relative imports (e.g., `../../../stores/garageStore`)

**Future Consideration**: Path aliases (e.g., `@/stores/garageStore`)

### Import Order

1. React and React-related imports
2. Third-party libraries
3. Internal utilities and hooks
4. Components
5. Styles (CSS Modules)
6. Types (if TypeScript)

**Example**:
```javascript
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useGarageStore } from '../../../stores/garageStore';
import styles from './Component.module.css';
```

---

## Feature-Sliced Architecture

### Feature Structure

Each feature follows this structure:

```
features/[feature-name]/
├── components/       # Feature-specific components
├── pages/            # Feature pages (if route-level)
├── styles/           # Feature-specific styles
├── utils/            # Feature utilities (optional)
└── api.js            # Feature API functions (if shared)
```

### Current Features

1. **account**: Authentication, profile, garage integration
2. **garage**: Garage management (saved builds, etc.)
3. **configurator**: Vehicle configuration (planned)
4. **world**: Volturiano World experiences (planned)
5. **ai**: AI assistant (planned)

---

## State Management Organization

### Store Files

**Location**: `web/src/stores/`

**Stores**:
- `userStore.js` - User session and profile
- `garageStore.js` - Garage items and filters
- `configStore.js` - Configurator state (planned)
- `uiStore.js` - UI state (menu toggles, audio, etc.)

**Pattern**: One store per domain, Zustand for state management

---

## Testing Organization

### Test Files (Future)

**Planned Structure**:
```
web/src/
├── __tests__/        # Unit tests
├── __mocks__/        # Test mocks
└── e2e/              # E2E tests (Playwright)
```

**Current**: Testing infrastructure planned, not yet implemented

---

## Documentation Organization

### By Topic

- **Architecture**: `docs/architecture/`
- **Features**: `docs/[feature-name]/`
- **Development**: `docs/development/`
- **Operations**: `docs/operations/`
- **How-To**: `docs/how-to/`

### By Audience

- **New Developers**: `docs/development/dev-loop-guide.md`
- **Architects**: `docs/architecture/`
- **Operators**: `docs/operations/`
- **Content Team**: `docs/how-to/`

---

## Key Principles

### Organization Principles

1. **Feature-Sliced**: Code organized by feature, not by type
2. **Co-location**: Related files stay together
3. **Separation of Concerns**: Clear boundaries between features
4. **Scalability**: Structure supports growth

### File Organization Rules

1. **One Component Per File**: Easier to find and maintain
2. **Co-located Styles**: CSS Modules next to components
3. **Feature Isolation**: Features don't depend on each other
4. **Shared Code**: Common utilities in `lib/` or `components/`

---

## Future Considerations

### Planned Additions

1. **TypeScript Migration**: Convert `.js` to `.ts` gradually
2. **Path Aliases**: `@/` for `src/` imports
3. **Test Structure**: Organized test files
4. **Storybook**: Component documentation and testing
5. **API Documentation**: OpenAPI/Swagger specs

---

**End of Project Structure Documentation**

