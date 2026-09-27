# Qodo Security Findings — Remediation Summary

All 26 findings have been addressed and verified.

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

## Finding 20: Consolidate Duplicate `corporateEvents` Security Rule Block ✅

**Risk:** `firestore.rules` contained two separate `match /corporateEvents/{eventId}` blocks. Because Firestore rules evaluation grants access if *any* matching rule allows it, the older legacy block (`allow read: if isStaff();`) unintentionally broadened read access to all staff members across all branches, bypassing the newly introduced branch-locking and audience-scoping rules.

**Fix:**
- In [`firestore.rules`](file:///e:/myliberty-portal/firestore.rules#L308-L345), deleted the legacy duplicate block (previously at lines ~497–509) and retained a single authoritative rule set:
  - `read`: Admin has global access; staff members are branch-locked by default, permitting reads only for explicitly academy-wide events (`audienceType == 'all'`), their assigned branch (`audienceValue == userBranch()` or matching display names), or role/division-targeted events.
  - `create`: Admin, Manager, and Front Office with schema validations (`name is string`, `eventDate is string`, `audienceType in ['all', 'branch', 'role', 'division']`) and branch isolation enforcement.
  - `update`: Admin, or Manager / Front Office restricted to events within their branch or academy-wide.
  - `delete`: Admin only.
- Added comprehensive unit test coverage in [`securityRulesMatrix.test.js`](file:///e:/myliberty-portal/src/features/shared/securityRulesMatrix.test.js) verifying that cross-branch staff reads are strictly blocked while preserving legitimate branch-scoped and academy-wide access.

---

## Finding 21: Harden `/todos` Update Rule Against Unguarded `branch` / `branchId` Access ✅

**Risk:** The `/todos` update rule previously referenced `resource.data.branch` and `resource.data.branchId` without verifying field existence via the `in` operator. In Firestore rules, accessing a non-existent property throws a runtime evaluation error, which causes a hard denial on legitimate updates for legacy documents that lack `branch` or `branchId` fields.

**Fix:**
- In [`firestore.rules`](file:///e:/myliberty-portal/firestore.rules#L281-L289), mirrored the read-rule existence guards on update:
  - Enforced `(('branch' in resource.data) && (resource.data.branch == 'all' || resource.data.branch == 'All')) || (('branchId' in resource.data) && resource.data.branchId == 'all')`.
  - Preserved `isSameBranch(resource.data)` safe fallback for legacy branchless documents.
  - Enforced that non-manager staff updates are strictly restricted to completion toggle keys (`completed`, `completedAt`, `completedBy`, `completedByName`, `updatedAt`).
- Added unit test coverage in [`securityRulesMatrix.test.js`](file:///e:/myliberty-portal/src/features/shared/securityRulesMatrix.test.js) confirming that legacy documents missing `branch`/`branchId` fields evaluate without errors and reject unauthorized property changes.

---

## Finding 22: Guard Manager Dashboard Listener Startup on Resolved `managerBranchId` ✅

**Risk:** `KidsManagerDashboard` and `ManagerDashboard` derived `managerBranchId` from an asynchronous `managerProfile` snapshot listener. On initial component mounts, `managerProfile` is `null`, which allowed listener effects to execute queries with `where('branchId', '==', undefined)` or `null`. This risked Firestore query evaluation errors, empty results, or permission-denied crashes under branch-restricted rules.

**Fix:**
- In [`KidsManagerDashboard.jsx`](file:///E:/myliberty-portal/src/features/dashboard/kids/KidsManagerDashboard.jsx#L40-L55) and [`ManagerDashboard.jsx`](file:///E:/myliberty-portal/src/features/dashboard/ManagerDashboard.jsx#L62-L80):
  - Guaranteed `managerBranchId` evaluates to `null` while `managerProfile` is unresolved.
  - Added an explicit early-return guard `if (!managerBranchId || typeof managerBranchId !== "string" || !managerBranchId.trim()) { setLoading(true); return; }` to the listener `useEffect`.
  - Maintained `loading: true` until `managerBranchId` resolves to a valid branch string, preventing empty or unauthenticated initial queries.

---

## Finding 23: Align Parent Edit Payload and Disallow Email Mutation ✅

**Risk:** `useDashboardData.handleSave()` previously included `email: formData.email` in `parentData` on both create and edit operations. However, `updateParentRecord()` deliberately excludes `email` because Firestore `/users` security rules for parent accounts strictly allow updates only to `['displayName', 'phone', 'childStudentIds', 'updatedAt', 'status', 'branch']`. Retaining `email` in the edit payload created misleading UI state and inconsistent data flows.

**Fix:**
- In [`useDashboardData.js`](file:///E:/myliberty-portal/src/features/dashboard/useDashboardData.js#L250-L272):
  - Removed `email` from the edit `parentData` payload passed to `updateParentRecord()`.
  - Confined `email` strictly to the `createParentAccount()` path for initial credential and profile provisioning.
- In [`ParentProfileFields.jsx`](file:///E:/myliberty-portal/src/features/students/ParentProfileFields.jsx#L52-L73):
  - Kept the email field disabled on edit (`disabled={Boolean(editId)}`) with clear UI helper text: *"Login email cannot be changed directly."*

---

## Finding 24: Dedicated Embedded Parent Portal Login Flow ✅

**Risk:** Unauthenticated visitors navigating to the dedicated parent routes (`/parent`, `/portal`, `/parent-portal`) were previously presented with a *"Sign In to Parent Account"* button that hard-redirected to `"/"`. Because `"/"` serves the internal staff portal and login page, this caused a broken, confusing onboarding loop for parents attempting to access their student portal.

**Fix:**
- In [`ParentPortalPage.jsx`](file:///E:/myliberty-portal/src/features/students/ParentPortalPage.jsx#L20-L200):
  - Replaced the hard redirect to `"/"` with a dedicated, embedded parent login form right on `/parent`.
  - Added parent-branded email & password authentication with inline validation, error messages, and loading spinners powered by Firebase Auth (`signInWithEmailAndPassword`).
  - Added built-in self-service password recovery (`sendPasswordResetEmail`).
  - Added a clean secondary escape hatch for faculty (*"Staff or Administrator? Go to Staff Portal"*).
  - On successful authentication, automatically renders `<ParentDashboard />` on the same URL without page reloads.
- Added unit test coverage in [`ParentPortalPage.test.js`](file:///E:/myliberty-portal/src/features/students/ParentPortalPage.test.js) verifying static render of the embedded parent login form and controls.

---

## Finding 25: Reconcile Instructor Class Queries with Cross-Branch Assignments ✅

**Risk:** Firestore security rules allow instructors to read classes they teach or substitute regardless of branch (`resource.data.instructorId == request.auth.uid || substituteInstructorId == request.auth.uid`). However, `InstructorDashboard` and `KidsInstructorDashboard` queried `allClasses` solely by `where("branchId", "==", branchId)`, preventing instructors assigned to cross-branch cohorts or substitute classes in other branches from seeing those classes in their dashboards.

**Fix:**
- In [`InstructorDashboard.jsx`](file:///E:/myliberty-portal/src/features/dashboard/InstructorDashboard.jsx#L65-L105) and [`KidsInstructorDashboard.jsx`](file:///E:/myliberty-portal/src/features/dashboard/kids/KidsInstructorDashboard.jsx#L65-L115):
  - Reconciled class discovery by deriving `combinedAllClasses`: combining active branch classes with all classes assigned to the instructor (via `useInstructorRoster()`, which queries by `instructorId` and `substituteInstructorId` across all branches).
  - Deduplicated by class ID so that cross-branch classes and substitute assignments are seamlessly available in `<InstructorOverview />` and `<InstructorClasses />`.

---

## Finding 26: Mandate `branchId` & `branch` on Attendance Writes and Migration Script ✅

**Risk:** The `attendance` collection read rule enforces tenant isolation via `isSameBranch(resource.data)`. However, `recordStudentAttendance()` previously attached `branchId` and `branch` only conditionally. If callers omitted them, new documents lacked branch identifiers, causing `isSameBranch()` to fall back to `kota_gorontalo` and breaking visibility for staff in Bone Bolango, Pohuwato, and Limboto.

**Fix:**
- In [`shiftsRepository.js`](file:///E:/myliberty-portal/src/features/attendance/shiftsRepository.js#L372-L400):
  - Made `branchId` and `branch` mandatory in every `recordStudentAttendance()` write payload.
  - Automatically canonicalizes provided branch strings via `branchToId()` and `idToBranch()`, defaulting safely to `DEFAULT_BRANCH_ID` (`"kota_gorontalo"`) and `DEFAULT_BRANCH` (`"Kota Gorontalo"`).
- In [`shiftsRepository.test.js`](file:///E:/myliberty-portal/src/features/attendance/shiftsRepository.test.js#L170-L195):
  - Added unit test assertions verifying that `recordStudentAttendance` always includes canonical `branchId` and `branch`.
- Created [`scripts/backfill-attendance-branch.js`](file:///E:/myliberty-portal/scripts/backfill-attendance-branch.js):
  - An administrative migration script using `firebase-admin` to scan historical `attendance` records, resolve student branch IDs via their user profile, and backfill `branchId` and `branch` in atomic batches.

---

## Finding 27: Fail-Fast Startup Firebase Validation & Environment Documentation ✅

**Risk:** Removing hardcoded fallbacks from Firebase configuration without strict validation or environment documentation causes cryptic runtime crashes or blank screens in local development and CI pipelines when `VITE_FIREBASE_*` variables are absent.

**Fix:**
- In [`src/firebase.js`](file:///E:/myliberty-portal/src/firebase.js#L20-L45):
  - Updated `validateFirebaseConfig()` to strictly check all mandatory parameters (`apiKey`, `authDomain`, `projectId`, `appId`).
  - Formats a clear, fail-fast error message enumerating the exact missing `VITE_FIREBASE_*` variable names and referencing `.env.example`.
- In [`.env.example`](file:///E:/myliberty-portal/.env.example):
  - Created a comprehensive, self-documenting template categorized into Firebase Client SDK, App Check / reCAPTCHA v3, Cloudflare AI Worker, and Cloudinary variables.
- In [`README.md`](file:///E:/myliberty-portal/README.md#L45-L65):
  - Added an "Environment Configuration" subsection under Development guiding developers on copying `.env.example` to `.env` before running `npm run dev`.

---

## Finding 28: Live User Profile Subscription Hook (`useUserProfile`) in ParentPortalPage ✅

**Risk:** `ParentPortalPage` previously executed an asynchronous `getDoc(doc(db, "users", user.uid))` inside `auth.onAuthStateChanged()`. Because `getDoc` cannot be aborted, unmounting during an in-flight fetch risked state leaks, and profile updates (such as role modifications or profile status updates) were not reflected in real time.

**Fix:**
- In [`src/features/shared/useUserProfile.js`](file:///E:/myliberty-portal/src/features/shared/useUserProfile.js):
  - Created a centralized, reusable `useUserProfile()` hook that pairs `onAuthStateChanged()` with an active `onSnapshot()` listener on `users/{uid}`.
  - Guarantees immediate cleanup on component unmount or auth sign-out, tracking `{ user, profile, role, loading, error }`.
- In [`src/features/shared/index.js`](file:///E:/myliberty-portal/src/features/shared/index.js):
  - Exported `useUserProfile` as a shared foundational hook across the codebase.
- In [`src/features/students/ParentPortalPage.jsx`](file:///E:/myliberty-portal/src/features/students/ParentPortalPage.jsx#L25-L60):
  - Refactored `ParentPortalPage` to consume `useUserProfile()`, removing redundant local state, manual `active` flags, and brittle `getDoc` calls.
- In [`src/features/shared/useUserProfile.test.js`](file:///E:/myliberty-portal/src/features/shared/useUserProfile.test.js):
  - Added unit test verifying initial loading and subscription setup.

---

## Finding 29: Eliminate Unnecessary `users` Composite Index with `array-contains` ✅

**Risk:** `firestore.indexes.json` defined a composite index on `users(branchId ASC, role ASC, childStudentIds CONTAINS)`. Composite indexes with array fields (`arrayConfig: CONTAINS`) incur significant storage overhead and write amplification whenever user records are created or updated.

**Fix:**
- In [`src/features/dashboard/usersRepository.js`](file:///E:/myliberty-portal/src/features/dashboard/usersRepository.js#L340-L360):
  - Updated `findParentsForStudent(studentId, branchId = null)` to query only `role == "parent"` and `childStudentIds array-contains studentId`. This utilizes Firestore's built-in single-field index.
  - Since a student is linked to at most 1–2 parents, the optional `branchId` filtering is performed in-memory on the returned documents, eliminating any need for a multi-field composite index.
- In [`firestore.indexes.json`](file:///E:/myliberty-portal/firestore.indexes.json#L60-L75):
  - Removed the `users(branchId, role, childStudentIds)` composite index, avoiding index bloat and preserving free-tier write budgets.

---

## Verification

| Check | Result |
|---|---|
| `npm test` | ✅ 848 passed, 39 skipped |
| `npm run typecheck` | ✅ Clean (0 errors) |
| `npm run lint` | ✅ Clean (0 errors) |
| `npm run build` | ✅ Clean |







