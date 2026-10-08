# MyLiberty Portal — Approval Gate Binding Hardening
## Executor Implementation Brief — Instructor Leader Phase 2, Step 1

You are the implementation agent. Work from the **current repository state**, not from assumptions or historical plans.

**Origin:** During Phase 2 scoping for the Instructor Leader dashboard, a boundary probe of the `approvals` collection proved that the ratified gate registry is enforced **client-side only**. This task closes that gap.

---

# 1. Governing Baseline — READ FIRST

1. `docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md` — §15 (Maker–Checker), §26 (G-006, G-007, G-008), Principle 15 and the "capabilities are not interchangeable" rules.
2. `docs/decisions/2026-10-07-resolution-of-governance-questions-g001-g011.md` — the ratified approver table (§ G-006 / G-007).
3. `firestore.rules` — the `approvals` block, `isApproverForDoc`, `isApprovedShiftCorrection`, `isApprovedRoleElevation`.
4. `src/features/shared/approvalGates.js` — `GATED_ACTIONS` and `eligibleApproverRoles` (the authoritative registry).
5. `src/features/shared/securityRulesMatrix/securityRulesMatrix.helpers.js` — the hand-mirrored rule simulator that must stay in sync.
6. `docs/audits/Light Regression Check Playbook/04-domain-playbooks-branch-data-rules-worker.md` §17 — the four-part rule-change validation suite.
7. `docs/audits/current/regression-log.md` — the escalation record for this finding.

---

# 2. Current-State Finding (proven, not inferred)

`firestore.rules` never binds an approval's `actionId` to its permitted `approverRole`. `isApproverForDoc` validates only the document's own `approverRole` field plus branch matching, so **whoever writes the envelope chooses who may approve it**.

Emulator evidence against the real rules (temporary probe, since removed):

| Probe | Result |
|---|---|
| Instructor Leader decides `actionId: CASH_DISCREPANCY`, `approverRole: instructorleader` | **ALLOWED** |
| Instructor Leader decides `actionId: RETROACTIVE_STUDENT_ATTENDANCE`, `approverRole: instructor_leader` | **ALLOWED** |
| Division Manager decides `actionId: CLASS_CANCELLATION_OR_RESCHEDULE`, `approverRole: manager` | **ALLOWED** |
| Self-approval (control) | correctly DENIED |

The gaps in detail:

1. **Create path** — `allow create` constrains `approverRole` only for `STAFF_ROLE_ELEVATION` and `DISCOUNT_OR_REFUND`. Any staff member may create an envelope naming any other `actionId` with any `approverRole`.
2. **Decision path** — `isApproverForDoc` ignores `actionId` entirely.
3. **Consumption path** — `isApprovedShiftCorrection()` (`firestore.rules:215`) checks `actionId`, `status`, not-yet-applied and `payload.shiftId`, but **never `approverRole`**. It gates the `shifts` update path, so a wrong-role approval is not merely a bad audit record — it is applied to the shift document. (`isApprovedRoleElevation()` at :225 *does* validate `approverRole in ['director','vice_director']` at :236–237, and is therefore already protected.)
4. **Everything else** — `isActionOperational()` is exported from `approvalGates.js` but has **no production caller**, so "blocking" mode is advisory; for the remaining gates the impact is audit-trail misattribution.

This is **pre-existing**, not introduced by the Instructor Leader Phase 1 change.

---

# 3. Objective

Make the ratified gate registry enforceable at the backend, without weakening any existing clause and without breaking legitimate routing.

**Target invariant:**

> An approval envelope can be decided only when the pair (`actionId`, `approverRole`) is permitted by the ratified registry, the decider holds that approver role, the decider is on the envelope's branch, and the decider is not the requester.

---

# 4. Design

## 4.1 The binding table

Single source of truth, derived from `GATED_ACTIONS[*].eligibleApproverRoles`. Legacy alias spellings are accepted so existing documents keep working; canonical values remain preferred.

