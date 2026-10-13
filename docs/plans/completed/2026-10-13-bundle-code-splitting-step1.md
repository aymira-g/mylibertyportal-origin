# Bundle Code Splitting — Step 1 (Eliminate Barrel Import Traps in App.jsx)

## 1. Goal & Context
The user requested Step 1 of the code-splitting plan: eliminate unnecessary large bundle downloads caused by barrel import traps. Specifically, in `src/App.jsx`, `ParentPortalPage` and `StandaloneKioskPage` are currently imported from feature folder barrels (`./features/students` and `./features/attendance`) instead of their direct file paths. This causes parent portal visitors and lobby kiosks to download large, unneeded staff admin components.

## 2. Scope & Changes
- `src/App.jsx`:
  - Change `lazyWithRetry(() => import("./features/students").then((m) => ({ default: m.ParentPortalPage })))` to direct import `lazyWithRetry(() => import("./features/students/ParentPortalPage"))`.
  - Change `lazyWithRetry(() => import("./features/attendance").then((m) => ({ default: m.StandaloneKioskPage })))` to direct import `lazyWithRetry(() => import("./features/attendance/StandaloneKioskPage"))`.

## 3. Cost & Risk Check
- **Cost:** Zero cost. No new dependencies or services added.
- **Risk:** Zero risk of breaking behavior. Both targets (`ParentPortalPage.jsx` and `StandaloneKioskPage.jsx`) are standalone React components with default exports.
- **Backward Compatibility:** All existing imports inside `features/students/index.js` and `features/attendance/index.js` remain intact for other modules.

## 4. Verification Plan
- Run `npm run build` to compare the chunk sizes and verify clean compilation.
- Run `npm run lint` and `npm run typecheck` to ensure 0 errors.
- Run `npm test` to confirm all existing tests pass without regressions.
- Run Level 1 regression check.

## 5. Verification Results (2026-10-13)
- **Bundle Chunks Measured:**
  - `ParentPortalPage-*.js`: Generated clean standalone chunk at **11.99 kB** (2.75 kB gzip), completely detached from the 467 kB staff student management bundle.
  - `StandaloneKioskPage-*.js`: Generated dedicated chunk at **136.21 kB** (29.03 kB gzip).
- **Compilation:** `compile_applet` passed cleanly.
- **Linter (`npm run lint`):** Passed with 0 errors, 0 warnings.
- **Type Checker (`npm run typecheck`):** Passed with 0 errors.
- **Test Suite (`npm test`):** 104 test suites passed (1 skipped), 1,381 tests passed (0 failures).
- **Status:** COMPLETED & VERIFIED.

