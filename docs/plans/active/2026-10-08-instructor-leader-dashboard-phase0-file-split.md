# MyLiberty Portal — Instructor Leader Dashboard — Phase 0: File Split
## Executor Implementation Brief

You are the implementation agent. Work from the **current repository state**, not from assumptions or historical plans.

This is a **structural-only task**: separate the Instructor and Instructor Leader code paths into their own files and routing entries, with **zero user-facing behavior change** — with exactly one owner-authorized exception (a kindergarten-division Instructor Leader moves to the leader dashboard; see 4.4). Building the actual leadership dashboard is a later task and is explicitly out of scope here.

Success means: after this task, an ordinary instructor sees exactly what they see today, and an instructor leader sees exactly what they see today (except the kindergarten-division leader correction), but the leader experience lives in its own file so the next task can rebuild it without touching the ordinary Instructor dashboard.

---

# 1. Governing Baseline — READ FIRST

Read, in this order:

1. `AGENTS.md`
2. `docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md` — §6.11 (Instructor Leader), §6.12 (Instructors), §6.15 (Unresolved Kindergarten staffing)
3. `docs/decisions/2026-10-07-resolution-of-governance-questions-g001-g011.md` — G-003, G-005, G-011
4. `docs/ARCHITECTURE.md`
5. `src/features/shared/roles.js`
6. `src/App.jsx` (routing)
7. `src/features/dashboard/InstructorDashboard.jsx`
8. `src/features/dashboard/kids/KidsInstructorDashboard.jsx`
9. `src/features/dashboard/instructor/` and `src/features/dashboard/useInstructorRoster.js`

### Governance facts that shape this task

- Blueprint **v3.3, RATIFIED 2026-10-07**. G-001–G-011 are resolved; do not use older "unresolved" assumptions.
- **G-003:** "**All branch Instructors report directly to the Instructor Leader**" — instructors of BOTH divisions (courses and kindergarten). Blueprint §6.11 likewise scopes the Instructor Leader to the **branch**, not to a division.
- **Division coverage (owner-confirmed 2026-10-08):** the Instructor Leader covers both divisions. The leader is **NOT routed by division** — exactly like the Operational Leader, which routes `opslead` / `ops_lead` / `frontofficelead` to a single `OpsLeadDashboard` with no division branching (`src/App.jsx`, around lines 580–586). The Instructor Leader route must follow this same pattern.
- **G-005 (applies to ordinary instructors):** Kindergarten Instructors exist (`instructor` + `division: "kindergarten"`) and receive the kindergarten experience. An ordinary Instructor's division is one of `courses` | `kindergarten` | `all` (`STAFF_DIVISIONS` in `src/constants/divisions.js`); `"all"` means teaching in both divisions. There is no separate "Kindergarten Instructor Leader" role and Blueprint §6.15 forbids inventing one — the same branch-scope Instructor Leader leads the instructors of both divisions.
- **G-011:** Instructor Leader is a peer branch leadership function. It must not be treated as Admin, Branch Manager, or a division manager.

---

# 2. Verified Current State

These claims were verified against the repository on 2026-10-08. Re-verify before relying on them; line numbers may drift, structure should not.

1. **Routing** — `src/App.jsx` (around lines 569–577) routes `instructor`, `instructorleader`, `instructor_leader` through one conditional: `effectiveDivision === "kindergarten"` → `KidsInstructorDashboard`, otherwise → `InstructorDashboard role={effectiveRole}`.
2. **`InstructorDashboard.jsx` is 212 lines.** The leader-specific code is only:
   - the `isLeader` check (roles `instructorleader` / `instructor_leader` / `head_instructor`) — around lines 52–55;
   - `usePendingApprovalsCount(isLeader ? "instructor_leader" : null, effectiveBranch)` — around lines 56–59;
   - the conditional **Academic Approvals** tab (unconditional tabs + `...(isLeader ? [approvals tab] : [])`) with `ApprovalInbox userRole="instructor_leader"` — around lines 168–184.
   Everything else (roster hook, branch-wide active-classes listener around lines 79–92, staff directives, kiosk, tab layout) is shared instructor functionality.
3. **`KidsInstructorDashboard.jsx` (169 lines) has zero leader features** — no approvals, no `isLeader`.
4. **Shared components** — `src/features/dashboard/instructor/` exports `InstructorOverview`, `InstructorClasses`, `InstructorProgress`, `uniqueClasses`; consumed by BOTH the courses and kids instructor dashboards.
5. **Role aliases** — `src/features/shared/roles.js` normalizes `instructor_leader` and `head_instructor` → `instructorleader` (around lines 38–39). `App.jsx` routing matches the three literals and does **not** include `head_instructor`.
6. **Test coverage** — no e2e test references instructor flows; there is no App-level routing test. Existing: `useInstructorRoster.test.js`, `usePendingApprovalsCount.test.js`.
7. **Dev tooling** — `src/features/auth/devPresets.js` includes an Instructor Leader preset (`instructorleader.test@myliberty.id`, `supportsDivision: true`), so the split is verifiable locally via DevQuickSwitcher.

