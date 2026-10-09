# Corrected Amendment Set — Marketing Dashboard Phase 0 Conformance Audit

> **Document Type:** Audit instruction amendment (procedural, non-authoritative)
> **Status:** Ready for owner review
> **Date:** 2026-10-09
> **Applies to:** the Marketing Dashboard Phase 0 audit brief, and supersedes the earlier
> "Mandatory Amendments" set it was derived from.
> **Authority Level:** Procedural instructions only. This document does not grant, remove, or
> reinterpret any permission, does not amend the Authoritative Blueprint, and does not amend
> `docs/ARCHITECTURE.md`.

## How to use this document

**Precondition — read both documents.** This amendment set is **not self-contained**. It
modifies a base brief that is recorded in this repository at:

> [`2026-10-09-marketing-dashboard-phase0-brief.md`](./2026-10-09-marketing-dashboard-phase0-brief.md)

That base brief defines the mission, Objectives A–G, and Deliverables 1–8. **Those are
owner-defined scope.** An executor must not synthesize, substitute, or re-derive them — not
from sibling dashboard reports, not from the Level 2/3 audit playbooks in `docs/audits/`, and
not from "standard" practice. If the base brief is missing, unreadable, or judged insufficient,
**stop and raise it with the owner** rather than authoring scope.

This is a **drop-in replacement** for the following parts of that base brief:

| Original part | Replaced by |
|---|---|
| §2 "Authoritative governance" baseline instruction | Amendment 1 |
| §3-C (schoolOutreach deletion finding) | Amendment 2 (2A–2F) |
| §4-1 (single readiness verdict) | Amendment 4 |
| §5 acceptance conditions | "Acceptance conditions" section below |

Everything else in the original brief — roles, mission, audit objectives A–G, deliverables
2–8, the mandatory audit principles, and the Phase 0 prohibition on implementation — stands
unchanged and is **not** superseded by this document.

Amendments that changed behaviour versus the earlier amendment set are marked
**[CORRECTED]**, **[ADDED]**, or **[RESTORED]**. Verified facts are marked **Verified** and
carry file/line evidence.

---

## §0. Verified baseline at HEAD `9dcb868` (2026-10-09)

Recorded so the executor does not re-derive it. **Re-verify at the current HEAD before
relying on any of it**; if the repository has moved, treat these as historical.

**Governance**
- **Verified** Canonical blueprint: `docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md`,
  **Version 3.3, Status: RATIFIED AUTHORITATIVE BASELINE — APPROVED BY OWNER (KIFRY),
  Date 2026-10-07** (lines 3–5).
- **Verified** `docs/decisions/` holds 5 accepted decisions, latest dated 2026-10-07, plus a
  README.
- **Verified** A second register of owner decisions exists **outside** `docs/decisions/`:
  `docs/reports/instructor-leader-dashboard/owner-decisions.md`. It contains **two
  differently-statused groups**, and they must not be conflated:
  - **Ratified and implemented:** `OD-IL-ENF1`–`OD-IL-ENF4`, ratified and implemented
    2026-10-09 (`:271-272`). These are **binding** and may be cited as accepted authorization.
  - **NOT ratified:** `OD-IL1`–`OD-IL5` (Part B). Every one of them carries an empty
    `**Answer (Kifry fills in):**` (`:305`, `:312`, `:319`, `:326`, `:333`), and the register
    header states `**Status:** PENDING OWNER (KIFRY) REVIEW` (`:8`). **These are pending
    proposals, not decisions.** They must not be cited as authorization, used to resolve a
    governance gap, or treated as approved scope.
  - **Verified, for the same reason:** the register's own cross-cutting origin is audit-ledger
    finding **H5**, recorded in `docs/audits/audit-log.md` as *still open* and *"open for
    debate, not decided here"* (`:6`).

  **Consequence:** any audit that reads only `docs/decisions/` will miss ratified cross-cutting
  decisions; any audit that skims `owner-decisions.md` and assumes the whole file is ratified
  will **invent governance from proposals**. Check the status of each entry individually.

**Blueprint requirements directly relevant to this audit**
- **Verified** §7.3 (`docs/governance/...:731-745`): System Admin does not automatically become
  Director, Vice Director, Division Manager, Operational Leader, Instructor Leader, or any
  finance/academic/organizational approval authority.
- **Verified** §7.4 (`...:747-762`): System Admin must not bypass an organizational approval
  chain, alter protected business records merely because the system permits technical access,
  silently rewrite or erase audit history, impersonate a role, create organizational authority
  by editing technical configuration, or create a hidden self-privilege-escalation path.
- **Verified** §26 **G-002 is RESOLVED** (`...:1350`): System Admin appointment and revocation
  are **exclusively by the Director**; System Admin is strictly technical maintenance with
  **zero business or operational approval authority**.

  > **Consequence for this audit:** whether technical Admin *may* hold business authority is
  > **already answered — no.** Do not raise "Owner Decision Required" to ask that question.
  > Restrict Owner Decision flags to genuinely open matters (who should hold the authority
  > instead, retention policy, and remediation sequencing).

