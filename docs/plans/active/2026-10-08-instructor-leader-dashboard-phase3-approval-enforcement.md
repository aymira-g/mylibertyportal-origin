# MyLiberty Portal — Approval Enforcement (Phase 3)
## Executor Implementation Brief — Instructor Leader Phase 3, Step 1

You are the implementation agent. Work from the **current repository state**, not from assumptions or historical plans.

**Origin:** audit-ledger finding **H5** — *"Blocking approval gates never block"* — recorded as **still open** in [`docs/audits/audit-log.md`](../../audits/audit-log.md) and explicitly deferred there as *"open for debate, not decided here"*.

**This phase is decision-gated.** Implementation scope is set by [`docs/reports/instructor-leader-dashboard/owner-decisions.md`](../../reports/instructor-leader-dashboard/owner-decisions.md). **Do not implement enforcement for a gate until the owner has ratified its option.**

---

# 1. Governing Baseline — READ FIRST

1. `docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md` §15 (Maker–Checker), §26 (G-006, G-007), Principle 15.
2. `docs/decisions/2026-10-07-resolution-of-governance-questions-g001-g011.md` — the ratified approver table.
3. `docs/reports/instructor-leader-dashboard/owner-decisions.md` — **the decisions that scope this work**.
4. `src/features/shared/approvalGates.js` — the ratified registry and current `mode` values.
5. `firestore.rules` — `isApprovedRoleElevation` (:268) and `isApprovedShiftCorrection` (:252) are the two existing enforcement patterns to copy.
6. `docs/audits/Light Regression Check Playbook/04-domain-playbooks-branch-data-rules-worker.md` §17 — four-part rule-change validation.
7. `docs/plans/active/2026-10-08-instructor-leader-dashboard-phase2-approval-gate-binding.md` — the immediately preceding, closely related change.

---

# 2. Current-State Finding (established, with evidence)

`isActionOperational()` — the helper designed to make `mode: "blocking"` real — has **no production caller** (`approvalGates.js:819`; re-exported at `shared/index.js:55`; referenced only by tests). Of the 11 gates the registry marks blocking:

| Verdict | Gates |
|---|---|
| ENFORCED (rules consume the envelope) | `STAFF_ROLE_ELEVATION`, `STAFF_SHIFT_SELF_CORRECTION` |
| ADVISORY (recorded, but the write proceeds) | `DISCOUNT_OR_REFUND` (deliberate), `CASH_DISCREPANCY`, `PLACEMENT_LEVEL_OVERRIDE`, `NEW_STAFF_ACCOUNT` (flow-only) |
| NOT WIRED (no producer at all) | `STAFF_DEACTIVATION`, `TUITION_PLAN_CHANGE`, `RETROACTIVE_STUDENT_ATTENDANCE`, `STUDENT_CLASS_TRANSFER`, `STAFF_STATUS_CHANGE` |

The UI renders a rose **"blocking"** badge for these gates today, which misleads staff into believing a block exists. Full per-gate evidence and citations are in the owner-decision register.

---

# 3. Objective

Make the system's *stated* control level match its *actual* control level, gate by gate:

> Either the guarded write is genuinely refused without an approved envelope, or the gate is honestly labelled `logged` and the UI stops claiming a block.

Both outcomes are acceptable. A registry, a UI badge and a governance document asserting a block that does not exist is not.

---

# 4. Implementation Approach (per ratified option)

## 4.1 Option A — enforce at the write path

Copy the existing pattern exactly:

```text
1. Add a rules helper  isApproved<Gate>(<subject ids>, approvalId)
     - reads the approval doc
     - asserts actionId, status == 'approved', not already applied
     - asserts approverRole is permitted via gateAllowsApprover(actionId, approverRole)
     - asserts the payload identifies the same subject (student/class/shift/user)
2. Gate the guarded write on a marker field (e.g. appliedFromApproval / approvedOverrideRef)
   whose only permitted change is alongside a valid approved envelope.
3. Record the proposal → approval → apply chain so it is auditable.
```

**Hard constraints:**
- Never weaken an existing clause. Changes must be additive.
- Keep legacy alias spellings working (`instructor_leader`, `ops_lead`, `branch_manager`).
- **Watch the rules engine's 1000-expression budget.** `approvals` already reaches it on deny paths (69 log lines at HEAD). Prefer inlining a fixed permitted set where the `actionId` is already pinned rather than calling the generic chain, and place new conditions **last** so they evaluate only after cheaper checks. Measure before and after with the emulator and report both numbers.
- Where the guarded write cannot be attributed by rules (array append, or a write indistinguishable from ordinary enrollment), **stop and return to the owner** rather than inventing a bypass. `PLACEMENT_LEVEL_OVERRIDE` and `STUDENT_CLASS_TRANSFER` are the two known cases and may need a small data-model addition first.

## 4.2 Option B — relabel honestly

- Change `mode` in `GATED_ACTIONS` from `blocking` to `logged`.
- Update `APPROVAL_MODES`-derived UI copy and any document that describes the gate as blocking.
- Keep the existing visibility mechanisms (e.g. the payment `approvalStatus: "pending"` badge).
- No rule change. This is the cheaper and lower-risk option wherever notify-first is deliberate.

## 4.3 Option C — track, do not build

- Record the divergence in the register and the audit ledger so it is visible, and add nothing to the registry.
- Do **not** leave it silently unrecorded.

---

# 5. Tests Required

- **Emulator** (`npm run test:rules`): for each newly enforced gate — allowed with an approved envelope, denied without one, denied with a *wrong-role* approval, denied when the envelope names a different subject, denied when replaying an already-applied envelope.
- **Rules mirror** (`securityRulesMatrix.helpers.js`): keep in sync; the existing drift guard in `instructorLeaderApprovalProbe.test.js` must still pass.
- **Registry**: a test asserting that every gate's declared `mode` matches whether enforcement actually exists, so this class of drift cannot silently return.
- **Level 1 Light Regression Check** per the playbook, recorded in `docs/audits/current/regression-log.md`.

---

# 6. Acceptance Criteria

- [ ] Every blocking gate is either ENFORCED or has had its `mode` corrected to `logged` — no gate claims a block it does not deliver.
- [ ] A registry test fails if a future gate is added as `blocking` without enforcement.
- [ ] No existing rule clause weakened; no write path made less restrictive.
- [ ] Legacy alias spellings still work; self-approval still impossible; branch isolation unchanged.
- [ ] `npm run test:rules`, `npm test`, `npm run lint`, `npm run typecheck`, `npm run build` all pass.
- [ ] The rules-engine expression-budget count is measured before and after and reported.
- [ ] `docs/audits/audit-log.md` finding **H5** is updated to its true status, and the register records what was decided.
- [ ] **No production deployment performed**; deployment steps and the pre-deploy pending-ticket check are listed for the owner.

---

# 7. Non-Goals

- Do not redesign the approval architecture or add a new approval service.
- Do not build teacher evaluations, shift-visibility projections, or kindergarten leader tooling (separate decisions in the register).
- Do not change any gate's mode without an owner decision.
- Do not deploy.
- Do not use this task to "tidy" unrelated rules or reformat files — keep the diff reviewable.
