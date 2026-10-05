# MYLIBERTY Baseline Remediation Plan

**Date:** 2026-10-01
**Baseline audit (do not edit):** `docs/audits/current/2026-10-01-whole-portal-baseline-audit.md`
**Advisor assessment (do not edit):** `docs/audits/current/2026-10-01-baseline-audit-advisor-assessment.md`
**Baseline commit:** `2a7c7ac`
**Intended location in repo:** `docs/audits/current/2026-10-01-baseline-remediation-plan.md`
**Audience:** the coder/executor agent. The project owner has no coding experience, so every report back must be in plain language (see Section 2).

---

## 0. How to read this plan

- Everything marked **Recommendation** is open. If you have evidence for a better approach, say so in your report and explain why. Do not silently follow a recommendation you think is wrong, and do not silently deviate from it either.
- Everything marked **Must** is a requirement, because it protects security, money, or attendance data.
- **Line numbers are from commit `2a7c7ac`.** The Kindergarten / division-scope work was merged and is live since then, so lines have drifted. Locate code by function and rule name, not by line number.
- The baseline was a local/static audit. It did not look at the live deployment. This plan therefore starts with a live check (Phase 0).

---

## 1. Goal and non-goals

**Goal:** Make the layers agree on the same rules, so that the screen, the repository/query code, the Firestore rules, and the Cloudflare Worker all enforce the same access and state contracts. Then prove it with tests.

**Non-goals (defaults, change only with evidence plus owner approval):**

- No rewrite and no redesign of ROLE x BRANCH x DIVISION.
- No division-specific role IDs.
- No broad loosening of Firestore rules to make tests pass.
- No mass formatting (219 files fail `format:check`; leave them alone).
- No Firebase downgrade and no `npm audit fix --force`.
- No removal of exports just because Knip reports them.
- No changes to unrelated dashboards or business workflows.
- No large schema migrations as part of a targeted fix.

---

## 2. Rules for every report back to the owner

After each phase the executor must write a short report with these headings, in plain language (no jargon without a one-line explanation):

1. **What was wrong** (one or two sentences, everyday words).
2. **What I changed** (list of files and the function or rule names).
3. **How I proved it works** (exact commands run and their pass/fail result).
4. **How I proved it still blocks what it should** (the "unauthorized case fails" test).
5. **What I did not do or am unsure about.**
6. **Anything that needs the owner to do something outside the code** (for example deploying rules, setting a Worker secret).

---

## 3. Phase 0 - Live preflight (do this before changing code)

**Why:** the baseline could not see production. If the same rules failure exists live, Front Office may be unable to record payments today, and that changes the urgency.

### 0.1 Re-run the baseline on the current code

- `git log --oneline -1` and record the current commit.
- Run `npm run test:rules` and record the exact pass/fail count and failure messages. Division-scope work was added after the baseline, so H-01 may now be better, the same, or worse. Do not assume the baseline numbers (42 pass, 4 fail).
- Run `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`.

### 0.2 Owner checks (give the owner click-by-click steps)

The executor must write these as numbered, plain steps for the owner, because the owner cannot read code:

1. **Rules match:** In the Firebase console (office account), open Firestore, then Rules. Compare the published rules text against the repo's `firestore.rules`. If they differ, report that first.
2. **Real payment test:** Using a Front Office test account on a test student, record a small payment, then mark a payment pending, then change a student's status. Report which of these fail and the exact error message shown.
3. **Worker status:** Confirm the Cloudflare Worker is deployed and the app's `VITE_AI_WORKER_URL` points to it. Confirm a normal kiosk clock-in works end to end. This must be true before Phase 4 removes the direct clock-in fallback (M-01).

### 0.3 Decision after Phase 0

- If step 0.2.2 fails live: treat H-01 as an incident. Do Phase 2 first and deploy it as soon as it passes.
- If it works live: follow the normal order below.

**Recommendation:** also record the secret-file note from the baseline. `serviceAccountKey.json` and `.env` files exist in the workspace folder. They are git-ignored, but they must never be zipped or shared outside the project. If a zip containing them was ever shared with anyone or any tool outside the owner's control, the owner should rotate that key.

