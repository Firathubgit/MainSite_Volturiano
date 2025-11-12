# Garage Feature - Future Roadmap

**Purpose**: Garage-specific feature roadmap and extension plans  
**Last Updated**: 2025-01-XX  
**Status**: Active Planning

---

## Overview

This document outlines the future evolution of the Garage feature, organized by timeline and priority. It complements the main project roadmap (`docs/ULTIMATE_ROADMAP.md`) with garage-specific details.

---

## Short-Term Roadmap (Next 3 Months)

### High Priority

#### Edit & Rename Functionality
**Timeline**: 1-2 weeks  
**Dependencies**: None

**Features**:
- Edit modal for title/description
- Inline editing for title (double-click)
- Bulk edit operations (future)
- Validation and error handling

**Implementation**:
- Create `GarageItemEditModal.jsx`
- Extend `updateGarageItem` API
- Add optimistic updates
- Handle validation errors

#### Version History UI
**Timeline**: 2 weeks  
**Dependencies**: Edit functionality

**Features**:
- Timeline component showing versions
- Diff visualization
- Restore to version
- Version comparison

**Implementation**:
- Create `VersionHistory.jsx` component
- Create `ConfigDiff.jsx` component
- Implement diff calculation utility
- Add restore functionality

#### Configurator Integration
**Timeline**: 1 week  
**Dependencies**: Phase 3 (Configurator 2D)

**Features**:
- Deep link `/configurator/:garageItemId`
- Load configuration in configurator
- "Edit in Configurator" button
- State conversion utility

**Implementation**:
- Create route handler
- Implement `convertGarageToConfiguratorState` helper
- Add navigation from CarCard
- Handle missing options gracefully

### Medium Priority

#### Model Filtering UI
**Timeline**: 3-5 days  
**Dependencies**: None

**Features**:
- Model dropdown in filters
- Show model counts
- Persist filter preference

#### Tag Filtering UI
**Timeline**: 1 week  
**Dependencies**: Tag management (Phase 2.7)

**Features**:
- Tag chips in filters
- Multi-select tag filtering
- Show tag counts
- AND/OR logic toggle

#### Sorting Options
**Timeline**: 3-5 days  
**Dependencies**: None

**Features**:
- Sort dropdown (date, price, name)
- Persist sort preference
- Visual sort indicators

---

## Medium-Term Roadmap (3-6 Months)

### High Priority

#### Sharing & Deep Links
**Timeline**: 1.5 weeks  
**Dependencies**: None

**Features**:
- Share link generation (RPC)
- Share modal with QR code
- Privacy controls (public/private/unlisted)
- Share analytics

**Implementation**:
- Create `create_share_link` RPC
- Build share UI component
- Implement deep link handler
- Add privacy settings

#### State Transitions & Stripe Integration
**Timeline**: 2 weeks  
**Dependencies**: Phase 1 (Orders), Phase 7 (Stripe Webhooks)

**Features**:
- Automatic state updates on payment
- Manual state changes
- State transition validation
- Activity logging

**Implementation**:
- Extend Stripe webhook handler
- Create state transition helper
- Add manual state change UI
- Validate transitions

#### Save to Garage Integration
**Timeline**: 1 week  
**Dependencies**: Phase 3 (Configurator)

**Features**:
- `SaveToGarageButton` component
- Integration in configurator
- Keyboard shortcut (Ctrl+S)
- Toast feedback

**Implementation**:
- Create reusable button component
- Integrate with configurator
- Handle auth check
- Add analytics

### Medium Priority

#### Tags & Goal Configuration
**Timeline**: 1 week  
**Dependencies**: None

**Features**:
- Tag selector component
- Tag API functions
- Tag display on cards
- Tag filtering

#### PDF Export
**Timeline**: 2 weeks  
**Dependencies**: Phase 7 (Edge Functions)

**Features**:
- PDF generation Edge Function
- Job queue system
- PDF template design
- Download/email options

#### Test Drive Scheduling
**Timeline**: 1.5 weeks  
**Dependencies**: None

**Features**:
- Scheduling modal
- Request processing
- Email notifications
- Status tracking

---

## Long-Term Roadmap (6+ Months)

### Timeline & Milestones View
**Timeline**: 2 weeks  
**Dependencies**: State transitions, Stripe integration

**Features**:
- Vertical timeline component
- Milestone types (created, purchased, delivered, custom)
- Placeholder milestone updates (monthly)
- User-added milestones

### Showcase Mode
**Timeline**: 2 weeks  
**Dependencies**: Phase 3 (Configurator)

**Features**:
- Showcase presets (winter/summer/studio)
- Full-screen showcase view
- Environment switching
- Shareable showcase links

### Model Launch Notifications
**Timeline**: 1.5 weeks  
**Dependencies**: Phase 7 (Notifications)