---

# 3. Objective

Split the code paths:

```text
instructor + division "kindergarten"      → KidsInstructorDashboard  (unchanged)
instructor + division "courses" / "all" /
             unset                         → InstructorDashboard      (ordinary instructor only, unchanged)
instructorleader / instructor_leader +
ANY division (courses / kindergarten /
all / unset)                              → InstructorLeaderDashboard (structural twin of today's
                                                                       leader experience)
```

The Instructor Leader route is **division-independent**, mirroring the Operational Leader pattern in `src/App.jsx` (`opslead` / `ops_lead` / `frontofficelead` → one `OpsLeadDashboard`, no division branching). The division field must never decide whether a leader reaches `InstructorLeaderDashboard`.

Target routing shape (two separate blocks, mirroring the Ops Lead pattern; adapt structure to the existing code, keep the literal role matching exactly as it is today):

```jsx
{effectiveRole === "instructor" && (
  <ErrorBoundary label="Instructor dashboard">
    {effectiveDivision === "kindergarten" ? (
      <KidsInstructorDashboard />
    ) : (
      <InstructorDashboard role={effectiveRole} />
    )}
  </ErrorBoundary>
)}
{(effectiveRole === "instructorleader" ||
  effectiveRole === "instructor_leader") && (
  <ErrorBoundary label="Instructor Leader dashboard">
    <InstructorLeaderDashboard role={effectiveRole} />
  </ErrorBoundary>
)}
```

Notes:

- An ordinary instructor with division `"all"` (teaches in both divisions) currently routes to the courses `InstructorDashboard`. **Preserve that in this task.** Where a both-divisions instructor gets kindergarten-specific teaching tools is a Phase 1 design question — record it as deferred, do not solve it here.
- Before editing, verify how `effectiveRole` is derived in `App.jsx` (raw vs normalized). Do not change that behavior in this task.

---

# 4. Required Changes

## 4.1 Create `src/features/dashboard/InstructorLeaderDashboard.jsx`

- Initially renders **exactly today's leader experience**: the same 9 tabs in the same order (Overview, Attendance, Directives, My Classes, Student Progress, Lesson Materials, Reports, Academic Approvals, AI Assistant), the same shell title `"Instructor Portal"`, and the same badge behavior.
- The Academic Approvals tab becomes **unconditional** (this is a leader-only file) with props preserved **verbatim**: `ApprovalInbox userRole="instructor_leader"`, same `branchId`, `title`, and `subtitle` strings as the current code.
- Do **not** redesign, rebrand, rename, add, or remove anything. This file is a structural twin; the leadership redesign is a later task.
- Follow the existing lazy-load pattern in `App.jsx` (`lazyWithRetry`, as used for `InstructorDashboard`).

## 4.2 Slim `InstructorDashboard.jsx`

- Remove `isLeader`, the `usePendingApprovalsCount` call, and the Academic Approvals tab.
- The result is a pure ordinary-instructor dashboard (8 tabs). Everything else stays as-is.

## 4.3 Shared workspace hook (avoid duplicated data wiring)

Do not let the two dashboards duplicate the Firestore wiring. Extract the shared setup into a hook, e.g. `src/features/dashboard/instructor/useInstructorWorkspace.js`:

- the `useInstructorRoster()` call and `effectiveRole` / `effectiveBranch` resolution;
- the branch-wide active-classes listener and the `combinedAllClasses` merge (must remain **exactly one listener per mounted dashboard**, same query: `branchId == branch`, `status == active`);
- `useStaffDirectives("instructor")`.

Both `InstructorDashboard` and `InstructorLeaderDashboard` consume it. Keep URL-action / kiosk / active-tab state local to each dashboard component (simple `useState`, unchanged semantics).

**`KidsInstructorDashboard.jsx` is out of scope** — do not refactor it in this task. Keep the diff small.

## 4.4 Routing in `App.jsx`

- Apply the split from section 3 (two separate role blocks, leader block division-independent).
- **One intentional behavior change is authorized in this task, and only this one:** a kindergarten-division Instructor Leader currently lands on `KidsInstructorDashboard` and receives **no leader features at all**. After this task they land on `InstructorLeaderDashboard`. This is an owner-directed correction grounded in G-003 ("all branch Instructors report directly to the Instructor Leader") and §6.11 (branch scope) — record it explicitly in the report as a deliberate change, not drift. The interim gap — the leader twin has no kindergarten-specific teaching tools (e.g., class photo share) — is deferred to Phase 1.
- Do **not** add `head_instructor` to the routing match. If you confirm that a raw `head_instructor` profile currently matches no dashboard route, record that as an observation in the report — do not fix it here.

## 4.5 Strings frozen in this phase

- Keep `ApprovalInbox userRole="instructor_leader"` and the pending-count role argument **exactly as they are** (the alias string). Canonicalizing to `instructorleader` is deferred to the dashboard task to avoid query drift in this phase.
- Keep the shell title `"Instructor Portal"`.

