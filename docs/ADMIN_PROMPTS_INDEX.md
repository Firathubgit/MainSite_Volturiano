# Admin Frontend Implementation - Prompts Index

**Total Prompts:** 6  
**Estimated Total Time:** 25-35 days  
**Sequential Order:** Must be completed in order (each builds on previous)

---

## Prompt 1: UI Component Library
**File:** `ADMIN_PROMPT_1_UI_COMPONENTS.md`  
**Time:** 3-5 days  
**Dependencies:** None  
**What:** Build reusable UI components (AdminTable, AdminModal, AdminInput, AdminSelect, AdminButton, etc.)  
**Why:** Foundation needed for all other features

---

## Prompt 2: Manifest Editor Foundation
**File:** `ADMIN_PROMPT_2_MANIFEST_EDITOR_FOUNDATION.md`  
**Time:** 5-7 days  
**Dependencies:** Prompt 1  
**What:** Main editor component structure, Layer Tree with drag-and-drop, basic Properties Panel  
**Why:** Core content creation tool - foundation must be solid

---

## Prompt 3: Dependency Matrix & Variant Manager
**File:** `ADMIN_PROMPT_3_DEPENDENCY_VARIANT_MANAGER.md`  
**Time:** 5-7 days  
**Dependencies:** Prompt 2  
**What:** Dependency Matrix with circular detection, Variant Manager with asset upload, enhanced Properties Panel  
**Why:** Completes core editor functionality

---

## Prompt 4: Live Preview & Publishing
**File:** `ADMIN_PROMPT_4_LIVE_PREVIEW_PUBLISHING.md`  
**Time:** 4-6 days  
**Dependencies:** Prompts 1, 2, 3  
**What:** Live Preview with canvas composition, Publishing Workflow with validation  
**Why:** Completes Manifest Editor - final piece

---

## Prompt 5: Vehicle Options Management
**File:** `ADMIN_PROMPT_5_VEHICLE_OPTIONS.md`  
**Time:** 4-5 days  
**Dependencies:** Prompt 1  
**What:** Option List page, Option Detail/Edit page, Option Create page  
**Why:** Content management features for admins

---

## Prompt 6: Advanced Analytics & Settings
**File:** `ADMIN_PROMPT_6_ANALYTICS_SETTINGS.md`  
**Time:** 4-5 days  
**Dependencies:** Prompt 1  
**What:** User Activity Reports, Enhanced Audit Log Viewer, System Settings, Role Management  
**Why:** Final polish and production-ready features

---

## Usage Instructions

1. Start with **Prompt 1** - give this to your developer friend first
2. Wait for completion, then provide **Prompt 2**
3. Continue sequentially through all 6 prompts
4. Each prompt is self-contained and detailed enough for implementation
5. Developer has creative freedom on CSS/styling (knows Volturiano design system)

---

## Notes

- All API functions already exist in `web/src/features/admin/api/`
- Follow existing code patterns (CSS Modules, functional components, hooks)
- Use existing `AdminLayout` wrapper for all pages
- Match Volturiano design aesthetic (dark theme, minimalist, aggressive)
- All components should handle loading/error/empty states

---

**After completing all 6 prompts, the admin system will be complete!**

