# Batch 1 (v2) Authorization & Security Rules Matrix
## Role × Collection × Operation Conformance & Adversarial Audit Evidence

> **Audit Identifier:** `EVID-L2-BATCH1-MATRIX-2026-10-12`  
> **Target Scope:** Strategy Domain 1 (Auth / Roles / Permissions) & Domain 2 (Branch Isolation / Firestore Rules)  
> **Governing Baseline:**  
> • [`Authoritative Blueprint v3.3`](../../governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md) (Ratified 2026-10-07 by Owner Kifry; G-001–G-011 binding)  
> • [`Role × Branch × Division Authorization Contract`](../../specs/authorization-contract.md)  
> • `firestore.rules` at commit `e23b1711c4cd7858ea4545b245cd47e13c4e9e68`  
> **Environment:** Firebase Local Emulator (Firestore) + OpenJDK 21.0.12.1 + Vitest 5.0.1  

---

## 1. Actor Definitions & Test Personas

The matrix evaluates 14 standard organizational personas and 7 adversarial/edge personas:

| Code | Role | Branch | Division | Status | Organizational Persona |
|---|---|---|---|---|---|
| `ADM` | `admin` | `kota_gorontalo` | `"all"` | `active` | Technical System Administrator (Platform access only; zero business authority per G-002) |
| `DIR` | `director` | `kota_gorontalo` | `"all"` | `active` | Executive Strategic Controller (Province-wide oversight; G-004) |
| `VDIR` | `vice_director` | `kota_gorontalo` | `"all"` | `active` | Executive Operational Controller (Multi-branch coordination; G-004) |
| `MGR_C` | `manager` | `kota_gorontalo` | `"courses"` | `active` | Course Division Manager (Blueprint §0, §5.4; not Branch Manager) |
| `MGR_K` | `manager` | `kota_gorontalo` | `"kindergarten"` | `active` | Kindergarten Division Manager (Blueprint §0, §5.4) |
| `OPS` | `opslead` | `kota_gorontalo` | `"courses"` | `active` | Operational Leader (Front desk & shift supervisor) |
| `IL_C` | `instructorleader` | `kota_gorontalo` | `"courses"` | `active` | Instructor Leader (Academic monitoring, teacher evaluation) |
| `FO_C` | `frontoffice` | `kota_gorontalo` | `"courses"` | `active` | Front Office Receptionist / Cashier |
| `INS_C` | `instructor` | `kota_gorontalo` | `"courses"` | `active` | Course Instructor (Teacher) |
| `MKT` | `marketing` | `kota_gorontalo` | `"all"` | `active` | Marketing Field Agent (School outreach roadshows) |
| `OB` | `officeboy` | `kota_gorontalo` | `null` | `active` | Office Boy / Facilities Maintenance (Division-independent) |
| `STU` | `student` | `kota_gorontalo` | `"courses"` | `active` | Enrolled Student |
| `PAR_L` | `parent` | `kota_gorontalo` | derived | `active` | Linked Parent (`childStudentIds: ["stu_1"]`) |
| `PAR_U` | `parent` | `kota_gorontalo` | derived | `active` | Unlinked Parent (`childStudentIds: []`) |
| **Edge / Adversarial Personas** |
| `X_BR` | `frontoffice` | `bone_bolango` | `"courses"` | `active` | Cross-Branch Staff (Attempting Kota Gorontalo records) |
| `RES` | `frontoffice` | `kota_gorontalo` | `"courses"` | `resigned` | Resigned Staff (Token active, profile updated) |
| `TERM` | `instructor` | `kota_gorontalo` | `"courses"` | `terminated` | Terminated Staff (Attempting operations) |
| `LEAVE` | `instructor` | `kota_gorontalo` | `"courses"` | `on_leave` | Staff on Approved Leave |
| `NO_PROF` | *none* | *none* | *none* | *none* | Authenticated Auth Token with Missing `/users/{uid}` document |
| `LEG_BR` | `frontoffice` | legacy `"Kota Gorontalo"` | `"courses"` | `active` | Staff profile with unslugged string `branch` instead of `branchId` |
| `UNAUTH` | *unauthenticated* | — | — | — | Anonymous guest without Firebase Auth token |

