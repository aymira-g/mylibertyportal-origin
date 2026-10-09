# Marketing Dashboard — Phase 1 Brief (Implementation)

> **Document Type:** Owner-authorized implementation instruction (procedural, non-authoritative)
> **Date:** 2026-10-09
> **Governing baseline:** Authoritative Blueprint v3.3 (RATIFIED, 2026-10-07)
> **Read with:** [`2026-10-09-marketing-dashboard-phase0-brief.md`](./2026-10-09-marketing-dashboard-phase0-brief.md)
> (base scope) · [`2026-10-09-marketing-dashboard-phase0-amendments.md`](./2026-10-09-marketing-dashboard-phase0-amendments.md)
> (audit amendments) · [`../reports/marketing-dashboard/00-phase0-audit.md`](../reports/marketing-dashboard/00-phase0-audit.md)
> · [`../reports/marketing-dashboard/owner-decisions.md`](../reports/marketing-dashboard/owner-decisions.md)
> **Status:** RATIFIED — owner decisions recorded 2026-10-09 (§1.0). Authorized for execution per §3.

---

## 0. What you are being asked to do

Implement the Phase 1 refinement of the Marketing Dashboard, plus the specific security
corrections the owner has ratified, on top of a completed Phase 0 conformance audit.

**Phase 1 is implementation. Phase 0's audit-only restriction is lifted for the scope in §3 and
nothing else.**

Before writing any code, complete **Task 0** (§2): the Phase 0 audit contains verified factual
errors that must not be built on.

---

## 1. Owner Decision Sheet — RATIFIED ANSWERS

Fill in each `ANSWER:` line. Until a decision is answered, **do not begin work that depends on
it**; complete everything independent of it first, then stop and ask.

Where an option is marked *(recommended)*, that is the executor's recommendation only — it is
not authority until the owner writes it in.

### 1.0 RATIFIED — Owner answers, 2026-10-09

**This block is authoritative over the blank `ANSWER:` lines below.** The option lists further
down are retained as rationale only.

| Decision | Ratified answer |
|---|---|
| **OD-MKT-1** | **A** — two separate, accurate cards (walk-in inquiries + online applications) |
| **OD-MKT-2** | **A** — division-bound with an `all` toggle |
| **OD-MKT-3** | **A** — ratify Kota Gorontalo custodianship of legacy branchless records. **The backfill is NOT authorized by this answer** — dry-run first, report, then separate approval |
| **OD-MKT-4** | **A** — remove `isAdmin()` delete on business/financial collections only; keep it on technical resources |
| **OD-MKT-5** | **MODIFIED — route 5a CONFIRMED (see 1.1).** Front Office initiates the `NEW_STAFF_ACCOUNT` request; the **Director approves and creates the invite**; executive-role (`admin`/`director`/`vice_director`) invites require the Director |
| **OD-MKT-6** | **A (confirmed)** — remove `branch_manager` from the five approver sets. Full removal surface in 1.4 |
| **OD-MKT-7** | **A** — add `nextFollowUpDate` + `lastContactedAt` to `deskInquiries` |
| **OD-MKT-8** | **A (confirmed) — see 1.2.** Record the gap; remove deletion of `applications` and `deskInquiries` from the `isFrontOffice()` branch; reserve that deletion to the **Vice Director, default `isViceDirector() \|\| isDirector()`** |
| **OD-MKT-9** | **NOT "C" — becomes OD-MKT-13, and the owner has directed a blueprint amendment — see 1.3** |
| **OD-MKT-10** | **B (confirmed)** — remove `branch_manager` everywhere, **gated on the data check in 1.4** |
| **OD-MKT-11** | **A** — verify live rules → make changes → deploy once, with explicit owner approval |
| **OD-MKT-12** | **A — NO REFACTOR (see 1.5).** Owner delegated the call; executor decision is to defer and record a measured baseline instead |
| **G-1** (errata authority) | **Approved** |
| **G-2** (Phase 1 scope) | **Approved** |

#### 1.1 OD-MKT-5 — how Front Office involvement works (owner question answered)

Verified: `approvals` create (`firestore.rules:847-865`) already permits **any `isStaff()`** —
which includes `frontoffice` — to submit a `NEW_STAFF_ACCOUNT` envelope addressed to
`director`/`vice_director`, and `gateAllowsApprover('NEW_STAFF_ACCOUNT', ...)` accepts both. So
Front Office can already *initiate*. Two implementation routes:

- **5a (recommended, no rules change):** Front Office submits the `NEW_STAFF_ACCOUNT` request; on
  approval the **Director creates the invite**. The invite already authorizes the account (`users`
  create invite branch, `firestore.rules:512-520`, ratified by OD-IL-ENF4). Cost: UI affordance only.
- **5b (email-bound gate, Medium):** Front Office creates the invite *after* approval. This needs
  a **new** helper mirroring `isApprovedNewStaffAccount` (`:386-397`) but bound to the invite's
  **email and role** instead of a `uid` (an invitee has no `uid` yet), plus applied/replay
  handling and emulator tests. **Do not** reuse `isApprovedNewStaffAccount` as-is — it binds
  `payload.uid == targetUserId` and cannot work at invite time.

Either way, **executive-role invites (`admin`, `director`, `vice_director`) require the Director** —
that is the G-002 substance and is not optional.

**Owner confirmed route 5a (2026-10-09). Route 5b is NOT authorized.**

#### 1.2 OD-MKT-8 — deletion of admissions records reserved to the Vice Director

