---
title: Cross-Feature Integration & Workflow Audit Prompt
type: audit-prompt
status: active
created: 2026-09-28
last_verified: 2026-09-28
supersedes: null
superseded_by: null
---

# MyLiberty Portal — Cross-Feature Integration & Workflow Audit Prompt (Revised)

Repository:
https://github.com/aymira-git/mylibertyportal-origin

> This is a revision pass over the audit prompt Kifry uploaded, checked against the actual repo (the uploaded zip). The review itself is AI-assembled and can be wrong or miss something — treat every addition below as a starting position, not a ruling, and change anything that doesn't hold up once you're actually in the code.

## What This Revision Changes (for context, not instruction)

- Adds a short **Prior Audit Context** section — this repo already has a large `docs/audits/`, `docs/plans/`, `docs/proposals/` history; no reason to re-derive what's already been found.
- Adds an 11th priority workflow: **Staff Invitation / Onboarding**, which the original list didn't cover but the repo clearly has (`invitesRepository.js`, `StaffSignup.jsx`, `/join/:token`).
- Adds two grounded cross-check notes: multi-program batch/level consistency under Class/Enrollment, and the "General Duty" fallback under Staff/HR — both confirmed to actually exist in the code, spanning multiple files.
- Adds an optional pacing suggestion, since 11 workflows + 7 cross-cutting dimensions + special checks is a lot for one continuous pass.
- Reworded a handful of "do not" instructions into plain statements of what this pass covers — same intent, less command-y, easier for you (the executing agent) to push back on if a case genuinely calls for an exception.

Everything else below is the original scope, essentially untouched — it was already well-built.

---

## Audit Objective

Perform a **full cross-feature integration and workflow audit** of the current `main` branch.

This is a different lens than a security or code-quality audit — the question here is whether MyLiberty Portal's features actually **work together as one coherent system**.

Identify:

1. Features that work individually but break when another feature interacts with them.
2. Features that use conflicting assumptions, field names, IDs, statuses, roles, branch logic, or data structures.
3. Missing links where one workflow creates data that another workflow expects but never receives.
4. Conflicting business logic between UI, hooks/state, repositories/services, Firestore rules, dashboards, and reports.
5. Features that appear implemented but are not actually connected to the rest of the system.
6. Data created in one place that becomes invisible, stale, duplicated, or unusable elsewhere.
7. Workflows that stop halfway because the next step is missing.
8. Workflows where two features can overwrite each other's state incorrectly.
9. Role/branch restrictions that differ between related features.
10. Features that technically work but create operationally confusing results for staff.

---

## Prior Audit Context (read before starting, not from scratch)

`docs/audits/`, `docs/plans/`, and `docs/proposals/` already hold a substantial audit and design history for this repo. Re-deriving all of it here would waste time; the point of this pass is the workflow-handoff angle specifically, which those earlier passes mostly didn't take. Worth a skim before diving in:

- `docs/audits/current/2026-09-27-claude-audit-continuation.md` and `docs/audits/current/2026-09-27-claude-audit-broader-findings.md` — branch-isolation/cross-branch leak findings with exact before/after rule text, plus concurrency findings (payment double-submit, roster `arrayRemove` gap, unconsumed shift-correction approvals). If a workflow trace below runs into one of these same seams, it's likely the same root cause, not a new one — cite it as confirming/extending rather than rediscovering.
- `docs/audits/current/2026-09-27-reconciled-full-audit.md` — reconciled P0/P1 findings (parent portal routing, branch-scoped queries, Kids Manager).
- `docs/audits/archive/qodo-findings-remediation.md` — findings already addressed; useful so a fixed issue doesn't get re-flagged as new.
- `docs/decisions/2026-09-24-multi-branch-data-isolation.md` (and archived proposal `docs/proposals/archive/2026-09-24-multi-branch-data-isolation.md`) — the intended branch-isolation model, useful as the "what was supposed to happen" baseline for Cross-Cutting section D below.
- `docs/specs/parent/myliberty-parent-student-roster-data-model.md` — intended parent-child linkage / source-of-truth design, relevant to Workflow 1 and 2.
- `docs/specs/attendance/attendance-module-v4-myliberty-integration-spec.md` and `docs/audits/archive/2026-09-25-kiosk-security-audit-revision.md` — intended attendance/kiosk design, relevant to Workflow 3.
- `docs/plans/active/corporate-event-attendance-plan.md` and `docs/plans/active/private-toefl-vs-corporate-event-clock-in-plan.md` — intended corporate-event design, relevant to Workflow 11.
- `docs/plans/active/gorontalo-school-outreach-plan.md` and `docs/plans/active/outreach-manager-marketing-remediation-plan.md` — intended outreach design, relevant to Workflow 9.

