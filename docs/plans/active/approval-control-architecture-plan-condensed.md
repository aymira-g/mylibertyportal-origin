# MyLiberty Portal — Approval & Control Architecture Task (condensed)

**Status:** Proposed. Depends on Blueprint v3.3, which is itself **PROPOSED, not owner-ratified**.
**Nature of task:** build a *framework* that can enforce governance decisions. It must not make those decisions.
**Owner decisions of 2026-10-07** are in §4.5. They were given in chat and are **not yet recorded in `docs/decisions/`**; treat them as owner-decided but unrecorded (blueprint amendment authority, G-001, is still OPEN).

---

## 0. Ground rules

**Formula**

```text
Role + Capability + Scope + Workflow State + Approved Delegation = Authorized Action
Risk Profile → Control Level → Required Workflow → Authorized Checker/Signer
```

**Never implement**
- `isAdmin` / `isExecutive` as a blanket permission.
- Risk as a permanent property of a role ("Director = high risk"). Risk belongs to the *action and its context*.
- "Director + Vice Director approve everything." Executive Dual-Control means Director = Strategic Control, Vice Director = Operational Control; complementary, not joint approval. Maker–Checker/Signer is a separate workflow concept.
- Seniority as authority. A senior role must not satisfy a domain gate just because it is senior.
- Any business authority for System Admin.

**Peer authorities.** Course Division Manager, Kindergarten Division Manager, Operational Leader (Ops Lead) and Instructor Leader are peer functional authorities for their own domains. They are not "mini-admins" and are not absorbed by the executive layer.

**Open governance (do not resolve by code):** G-004 (proposed), G-006, G-007, G-008, G-009, plus G-011 where relevant. Show `OPEN` wherever it applies.

**Method:** one coherent authority change at a time → verify → next. No rewrites. Do not touch or overwrite unrelated owner work; if a change conflicts with it, report the conflict instead of picking a side.

---

## 1. Phase 0 — Change safety (finish before any authorization change)

1. **Checkpoint.** Record branch, commit and `git status`. Create a recoverable checkpoint (branch or tag). Preserve uncommitted work.
2. **Baseline run.** Run `typecheck`, `lint`, `test`, `test:rules`, `build`. Record exact results and any existing failures.
3. **Inventory every existing gate.** For each: action, rule today, eligible roles **in the client helper**, eligible roles **in `firestore.rules`**, execution path, tests, legacy behavior. The baseline is evidence, not policy.
   - Start from `src/features/shared/approvalGates.js` (+ test), the `/approvals` block, `isApproverForDoc` and `isManager` in `firestore.rules`, `roles.js`, `firestoreRules.emulator.test.js`.
   - Known consumers to verify: `ShiftAdjustmentModal`, `shiftsRepository`, `PaymentModal`, `BatchModal`, `WalkInInquiryTab`, `useDashboardData`, `shared/index.js`.
4. **Blast radius.** For every proposed change list the UI, workflow, roles, rules, helpers, tests and legacy paths that depend on it. Check effect on Director, Vice Director, Division Managers, Ops Lead, Instructor Leader, Front Office, System Admin, Students/Parents. Do not change a shared helper based on one dashboard.
5. **Legacy search.** Search `branch_manager`, `Branch Manager`, `Branch Head`, `isAdmin`, `isAdminView`, `isExecutive`, `canApprove`, `eligibleApproverRoles`, role aliases. Classify each hit: Current authority / Legacy compatibility / Historical record / Migration path / Potential defect / Needs governance. Do not delete a legacy path merely because it looks obsolete; do not let one keep granting active authority the approved model prohibits.
6. **Rollback.** For each change write down: what changes, what could break, how failure is detected, how to revert.
7. **Safety loop per change:** typecheck/lint/build → targeted authorization test → adjacent workflow test → cross-role test → diff review. For rules changes add: `test:rules` → negative authorization tests → audit-path check.
8. **Exit criteria (all must be true):** baseline recorded · gates inventoried · blast radius mapped · legacy paths classified · checkpoint exists · rollback understood · test status recorded · unrelated changes protected.

---

## 2. Known starting facts (Observed in the uploaded copy — verify against current `main`)

These were found by the reviewer; confirm each before acting.