Remove the deletion clause from the `isFrontOffice()` branch of `applications` delete (`:594`) and
`deskInquiries` delete (`:840`); add an explicit `isViceDirector() || isDirector()` deletion
authority on both.

**RESOLVED (owner, 2026-10-09):** the Director **does** retain deletion authority alongside the Vice
Director. Ratified predicate: `isViceDirector() || isDirector()`.

**Net effect for these two collections — read this carefully.** OD-MKT-4 removes `isAdmin()` delete
from `applications` and `deskInquiries`, and this decision removes the `isFrontOffice()` branch. The
combined result is that **only `isViceDirector() || isDirector()` may delete an application or a
walk-in inquiry.** Technical `admin` loses it (OD-MKT-4); Front Office and Ops Lead lose it (this
decision). That is the intended outcome — **do not "restore" `isAdmin()` on these two rules.**

State the remaining asymmetry in the completion report: `deskInquiries` **update** stays available
to `isStaff()` in-branch and is level-gated, so the working workflow continues; only *destruction*
moves to the executive layer.

#### 1.3 OD-MKT-9 becomes OD-MKT-13 — class management ownership (new decision)

The owner's intent was **Ops Lead executes class operations; Vice Director approves; the Division
Manager stays strategic and receives reporting.** That is **not** current behaviour, so ticking "C"
would be inaccurate:

- current: `classes` **create/delete = `isAdmin()` only** (`:615`); **update = `isAdmin()` or
  `isFrontOffice()`** (`:616-624`, and `isFrontOffice()` includes `opslead`);
- so Ops Lead can already update rosters, but **no approval gate exists for classes at all**.

Governance check — the intent is **broadly consistent** with the blueprint: §6.8 makes the
Operational Leader the front-office/operational coordinator and states it does *not* acquire Course
Division authority, and §6.4 excludes "Front Office / Admin" and "branch facilities" from the
Division Manager. Read-only Division Manager reporting is consistent with Principle 16 (visibility
≠ execution authority).

Two parts need a **§26 amendment**, which only the owner may approve (G-001):

1. **"Vice Director approves"** contradicts **G-007**, which ratifies the approver for
   `CLASS_CANCELLATION_OR_RESCHEDULE` as `opslead`/`frontoffice`. (Note: G-007's choice creates a
   single-Ops-Lead deadlock risk, since maker ≠ checker is enforced at `:867` — the owner's instinct
   may be better, but it is still an amendment.)
2. **Class creation is not a gated action at all** in **G-006** (the 13 ratified actions), so gating
   it needs a new actionId or reuse of an existing one.

**Phase 1 action: nothing.** Record OD-MKT-13 with the owner's intent, keep `classes` rules
unchanged, and implement only after the amendment.

**Owner has directed a blueprint amendment (2026-10-09). Amendment procedure — mandatory order:**

1. **Decide and record the decision first, code second.** Write a new accepted decision at
   `docs/decisions/<date>-class-management-authority.md` containing: the question, the ratified
   answer, what it supersedes, the date, and the rationale. This is the repository's established
   pattern for binding policy.
2. **Amend the §26 register per Blueprint §27 — never silently.** Add a new row (**G-012**) stating
   the class-management authority decision, and mark the `CLASS_CANCELLATION_OR_RESCHEDULE` line of
   **G-007** as `SUPERSEDED (IN PART) BY G-012`, leaving G-007's original text in place. §27
   requires all five steps: preserve the historical decision, mark the conflicting rule superseded,
   reference the new governing decision, record date and reason, and update the authoritative set.
3. **Only the Owner/Director may ratify** (G-001). The executor may **draft** the amendment; it is
   not binding until the owner approves it and it is recorded.
4. **Two amendment routes — pick one before drafting:**
   - **Route 1 (minimal — recommended):** leave **G-006** untouched (13 actions stay 13). Change only
     the approver for `CLASS_CANCELLATION_OR_RESCHEDULE` from `opslead`/`frontoffice` to
     `vice_director`, and grant the **Operational Leader** direct class create/update authority in
     the rules (branch-scoped) **without** a new approval ticket. Rationale: routine scheduling
     should not carry approval friction; destructive/reversible-risk acts should. Smallest
     amendment — one register line.
   - **Route 2 (fuller):** add a **new** gated action (e.g. `CLASS_CREATE_OR_ARCHIVE`) to **G-006**,
     making it 14, with the Vice Director as approver. More control, more daily friction, and a
     larger amendment surface (G-006 row + G-007 row + registry + guard list).
   - Executor recommendation: **Route 1**, gating only archival/deletion if the owner wants creation
     controlled.
5. **Then implement as ONE ordered change-set, in Phase 2 — not bundled with Marketing UI work:**
   - a. `src/features/shared/approvalGates.js` — `GATED_ACTIONS` approver sets.
   - b. **The drift-guard ratchet:** `src/features/shared/approvalEnforcement.test.js:75` holds
     `BLOCKING_AWAITING_DECISION = []`, a deliberate guard so a `blocking` gate with nothing behind
     it **fails the suite**. Adding or changing a gated action requires recording it in the correct
     list with the decision — otherwise tests fail. Do this deliberately, not reactively.
   - c. `firestore.rules:209` (`gateAllowsApprover` clause) and `:615-624` (classes predicates).
   - d. `src/features/shared/securityRulesMatrix/securityRulesMatrix.helpers.js` — the JS mirror.
   - e. Emulator tests: Ops Lead may create/update a class in-branch; denied cross-branch and
     cross-division; Vice Director may approve cancellation; **Ops Lead cannot self-approve** (the
     maker ≠ checker check already exists at `firestore.rules:867`).
   - f. `docs/specs/authorization-contract.md` if any role list changes — its `:102` designates
     itself the change surface.
