# MyLiberty Portal: Advisor Opinion + Executor Brief (single file)

**Date:** 2026-10-04
**Reviewed:** `myliberty-portal-blueprint.md`, `myliberty-portal-blueprint-architecture-audit.md`, and a quick skim of the project zip.
**Author:** Claude (advisor/auditor). **Owner:** project owner, who has no coding experience.
**Status:** Advisory only. Nothing here is a locked decision.
**Limits:** I read the files and grepped the code. I did **not** run the app or the tests. Treat every "found in code" item as "please verify".

**How to read this file**
- **Part 1** is my opinion and findings (written for the owner, in plain language).
- **Part 2** is the brief for the executor/coder agent. Items marked **[OWNER]** are owner decisions. Items marked **[DEFAULT]** are only my recommendations. The executor may disagree, but must give a reason and a better option.
- **Part 3** lists business rules already decided and the suggested order of work.

---

# Part 1: Advisor Opinion

## 1.1 Overall verdict

- The **blueprint** is a solid map of the business: 4 branches, 2 divisions, the role chart, the 5-stage registration flow.
- The **architecture audit** has good principles, but it is too big for a free-tier project with a non-coder owner, and it treats some things as new that already exist in the code.

**Keep from the audit:**
- Reporting line is not the same as permission.
- The UI is never the security boundary.
- Report differences first, change code later.

## 1.2 Findings

| ID | Severity | Finding | Recommendation |
|---|---|---|---|
| F1 | High | The audit proposes Maker-Checker-Signer as a new idea. The repo already has a maker-checker registry (`src/features/shared/approvalGates.js`, 13 gated actions), `approvalsRepository.js`, `ApprovalInbox.jsx`, `usePendingApprovalsCount.js`, and security-rule tests (`securityRulesMatrix/approvals.test.js`, `firestoreRules.emulator.test.js`). Following the audit literally risks building a second approval system. | Extend the existing system. Do not build a parallel one. |
| F2 | Medium | Three-stage approval is too heavy for a 4-branch English course. It slows the front office for little safety gain. | Keep two-party (request, then approve) everywhere, except where decided in 1.3. |
| F3 | Medium | Director and Vice Director do not exist as roles in the code. Existing roles in `roles.js`: admin, manager, instructorleader, instructor, frontoffice, opslead, marketing, officeboy, student, parent. | Add them deliberately (see 1.3), not by accident. |
| F4 | Medium | The audit's proposed 9-state student lifecycle clashes with statuses already in the code (inquired, visited, placement, tested, enrolled, pending, approved, rejected, active). | Map the blueprint's 5 stages onto existing statuses. No parallel status system. |
| F5 | Low | The audit lists about 50 open questions. Many are already answered by owner decisions (see Part 3). | Give the answered ones to the executor so it doesn't re-ask. |
| F6 | Low | The audit file is messy at the end. After its "final position" section, an older copy of "13. Required Next Audit" through "16. Final Audit Position" is pasted in again, without the approval-related steps. | Delete the older copy. It could confuse the executor. |
| F7 | Low | The audit's requested deliverable (matrices A to H) is large and will burn time and tokens. The repo already has `docs/specs/authorization-contract.md` and `docs/decisions/2026-09-24-multi-branch-data-isolation.md` (not read in detail). | Compare against those first. Ask only for a short gap list. |
| F8 | **High (urgent)** | The zip contained a real Firebase service-account admin key (`serviceAccountKey.json`) and the `.env` file. They are gitignored, so probably not on GitHub, but they were in the shared zip. | Remove both files before any future upload. If the key was shared with any other tool or agent, create a new one in the Firebase console (Project settings, Service accounts) and delete the old one. This is free. |
| F9 | Medium | `APPROVAL_ROLES` in `approvalGates.js` uses `instructor_leader` and `ops_lead`, but the canonical roles are `instructorleader` and `opslead`. | Executor to verify whether approver matching always goes through `normalizeRole()`. Could be a harmless leftover or a real bug. |
| F10 | Medium | `firestore.rules` (about 761 lines) uses `isAdmin()` widely as a blanket "can do almost everything" shortcut. | See 1.3. Renaming admin does not fix this by itself. |

## 1.3 Director / Vice Director and role elevation

**Owner's position (as I understood it):**
1. Staff role elevation is the one action worth stricter control, which is why Director and Vice Director are wanted.
2. Director and Vice Director are two separate roles (otherwise there is no point adding them).
3. Approvals stay two-party. The Vice Director is a backup signer so nothing blocks when the Director is away.
4. The existing admin account's role becomes Director, so Director and Vice Director cross-check each other and admin is no longer over-powered.

