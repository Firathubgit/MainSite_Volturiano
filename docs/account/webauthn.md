## WebAuthn & Biometric Login Plan

### Goal

Allow returning users to sign in using platform authenticators (Face ID, Touch ID, Windows Hello) when Supabase Auth exposes passkey APIs.

### Requirements

- Browser support (check `PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()`).
- HTTPS context (already required).
- Supabase SDK support for WebAuthn (track roadmap).

### Implementation Sketch

1. **Registration**
   - Prompt after successful sign-in.
   - Call Edge function to generate registration options (challenge, relying party, user info).
   - Use `navigator.credentials.create` to obtain credential; send attestation to Edge function for verification and storage.
   - Save credential ID + metadata in `webauthn_credentials` table (owner_id, device label).
2. **Authentication**
   - On login page, check capability and offer “Sign in with device”.
   - `navigator.credentials.get` with stored credential IDs; Edge function validates assertion and exchanges for Supabase session via service role.
3. **Management UI**
   - Section under security tab listing registered devices with remove button.
   - Removal deletes row in `webauthn_credentials`.

### Table Schema (draft)

```
create table webauthn_credentials (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references account_profiles(id) on delete cascade,
  credential_id text not null,
  public_key text not null,
  counter bigint default 0,
  device_label text,
  created_at timestamptz default now()
);
```

### Considerations

- Handle browsers without support gracefully.
- Provide recovery instructions (password fallback).
- Ensure Edge functions guard against replay attacks and increment counters.