- **F1 — Client and backend disagree.** The client `canApproveGate` accepts Director, Vice Director and Division Manager for Ops Lead and Instructor Leader gates. `isApproverForDoc` in the rules accepts only the role itself for those gates. UI and backend can show different answers.
- **F2 — Admin bypass of approvals.** `createApprovalEnvelope` returns `null` for `admin` on every gate except `STAFF_ROLE_ELEVATION` (so no approval is created for discounts/refunds, new staff accounts, deactivation). A unit test locks this in. This conflicts with Blueprint §7 (Admin has no business authority and must not bypass workflows). Whether a direct write path exists must be checked in the rules. **Owner decided 2026-10-07: Admin is blocked from business actions (§4.5).**
- **F3 — Executives exempt from self-correction.** Director, Vice Director and Admin get no checker on `STAFF_SHIFT_SELF_CORRECTION` (payroll-affecting). **Owner decided: Director and Vice Director review each other's (§4.5).**
- **F4 — One `manager` role key.** Course and Kindergarten Division Managers share it, and legacy `branch_manager` is still aliased to it in `roles.js` and `firestore.rules`. Course-vs-Kindergarten separation therefore depends on the division scope check, not on the role.
- **F5 — Executives satisfy Division Manager gates in the rules,** and pass the branch check for every branch.

---

## 3. Control model (framework)

**3.1 Describe each action by:** domain · scope · financial impact · operational impact · academic impact · staff/access impact · data sensitivity · reversibility · strategic significance · policy-exception status · external/reputational impact. No invented numeric scores or thresholds.

**3.2 Scope vocabulary:** record-local · domain-local · branch-local · cross-functional · multi-branch · province-wide · organization-wide. Wider scope can raise the minimum control level.

**3.3 Control levels (proposed vocabulary — not in the Blueprint; keep out of canonical docs until the owner approves it)**

| Level | Meaning | Pattern |
|---|---|---|
| L0 Routine | Low-consequence normal work | Authorized role → execute |
| L1 Domain-controlled | Bounded domain activity | Maker → domain Checker/Signer → execute |
| L2 Material / cross-functional | Crosses domains or branches, or exceeds domain envelope | Maker → domain Checker where appropriate → Vice Director → execute |
| L3 Strategic / high-impact | Major, hard to reverse, or designated Director-level | Maker → domain Checker → Vice Director review where appropriate → Director Signer → execute |
| L4 Exceptional dual-sign | Only where governance explicitly requires both executives | … → Vice Director Signer → Director Signer → execute |

L4 is never a default. "Director-level" never bypasses domain review. The Vice Director is not a bottleneck and not a replacement for the domain leader.

**3.4 Control envelope = domain + scope + capability.** Do **not** attach a permanent control level to a role. The same domain can contain L0 to L3 actions.

**3.5 Gate schema.** Extend each gate to express: `primaryController`, `requiredDomain`, `requiredScope`, `controlLevel`, `escalationTarget`, `delegationAllowed`, `separationRequired`. **Seed values = today's `approverRole` for each gate, marked provisional.** Changing a gate's controller from today's value is an Owner Decision (G-007), not an implementation choice.

**3.6 Escalation modifiers (representable, no values):** cross-branch · province-wide · high financial impact · staff/access impact · sensitive personal data · hard to reverse · policy exception · strategic impact · external/reputational risk · conflict of interest · outside delegated scope. Governance can later say "if X, minimum level is Y" without rewriting the engine.

---

## 4. Authority rules

**4.1 Escalation, not substitution.**

```text
Domain Leader → within envelope? yes: decide / no: escalate to Vice Director
Vice Director → within delegated operational control? yes: decide / no: escalate to Director
Director      → within executive governance? yes: decide / no: owner / governance process
```

Never `Domain Leader OR Vice Director OR Director` as an automatic substitute.

**4.2 Interim rule until P3 (status-based escalation) exists:**
- Where the client is *more permissive than the rules* (F1, which includes peers approving peers, forbidden by Blueprint §5.2), align the client to the rules. This removes no real authority.
- Leave the rules' current executive access (F5) as is until P3. Add no new fallback and remove no backend authority before then.