**Test tooling**
- **Verified** `package.json:11` defines `test:rules`; `package.json:10` defines `test`.
- **Verified** `npm test` deliberately skips the emulator suite; `test:rules` is the real
  authorization suite (`.github/workflows/firestore-rules.yml:5-8`).
- **Verified** `.github/workflows/firestore-rules.yml:57` runs, via
  `npx --yes firebase-tools@15.32.0`, the emulator suite
  `src/features/shared/firestoreRules.emulator.test.js` (2,146 lines, 106 tests).
- **Verified** A global `firebase` 15.32.0 is installed and resolvable on this machine —
  the same version the workflow pins. Java 21 (Temurin) is present.
- **Verified by execution** (see "Amendment 5"): **106/106 passed**, ~18 s, exit 0, on
  HEAD `9dcb868`. This independently reproduces the `106/106` claimed in
  `docs/reports/instructor-leader-dashboard/owner-decisions.md:293`.
- **Verified** Mirror module: `src/features/shared/securityRulesMatrix/` (helpers + 5 suites),
  which duplicates rules logic in JS and is asserted against the rules.

**Deployment**
- **Verified** `.firebaserc` default project: `mylibertyies-f2f38`. `firebase.json` maps
  `firestore.rules` and `firestore.indexes.json`.
- **Verified** CI deploys **hosting only**
  (`firebase-hosting-merge.yml`, `firebase-hosting-pull-request.yml`). The rules workflow is
  emulator-only and **deliberately not release-gating** (its own comment, lines 10–13).
  **No automated pipeline deploys `firestore.rules`.**
- **Verified** HEAD `9dcb868` (2026-10-09 08:13 +0800) is the last commit touching
  `firestore.rules`; the working tree for that file is clean.
- **Verified** `docs/reports/instructor-leader-dashboard/owner-decisions.md:294` records the
  OD-IL-ENF4 rules changes as **"Not deployed."**

---

## Amendment 1 — Canonical baseline and root pointer files **[CORRECTED]**

Replaces §2 "Authoritative governance" as the initial baseline instruction.

### 1.1 Read-only baseline

Establish the governance and architecture baseline from exactly two documents:

1. `docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md`
2. `docs/ARCHITECTURE.md`

Do not use any other copy of these documents for authority.

### 1.2 Determine each root file's nature before classifying it **[CORRECTED]**

The earlier amendment set instructed the executor to treat both root-level files as "stale
duplicates" and to report each as documentation drift. **That premise is false and must not be
applied.** Both are deliberate *pointer stubs*:

- **Verified** `ARCHITECTURE.md` (root, 1,458 bytes vs 26,711 canonical) opens with
  `> **DO NOT EDIT** – This file is a pointer to the canonical architecture guide. All edits
  must be made in `docs/ARCHITECTURE.md``.
- **Verified** `MYLIBERTY-AUTHORITATIVE-BLUEPRINT-v3.md` (root, 2,478 bytes vs 75,681
  canonical) declares `> **CANONICAL POINTER** — This file is a root pointer to the canonical
  Authoritative Governance Blueprint`, and points correctly to `docs/governance/`.

**Required method.** For each root file, determine and record which of these it is, with
evidence:

- a compliant pointer stub;
- a lossy summary stub;
- a divergent or stale duplicate.

A **compliant pointer is not a finding.** Report it as `INFO` at most, or state explicitly that
it was examined and judged correct. Do not manufacture a drift finding against a file whose
declared purpose is to point at the canonical document.

### 1.3 The defect that does exist in a root file **[CORRECTED]**

- **Verified** The root blueprint stub's header reads:
  `**Baseline Version:** 3.3`, `**Status:** PROPOSED AUTHORITATIVE BASELINE FOR OWNER APPROVAL`,
  `**Date:** 2026-10-07` (lines 3–5).
- **Verified** The canonical document reads: Version 3.3, `RATIFIED AUTHORITATIVE BASELINE —
  APPROVED BY OWNER (KIFRY)`, Date 2026-10-07.

Same version, same date, **contradictory ratification status**.

Assess and report:

- the exact file path and the conflicting lines;
- how the status string conflicts with the canonical document;
- whether it could mislead a future developer or auditor (in particular: into treating a
  ratified, binding blueprint as an unratified proposal), and
- the additional hazard that the stub carries a **lossy 5-invariant summary** under an
  authoritative-looking header, which omits §26 open decisions and the full authority matrix
  and could be mistaken for the complete rule set.

Recommended disposition (report only; do not apply): align the stub's status line with the
canonical status, or remove the status/version fields from the stub and label the summary
explicitly as non-authoritative. State whether an owner decision is required.

### 1.4 Version/status discrepancy sweep