## 4.6 `docs/ARCHITECTURE.md` — mechanical listing update only

`docs/ARCHITECTURE.md` lists the instructor surfaces in two component listings (around lines 157 and 572). Add `InstructorLeaderDashboard.jsx` to those listings. **No other architecture statement may change.** This listing update is authorized by the owner as part of this task; it records an implementation fact in an existing list, it is not an architecture change.

---

# 5. Non-Goals

Do NOT, in this task:

- add tabs, features, sections, charts, or any UI change;
- rebrand titles or labels;
- touch `firestore.rules`, `firestore.indexes.json`, schemas, repositories, or `approvalGates.js`;
- touch `KidsInstructorDashboard.jsx` or any kindergarten behavior;
- canonicalize role strings in queries or props;
- add new Firestore queries or change listener scope (the class listener moves, it must not multiply);
- change role normalization, preview mode, or DevQuickSwitcher behavior;
- start building the leadership dashboard (that is Phase 1+).

If something in this list seems required to complete the split, stop and report the conflict instead of improvising.

---

# 6. Tests

- Add focused component tests pinning the split:
  - `InstructorDashboard` renders the 8 ordinary tabs and does **not** render an Academic Approvals tab;
  - `InstructorLeaderDashboard` renders the 9 tabs including Academic Approvals, with the `ApprovalInbox` props above.
  - Reuse existing mocking patterns (`src/test/firestoreFake.js`; see `useInstructorRoster.test.js` and dashboard tests such as `ManagerDashboard.test.js` for style). Place tests alongside the components.
- Routing must be verifiably covered somewhere: an App-level routing test if feasible with the existing setup, otherwise pin the mapping in the narrowest test you can genuinely support. State clearly in the report what is automated vs manually verified.
- Run and report exact results for:
  - `npm test`
  - `npm run lint`
  - `npm run typecheck`
  - `npm run build`
- No e2e exists for instructor flows; do not add e2e in this task.

---

# 7. Manual Verification (dev)

With `npm run dev` and DevQuickSwitcher, confirm and record in the report:

1. **Instructor (courses)** → Instructor Portal, 8 tabs, no Academic Approvals.
2. **Instructor Leader (courses)** → the identical 9-tab experience available today.
3. **Instructor Leader + EACH division (courses / kindergarten / all)** → `InstructorLeaderDashboard` in all three cases; division never gates the leader route.
4. **Instructor + division "all"** → ordinary Instructor Portal (unchanged).
5. **Instructor + kindergarten division** → Kids instructor dashboard, unchanged.
6. Pending-approvals badge appears on the leader's Academic Approvals tab as it does today.

---

# 8. Report

Create `docs/reports/instructor-leader-dashboard/00-phase0-file-split.md` (new folder is correct — it continues the per-dashboard report series; see `docs/reports/operational-leader-dashboard/` for format) with sections:

- **Established** — governance anchors used (Blueprint v3.3 §6.11/§6.15, G-003/G-005/G-011).
- **Observed** — the pre-split implementation state.
- **Implemented** — exactly what this task changed.
- **Verified** — commands run with results, plus manual checks from section 7.
- **Deferred** — everything intentionally left for the dashboard task (rebrand, leadership UI, approvals canonicalization, shift-visibility gap, teacher-evaluation gap, kindergarten-specific teaching tools for Instructor Leaders, kindergarten teaching tools for division-`"all"` instructors).
- **Files changed / created.**

Do not claim anything was verified that was not run.

---

# 9. Acceptance Criteria

- [ ] Ordinary instructor + courses or `all` division → `InstructorDashboard`, 8 tabs, no Academic Approvals.
- [ ] Ordinary instructor + kindergarten division → `KidsInstructorDashboard`, unchanged.
- [ ] Instructor Leader (both `instructorleader` and `instructor_leader`) + **every** division (courses / kindergarten / all) → `InstructorLeaderDashboard`; division never gates the leader route.
- [ ] Leader experience identical to today's leader view (9 tabs, same order, same title, same badge).
- [ ] Exactly one branch-wide active-classes listener per mounted dashboard; query unchanged.
- [ ] `ApprovalInbox` props byte-identical to the current implementation.
- [ ] `firestore.rules`, `approvalGates.js`, repositories, schemas: untouched.
- [ ] `KidsInstructorDashboard.jsx`: untouched.
- [ ] New pin tests pass; `npm test`, `npm run lint`, `npm run typecheck`, `npm run build` all pass.
- [ ] `docs/ARCHITECTURE.md` updated only in the two component listings.
- [ ] Phase 0 report created at `docs/reports/instructor-leader-dashboard/00-phase0-file-split.md`.
- [ ] Zero user-visible behavior change except the single authorized routing correction for kindergarten-division Instructor Leaders (section 4.4), recorded in the report.

---

# 10. If Reality Disagrees

If the repository contradicts any "Verified Current State" claim above — line drift is fine, structural contradiction is not — stop and report the discrepancy rather than improvising around it.