**4.3 Delegation.** Owner decided 2026-10-07 that the **Vice Director is delegated as Acting Director**, but Blueprint §5.4.4 / §6.2 require it to be explicit and bounded, so it is **not** "Vice Director = Director". Bounds (§4.5): active only while the Director's leave status is approved; never for the Vice Director's own requests; never counts as a second signature when the Vice Director already signed; excludes changes to executive authority and role elevation (provisional minimum; owner may widen). A delegation record needs: source role, target role, capability, scope, effective from/until, reason, authorized by, and must be checked as active, covering the capability and scope, inside its window, and permitted by the workflow. It is a data-model change: follow change control, and note rule `get()` lookups are billed reads.

**4.4 Separation of duties by human identity.** Enforce `makerUid !== checkerUid` (and Maker ≠ Signer where independent review is required) using real user IDs, never role comparison. Same human → DENY and route per the approved escalation model.

**4.5 Owner decisions, 2026-10-07 (chat; unrecorded)**

- **Staff status changes (active, on leave, day off, etc.).** The **maker is always Front Office**, never the subject of the request; nobody else can create one. System Admin has no role (Admin is blocked from business actions). Front Office must not be treated as System Admin.
- **Checker/signer = the person's superior (Blueprint §5.3):** Front Office and Office Boy → Operational Leader; Instructors → Instructor Leader; division marketing → its Division Manager. Operational Leader, Course Division Manager, Kindergarten Division Manager and Instructor Leader are peers under the executives, so their status goes to an executive: Vice Director first, Director when the Vice Director is the subject. Director and Vice Director approve each other's.
- **Both executives unavailable:** an executive's status request is approved in this order: Course Division Manager → Kindergarten Division Manager → Operational Leader → Instructor Leader. The approver can never be the subject of the request (skip to the next). They approve the *status record only*; they gain no executive authority, and nobody acts as an executive while both are away (high-level items wait; break-glass runbook covers deadlock). Implementation note: an executive's record has no single branch or division, so the normal branch/division scope checks must be handled explicitly for these approvers.
- **Front Office has several shifts.** The maker for a Front Office member's own leave is another Front Office staff member at the same branch (any shift); the maker is never the subject. If no other Front Office staff member is available the request waits (no further fallback defined).
- **Absence = a recorded, approved status.** If the responsible approver is unavailable, the request escalates to the executives. Peers never cover peers.
- **Deactivation / termination** stays under the existing Director gate; this section covers temporary availability only.
- **Executive status entry (default, correct me if wrong):** by Front Office at the executive's registered home branch.
- **Executives' own shift corrections:** Director and Vice Director review each other's.
- **Cash discrepancy:** no discrepancy → Operational Leader. Discrepancy below Rp 20.000 → Operational Leader. From Rp 20.000 → Vice Director. From Rp 50.000 → Director. Boundaries inclusive; shortage and surplus both count by size; amounts **fixed in the rules** (not a database setting); review after one month. If the Operational Leader handled the drawer, they cannot approve it (escalate). Director on approved leave at Rp 50.000+ → Vice Director as Acting Director. This supersedes the earlier "no approval amounts" rule for this gate only. A cumulative per-cashier rule is not decided.
- **Vocabulary:** L0–L3 are internal engineering wording only; L4 is a reserved name with no code. Keep out of the Blueprint.

---

## 5. Gate reconciliation (provisional — not owner approval of G-006 / G-007)

| Gate | Approver today (code) | Candidate level (proposal only) |
|---|---|---|
| Placement level override | instructor leader | L1 |
| Substitute instructor | instructor leader (logged) | L1 |
| Whole-class cancel / reschedule | ops lead (logged) | L1 |
| Retroactive student attendance | ops lead | L1 |
| Student class / batch transfer | ops lead | L1 |
| Staff shift self-correction | dynamic by requester (executives exempt, F3) | L1; executives review each other (§4.5) |
| Student withdrawal / freeze | division manager (logged) | L1 / L2 by impact |
| Tuition plan change | division manager | L1 / L2 by materiality |
| Cash discrepancy | division manager | Per owner decision §4.5: Ops Lead / Vice Director (from Rp 20.000) / Director (from Rp 50.000). Replaces today's gate. |
| Discounts / refunds | director (VD eligible) | L2 / L3 by materiality |
| New staff account | director (VD eligible) | L2 / L3 by privilege |
| Staff role / permission elevation | director (VD eligible) | L3 candidate |
| Staff deactivation / termination | director (VD eligible) | L3 candidate |