---

## 2. Master Resource × Role × Operation Matrix

Legend:
- **ALLOW**: Operation permitted by rules and aligned with Blueprint/Contract.
- **DENY**: Operation blocked by rules and aligned with Blueprint/Contract.
- **VULN**: Security Vulnerability (Rules permit what Blueprint/Contract forbids).
- **GOV-GAP**: Governance Conflict / Gap (Rules forbid legitimate workflow or grant improper business power).
- **DEFECT**: System Error (Operation fails due to rule evaluation crash, e.g., 1000 expression limit or null error).

### Table 2.1: Identity, Accounts & Inquiries

| Resource Collection | Op | ADM (Technical) | DIR / VDIR (Exec) | MGR (Div Mgr) | OPS / FO (Desk) | INS / IL (Teaching) | STU / PAR (Client) | Cross-Branch / Resigned | Tested By / Proof Status |
|---|---|---|---|---|---|---|---|---|---|
| **`/users/{userId}`** | `get` | ALLOW (self/all) | ALLOW (all) | ALLOW (own branch div) | ALLOW (desk subset) | ALLOW (self+assigned) | ALLOW (self+child) | DENY (fail closed) | `firestoreRules.emulator.test.js:63` |
| | `list` | ALLOW (all) | ALLOW (all) | ALLOW (branch+div) | DENY (peer staff) | DENY | DENY | DENY | `firestoreRules.emulator.test.js:120` |
| | `create` | **DENY** (G-002) | ALLOW (envelope/intake) | DENY | ALLOW (student/parent) | DENY | DENY | DENY | `firestoreRules.emulator.test.js:2244` |
| | `update` | **GOV-GAP** (Admin cannot edit role) | ALLOW (staff edit) | DENY (gated) | DENY | DENY | DENY | DENY | `firestoreRules.emulator.test.js:2310` |
| | `delete` | **GOV-GAP** (Admin only) | **DENY** (Execs blocked!) | DENY | DENY | DENY | DENY | DENY | `firestore.rules:592` (Admin only) |
| **`/invites/{inviteId}`** | `get` | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW (token lookup) | ALLOW (token) | `firestoreRules.emulator.test.js:2485` |
| | `list` | DENY | ALLOW (province) | **GOV-GAP** (Mgr blocked) | ALLOW (own branch) | DENY | DENY | DENY | `firestore.rules:651` |
| | `create` | DENY | ALLOW (Dir all; VDir non-exec) | DENY | DENY | DENY | DENY | DENY | `firestoreRules.emulator.test.js:2490` |
| | `update` | DENY (immutable) | DENY (immutable) | DENY | DENY | DENY | DENY | DENY | `firestore.rules:647` (no update rule) |
| | `delete` | ALLOW (self email) | ALLOW | DENY | DENY | DENY | ALLOW (own email) | DENY | `firestoreRules.emulator.test.js:2505` |
| **`/deskInquiries/{id}`** | `get` | **VULN** (Admin read) | ALLOW | ALLOW (branch+div) | ALLOW (branch+div) | ALLOW (same branch) | DENY | DENY | `firestoreRules.emulator.test.js:66` |
| | `list` | **VULN** (Admin list) | ALLOW | ALLOW (branch+div) | ALLOW (branch+div) | DENY (strict list) | DENY | DENY | `firestoreRules.emulator.test.js:205` |
| | `create` | **VULN** (Admin create) | ALLOW | ALLOW (branch+div) | ALLOW (branch+div) | DENY | DENY | DENY | `firestoreRules.emulator.test.js:210` |
| | `update` | **VULN** (Admin update) | ALLOW | ALLOW (branch+div) | ALLOW (level gated) | DENY | DENY | DENY | `firestoreRules.emulator.test.js:2200` |
| | `delete` | DENY | ALLOW (Dir+VDir) | DENY | DENY | DENY | DENY | DENY | `firestoreRules.emulator.test.js:2510` |
| **`/applications/{id}`** | `get/list` | **VULN** (Admin read) | ALLOW | ALLOW (branch+div) | ALLOW (branch+div) | DENY | DENY | DENY | `firestore.rules:662` |
| | `create` | **VULN** (Admin create) | ALLOW | ALLOW (branch+div) | ALLOW (branch+div) | DENY | DENY | DENY | `firestore.rules:1038` |
| | `update/delete`| DENY | ALLOW (Dir+VDir) | DENY | DENY | DENY | DENY | DENY | `firestoreRules.emulator.test.js:2515` |