---

## 4. Phase 1 - Make the safety tests runnable (small, do early)

**Why:** Phases 2 and 3 can only be proven with the real Firestore emulator. The baseline notes `npm test` skips the 46 real-rule tests, and the Firebase CLI is not a declared dependency, so a clean machine cannot run `test:rules`.

**Do:**

- Make `npm run test:rules` work from a fresh clone. **Recommendation:** add `firebase-tools` as a devDependency (smallest change), or have the script use `npx firebase-tools`. Executor may propose a better option.
- Document the one command the owner or CI uses, and any Java requirement the emulator has.

**Done when:** `npm run test:rules` starts the emulator and runs on a clean checkout with no extra manual setup, and the result is recorded.

---

## 5. Phase 2 - H-01: Firestore rules hit the expression limit

**Problem in plain words:** Firestore stops evaluating a rule after about 1,000 steps. Some valid Front Office actions use too many steps, so Firestore says "permission denied" even for allowed users.

**Do, in this order:**

1. **Find why it is expensive.** For each failing operation (payment recording batch, mark-payment-pending, Front Office student status update), list every helper function the rule calls and how many times each one reads the user profile or compares branch/role/division. Write this list in the report before changing anything.
2. **Hypotheses to test, not facts:**
   - The same profile lookup and branch/role check is repeated several times inside one rule.
   - Batched writes multiply the cost because each document in the batch is checked separately.
   - Division checks added by the Kindergarten work may have added more steps.
3. **Fix by reducing repeated work, not by removing checks.** **Recommendation:** read the caller's profile once per rule using a `let` binding inside a function and pass it into the helpers, and combine overlapping role/branch/division checks into one helper. Firestore also limits how many document lookups (`get`/`exists`) one request may do (commonly 10, or 20 for batches); executor should check the current official figure while redesigning, because fewer lookups also reduces cost.
4. **If simplifying is not enough**, do not loosen the rule. Propose an alternative (for example moving that one operation to a Worker endpoint that validates the same facts) and let the owner approve it.

**Must (acceptance, both sides):**

- Each of the three valid same-branch operations passes in the emulator.
- Add or keep tests proving the same operations still FAIL for: a different branch, a wrong role, and (where Kindergarten scoping applies) a wrong division.
- The full emulator suite result is reported, including any test that still fails and why.

---

## 6. Phase 3 - Parent access as one lifecycle (H-02, H-03, M-03, M-06)

### 3.0 Contracts to decide first

These need decisions before code. The executor should propose answers and the owner confirms. **Recommendations are shown but are open.**

| # | Question | Recommendation (open) |
|---|---|---|
| D1 | Who can create a parent-child link? | Admin and Front Office of the child's branch, through one server-validated path. |
| D2 | Who can remove a link? | Same roles as D1, same validation. Removal is retry-safe (removing twice is not an error). |
| D3 | What happens to a parent's access when the child is archived? | Parent loses access to that child's data in lists and direct reads equally. If the owner wants parents to see archived history, make that an explicit rule, applied the same way everywhere. |
| D4 | What if a parent has several children? | Unlinking one child must not affect the others. |
| D5 | What if the child is deleted? | Deletion also removes the link, and must succeed for the roles allowed to delete. |
| D6 | After unlink, which reads must stop working immediately? | All parent reads for that child: class attendance, payments, progress reports, classes. |

The executor should write the agreed answers into the remediation notes before implementing.

### 3.1 H-02: parent class query denied

**Problem:** the parent's class query does not include the branch, but the rule for listing classes requires it, so Firestore refuses. The repository then catches the error and returns an empty list, so the parent sees "no classes".

**Do:**

- Include the child's authoritative branch in the query (the child record is the source of truth, not the parent's profile). **Recommendation:** pass the branch from the verified child record into the repository function. If the executor prefers changing the rule instead, it must keep an equivalent child-branch check.
- **Must:** stop swallowing permission errors. A permission failure must reach the screen as an error state ("could not load classes"), distinct from a real empty list ("no classes scheduled").
- Keep an emulator test using the exact production query shape.

