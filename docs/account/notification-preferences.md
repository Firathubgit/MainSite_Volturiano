## Notification Preferences Architecture

### Table: `notification_preferences`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid pk | default `gen_random_uuid()` |
| `owner_id` | uuid | references `account_profiles`, RLS owner |
| `channel` | text | e.g., `email`, `push`, `sms` (future) |
| `category` | text | `garage_updates`, `events`, `service`, `marketing` |
| `enabled` | boolean | default true |
| `metadata` | jsonb | e.g., frequency settings |
| `updated_at` | timestamptz | trigger set |

### UI

- Matrix-style toggles, grouped by channel.
- Include CTA to manage email frequency (immediate, daily digest).
- Display compliance copy (unsubscribe instructions) referencing `.cursor/rules/04-security.md`.

### Edge Function

- `functions/update-notifications/index.ts`
  - Validates ownership.
  - Synchronizes with messaging provider (Resend, Customer.io, etc.).
  - Audits change in `notification_events` table.

### Considerations

- Provide ability to pause all notifications.
- Localize copy via `account.notifications.*`.
- Apply double opt-in for marketing communications.