If time is short, prioritize reading whichever of these matches the workflow you're tracing at that moment rather than reading all of them up front.

### Evidence Priority

Historical audits, plans, proposals, architecture documents, and prior AI findings describe **intent or previous observations**, not proof of current behavior.

Use this evidence priority when sources disagree:

1. **Current source code and current Firestore rules**
2. **Current emulator/E2E/runtime behavior**
3. **Current tests**
4. **Current architecture/documentation**
5. **Historical audits, plans, proposals, and prior AI conclusions**

Do not mark a workflow as working merely because a plan or audit says it was implemented. Confirm that the current code actually performs the behavior.

---

# Audit Method

Trace end-to-end rather than file-by-file. For each important business workflow, trace the complete path:

**UI → hook/state → repository/service → Firestore write/read → Firestore rules → downstream feature/report/dashboard**

For every handoff, determine:

- What creates the data?
- What exact fields are written?
- What exact fields are later read?
- Are the field names identical?
- Are IDs constructed consistently?
- Are status values consistent?
- Are timestamps/date conventions consistent?
- Is branch information preserved?
- Is the role/owner preserved?
- Does the next feature actually query the data created by the previous feature?
- Can Firestore rules allow the intended next step?
- Does the UI correctly interpret the resulting state?
- Can another feature overwrite that state?
- What happens when data is missing, duplicated, delayed, transferred, archived, or partially completed?

A function existing isn't evidence the workflow is connected — confirm the downstream read actually happens against the fields the upstream write actually produced.

### Runtime Verification Rule

When an integration depends on behavior that static inspection cannot fully establish, prefer a **real emulator/E2E/runtime verification** where practical.

This especially applies to:

- Firestore query/list behavior and security rules
- authentication and role-dependent routing
- branch-scoped visibility
- concurrent writes and race conditions
- transaction/batch behavior
- derived summaries or denormalized data
- redirects and route guards
- workflows that cross multiple screens or sessions

Do not convert a plausible static concern into a confirmed defect without sufficient evidence. Mark it **Needs runtime verification** when the behavior cannot be established from the repository alone.

---

# Priority Business Workflows

## 1. Student Lifecycle

Trace:

**Application / Inquiry
→ Admission
→ Student Account / Profile
→ Class Enrollment
→ Class Roster
→ Attendance
→ Progress / Reporting
→ Parent Linkage
→ Parent Dashboard**

Check consistency of:

- application ID vs student/user ID
- student IDs in class rosters
- class IDs in attendance
- attendance student IDs
- parent-to-child linkage
- branch assignment
- student status
- enrollment status
- archived/closed students

---

## 2. Parent Lifecycle

Trace:

**Student
→ Parent Record
→ Child Linkage
→ Authenticated Parent Login
→ ParentDashboard
→ Classes
→ Attendance
→ Related Student Information**

Confirm the parent dashboard is using the same source-of-truth data as staff dashboards.

Check for:

- old anonymous parent lookup remnants
- duplicate parent data models
- inconsistent child linkage fields
- branch filtering differences
- parent permissions that do not match the UI
- data visible to staff but missing from ParentDashboard
- parent data that exists but cannot be reached through the intended workflow

---

## 3. Attendance Lifecycle

Trace:

**Class Enrollment
→ Class Roster
→ Badge Scan / Kiosk
→ Attendance Record
→ Manual Instructor Correction
→ Close-Out
→ Reports
→ Parent Dashboard**

Pay particular attention to:

- deterministic attendance IDs
- scan vs manual attendance
- `markedBy`
- attendance method/status
- manual correction precedence
- late scan after manual absence
- duplicate scans
- class close-out
- reopening/retrying attendance
- report interpretation
- parent dashboard interpretation
- Firestore rules for each write/update path

Identify situations where Feature A can legitimately change data that Feature B assumes is immutable.

---

## 4. Class and Enrollment Lifecycle

Trace:

**Create Class
→ Assign Instructor
→ Add Students
→ Remove / Transfer Students
→ Attendance
→ Class Completion / Closure
→ Reporting**

Check especially:

- class status values
- instructor assignment fields
- student roster fields
- concurrent roster modifications
- transfer behavior
- stale snapshots
- whether attendance still works after transfers
- whether reports still find the class
- whether parent views still find the student's class

**Also check, since the school runs five separate programs (English, Kids Course, Professional, TOEFL, Kids School) sharing the same class/enrollment code path** (`src/constants/batchTypes.js`, `src/features/classes/batchAvailability.js`, `src/schemas/applicationSchema.js`, `src/schemas/batchSchema.js`): do batch/level/schedule rules that are specific to one program leak into another, or get silently ignored by a feature (attendance, reporting) that was written with only one program in mind?

