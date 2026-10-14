# MyLiberty Portal — Level 2 Deep Conformance Audit Report
## Domain 13: Cloudflare Worker / External Integrations & Ops Tooling

> **Audit ID:** `L2-DOM13-2026-10-12`  
> **Target:** [Domain 13 (`03-audit-domains.md`)](../Comprehensive%20Hidden-Bug%20Audit%20Strategy/03-audit-domains.md#13-cloudflare-worker--external-integrations--ops-tooling)  
> **Methodology:** [5-Pass Workflow Trace (`02-audit-method.md`)](../Comprehensive%20Hidden-Bug%20Audit%20Strategy/02-audit-method.md)  
> **Governance:** [`MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md`](../../governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md) · **Architecture:** [`ARCHITECTURE.md`](../../ARCHITECTURE.md) · [`AGENTS.md`](../../../AGENTS.md)  
> **Date Executed:** 2026-10-12 (Round 1) · 2026-10-14 (Round 2 Re-verification)  
> **Audit Status:** **PASS — AUDIT COMPLETE & ALL 11 FINDINGS REMEDIATED (CLOSED)**  

---

## 1. Scope & Executive Summary

Subsystems and files inspected:
1. **Server-Authoritative Cloudflare Worker:**
   - [`cloudflare-worker/worker.js`](file:///e:/myliberty-portal/cloudflare-worker/worker.js): Endpoint routing, Google OAuth2 Service Account token management, Firebase Authentication JWKS verification, WebCrypto ECDSA P-256 signature verification, single-use challenge nonce consumption, single-open-shift atomic concurrency locks (`activeShifts`), corporate event audience gating, parent linkage verification, and Gemini AI proxy.
   - [`cloudflare-worker/wrangler.toml`](file:///e:/myliberty-portal/cloudflare-worker/wrangler.toml) & [`cloudflare-worker/package.json`](file:///e:/myliberty-portal/cloudflare-worker/package.json): Environment variables, `ALLOWED_ORIGIN` CORS policy, deployment configuration.
2. **Google Apps Script Form Sync (`FormSync.gs`):**
   - [`FormSync.gs`](file:///e:/myliberty-portal/FormSync.gs): Direct admissions Google Form intake pipeline executing authenticated Firestore REST mutations to the `applications` collection via Service Account JWT grant.
3. **Privileged Ops Scripts & Data Backfill Tooling:**
   - [`scripts/audit-and-backfill-division.js`](file:///e:/myliberty-portal/scripts/audit-and-backfill-division.js): Multi-collection division analysis and backfill tool.
   - [`scripts/backfill-attendance-branch.js`](file:///e:/myliberty-portal/scripts/backfill-attendance-branch.js): Attendance branch-scoping migration script.
   - [`scripts/backfill-outreach-visits-branch.js`](file:///e:/myliberty-portal/scripts/backfill-outreach-visits-branch.js): School outreach visit migration script.
   - [`scripts/fix-studio-staff-division.js`](file:///e:/myliberty-portal/scripts/fix-studio-staff-division.js): Targeted staff division reconciliation script.
   - [`scripts/_fix-irnawati.mjs`](file:///e:/myliberty-portal/scripts/_fix-irnawati.mjs): Ad-hoc ops script.
4. **Credential & Secret Hygiene:**
   - [`.gitignore`](file:///e:/myliberty-portal/.gitignore) and repository history: Verification of `serviceAccountKey.json` exclusion across all commits.

---

### Verified Good Behavior (Observed)

1. **Flawless Credential Hygiene:**
   `serviceAccountKey.json` is strictly ignored by git (`.gitignore:17-20`), and inspection of the entire git commit history confirmed that no Service Account key file has ever been committed.
2. **Atomic Kiosk Concurrency & Double-Clock In Prevention:**
   `worker.js` enforces single open shift invariants using atomic Firestore compare-and-set updates (`fsCommitWrites` and `currentDocument.updateTime`), preventing concurrent dual-terminal clock-ins.
3. **Cryptographic Proof Binding:**
   Terminal clock-in and clock-out require single-use challenge nonces with 60s TTL and ECDSA P-256 signatures validated against public keys stored in Firestore `kioskDevices`.
4. **Chunked Batched Operations on Spark Tier:**
   All administrative migration scripts (`audit-and-backfill-division.js`, `backfill-attendance-branch.js`, `backfill-outreach-visits-branch.js`) respect Firestore batch write limits (max 400 operations per commit, well below the 500 operation limit) and default to non-destructive dry-run modes.

---

## 2. Findings

| ID | Severity | Type | File(s) / Component | Summary |
|---|---|---|---|---|
| **DOM13-SEC-01** | High | Authorization / Governance | [`cloudflare-worker/worker.js:1361-1378`](file:///e:/myliberty-portal/cloudflare-worker/worker.js#L1361) | Executive roles (`director`, `vice_director`) omitted from `staffRoles` in `handleAIAssistant`; executives using AI Assistant in their dashboard receive HTTP 403 Forbidden. |
| **DOM13-COR-01** | Medium | Data Integrity / Scoping | [`cloudflare-worker/worker.js:927, 934, 1233`](file:///e:/myliberty-portal/cloudflare-worker/worker.js#L927) | Shift division derived via `user.division === "kindergarten" ? "kindergarten" : "courses"`, forcefully clobbering cross-divisional staff (`division: "all"`) to `"courses"` and ignoring `classDoc.division` for teaching shifts. |
| **DOM13-COR-02** | Medium | Branch Isolation / Compatibility | [`cloudflare-worker/worker.js:743, 1081, 1191`](file:///e:/myliberty-portal/cloudflare-worker/worker.js#L743) | Shift clock-in and class-switch perform raw string equality `user.branchId !== device.branchId` without `normalizeBranchId`, rejecting staff with legacy branch strings or missing `branchId`. |
| **DOM13-RES-01** | Medium | Resilience / Concurrency | [`cloudflare-worker/worker.js:843-861`](file:///e:/myliberty-portal/cloudflare-worker/worker.js#L843) | If an `activeShifts` lock references a deleted or purged shift document, `shiftCheck` is null, falling into an unhandled branch that permanently blocks staff clock-in with HTTP 409. |
| **DOM13-INT-01** | Medium | Data Integrity / Integration | [`FormSync.gs:149-183`](file:///e:/myliberty-portal/FormSync.gs#L149) | `FormSync.gs` fails to derive or populate `division` (`"courses"` vs `"kindergarten"`), lacks null checks on event `e.namedValues`, omits pre-write validation on applicant name, and lacks audit metadata attribution (`intakeSource`). |
| **DOM13-TECH-01** | Low | Tooling Safety | [`scripts/_fix-irnawati.mjs`](file:///e:/myliberty-portal/scripts/_fix-irnawati.mjs) | Ad-hoc ops script reads `serviceAccountKey.json` directly, lacks `--dry-run` and `--projectId` safety arguments, and unconditionally executes unconfirmed writes. |

---

## 3. Deep Dive Analysis

### DOM13-SEC-01 — Executive Roles Omitted from AI Assistant Endpoint
- **Location:** [`cloudflare-worker/worker.js:1361-1378`](file:///e:/myliberty-portal/cloudflare-worker/worker.js#L1361)
- **Vulnerability / Flaw:**
  ```javascript
  const staffRoles = [
    "admin",
    "manager",
    "instructor",
    "instructorleader",
    "frontoffice",
    "opslead",
    "marketing",
    "officeboy",
  ];
  if (!userDoc || !staffRoles.includes(userRole) || userDoc.status === "terminated" || userDoc.status === "resigned") {
    return json({ error: "Forbidden: AI Assistant is restricted to active staff members." }, 403, request, env);
  }
  ```
- **Impact:**
  [`ViceDirectorDashboard.jsx:583`](file:///e:/myliberty-portal/src/features/dashboard/ViceDirectorDashboard.jsx#L583) mounts `<AIAssistant />`. When the Vice Director attempts to generate or summarize content, the Worker denies access with HTTP 403 Forbidden because `director` and `vice_director` are missing from `staffRoles`.
- **Remediation:**
  Add `"director"` and `"vice_director"` to `staffRoles` in `handleAIAssistant`.

---

### DOM13-COR-01 — Shift Division Clobbered to "courses" for Cross-Divisional Staff & Classes
- **Location:** [`cloudflare-worker/worker.js:927, 934, 1233`](file:///e:/myliberty-portal/cloudflare-worker/worker.js#L927)
- **Vulnerability / Flaw:**
  ```javascript
  const userDivision = user.division === "kindergarten" ? "kindergarten" : "courses";
  ```
  1. Staff with canonical `division: "all"` (Ops Lead, Instructor Leader, Office Boy) have their shifts forcibly marked as `"courses"`. When Kindergarten Division Managers view on-duty staff, these records are filtered out.
  2. When an instructor clocks in or switches to a Kindergarten class (`classDoc.division === "kindergarten"`), the worker ignores `classDoc.division` and labels the teaching shift `"courses"` if the instructor's profile division is `"courses"` or `"all"`.
- **Remediation:**
  Derive shift division with precedence:
  ```javascript
  const resolvedDivision = classDoc?.division || (user.division === "all" ? "all" : (user.division === "kindergarten" ? "kindergarten" : "courses"));
  ```

---

### DOM13-COR-02 — Un-normalized Branch Comparison in Clock-In & Class-Switch
- **Location:** [`cloudflare-worker/worker.js:743, 1081, 1191`](file:///e:/myliberty-portal/cloudflare-worker/worker.js#L743)
- **Vulnerability / Flaw:**
  ```javascript
  if (user.branchId !== device.branchId) {
    return json({ error: "This staff badge is assigned to a different branch." }, 403, request, env);
  }
  ```
  If a user profile has legacy `branchId: "cabang_utama"` or only stores `branch: "Kota Gorontalo"`, direct string comparison fails against `device.branchId` (`"kota_gorontalo"`).
- **Remediation:**
  Normalize branch identifiers before comparison:
  ```javascript
  if (normalizeBranchId(user.branchId || user.branch) !== normalizeBranchId(device.branchId))
  ```

---

### DOM13-RES-01 — Permanent Lockout on Deleted Shift in `activeShifts`
- **Location:** [`cloudflare-worker/worker.js:843-861`](file:///e:/myliberty-portal/cloudflare-worker/worker.js#L843)
- **Vulnerability / Flaw:**
  ```javascript
  const shiftCheck = await fsGetDoc("shifts", existingLock.shiftId, token);
  if (shiftCheck && shiftCheck.clockOut) {
    // Stale lock detected, clean up with version precondition
    ...
  } else {
    return json({ error: "Staff member already has an active open shift.", existingShiftId: existingLock.shiftId }, 409, request, env);
  }
  ```
  If the shift referenced by `existingLock.shiftId` was deleted from Firestore, `shiftCheck` is `null`. The condition evaluates to `false` and falls into `else`, permanently returning HTTP 409 and locking the employee out indefinitely.
- **Remediation:**
  Clean up orphaned locks when `!shiftCheck || shiftCheck.clockOut`.

---

### DOM13-INT-01 — Admissions Google Form Sync Omits Division & Pre-Write Validation
- **Location:** [`FormSync.gs:149-183`](file:///e:/myliberty-portal/FormSync.gs#L149)
- **Vulnerability / Flaw:**
  `FormSync.gs` writes directly to Firestore `applications` with administrative privilege via REST:
  1. Never derives or writes `division` (`"courses"` vs `"kindergarten"`), creating schema drift and blind spots in division-filtered admissions views.
  2. Does not validate `e && e.namedValues` defensively.
  3. Does not validate that `displayName` is non-empty before submitting to Firestore.
  4. Lacks audit attribution (`intakeSource: "google_forms_sync"`).
- **Remediation:**
  Update `FormSync.gs` to derive `division` from program text, validate applicant name, guard `e.namedValues`, and attach `intakeSource: "google_forms_sync"`.

---

### DOM13-TECH-01 — Unsafely Parameterized Manual Ops Script in `scripts/`
- **Location:** [`scripts/_fix-irnawati.mjs`](file:///e:/myliberty-portal/scripts/_fix-irnawati.mjs)
- **Vulnerability / Flaw:**
  `_fix-irnawati.mjs` was an ad-hoc scratch script that directly updates Firestore without requiring `--dry-run` or `--projectId`, presenting a risk of unintended execution against live production data.
- **Remediation:**
  Add standard argument parsing with `--projectId` requirement and `--dry-run` / `--commit` safety guards.

---

## 4. Remediation Plan

1. **`cloudflare-worker/worker.js`:**
   - Add `"director"` and `"vice_director"` to `staffRoles` in `handleAIAssistant`.
   - Update `handleShiftClockIn` and `handleShiftClassSwitch` to inherit `classDoc.division` and preserve `user.division === "all"`.
   - Normalize branch comparison across clock-in, clock-out, and class switch handlers using `normalizeBranchId`.
   - Update `handleShiftClockIn` lock recovery to treat `!shiftCheck` as a stale orphaned lock.
2. **`FormSync.gs`:**
   - Add defensive null-handling for `e && e.namedValues`.
   - Validate non-empty `displayName`.
   - Derive `division` from program string (`"kindergarten"` vs `"courses"`).
   - Attach `intakeSource: "google_forms_sync"`.
3. **`scripts/_fix-irnawati.mjs`:**
   - Add explicit `--projectId` validation and `--commit` / `--dry-run` safety gates.
4. **Verification:**
   - Run Vitest suite (`npm test`), ESLint (`npm run lint`), TypeScript (`npm run typecheck`), and build (`npm run build`).

---

## 5. Hardening & Verification Addendum (2026-10-14)

Following the comprehensive verification of Domain 13, all remaining edge cases, branch comparisons, parent linkage invariants, rate limits, and automated testing requirements were implemented and verified:

### 1. Corporate Event Audience Branch Normalization (`DOM13-COR-03`)
- **Location:** [`cloudflare-worker/worker.js:801-807`](file:///e:/myliberty-portal/cloudflare-worker/worker.js#L801)
- **Problem:** When an event specified `audienceType: "branch"`, the worker performed a raw string inequality check `targetBranch !== device.branchId && eventDoc.branch !== device.branchId`. Because `device.branchId` is a canonical ID (e.g. `"kota_gorontalo"`) while `eventDoc.audienceValue` or `eventDoc.branch` is often a display label (e.g. `"Kota Gorontalo"` or `"Cabang Utama"`), valid staff were rejected with HTTP 403.
- **Remediation:** Normalized both event branch and device branch with `normalizeBranchId` before comparison.

### 2. Parent Account Inactive Guard & Server-Side Unlink Support (`DOM13-SEC-02`)
- **Location:** [`cloudflare-worker/worker.js:1375-1416`](file:///e:/myliberty-portal/cloudflare-worker/worker.js#L1375)
- **Problem:** `handleParentLink` previously checked active status for students (`student.status && student.status !== "active"`), but omitted any status check on the parent document. Deactivated or suspended parent accounts could still be linked to students. Furthermore, the endpoint only supported adding children (`[...new Set([...parent.childStudentIds, studentId])]`), forcing unlinking to rely exclusively on client-side direct writes.
- **Remediation:**
  - Added strict parent account active status check: `(parent.status && parent.status !== "active")` returns HTTP 404.
  - Added support for `action === "unlink"` (defaults to `"link"`), filtering out the target student ID from `parent.childStudentIds`.

### 3. AI Assistant Rate Limiting & Gemini Model Safety (`DOM13-SEC-03`)
- **Location:** [`cloudflare-worker/worker.js:1441-1505`](file:///e:/myliberty-portal/cloudflare-worker/worker.js#L1441)
- **Problem:** The AI Assistant endpoint had no rate limiting, allowing rapid bursts or loops to exhaust zero-budget Gemini free-tier quotas (15 RPM / 1,500 RPD). The fallback model was `"gemini-flash-latest"` rather than the canonical `"gemini-1.5-flash"`, and staff account status checked only `terminated` / `resigned` rather than `userDoc.status !== "active"`.
- **Remediation:**
  - Added per-staff sliding rate limiter (minimum 3 seconds between requests per user ID).
  - Aligned staff status check: `if (!userDoc || !staffRoles.includes(userRole) || (userDoc.status && userDoc.status !== "active"))`.
  - Updated fallback model to `"gemini-1.5-flash"`.

### 4. Canonical Branch Display Normalization in Google Form Sync (`DOM13-INT-02`)
- **Location:** [`FormSync.gs:184-197`](file:///e:/myliberty-portal/FormSync.gs#L184)
- **Problem:** `FormSync.gs` set `application.branchId = branchId`, but left `application.branch` as raw unformatted input from the Google Form question.
- **Remediation:** Added `BRANCH_NAMES` dictionary, assigning `application.branch = BRANCH_NAMES[branchId] || "Kota Gorontalo"` so both modern and legacy queries match.

### 5. Automated Unit Test Suite (`DOM13-TEST-01`)
- **Location:** [`src/features/attendance/workerContract.test.js`](file:///e:/myliberty-portal/src/features/attendance/workerContract.test.js)
- **Coverage:** 33 automated Vitest unit tests verifying:
  - Branch and role normalization dictionaries and canonical resolution.
  - Legacy branch alias resolution (`cabang utama`, `utama`, `main branch`, `gorontalo` -> `kota_gorontalo`).
  - Legacy role alias resolution (`ops_lead`, `frontofficelead`, `instructor_leader`).
  - Bidirectional Firestore REST API value and document converters.
  - Cryptographic shift ID (`shift_...`) and nonce (`base64url`) format validation.
  - CORS OPTIONS preflight headers, 404 handler, and 401 unauthenticated request rejection on `/api/v1/ai` and `/api/v1/parent-link`.
  - Rate limiting throttling, sliding window reset, and memory bounding / cache pruning (DOM13-F5).
  - Fail-closed corporate event audience evaluation on branch, role, and division constraints (DOM13-F4).
  - Parent-child link and unlink array transformations, deduplication, and Admin exclusion (DOM13-F2, F3).

### 6. Round 2 Second-Opinion Remediation & Hardening (2026-10-14)
Per the Independent Auditor review and Owner Ratification (Kifry):
1. **F1 (AI Model Fallback):** Fallback in `worker.js:1559` restored to `gemini-flash-latest` (free-tier Generative Language API v1beta) to ensure zero-cost operation without requiring manual env vars.
2. **F2 (Parent Link Security — Option A Ratified):** Database invariants enforced in `firestore.rules` (`canUpdateUser` requires active parent status `(!('status' in res) || res.status == 'active')` and CEL list type for `childStudentIds`; `isParentOf` verifies student active status and branch match). Worker aligned with `unlink` action, and `admin` removed from business roles. `usersRepository.js` updated to throw client 4xx rejections directly without silent fallback.
3. **F3 (Targeted Field Updates & Audit Trail):** Replaced full document overwrite with `fsPatchDocFields` utilizing `updateMask: ["childStudentIds", "updatedAt"]`, eliminating stray `id` fields and preserving Firestore timestamps. Appended audit records to `kioskAuditEvents` with `domain: "parent_portal"`.
4. **F4 (Corporate Event Audience Fail-Closed):** Gated branch, role, and division audience constraints to fail closed on missing branch or division.
5. **F5 (Memory Bounding):** Added `checkRateLimit` with automatic stale-entry pruning when exceeding 500 entries. Documented zero-budget protection (billing disabled) and prompt privacy.
6. **F6 (FormSync.gs Hardening):** Applied regex word boundaries `\b(kindergarten|...)\b` to prevent substring collisions, added unassigned branch triage, detected satellite branch kindergarten conflicts under Blueprint v3.4, and converted `testConnection()` to a safe dry-run.
7. **F7 (Test & Ledger Integrity):** Expanded `workerContract.test.js` to 33 tests, logged all 6 addendum items in `bug-ledger.md` and `audit-debt-register.md`.

### 7. Verification Results

| Verification Gate | Command | Result | Notes |
|---|---|---|---|
| **Unit Test Suite** | `npm test` | **PASS (100%)** | **106 test files passed**, **1,433 tests passed**, 0 failed |
| **Firestore Security Rules** | `npm run test:rules` | **PASS (100%)** | **7 emulator test files passed**, **139 tests passed**, 0 failed |
| **ESLint Quality** | `npm run lint` | **PASS (100%)** | **0 errors, 0 warnings** |
| **TypeScript Typecheck** | `npm run typecheck` | **PASS (100%)** | **0 type errors (`tsc --noEmit`)** |
| **Vite Production Build** | `npm run build` | **PASS (100%)** | Built cleanly in 3.96s with PWA precache generation |
| **Status** | — | **PASS** | **All Domain 13 requirements and second-opinion findings remediated, hardened, and verified.** |
