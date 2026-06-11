---
provider: manual
pr:
round: 4
round_created_at: 2026-06-11T01:43:13Z
status: resolved
file: vite.config.ts
line: 6
severity: critical
author: claude-code
provider_ref:
---

# Issue 001: Build output crashes at runtime — bare `module.exports` in server-entry.mjs

## Review Comment

The built server entry file (`_fresh/server/server-entry.mjs`) contains bare `module.exports` references that crash at import time with `ReferenceError: module is not defined` (line 59090).

**Root cause:** The `qrcode` npm package depends on `pngjs@5.0.0`, a CommonJS library that uses `module.exports` and `require()`. When Fresh/Vite bundles the server-side code, the CJS-to-ESM conversion for `pngjs` is incomplete — 7 instances of `module.exports` remain in the output ESM module without being wrapped in the CJS interop helper (`getDefaultExportFromCjs`). Other CJS packages in the bundle (e.g., `crc` from the same dependency chain) are correctly converted.

**Impact:** The application cannot start via `deno serve _fresh/server.js` (Docker or local production) or `deno task dev` (Vite dev server). The build step (`vite build`) succeeds, but the output is unusable. This blocks all deployment and staging workflows.

**Reproduction:**
```bash
deno eval "import('./_fresh/server/server-entry.mjs')"
# → ReferenceError: module is not defined
```

**Suggested fixes (in order of preference):**

1. **Replace `qrcode` with an ESM-native QR code library** — Use `npm:@nimiq/qrcodejs` or a similar ESM-only library. This avoids the CJS compatibility issue entirely.

2. **Configure Vite's SSR bundling in `vite.config.ts`:** Add `ssr.noExternal` or `ssr.optimizeDeps.include` to force Vite to properly convert the `pngjs` package:
   ```ts
   export default defineConfig({
     plugins: [fresh(), tailwindcss()],
     ssr: {
       noExternal: ['pngjs'],
     },
   })
   ```
   This tells Vite to bundle `pngjs` instead of externalizing it, which should trigger the full CJS-to-ESM conversion pipeline.

3. **Post-build patching** — As a temporary workaround, add a build step that replaces the bare `module.exports` references in `_fresh/server/server-entry.mjs` with a CJS-compatible wrapper, but this is fragile and not recommended.

## Triage  

- Decision: `valid`
- Notes: The `qrcode` npm package transitively depends on `pngjs@5.0.0` (CJS-only). The Fresh `@fresh/plugin-vite` `deno` plugin intercepts npm package loading through the Deno loader, which wraps CJS modules in ESM. For `pngjs`'s deeply-nested CJS structure (multiple files requiring each other), the Deno loader's wrapping is incomplete — `module.exports` remains in the ESM output without `module` being defined, causing `ReferenceError: module is not defined` at runtime.

- Fix applied: Replaced `npm:qrcode@^1.5.4` with `npm:qrcode-generator@^2.0.4` (zero dependencies, ESM-native). Rewrote `islands/QRCodeDisplay.tsx` to use `qrcode-generator` with an off-screen canvas to generate the QR code PNG data URL (same behavior as before, no CJS deps). Removed `qrcode` and `@types/qrcode` from `deno.json`. Removed unused `ssr.noExternal` config from `vite.config.ts`.

- Verification: Build succeeds (`vite build`), server entry has 0 `module.exports` instances (was 7), all 110 tests pass (0 failed), server entry loads without `ReferenceError: module is not defined`.
