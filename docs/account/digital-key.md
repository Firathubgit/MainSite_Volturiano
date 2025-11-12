## Digital Car Key Simulation

### Purpose

Represent the future experience of provisioning a digital car key while clearly communicating that the current flow is a simulation.

### Flow

1. **Eligibility Check**
   - Confirm ownership record exists for selected vehicle.
   - Show message if digital key capability is “coming soon”.
2. **Provisioning Steps (Simulated)**
   - Step 1: “Secure handshake” – display spinner and descriptive copy.
   - Step 2: “Owner verification” – prompt to confirm account password (no real backend).
   - Step 3: “Key delivered” – success screen with mock QR code and instructions.
3. **Status Card**
   - Indicates last simulated sync timestamp stored in `profiles.preferences.digital_key`.
   - Includes button to “Resync” (replays animation).

### Implementation Notes

- Use feature flag (e.g., `ENABLE_DIGITAL_KEY_SIM`) to hide in production if necessary.
- Highlight simulation disclaimer in copy (e.g., “Demo experience” badge).
- Collect analytics events (tap, completion) to gauge interest.
- Future real integration would require secure API with OEM; keep architecture flexible.


