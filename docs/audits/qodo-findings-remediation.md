# Qodo Security Findings — Remediation Summary

All 15 findings have been addressed and verified.

---

## Finding 1: Firestore Rules `classDoc()` null guards ✅

**Risk:** Rule evaluation error (hard-deny / DoS) when a referenced class doc is missing.

**Fix:** Added `c != null` guards to:
- [`isAssignedToClass()`](file:///E:/myliberty-portal/firestore.rules#L121-L130)
- [`canManageClassAttendance()`](file:///E:/myliberty-portal/firestore.rules#L132-L151)
- [`studentIsEnrolled()`](file:///E:/myliberty-portal/firestore.rules#L153-L156)

All three now fail closed (deny) when the class document doesn't exist, instead of crashing the rule evaluator.

---

## Finding 2: Firestore index alignment ✅

**Risk:** Missing composite indexes for actual query shapes.

**Fix:** Added to [`firestore.indexes.json`](file:///E:/myliberty-portal/firestore.indexes.json):
- `classAttendance` — `studentId` ASC + `attendanceDate` **DESC** (for newest-first student history)
- `classAttendance` — `classId` ASC + `attendanceDate` ASC (for class roster queries)

> [!IMPORTANT]
> These indexes need to be deployed: `firebase deploy --only firestore:indexes`

---

## Finding 3: `uid` vs `rawId` inconsistency ✅

**Risk:** Whitespace-padded or non-string scan values could create mismatched document IDs.

**Fix:** In [`kioskScanProcessor.js`](file:///E:/myliberty-portal/src/features/attendance/kioskScanProcessor.js#L77-L128), changed `resolveStudentClass({ studentId: uid })` and `recordClassAttendanceScan({ studentId: uid })` to use the sanitized `rawId` consistently.

---

## Finding 4: Manual update bypasses schema validation ✅

**Risk:** Invalid status/note/fields could be written to Firestore, breaking UI assumptions.

**Fix:** In [`classAttendanceRepository.js`](file:///E:/myliberty-portal/src/features/attendance/classAttendanceRepository.js#L203-L220), the update path now merges `existingSnap.data()` with `updates` and passes the result through `classAttendanceSchema.parse()` before calling `updateDoc()`.

---

## Finding 5: Scanner empty error callback ✅

**Risk:** Camera permission errors and scan failures were silently swallowed.

**Fix:** In [`InstructorAttendanceView.jsx`](file:///E:/myliberty-portal/src/features/attendance/InstructorAttendanceView.jsx#L251-L264), replaced `() => {}` with a real error callback that:
- Filters out high-frequency "not found" frames (normal QR scanning noise)
- Surfaces genuine errors as `scannerStatus` messages visible to the instructor

---

## Finding 6: Close-out TOCTOU race condition ✅

**Risk:** Concurrent scans during close-out could cause batch commit failures or partial writes.

**Fix:** In [`classAttendanceRepository.js`](file:///E:/myliberty-portal/src/features/attendance/classAttendanceRepository.js#L290-L365):
- Added catch-and-retry logic: if a batch fails with `ALREADY_EXISTS`, the function re-reads each doc in the chunk and retries only truly missing students
- Changed `createdCount` to track actual successful creates rather than assumed count
- The operation remains idempotent and safe under concurrent marking

---

## Finding 7: Hardcoded Firebase config in migration script ✅

**Risk:** The backfill script embedded concrete Firebase config defaults (apiKey/projectId/appId) and fell back to frontend `.env` vars, risking accidental execution against production and unvetted migration against the wrong environment.

**Fix:** In [`backfill-outreach-visits-branch.js`](file:///E:/myliberty-portal/scripts/backfill-outreach-visits-branch.js):
- Removed all hardcoded fallback API keys, project IDs, and app IDs.
- Removed fallback to client `.env` `VITE_*` variables.
- Required explicit `--projectId` flag or `FIREBASE_PROJECT_ID` environment variable, failing fast with usage instructions if omitted.

---

## Finding 8: Client SDK & plaintext credential auth in migration script ✅

**Risk:** Script used Firebase Client Web SDK (`firebase/app`, `firebase/auth`, `firebase/firestore`), requiring user credentials, prompting for plaintext password flags (`--password`), and being constrained by client security rules during admin-level database migrations.

**Fix:** In [`backfill-outreach-visits-branch.js`](file:///E:/myliberty-portal/scripts/backfill-outreach-visits-branch.js):
- Replaced Firebase Client SDK with `firebase-admin` (Admin SDK).
- Supported standard administrative authentication via service account JSON (`--service-account` or `GOOGLE_APPLICATION_CREDENTIALS`), Firestore Emulator (`--emulator`), or Google Application Default Credentials (`--adc`).
- Removed plaintext password arguments and client login dependencies.

---

## Finding 9: Firestore composite index schema mismatch for `schoolOutreach` ✅

**Risk:** `firestore.indexes.json` defined an index with `collectionGroup: "schoolOutreach"` alongside `queryScope: "COLLECTION"`, which violates Firestore index schema specifications (collectionGroup requires `queryScope: COLLECTION_GROUP`), risking deployment failures.

**Fix:**
- Removed the invalid `schoolOutreach` composite index from [`firestore.indexes.json`](file:///E:/myliberty-portal/firestore.indexes.json).
- In [`schoolOutreachRepository.js`](file:///E:/myliberty-portal/src/features/dashboard/marketing/schoolOutreachRepository.js#L78-L105), removed the multi-field `orderBy` from the query and performed deterministic in-memory sorting by name on active branch records, eliminating the need for a composite Firestore index.

---

## Finding 10: Security rule discrepancy on subcollection vs collection-group visits ✅

**Risk:** Direct subcollection path `/schoolOutreach/{schoolId}/visits/{visitId}` only checked `isStaff()` and `isSameBranch(parentSchool())`, omitting the strict tenant check `isSameBranchStrict(resource.data)` used in the `{path=**}/visits/{visitId}` collection group rule.

**Fix:** In [`firestore.rules`](file:///E:/myliberty-portal/firestore.rules#L286-L315):
- Enforced `isSameBranchStrict(resource.data)` across both direct subcollection and collection-group paths on `read` and `update`/`delete`.
- Prevented cross-branch leakage and unified tenant boundaries.

---

## Finding 11: `MarketingDashboard` profile subscription lifecycle ✅

**Risk:** `userProfile` was fetched once using `getDoc(doc(db, "users", currentUser.uid))` inside a basic `useEffect([currentUser])`. If the user switched accounts or logged out, outdated profile state remained or did not properly react to auth state transitions.

**Fix:** In [`MarketingDashboard.jsx`](file:///E:/myliberty-portal/src/features/dashboard/MarketingDashboard.jsx#L42-L78):
- Bound the profile listener lifecycle directly to `onAuthStateChanged()`.
- Reset all dashboard state (`userProfile`, `schools`, `loadingProfile`) cleanly on auth transitions.
- Properly cleared timers and listeners on component unmount.

---

## Finding 12: Client-side branch assumption in `createSchoolVisit` ✅

**Risk:** `createSchoolVisit` relied on client-supplied `parentSchool.branchId` without verifying it against the authoritative Firestore parent school document, potentially allowing a spoofed or stale branch ID to be written to the child visit document.

**Fix:** In [`schoolOutreachRepository.js`](file:///E:/myliberty-portal/src/features/dashboard/marketing/schoolOutreachRepository.js#L145-L185):
- Added an authoritative pre-read of the parent school document via `getDoc(parentDocRef)`.
- Validates parent existence and asserts that `parentData.branchId === visitData.branchId`, failing fast with a descriptive error before write.

---

## Finding 13: Inconsistent `showStatus` default signature in `handleKioskScan` ✅

**Risk:** The default parameter for `showStatus` was shortened to `() => {}`, which conflicted with its JSDoc signature `(title, type, message, name) => void` and broke call expectations and telemetry diagnostics when callers omitted `showStatus`.

**Fix:** In [`kioskScanProcessor.js`](file:///E:/myliberty-portal/src/features/attendance/kioskScanProcessor.js#L14-L24):
- Restored the documented 4-parameter signature `showStatus = (/* eslint-disable no-unused-vars */ _title = "", _type = "", _message = "", _name = "") => {}`.
- Preserved signature compatibility and debugging expectations while satisfying ESLint rules.

---

## Finding 14: Duplicate Firestore real-time listeners across Marketing tabs ✅

**Risk:** Both `MarketingDashboard` (for metrics calculation) and `SchoolOutreachTab` (for table rendering) independently invoked `listenToSchools()`, creating duplicate concurrent Firestore real-time listeners and doubling Firestore read operations for the same collection.

**Fix:**
- In [`MarketingDashboard.jsx`](file:///E:/myliberty-portal/src/features/dashboard/MarketingDashboard.jsx#L80-L105), lifted school listener state (`schools`, `schoolsLoading`, `schoolsError`) up to the parent dashboard.
- Passed `schools` and `schoolsLoading` as props into [`<SchoolOutreachTab />`](file:///E:/myliberty-portal/src/features/dashboard/marketing/SchoolOutreachTab.jsx#L40-L75).
- In [`SchoolOutreachTab.jsx`](file:///E:/myliberty-portal/src/features/dashboard/marketing/SchoolOutreachTab.jsx#L50-L75), consumed the passed props while preserving an optional fallback listener when used as an isolated standalone component.

---

## Finding 15: Harden Dev Switcher (Admin-Only Live Site Gating & Remove Password Fallback) ✅

**Risk:** `isDevSwitcherEnabled` previously allowed enabling the dev quick-switcher via env flags on the public login page, and `DEV_TEST_PASSWORD` fell back to `"123456"`, risking exposure of test accounts and 1-click superadmin sign-in with a known fallback credential on public/live sites.

**Fix:**
- In [`LoginPage.jsx`](file:///E:/myliberty-portal/src/features/auth/LoginPage.jsx#L335-L345): gated public login screen test accounts strictly to `isDevSwitcherEnabled` (`import.meta.env.DEV`), ensuring the public production login screen never exposes test accounts or credentials.
- In [`App.jsx`](file:///E:/myliberty-portal/src/App.jsx#L84) and [`DevQuickSwitcher.jsx`](file:///E:/myliberty-portal/src/features/shared/DevQuickSwitcher.jsx#L48): permitted the in-app floating switcher widget in production exclusively for authenticated Admins (`role === "admin"`). Regular staff and unauthenticated visitors cannot see or access it.
- In [`devPresets.js`](file:///E:/myliberty-portal/src/features/auth/devPresets.js#L10) and [`DevQuickSwitcher.jsx`](file:///E:/myliberty-portal/src/features/shared/DevQuickSwitcher.jsx#L56-L85): removed the hardcoded `"123456"` fallback password entirely. Added a secure runtime password input inside the Admin popover for Mode 1 switching and account provisioning.
- In [`.github/workflows/firebase-hosting-merge.yml`](file:///E:/myliberty-portal/.github/workflows/firebase-hosting-merge.yml) and [`.github/workflows/firebase-hosting-pull-request.yml`](file:///E:/myliberty-portal/.github/workflows/firebase-hosting-pull-request.yml): removed `VITE_ENABLE_DEV_SWITCHER` and `VITE_DEV_TEST_PASSWORD` so production deployments never carry dev-switcher build flags.
- In [`.env`](file:///E:/myliberty-portal/.env): cleaned dev switcher flags from repository configuration.

---

## Finding 16: Legacy Role Aliases Normalization & Complete Test Coverage ✅

**Risk:** The codebase supports multiple legacy role aliases for front office leadership (`opslead`, `ops_lead`, `frontofficelead`) and instructor leadership (`instructorleader`, `instructor_leader`). Because dev presets and tests previously only used canonical `opslead`, regressions and unhandled legacy aliases in approval routing and repository queries could go undetected. Specifically:
- `approvalGates.js` did not recognize `frontofficelead` in `getSelfCorrectionApprover` (falling through to general staff routing instead of escalating to Branch Manager) or `canApproveGate`.
- `approvalsRepository.js` omitted `frontofficelead` in query constraints, which would cause an unconstrained Firestore query and permission denial under security rules for users with legacy documents.

**Fix:**
- In [`approvalGates.js`](file:///E:/myliberty-portal/src/features/shared/approvalGates.js): added `frontofficelead` and `front_office_lead` to `getSelfCorrectionApprover` (escalates to `APPROVAL_ROLES.BRANCH_MANAGER`) and `canApproveGate` (`APPROVAL_ROLES.OPS_LEAD`).
- In [`approvalsRepository.js`](file:///E:/myliberty-portal/src/features/shared/approvalsRepository.js): added `frontofficelead` and `front_office_lead` to query constraints in `listenToPendingApprovals`.
- In [`devPresets.js`](file:///E:/myliberty-portal/src/features/auth/devPresets.js): exported `LEGACY_ROLE_ALIASES`, `normalizeRoleAlias()`, and explicit `MODE_1_LEGACY_ALIAS_ACCOUNTS` for targeted testing without cluttering the primary user-facing UI.
- In [`approvalGates.test.js`](file:///E:/myliberty-portal/src/features/shared/approvalGates.test.js) and [`devPresets.test.js`](file:///E:/myliberty-portal/src/features/auth/devPresets.test.js): added unit test coverage verifying alias normalization, approval gate satisfaction, self-correction routing, and structural validity of legacy alias accounts.

---

---

## Finding 17: Centralize Role Alias Normalization in Shared Module (`roles.js`) ✅

**Risk:** Role alias lists were previously duplicated in `devPresets.js`, `approvalGates.js`, and `approvalsRepository.js`, risking divergence where new aliases or modifications in one place were omitted from others.

**Fix:**
- Created [`roles.js`](file:///E:/myliberty-portal/src/features/shared/roles.js) as the single authoritative source of truth for `CANONICAL_ROLES`, `LEGACY_ROLE_ALIASES`, `normalizeRole()`, and role classification helpers (`isFrontOfficeRole`, `isInstructorRole`, `isManagerRole`).
- Updated [`approvalGates.js`](file:///E:/myliberty-portal/src/features/shared/approvalGates.js) to import `normalizeRole` and use canonical checks in `getSelfCorrectionApprover` and `canApproveGate`.
- Updated [`approvalsRepository.js`](file:///E:/myliberty-portal/src/features/shared/approvalsRepository.js) to use `normalizeRole` in `listenToPendingApprovals`.
- Re-exported `LEGACY_ROLE_ALIASES` and `normalizeRoleAlias` from [`roles.js`](file:///E:/myliberty-portal/src/features/shared/roles.js) in [`devPresets.js`](file:///E:/myliberty-portal/src/features/auth/devPresets.js).
- Added comprehensive unit tests in [`roles.test.js`](file:///E:/myliberty-portal/src/features/shared/roles.test.js).

---

## Finding 18: Mode 1 Test Accounts Gating & Leakage Prevention Test (`LoginPage.test.js`) ✅

**Risk:** Mode 1 test accounts contain real-looking test email addresses (e.g. `admin.test@myliberty.id`). Without explicit regression testing, a regression in conditional rendering could expose these test accounts in production HTML.

**Fix:**
- Verified that Mode 1 test accounts in [`LoginPage.jsx`](file:///E:/myliberty-portal/src/features/auth/LoginPage.jsx#L336) are strictly gated behind `{isDevSwitcherEnabled && (...)}`.
- Created [`LoginPage.test.js`](file:///E:/myliberty-portal/src/features/auth/LoginPage.test.js) which renders `<LoginPage />` to static markup under simulated production (`isDevSwitcherEnabled === false`) and asserts that:
  - "Quick Test Accounts (Dev Mode)" is never rendered.
  - None of the test account emails exist in the rendered output.
  - Test accounts render only when `isDevSwitcherEnabled === true`.

---

## Finding 19: DevQuickSwitcher Password Dynamic Sync (Eliminate Stale State) ✅

**Risk:** In `DevQuickSwitcher.jsx`, initializing `authPassword` from `DEV_TEST_PASSWORD` once in `useState` meant that if `DEV_TEST_PASSWORD` changed at runtime or during hot reload, `authPassword` remained stale. Attempting to synchronize via an effect violated React 19's `react-hooks/set-state-in-effect` lint rule.

**Fix:**
- Replaced the synchronized state pattern with reactive derivation: `userPasswordOverride` state (defaults to `null`).
- Derived `effectivePassword = userPasswordOverride !== null ? userPasswordOverride : (DEV_TEST_PASSWORD || "")`.
- Bound the password input directly to `effectivePassword` and updated `userPasswordOverride` on change, guaranteeing that `DEV_TEST_PASSWORD` updates dynamically without effects or cascading renders, while respecting intentional user overrides.

---

## Verification

| Check | Result |
|---|---|
| `npm test` | ✅ 790 passed, 39 skipped |
| `npm run typecheck` | ✅ Clean (0 errors) |
| `npm run build` | ✅ Clean |
| `npm run lint` | ✅ Clean (0 errors) |




