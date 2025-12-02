# VOLTURIANO Infotainment Showcase Integration - Ultimate Phase-Based Plan

**Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Status:** Planning Phase  
**Scope:** Complete integration of volturiano-os car OS interface into mainsite volturiano as showcase/infotainment page

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Project Vision & Goals](#project-vision--goals)
3. [Architecture Overview](#architecture-overview)
4. [Phase 1: Frontend Foundation & Core Integration](#phase-1-frontend-foundation--core-integration)
5. [Phase 2: 3D Car Model Integration](#phase-2-3d-car-model-integration)
6. [Phase 3: App Components Translation & Integration](#phase-3-app-components-translation--integration)
7. [Phase 4: i18n Internationalization](#phase-4-i18n-internationalization)
8. [Phase 5: Routing & Navigation Integration](#phase-5-routing--navigation-integration)
9. [Phase 6: Performance Optimization & Polish](#phase-6-performance-optimization--polish)
10. [Phase 7: Backend Foundation (Future)](#phase-7-backend-foundation-future)
11. [Phase 8: Google Maps Integration (Future)](#phase-8-google-maps-integration-future)
12. [Phase 9: Spotify Integration (Future)](#phase-9-spotify-integration-future)
13. [Dependencies & Critical Path](#dependencies--critical-path)
14. [Risk Assessment & Mitigation](#risk-assessment--mitigation)
15. [Success Metrics & KPIs](#success-metrics--kpis)
16. [Timeline Estimates](#timeline-estimates)
17. [Resource Requirements](#resource-requirements)
18. [Appendix: Technical Specifications](#appendix-technical-specifications)

---

## Executive Summary

The VOLTURIANO Infotainment Showcase Integration plan provides a comprehensive, phase-by-phase approach to integrating the freelance frontend engineer's volturiano-os car OS interface (built in TypeScript/TSX) into the mainsite volturiano project (React/JSX architecture). This integration will create a premium showcase page demonstrating the car's infotainment system capabilities.

**Key Highlights:**
- **Total Estimated Timeline:** 6-8 weeks for frontend phases (Phases 1-6), 4-6 weeks for backend phases (Phases 7-9)
- **Core MVP Timeline:** 3-4 weeks (Phases 1-3)
- **Critical Path:** Foundation → 3D Model → Components → i18n → Routing → Polish
- **Technology Stack:** React + Vite (JSX), React Three Fiber, Zustand, i18next, CSS Modules
- **Architecture:** Feature-sliced design, component translation TSX→JSX, GLB car model integration

**Current Status:**
- ⏳ Phase 1: Not Started
- ⏳ Phase 2: Not Started
- ⏳ Phase 3: Not Started
- ⏳ Phase 4-9: Planned

---

## Project Vision & Goals

### Vision Statement
Create an immersive, premium showcase page that demonstrates the VOLTURIANO car's advanced infotainment system. The page should feel like experiencing the actual car OS interface, showcasing all apps (Car Configurator, Navigation, Media, Climate) with seamless 3D car visualization and future-ready integrations for Google Maps and Spotify.

### Core Goals

1. **Seamless Integration**
   - Translate TSX components to JSX following mainsite architecture
   - Maintain exact design and functionality from volturiano-os
   - Integrate with existing routing and navigation system
   - Follow feature-sliced design principles

2. **3D Car Model Integration**
   - Integrate VolturianoGLB.glb car model
   - Support dynamic color/rim changes
   - Maintain performance (60fps target)
   - Support multiple camera views

3. **Internationalization**
   - Full i18n support (English/Swedish initially)
   - All UI text translatable
   - RTL support ready (future)

4. **Performance Excellence**
   - <3s initial load time
   - 60fps animations
   - Smooth transitions between apps
   - Optimized 3D rendering

5. **Future-Ready Architecture**
   - Backend integration points prepared
   - Google Maps API ready
   - Spotify API ready
   - Extensible for additional apps

---

## Architecture Overview

### Technology Stack

**Frontend:**
- React 18+ with Vite (JavaScript/JSX, no TypeScript)
- React Router v6 for navigation
- Zustand for state management
- React Three Fiber + Drei for 3D visualization
- i18next for internationalization
- CSS Modules + PostCSS for styling
- Framer Motion for animations (if needed)

**3D Rendering:**
- React Three Fiber (@react-three/fiber)
- React Three Drei (@react-three/drei)
- Three.js (three)
- GLB/GLTF loader for car model

**Future Backend:**
- Supabase Edge Functions for API proxies
- Google Maps JavaScript API
- Spotify Web API
- Supabase Storage for media assets

### Architecture Principles

1. **Feature-Sliced Design:** Infotainment feature organized under `web/src/features/infotainment/`
2. **Component Translation:** TSX → JSX conversion maintaining exact functionality
3. **3D Model Integration:** Use existing Viewer3D patterns, extend for infotainment needs
4. **State Management:** Zustand store for infotainment state (drive mode, active app, car config)
5. **Performance First:** Code splitting, lazy loading, optimized 3D rendering
6. **i18n Ready:** All text externalized to translation files

### Key Architectural Decisions

**Why JSX over TSX?**
- Mainsite architecture uses JSX
- Consistency with existing codebase
- Faster development iteration
- Type checking can be added later if needed

**Why Feature-Sliced Organization?**
- Aligns with mainsite architecture
- Self-contained feature module
- Easy to maintain and extend
- Clear separation of concerns

**Why Extend Existing Viewer3D?**
- Reuse proven GLB loading logic
- Maintain consistency
- Leverage existing optimizations
- Reduce code duplication

**Why Zustand for State?**
- Already used in mainsite
- Minimal boilerplate
- Fine-grained subscriptions
- Simple mental model

---

## Phase 1: Frontend Foundation & Core Integration

**Status:** Not Started  
**Timeline:** 1-1.5 weeks  
**Priority:** Critical (blocks all other phases)

### Overview
Establish the foundational structure, translate core App component, set up state management, and create the basic page structure.

### Detailed Steps

#### Step 1.1: Feature Structure Setup
**Estimated Time:** 4-6 hours

Create the feature-sliced directory structure:
```
web/src/features/infotainment/
├── components/
│   ├── Scene/
│   │   ├── Scene.jsx
│   │   └── Scene.module.css
│   ├── TornadoGT/
│   │   ├── TornadoGT.jsx
│   │   └── TornadoGT.module.css
│   ├── apps/
│   │   ├── CarConfigurator/
│   │   │   ├── CarConfigurator.jsx
│   │   │   └── CarConfigurator.module.css
│   │   ├── Climate/
│   │   │   ├── Climate.jsx
│   │   │   └── Climate.module.css
│   │   ├── Media/
│   │   │   ├── Media.jsx
│   │   │   └── Media.module.css
│   │   └── Navigation/
│   │       ├── Navigation.jsx
│   │       └── Navigation.module.css
│   ├── InfotainmentApp/
│   │   ├── InfotainmentApp.jsx
│   │   └── InfotainmentApp.module.css
│   └── BootScreen/
│       ├── BootScreen.jsx
│       └── BootScreen.module.css
├── stores/
│   └── infotainmentStore.js
├── constants/
│   └── infotainmentConstants.js
├── utils/
│   └── infotainmentUtils.js
└── hooks/
    └── useInfotainment.js
```

**Actions:**
- Create all directory structure
- Add placeholder files with basic exports
- Document structure in README.md

#### Step 1.2: Constants & Types Translation
**Estimated Time:** 2-3 hours

Translate TypeScript constants and types to JavaScript:

**File:** `web/src/features/infotainment/constants/infotainmentConstants.js`

Translate from `volturiano-os/constants.ts`:
- `THEMES` object (DriveMode → ThemeConfig mapping)
- `CAR_PAINTS` array
- `RIM_COLORS` array
- `CLIMATE_PRESETS` array

Translate from `volturiano-os/types.ts`:
- `DriveMode` enum → object with string values
- `CameraView` enum → object with string values
- `AppID` enum → object with string values
- `CarConfig` interface → JSDoc documented object shape
- `ThemeConfig` interface → JSDoc documented object shape

**Actions:**
- Copy constants from volturiano-os
- Convert TypeScript enums to JavaScript objects
- Add JSDoc comments for type documentation
- Export all constants

#### Step 1.3: Zustand Store Setup
**Estimated Time:** 3-4 hours

**File:** `web/src/features/infotainment/stores/infotainmentStore.js`

Create Zustand store for infotainment state:
```javascript
import { create } from 'zustand';
import { DRIVE_MODES, CAMERA_VIEWS, APP_IDS } from '../constants/infotainmentConstants';

const useInfotainmentStore = create((set) => ({
  // Boot state
  booting: true,
  bootProgress: 0,
  setBooting: (booting) => set({ booting }),
  setBootProgress: (progress) => set({ bootProgress: progress }),
  
  // Drive mode
  driveMode: DRIVE_MODES.SPORT,
  setDriveMode: (mode) => set({ driveMode: mode }),
  
  // Camera view
  cameraView: CAMERA_VIEWS.DEFAULT,
  setCameraView: (view) => set({ cameraView: view }),
  
  // Active app
  activeApp: APP_IDS.CAR,
  setActiveApp: (appId) => set({ activeApp: appId }),
  
  // Car configuration
  carConfig: {
    color: '#FF4520', // Volturiano Orange default
    rimColor: '#111111', // Matte Black default
  },
  setCarConfig: (config) => set((state) => ({
    carConfig: { ...state.carConfig, ...config }
  })),
  
  // Climate state
  driverTemp: 21.5,
  passTemp: 22.0,
  setDriverTemp: (temp) => set({ driverTemp: temp }),
  setPassTemp: (temp) => set({ passTemp: temp }),
  
  // Mobile detection
  isMobile: false,
  setIsMobile: (isMobile) => set({ isMobile }),
  
  // Reset function
  reset: () => set({
    booting: true,
    bootProgress: 0,
    driveMode: DRIVE_MODES.SPORT,
    cameraView: CAMERA_VIEWS.DEFAULT,
    activeApp: APP_IDS.CAR,
    carConfig: { color: '#FF4520', rimColor: '#111111' },
    driverTemp: 21.5,
    passTemp: 22.0,
    isMobile: false,
  }),
}));

export default useInfotainmentStore;
```

**Actions:**
- Create store with all state management
- Add actions for state updates
- Add reset function
- Test store in isolation

#### Step 1.4: Main InfotainmentApp Component Translation
**Estimated Time:** 6-8 hours

**File:** `web/src/features/infotainment/components/InfotainmentApp/InfotainmentApp.jsx`

Translate `volturiano-os/App.tsx` to JSX:
- Remove TypeScript type annotations
- Convert functional component syntax
- Replace useState/useEffect hooks with Zustand store
- Convert className strings (keep Tailwind classes, but prepare for CSS Modules)
- Handle icon imports from lucide-react
- Implement boot sequence logic
- Implement mobile detection
- Set up app switching logic

**Key Translation Points:**
- `useState` → Zustand store selectors
- `const App: React.FC` → `function InfotainmentApp()`
- Type annotations → JSDoc comments
- Keep all Tailwind classes initially (migrate to CSS Modules in Phase 6)

**Actions:**
- Translate main App component
- Integrate Zustand store
- Implement boot sequence
- Implement mobile detection
- Test basic rendering

#### Step 1.5: Page Route Setup
**Estimated Time:** 2-3 hours

**File:** `web/src/pages/Infotainment/Infotainment.jsx`

Create page wrapper:
```javascript
import React, { Suspense, lazy } from 'react';
import LoadingOverlay from '../../components/LoadingOverlay/LoadingOverlay';
import PageTransition from '../../components/PageTransition/PageTransition';

const InfotainmentApp = lazy(() => 
  import('../../features/infotainment/components/InfotainmentApp/InfotainmentApp')
);

export default function Infotainment() {
  return (
    <PageTransition>
      <Suspense fallback={<LoadingOverlay />}>
        <InfotainmentApp />
      </Suspense>
    </PageTransition>
  );
}
```

**File:** `web/src/app/App.jsx`

Add route:
```javascript
const Infotainment = lazy(() => import('../pages/Infotainment/Infotainment'));

// In Routes:
<Route path="/infotainment" element={<Infotainment />} />
```

**Actions:**
- Create Infotainment page component
- Add route to App.jsx
- Test navigation to page
- Verify lazy loading works

### Deliverables
- Complete feature structure
- Translated constants and types
- Zustand store implementation
- Main InfotainmentApp component (basic structure)
- Page route configured

### Success Criteria
- Feature structure matches mainsite patterns
- Constants translated correctly
- Store manages state properly
- Page loads and renders basic structure
- Route accessible at `/infotainment`

---

## Phase 2: 3D Car Model Integration

**Status:** Not Started  
**Timeline:** 1-1.5 weeks  
**Priority:** High (required for visual showcase)
**Dependencies:** Phase 1 complete

### Overview
Integrate the VolturianoGLB.glb car model into the Scene component, supporting dynamic color/rim changes, multiple camera views, and drive mode visual effects.

### Detailed Steps

#### Step 2.1: Scene Component Translation
**Estimated Time:** 4-6 hours

**File:** `web/src/features/infotainment/components/Scene/Scene.jsx`

Translate `volturiano-os/components/Scene.tsx`:
- Convert to JSX (remove TypeScript)
- Use Zustand store for props (mode, carConfig, cameraView)
- Integrate with existing Viewer3D patterns
- Set up Canvas with proper configuration
- Implement CameraController component
- Implement Lights component with drive mode colors

**Key Integration Points:**
- Reference `web/src/viewers/three-d/Viewer3D.jsx` for GLB loading patterns
- Use `useGLTF` from @react-three/drei for car model
- Implement camera transitions smoothly
- Support fog and environment maps

**Actions:**
- Translate Scene component
- Set up Canvas configuration
- Implement camera controller
- Implement lighting system
- Test basic 3D scene rendering

#### Step 2.2: TornadoGT Component Translation
**Estimated Time:** 6-8 hours

**File:** `web/src/features/infotainment/components/TornadoGT/TornadoGT.jsx`

**Option A: Use GLB Model (Recommended)**
- Extend existing Viewer3D patterns
- Load VolturianoGLB.glb using useGLTF
- Apply dynamic materials for color/rim changes
- Support drive mode glow effects
- Implement idle animations

**Option B: Procedural Model (Fallback)**
- Translate procedural model from `volturiano-os/components/TornadoGT.tsx`
- Convert Three.js geometry creation
- Apply materials dynamically
- Implement animations

**Recommendation:** Start with Option A (GLB), fallback to Option B if GLB doesn't support dynamic material changes.

**Key Features:**
- Dynamic body color from carConfig.color
- Dynamic rim color from carConfig.rimColor
- Drive mode glow (sport=red, comfort=blue, luxury=white)
- Idle float animation
- Subtle rotation animation
- Micro vibration in sport mode

**Actions:**
- Decide on GLB vs procedural approach
- Implement car model component
- Add dynamic material support
- Add animations
- Test color/rim changes
- Test drive mode effects

#### Step 2.3: Material System Implementation
**Estimated Time:** 3-4 hours

Create material system for dynamic color changes:

**File:** `web/src/features/infotainment/utils/materialUtils.js`

```javascript
import * as THREE from 'three';

export function createBodyMaterial(color) {
  return new THREE.MeshPhysicalMaterial({
    color: color,
    metalness: 0.7,
    roughness: 0.2,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
    sheen: 0.5,
  });
}

export function createGlassMaterial() {
  return new THREE.MeshPhysicalMaterial({
    color: '#000000',
    metalness: 0.9,
    roughness: 0.05,
    transmission: 0.2,
    transparent: true,
  });
}

export function createRimMaterial(rimColor) {
  return new THREE.MeshStandardMaterial({
    color: rimColor,
    metalness: 1,
    roughness: 0.2,
  });
}

export function getGlowColor(driveMode) {
  const colors = {
    SPORT: '#FF4520',
    COMFORT: '#0036FF',
    LUXURY: '#FFFFFF',
  };
  return colors[driveMode] || '#FFFFFF';
}
```

**Actions:**
- Create material utility functions
- Test material creation
- Verify color changes work
- Optimize material reuse

#### Step 2.4: Camera View System
**Estimated Time:** 2-3 hours

Implement smooth camera transitions:

**File:** `web/src/features/infotainment/components/Scene/CameraController.jsx`

Translate camera controller from Scene.tsx:
- Support DEFAULT, SIDE, REAR, TOP views
- Smooth lerp transitions
- Proper camera positioning
- LookAt target management

**Actions:**
- Implement camera controller
- Test all camera views
- Verify smooth transitions
- Optimize performance

#### Step 2.5: Integration Testing
**Estimated Time:** 2-3 hours

Test complete 3D integration:
- Car model loads correctly
- Color changes apply instantly
- Rim color changes work
- Camera views switch smoothly
- Drive mode glow effects visible
- Animations run smoothly (60fps)
- Performance acceptable on mid-tier devices

**Actions:**
- Test all 3D features
- Performance profiling
- Fix any issues
- Document known limitations

### Deliverables
- Scene component fully translated and integrated
- TornadoGT component (GLB or procedural)
- Material system for dynamic changes
- Camera view system
- Working 3D car visualization

### Success Criteria
- Car model renders correctly
- Color/rim changes work instantly
- Camera views transition smoothly
- Drive mode effects visible
- 60fps maintained on desktop
- No console errors

---

## Phase 3: App Components Translation & Integration

**Status:** Not Started  
**Timeline:** 1.5-2 weeks  
**Priority:** High (core functionality)
**Dependencies:** Phase 1 complete

### Overview
Translate all app components (CarConfigurator, Climate, Media, Navigation) from TSX to JSX, maintaining exact design and functionality.

### Detailed Steps

#### Step 3.1: CarConfigurator Component
**Estimated Time:** 4-5 hours

**File:** `web/src/features/infotainment/components/apps/CarConfigurator/CarConfigurator.jsx`

Translate `volturiano-os/components/apps/CarConfigurator.tsx`:
- Remove TypeScript types
- Convert to JSX
- Use Zustand store for props
- Implement instrument cluster UI
- Implement camera view selector
- Add car title display

**Key Features:**
- Top-left instrument cluster (gear selector, telltales, speedometer)
- Bottom-left camera view selector
- Center car title ("Tornado GT")
- Drive mode label display

**Actions:**
- Translate component
- Integrate with store
- Test UI rendering
- Verify interactions work

#### Step 3.2: Climate Component
**Estimated Time:** 5-6 hours

**File:** `web/src/features/infotainment/components/apps/Climate/Climate.jsx`

Translate `volturiano-os/components/apps/Climate.tsx`:
- Remove TypeScript types
- Convert to JSX
- Implement climate controls UI
- Add vent visualization
- Implement fan speed slider
- Add toggle buttons

**Key Features:**
- Climate modes (A/C, AUTO, Recirc)
- Air distribution visualization (SVG car interior)
- Interactive vent zones (windshield, face, feet)
- Fan speed slider (1-5)
- Temperature controls (driver/passenger)

**Actions:**
- Translate component
- Implement SVG visualization
- Add interactive controls
- Test all interactions
- Verify state updates

#### Step 3.3: Media Component
**Estimated Time:** 6-8 hours

**File:** `web/src/features/infotainment/components/apps/Media/Media.jsx`

Translate `volturiano-os/components/apps/Media.tsx`:
- Remove TypeScript types
- Convert to JSX
- Implement media player UI
- Add playlist grid
- Implement playback controls
- Add progress bar

**Key Features:**
- Left sidebar (navigation, playlists)
- Hero player section (now playing)
- Playback controls (play/pause, skip)
- Progress bar
- Playlist grid (Made For You)
- Tab navigation (Home, Search, Library)

**Actions:**
- Translate component
- Implement player UI
- Add playlist grid
- Test playback simulation
- Verify UI interactions

#### Step 3.4: Navigation Component
**Estimated Time:** 4-5 hours

**File:** `web/src/features/infotainment/components/apps/Navigation/Navigation.jsx`

Translate `volturiano-os/components/apps/Navigation.tsx`:
- Remove TypeScript types
- Convert to JSX
- Implement map-like visualization
- Add search interface
- Implement guidance card
- Add vehicle cursor

**Key Features:**
- Abstract map visualization (grid, roads)
- Top-left search island
- Top-right map layers
- Bottom-left guidance card
- Center vehicle cursor with pulse

**Note:** This is a placeholder UI. Real Google Maps integration comes in Phase 8.

**Actions:**
- Translate component
- Implement abstract map UI
- Add search interface
- Test UI rendering
- Document as placeholder

#### Step 3.5: Dock Component Translation
**Estimated Time:** 2-3 hours

Translate dock icon component from App.tsx:
- Create reusable DockIcon component
- Support all app icons
- Implement active state styling
- Add hover effects

**File:** `web/src/features/infotainment/components/InfotainmentApp/DockIcon.jsx`

**Actions:**
- Create DockIcon component
- Test all icons
- Verify active states
- Test hover effects

#### Step 3.6: Boot Screen Component
**Estimated Time:** 3-4 hours

**File:** `web/src/features/infotainment/components/BootScreen/BootScreen.jsx`

Translate boot screen from App.tsx:
- Implement boot animation
- Add progress bar
- Add VOLTURIANO OS branding
- Implement fade-out transition

**Key Features:**
- Full-screen overlay
- Zap icon with pulse animation
- "VOLTURIANO OS" title
- Progress bar (0-100%)
- "INITIALIZING SYSTEMS..." text
- Smooth fade-out on completion

**Actions:**
- Create BootScreen component
- Implement animations
- Test boot sequence
- Verify timing

### Deliverables
- All app components translated
- CarConfigurator working
- Climate app working
- Media app working
- Navigation app (placeholder) working
- Dock component working
- Boot screen working

### Success Criteria
- All components render correctly
- Interactions work as expected
- State updates properly
- UI matches original design
- No console errors
- Smooth transitions between apps

---

## Phase 4: i18n Internationalization

**Status:** Not Started  
**Timeline:** 1 week  
**Priority:** Medium (enhances user experience)
**Dependencies:** Phase 3 complete

### Overview
Add full internationalization support for all infotainment UI text, supporting English and Swedish initially, with structure ready for additional languages.

### Detailed Steps

#### Step 4.1: Translation Keys Structure
**Estimated Time:** 2-3 hours

Create translation file structure:

**File:** `web/src/i18n/en/infotainment.json`
```json
{
  "boot": {
    "title": "VOLTURIANO OS",
    "initializing": "INITIALIZING SYSTEMS...",
    "loading": "Loading..."
  },
  "driveModes": {
    "sport": "SPORT",
    "comfort": "COMFORT",
    "luxury": "LUXURY",
    "sportLabel": "SPORT DYNAMIC",
    "comfortLabel": "COMFORT CRUISE",
    "luxuryLabel": "GRAND TOURING"
  },
  "apps": {
    "car": "Car",
    "navigation": "Navigation",
    "media": "Media",
    "climate": "Climate",
    "energy": "Energy",
    "settings": "Settings"
  },
  "carConfigurator": {
    "title": "Tornado GT",
    "gears": {
      "p": "P",
      "r": "R",
      "n": "N",
      "d": "D"
    },
    "speedUnit": "MPH",
    "cameras": "Cameras",
    "cameraViews": {
      "default": "DEFAULT",
      "side": "SIDE",
      "rear": "REAR",
      "top": "TOP"
    }
  },
  "climate": {
    "modes": "Climate Modes",
    "ac": "A/C",
    "auto": "AUTO",
    "recirc": "Recirc",
    "systemOff": "SYSTEM OFF",
    "airDistribution": "Air Distribution",
    "intensity": "Intensity"
  },
  "media": {
    "nowPlaying": "Now Playing",
    "home": "Home",
    "search": "Search",
    "library": "Library",
    "yourPlaylists": "Your Playlists",
    "jumpBackIn": "Jump Back In"
  },
  "navigation": {
    "whereTo": "Where to?",
    "home": "Home",
    "stations": "Stations",
    "turnRight": "Turn right via",
    "remaining": "remaining",
    "eta": "ETA"
  },
  "settings": {
    "garageSettings": "GARAGE SETTINGS",
    "description": "Customize vehicle configuration and preferences.",
    "exteriorPaint": "Exterior Paint",
    "wheelAlloys": "Wheel Alloys",
    "systemInformation": "System Information",
    "vehicleId": "Vehicle ID",
    "softwareVersion": "Software Version",
    "odometer": "Odometer",
    "checkUpdates": "Check for Updates"
  },
  "mobile": {
    "title": "DESKTOP CLASS UI",
    "message": "The Volturiano OS Experience is designed for horizontal widescreen displays. Please rotate your device or switch to a desktop browser.",
    "rotate": "Rotate to Landscape"
  }
}
```

**File:** `web/src/i18n/sv/infotainment.json`
- Translate all keys to Swedish

**Actions:**
- Create English translation file
- Create Swedish translation file
- Verify all keys covered
- Test translation loading

#### Step 4.2: Component Translation Integration
**Estimated Time:** 4-5 hours

Update all components to use translations:

**Example:** CarConfigurator.jsx
```javascript
import { useTranslation } from 'react-i18next';

export function CarConfigurator({ mode, theme, view, setView }) {
  const { t } = useTranslation('infotainment');
  
  return (
    <>
      <h2>{t('carConfigurator.title')}</h2>
      <div>{t('carConfigurator.gears.d')}</div>
      <span>{t('carConfigurator.speedUnit')}</span>
      {/* ... */}
    </>
  );
}
```

**Components to update:**
- InfotainmentApp.jsx
- BootScreen.jsx
- CarConfigurator.jsx
- Climate.jsx
- Media.jsx
- Navigation.jsx
- DockIcon.jsx (if needed)

**Actions:**
- Add useTranslation to all components
- Replace hardcoded strings with t() calls
- Test English translations
- Test Swedish translations
- Verify language switching works

#### Step 4.3: Dynamic Content Translation
**Estimated Time:** 2-3 hours

Handle dynamic content that needs translation:
- Drive mode labels
- App names
- Climate preset names
- Media playlist names (if needed)
- Settings labels

**Actions:**
- Identify all dynamic content
- Add translation keys
- Update components
- Test translations

#### Step 4.4: Language Switching Integration
**Estimated Time:** 1-2 hours

Ensure infotainment page respects language changes:
- Test language switching from NavBar
- Verify translations update immediately
- Test RTL layout (if applicable)

**Actions:**
- Test language switching
- Verify real-time updates
- Fix any issues
- Document behavior

### Deliverables
- Complete translation files (en/sv)
- All components using translations
- Language switching working
- Documentation for adding new languages

### Success Criteria
- All UI text translatable
- English/Swedish translations complete
- Language switching works
- No hardcoded strings remain
- Translations load correctly

---

## Phase 5: Routing & Navigation Integration

**Status:** Not Started  
**Timeline:** 3-5 days  
**Priority:** Medium (user experience)
**Dependencies:** Phase 1 complete

### Overview
Integrate infotainment page into mainsite navigation system, add proper page transitions, and ensure seamless integration with existing routing.

### Detailed Steps

#### Step 5.1: NavBar Integration
**Estimated Time:** 2-3 hours

Add infotainment link to navigation:

**File:** `web/src/components/NavBar/NavBar.jsx`

Add menu item:
```javascript
<NavLink to="/infotainment">
  {t('nav.infotainment')}
</NavLink>
```

**File:** `web/src/i18n/en/nav.json`
```json
{
  "infotainment": "Infotainment"
}
```

**Actions:**
- Add navigation link
- Add translation key
- Test navigation
- Verify active state

#### Step 5.2: Page Transition Integration
**Estimated Time:** 1-2 hours

Ensure PageTransition component works:
- Verify fade-in animation
- Test route changes
- Ensure smooth transitions

**Actions:**
- Test page transitions
- Verify animations
- Fix any issues

#### Step 5.3: Deep Linking Support (Optional)
**Estimated Time:** 2-3 hours

Support deep links to specific app states:
- `/infotainment?app=media`
- `/infotainment?app=climate&mode=sport`
- `/infotainment?app=car&view=side`

**File:** `web/src/features/infotainment/hooks/useInfotainment.js`

```javascript
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import useInfotainmentStore from '../stores/infotainmentStore';

export function useInfotainment() {
  const [searchParams] = useSearchParams();
  const setActiveApp = useInfotainmentStore((state) => state.setActiveApp);
  const setDriveMode = useInfotainmentStore((state) => state.setDriveMode);
  const setCameraView = useInfotainmentStore((state) => state.setCameraView);
  
  useEffect(() => {
    const app = searchParams.get('app');
    const mode = searchParams.get('mode');
    const view = searchParams.get('view');
    
    if (app) setActiveApp(app);
    if (mode) setDriveMode(mode);
    if (view) setCameraView(view);
  }, [searchParams, setActiveApp, setDriveMode, setCameraView]);
}
```

**Actions:**
- Create useInfotainment hook
- Implement URL parameter parsing
- Update state from URL
- Test deep links

#### Step 5.4: Browser History Integration
**Estimated Time:** 1-2 hours

Ensure browser back/forward works:
- App changes update URL
- Browser back/forward restores state
- History entries created properly

**Actions:**
- Test browser navigation
- Verify state restoration
- Fix any issues

### Deliverables
- Navigation link added
- Page transitions working
- Deep linking support (optional)
- Browser history integration

### Success Criteria
- Accessible from main navigation
- Smooth page transitions
- Deep links work (if implemented)
- Browser navigation works
- No routing errors

---

## Phase 6: Performance Optimization & Polish

**Status:** Not Started  
**Timeline:** 1-1.5 weeks  
**Priority:** Medium (enhances user experience)
**Dependencies:** Phases 1-5 complete

### Overview
Optimize performance, migrate Tailwind classes to CSS Modules, add loading states, and polish the overall experience.

### Detailed Steps

#### Step 6.1: CSS Modules Migration
**Estimated Time:** 6-8 hours

Migrate Tailwind classes to CSS Modules:

**File:** `web/src/features/infotainment/components/InfotainmentApp/InfotainmentApp.module.css`

Convert Tailwind classes:
- `bg-vBlack` → `.container { background-color: var(--volt-black); }`
- `text-white` → `.textWhite { color: white; }`
- etc.

**Strategy:**
- Create CSS Modules for each component
- Use CSS variables from mainsite
- Maintain exact styling
- Test visual consistency

**Actions:**
- Create CSS Module files
- Migrate Tailwind classes
- Update component imports
- Test styling
- Verify consistency

#### Step 6.2: Code Splitting & Lazy Loading
**Estimated Time:** 2-3 hours

Optimize bundle size:
- Lazy load Scene component
- Lazy load app components
- Lazy load 3D dependencies
- Add loading fallbacks

**Actions:**
- Implement lazy loading
- Add Suspense boundaries
- Test loading states
- Verify bundle size reduction

#### Step 6.3: 3D Performance Optimization
**Estimated Time:** 3-4 hours

Optimize 3D rendering:
- Implement LOD (Level of Detail) if needed
- Optimize material reuse
- Reduce draw calls
- Optimize animations
- Add performance monitoring

**Actions:**
- Profile 3D performance
- Implement optimizations
- Test on various devices
- Document performance targets

#### Step 6.4: Loading States & Error Handling
**Estimated Time:** 2-3 hours

Add proper loading and error states:
- GLB loading indicator
- Error fallback for 3D
- App loading states
- Network error handling

**Actions:**
- Add loading indicators
- Implement error boundaries
- Test error scenarios
- Improve UX

#### Step 6.5: Animation Polish
**Estimated Time:** 2-3 hours

Polish animations:
- Smooth transitions
- Consistent timing
- Easing functions
- Performance optimization

**Actions:**
- Review all animations
- Optimize timing
- Test smoothness
- Fix any jank

#### Step 6.6: Accessibility Improvements
**Estimated Time:** 2-3 hours

Add accessibility features:
- Keyboard navigation
- ARIA labels
- Focus management
- Screen reader support

**Actions:**
- Add ARIA labels
- Implement keyboard nav
- Test with screen reader
- Fix accessibility issues

### Deliverables
- CSS Modules migration complete
- Code splitting implemented
- 3D performance optimized
- Loading/error states added
- Animations polished
- Accessibility improved

### Success Criteria
- Bundle size optimized
- 60fps maintained
- Loading states smooth
- No accessibility violations
- Visual consistency maintained
- Performance targets met

---

## Phase 7: Backend Foundation (Future)

**Status:** Planned  
**Timeline:** 2-3 weeks (future)  
**Priority:** Low (enables future features)
**Dependencies:** Phases 1-6 complete

### Overview
Set up backend infrastructure to support future integrations (Google Maps, Spotify) and enable data persistence for infotainment preferences.

### Detailed Steps

#### Step 7.1: Supabase Schema Design
**Estimated Time:** 4-6 hours

Design database schema:

**Table: `infotainment_preferences`**
```sql
CREATE TABLE infotainment_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  drive_mode TEXT NOT NULL DEFAULT 'SPORT',
  default_app TEXT NOT NULL DEFAULT 'CAR',
  car_config JSONB NOT NULL DEFAULT '{"color": "#FF4520", "rimColor": "#111111"}'::jsonb,
  climate_settings JSONB DEFAULT '{"driverTemp": 21.5, "passTemp": 22.0}'::jsonb,
  media_preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX idx_infotainment_preferences_user_id ON infotainment_preferences(user_id);
```

**Table: `infotainment_sessions`** (optional, for analytics)
```sql
CREATE TABLE infotainment_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_start TIMESTAMPTZ DEFAULT NOW(),
  session_end TIMESTAMPTZ,
  apps_used TEXT[] DEFAULT '{}',
  drive_modes_used TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Actions:**
- Design schema
- Create migration files
- Add RLS policies
- Test schema

#### Step 7.2: API Functions Setup
**Estimated Time:** 3-4 hours

Create Supabase Edge Functions:

**Function: `infotainment-preferences`**
- GET: Fetch user preferences
- POST: Save user preferences
- PUT: Update user preferences

**Function: `infotainment-session`**
- POST: Start session
- PUT: End session

**Actions:**
- Create Edge Functions
- Implement CRUD operations
- Add error handling
- Test functions

#### Step 7.3: Client API Integration
**Estimated Time:** 3-4 hours

**File:** `web/src/features/infotainment/api/infotainmentApi.js`

Create API client:
```javascript
import { supabase } from '../../../lib/supabaseClient';

export async function fetchPreferences(userId) {
  const { data, error } = await supabase
    .from('infotainment_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (error) throw error;
  return data;
}

export async function savePreferences(userId, preferences) {
  const { data, error } = await supabase
    .from('infotainment_preferences')
    .upsert({
      user_id: userId,
      ...preferences,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}
```

**Actions:**
- Create API client
- Implement functions
- Add error handling
- Test API calls

#### Step 7.4: Preferences Persistence
**Estimated Time:** 2-3 hours

Integrate preferences saving:
- Save on drive mode change
- Save on app change
- Save on car config change
- Load on page load (if authenticated)

**Actions:**
- Add save hooks
- Implement auto-save
- Test persistence
- Handle errors gracefully

### Deliverables
- Database schema
- API functions
- Client API integration
- Preferences persistence

### Success Criteria
- Schema created and tested
- API functions work
- Preferences save/load correctly
- Error handling robust

---

## Phase 8: Google Maps Integration (Future)

**Status:** Planned  
**Timeline:** 2-3 weeks (future)  
**Priority:** Low (enhancement)
**Dependencies:** Phase 7 complete

### Overview
Integrate Google Maps JavaScript API into Navigation app, replacing placeholder UI with real map functionality.

### Detailed Steps

#### Step 8.1: Google Maps API Setup
**Estimated Time:** 3-4 hours

- Obtain Google Maps API key
- Set up API key in environment variables
- Configure API restrictions
- Load Google Maps script

**File:** `web/index.html` or dynamic loading:
```html
<script src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=places,directions"></script>
```

**Actions:**
- Get API key
- Configure environment
- Load script
- Test basic map

#### Step 8.2: Map Component Implementation
**Estimated Time:** 6-8 hours

**File:** `web/src/features/infotainment/components/apps/Navigation/GoogleMap.jsx`

Create Google Maps component:
- Initialize map
- Set map style (dark theme)
- Add custom markers
- Implement vehicle position
- Add route visualization

**Key Features:**
- Dark theme matching infotainment design
- Custom vehicle marker
- Route display
- Turn-by-turn directions
- Search functionality

**Actions:**
- Create map component
- Implement dark theme
- Add markers
- Test map rendering

#### Step 8.3: Search Integration
**Estimated Time:** 4-5 hours

Integrate Google Places API:
- Search input with autocomplete
- Place selection
- Address geocoding
- Recent searches

**Actions:**
- Implement Places autocomplete
- Add search functionality
- Test search
- Add recent searches

#### Step 8.4: Directions Integration
**Estimated Time:** 5-6 hours

Implement Google Directions API:
- Route calculation
- Turn-by-turn navigation
- ETA calculation
- Route alternatives

**Actions:**
- Implement directions
- Add route display
- Test navigation
- Add ETA display

#### Step 8.5: Real-time Updates
**Estimated Time:** 3-4 hours

Add real-time features:
- Vehicle position updates
- Route recalculation
- Traffic updates
- ETA updates

**Actions:**
- Implement updates
- Test real-time features
- Optimize performance
- Handle errors

### Deliverables
- Google Maps integrated
- Search functionality
- Directions working
- Real-time updates

### Success Criteria
- Map renders correctly
- Search works
- Directions calculate
- Real-time updates work
- Performance acceptable

---

## Phase 9: Spotify Integration (Future)

**Status:** Planned  
**Timeline:** 2-3 weeks (future)  
**Priority:** Low (enhancement)
**Dependencies:** Phase 7 complete

### Overview
Integrate Spotify Web API into Media app, enabling real music playback, playlists, and search.

### Detailed Steps

#### Step 9.1: Spotify API Setup
**Estimated Time:** 4-5 hours

- Create Spotify app
- Obtain client ID and secret
- Set up OAuth flow
- Configure redirect URIs
- Set up Supabase Edge Function for token exchange

**Actions:**
- Create Spotify app
- Configure OAuth
- Set up backend function
- Test authentication

#### Step 9.2: Authentication Flow
**Estimated Time:** 4-5 hours

**File:** `web/src/features/infotainment/api/spotifyAuth.js`

Implement OAuth:
- Login button
- Redirect to Spotify
- Handle callback
- Store tokens securely
- Refresh token logic

**Actions:**
- Implement OAuth flow
- Handle callbacks
- Store tokens
- Test authentication

#### Step 9.3: Media API Integration
**Estimated Time:** 6-8 hours

**File:** `web/src/features/infotainment/api/spotifyApi.js`

Create API client:
- Get user playlists
- Search tracks
- Get track details
- Play/pause control
- Volume control

**Actions:**
- Create API client
- Implement functions
- Test API calls
- Handle errors

#### Step 9.4: Playback Integration
**Estimated Time:** 6-8 hours

Integrate Spotify Web Playback SDK:
- Initialize player
- Play/pause tracks
- Skip tracks
- Volume control
- Progress tracking

**Actions:**
- Integrate Playback SDK
- Implement controls
- Test playback
- Handle errors

#### Step 9.5: UI Updates
**Estimated Time:** 4-5 hours

Update Media component:
- Display real playlists
- Show now playing info
- Update progress bar
- Add search results
- Show user library

**Actions:**
- Update Media UI
- Connect to API
- Test UI updates
- Polish experience

### Deliverables
- Spotify authentication
- API integration
- Playback working
- UI updated

### Success Criteria
- Authentication works
- Playlists load
- Playback works
- UI updates correctly
- Error handling robust

---

## Dependencies & Critical Path

### Critical Path
1. **Phase 1** → **Phase 2** → **Phase 3** → **Phase 4** → **Phase 5** → **Phase 6**
   - Frontend phases must complete sequentially
   - Each phase builds on previous

2. **Phase 7** → **Phase 8** → **Phase 9**
   - Backend phases can be done in parallel after Phase 7
   - Phase 8 and Phase 9 are independent

### Dependencies Matrix

| Phase | Depends On | Blocks |
|-------|------------|--------|
| Phase 1 | None | Phase 2, 3, 5 |
| Phase 2 | Phase 1 | Phase 6 (3D optimization) |
| Phase 3 | Phase 1 | Phase 4, 6 |
| Phase 4 | Phase 3 | None |
| Phase 5 | Phase 1 | None |
| Phase 6 | Phases 1-5 | None |
| Phase 7 | Phase 6 | Phase 8, 9 |
| Phase 8 | Phase 7 | None |
| Phase 9 | Phase 7 | None |

### External Dependencies
- React Three Fiber (@react-three/fiber)
- React Three Drei (@react-three/drei)
- Three.js (three)
- lucide-react (icons)
- i18next (already in project)
- Zustand (already in project)
- VolturianoGLB.glb (already in project)

### Future External Dependencies
- Google Maps JavaScript API (Phase 8)
- Spotify Web API (Phase 9)
- Supabase Edge Functions (Phase 7+)

---

## Risk Assessment & Mitigation

### High Risk Items

1. **GLB Model Material Changes**
   - **Risk:** GLB model may not support dynamic material changes
   - **Impact:** High - core feature may not work
   - **Mitigation:** 
     - Test GLB material changes early (Phase 2)
     - Have procedural model fallback ready
     - Consider GLB modification tools if needed

2. **Performance on Lower-End Devices**
   - **Risk:** 3D rendering may be slow on mid-tier devices
   - **Impact:** Medium - affects user experience
   - **Mitigation:**
     - Implement LOD system
     - Add performance monitoring
     - Provide quality settings
     - Optimize early and often

3. **Translation Completeness**
   - **Risk:** Missing translation keys or incorrect translations
   - **Impact:** Low - can be fixed iteratively
   - **Mitigation:**
     - Create comprehensive key list
     - Review translations with native speakers
     - Test all languages thoroughly

4. **CSS Modules Migration Complexity**
   - **Risk:** Tailwind to CSS Modules migration may be time-consuming
   - **Impact:** Medium - affects timeline
   - **Mitigation:**
     - Keep Tailwind initially, migrate gradually
     - Use CSS variables for consistency
     - Test incrementally

### Medium Risk Items

1. **State Management Complexity**
   - **Risk:** Zustand store may become complex
   - **Mitigation:** Keep store focused, split if needed

2. **Component Translation Errors**
   - **Risk:** TSX to JSX translation may introduce bugs
   - **Mitigation:** Test thoroughly, compare side-by-side

3. **Integration Issues**
   - **Risk:** May conflict with existing mainsite code
   - **Mitigation:** Isolate feature, test integration points

### Low Risk Items

1. **Future API Changes**
   - **Risk:** Google Maps/Spotify APIs may change
   - **Mitigation:** Use stable API versions, monitor changes

2. **Browser Compatibility**
   - **Risk:** Some features may not work in older browsers
   - **Mitigation:** Progressive enhancement, feature detection

---

## Success Metrics & KPIs

### Technical Metrics

1. **Performance**
   - Initial load time: <3s
   - 3D frame rate: 60fps on desktop, 30fps on mobile
   - Bundle size: <500KB (gzipped) for infotainment feature
   - Lighthouse score: >90

2. **Quality**
   - Zero console errors
   - Zero accessibility violations (WCAG 2.1 AA)
   - 100% translation coverage
   - All interactions working

3. **Code Quality**
   - Follows mainsite architecture patterns
   - No TypeScript dependencies
   - CSS Modules used (after Phase 6)
   - Proper error handling

### User Experience Metrics

1. **Functionality**
   - All apps render correctly
   - 3D car model displays
   - Color/rim changes work
   - Camera views switch smoothly
   - Drive modes work

2. **Internationalization**
   - English/Swedish translations complete
   - Language switching works
   - No hardcoded strings

3. **Integration**
   - Accessible from navigation
   - Page transitions smooth
   - Deep links work (if implemented)

### Future Metrics (Phases 7-9)

1. **Backend**
   - Preferences save/load correctly
   - API response time <200ms
   - Zero data loss

2. **Google Maps**
   - Map loads in <2s
   - Search works correctly
   - Directions calculate accurately

3. **Spotify**
   - Authentication success rate >95%
   - Playback latency <500ms
   - Playlists load in <1s

---

## Timeline Estimates

### Frontend Phases (Phases 1-6)

| Phase | Estimated Time | Cumulative |
|-------|----------------|------------|
| Phase 1 | 1-1.5 weeks | 1-1.5 weeks |
| Phase 2 | 1-1.5 weeks | 2-3 weeks |
| Phase 3 | 1.5-2 weeks | 3.5-5 weeks |
| Phase 4 | 1 week | 4.5-6 weeks |
| Phase 5 | 3-5 days | 5-7 weeks |
| Phase 6 | 1-1.5 weeks | 6-8.5 weeks |

**Total Frontend:** 6-8.5 weeks

### Backend Phases (Phases 7-9)

| Phase | Estimated Time | Cumulative |
|-------|----------------|------------|
| Phase 7 | 2-3 weeks | 2-3 weeks |
| Phase 8 | 2-3 weeks | 4-6 weeks |
| Phase 9 | 2-3 weeks | 6-9 weeks |

**Total Backend:** 6-9 weeks (can be parallelized)

### Overall Timeline

- **MVP (Phases 1-3):** 3.5-5 weeks
- **Complete Frontend (Phases 1-6):** 6-8.5 weeks
- **With Backend (Phases 1-9):** 12-17.5 weeks

**Note:** Timelines assume single developer, full-time work. Adjust based on team size and availability.

---

## Resource Requirements

### Development Resources

1. **Frontend Developer**
   - React/JSX expertise
   - React Three Fiber experience
   - CSS Modules knowledge
   - i18n experience

2. **3D Developer** (optional, for Phase 2)
   - Three.js expertise
   - GLB/GLTF knowledge
   - Material system understanding

3. **Backend Developer** (for Phases 7-9)
   - Supabase experience
   - API integration knowledge
   - OAuth flow understanding

### Tools & Services

1. **Development Tools**
   - VS Code / Cursor
   - React DevTools
   - Three.js inspector (optional)

2. **External Services** (Future)
   - Google Maps API (Phase 8)
   - Spotify Developer Account (Phase 9)
   - Supabase Project (already available)

### Assets

1. **3D Models**
   - VolturianoGLB.glb (already available)

2. **Icons**
   - lucide-react (already in project)

3. **Fonts**
   - Existing mainsite fonts

---

## Appendix: Technical Specifications

### File Structure Reference

```
web/src/features/infotainment/
├── components/
│   ├── Scene/
│   │   ├── Scene.jsx
│   │   ├── Scene.module.css
│   │   └── CameraController.jsx
│   ├── TornadoGT/
│   │   ├── TornadoGT.jsx
│   │   └── TornadoGT.module.css
│   ├── apps/
│   │   ├── CarConfigurator/
│   │   ├── Climate/
│   │   ├── Media/
│   │   └── Navigation/
│   ├── InfotainmentApp/
│   │   ├── InfotainmentApp.jsx
│   │   ├── InfotainmentApp.module.css
│   │   └── DockIcon.jsx
│   └── BootScreen/
│       ├── BootScreen.jsx
│       └── BootScreen.module.css
├── stores/
│   └── infotainmentStore.js
├── constants/
│   └── infotainmentConstants.js
├── utils/
│   ├── materialUtils.js
│   └── infotainmentUtils.js
├── hooks/
│   └── useInfotainment.js
└── api/ (future)
    ├── infotainmentApi.js
    ├── spotifyAuth.js
    └── spotifyApi.js
```

### Key Constants Reference

**Drive Modes:**
```javascript
export const DRIVE_MODES = {
  SPORT: 'SPORT',
  COMFORT: 'COMFORT',
  LUXURY: 'LUXURY',
};
```

**Camera Views:**
```javascript
export const CAMERA_VIEWS = {
  DEFAULT: 'DEFAULT',
  SIDE: 'SIDE',
  REAR: 'REAR',
  TOP: 'TOP',
};
```

**App IDs:**
```javascript
export const APP_IDS = {
  CAR: 'CAR',
  NAV: 'NAV',
  MEDIA: 'MEDIA',
  CLIMATE: 'CLIMATE',
  ENERGY: 'ENERGY',
  SETTINGS: 'SETTINGS',
};
```

### State Management Reference

**Zustand Store Structure:**
```javascript
{
  // Boot
  booting: boolean,
  bootProgress: number,
  
  // Drive mode
  driveMode: string,
  
  // Camera
  cameraView: string,
  
  // Active app
  activeApp: string,
  
  // Car config
  carConfig: {
    color: string,
    rimColor: string,
  },
  
  // Climate
  driverTemp: number,
  passTemp: number,
  
  // Mobile
  isMobile: boolean,
}
```

### Translation Keys Reference

See Phase 4.1 for complete translation key structure.

### Performance Targets

- **Initial Load:** <3s
- **3D FPS:** 60fps (desktop), 30fps (mobile)
- **Bundle Size:** <500KB (gzipped)
- **API Response:** <200ms (future)

### Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile: iOS Safari, Chrome Android

### Accessibility Standards

- WCAG 2.1 AA compliance
- Keyboard navigation support
- Screen reader compatibility
- Focus management

---

## Conclusion

This comprehensive plan provides a detailed roadmap for integrating the volturiano-os car OS interface into the mainsite volturiano project. The phase-based approach ensures systematic progress, with clear deliverables and success criteria for each phase.

**Key Takeaways:**
- Frontend integration is the priority (Phases 1-6)
- Backend integrations (Phases 7-9) can be done later
- 3D car model integration is critical for visual impact
- i18n support ensures global accessibility
- Performance optimization is essential for smooth UX

**Next Steps:**
1. Review and approve this plan
2. Set up development environment
3. Begin Phase 1 implementation
4. Iterate based on feedback

**Questions or Clarifications:**
- Adjust timelines based on team capacity
- Modify priorities if needed
- Add/remove phases as requirements change
- Update plan as implementation progresses

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Maintained By:** Development Team  
**Review Cycle:** Weekly during active development

