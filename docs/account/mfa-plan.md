## MFA & Credentials Plan

### Objectives

- Offer users additional security options (password change, MFA enrollment, email updates) without compromising UX.
- Respect `.cursor/rules/04-security.md` and Supabase Auth capabilities.

### Phases

1. **Baseline (Immediate)**
   - Password update form using `supabase.auth.updateUser({ password })`.
   - Email change flow requiring confirmation link (Supabase handles).
   - Session management: display active sessions, allow revoke via `supabase.auth.signOut({ scope: 'others' })`.
2. **MFA Preparation**
   - UI stubs for TOTP enrollment (QR code + code verification).
   - Store enrollment status in `profiles.preferences.mfa`.
   - Provide edge function placeholder `functions/mfa-totp/index.ts` for future secret generation.
3. **Passkey / WebAuthn (Future)**
   - Implement WebAuthn registration/auth via Supabase once GA.
   - Store credential IDs in `webauthn_credentials` table with owner RLS.
4. **Admin Overrides**
   - Edge function for admin resetting MFA (requires service role) with audit logging.

### UX Considerations

- Use stepper modals for MFA setup (scan QR, verify, backup codes).
- Provide fallback instructions if device lost.
- All messaging localized under `account.security`.