---

## 5. Payments / Finance Lifecycle

Trace:

**Student
→ Payment Creation
→ Payment Record
→ Student Financial Summary
→ Receipt / History
→ Finance Dashboard
→ Reports**

Check whether:

- payment writes and summary writes always agree
- duplicate payment submissions are possible
- payment IDs/receipt numbers are consistent
- payment history uses the same student ID
- reports use the same payment source
- branch filters match finance rules
- deleted/transferred students remain coherent
- partial failures can leave financial data inconsistent

---

## 6. Staff / HR Lifecycle

Trace:

**Staff User
→ Branch
→ Shift Clock-In / Clock-Out
→ Shift Correction
→ Approval
→ Applied Correction
→ Shift Audit
→ Staff Reports**

Also trace:

**Staff Leave
→ Approval
→ Staff Availability
→ Reporting / Dashboard Effects**

Check whether:

- approval state has one clear source of truth
- an approved action can be applied twice
- applied corrections remain linked to the original approval
- branch rules agree with dashboard logic
- staff role filtering agrees across screens
- shift and leave data use compatible date/time conventions

**Also check the "General Duty" fallback specifically.** It shows up in at least four places — `kioskScanProcessor.js` (falls back to General Duty on zero or ambiguous class matches), `shiftsRepository.js`, `CorporateEventsPanel.jsx`, `ShiftAdjustmentModal.jsx`, and `ManagerOverview.jsx` (which renders it as `"School General Duty"` — a different string than the other four use). Confirm whether that's purely a display-label difference or whether something downstream matches on the literal string. A prior session flagged a related "already implemented" claim about instructor General Duty that turned out to be inaccurate at the time — worth re-checking against current code rather than assuming that finding still applies or has been resolved either way.

---

## 7. Staff Invitation / Onboarding Lifecycle

*(Not in the original prompt — added because the repo has a full invite→signup path that the rest of the Staff/HR lifecycle depends on.)*

Trace:

**Invite Created (Admin/Manager)
→ Invite Token
→ `/join/:token` Link Shared
→ StaffSignup
→ Auth Account Created
→ Staff Record Created
→ Branch / Role Assignment
→ Enters Staff/HR Lifecycle (Workflow 6)**

Relevant files: `src/features/staff/invitesRepository.js`, `src/features/auth/StaffSignup.jsx`, `src/features/auth/authRepository.js`, the `/join/` route check in `src/App.jsx`.

Check whether:

- the branch and role set on the invite are the same branch and role that land on the final staff record, or whether either can be changed mid-flow without the other side knowing
- an invite can be consumed more than once, or reused after the intended hire backs out
- invite expiry (if any) is enforced the same way the UI implies it is
- the staff record produced by signup has every field Workflow 6 and StaffDirectory expect (status, branch, role) — or whether some fields only get backfilled later, leaving a window where the new staff member is invisible or misfiled in dashboards

---

## 8. Front Office Workflow

Trace:

**Walk-In Inquiry
→ Desk Inquiry
→ Student / Application
→ Follow-Up
→ Outreach / Admission
→ Reporting**

Check whether:

- inquiry records can actually flow into admissions
- duplicate people/inquiries are possible
- branch information survives each transition
- reports use the same records created by Front Office
- statuses such as converted/follow-up/closed mean the same thing everywhere

---

## 9. Outreach Workflow

Trace:

**School Outreach
→ Outreach Visit / Contact
→ Follow-Up
→ Potential Student / Application
→ Reporting**

Check whether outreach creates or links to records that later workflows can actually consume.

Look specifically for disconnected CRM-like data that is recorded but never used downstream.

---

## 10. Todo / Task Workflow

Trace:

**Task Creation
→ Assignment
→ Branch / Academy Scope
→ Completion
→ Dashboard Visibility**

Check whether:

- task scope means the same thing in every dashboard
- branch-wide and academy-wide tasks behave consistently
- roles see the intended task population
- completed tasks disappear/remain consistently
- task ownership survives branch filtering

---

## 11. Corporate Event Workflow

Trace:

**Event Creation
→ Audience Selection
→ Staff Visibility
→ Branch Visibility
→ Role / Division Targeting**

Verify that the audience model used when creating an event matches the rule/query/display logic used when showing it, and that it agrees with the General Duty fallback noted under Workflow 6 when a scan doesn't cleanly match an event.

---

# Cross-Cutting Consistency Audit

## A. Identity Consistency