Retain the original §2 requirement: if the blueprint's version, status, or date differs from
any version referenced in existing project instructions (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`,
`CODEX.md`, `README.md`, `docs/audits/`, `docs/reports/`), report the discrepancy and identify
which instructions may be outdated.

### 1.5 Prohibition

Do not modify either root file, the canonical blueprint, or `docs/ARCHITECTURE.md` during
Phase 0.

---

## Amendment 2 — Repository-wide authorization drift

Replaces §3-C entirely. §3-C's narrow "schoolOutreach deletion" framing is insufficient:
`schoolOutreach` is one instance of a repository-wide pattern, and the dominant vector is not
`isAdmin()` directly but predicates that *contain* admin.

### 2.0 Scope, framing, and effort model **[CORRECTED]**

**Framing, stated honestly.** The base brief is titled *Marketing Dashboard* Phase 0, but
Amendments 2A–2B are **repository-wide**. That mismatch is real and is resolved here explicitly
rather than by quietly shrinking the audit:

> **2A–2B are a named dependency of the Marketing audit, not an expansion of it.** The predicate
> that governs Marketing's own reads and writes (`isExecutive()`, `firestore.rules:42-44`) is a
> single shared helper. The Marketing boundary **cannot** be characterized, and the resulting
> remediation **cannot** be sized, without knowing every place that helper grants technical
> Admin business authority. A Marketing-only slice would produce a Marketing-only fix that
> leaves the predicate intact.

**Why the scope is not optional, and why it is cheaper than it looks.** Split the work by
**verification depth**, not by enumeration scope:

| Depth | Scope | Cost |
|---|---|---|
| **D1 — Enumerate every path** | All `isAdmin()` grants and all `isExecutive()`-family call sites, one row each in the appendix table | **Mandatory and cheap.** The enumeration is mechanical: the call sites are already enumerable by grep, and most non-Marketing rows resolve to a single line via the technical/business class test in 2A (`kioskDevices`, `kioskChallenges`, `kioskAuditEvents`, `errorLogs` → technical/residual, INFO). |
| **D2 — Verify empirically** | Marketing-touched collections (`applications`, `classes`, `deskInquiries`, `schoolOutreach` + `visits`, `invites`, `users`) **plus** any path whose plausible impact is CRITICAL (financial or admissions records) | The genuinely expensive part. Bounded to a subset. |
| **D3 — Remaining empirical tests** | All other enumerated paths | **Deferred to Phase 1**, named explicitly in the report rather than silently omitted. |

D1 is not reducible: a remediation decision ("change the predicate" vs. "amend thirty rules")
is unanswerable from a partial list, and partial remediation creates the illusion of a fix.
D2 is where effort should be controlled, and D3 is where deferral belongs.

**If the owner wishes to sever the repository-wide portion**, that is a legitimate scope call —
but it must be an explicit owner decision recorded against this amendment, and the report must
then state plainly which paths were left unenumerated and what that prevents concluding. Do not
narrow the enumeration unilaterally.

### 2A. Every Admin-reachable business-record mutation **[CORRECTED] [RESTORED]**

**Method.** Enumerate **both** of these independently:

1. **Direct** grants: every rule whose predicate references `isAdmin()`.
2. **Indirect** grants: every rule whose predicate references any helper that transitively
   includes `isAdmin()`. Start from the definitions and expand:

   - **Verified** `isAdmin()` = `hasRole('admin')` (`firestore.rules:30-32`).
   - **Verified** `isExecutive()` = `isDirector() || isViceDirector() || isAdmin()`
     (`firestore.rules:42-44`).
   - **Verified** `isExecutive()` appears on **58 lines** of `firestore.rules`: the definition
     at `:42` plus **57 call sites**. Grepping `isAdmin` alone therefore **misses the majority
     of the exposure.**
   - Also expand any other helper that folds admin into a broader group, client-side or
     server-side.

   Do not stop at the two named helpers. Enumerate **every** predicate that includes admin.

**Per-occurrence reporting.** For each occurrence record: file; line; enclosing resource
(collection); operation (create / update / delete, or a read that exposes business data);
the full predicate including expanded helper definitions; whether it grants a technical
administrator business-record authority; the applicable canonical requirement; confirmation
status; severity; impact; direction; blocking status.

**Enumerate every rule individually.** Do not collapse distinct rules into one finding because
they share a helper. Grouping is permitted only when the rules are demonstrably the same
underlying defect **and** the grouping rationale is written out.

**Do not inflate.** Not every `isAdmin()` use is a violation. Apply this test and state the
result per occurrence:

| Class | Examples | Expected classification |
|---|---|---|
| **Technical / system resource** | user provisioning, invites, `errorLogs`, `kioskDevices`, `kioskChallenges`, `kioskAuditEvents`, system configuration | Residual technical authority. Assess against §7.2. Usually not a business-authority conflict — but still record it, and still check §7.4's "must not erase audit history" for log deletion. |
| **Business record** | `payments`, `attendance`, `classAttendance`, `classes`, `shifts`, `applications`, `deskInquiries`, `schoolOutreach` + `visits`, `corporateEvents`, `progressReports`, `staffLeave`, `users` with a business role | Requires an accepted governance basis. Absent one → **Governance Conflict** or **Owner Decision Required**. |

**Ordinary vs. executive branch — check separately.** Where a rule is
`isExecutive() || (business role && branch/field checks)`, the executive branch frequently
carries **no branch check and no field allow-list**, while the business-role branch carries
both. Assess whether that is authorized, and who is affected.

**[RESTORED] Mandatory accepted-decision check.** Before classifying **any** occurrence as a
conflict, search for an accepted authorization basis and cite it:

- `docs/decisions/**`
- `docs/reports/**/owner-decisions.md`  ← contains ratified decisions the earlier amendment set
  would not have searched
- `docs/audits/audit-log.md`, `docs/audits/current/**`, `docs/audits/archive/**`
- the emulator suite's `describe`/`it` titles, which encode owner-approved behaviour and dates

If an accepted decision authorizes the behaviour, cite it and classify accordingly — do not
report a conflict. If a decision authorizes part of a path, scope the finding to the
unauthorized remainder.

**Worked example of why this matters [Verified].** The `users` create rule contains an
invite-based self-registration branch (`firestore.rules:512-520`) that bypasses the
`NEW_STAFF_ACCOUNT` approval envelope. This *looks* like a workflow bypass. It is **not** a
finding: `docs/reports/instructor-leader-dashboard/owner-decisions.md:283` records, as part of
owner-ratified OD-IL-ENF4 (2026-10-09), that "the invite-based self-registration path is still
authorised by the invite rather than a ticket." Report it as **authorized, with citation**.

**No reassignment.** Do not transfer any permission to Marketing, another administrator, or a
senior leader. Where the correct business authority is not established, mark
**Owner Decision Required**.

### 2B. Every predicate folding Admin into a business-authority bucket **[CORRECTED]**

Enumerate each predicate independently, server-side **and** client-side, including:

- `isExecutive()` in `firestore.rules:42-44` — and all 57 call sites.
- **Verified** client mirror: `isExecutiveRole()` (`src/features/shared/roles.js:88-95`)
  returns true for `admin`.
- **Verified** client mirror: `isManagerRole()` (`src/features/shared/roles.js:131-137`)
  returns true for `manager` **and `admin`** — i.e. the client treats technical Admin as a
  manager. Assess against §7.3, which does not list admin as a Division Manager.
- **Verified** mirror module `src/features/shared/securityRulesMatrix/securityRulesMatrix.helpers.js`
  and `src/features/shared/approvalGates.js`.
- Leadership/approval predicates, generic business-writer helpers, role-group membership
  checks, compound rule expressions combining admin with business roles, and backend/Worker
  authorization helpers (`cloudflare-worker/worker.js`).

For each: exact definition; every relevant call site; included roles; business capabilities
thereby granted; applicable canonical requirement; classification (confirmed drift /
potential conflict / unresolved).

**Do not** fix this by renaming the predicate, relocating the same permission to another role,
or creating an equivalent path under a different name.

### 2C. Every surviving reference to a removed role **[CORRECTED]**

Search all authorization and implementation surfaces for roles the blueprint removed —
**`branch_manager`** and any equivalent legacy identifier.

**Search surfaces (expanded).** Rules and helpers; client role maps and permission helpers;
backend/Worker authorization; route guards; seeded accounts, fixtures and test identities;
compatibility/migration and role-normalization code; **and** governance/audit documentation
(`docs/audits/**`, `docs/decisions/**`, `docs/reports/**`) and **the test suite**, because
those surfaces encode removed-role authority as expected behaviour.

**Verified baseline occurrences** (confirm and extend; do not treat as exhaustive):

| Location | Nature |
|---|---|
| `firestore.rules:51` (`isManager()`) | accepts `branch_manager` |
| `firestore.rules:59` (`isStaff()`) | accepts `branch_manager`, `frontofficelead` |
| `firestore.rules:67`, `:75` | `frontofficelead` accepted by `isFrontOffice()` and `isOpsLead()` |
| `firestore.rules:204-206`, `:212-213` (`gateAllowsApprover`) | `branch_manager` is a permitted **approver** for `TUITION_PLAN_CHANGE`, `STUDENT_WITHDRAWAL_OR_FREEZE`, `CASH_DISCREPANCY`, `STAFF_SHIFT_SELF_CORRECTION`, `STAFF_STATUS_CHANGE` |
| `firestore.rules:219`, `:262` | `branch_manager` accepted as approval routing target / shift-correction approver |
| `src/features/shared/securityRulesMatrix/securityRulesMatrix.helpers.js:406-408`, `:414-431` | JS mirror of the same approver sets |
| `src/features/shared/securityRulesMatrix/operationalResources.test.js:452-453` | **asserts** `branch_manager` is a manager and is staff |
| `src/features/shared/roles.js:40` | normalizes `branch_manager` → `manager` |
| `docs/audits/audit-log.md:34-35` | describes Branch Manager as a live approval role; records an unratified assumption that `admin` "provisionally" fills the Owner/Director tier |

**Classification is mandatory per occurrence**, and the deliberate-compatibility question must
be assessed rather than assumed:

- **Verified** the code documents the `branch_manager` acceptance as *intentional* legacy-alias
  support (`firestore.rules:180-182`, `:198`; `securityRulesMatrix.helpers.js:396-397`;
  `roles.js:22-42`), so this is **not** accidental residue.
- The audit question therefore becomes: does "existing documents keep working" justify a
  **removed organizational role retaining approval authority** for five gates indefinitely,
  where the blueprint removed Branch Manager outright? Assess against Blueprint v3.1 §0/§5.5,
  AGENTS.md rules 7–9 and 11, and Principle 14. Report as governance drift; do **not**
  silently reassign the authority.
- Assess the interaction with **AGENTS.md rule 10**: normalizing `branch_manager` → `manager`
  yields a `manager` identity that may lack the branch+division binding that rule 10 requires
  of a Division Manager. Determine the actual effect; do not assert a vulnerability from the
  normalization alone.

**[ADDED] Provisioning loop — can a removed role still be created?** Residue in read
predicates is one problem; self-replenishing residue is another. Determine whether
`branch_manager` (or any removed role) can still be **assigned or minted** today, via:

- the invite path (`firestore.rules:576-588` create is `isExecutive()`-only);
- the client's allowed-role enum — **Verified** `src/schemas/inviteSchema.js:5-16`
  (`ALLOWED_STAFF_ROLES`) does **not** include `branch_manager` (so the client cannot mint one),
  while `invitesRepository.js:17` validates through `inviteSchema`;
- user create/update paths (`firestore.rules:497-540`);
- role dropdowns, seeds, fixtures, and dev presets.

Report whether existing documents are the *only* source of `branch_manager` identities.

Classify each residual reference as: Active authority / Compatibility logic / Test-or-seed
residue / Historical-only / Inert / Unverified. Distinguish an active authorization defect from
harmless history. **Do not delete historical records or rewrite past events to remove a role
name.**

### 2D. Deployed ruleset vs repository rules **[CORRECTED]**

Do not treat parity as merely unknown by default. There is **specific evidence that parity is
currently broken**, and the audit should test that hypothesis rather than pose a generic
question.

**Verified inputs to use:**

- No CI workflow deploys `firestore.rules`; only hosting is deployed automatically.
- `firestore.rules` was last changed in HEAD `9dcb868` (2026-10-09 08:13 +0800).
- `docs/reports/instructor-leader-dashboard/owner-decisions.md:294` states the OD-IL-ENF4 rules
  changes are **"Not deployed."**

**Required work:**

1. Determine, **per recent rules change**, whether it is present in the deployed ruleset —
   not a single global yes/no. At minimum, test the specific hypothesis that the OD-IL-ENF4
   changes (`isApprovedNewStaffAccount` and the `users` create gate) are absent from
   production.
2. Use verifiable evidence: an authorized **read-only** inspection of project
   `mylibertyies-f2f38`'s deployed rules (e.g. Firebase Console → Firestore → Rules, or an
   equivalent read-only API) compared against the repository file, which is at
   `git show HEAD:firestore.rules`.
3. Record: project target (no secrets); deployed ruleset version/identifier; repository commit
   and rules-file version examined; comparison method; differences.
4. Correlate the deployed ruleset's timestamp with the **last commit touching
   `firestore.rules`** — if the last rules commit postdates the last deployment, parity is
   provably broken and should be reported as such rather than as unverified.

**Do not deploy rules, modify production configuration, or perform unauthorized production
access.** A successful local test, or a clean `git diff`, is **not** evidence of parity.

**If parity cannot be inspected or compared reliably, state verbatim:**

> **Deployment parity is unverified. The authorization audit establishes findings against the
> repository rules only; it does not establish that production enforces those rules. This
> limitation applies to the entire authorization verdict and prevents a definitive production
> authorization-conformance conclusion.**

Preserve this distinction: an unverified deployed ruleset is **not** proof that production is
insecure, but it **is** a limitation on any claim that production is secure. The audit must not
describe the implementation as fully security-verified.

### 2E. Branch-fallback and branchless-record semantics **[ADDED]**

This settles original Objective B items 1–3 with evidence and prevents both a false
vulnerability claim and a missed governance gap.

**Verified:**

- `DEFAULT_BRANCH = "Kota Gorontalo"` / `DEFAULT_BRANCH_ID = "kota_gorontalo"`
  (`src/constants/branches.js:8-9`), used as a silent fallback at roughly **25 call sites**,
  including Marketing-relevant paths:
  - `src/features/dashboard/MarketingDashboard.jsx:210` —
    `userProfile?.branchId || branchToId(userProfile?.branch || DEFAULT_BRANCH)`, which then
    drives `where("branchId", "==", marketingBranchId)` listeners on `applications` and
    `classes` (`:216-251`);
  - `src/features/dashboard/marketing/schoolOutreachRepository.js:270`, `:358`;
  - `src/features/dashboard/frontoffice/deskInquiriesRepository.js:76`;
  - `src/features/dashboard/usersRepository.js:29`, `:322`;
  - `src/features/finance/paymentsRepository.js:149`;
  - `src/features/staff/todosRepository.js:20`; `src/features/staff/invitesRepository.js:16`;
  - plus attendance/kiosk, batches, progress reports, approvals.
- The rules side is **not** symmetric with the client fallback: `userBranch()`
  (`firestore.rules:103-115`) returns `p.branchId`, else maps `p.branch` through a **hardcoded
  five-name list**, else **returns `null`**; and `isSameBranch()` (`:117-130`) requires
  `ub != null` (non-executive), so a profile with no recognizable branch **fails closed**.
- **But** `isSameBranch()` `:128` grants read access when the *record* has **neither**
  `branchId` nor `branch` **and** the caller's branch is `kota_gorontalo`.
  `isSameBranchStrict()` (`:139-151`) deliberately omits that clause (see its comment
  `:132-138`).

**Required assessment:**

1. For each Marketing-relevant fallback site, determine whether the fallback can cause a user
   to *operate in* the wrong branch or merely to *view* a wrong-branch-filtered, empty/denied
   state. State which. **Do not** report the client fallback as a cross-branch data leak unless
   a concrete read or write path is demonstrated against the rules.
2. Assess the fail-closed path as a **UX and data-integrity** matter: what a Marketing user
   with a missing or unrecognized branch actually sees (empty, error, spinner, misleading
   zeros), and whether loading/empty/error states handle it.
3. Assess `firestore.rules:128` as a **data-scope** matter: legacy records carrying no branch
   fields are readable by Kota Gorontalo callers only. Determine whether any authoritative
   document establishes Kota Gorontalo as the owner of legacy unbranched records. If not,
   report as **Governance Gap / Owner Decision Required** — do not silently accept it.
4. Note the existing guard: `src/features/dashboard/useDashboardData.test.js:43` asserts no
   silent branch fallback "for staff authorization." Determine whether that guard's scope
   covers the Marketing Dashboard and the repositories listed above, and report any gap.
5. Preserve the verified negative: because `userBranch()` fails closed, the fallback is
   **not** by itself an authorization bypass. Report it as a fail-closed correctness/attribution
   issue unless evidence shows otherwise.

### 2F. Provisioning and appointment paths vs. G-002 **[ADDED]**

The audit objectives do not currently cover how authority is *created*. Add this.

**Verified:**

- `firestore.rules:576-588`: `invites` `create` is `isExecutive()`-only, with **no validation of
  the invite's `role` value**. `isInviteValid()` (`:243-250`) binds the invitee's role to the
  invite's role (`inv.role == request.resource.data.role`), plus email, expiry, `branchId`,
  `division`.
- `src/schemas/inviteSchema.js:5-16`: `ALLOWED_STAFF_ROLES` includes **`admin`, `director`,
  `vice_director`**, so the client-side schema permits minting an invite for an executive or
  System Admin account. `InvitesPanel.jsx:84-85` defaults branch/division; confirm which roles
  the UI actually offers.
- Consequence to assess: an `admin` actor may be able to create an invite carrying
  `role: "admin"` (or `director`/`vice_director`), which the invitee then self-provisions,
  with **no Director decision on record** — against §7.4 ("create organizational authority by
  editing technical configuration"; "create a hidden self-privilege-escalation path") and
  **G-002** ("Appointment & revocation exclusively by the Director").

**Required work:** determine whether this path is reachable end-to-end (UI → rules); whether an
accepted decision authorizes executive/admin invite issuance; and classify accordingly. Where
the rules permit a path the client UI does not expose, report the **rules** behaviour — a hidden
button is not a control. Do not propose reassigning the authority; if the correct appointing
authority is unclear, mark **Owner Decision Required** (but note G-002 already answers the
System Admin case).

---

## Amendment 3 — Finding deduplication across the real ID schemes **[CORRECTED]**

### 3.1 Search surfaces (expanded)

Before assigning any finding ID, search **all** of:

1. `docs/audits/audit-log.md`
2. `docs/audits/current/`
3. `docs/audits/archive/`
4. `docs/reports/**` — **Verified** to contain ratified decisions and finding IDs
   (`OD-IL-ENF1–4`, `OD-IL1–4`) not present in `docs/decisions/`
5. `docs/decisions/**`
6. `docs/proposals/**`, `docs/plans/**`
7. `src/**/*.test.js` `describe`/`it` titles — **Verified** to encode finding and decision IDs

Search by file path, rule/helper name, resource and operation, role, title and description, and
prior IDs.

### 3.2 The ID schemes are not uniform **[CORRECTED]**

Do not assume a single `XXX-000` scheme exists:

- **Verified** `docs/audits/audit-log.md` is a **numbered table**
  (`| # | Item | Type | Status | Notes |`) with statuses
  `OPEN / ACCEPTED / DEFERRED / REJECTED / NEEDS-DATA` — **not** `MKT-P0-001`-style IDs.
- **Verified** archived cross-feature audits use `INT-001`–`INT-019`.
- **Verified** the instructor-leader work uses `OD-IL-ENF1–4` / `OD-IL1–4`.
- **Verified** the emulator suite's titles carry IDs and dates: `INT-019`, `OD-IL-ENF2`,
  `OD-IL-ENF3`, `OD-IL-ENF4`, `C1`/`C2`/`C3`/`C4`, `H1`/`H2`, `F1`, and
  "owner-approved 2026-10-08".

### 3.3 Rules

- If a prior finding concerns the same underlying defect: **reuse its existing ID (whatever the
  scheme)**, cite the earlier report and location, mark it continuation / supersession /
  regression / still-open, and explain what changed.
- Where the prior record is a numbered audit-log item, cite it as
  `docs/audits/audit-log.md #N (date)`.
- Assign a new ID only when the issue is materially distinct, and justify why it is not covered.
- Do not overwrite, delete, or silently renumber historical findings. Do not assume an archived
  finding is resolved merely because it was archived.
- Disclose any limitation on searchability; do not claim full deduplication if the history could
  not be searched completely.

### 3.4 Mandatory counts **[ADDED]**

Every finding must report, and the report must also aggregate:

- **raw count of affected authorization paths**, and
- **deduplicated finding count**,

plus a **flat appendix table** enumerating every path:
`file:line | resource | operation | predicate (expanded) | classification | finding ID`.

Rationale (**Verified**): `isAdmin()` appears in ~12 `delete` grants spread across `users`,
`applications`, `classes`, `attendance`, `corporateEvents`, `classAttendance`, `payments`,
`deskInquiries`, `shifts`, `schoolOutreach`, `schoolOutreach/visits` and the
`{path=**}/visits` collection group — while `isExecutive()` alone spans 58 lines, roughly 22 of
them create/update/delete sites. A single broad finding can therefore conceal dozens of
distinct authorization paths. Counts without the appendix still conceal *which* paths; require
both.

Whenever deduplicated count < raw count, state the grouping rationale explicitly.

---

## Amendment 4 — Two-axis readiness verdict **[CORRECTED]**

Replaces §4-1's single verdict. Produce **two** independently justified verdicts; do not average
them into one score.

| Readiness axis | Verdict | Evidence | Blocking findings | Conditions to proceed |
|---|---|---|---|---|
| **Axis A — Current implementation** | one permitted verdict | finding IDs + verified evidence | relevant blockers | required remediation or verification |
| **Axis B — Dashboard refinement** | one permitted verdict | audit completeness + approved requirements | relevant blockers | explicit entry criteria |

Permitted verdicts (each axis): `READY` · `READY WITH MINOR FOLLOW-UP` · `NOT READY` ·
`BLOCKED BY GOVERNANCE DECISION` · `BLOCKED BY SECURITY-CORRECTNESS ISSUE`.

**Axis A** — is the current Marketing Dashboard sufficiently correct, secure, governed, and
maintainable for its existing intended use? Consider: confirmed critical/high defects; backend
authorization and branch isolation; separation of technical and business authority; workflow
integrity and separation of duties; residual removed-role paths; historical-record
preservation; deployment parity; required owner decisions. Cite specific finding IDs.

If ruleset parity is unverified, say so prominently and explain why production authorization
readiness **cannot** be conclusively established. Do not describe the implementation as fully
security-verified.

**Axis B** — does the team have enough reliable evidence and approved requirements to begin
refinement? Consider: completeness of the current-state map; clarity of the inquiry lifecycle;
verified ownership of each stage; reliability of the data behind proposed metrics; established
role/branch boundaries; resolution or explicit isolation of governance blockers; identified
dependencies and owner decisions; a practical incremental implementation and regression plan.

**[CORRECTED] Closing the isolation loophole.** The dashboard may be refinement-ready while a
separate current-state defect remains — but only with a written **isolation statement** that:

1. names every collection, rule, repository, and component the proposed refinement would touch;
2. asserts, per P0 finding, that there is **no overlap**;
3. if any overlap exists, states that Axis B cannot exceed `NOT READY` until the overlapping
   finding is remediated or the overlapping work is explicitly severed from the refinement.

An attractive redesign is not sufficient for refinement readiness if required permissions,
workflows, or metric definitions remain ambiguous.

State whether refinement can begin safely, what may proceed independently, and what must wait
for security corrections or owner decisions.

---

## Amendment 5 — Empirical verification protocol **[ADDED]**

Phase 0 forbids modifying rules or tests. It does not forbid *running* them, and the repository
already contains the harness needed to confirm most authorization findings empirically. Prefer
execution over rule-text inference.

### 5.1 Run the existing suite

- `package.json:11` → `test:rules`. **Verified** the CI-equivalent command runs green on
  HEAD `9dcb868`: **106/106 passed**, ~18 s, exit 0, using `firebase-tools` 15.32.0 and Java 21
  (Temurin). A global `firebase` 15.32.0 — the same version CI pins — is installed and
  resolvable, so `npm run test:rules` is expected to work locally.
- Record the exact command, environment (Java present, firebase-tools version), result, and any
  deviation. If the emulator cannot run, state that explicitly and specify the additional
  evidence required.

### 5.2 Inspect stderr, not just the pass/fail summary **[ADDED]**

A green suite can mask denials caused by **evaluation-budget exhaustion** rather than by the
intended predicate. **Verified** in the passing run, stderr contained:

- `Unable to evaluate the expression as the maximum of 1000 expressions to evaluate has been
  reached. for 'update' @ L833` and `@ L1075`;
- `evaluation error at L497:24 for 'create'` and `at L522:24 for 'update'`.

These occur in tests that expect denial, so the suite passes. Report any such occurrence as a
finding (rules-engine budget / robustness risk), identify whether any **legitimate** operation
sits near the ceiling, and note that the rules' own comments already document this ceiling
(`firestore.rules:189-193`, `:828-832`). Note also that the suite emits an
`evaluation error at L522:24` on `users` update paths.

### 5.3 Identify untested grants

Determine which of the paths enumerated in 2A/2B are pinned by an existing test and which are
not. **Verified preliminary:** no existing test appears to assert or deny the
`isAdmin()`-only deletes on `payments` (`:821`), `schoolOutreach` (`:1023`),
`schoolOutreach/visits` (`:1038`) or `{path=**}/visits` (`:1054`). Grants that no test pins are
free to drift silently; say so.

### 5.4 Record what was not verified

List every behaviour left unverified and the specific evidence that would close it. Where
empirical confirmation requires **new** tests, specify them as **Phase 1** deliverables — do not
write them in Phase 0.

---

## Reporting requirements (in addition to Deliverables 1–8)

- Classify every statement as **Established / Observed / Inferred / Proposed / Owner Decision
  Required**. Do not promote an inference to an established fact.
- Report both counts from §3.4 and include the flat appendix table.
- Report the exact commands run, their results, and everything not run.
- Report the deployment-parity status per §2D, using the mandated wording where unverified.
- Never claim a clean audit because the build or suite passes.

---

## Acceptance conditions **[CORRECTED]**

**Precondition.** This amendment set and the base brief
([`2026-10-09-marketing-dashboard-phase0-brief.md`](./2026-10-09-marketing-dashboard-phase0-brief.md))
were both read, and no objective, deliverable, or scope element was synthesized, substituted, or
re-derived by the executor.

Phase 0 is complete only when:

1. Only the two canonical documents were used as the initial governance/architecture authority,
   and any other copy was read, if at all, only as evidence of drift. *(Amendment 1.1)*
2. Each root-level file was **characterized by its actual nature** — pointer stub vs summary
   stub vs divergent duplicate — and no drift finding was filed against a compliant pointer.
   *(Amendment 1.2)*
3. The root blueprint stub's **status conflict** (PROPOSED vs RATIFIED at the same version and
   date) was assessed and reported. *(Amendment 1.3)*