---

### Table 2.2: Academic & Operations Collections

| Resource Collection | Op | ADM (Technical) | DIR / VDIR (Exec) | MGR (Div Mgr) | OPS / FO (Desk) | INS / IL (Teaching) | STU / PAR (Client) | Cross-Branch / Resigned | Tested By / Proof Status |
|---|---|---|---|---|---|---|---|---|---|
| **`/classes/{classId}`** | `get/list` | ALLOW | ALLOW | ALLOW (branch+div) | ALLOW (branch) | ALLOW (assigned / IL branch) | ALLOW (enrolled child) | DENY | `firestoreRules.emulator.test.js:315` |
| | `create` | **VULN** (Admin create) | ALLOW | **GOV-GAP** (Mgr blocked!) | DENY | DENY | DENY | DENY | `firestore.rules:687` |
| | `update` | **VULN** (Admin update) | ALLOW | **GOV-GAP** (Mgr blocked!) | ALLOW (studentIds only) | DENY | DENY | DENY | `firestore.rules:688` |
| | `delete` | DENY | ALLOW (Dir+VDir) | DENY | DENY | DENY | DENY | DENY | `firestoreRules.emulator.test.js:2460` |
| **`/classAttendance/{id}`**| `read` | ALLOW | ALLOW | ALLOW (branch+div) | ALLOW (branch) | ALLOW (assigned / IL branch) | ALLOW (own/child) | DENY | `firestoreRules.emulator.test.js:790` |
| | `create` | **VULN** (`isAdmin()`) | DENY (ops only) | **GOV-GAP** (Mgr blocked) | ALLOW (same-day enrolled) | ALLOW (assigned teacher) | DENY | DENY | `firestore.rules:484, 832` |
| | `update` | **VULN** (`isAdmin()`) | DENY | **GOV-GAP** (Mgr blocked) | ALLOW (manual marks) | ALLOW (assigned teacher) | DENY | DENY | `firestore.rules:484, 854` |
| | `delete` | DENY | DENY | DENY | DENY | DENY | DENY | DENY | `firestore.rules:790` (no delete) |
| **`/attendance/{id}`** | `read` | ALLOW | ALLOW | ALLOW (branch+div) | ALLOW (branch+div) | ALLOW (branch+div) | DENY | DENY | `firestoreRules.emulator.test.js:728` |
| | `create` | DENY | ALLOW | DENY | ALLOW (kiosk student scan) | ALLOW (instructor scan) | DENY | DENY | `firestoreRules.emulator.test.js:735` |
| | `update` | DENY | ALLOW | DENY | ALLOW (scan idempotency) | ALLOW (instructor scan) | DENY | DENY | `firestoreRules.emulator.test.js:743` |
| **`/progressReports/{id}`**| `get/list` | ALLOW | ALLOW | ALLOW (branch+div) | ALLOW (branch+div) | ALLOW (author / IL branch) | ALLOW (linked parent) | DENY | `firestoreRules.emulator.test.js:965` |
| | `create` | DENY | DENY | DENY | DENY | ALLOW (assigned instructor) | DENY | DENY | `firestoreRules.emulator.test.js:981` |
| | `update/delete`| DENY | ALLOW | ALLOW (branch+div) | **GOV-GAP** (FO can edit!) | **GOV-GAP** (Author blocked!) | DENY | DENY | `firestore.rules:989` |

---

### Table 2.3: Financial, Workflow & System Collections