Find every major identifier, including:

- `userId`
- student ID
- class ID
- application ID
- parent ID
- payment ID
- attendance ID
- shift ID
- approval ID
- inquiry ID
- outreach ID
- invite ID / token *(new — see Workflow 7)*

For each identifier, determine:

- where it is created
- where it is stored
- where it is referenced
- whether another feature expects a different identifier

Flag places where one module uses a document ID while another uses a custom/business ID.

---

## B. Status Consistency

Inventory important status values, including examples such as:

- active
- pending
- approved
- rejected
- open
- closed
- present
- absent
- late
- cancelled
- completed
- archived

Determine whether different modules use different spellings or meanings for the same state.

Flag:

- dead statuses
- statuses no UI can produce
- statuses no UI can consume
- statuses with different meanings in different modules

---

## C. Role Consistency

Trace all active roles, including:

- Admin
- Manager
- Kids Manager
- Front Office
- Instructor
- Parent
- Student
- any other active role

For each role compare:

**UI visibility → repository query → Firestore rule → report access → branch access**

Find places where:

- UI says a role can do something but rules reject it
- rules permit something the UI does not properly control
- related modules apply different role semantics

---

## D. Branch Consistency

Trace `branchId` and all legacy branch fields.

Find:

- writes that omit branch information
- reads that ignore branch information
- reports that query globally and filter later
- rules using a different branch field than repositories
- old branch representations
- features where branch isolation exists only in the UI

A client-side `.filter()` is not equivalent to a Firestore security boundary — treat the two as separate questions even where they happen to produce the same visible result today.

---

## E. Date / Time Consistency

Check WITA/date behavior across:

- attendance
- payments
- shifts
- leave
- inquiries
- reports
- daily dashboards
- deterministic IDs
- "today" calculations

Look for features that define "today" differently.

---

## F. Source-of-Truth Consistency

For each important business fact, identify the canonical source.

Examples:

- student status
- class membership
- attendance
- payment balance
- staff shift state
- parent-child relationship

Flag duplicated business state where two collections can disagree.

---

## G. Delete / Archive / Transfer Consistency

Whenever a major record is deleted, archived, deactivated, or transferred, trace all dependent records.

For example:

**Student deletion
→ Class roster
→ Attendance
→ Parent linkage
→ Payments
→ Reports
→ Other references**

Check whether the rest of the system remains coherent afterward, not only whether the primary deletion succeeds.

---

# Special Check: Half-Built / Disconnected Features

Find features that look complete from the UI but are actually disconnected.

Examples:

- button writes data but no downstream feature reads it
- report expects fields that are never written
- dashboard expects a collection/query that another module no longer uses
- repository function exists but UI uses another implementation
- feature has a migration/legacy path that is no longer reachable
- old and new workflows coexist
- documentation describes a workflow different from current code

---

# Special Check: Conflicting Business Logic

Look for cases such as:

Feature A says:

> "This record can be updated."

Feature B assumes:

> "This record becomes immutable after X."

Or:

UI says:

> "Manager can only see their branch."

Repository says:

> "Manager can query everything."

Or:

Attendance scan says:

> "Student is present."

Manual correction says:

> "Student is absent."

Determine the actual implementation behavior and whether the architecture has one consistent business rule.

---

# Keep This Pass Diagnostic

For this audit:

- This pass stays read-only — no repository edits.
- Findings get reported here, not quietly patched in code.
- Findings should reflect actual behavior, not a generic best-practice rewrite of it.
- Where behavior isn't documented, check it against the code rather than assuming it.
- Use actual repository evidence throughout.

This is meant as a diagnostic pass first — remediation is a separate, later step (see the Final Questions below for how to sequence it).

---

# Finding Severity Definitions

Use severity consistently:

| Severity | Meaning |
|---|---|
| **Critical** | Security or data-integrity failure, or a defect that can corrupt/irreversibly damage core business records or expose highly sensitive data. |
| **High** | Breaks an important operational workflow, creates materially incorrect business data, or causes significant unintended access/visibility. |
| **Medium** | A real integration defect with limited scope, a workable manual workaround, or a meaningful edge case that does not normally corrupt core records. |
| **Low** | Minor inconsistency, stale/dead path, low-impact edge case, or maintainability/documentation issue with limited operational effect. |

Do not inflate severity because a finding is technically interesting. Base it on actual user/business impact and evidence.

---

# Required Finding Format

For every finding, report:

### Finding

**ID:** `INT-001`
**Severity:** Critical / High / Medium / Low
**Workflow:** e.g. Student → Class → Attendance
**Status:** Confirmed / Likely / Needs runtime verification

