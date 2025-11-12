## Profile Editor & Settings

Defines the UX and data contract for managing personal account information.

### Data Model

- Supabase `profiles` table fields:
  - `display_name` (text)
  - `locale` (text, e.g., `en`, `sv`)
  - `avatar_url` (text, optional)
  - `preferences` (jsonb) — marketing opt-in, watermark option, reduced motion
  - `marketing_opt_in` (boolean)
- Additional tables referenced:
  - `notification_preferences` (per channel/category)
  - `account_addresses`
  - `loyalty_status`, `impact_preferences`, etc.

### UI Sections

1. **Personal Info**
   - Inputs: name, email (read-only but editable via credential flow), locale selector.
   - Avatar upload (optional).
   - Save button with optimistic update; fallback toast on error.
2. **Security**
   - Password change form (current, new, confirm).
   - MFA enrollment tile (TOTP, Passkey when available).
   - Sessions list with revoke option.
3. **Preferences**
   - Marketing opt-in toggle.
   - Watermark & motion toggles stored in `profiles.preferences`.
4. **Addresses**
   - List of saved addresses with primary badge.
   - Modal to add/edit using validation for postal codes and country selection.
5. **Notifications**
   - Matrix of channels (email, push) vs categories (garage updates, events, service reminders).
   - Persisted via `notification_preferences`.
6. **Ownership & Experiences**
   - Timeline view for vehicle history, service milestones.
   - Upcoming events list with RSVP actions.

### Implementation Notes

- Forms use controlled components, validated with reusable helpers.
- All copy pulled from `account` namespace in `web/src/i18n`.
- Follow `.cursor/rules/02-conventions.md` for component structure and accessibility (labels, aria-live for save status).
- API calls handled through `web/src/features/account/api.js` using Supabase client.
- For offline resilience, persist last known profile in Zustand and resync on network restore.

### Future Enhancements

- Loyalty badges with animation (Framer Motion) when unlocking new tier.
- Document vault integration once storage flow ready.
- Scenario-based preferences linking to 3D configurator experiences.