### 3.2 H-03: Front Office cannot unlink

**Problem:** unlinking removes a child ID from the parent's `childStudentIds`, but the Front Office update rule does not allow that field. The same block can break student deletion when a Front Office user deletes a linked student.

**Do:**

- **Recommendation:** add an unlink path validated on the server side (like the existing parent-link route in the Worker) that checks the caller's role and branch against the child, and removes only that one ID. The executor may propose a narrowly scoped rule instead if it can enforce the same checks without opening other parent fields.
- Fix the linked-student deletion path the same way.

### 3.3 M-03 / M-06: report list wider than direct read

**Problem:** direct reads check "child exists, is a student, same branch, active", but the progress-report list only checks that the child ID is in the parent's list. Archived children can still be listed.

**Do:**

- First confirm with an emulator query (the baseline marks this as not yet tested).
- Make list and direct-read use the same predicate.

**Must (acceptance for Phase 3):**

- Valid parent sees their active child's classes, attendance, payments and reports.
- A parent cannot see a child they are not linked to, or a child in another branch.
- After unlink, every read in D6 fails.
- Archived child behaves per the D3 decision, the same in list and get.
- A real permission failure shows an error state, not an empty list.

---

## 7. Phase 4 - Worker hardening and shift state (H-05, M-02, H-04, M-01)

These all change the Cloudflare Worker, so do them in one pass, in this order.

### 4.0 Add Worker tests first

The Worker has no endpoint tests. **Recommendation:** add a small test harness (for example Vitest with a fake of the Firestore REST calls) so each fix below can be proven. The executor may propose a different harness. Each fix needs tests added before or together with the fix.

### 4.1 H-05: event eligibility inside the Worker

**Problem:** the app screen filters events by branch, division, role and time, but the Worker accepts any "active" event. A modified kiosk could attach an ineligible event to a shift.

**Do:**

- In the clock-in handler, recompute eligibility from stored data: the scanned employee, the kiosk device, the event, and server time. Check active state, date/time window, and the audience type (`all`, `branch`, `role`, `division`).
- Keep the screen filter for convenience only.
- Reuse or mirror the logic in `src/features/attendance/corporateEvents.js` rather than writing a second, different version. If the code cannot be shared directly, add a test that proves both versions give the same answer for the same inputs.

**Tests:** one pass and one reject for every audience type; wrong branch; wrong division; wrong role; outside the time window; inactive event.

### 4.2 M-02: clock-out must check branches

**Do:** apply the same rule as clock-in and class switch: employee branch = shift branch = kiosk device branch. **Test:** a valid kiosk at another branch cannot close the shift.

### 4.3 H-04: class switch must be atomic

**Problem:** the Worker reads the open shift, closes it, creates the new shift, then updates the active state as separate steps. Two simultaneous valid requests can both succeed and leave two open shifts. The error-recovery write is also unconditional.

**The rule to protect:** for one staff member there is never more than one open shift, under duplicate, simultaneous, retried, timed-out or partially failed requests.

**Do:**

- **Recommendation:** use Firestore's REST `commit` (and a precondition on the document's update time) so that closing the old shift, creating the new shift, and replacing the active lock happen as one all-or-nothing write. If the executor prefers a transaction (`beginTransaction`) or a different state-machine design, explain why.
- Replace the unconditional recovery write with a conditional one, or remove the need for it.
- Check the clock-in and clock-out handlers for the same plain-write pattern, since the same invariant applies.

**Tests (all required):**

1. normal class switch;
2. duplicate request with the same nonce;
3. two simultaneous valid requests (exactly one wins; the other fails cleanly or returns the same result);
4. stale update (the shift changed after it was read);
5. failure while creating the new shift (old state is preserved);
6. failure while replacing the lock;
7. retry after an uncertain response.

**Acceptance:** no sequence of retries or concurrent requests can produce more than one open shift for the same staff member.

### 4.4 M-01: remove the silent downgrade (do this last)