Finance must distinguish normal collection, routine correction, material correction, refund/void, discount exception, price change and cash discrepancy. Normal tuition payment needs no executive. Monetary thresholds are governance decisions: do not invent them. Staff access changes (role elevation, privilege expansion, deactivation) are changes to *who can do what* and get stronger control than routine staff actions. Any change from the "today" column is an Owner Decision.

---

## 6. Backend enforcement and tests

`firestore.rules` is the authority; the UI is convenience. Make the client helper and the rules agree, and prove it with a **parity test** (every gate × every role: client answer equals rules answer).

Use the existing emulator harness (`npm run test:rules`).

| Test group | Must prove |
|---|---|
| Positive | Domain leader approves own-domain gate; Vice Director approves an authorized L2 action; Director approves an authorized L3 action |
| Negative cross-role | Course Mgr cannot approve unrelated operations; Ops Lead cannot approve academic; Instructor Leader cannot approve finance; Vice Director cannot approve arbitrary domain-local actions; Director has no unrelated operational CRUD; Admin has no business approval |
| Separation | Maker = Checker → deny; Maker = Signer → deny where independence required |
| Scope / state | Wrong branch, wrong division, wrong workflow state → deny |
| Delegation (only if built) | None, expired, wrong-scope → deny |
| Regression | Before/after recorded for each changed gate; legitimate roles still work; Students/Parents still scoped; legacy aliases create no unintended authority; UI denial is backed by backend denial; audit records still capture actor, state and approval data |

---

## 7. Phasing (one change set each; verify and checkpoint between)

1. **P0** Change safety (§1).
2. **P1** Evidence-based fixes: client/rules parity (F1); remove the Admin exemption (F2, owner decided) only after the executive account migration is complete; report on F4.
3. **P2** Gate schema fields (§3.5), seeded with today's values. No behavior change.
4. **P3** Status workflow (§4.5), status-based escalation (§4.1), cash-discrepancy tiers, executive self-correction review (F3).
5. **P4** Acting Director delegation, bounded as in §4.3 / §4.5.
6. **P5** Canonical docs.

Before each phase: second safety review. If a regression appears, **stop → preserve evidence → roll back or isolate → diagnose → reapply smaller.** Never layer more authority changes on a known regression.

---

## 8. Left unresolved on purpose (do not decide in code)

- Which actions are formally sensitive (G-006) and who approves each (G-007), beyond the owner decisions in §4.5; exact signer assignments for the other gates.
- Whether the Acting Director scope should be widened beyond the §4.3 minimum.
- Cumulative cash-discrepancy limit per cashier.
- Recording the §4.5 decisions in `docs/decisions/` and any Blueprint amendment (G-001 OPEN). G-008 is only partly answered.
- G-009 stays "partially resolved" until the cash decision is recorded. Do not reassign the gate before then.
- Fate of the `branch_manager` alias (F4): reconciliation item; historical records stay intact.
- **Cost note:** any new rule `get()` lookup is a billed Firestore read. Flag additions as Cost / Owner Decision.

---

## 9. Documentation

After implementation, update canonical docs for: Risk Profile, Control Level, Control Envelope, Primary Controller, Escalation Target, Delegation, Maker/Checker/Signer, Separation of Duties. Keep framework details out of the Blueprint. Do not make anything look more final than the governance state: `OPEN` stays visible, and the L0–L4 vocabulary stays labelled *proposed* until approved.

---

## 10. Done means

- [ ] Phase 0 baseline, checkpoint and rollback plan recorded
- [ ] All 13 gates inventoried with client-vs-rules comparison
- [ ] Executives no longer interchangeable approvers *by default*, within the §4.2 interim rule
- [ ] Domain leaders keep their authority; no role loses legitimate authority without an owner decision
- [ ] Schema supports primary controller, escalation, level, envelope and modifiers
- [ ] Parity, negative, separation, scope and state tests pass; delegation tests only if built
- [ ] Typecheck, lint, build, `test` and `test:rules` pass
- [ ] Diff reviewed for unintended permission expansion **and** removal
- [ ] §8 items remain explicitly unresolved
- [ ] Docs match the actual implementation state

**Final report (short):** (A) baseline: commit, tree state, pre-change test results, protected changes · (B) gate inventory · (C) what was built · (D) per-gate reconciliation: old / new / reason / governance status · (E) per security-sensitive change: old behavior, new behavior, roles, scopes · (F) exact commands run and actual results — not just "tests pass" · (G) items left unresolved · (H) remaining risks.
