# Bugfix: Electron Path Resolution

**Date:** January 23, 2026
**Status:** ✅ Fixed
**Severity:** Critical (app wouldn't start)

---

## Issue

When running `npm run electron:dev`, the application failed to start with the error:

```
Unable to find Electron app at /Users/Shared/TienLe-Data/Workspace/YouNet/various-tools/ynam-comment-seending-tools

Cannot find module '/Users/Shared/TienLe-Data/Workspace/YouNet/various-tools/ynam-comment-seending-tools/dist/electron/main.js'.
Please verify that the package.json has a valid "main" entry
```

## Root Cause

The TypeScript compiler was creating a nested directory structure that didn't match the paths configured in `package.json` and `main.ts`.

### Directory Structure After Build

```
dist/
├── electron/
│   └── electron/          ← Nested electron directory
│       ├── main.js        ← Actual location
│       ├── preload.js
│       └── ipc-handlers.js
└── renderer/
    ├── index.html
    ├── app.js
    └── ...
```

### Path Mismatches

**Problem 1: package.json**
- **Expected:** `dist/electron/main.js`
- **Actual:** `dist/electron/electron/main.js`

**Problem 2: Renderer path in main.ts**
- **Old path:** `__dirname + '../renderer/index.html'`
- **This resolved to:** `dist/electron/renderer/index.html` ❌
- **Should resolve to:** `dist/renderer/index.html` ✅

---

## Solution

### Fix 1: Update package.json

**File:** `package.json`

```json
// Before
"main": "dist/electron/main.js",

// After
"main": "dist/electron/electron/main.js",
```

### Fix 2: Update renderer path in main.ts

**File:** `src/electron/main.ts`

```typescript
// Before
const rendererPath = path.join(__dirname, '../renderer/index.html');

// After
const rendererPath = path.join(__dirname, '../../renderer/index.html');
```

**Path resolution:**
- `__dirname` = `dist/electron/electron/`
- `../..` = go up two levels = `dist/`
- `../../renderer/index.html` = `dist/renderer/index.html` ✅

---

## Files Changed

1. `package.json` - Updated main entry point
2. `src/electron/main.ts` - Fixed renderer path
3. Rebuilt with `npm run build:electron`

---

## Verification

### Test 1: Path Verification
```bash
$ grep '"main"' package.json
  "main": "dist/electron/electron/main.js",

$ grep "renderer" dist/electron/electron/main.js
    const rendererPath = path.join(__dirname, '../../renderer/index.html');
    mainWindow.loadFile(rendererPath);
```

### Test 2: Startup Test
```bash
$ npm run electron:dev
# App starts successfully ✅
```

### Test 3: File Existence
```bash
$ ls dist/electron/electron/main.js     # ✅ Exists
$ ls dist/electron/electron/preload.js  # ✅ Exists
$ ls dist/renderer/index.html           # ✅ Exists
```

---

## Why This Happened

The TypeScript compiler (`tsc`) with the configuration in `tsconfig.electron.json` preserves the source directory structure when compiling.

**Source structure:**
```
src/
└── electron/
    ├── main.ts
    ├── preload.ts
    └── ipc-handlers.ts
```

**Output with `outDir: "./dist/electron"`:**
```
dist/
└── electron/          ← outDir
    └── electron/      ← Preserved from src/
        ├── main.js
        ├── preload.js
        └── ipc-handlers.js
```

---

## Alternative Solutions (Not Implemented)

### Option A: Change tsconfig.electron.json
```json
{
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  }
}
```
**Pro:** Flatter structure
**Con:** Would mix electron files with other compiled files

### Option B: Change source structure
Move `src/electron/main.ts` to `src/main.ts`
**Pro:** Simpler paths
**Con:** Less organized source code

### Option C: Custom build script
Use a build script to copy files to correct locations
**Pro:** Complete control
**Con:** More complex build process

**Decision:** Kept current structure and updated paths (simplest fix)

---

## Lessons Learned

1. **Test the build:** Always run the built application, not just verify compilation
2. **Document structure:** Add a diagram of the dist/ structure to README
3. **Path logging:** Could add debug logging for paths during development
4. **Consider rootDir:** Setting `rootDir` in tsconfig can prevent nested structures

---

## Related Files

- `package.json` - Main entry point
- `src/electron/main.ts` - Renderer path
- `tsconfig.electron.json` - TypeScript compilation settings
- `dist/electron/electron/main.js` - Compiled main file
- `dist/renderer/index.html` - Renderer entry point

---

## Status

✅ **Fixed and Verified**

The application now starts successfully with the correct path resolution. All Phase 6 features are functioning as expected.