6. **Supporting arguments to record in the amendment:** the Vice Director already receives **all**
   pending approvals province-wide (`listenToPendingApprovals` only constrains non-executives), so no
   query changes are needed; and G-008 already establishes that "unavailable leader's requests
   escalate upward to the executive layer," so a Vice Director approver is consistent with ratified
   escalation philosophy. G-007's current Ops-Lead-approves-own-domain choice also carries a
   single-Ops-Lead deadlock risk (maker ≠ checker), which this amendment removes.
7. **Division Manager reporting** needs no new authority — `isStaff()` already permits managers to
   **read** classes (`firestore.rules:600`, division-gated). A read-only report is a UI task, not a
   rules change.

#### 1.4 OD-MKT-10 — removing `branch_manager` everywhere (owner question answered)

Recommended: **B, with the data check as a hard prerequisite** — and extend it to delete
`roles.js:40` (`branch_manager → manager` normalization) plus its tests (`roles.test.js:116`,
`useUserProfile.test.js:50`) **once no legacy documents carry the role**.

Why the references exist: the normalizer is **legacy-document read compatibility**, not a permission
grant. But `firestore.rules:51`/`:59` are the enforcement layer, and there the removed role is
**live authority** — which is why half-removal (option A, approver sets only) is the *least*
defensible middle: `isManager()` also gates `deskInquiries` delete (`:840`) and `corporateEvents`
delete (`:719`), so leaving the alias leaves deletion authority with a role that no longer exists.

**Hard prerequisite, in order:**

1. **Count live `users` documents with `role: 'branch_manager'`** — read-only. Report the count
   before any change.
   **[PRACTICAL BLOCKER — resolve before starting]** the executor has **no Firebase credentials**
   and cannot query production Firestore. Resolve one of these first:
   - **(a) Owner performs it** — Firebase Console → Firestore → `users` → filter
     `role == branch_manager` — and records the count; or
   - **(b) Owner explicitly authorizes** a **read-only** Admin SDK script using the existing local
     `serviceAccountKey.json`. That file is gitignored but present in the working tree; the script
     must be strictly read-only, must not commit the key, and must not be left in the repository.
   Write nothing and deploy nothing as part of this check. If the count is **greater than zero**,
   stop and report the affected accounts, then propose the migration for **separate approval** —
   never migrate silently.
2. **Zero:** remove everywhere — rules, JS mirror, normalizer, and the tests that assert authority.
   State each changed/removed assertion in the completion report.
3. **Greater than zero:** do **not** remove yet. A rules-only removal breaks real accounts: the
   client would still normalize them to `manager` in the UI while the rules deny manager access —
   they would see a manager dashboard full of permission errors. Migrate those documents first
   (`role: 'manager'` **plus** a `branchId` and `division` binding, per AGENTS.md rule 10 — an
   unbound `manager` is not a valid Division Manager), verify, then remove.
4. `branch_manager` cannot be minted by the client (`inviteSchema.js:5-16` excludes it), so existing
   documents are the only possible source.

**Complete removal surface (verified repo-wide at HEAD `9dcb868`) — the Phase 0 audit and the
earlier draft of this brief both missed rows 2 and 4–6:**

| # | File | Lines | Nature |
|---|---|---|---|
| 1 | `firestore.rules` | `51`, `59`, `166`, `204`, `205`, `206`, `212`, `213`, `219`, `262` | **Enforcement** — role acceptance and approver sets |
| 2 | `cloudflare-worker/worker.js` | `474` (`branch_manager: "manager"`) | **Backend role alias map** — a second, independent alias source |
| 3 | `src/features/shared/roles.js` | `28` (comment), `40` (alias map) | Client read-path normalizer |
| 4 | `src/features/shared/approvalGates.js` | `26` (`BRANCH_MANAGER: "manager"`), `797` (switch case) | Deprecated alias **constant** |
| 5 | `src/features/shared/approvalsRepository.js` | `61` | Query constraint listing `"manager"` **twice** in the same `in` array |
| 6 | `src/features/shared/securityRulesMatrix/securityRulesMatrix.helpers.js` | `49`, `99`, `406`, `407`, `408`, `418`, `428`, `449` | JS mirror of the rules |
| 7 | Tests asserting the alias's **authority** | `roles.test.js:58,116,177` · `useUserProfile.test.js:50` · `operationalResources.test.js:452-453` · `approvalGates.test.js:60,70,81-84,117,135,193,200` · `devPresets.test.js:215-217` | Must be **replaced** with assertions that the role is rejected, not silently deleted |

**Important clarification for the owner's question.** Removing the alias from a rule and *denying*
legacy holders are the **same act**, not two choices. A Firestore rule either matches the role
string or it does not; if the predicate lists only `manager`, a document containing
`branch_manager` fails the check. There is no "neutral" state to design. That is precisely why the
count-then-migrate prerequisite in steps 1–3 exists — it is what makes the removal safe rather
than merely correct. After migration the role is gone from the organization **and** from the
enforcement layer, which is the outcome the owner asked for.