4. Every **Admin-reachable business-record mutation** was enumerated individually — direct
   `isAdmin()` grants **and** all `isExecutive()`-family call sites. *(Amendment 2A)*
5. An **accepted-decision search** was performed before classifying any occurrence as a
   conflict, and any authorizing decision was cited. *(Amendment 2A, RESTORED)*
6. Every predicate folding Admin into a business-authority bucket was enumerated, server-side
   and client-side, including the `roles.js` mirrors. *(Amendment 2B)*
7. Every surviving reference to a removed role was classified by actual effect, the
   **provisioning loop** was checked, and historical references were preserved. *(Amendment 2C)*
8. Deployment parity was verified **per change**, or the mandated unverified-parity paragraph
   was reproduced verbatim. *(Amendment 2D)*
9. Branch-fallback and branchless-record semantics were characterized as fail-closed vs leak,
   with `firestore.rules:128` assessed as a data-scope/owner-decision matter. *(Amendment 2E)*
10. The invite/provisioning path was assessed against **G-002** and §7.4. *(Amendment 2F)*
11. Historical finding searches were performed across **all seven** surfaces, before assigning
    IDs, using the appropriate ID scheme per surface. *(Amendment 3)*
12. Both counts and the flat appendix table were produced. *(Amendment 3.4)*
13. Both readiness axes have independent, evidence-based verdicts, and Axis B carries a written
    isolation statement. *(Amendment 4)*