| `actionId` | Permitted `approverRole` values |
|---|---|
| `STAFF_ROLE_ELEVATION` | `director`, `vice_director` |
| `NEW_STAFF_ACCOUNT` | `director`, `vice_director` |
| `STAFF_DEACTIVATION` | `director`, `vice_director` |
| `DISCOUNT_OR_REFUND` | `director`, `vice_director` |
| `TUITION_PLAN_CHANGE` | `manager`, `branch_manager`, `director`, `vice_director` |
| `STUDENT_WITHDRAWAL_OR_FREEZE` | `manager`, `branch_manager`, `director`, `vice_director` |
| `CASH_DISCREPANCY` | `opslead`, `ops_lead`, `manager`, `branch_manager`, `vice_director`, `director` |
| `PLACEMENT_LEVEL_OVERRIDE` | `instructorleader`, `instructor_leader` |
| `SUBSTITUTE_INSTRUCTOR` | `instructorleader`, `instructor_leader` |
| `CLASS_CANCELLATION_OR_RESCHEDULE` | `opslead`, `ops_lead` |
| `RETROACTIVE_STUDENT_ATTENDANCE` | `opslead`, `ops_lead` |
| `STUDENT_CLASS_TRANSFER` | `opslead`, `ops_lead` |
| `STAFF_SHIFT_SELF_CORRECTION` | `opslead`, `ops_lead`, `manager`, `branch_manager`, `director`, `vice_director` |
| `STAFF_STATUS_CHANGE` | `opslead`, `ops_lead`, `instructorleader`, `instructor_leader`, `manager`, `branch_manager`, `vice_director`, `director` |

## 4.2 Enforcement points (all three) — as implemented

1. **Decision** — the `approvals` `allow update` rule adds `('approverRole' in resource.data) && gateAllowsApprover(...)`, placed **last** so the chain is evaluated only after the cheaper conditions pass. It is deliberately **not** inside `isApproverForDoc`, because that helper also backs the read path, and the binding only needs to gate decisions and consumption.
2. **Create** — the `approvals` create rule requires a valid pair. The pre-existing Director / Vice-Director guard for `STAFF_ROLE_ELEVATION` and `DISCOUNT_OR_REFUND` is **retained** even though `gateAllowsApprover` now subsumes it exactly; it is kept as an explicit, auditable governance statement rather than optimised away.
3. **Consumption** — `isApprovedShiftCorrection` validates `approverRole` against an **inlined** permitted set for its own gate. The actionId is already pinned there, so running the generic 14-clause chain would be wasteful and pushes the rule against the engine's expression budget.

**Fail closed:** an `actionId` absent from the table is denied on create and undecidable. No gate in the ratified registry routes to `frontoffice` or `admin`, so unknown pairs are not grandfathered.

### 4.2.1 Rules-engine expression budget (discovered during implementation)

The rules engine caps a request at **1000 evaluated expressions**. Measured against the emulator:

| Ruleset | `maximum of 1000 expressions` log lines |
|---|---|
| HEAD (pre-Phase-2) | 69 |
| With this change | 101 |

This is **pre-existing pressure, not introduced here**. The heaviest rule is the `approvals` create clause, which already evaluates a 14-element `isStaff()` list plus the executive guards. Disabling the new create-path check did **not** reduce the count (101 → 101), which shows the log lines come from deny-path exploration — including the five new deny-path tests this task adds — rather than from one clause. Every allow-path operation passes, so no legitimate flow is known to be falsely denied.

Mitigations applied: the chain short-circuits (an earlier map-of-lists version exhausted the budget outright and was replaced), it is placed last, and it is inlined where the actionId is already pinned. **Residual risk recorded in §7.**


## 4.3 Non-goals (explicit)