**Origin of the drift (useful for the amendment record).** The alias was not always in the rules.
`docs/audits/archive/2026-09-28-corporate-events-kiosk-investigation-report.md:81-94` records that
`branch_manager` was **absent** from `firestore.rules`, and the chosen remediation was to **add** it
to `isStaff` / `isManager` / `isApproverForDoc` / `isTrackedShiftRole` for compatibility. That past
fix is how a removed role acquired live authority. Two active plans already anticipate the
reversal: `docs/plans/active/2026-10-07-executive-dual-control-approval-architecture.md:111`
("controlled timeline for eventual deprecation of the legacy `branch_manager` alias") and
`docs/plans/active/approval-control-architecture-plan-condensed.md:180`. **Plans are proposals, not
authority** — the owner's OD-MKT-6/OD-MKT-10 answers are what authorize this work.

**Scope boundary — do NOT erase history.** "Remove it like it never existed" applies to **code,
rules and backend only**. Documentation must be **preserved** under Blueprint §27 and **G-010**:
`docs/decisions/**`, `docs/audits/**` (including `archive/`), `docs/plans/**`, `docs/reports/**` and
`docs/specs/authorization-contract.md:148` must keep their existing mentions. Erasing them would
destroy the audit trail of the removal itself and violate the supersession protocol. The correct
action is the opposite: add a new record documenting the removal, the migration, and the date.

**Already-known cosmetic defect worth fixing in the same change.** `approvalGates.js:26` makes
`BRANCH_MANAGER` **literally the string** `"manager"`. That is why `approvalGates.test.js:60`
"asserts `BRANCH_MANAGER`" while proving nothing about branch managers — a point the
instructor-leader register already records at `docs/reports/instructor-leader-dashboard/owner-decisions.md:85`.
Removing the constant makes those assertions honest and removes the duplicate entry in
`approvalsRepository.js:61`.

#### 1.5 OD-MKT-12 — NO REFACTOR (owner delegated; executor decision)

**Decision: do not refactor the rules in Phase 1.** Record the measured baseline and monitor it.
Rationale, recorded so the decision is auditable:

- The budget issue currently manifests only on **denial** paths. No legitimate business write has
  been shown to fail; passing tests show envelope-backed deskInquiries writes still evaluate
  successfully. So the benefit is **latent robustness**, not a live defect.
- The risk is **silent authorization drift on financial rules**. `isSameBranchStrict` exists only
  because `isSameBranch`'s "branchless document → kota_gorontalo" clause is unsound for list
  queries (`firestore.rules:132-138`); a "simplification" there is a cross-branch read leak.
- **The safety net is thinner than it looks:** the emulator suite has **no coverage at all** of the
  `isAdmin()` delete grants. "Tests green" is weak evidence for a rules refactor.
- Production parity is **unverified** (OD-MKT-11), so a regression could not be attributed.

**Required instead — a recorded baseline and a comparison step (not a new tool):**

1. Record in the completion report and in `docs/audits/current/regression-log.md` the current
   **budget sites** (`:522`, `:806`, `:833`, `:866`, `:935`, `:1075`) and **evaluation-error sites**
   (`:497`, `:522`, `:707`, `:765`, `:787`, `:806`, `:812`, `:915` update+delete, `:926`, `:965`),
   captured from `firestoreRules.emulator.test.js` stderr — not from the pass/fail summary.
2. As part of the Level 1 regression check, re-run the emulator suite, capture full stderr, and
   **report any new site number or any increase**. A new site on a legitimate write path is a
   blocking finding, not a note.
3. Do **not** claim an automated guard for this unless one is genuinely built — a test cannot
   trivially read the emulator's stderr. The baseline-plus-comparison is the honest mechanism.

**If a refactor is ever revisited**, it must be an isolated change-set (never bundled with UI work),
after OD-MKT-11 parity is established, with before/after site counts and
`securityRulesMatrix.helpers.js` updated in the same change.

### Block A — the six register decisions (from `owner-decisions.md`)

**OD-MKT-1 — Overview KPI source of truth**
- **A (recommended):** two separate cards — *Walk-In Inquiries* (`deskInquiries`, count
  `status == "inquired"`) and *Online Applications* (`applications`, count `status == "pending"`),
  each routing to its own tab.
- **B:** one combined "Active Admissions Pipeline" counter.
- Why A: verified — the two streams are modelled differently. Walk-in conversion is recorded on
  the inquiry (`status:'enrolled'`, `convertedStudentId`, `convertedAt`); web applications track
  only `status`. Different follow-up mechanics (WhatsApp + placement test vs. admission approval).
- `ANSWER:`

**OD-MKT-2 — Marketing division scope**
- **A (recommended):** division-bound (`courses` / `kindergarten`) with an `all` toggle;
  dashboard filters programs, batches and outreach targets by the profile's `division`.
- **B:** branch-wide unified marketing across both divisions.
- Why A: matches Blueprint §6.6/§6.7 and prevents course marketing from touching kindergarten
  admissions; `authorization-contract.md:62` already treats marketing as division-scoped.
- `ANSWER:`

**OD-MKT-3 — Ownership of legacy branchless records (`firestore.rules:128`)**
- **A (recommended):** ratify Kota Gorontalo (Cabang Utama) as custodian of pre-branch-scoping
  records, then backfill `branchId` so the special-case clause can eventually be retired.
- **B:** restrict branchless records to Director/Vice Director until individually audited.
- Why A: preserves operational visibility; the backfill must be dry-run-first, reversible, and
  reported before execution (see §3.6).
- `ANSWER:`