**My opinion:** I agree with 1 to 3. On 4, I'd challenge the wording: renaming admin to Director only moves the over-power problem. The Director would inherit every blanket `isAdmin()` shortcut (F10). The cross-check only helps if those shortcuts are removed for sensitive actions and those actions go through approval.

**Update on the Vice Director's scope (owner's challenge, accepted):** my earlier "read-only Vice Director" was my own guess. The blueprint does not support it, and it describes both executive roles the same way. What the Vice Director may see and what it may change are separate questions, and the executor must answer them from evidence (D1). My one adjustment is that "limited write" should start at zero and grow only with a named business task, because the blueprint describes oversight and strategy roles, and broad write power would bring back the over-power problem.

**Risks to plan for:**
- **Deadlock.** With only two executives, a departure or lost login blocks the cross-check. This needs a written break-glass procedure (manual, in the Firebase console, logged).
- **The strongest power is outside the app.** Whoever owns the Firebase project (now the office account) can change data and rules directly in the console, bypassing every in-app check. Keep that login to one or two trusted people.
- **A real person must hold each role.** The actual company Director should get the Director account. The current admin holder would hand it over and would need another way to test (a dev quick-switcher exists in the repo).
- **Bootstrapping.** The very first Director account can't be approved by anyone, so it is a one-time manual step. Write it down.

---

# Part 2: Executor Brief

**Type:** Phase 0, **report only**. No code, rules, or data changes in this phase.

Read first: `AGENTS.md` (working rules), `docs/specs/authorization-contract.md`, `docs/decisions/2026-09-24-multi-branch-data-isolation.md`. If anything here conflicts with them, report the conflict. Don't pick a side silently.

## 2.1 Goal in plain words

The owner wants two new top-level roles, **Director** and **Vice Director**, so the powerful "admin" account stops being a single all-powerful login. Staff role elevation (promoting someone to a more powerful role) becomes the sensitive action that Director and Vice Director control and cross-check.

## 2.2 Owner decisions

- **[OWNER]** Director and Vice Director are **two separate roles**. A single shared "executive" role is not wanted.
- **[OWNER]** Approvals stay **two-party** (maker, then signer), not three. The Vice Director acts as a **backup signer**.
- **[OWNER]** The existing **admin account's role is changed to Director**, so Director and Vice Director cross-check each other.
- **[OWNER]** Two-party maker-checker is enough for all other sensitive actions (already built for 13 actions, see F1).
- **[OWNER]** Not ready to accept a "read-only Vice Director". What the Vice Director may SEE and what it may CHANGE are two separate questions, to be derived from the blueprint and the current authorization contract, not assumed. The owner can imagine province-wide read + selected approve/sign + limited write, but wants evidence first.
- **[OWNER]** Constraints: no budget (stay on free Firebase), plain-language explanations, token-efficient, keep options open.

## 2.3 Recommended design (all **[DEFAULT]**, argue freely)

**D1. Role split: answer SEE, SIGN and CHANGE separately for each role.** The blueprint lists Director and Vice Director together as "strategic leadership, province-wide analytics, and multi-branch performance oversight" and does not distinguish them, so any difference between the two must be justified by evidence (blueprint, `authorization-contract.md`, or what the code does today).
- **SEE:** my starting default is that the Vice Director sees what the Director sees (province-wide). State explicitly, per data type, whether executives see it: Kindergarten data, parent contact details, payments, staff records, approval and audit logs.
- **SIGN:** the owner decided the Vice Director is a backup signer. Starting default: Director is the primary signer and the Vice Director signs the same actions when needed. List exactly which of the 13 gated actions (plus role elevation) the Vice Director may sign. *Open: only role elevation, or others too?*
- **CHANGE (write):** starting default is **none**. Add a write only with a named business task, evidence for it, and, if it is sensitive, routing through the approval flow. The owner is open to "limited write", so I'm not ruling it out. A broad write power would just recreate a second admin.
- **Check:** if the answers end up nearly identical for Director and Vice Director, say what actually distinguishes the two roles (for example "Director has final say, Vice Director is the cross-check and backup"). The owner has chosen two separate roles, so don't reverse that. Just state the reason.

**D2. Rename approach.** Pick one and say why:
- (A) Alias `admin` to `director` via `LEGACY_ROLE_ALIASES` / `normalizeRole()`, then strip the blanket `isAdmin()` shortcuts for sensitive actions.
- (B) Add `director` as a new role, keep a much weaker technical `admin`, and migrate the account.
*My lean: (A) is cheaper, but only if the shortcut-stripping step actually happens.*