- **Per-requester dynamic escalation stays client-enforced.** `getSelfCorrectionApprover` and `getStaffStatusApprover` resolve *which* eligible role applies (e.g. a Manager's own correction escalates to the Director). The rules enforce the coarse `eligibleApproverRoles` set. Replicating the dynamic chain in rules would require additional `roleOf()` lookups, and the ratified registry itself permits the whole set. This residual is documented, not silently ignored.
- No new collection, and no data migration.
- **One client constant changed, deliberately.** `submitStaffOnboardingRequest` wrote `approverRole: "admin"` for `NEW_STAFF_ACCOUNT`. No `isApproverForDoc` branch matches `admin`, and `canApproveGate` rejects it too, so the ticket was created but could **never** be decided — staff onboarding approval was already broken. It now writes `"director"`, matching ratified G-007. This repairs a broken governed workflow and satisfies the new create-path binding.
- No production deployment.

---

# 5. Test Changes

## 5.1 Two existing fixtures encode the vulnerable expectation

Both use `DISCOUNT_OR_REFUND` + `approverRole: manager` as a *generic manager-addressed ticket*. That pair is not permitted by the registry (`DISCOUNT_OR_REFUND` is Director/Vice Director only). Retarget both to `TUITION_PLAN_CHANGE`, which is genuinely manager-primary and blocking, so the tests keep testing their stated intent ("manager approvals route to the manager of that branch"):

- `src/features/shared/firestoreRules.emulator.test.js` — `APPROVAL_KOTA`
- `src/features/shared/securityRulesMatrix/approvals.test.js` — `pendingApproval` in "Approval Decision Contract (C2)"

Each change must be documented in the completion report as a deliberate correction of a test that encoded vulnerable behaviour, not as a silent accommodation.

## 5.2 New hardening assertions

- Emulator: a wrong-role decision on each of the three probed bypasses is **DENIED**; the two retargeted manager tickets still succeed; legacy alias spellings still succeed.
- New `src/features/shared/instructorLeaderApprovalProbe.test.js` asserting the **hardened** behaviour, matching the `opsLeadApprovalProbe.test.js` precedent (same shape: backend simulation + frontend gate check).

---

# 6. Acceptance Criteria

- [ ] A wrong-role decision is denied for `CASH_DISCREPANCY`, `RETROACTIVE_STUDENT_ATTENDANCE`, `CLASS_CANCELLATION_OR_RESCHEDULE`, and `PLACEMENT_LEVEL_OVERRIDE`.
- [ ] `isApprovedShiftCorrection` rejects an approval whose `approverRole` is not permitted for `STAFF_SHIFT_SELF_CORRECTION`.
- [ ] Legitimate routing still works for every gate, including legacy alias spellings (`instructor_leader`, `ops_lead`, `branch_manager`).
- [ ] Self-approval remains impossible.
- [ ] Branch isolation is unchanged.
- [ ] No existing clause is weakened; the diff is additive plus the two documented fixture retargetings.
- [ ] `securityRulesMatrix` projection and `firestore.rules` cannot silently drift.
- [ ] `npm run test:rules`, `npm test`, `npm run lint`, `npm run typecheck`, `npm run build` all pass.
- [ ] Level 1 Light Regression Check recorded, and the escalation in `docs/audits/current/regression-log.md` marked resolved.
- [ ] **No production deployment performed.** Deployment is listed for the owner, including the pre-deploy legacy-ticket check in §7.

---

# 7. Risks & Deployment Notes

1. **Legacy tickets with unlisted pairs become undecidable.** Fail-closed is the intended posture, but before deploying the owner should confirm no *pending* production ticket carries an `actionId`/`approverRole` pair outside the table. A stuck pending ticket cannot corrupt data (it can never satisfy `isApprovedShiftCorrection`, which requires `status == 'approved'`), but it would block that workflow until re-raised correctly.
2. **Documents with no `approverRole`** were previously decidable by a manager via the `'manager'` default; they now require a valid pair. Same fail-closed rationale.
3. Rules-only change (plus one client constant): **zero Firestore read/write cost**, no index change.
4. **Residual risk — the approvals rules sit near the engine's expression ceiling** (§4.2.1). Exhaustion is observed only on deny paths today and no allow-path test fails, but any future addition to the `approvals` create/update clauses could tip a *legitimate* request into a false deny. Recommended follow-up: a dedicated slim-down of the heaviest rules, tracked as its own task rather than folded into this one.
