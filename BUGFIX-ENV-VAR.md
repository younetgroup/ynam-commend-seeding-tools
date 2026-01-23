# Bugfix: GOOGLE_SERVICE_ACCOUNT_PATH Environment Variable

**Date:** January 23, 2026
**Status:** ✅ Fixed

---

## Issue
When starting verification in the Electron app, the following error occurred:
```
Error: GOOGLE_SERVICE_ACCOUNT_PATH environment variable not set
```
This happened even though the credentials are bundled with the application.

## Root Cause
The `VerifyCommand` and `DupDetectorCommand` classes (shared with the CLI) rely on `process.env.GOOGLE_SERVICE_ACCOUNT_PATH` to locate the service account credentials.

While the Electron app knows where the bundled credentials are (via `getCredentialsPath()` in `ipc-handlers.ts`), it was not setting the environment variable expected by the shared command classes.

## Fix
Modified `src/electron/ipc-handlers.ts` to automatically set `process.env.GOOGLE_SERVICE_ACCOUNT_PATH` to the bundled credentials path when the application initializes.

```typescript
// src/electron/ipc-handlers.ts

export function setupIpcHandlers() {
  // Ensure GOOGLE_SERVICE_ACCOUNT_PATH is set for the shared commands
  // This allows VerifyCommand and DupDetectorCommand to find the bundled credentials
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_PATH) {
    process.env.GOOGLE_SERVICE_ACCOUNT_PATH = getCredentialsPath();
    console.log('Set GOOGLE_SERVICE_ACCOUNT_PATH to bundled credentials:', process.env.GOOGLE_SERVICE_ACCOUNT_PATH);
  }
  
  // ...
}
```

## Verification
1. Rebuild the Electron app:
   ```bash
   npm run build:electron
   ```
2. Start the app:
   ```bash
   npm run electron:dev
   ```
3. Run the verification process. It should now proceed without the environment variable error.