**D3. Cross-check rules for role elevation.**
1. Maker is not the signer.
2. Nobody can sign a request about their own role.
3. Either Director or Vice Director may sign when the target is an ordinary staff role.
4. Changes to the Director or Vice Director roles must be signed by the *other* one. If the maker would also be the only possible signer, block it in-app and use break-glass (D5).

**D4. Server-side enforcement.** The final "apply the new role" write must be rejected by Firestore rules unless a signed approval record exists and D3.1 to D3.4 hold. UI buttons are not a security control. **Check whether this is achievable with rules only on the free Spark plan** (no paid backend functions). If it isn't, report the cheapest honest alternative and its limits.

**D5. Break-glass.** Propose a short manual recovery procedure (Firebase console, logged in a file under `docs/`). Also recommend how many people should hold the Firebase console login.

**D6. Scope of the stricter flow.** Elevation to **admin-level / Director / Vice Director** is the only candidate. Everything else stays two-party. *Open: should creating or deactivating admin-level accounts also be covered?*

## 2.4 Open questions for the executor to argue

- Rename admin to Director (D2-A), or add Director as a new role with a weaker technical admin (D2-B)?
- Which blanket `isAdmin()` shortcuts should be removed first?
- What should the Vice Director SEE, SIGN and CHANGE (D1)? Is any write justified, and for what named task?
- Which of the 13 gated actions may the Vice Director sign, beyond role elevation?
- What distinguishes the Vice Director from the Director if the answers above are close?
- Does the stricter flow also cover creating or deactivating admin-level accounts?
- Can rules-only enforcement work on the free plan?
- Is F9 (`instructor_leader` / `ops_lead` mismatch) a real bug or harmless?

## 2.5 Deliverable (Phase 0): one short report, max about 2 pages

1. **Current vs. proposed:** a small table of roles, who can currently sign `STAFF_ROLE_ELEVATION` (currently `approverRole: admin`, `mode: blocking`, `locked: true`), and which blanket admin powers exist in `firestore.rules` (list the rules and collections only, no need to rewrite them).
   **Plus a SEE / SIGN / CHANGE table (D1)** with one row per data type or action and one column pair each for Director and Vice Director, with a short evidence note per row (blueprint, authorization contract, or code).
2. **Your answers to the open questions in 2.4**, each with a reason. Disagreement is welcome.
3. **Gap list:** ID, severity, evidence (file and line), recommended fix, risk. Keep it to what this feature needs.
4. **Proposed Phase 1 plan** as small, separately testable steps. Expected shape (reorder if you have a reason): (1) add roles + tests, (2) remove blanket admin shortcuts one collection at a time, (3) rewire the `STAFF_ROLE_ELEVATION` approval + rules + emulator tests, (4) account migration, (5) break-glass doc.

## 2.6 Non-goals and guardrails

- No changes to rules, roles, data, or `docs/ARCHITECTURE.md` in this phase (that file needs explicit owner approval per `AGENTS.md`).
- Don't rename existing statuses or roles beyond what D2 needs.
- Don't add three-stage approval anywhere beyond D6.
- Don't open, print, copy, or commit `.env` or `serviceAccountKey.json`.
- Keep existing tests passing. Extend the current test setup, don't build a parallel one.
- When reporting to the owner, use plain language and explain any technical term once.

---

# Part 3: Reference

## 3.1 Business rules already decided (don't re-ask)

- No budget. Stay on free Firebase.
- An instructor who teaches both Course and Kindergarten has two accounts, one per division (interim, revisit later).
- Marketing must not see any Kindergarten data.
- Company-wide corporate events are visible to every branch. Branch-specific events are visible only to that branch's staff. Admin currently sees everything. This is an example of the blanket power in F10, so flag it, don't change it.
- Managers (not only admin) may create and edit company-wide corporate events.

## 3.2 What to keep from the original plan

- The business blueprint as the reference model for organization and registration flow.
- `branchId` and `division` as the main scoping fields.
- "Enforce business authority, not the org chart."
- Report-first workflow: audit, then plan, then code in small tested steps.

## 3.3 Suggested order of work

1. Clean the audit file (F6) and remove secrets from future zips (F8).
2. Executor does Phase 0 from Part 2: a short report and gap list, no code.
3. Owner and advisor review the report and decide what to approve.
4. Executor implements in small steps, each with tests.
