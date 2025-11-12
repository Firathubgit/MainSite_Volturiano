## Logging Strategy

### Goals
- Correlate client and Edge requests with a shared request ID.
- Provide lightweight logging without leaking sensitive data.
- Enable future integration with monitoring tools (Sentry, Supabase logs).

### Guidelines
- Generate UUID per request (client-side when action initiated).
- Include request ID in Supabase Edge function headers (`x-request-id`).
- Log levels: `debug`, `info`, `warn`, `error`.
- Redact PII (email, VIN, payment data).

### Implementation Notes
- Create `web/src/lib/logger.js` exporting `createLogger(scope)` returning methods `debug/info/warn/error`.
- Logger should respect `import.meta.env.MODE` (reduce noise in production).
- For Edge functions, wrap handler to inject request ID and structured logs.

### Sample Edge Wrapper
```js
export function withLogging(handler) {
  return async (req) => {
    const requestId = req.headers.get('x-request-id') ?? crypto.randomUUID();
    console.info('[edge]', { requestId, path: req.url });
    try {
      const res = await handler(req, { requestId });
      console.info('[edge:ok]', { requestId, status: res.status });
      return res;
    } catch (error) {
      console.error('[edge:error]', { requestId, error: error.message });
      throw error;
    }
  };
}
```

### Testing
- Verify request ID propagation in browser console and Edge logs.
- Add automated tests for logger to ensure redaction.
- Document manual QA steps (trigger Supabase call, inspect logs).