**Problem:** if the Worker URL or browser crypto is missing, the scan processor writes the clock-in directly to Firestore, with no device proof and a client-side timestamp.

**Do (only after Phase 0.2.3 confirmed the Worker works live):**

- **Recommendation:** remove the fallback so missing configuration shows a clear error on the kiosk ("kiosk not configured") instead of silently using a weaker path.
- If the owner needs an offline or emergency mode, build it as an explicit, separately authorized mode with its own audit marker, and test it.

**Test:** with the Worker URL missing, clock-in fails visibly and writes nothing.

---

## 8. Phase 5 - M-04: cash reconciliation cap

**Problem:** if the day's payment query fails, the fallback reads at most 200 payments and the reconciliation can look complete when it is not.

**Do:**

- **Recommendation:** replace the fallback with paginated reads of all matching payments, or return an explicit "incomplete, reconciliation blocked" state. The fallback should also only catch the specific missing-index error, not every error.
- Check `firestore.indexes.json` has the index the range query needs.

**Tests:** more than 200 payments in one day gives the complete total, or a visible blocked state, never a quiet partial total.

---

## 9. Phase 6 - M-05: gRPC advisory

**Do, in order (no fix before step 3):**

1. Record the dependency path: `npm ls @grpc/grpc-js`.
2. Check whether it is reachable in what ships: search the production build output for gRPC server code, and check whether the Worker bundle includes it.
3. List compatible upgrade options and test them against the existing test suites.
4. Decide: fix, or document as not reachable with the evidence.

**Must not:** use `npm audit fix --force` or downgrade Firebase.

---

## 10. Phase 7 - CI gates

- Run the emulator rules tests in CI before deploy (builds on Phase 1).
- Run the new Worker tests in CI.
- **Recommendation:** also run lint and typecheck in the deploy workflow, since they already pass and the baseline notes the workflows skip them. Do not add the formatting check yet.

---

## 11. Phase 8 - Targeted re-audit

Re-audit only what was changed, and answer each question with evidence:

1. Was each original finding actually fixed?
2. Did any fix weaken another access path (cross-branch, wrong role, wrong division)?
3. Did any fix introduce a new race?
4. Do query shapes and rules match?
5. Does the Worker enforce its policy without trusting the client?
6. Are the invariants still true (one open shift per staff member; parent access follows the contract)?
7. Did anything outside the targeted areas change?
8. Do the full suites pass: `npm test`, `npm run test:rules`, `npm run test:e2e`, lint, typecheck, build, Worker build?

Production readiness is reassessed only after this, and only for what was actually verified. Deployed rules, deployed indexes, Worker secrets and live load behavior still need separate checks.

---

## 12. Suggested order and size

| Order | Phase | Findings | Why here |
|---|---|---|---|
| 1 | 0 Live preflight | n/a | Tells us if there is a live outage |
| 2 | 1 Runnable emulator tests | CI gap | Needed to prove Phases 2-3 |
| 3 | 2 Rules complexity | H-01 | Blocks real Front Office work |
| 4 | 3 Parent lifecycle | H-02, H-03, M-03, M-06 | Access and revocation |
| 5 | 4 Worker pass | H-05, M-02, H-04, M-01 | Same file, one pass |
| 6 | 5 Cash reconciliation | M-04 | Financial correctness |
| 7 | 6 Dependency | M-05 | Needs reachability evidence |
| 8 | 7 CI gates | CI gap | Keeps fixes from regressing |
| 9 | 8 Re-audit | all | Closure |

If Phase 0 shows the payment failure is live, move Phase 2 to the front and deploy it alone.

---

## 13. Open questions for the owner (answer in plain words; executor proposes, owner decides)

1. After a child is archived, should the parent still be able to see old reports and attendance? (D3)
2. Does any branch need clock-in to work without the Worker (offline or emergency mode)? If not, remove the fallback.
3. Is the live payment recording working right now? (Phase 0.2.2)
4. Should CI block deploys when rules tests fail? **Recommendation:** yes, once Phase 1 is stable.