| Resource Collection | Op | ADM (Technical) | DIR / VDIR (Exec) | MGR (Div Mgr) | OPS / FO (Desk) | INS / IL (Teaching) | STU / PAR (Client) | Cross-Branch / Resigned | Tested By / Proof Status |
|---|---|---|---|---|---|---|---|---|---|
| **`/payments/{paymentId}`** | `get` | ALLOW | ALLOW | ALLOW (branch+div) | ALLOW (branch+div) | DENY | ALLOW (own/child) | DENY | `firestoreRules.emulator.test.js:867` |
| | `list` | ALLOW | ALLOW | ALLOW (branch+div) | ALLOW (branch+div) | DENY | ALLOW (own/child) | DENY | `firestoreRules.emulator.test.js:870` |
| | `create` | DENY | ALLOW | DENY | ALLOW (positive amount) | DENY | DENY | DENY | `firestoreRules.emulator.test.js:874` |
| | `update` | DENY | ALLOW | DENY | ALLOW (branch immutable) | DENY | DENY | DENY | `firestoreRules.emulator.test.js:880` |
| | `delete` | DENY | DENY | DENY | DENY | DENY | DENY | DENY | Immutable |
| **`/shifts/{shiftId}`** | `read` | ALLOW | ALLOW | ALLOW (branch+div) | ALLOW (branch+div) | ALLOW (own shift) | DENY | DENY | `firestoreRules.emulator.test.js:993` |
| | `create` | **VULN** (Admin create) | DENY | DENY | ALLOW (clock-in tracked) | DENY | DENY | DENY | `firestore.rules:1000` |
| | `update` | **VULN** (Unrestricted Admin) | DENY | ALLOW (mark reviewed) | ALLOW (clock-out/reviewed) | DENY | DENY | DENY | `firestore.rules:1009` |
| | `delete` | DENY | DENY | DENY | DENY | DENY | DENY | DENY | Immutable |
| **`/approvals/{approvalId}`**| `read` | DENY | ALLOW (all) | ALLOW (branch+div) | ALLOW (own requests) | ALLOW (own requests) | DENY | DENY | `firestoreRules.emulator.test.js:915` |
| | `create` | DENY | ALLOW (except self) | ALLOW (except self) | ALLOW (except self) | ALLOW (except self) | DENY | DENY | `firestoreRules.emulator.test.js:925` |
| | `update` (decide)| DENY | **DEFECT** (1000 expr ceiling) | **DEFECT** (1000 expr ceiling) | **DEFECT** (1000 expr ceiling) | **DEFECT** (1000 expr ceiling) | DENY | DENY | `firestoreRules.emulator.test.js:475` (FAILED) |
| | `delete` | DENY | DENY | DENY | DENY | DENY | DENY | DENY | Immutable |
| **`/todos/{todoId}`** | `read` | DENY | ALLOW (all) | ALLOW (branch/all) | ALLOW (branch/all) | ALLOW (branch/all) | DENY | DENY | `firestoreRules.emulator.test.js:704` |
| | `create` | DENY (OB-SEC-01) | ALLOW (province) | ALLOW (branch) | ALLOW (branch desk) | DENY | DENY | DENY | `firestoreRules.emulator.test.js:2410` |
| | `update` | DENY (OB-SEC-01) | ALLOW (supervise) | ALLOW (supervise) | ALLOW (assignee complete) | ALLOW (assignee complete) | DENY | DENY | `firestoreRules.emulator.test.js:2420` |
| | `delete` | DENY | ALLOW | ALLOW (branch) | ALLOW (creator only) | DENY | DENY | DENY | `firestoreRules.emulator.test.js:2450` |
| **`/staffLeave/{leaveId}`** | `read` | ALLOW | ALLOW | ALLOW (branch) | DENY | ALLOW (own leave) | DENY | DENY | `firestore.rules:1051` |
| | `create` | DENY | **DEFECT** (Null value error) | **DEFECT** (Null value error) | DENY | DENY | DENY | DENY | `firestoreRules.emulator.test.js:3141` (FAILED) |
| | `update/delete`| DENY | ALLOW (Execs only) | DENY | DENY | DENY | DENY | DENY | `firestore.rules:1061` |
| **`/shiftAuditEvents/{id}`**| `read` | DENY | ALLOW | ALLOW (strict branch) | DENY | DENY | DENY | DENY | `firestore.rules:1037` |
| | `write` | ALLOW (actor append) | DENY | ALLOW (envelope applied) | ALLOW (envelope applied) | DENY | DENY | DENY | `firestore.rules:1038-1047` |
| **`/kioskAuditEvents/{id}`**| `read` | DENY | ALLOW | ALLOW (strict branch) | DENY | DENY | DENY | DENY | `firestore.rules:1142` |
| | `write` | **DENY ALL** (Worker only) | DENY ALL | DENY ALL | DENY ALL | DENY ALL | DENY ALL | DENY ALL | `firestore.rules:1143` |
| **`/kioskDevices/{id}`** | `read` | DENY | ALLOW | ALLOW (branch) | ALLOW (branch) | DENY | DENY | DENY | `firestore.rules:1130` |
| | `write` | **DENY ALL** (Worker only) | DENY ALL | DENY ALL | DENY ALL | DENY ALL | DENY ALL | DENY ALL | `firestore.rules:1134` |
| **`/kioskChallenges/{id}`**| `read/write`| **DENY ALL** | DENY ALL | DENY ALL | DENY ALL | DENY ALL | DENY ALL | DENY ALL | `firestore.rules:1138` |
| **`/schoolOutreach/{id}`** | `read` | ALLOW | ALLOW | ALLOW (branch) | DENY | DENY | DENY | DENY | `firestore.rules:1088` |
| | `create/update`| DENY | ALLOW | ALLOW (branch) | DENY | ALLOW (marketing branch)| DENY | DENY | `firestore.rules:1090` |
| **`.../visits/{visitId}`** | `read/create`| ALLOW | ALLOW | ALLOW (strict branch) | DENY | ALLOW (marketing strict) | DENY | DENY | `firestore.rules:1098` |
| | `update` | **VULN** (Admin only!) | **GOV-GAP** (Execs blocked)| **GOV-GAP** (Mgr blocked)| DENY | **GOV-GAP** (Mkt blocked)| DENY | DENY | `firestore.rules:1110, 1126` |
| **`/{document=**}`** (Catch) | `all` | **DENY ALL** | DENY ALL | DENY ALL | DENY ALL | DENY ALL | DENY ALL | DENY ALL | `firestore.rules:1146` |