**Features**:
- Subscription management
- Launch announcements
- Email notifications
- Unsubscribe functionality

### Advanced Features
**Timeline**: Ongoing  
**Dependencies**: Various

**Features**:
- Bulk operations (delete, move, tag)
- Custom sorting (drag to reorder)
- Saved filter sets
- Export to CSV
- Image uploads
- Advanced search (full-text)

---

## Integration Points

### With Configurator
- **Save to Garage**: Save configurations directly from configurator
- **Open in Configurator**: Load garage item in configurator for editing
- **Compare Mode**: Compare garage items side-by-side in configurator

### With Orders/Commerce
- **State Updates**: Automatic state changes on payment
- **Order Linking**: Link garage items to orders
- **Delivery Tracking**: Update milestones on delivery

### With Account Settings
- **Profile Integration**: Show garage stats in profile
- **Preferences**: Garage-specific user preferences
- **Export Settings**: PDF export preferences

### With AI Assistant
- **Configuration Help**: AI can reference garage items
- **Recommendations**: AI suggests configurations based on garage
- **Search Integration**: AI can search garage items

---

## Technical Debt & Improvements

### Performance Optimizations
- **Pagination UI**: Add "Load More" button or infinite scroll
- **Image Optimization**: Lazy loading, responsive images
- **Query Optimization**: Composite indexes for common queries
- **Cache Improvements**: Smarter cache invalidation

### Code Quality
- **TypeScript Migration**: Convert to TypeScript for type safety
- **Test Coverage**: Increase test coverage to >80%
- **Error Handling**: More robust error handling and recovery
- **Accessibility**: Improve keyboard navigation and screen reader support

### User Experience
- **Loading States**: Better loading indicators
- **Empty States**: More engaging empty states
- **Onboarding**: Garage feature tour for new users
- **Mobile Optimization**: Improve mobile experience

---

## Extension Points

### Adding New Filters

**Process**:
1. Add filter to store `filters` object
2. Update `buildGarageQuery` in `api.js`
3. Add UI control in `GarageFilters.jsx`
4. Update `setFilters` logic
5. Update `getItemsByState` if client-side

**Example**: Adding "Year" filter
```javascript
// 1. Store
filters: { year: null }

// 2. API
if (filters.year) {
  query = query.eq('year', filters.year);
}

// 3. UI
<select value={filters.year} onChange={...}>
```

### Adding New States

**Process**:
1. Add state to enum (document)
2. Update lane rendering in `GarageLayout`
3. Add i18n translations
4. Update state transition validation
5. Update RLS if needed

**Example**: Adding "Reserved" state
```javascript
// States: 'saved', 'purchased', 'prototype', 'wishlist', 'reserved'
// Add lane in GarageLayout
// Add translations
// Update transition rules
```

### Adding New Actions

**Process**:
1. Add action to store
2. Create API function
3. Add UI button/control
4. Handle optimistic updates
5. Add error handling
6. Write tests

**Example**: Adding "Duplicate" action
```javascript
// Store
duplicateItem: async (itemId) => { ... }

// API
export async function duplicateGarageItem(itemId) { ... }

// UI
<button onClick={() => duplicateItem(item.id)}>Duplicate</button>
```

---

## Migration Strategy

### Schema Evolution

**Payload Migrations**:
- Use `schema_version` field
- Client-side migration on load
- Update version after migration
- Document migration logic

**Database Migrations**:
- Versioned migration files
- Test on staging first
- Include rollback scripts
- Document breaking changes

### Feature Flags

**Usage**:
- Gradual rollout of new features
- A/B testing
- Emergency feature disable
- Environment-based flags

**Implementation**:
- Environment variables (`VITE_ENABLE_*`)
- Feature flag service (future)
- Admin toggle (future)

---

## Success Metrics

### User Engagement
- **Garage Usage**: % of users with at least 1 saved item
- **Return Rate**: % of users returning to garage within 7 days
- **Save Rate**: % of configurator sessions that save to garage
- **Share Rate**: % of items shared

### Performance
- **Load Time**: <500ms initial load
- **Filter Time**: <200ms filter change
- **Search Time**: <50ms search (client-side)
- **API Response**: <200ms (p95)

### Business Impact
- **Conversion Rate**: Impact on purchase conversion
- **Retention**: Impact on user retention
- **Support Tickets**: Reduction in support requests
- **User Satisfaction**: Survey scores

---

## References

- **Main Roadmap**: `docs/ULTIMATE_ROADMAP.md` Phase 2
- **Feature Documentation**: `docs/garage/feature-documentation.md`
- **Database Rationale**: `docs/garage/database-rationale.md`
- **Implementation Summary**: `docs/garage/implementation-summary.md`

---

**End of Garage Future Roadmap**