**OD-MKT-4 — System Admin deletion of business records** *(options corrected — the Phase 0
enumeration named `progressReports`, which has no `isAdmin()` delete, and omitted `shifts`,
which does)*
- **A (recommended):** remove `isAdmin()` from `allow delete` on **business/financial**
  collections only — `payments` `:821`, `shifts` `:960`, `attendance` `:682`, `classAttendance`
  `:797`, `corporateEvents` `:719`, `schoolOutreach` `:1023`, `visits` `:1038`/`:1054`,
  `applications` `:594`, `deskInquiries` `:840`, `classes` `:615`, `users` `:521`. **Keep**
  `isAdmin()` on technical resources — `invites` `:584`, `errorLogs` `:1006`,
  `kioskDevices`/`kioskChallenges` — which Blueprint §7.2 permits.
- **B:** retain current behaviour.
- **C:** remove `isAdmin()` delete everywhere, including technical resources.
- Context the owner should know: **no code in this repository deletes `payments`, `shifts`,
  `attendance`, `classAttendance`, `corporateEvents`, `schoolOutreach` or `visits`.** Those
  grants are unused latent surface. Only `classes`, `users`, `applications`, `deskInquiries`,
  `todos`, `invites`, `staffLeave` and `materials` are deleted by app code, and all but
  `classes`/`users` have non-admin paths. The owner retains unconditional access via the
  Firebase Console / Admin SDK — security rules do not govern those.
- `ANSWER:`

**OD-MKT-5 — Invite role restriction (G-002)**
- **A (recommended):** require `isDirector()` on `invites` create when
  `request.resource.data.role in ['admin','director','vice_director']`; operational roles may
  still be invited by authorized executives.
- **B:** leave open.
- Why A: G-002 reserves System Admin appointment/revocation to the Director; `:587` currently
  permits any executive (including `admin`) to mint an `admin` invite, and `inviteSchema.js:5-16`
  allows those roles.
- `ANSWER:`

**OD-MKT-6 — Surviving `branch_manager` approval authority**
- **A (recommended):** remove `branch_manager` from the approver sets in
  `firestore.rules:204-206`, `:212-213` and the mirror
  `securityRulesMatrix.helpers.js:406-408`, `:414-431`.
- **B:** retain the legacy alias.
- Why A: G-007 already assigns these gates to `manager` (Division Manager) only. Removing the
  alias aligns code to **already-ratified** governance — no blueprint amendment is required.
- Scope limit: see OD-MKT-10 for whether removal extends beyond approver sets.
- `ANSWER:`

### Block B — decisions surfaced by the independent verification pass

**OD-MKT-7 — Inquiry follow-up tracking (enables the "overdue follow-ups" priority)**
- Verified: `deskInquiries` has **no follow-up date field**. `INQUIRY_STATUSES` is
  `["inquired","follow_up_sent","enrolled","closed"]`, so status exists but no date. Follow-up
  dates exist only on school outreach (`status:"follow_up"`, visit `nextFollowUpDate`).
- **A (recommended):** add minimal fields to `deskInquiries` — `nextFollowUpDate` (ISO date) and
  `lastContactedAt` — with schema (`deskInquirySchema.js`), optional/back-compatible, and tests.
- **B:** defer the overdue-follow-up feature to Phase 2; Phase 1 shows outreach follow-ups only.
- Why it matters: the roadmap lists an "Overdue Follow-Up Engine" as Medium/no-dependencies; it
  actually requires this data-model change.
- `ANSWER:`

**OD-MKT-8 — Ops Lead authority over admissions records** *(newly found; not in the register)*
- Verified: `isFrontOffice()` includes `opslead`/`ops_lead`/`frontofficelead`, so Ops Lead can
  **update** `applications` (`:593`), **delete** `applications` (`:594`) and **delete**
  `deskInquiries` (`:840`) in its branch+division. No accepted decision assigns those
  capabilities. The Phase 0 matrix wrongly recorded these as "Denied".
- **A (recommended):** record as an explicit governance gap; remove **deletion** of
  `applications`/`deskInquiries` from the `isFrontOffice()` branch pending an owner decision;
  leave approval capability unchanged for now.
- **B:** record the gap only; change nothing.
- **C:** ratify the current Ops Lead capabilities as intended.
- `ANSWER:`

**OD-MKT-9 — Division Manager class management** *(newly found)*
- Verified: **no rule grants a Division Manager any class write.** `classes` create/delete is
  `isAdmin()` only (`:615`); update is `isAdmin()` or `isFrontOffice()` (`:616-624`). Managers can
  read classes but not manage them — which contradicts Blueprint §5 division-level responsibility
  and the Phase 0 lifecycle diagram's own Stage 3 claim.
- **A (recommended):** record as a governance gap for a separate decision; change nothing in
  Phase 1 (class writes interact with enrollment and approval gates).
- **B:** authorize `manager` for class create/update within branch+division in Phase 1.
- **C:** confirm current behaviour (admin + Front Office) is intended and update the lifecycle text.
- `ANSWER:`

**OD-MKT-10 — How far does `branch_manager` removal go?**
- Verified: `branch_manager` is also accepted by `isManager()` (`:51`) and `isStaff()` (`:59`),
  which grant general authority — including `deskInquiries` and `corporateEvents` deletion
  (`:840`, `:719`).
- **A (recommended):** Phase 1 removes it from **approver sets** only (OD-MKT-6). Treat the
  broader `isManager()`/`isStaff()` removal as a separate task after the data check in §3.5.
