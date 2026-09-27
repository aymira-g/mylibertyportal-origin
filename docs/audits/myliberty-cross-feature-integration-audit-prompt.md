# MyLiberty Portal — Cross-Feature Integration & Workflow Audit Prompt

Repository:
https://github.com/aymira-git/mylibertyportal-origin

## Audit Objective

Perform a **full cross-feature integration and workflow audit** of the current `main` branch.

This is **not** another generic security or code-quality audit.

The goal is to determine whether MyLiberty Portal's features actually **work together as one coherent system**.

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

# Audit Method

Do **not** audit only file-by-file.

For each important business workflow, trace the complete path:

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

Do not assume that because a function exists, the workflow is connected.

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

Confirm that the parent dashboard is using the same source-of-truth data as staff dashboards.

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

---

## 7. Front Office Workflow

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

## 8. Outreach Workflow

Trace:

**School Outreach  
→ Outreach Visit / Contact  
→ Follow-Up  
→ Potential Student / Application  
→ Reporting**

Check whether outreach creates or links to records that later workflows can actually consume.

Look specifically for disconnected CRM-like data that is recorded but never used downstream.

---

## 9. Todo / Task Workflow

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

## 10. Corporate Event Workflow

Trace:

**Event Creation  
→ Audience Selection  
→ Staff Visibility  
→ Branch Visibility  
→ Role / Division Targeting**

Verify that the audience model used when creating an event matches the rule/query/display logic used when showing it.

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

Do not treat a client-side `.filter()` as equivalent to a Firestore security boundary.

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
- “today” calculations

Look for features that define “today” differently.

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

Do not only check whether the primary deletion succeeds. Check whether the rest of the system remains coherent afterward.

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

> “This record can be updated.”

Feature B assumes:

> “This record becomes immutable after X.”

Or:

UI says:

> “Manager can only see their branch.”

Repository says:

> “Manager can query everything.”

Or:

Attendance scan says:

> “Student is present.”

Manual correction says:

> “Student is absent.”

Determine the actual implementation behavior and whether the architecture has one consistent business rule.

---

# Do Not Fix Code Yet

For this audit:

- Do **not** modify the repository.
- Do **not** silently fix findings.
- Do **not** replace current behavior with generic best practices.
- Do **not** assume undocumented behavior.
- Use actual repository evidence.

This is a diagnostic audit first.

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
Describe the smallest coherent architectural fix. Do not implement it yet.

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

Do not inflate the report with generic best practices.

Every finding should be tied to actual MyLiberty Portal code.

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
- Front Office lifecycle
- Outreach lifecycle
- Todo lifecycle
- Corporate Event lifecycle

---

# Final Questions

Answer these explicitly:

1. Does MyLiberty Portal currently behave like one coherent system, or are there disconnected modules?
2. Which feature integrations create the biggest operational risks?
3. Which conflicts should be fixed before adding new features?
4. Which workflows require emulator/E2E testing because static inspection is insufficient?
5. What is the smallest practical remediation sequence that would make the system internally consistent?

Do **not** give an overall score, ranking, or generic quality rating.

The desired output is a **factual cross-feature integration audit** that can later be handed to another coding agent for remediation.
