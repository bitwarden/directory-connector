# ESM Migration Plan

## Migration Status: Partial Success

The ESM migration has been **partially completed**. The source code is now ESM-compatible with `"type": "module"` in package.json, and webpack outputs CommonJS bundles (`.cjs`) for Node.js compatibility.

### What Works

- ✅ CLI build (`bwdc.cjs`) - builds and runs successfully
- ✅ Electron main process (`main.cjs`) - builds successfully
- ✅ All 130 tests pass
- ✅ Source code uses ESM syntax (import/export)

### What Doesn't Work

- ❌ Electron renderer build - **pre-existing type errors in jslib** (not caused by this migration)

The renderer build was failing with 37 TypeScript errors in `jslib/` **before** the ESM migration began. These are ArrayBuffer/SharedArrayBuffer type compatibility issues in the jslib submodule that need to be addressed separately.

---

## Changes Made

### 1. package.json

```json
{
  "type": "module",
  "main": "main.cjs"
}
```

### 2. tsconfig.json

```json
{
  "compilerOptions": {
    "moduleResolution": "node",
    "module": "ES2020",
    "skipLibCheck": true,
    "noEmitOnError": false
  }
}
```

### 3. Webpack Configurations

**CLI (webpack.cli.cjs)**

- Output changed to `.cjs` extension
- Added `transpileOnly: true` to ts-loader for faster builds

**Main (webpack.main.cjs)**

- Output changed to `.cjs` extension
- Added `transpileOnly: true` to ts-loader

**Renderer (webpack.renderer.cjs)**

- Created separate `tsconfig.renderer.json` to isolate Angular compilation
- Removed ESM output experiments (not compatible with Angular's webpack plugin)

### 4. src-cli/package.json

```json
{
  "type": "module",
  "bin": {
    "bwdc": "../build-cli/bwdc.cjs"
  }
}
```

### 5. New File: tsconfig.renderer.json

Dedicated TypeScript config for Angular renderer to isolate from jslib type issues.

---

## Architecture Decision

### Why CJS Output Instead of ESM Output?

The migration uses a **hybrid approach**:

- **Source code**: ESM syntax (`import`/`export`)
- **Build output**: CommonJS (`.cjs` files)

This approach was chosen because:

1. **lowdb v1 incompatibility**: The legacy lowdb v1 used in jslib doesn't work properly with ESM output due to lodash interop issues

2. **Native module compatibility**: keytar and other native modules work better with CJS

3. **Electron compatibility**: Electron's main process ESM support is still maturing

4. **jslib constraints**: The jslib submodule is read-only and contains CJS-only patterns

The webpack bundler transpiles ESM source to CJS output, giving us modern syntax in the codebase while maintaining runtime compatibility.

---

## Blocking Issues for Full ESM

### 1. jslib Submodule (Read-Only)

The jslib folder contains:

- `lowdb` v1.0.0 usage (CJS-only, v7 is ESM but has breaking API changes)
- `node-fetch` v2.7.0 usage (CJS-only, v3 is ESM-only)
- Pre-existing TypeScript errors (ArrayBuffer type mismatches)

### 2. Angular Webpack Plugin

The `@ngtools/webpack` plugin does its own TypeScript compilation and doesn't support `transpileOnly` mode, so it surfaces type errors from jslib.

---

## Future Work

To complete full ESM migration:

1. **Update jslib submodule** - Fix type errors, upgrade to ESM-compatible dependencies
2. **Upgrade lowdb** - From v1 to v7 (requires rewriting storage layer)
3. **Remove node-fetch** - Use native `fetch` (Node 18+) or upgrade to v3
4. **Enable ESM output** - Once dependencies are updated, change webpack output to ESM

---

## Testing the Migration

```bash
# Build CLI
npm run build:cli
node ./build-cli/bwdc.cjs --help

# Build Electron main
npm run build:main

# Run tests
npm test
```

---

## Files Changed

| File                     | Change                                               |
| ------------------------ | ---------------------------------------------------- |
| `package.json`           | Added `"type": "module"`, changed main to `main.cjs` |
| `tsconfig.json`          | Added `skipLibCheck`, `noEmitOnError`                |
| `tsconfig.renderer.json` | New file for Angular compilation                     |
| `webpack.cli.cjs`        | Output to `.cjs`, added `transpileOnly`              |
| `webpack.main.cjs`       | Output to `.cjs`, added `transpileOnly`              |
| `webpack.renderer.cjs`   | Use separate tsconfig                                |
| `src-cli/package.json`   | Added `"type": "module"`, updated bin path           |