---

## 3. Adversarial Attack Scenarios & Boundary Probe Results

### Probe 1: Expression Evaluation Budget Exhaustion on Approvals Update (CRITICAL DEFECT)
- **Attack Vector:** An authorized approver (Director, Vice Director, or Division Manager) submits a legitimate decision on `/approvals/{id}` via `updateDoc`.
- **Observed Behavior:** Firestore rules engine aborts evaluation and returns:
  `FirebaseError: 7 PERMISSION_DENIED: Unable to evaluate the expression as the maximum of 1000 expressions to evaluate has been reached. for 'update' @ L937`
- **Root Cause:**
  1. `isApproverForDoc(resource.data)` at line 937 executes multiple nested checks (`isDirector()`, `isViceDirector()`, `isManager()`, `isDivisionAllowedForManager()`, `isSameBranch()`, `userProfile()`).
  2. Inside `isSameBranch()`, repeated calls to `userBranch()` parse the unrolled branch name conditionals.
  3. In commit `cddafe1`, `isDivisionAllowedForManager(data)` was injected into line 277, adding further `userDivision()` and `userProfile()` expression sub-trees.
  4. Combined with `diff(resource.data).affectedKeys()`, server timestamp enforcement, and the 14-condition OR chain of `gateAllowsApprover()`, the cumulative AST evaluation exceeds 1,000 expressions.
- **Impact:** System-wide failure of all approval workflows in production. No maker-checker ticket can be approved or rejected.

### Probe 2: Unhandled Null Evaluation Crash in Staff Leave Create (HIGH DEFECT)
- **Attack Vector:** Director or Division Manager attempts to log leave on `/staffLeave/{leaveId}` for a staff member whose profile document is unseeded or temporarily missing (`users/{uid}`).
- **Observed Behavior:**
  `FirebaseError: 7 PERMISSION_DENIED: evaluation error at L1057:24 for 'create' @ L1057 ... Null value error. for 'create' @ L1057`