- **B:** remove it everywhere in Phase 1.
- `ANSWER:`

**OD-MKT-11 — Rules deployment and production parity**
- Verified: **no CI workflow deploys `firestore.rules`** (hosting only); rules deployment is
  manual. `docs/reports/instructor-leader-dashboard/owner-decisions.md:294` records the
  OD-IL-ENF4 rules changes as **"Not deployed"**. Deployment parity is therefore **unverified**,
  and every finding above describes the **repository** rules — not necessarily production.
- **A (recommended):** (1) verify what is actually live via the Firebase Console before changing
  anything; (2) make the Phase 1 rules changes; (3) deploy **once**, with explicit owner approval,
  after emulator verification. Never deploy without approval.
- **B:** make the rules changes but leave deployment to the owner separately.
- `ANSWER:`

**OD-MKT-12 — Rules engine expression budget (`MKT-P0-023`)**
- Verified by full stderr capture: budget exhaustion occurs on **6** distinct rule sites —
  `:522` (users update), `:806` (payments create), `:833` (deskInquiries update), `:866`
  (approvals update), `:935` (shifts update), `:1075` (fallback deny) — and evaluation errors on
  **11** sites (`:497`, `:522`, `:707`, `:765`, `:787`, `:806`, `:812`, `:915` update+delete,
  `:926`, `:965`). The suite still passes because the affected writes are expected to be denied.
- **A (recommended):** do not refactor now; add a regression guard so the count cannot silently
  grow, and note it as monitored technical debt.
- **B:** refactor the heaviest predicates in Phase 1.
- `ANSWER:`

### Go-ahead items (not governance decisions)

- **G-1:** Authorize the executor to correct the Phase 0 audit's factual errors (Task 0, §2).
  Recommended: **yes.** `ANSWER:`
- **G-2:** Approve the owner's chosen Phase 1 scope in §3 as the working scope.
  Recommended: **yes.** `ANSWER:`

---

## 2. Task 0 — Correct the Phase 0 audit before building on it

These were verified independently against the code and rules at HEAD `9dcb868`. Apply them to
`docs/reports/marketing-dashboard/00-phase0-audit.md` as a clearly-marked **"Errata
(verification pass)"** section — **append and mark, do not silently rewrite** (Blueprint §27,
G-010). Then re-read the corrected findings before starting §3.