**Problem:**
Explain what is inconsistent or missing.

**Feature A:**
What it currently does.

**Feature B:**
What it expects or does differently.

**Broken Link / Conflict:**
Exactly where the handoff fails or becomes inconsistent.

**Evidence:**
File paths, functions, collections, fields, rules, and relevant code locations.

**User Impact:**
What an Admin, Manager, Instructor, Front Office user, Parent, or Student would actually experience.

**Recommended Resolution:**
Describe the smallest coherent architectural fix, as a starting proposal rather than a final call — note it here without implementing it yet.

**Existing Finding / Root Cause Check:**
Before creating a new finding, compare it against the prior audit history. If the same underlying defect has already been documented, identify the existing finding and classify this result as:
- confirming the existing finding,
- extending the existing finding to another workflow, or
- showing a regression/new manifestation.

Avoid duplicate findings for the same root cause.

---

# Required Report Sections

Separate findings into:

1. **CONFIRMED INCONSISTENCIES**
2. **CONFIRMED MISSING INTEGRATIONS**
3. **CONFIRMED CONFLICTING BUSINESS LOGIC**
4. **LIKELY ISSUES REQUIRING RUNTIME TESTING**
5. **STALE / DEAD / ORPHANED CODE**
6. **DOCUMENTATION VS ACTUAL-CODE DRIFT**
7. **WORKING FLOWS VERIFIED**

Keep the report to findings tied to actual MyLiberty Portal code — skip generic best-practice padding.

---

# Feature Integration Matrix

At the end, create this matrix:

| Feature | Upstream | Owns Data | Downstream | Role Scope | Branch Scope | Status | Problems |
|---|---|---|---|---|---|---|---|

Populate it from actual repository evidence.

---

# Business Workflow Map

Create a workflow map for the major business flows and mark each handoff as:

- ✅ **Verified connected**
- ⚠️ **Partially connected**
- ❌ **Broken / missing link**
- 🔍 **Needs runtime verification**

At minimum include:

- Student lifecycle
- Parent lifecycle
- Attendance lifecycle
- Class/enrollment lifecycle
- Finance/payment lifecycle
- Staff/HR lifecycle
- Staff invitation/onboarding lifecycle *(new)*
- Front Office lifecycle
- Outreach lifecycle
- Todo lifecycle
- Corporate Event lifecycle

---

# Suggested Pacing (optional)

Eleven workflows plus seven cross-cutting dimensions plus the special checks is a lot to hold at even quality in one continuous pass. One option, not a requirement, is clustering by shared code paths so each cluster can be traced and written up before moving to the next:

- **Cluster 1 — academic core:** Student, Class/Enrollment, Attendance, Parent (these four share the most identifiers and are where a mistake is most visible to families)
- **Cluster 2 — money and people:** Finance, Staff/HR, Staff Invitation/Onboarding
- **Cluster 3 — everything else:** Front Office, Outreach, Todo, Corporate Event

If a different grouping fits the code better once you're actually in it, use that instead — the goal is even coverage, not this specific split.

Regardless of pacing, the final deliverable must **reconcile all workflow clusters into one consolidated system-level conclusion**. Do not leave the reader to merge separate cluster findings themselves.

Include cross-cluster root causes where one underlying issue affects multiple workflows.

---

# Final Questions

Answer these explicitly:

1. Does MyLiberty Portal currently behave like one coherent system, or are there disconnected modules?
2. Which feature integrations create the biggest operational risks?
3. Which conflicts should be fixed before adding new features?
4. Which workflows require emulator/E2E testing because static inspection is insufficient?
5. What is the smallest practical remediation sequence that would make the system internally consistent?

Skip an overall score, ranking, or generic quality rating — the value here is the factual findings themselves.

### Final Reconciliation Requirements

Before finishing:

1. **Deduplicate by root cause.** If several workflows expose the same underlying defect, group them under one root cause and list the affected workflows rather than creating repetitive findings.
2. **Distinguish confirmed defects from verification gaps.** Do not promote a static suspicion to “Confirmed” without sufficient evidence.
3. **Separate current behavior from intended behavior.** When current code differs from a plan/proposal, report the difference explicitly rather than silently treating the planned behavior as implemented.
4. **Check for regressions.** Where a prior audit says an issue was fixed, verify the current code before treating it as resolved.
5. **Produce one consolidated remediation order.** The final sequence should account for dependencies between fixes across different workflows.
6. **List important verified-working handoffs too.** A finding-only report should not make a correctly connected system look more broken than the evidence supports.

The desired output is a **factual cross-feature integration audit** that can later be handed to another coding agent for remediation.