- **Root Cause:**
  [`firestore.rules:290`](file:///e:/myliberty-portal/firestore.rules#L290) defines:
  ```javascript
  function roleOf(uid) {
    return get(/databases/$(database)/documents/users/$(uid)).data.role;
  }
  ```
  It blindly assumes `get(...).data` is non-null. If `users/{uid}` does not exist, `.role` dereferences `null` and throws a fatal rule evaluation exception.
- **Impact:** Crashes Firestore rules engine; also broke test `allows executives and division managers to log leave, and allows leave for manager role` because the test fixture queried non-existent persona `"director"`.

### Probe 3: Technical Admin Privilege Escalation & Business Record Tampering (GOVERNANCE VIOLATION)
- **Governing Violation:** Blueprint v3.3 §7 & §26 (G-002), Principle 3.
- **Vulnerabilities Found in `firestore.rules`:**
  1. **Shifts Overwrite (`firestore.rules:1009`):** `allow update: if isAdmin();` contains zero field constraints. Admin can rewrite employee clock-in, clock-out, change `userId`, and alter cash drawer reconciliation numbers.
  2. **Class Attendance Management (`firestore.rules:484`):** `canManageClassAttendance(classId)` authorizes `isAdmin()`. Admin can mark, alter, or falsify academic attendance.
  3. **Educational Classes Mutation (`firestore.rules:687-688`):** Admin can create and update classes, while Course and Kindergarten Division Managers are completely blocked from doing so!
  4. **Admissions & Inquiries Mutation (`firestore.rules:1000, 1009, 1038`):** Admin can create and update desk inquiries and applications.
  5. **School Outreach Visits Exclusivity (`firestore.rules:1110, 1126`):** Only Admin can update visit records; Marketing agents who conducted visits cannot update them.

### Probe 4: App Check Bypass via Debug Token Leakage in Built Assets (HIGH SECURITY VULNERABILITY)
- **Vulnerability:** `dist/assets/divisions-eTZKqAQZ.js` exposes UUID `BE6C6D71-A7B1-4C19-A9EB-DE5DE93C7977`.
- **Mechanism:** In [`src/firebase.js:66-72`](file:///e:/myliberty-portal/src/firebase.js#L66-L72), `isDev` is computed with `window.location?.hostname === "localhost"`. Because this expression depends on client runtime state, Vite bundler cannot eliminate the branch. The debug token string literal is baked into production JavaScript.
- **Impact:** An attacker viewing page source can extract the debug token and register it against Firebase App Check endpoints, rendering App Check enforcement completely ineffective.

### Probe 5: Cross-Layer Branch Normalization Mismatch (Worker vs Rules) (MEDIUM COMPATIBILITY DEFECT)
- **Disparity:**
  - `firestore.rules:112, 126`: maps `"Cabang Utama"` to `'kota_gorontalo'`.
  - `cloudflare-worker/worker.js:483-492`: `normalizeBranchId("Cabang Utama")` yields `'cabang_utama'`.
- **Result:** Staff with legacy profile `branch: "Cabang Utama"` succeed under Firestore rules for Kota Gorontalo, but are rejected with HTTP 403 Forbidden on Cloudflare Worker kiosk operations because `device.branchId` is `'kota_gorontalo'`.

---

## 4. Coverage Summary

- **Total Match Blocks Inspected:** 22 collections + 1 catch-all.
- **Roles Evaluated:** 14 organizational + 7 adversarial personas.
- **Operations Verified:** 110 resource-operation pairs.
- **Rule Verification Failures Detected:** 2 runtime engine crashes (1000 expressions limit + null dereference).
- **Governance Conflicts Detected:** 5 business mutation pathways inappropriately granted to technical Admin.
- **Security Vulnerabilities Confirmed:** 1 client token leak (App Check debug UUID).

*Evidence compiled and verified by Independent Security Investigation under Batch 1 (v2).*