| # | Location in the audit | Correction |
|---|---|---|
| E1 | MKT-P0-012, MKT-P0-013, appendix rows around `:892`–`:960`, and the OD-MKT-4 collection list | **`shifts` and `progressReports` are inverted.** Block boundaries: `match /progressReports` at `:891`, `match /shifts` at `:918`, `match /shiftAuditEvents` at `:963`. So `:892`/`:902`/`:915` are **progressReports** (`isExecutive()`), and `:919`/`:922`/`:926`/`:935`/`:960` are **shifts** (`isAdmin()`). The real finding: technical admin can create/update/**delete** `shifts` (`:926`/`:935`/`:960`), which carry `cashReconciliation` (`:945`) — a **financial** exposure, not "progressReports MEDIUM". |
| E2 | MKT-P0-004 | **False positive — mark Not Reproduced.** Admin cannot decide approvals. `isApproverForDoc` is at `:216-229` and contains no `isAdmin()`; `:426` is `canManageClassAttendance()`. `allow update` on `approvals` (`:866`) requires `isApproverForDoc`, and `isManager()` does not accept `admin`. Admin can only **read** approvals (`:844`). |
| E3 | Deliverable 4 matrix | **Five Ops Lead cells are wrong** — `isFrontOffice()` is a four-role family (`frontoffice`, `opslead`, `ops_lead`, `frontofficelead`), not `frontoffice` alone (`isFrontDeskStaff()` is the single-role helper). Ops Lead is therefore **Authorized**, not Denied, for: `deskInquiries` delete (`:840`), `applications` read/list (`:591-592`), `applications` update (`:593`), `applications` delete (`:594`), `classes` update (`:616-624`). See OD-MKT-8. |
| E4 | §3.2 and OD-MKT-1 | `src/features/dashboard/marketing/MarketingOverview.jsx` **does not exist**. `MarketingOverview` is defined inline at `MarketingDashboard.jsx:20`, rendered at `:285`. |
| E5 | §2.2 | `docs/ARCHITECTURE.md` is **V2** (per its own H1), not "Version 3.2". 2026-10-07 is a change-log row date (`:624`), not a document version date. |
| E6 | §3.3 Stage 1 | Applications are written by **`FormSync.gs`** (Google Apps Script), not the Cloudflare Worker: `FormSync.gs:150` sets `status:"pending"`, `:170` POSTs to `.../documents/applications`. `worker.js` contains no `applications` reference at all. This also explains how creation works despite `allow create: if false` (`:595`). **The metric premise still holds** — applications really are written with `status:"pending"`. |
| E7 | §3.3 Stage 3 | "Class capacity & scheduling: Course Division Manager" is not implemented — see E3/OD-MKT-9. |
| E8 | §2.4 | Budget sites are `:522`, `:806`, `:833`, `:866`, `:935`, `:1075`; evaluation-error sites are `:497`, `:522`, `:707`, `:765`, `:787`, `:806`, `:812`, `:915` (update+delete), `:926`, `:965`. The audit's list was accurate but incomplete. `:866` is the **approvals update** rule, not a "shift adjustment gate". |
| E9 | Deliverable 7 roadmap | The P1 "Overdue Follow-Up Engine" is not Medium/no-dependency: it needs the new inquiry follow-up date field (OD-MKT-7). |

**Also add two missing findings** (classify and give IDs consistent with the audit's existing
scheme): the ungoverned Ops Lead admissions authority (OD-MKT-8) and the absent Division Manager
class-management authority (OD-MKT-9). Duplicate-inquiry handling — required by Objective E — is
still undocumented; either document it or record it explicitly as an unanswered gap.

---

## 3. Phase 1 scope

### 3.1 Task 1 — Bind the Marketing Dashboard to real branch and division context **(P0, do first)**

This is the **only** work in Phase 1 that overlaps a blocking P0 finding, so it happens before
any structural refinement.

- `MarketingDashboard.jsx:315` — `<WalkInInquiryTab division="courses" branchLabel="Kota Gorontalo" />`
  hardcodes both division and a branch **label**. Pass the authenticated user's
  `marketingBranchId` and their profile `division`, per OD-MKT-2.
- `AddSchoolModal.jsx:11-12` — `municipality` defaults to `"Kota Gorontalo"` and `district` to
  `"Kota Tengah"`. Note `schoolOutreachRepository.js:270` uses
  `rawSchool.branch || rawSchool.branchId || rawSchool.municipality || DEFAULT_BRANCH_ID` — so
  this default **determines the record's branch**. Bind it to the caller's branch instead.
- Keep the existing correct behaviour: `SchoolOutreachTab` already receives
  `branchId={marketingBranchId}` (`:303`) — do not regress it.
- Preserve the verified fail-closed property: a profile with no recognisable branch must still
  fail closed and must render an honest empty/denied state, **not** silent Kota Gorontalo data.
  Add explicit loading / empty / error / incomplete-profile states.

### 3.2 Task 2 — Fix the metric/navigation disconnect **(P0)**

Implement the ratified OD-MKT-1 option. The current defect: `leadCount` is computed from
`applications` (`MarketingDashboard.jsx:216-232`) while the card navigates to the `inquiries` tab
which renders `deskInquiries`.

Do not invent conversion percentages. Where a metric is not computable from real data, show it as
unavailable rather than guessing.

### 3.3 Task 3 — Class capacity correctness **(P1)**

`MarketingDashboard.jsx:268-274` sums `maxCapacity − studentIds.length` over **all** classes with
no status filter, so cancelled/completed batches contribute phantom "open seats".
`AvailableBatches.jsx:117` has the same flaw in its `totalCapacity` aggregate (individual rows
already compute availability correctly at `:90-91`). Exclude `cancelled` and `completed`.

### 3.4 Task 4 — Division-aware routing **(P1, gated on OD-MKT-2)**

`App.jsx:605` renders `<MarketingDashboard />` with no division prop. Route by the profile's
`division` (with the `all` toggle if ratified). Keep the change small and reversible; do not
restructure `App.jsx` routing beyond what this requires.

### 3.5 Task 5 — Ratified security corrections **(gated on OD-MKT-4/5/6 and OD-MKT-10)**

Apply only the ratified options. For each:

1. **Check the data first** — determine whether any live `users` document actually carries
   `role: "branch_manager"` (the client cannot mint one; `inviteSchema.js:5-16` excludes it).
   Report the count **before** changing anything. If any exist, stop and report rather than
   removing authority from real accounts. Read-only only: Firebase Console or an Admin SDK read.
2. **Remove the alias from the complete surface in §1.4** — all 7 rows, not just the two the Phase 0
   audit named. Row 2 (`cloudflare-worker/worker.js:474`) is a second, independent backend alias map
   and is easy to miss; rows 4–6 (`approvalGates.js`, `approvalsRepository.js`, the JS mirror) keep
   the alias alive client-side.
3. **Expect existing tests to fail, and update them deliberately.** These tests currently
   *encode* the removed-role authority: `securityRulesMatrix/operationalResources.test.js:452-453`
   asserts `branch_manager` is a manager and is staff; `roles.test.js:116` asserts
   `isManagerRole("branch_manager") === true`. **Replace** them with assertions that the role is now
   **rejected**, and state in the completion report which assertions changed and why. Do not simply
   delete assertions that still describe some other intended behaviour.
4. Add emulator coverage asserting the new behaviour: admin denied on the removed collections,
   `branch_manager` rejected as an approver, executive-role invites requiring the Director.
5. If a decision changes a documented contract, update the contract in the same change —
   `docs/specs/authorization-contract.md` records the known division-gate divergence at `:148`
   and designates itself as the change surface (`:102`).
6. **Do not erase documentation mentions** — §1.4 scope boundary. Add a record of the removal
   instead.
7. **Deployment:** per OD-MKT-11. Never deploy without explicit owner approval.

### 3.6 Task 6 — Documentation corrections

- MKT-P0-020: align the root `MYLIBERTY-AUTHORITATIVE-BLUEPRINT-v3.md` header status with the
  canonical `RATIFIED` status (or strip the status/version fields and label its summary
  explicitly non-authoritative). Do not touch the canonical blueprint.
- OD-MKT-3 Option A backfill, **if ratified**: dry-run first, produce a report of exactly which
  documents would be stamped, be reversible, and do not execute without explicit approval.
- Correct the Deliverable 6 wireframe's division/branch assumptions to match the ratified options.

### 3.7 Explicitly out of scope

- `payments`, `shifts`, `attendance`, `classAttendance`, `progressReports`, `kiosk*`, and
  `shiftAuditEvents` logic — the Phase 1 refinement touches none of them. Rules changes there
  are limited to the ratified OD-MKT-4 deletions and nothing else.
- The repository-wide `isExecutive()` refactor. **Not performed in Phase 1 at all** (OD-MKT-12 = A).
  Document it and record the measured stderr baseline per 1.5.
- **`classes` write rules.** Per 1.3 (OD-MKT-13), class create/delete/update authority is
  unchanged in Phase 1 — it requires a §26 amendment first. Class *reads* and the capacity
  calculation (§3.3) are in scope; class *write* predicates are not.
- Any wallet-affecting change. Zero budget: no paid service, no usage-based dependency, no new
  infrastructure. Prefer existing capabilities.
- Any WITA (`Asia/Makassar`) date-handling change without explicit note — those conventions are
  project behaviour.

---

## 4. Required method and constraints

- **Smallest safe change.** One architectural boundary at a time; no unrelated refactors; no
  rewrite of working components for visual consistency. `SchoolOutreachTab`,
  `SchoolOutreachList`, `GorontaloOutreachMap`, `SchoolVisitModal`, `OutreachProgressWidget` and
  `AvailableBatches` are assessed as well-structured and should be **extended, not replaced**.
- **Do not weaken rules to make UI work.** Client-side checks are not security controls.
- **Do not invent governance.** If a decision is unanswered and a task depends on it, stop and
  ask. Preserve open decisions as open (Blueprint §26).
- Keep hooks/constants/utilities in `.js`, components in `.jsx`; respect
  `react-refresh/only-export-components`; split files approaching ~1000 lines.
- Use existing primitives: `Card`, `Badge`, `useToast`, `useConfirm`, `DashboardShell`,
  `MobileDashboardShell`, existing date/normalisation helpers, existing repository patterns.
  There is no generic shared table component — do not create one.
- Handle loading / empty / failure / permission-denied / missing-legacy-field states on every
  data-driven screen. Older documents may lack newer fields; normalise on read.
- Keep Firestore cost in mind (free tier): prefer bounded/windowed queries over unbounded
  listeners; avoid duplicate listeners; review every new query for read volume and pagination.
- New logic with meaningful branching gets a test. Metrics get tests that assert the calculation,
  including the cancelled/completed exclusion.

---

## 5. Verification requirements

After **each** change, run a Level 1 regression check per
[`docs/audits/Light Regression Check Playbook/00-README.md`](../audits/Light%20Regression%20Check%20Playbook/00-README.md)
and append an entry to [`docs/audits/current/regression-log.md`](../audits/current/regression-log.md).

Required before declaring Phase 1 complete:

| Command | Requirement |
|---|---|
| `npm run test:rules` | Full emulator suite green, **plus** the new assertions from §3.5 |
| `npm test` | Green (baseline at HEAD `9dcb868`: 1,257 passed / 106 skipped) |
| `npm run lint` | 0 errors |
| `npm run typecheck` | 0 errors |
| `npm run build` | Succeeds (baseline: ~740 ms + PWA `sw.js`) |

**Inspect emulator stderr, not just the summary.** Budget-exhaustion and evaluation errors
currently appear on 6 and 11 sites respectively while the suite still reports green (see E8,
OD-MKT-12). Report any change in those counts — growth is a signal you have pushed a predicate
past the engine's 1,000-expression ceiling.

New tests to add, mapped to the audit's Deliverable 8:
1. Branch-context propagation: `MarketingDashboard` passes the authenticated `branchId` and
   `division` to every child; `AddSchoolModal` no longer defaults to a foreign branch.
2. Marketing role rules: may read/create/update `schoolOutreach` in-branch, denied cross-branch;
   denied deleting `schoolOutreach` and `visits`.
3. Rules per ratified decisions (admin deletion denied where ratified; `branch_manager` rejected
   as approver; executive-role invites require the Director).
4. Capacity engine: cancelled and completed classes excluded from open seats.
5. Metrics: each displayed figure traces to a stated collection and predicate.

---

## 6. Deliverables

1. A completion report at
   `docs/reports/marketing-dashboard/01-phase1-completion-report.md`, following the sibling
   convention (`operational-leader-dashboard`, `course-manager-dashboard`,
   `kindergarten-manager-dashboard`). Include: what changed and why; which ratified decision each
   change implements; the errata applied in Task 0; changed assertions and why; what was verified
   and how.
2. The Task 0 errata section appended to `00-phase0-audit.md`, and the two new findings added.
3. An updated `owner-decisions.md` with each answered decision marked `RATIFIED BY OWNER <date>`
   and any unanswered one left explicitly pending.
4. A regression-log entry.
5. An explicit list of anything left unverified, with the evidence needed to close it.
6. A deployment statement: what would need deploying, what was deployed (**only with approval**),
   and the production-parity status.

---

## 7. Stop conditions

Stop and ask the owner if:

- a ratified decision is missing, ambiguous, or contradicted by the repository;
- applying a decision would require removing authority from an existing account
  (e.g. a live `branch_manager` profile, or any `admin` whose access changes);
- a change would touch `payments`, `shifts`, `attendance`, `progressReports` or kiosk logic
  beyond the ratified deletions;
- a rules change appears to require weakening a rule to make a UI feature work;
- emulator stderr shows new budget-exhaustion sites on a legitimate write path;
- anything would need deployment, a new dependency, or any cost.

**Do not deploy rules, change production configuration, or invent scope. When in doubt, report
and stop.**