14. The existing emulator suite was run, its **stderr** inspected, untested grants identified,
    and unverified behaviour listed. *(Amendment 5)*
15. No application code, Firestore rules, tests, configuration, dependencies, or authoritative
    governance documents were modified. Documentation-only audit deliverables are permitted.
16. The **D1 enumeration was completed in full** across the whole repository; the D2/D3 split was
    applied for *verification depth only*; every deferred D3 path is named explicitly; and no
    path was omitted from the appendix table. *(Amendment 2.0)*
17. The status of every entry in every decision register was checked **individually** —
    ratified/implemented entries were cited as authorization, and pending proposals
    (`OD-IL1`–`OD-IL5`, audit-log open items such as **H5**) were treated as **proposals, not
    authority**. *(Amendments 1.4, 3.1, §0)*

---

## Explicit prohibitions (unchanged, restated)

- Do not implement any part of the dashboard refinement, or fix any defect found, during
  Phase 0 — including defects that appear trivial.
- Do not modify `firestore.rules`, `firestore.indexes.json`, application code, tests, seeds, or
  configuration.
- Do not modify the Authoritative Blueprint, `docs/ARCHITECTURE.md`, accepted decisions, or
  existing audit history.
- Do not deploy rules, change production configuration, or perform authorized-but-unrequested
  production access.
- Do not invent governance requirements, resolve open owner decisions, reassign removed
  authority, or recreate the removed Branch Manager role under any name.
- Do not add a paid, usage-based, or temporarily-free service.

**Stop after delivering the audit. Do not begin Phase 1 or any subsequent phase until the owner
has reviewed the report and explicitly authorizes the next step.**
