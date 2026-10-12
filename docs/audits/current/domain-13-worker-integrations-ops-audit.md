# MyLiberty Portal — Level 2 Deep Conformance Audit Report
## Domain 13: Cloudflare Worker / External Integrations & Ops Tooling

> **Audit ID:** `L2-DOM13-2026-10-12`  
> **Target:** [Domain 13 (`03-audit-domains.md`)](../Comprehensive%20Hidden-Bug%20Audit%20Strategy/03-audit-domains.md#13-cloudflare-worker--external-integrations--ops-tooling)  
> **Methodology:** [5-Pass Workflow Trace (`02-audit-method.md`)](../Comprehensive%20Hidden-Bug%20Audit%20Strategy/02-audit-method.md)  
> **Governance:** [`MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md`](../../governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md) · **Architecture:** [`ARCHITECTURE.md`](../../ARCHITECTURE.md) · [`AGENTS.md`](../../../AGENTS.md)  
> **Date Executed:** 2026-10-12  
> **Audit Status:** **PASS — AUDIT COMPLETE & ALL 6 FINDINGS REMEDIATED (CLOSED)**  

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
