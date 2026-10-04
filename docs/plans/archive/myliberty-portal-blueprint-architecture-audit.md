# MyLiberty Portal — Organizational Blueprint Architecture Audit

**Audit Type:** Architecture / Business-Model Baseline  
**Status:** Advisory — No code changes authorized by this document  
**Source:** `myliberty-portal-blueprint.md`  
**Purpose:** Establish a precise bridge between the organizational/business blueprint and the application's future authorization, data-scope, workflow, and implementation decisions.

---

## 1. Executive Summary

The organizational blueprint provides a strong business-level foundation for MyLiberty Portal.

It establishes two major pillars:

1. **Operational Structure (Back-Office & Business Operations)**
2. **Teaching and Learning Structure (Core Educational Delivery)**

It also establishes:

- 4 physical branches.
- 2 core divisions per branch:
  - Course
  - Kindergarten
- A defined role hierarchy.
- A five-stage new-student registration workflow.
- `branchId` and `division` as core data-scoping concepts.
- A preliminary mapping between business responsibilities and `src/features/` modules.

The blueprint is suitable as a **business/organizational source of truth**.

However, it is **not yet precise enough to be treated as the application's final authorization specification or Firestore security specification**.

The key architectural recommendation is:

> Do not translate the organizational hierarchy directly into Firestore permissions.

Instead, derive the technical authorization model from:

**Identity → Role → Organizational Scope → Resource → Action → Workflow State**

For practical implementation, the permission model should be reasoned about as:

**Role × Branch Scope × Division Scope × Resource × Action × State**

The blueprint currently points toward CRUD permissions. This audit recommends expanding that concept into **business actions**, because many critical MyLiberty operations are not adequately described as simple Create/Read/Update/Delete operations.

No application code should be changed solely because of this audit. The next step is to derive and verify the detailed scope/permission/data/state specifications against the current repository.

---

# 2. Source-Derived Baseline

## 2.1 Organizational Structure

The blueprint defines a two-pillar organizational model:

### Operational Structure

Responsible for:

- Business sustainability
- Branch management
- Lead management
- Finance
- Site administration

### Teaching and Learning Structure

Responsible for:

- Academic quality
- Curriculum delivery
- Student assessment
- Parent-instructor engagement

This separation should be preserved conceptually when designing application modules and permissions.

---

## 2.2 Branch and Division Structure

The blueprint states that the organization operates across:

- 4 physical branches

Each branch contains:

- Course Division
- Kindergarten Division

The blueprint therefore establishes two major organizational dimensions:

```text
branchId
division
```

with division values conceptually corresponding to:

```text
course
kindergarten
```

These are strong candidates for foundational data-scoping attributes.

### Important constraint

The presence of `branchId` and `division` does **not**, by itself, define authorization.

They define organizational context.

Authorization must additionally define:

- Who can access the context.
- Which resource is being accessed.
- Which operation is being performed.
- Whether the operation is valid in the resource's current state.

---

# 3. Role Hierarchy Baseline

The blueprint defines the following structure:

```text
Director
└── Vice Director
    └── 4 Physical Branches
        ├── Branch Manager
        │   ├── Marketing (Course Division)
        │   ├── Kindergarten Division Manager
        │   │   └── Marketing (Kindergarten Division)
        │   └── Operational Leader
        │       ├── Front Office / Admin
        │       └── Office Boy / Facilities
        └── Instructor Leader
            └── Instructors / Tutors
```

The blueprint also identifies students and parents as external actors.

---

## 3.1 Important Architectural Distinction

The hierarchy above is an **organizational reporting structure**.

It must not automatically become an authorization inheritance structure.

For example:

```text
Branch Manager
    ↓
Kindergarten Division Manager
```

does not automatically mean:

```text
Branch Manager = unrestricted access to everything Kindergarten Division Manager can access
```

unless that access is explicitly intended and verified.

Likewise:

```text
Instructor Leader
    ↓
Instructor
```

should not automatically imply unrestricted access to every instructor-owned resource.

### Required principle

Treat:

**Reporting relationship**

and

**authorization authority**

as separate concepts.

This prevents organizational hierarchy from accidentally becoming an over-broad security rule.

---

# 4. Registration Workflow Baseline

The blueprint defines five stages:

```text
Stage 1: Lead Capture
        ↓
Stage 2: Assessment
        ↓
Stage 3: Enrollment & Finance
        ↓
Stage 4: Academic Onboarding
        ↓
Stage 5: Active Learning
```

The workflow is a strong candidate for becoming the canonical business lifecycle for new-student onboarding.

---

## 4.1 Stage Responsibilities

### Stage 1 — Lead Generation & Intake

Actors:

- Marketing
- Front Office
- Prospect / Parent / Student

Responsibilities include:

- Capturing inquiries.
- Recording prospect identity and contact information.
- Recording age/grade.
- Selecting target division.

---

### Stage 2 — Placement Assessment

Actors:

- Front Office
- Instructor / Instructor Leader
- Prospect

Responsibilities include:

- Scheduling placement tests or diagnostic observation.
- Performing assessment.
- Recording recommended level.

---

### Stage 3 — Enrollment & Payment

Actors:

- Front Office
- Parent
- Branch Manager / Division Manager

Responsibilities include:

- Presenting program packages.
- Selecting available schedule slots.
- Completing enrollment.
- Recording tuition payment.
- Validating slot availability.
- Approving registration.

---

### Stage 4 — Academic Onboarding

Actors:

- Front Office
- Instructor Leader
- Assigned Instructor

Responsibilities include:

- Transitioning prospect/lead into active-student workflow.
- Assigning class.
- Assigning schedule.
- Assigning instructor.
- Sending onboarding information to parent.

---

### Stage 5 — Active Learning

Actors:

- Instructor
- Student
- Parent

Responsibilities include:

- Lesson delivery.
- Attendance tracking.
- Academic progress reporting.
- Parent feedback/monitoring.

---

# 5. Required Improvement: Explicit Workflow States

The blueprint defines stages but does not yet define a precise state machine.

Before implementation of complex workflow logic, the executor should derive explicit states.

A candidate structure is:

```text
LEAD
  ↓
ASSESSMENT_SCHEDULED
  ↓
ASSESSED
  ↓
ENROLLMENT_PENDING
  ↓
PAYMENT_PENDING
  ↓
APPROVED
  ↓
CLASS_ASSIGNED
  ↓
ACTIVE
```

Potential terminal/exception states may include:

```text
REJECTED
CANCELLED
WITHDRAWN
EXPIRED
```

### Important

The above state names are **recommended candidates**, not source-defined final states.

The executor must not introduce them blindly.

They must first be reconciled with the existing application's actual data model and existing status values.

### Required audit

Before changing workflow code:

1. Search the repository for existing student/lead/enrollment status values.
2. Identify all code paths that read or write those values.
3. Compare them with the business workflow in the blueprint.
4. Determine whether a state-machine normalization is actually required.
5. Avoid introducing duplicate or incompatible status systems.

---

# 6. Authorization Model Recommendation

## 6.1 Do Not Stop at CRUD

The blueprint's stated next step is to map explicit CRUD permissions for roles.

CRUD is useful, but insufficient as the sole authorization model.

Important MyLiberty operations are business actions such as:

- Schedule placement assessment.
- Submit assessment.
- Approve enrollment.
- Validate slot availability.
- Record tuition payment.
- Assign student to class.
- Assign instructor.
- Record attendance.
- Submit progress report.

These operations have business meaning beyond:

```text
create
read
update
delete
```

Therefore the technical permission model should support:

```text
Role
×
Branch Scope
×
Division Scope
×
Resource
×
Action
×
Workflow State
```

---

## 6.2 Recommended Permission Vocabulary

Do not implement this vocabulary blindly. It is a design target for the next audit.

Potential actions include:

```text
view
create
edit
delete
submit
approve
assign
schedule
record
validate
publish
```

The final action vocabulary should be kept as small as practical.

The goal is not to create hundreds of permissions.

The goal is to represent actual business authority clearly enough that Firestore rules, repositories, and UI guards can enforce the same model.

---

# 7. Resource Ownership Must Be Defined

The blueprint identifies several sensitive resources but does not yet define complete ownership/authority semantics.

At minimum, the following should be mapped:

| Resource | Business Area | Primary Actor(s) | Authority Still Needs Definition |
|---|---|---|---|
| Leads | Marketing / Front Office | Marketing, Front Office | Yes |
| Placement Assessments | Academic | Instructor, Instructor Leader | Yes |
| Students | Operations + Academic | Front Office, Instructors | Yes |
| Classes | Academic | Instructor Leader, Front Office | Yes |
| Attendance | Academic | Instructor | Yes |
| Progress Reports | Academic | Instructor | Yes |
| Payments | Finance / Operations | Front Office, Manager | Yes |
| Staff Users | Administration | Management | Yes |

The table is an audit checklist, not a final permission grant.

---

# 8. Data-Scoping Recommendation

The blueprint identifies:

```text
branchId
division
```

as core scoping fields.

This should remain the baseline.

However, every major resource should be reviewed to determine whether it needs:

- Direct `branchId`.
- Direct `division`.
- Derived branch/division through another resource.
- Explicit ownership.
- Assignment references.
- Parent/student relationship.
- Instructor/class relationship.

### Important security consideration

A document without a direct `branchId` is not necessarily insecure.

For example, a child resource may legitimately inherit organizational context through its parent.

However, Firestore Security Rules must be able to establish that relationship safely.

The executor must therefore inspect the actual repository schema before deciding whether every collection should receive duplicated scope fields.

Do not add fields merely to make rules appear simpler without checking consistency and data integrity implications.

---

# 9. Application Module Mapping

The blueprint proposes the following mapping:

| Module | Responsibility |
|---|---|
| `src/features/dashboard/marketing/` | Lead intake and campaign performance |
| `src/features/students/` | Prospect/student management and assessment records |
| `src/features/finance/` | Billing, payment logging, receipts |
| `src/features/classes/` | Class batching, scheduling, roster management |
| `src/features/attendance/` | Student attendance and staff clock-in/out |
| `src/features/dashboard/manager/` | Registration approvals, KPIs, financial summaries |
| `src/features/dashboard/instructor/` | Teaching workspace and academic operations |
| `src/features/dashboard/kids/` | Kindergarten-specific portal and parent interaction |

This should be treated as the **intended business responsibility map**, not proof that the current repository already implements these boundaries correctly.

The executor must verify the current repository against this mapping.

---

# 10. Architecture Risks Identified

## Risk R1 — Organizational hierarchy accidentally becomes authorization hierarchy

**Severity:** High

If code assumes:

```text
higher role = unrestricted lower-role access
```

authorization may become broader than intended.

### Required mitigation

Explicitly define resource-level actions and organizational scope.

---

## Risk R2 — CRUD-only authorization

**Severity:** High

CRUD alone may not adequately represent:

- approvals
- assignments
- submissions
- validation
- scheduling

### Required mitigation

Define a controlled business-action vocabulary.

---

## Risk R3 — Ambiguous workflow state

**Severity:** High

The five business stages do not yet define exact persisted status values.

### Required mitigation

Audit existing statuses before introducing or renaming any.

---

## Risk R4 — Scope fields treated as permissions

**Severity:** High

`branchId` and `division` identify organizational context but do not independently establish user authority.

### Required mitigation

Combine organizational scope with authenticated role and explicit resource/action rules.

---

## Risk R5 — Data ownership ambiguity

**Severity:** Medium/High

Several resources have multiple actors but no complete ownership model is defined in the blueprint.

### Required mitigation

Create a resource authority matrix before major permission-rule changes.

---

## Risk R6 — Blueprint/repository divergence

**Severity:** High

The blueprint describes the intended business architecture. It does not establish that the existing repository currently conforms to it.

### Required mitigation

Perform a repository verification pass before implementation.

---

# 11. Decisions / Working Principles

The following should be adopted as working architectural principles unless repository evidence disproves or refines them.

### Decision D1

The organizational blueprint is the **business-level reference model**.

### Decision D2

`branchId` and `division` remain the primary organizational scoping concepts.

### Decision D3

Organizational reporting hierarchy must not automatically imply unrestricted authorization.

### Decision D4

Authorization should be modeled around:

```text
Role
+ Scope
+ Resource
+ Action
+ State
```

### Decision D5

CRUD is a useful implementation primitive but should not be the complete business permission vocabulary.

### Decision D6

Workflow state transitions should be explicitly defined before implementing complex onboarding logic.

### Decision D7

No major security/schema refactor should be performed solely from this blueprint without first comparing it to the current repository.

---

# 12. Unresolved Questions

These questions must be answered before the blueprint can become a final technical authorization specification.

## Organizational Scope

1. Can Director access every branch and division?
2. Can Vice Director access every branch and division?
3. Is Branch Manager restricted to one branch?
4. Is Branch Manager automatically authorized for Course Division only, or does the Branch Manager have branch-wide authority?
5. Is Kindergarten Division Manager restricted to one branch and Kindergarten?
6. Can Instructor Leader access both divisions or only Course?
7. Can instructors access only their assigned classes, or all classes within their division?
8. Can Front Office access both divisions within a branch?
9. Can Marketing see only its own division's leads?
10. Can Operational Leader access student/financial data or only operational resources?
11. What, exactly, can Office Boy / Facilities access in the portal?

## Resource Ownership

12. Who owns a lead after intake?
13. Can Marketing edit a lead after Front Office takes over?
14. Who can modify assessment results after submission?
15. Can an instructor edit a progress report after publication?
16. Who can modify a class roster?
17. Who can reverse or correct attendance?
18. Who can modify a payment record?
19. Who can approve refunds/cancellations, if supported?
20. Who can create or deactivate staff accounts?

## Workflow

21. What exact status values exist today?
22. Which transitions are automatic?
23. Which transitions require approval?
24. Which transitions can be reversed?
25. What happens when payment fails or enrollment is cancelled?
26. What happens when no class slot is available?
27. What happens when a student withdraws?

## Scope/Data Model

28. Which collections contain direct `branchId`?
29. Which contain direct `division`?
30. Which inherit scope through references?
31. Can records ever move between branches?
32. Can a student belong to more than one division?
33. Can a staff member work across multiple branches?
34. Can an instructor teach across Course and Kindergarten?
35. Can a manager have multi-branch responsibility?

---

# 13. Maker–Checker–Signer Control Model

## 13.1 Architectural Position

Maker–Checker–Signer (MCS) should be treated as a **complementary control layer**, not a replacement for role-based access control.

The two mechanisms answer different questions:

### Role + Scope Authorization

Answers:

> Is this user allowed to participate in this business operation within this organizational scope?

### Maker–Checker–Signer

Answers:

> Is this operation sensitive enough that one authorized person must not be able to complete it unilaterally?

Therefore:

```text
Identity
   ↓
Role + Organizational Scope
   ↓
Business Action
   ↓
Sensitivity Assessment
   ├── Normal operation → Execute
   │
   └── Sensitive operation
           ↓
         Maker
           ↓
        Checker
           ↓
         Signer
           ↓
        Completed
```

This should become a major architectural principle for MyLiberty's sensitive workflows.

---

## 13.2 Why MCS Is Valuable for Director and Vice Director

Director and Vice Director should not automatically become unrestricted "super-admin" accounts simply because they occupy the highest organizational positions.

The blueprint defines them as province-wide strategic and oversight roles.

MCS provides a way to give senior leadership meaningful authority while preserving separation of duties.

Conceptually:

```text
Director
    ↓
highest-level approval/signing authority where explicitly required
```

rather than:

```text
Director
    ↓
unrestricted ability to modify every resource directly
```

Likewise, Vice Director can have broad multi-branch oversight and explicitly delegated approval authority without automatically receiving unrestricted write access to every operational record.

The exact permissions remain an unresolved design item and must be derived from the repository and business requirements.

---

## 13.3 MCS Must Not Be Applied Everywhere

MCS should be reserved for operations that are sufficiently sensitive, consequential, difficult to reverse, or authority-sensitive.

Normal operational activities should remain operationally efficient.

Examples of normal operations that should not automatically require MCS:

```text
Instructor → record ordinary attendance
Front Office → create ordinary prospect
Instructor → submit ordinary lesson/progress information
```

These examples are illustrative only and are not final permission decisions.

The executor must identify the actual sensitive-operation set before implementing MCS.

---

## 13.4 Candidate Sensitive Operations

The following are candidates for MCS review:

| Operation | Why It May Need MCS | Final Decision |
|---|---|---|
| Sensitive payment adjustment | Financial impact | TBD |
| Significant payment/refund action | Financial impact | TBD |
| Staff role/authority change | Security impact | TBD |
| Major organizational configuration change | System-wide impact | TBD |
| High-impact enrollment override | Business/financial impact | TBD |
| Exceptional access override | Security impact | TBD |
| Other irreversible or high-risk actions | Depends on impact | TBD |

These are **candidate categories**, not authorized final MCS rules.

Do not implement them as requirements until they are confirmed through the business/technical audit.

---

## 13.5 Separation of Duties

Where MCS is required, the system should prevent the same individual from silently completing every stage when the business policy requires independent review.

Conceptually:

```text
Maker
  ≠
Checker
  ≠
Signer
```

However, the exact independence requirements must be defined per operation.

For some lower-risk approvals, the business may require only:

```text
Maker → Checker
```

For higher-risk operations:

```text
Maker → Checker → Signer
```

The system should not introduce unnecessary approval stages merely because the MCS pattern exists.

---

## 13.6 MCS State Model

A sensitive operation should be modeled as a controlled workflow rather than as an ordinary direct document mutation.

A candidate conceptual lifecycle is:

```text
DRAFT
  ↓
SUBMITTED
  ↓
CHECKED
  ↓
SIGNED
  ↓
COMPLETED
```

Potential exception states may include:

```text
REJECTED
RETURNED
CANCELLED
EXPIRED
```

These states are design candidates only.

The executor must inspect the repository for existing approval/status models before introducing new state values.

---

## 13.7 Auditability Requirement

Sensitive MCS operations should be auditable.

At minimum, the eventual design should be able to establish:

```text
who created the request
who checked it
who signed it
what resource/action was affected
when each stage occurred
what decision was made
what changed
```

The implementation must preserve the distinction between:

- the person who **requested** an action,
- the person who **checked** it,
- the person who **approved/signed** it,
- and the final resource state.

Do not rely solely on the final resource document to reconstruct this history if the operation's sensitivity requires an independent audit trail.

---

## 13.8 Security Boundary

MCS must be enforced at the authoritative backend/security boundary where appropriate.

A UI such as:

```text
[Approve]
```

is not itself a security control.

The executor must verify whether Firestore Security Rules, backend operations, or another authoritative mechanism can prevent unauthorized direct completion of a sensitive action.

A user must not be able to bypass the intended MCS workflow simply by:

- calling a repository method directly,
- modifying a request payload,
- writing directly to Firestore,
- skipping a UI screen,
- or changing client-side state.

---

# 14. Revised Authorization Model

With MCS included, the recommended authorization model becomes:

```text
Identity
   +
Role
   +
Branch Scope
   +
Division Scope
   +
Resource
   +
Action
   +
Workflow State
   +
Sensitivity / Approval Requirement
```

For ordinary actions:

```text
Role + Scope + Resource + Action + State
        ↓
     Execute
```

For sensitive actions:

```text
Role + Scope + Resource + Action + State
        ↓
   MCS Required?
        ↓
       Yes
        ↓
Maker → Checker → Signer
        ↓
     Completed
```

This is the preferred conceptual model for future permission and security-rule design.

---

# 15. Risks Added / Reduced by MCS

## Risk R7 — Executive roles become unrestricted super-admins

**Severity:** High

Adding Director and Vice Director without an explicit control model could create excessive privilege.

### Mitigation

Use explicit role/scope/action permissions and MCS for selected sensitive operations.

---

## Risk R8 — MCS becomes mandatory for ordinary work

**Severity:** Medium

Over-applying approval workflows can make the portal slow and operationally impractical.

### Mitigation

Define a narrow, evidence-based sensitive-operation list.

---

## Risk R9 — MCS exists only in the UI

**Severity:** Critical

If approval is enforced only through UI buttons/screens, users may bypass it through direct writes or other client paths.

### Mitigation

Enforce sensitive-operation state transitions and authorization at the authoritative backend/security boundary.

---

## Risk R10 — Same person completes all MCS stages

**Severity:** High

If business policy requires separation of duties, allowing one identity to act as Maker, Checker, and Signer defeats the purpose.

### Mitigation

Define per-operation independence rules and enforce them authoritatively.

---

# 16. Updated Decisions / Working Principles

The previous decisions remain in force, with the following additions.

### Decision D8

Maker–Checker–Signer is a **second control layer** that complements role/scope authorization.

### Decision D9

Director and Vice Director should not be modeled as unrestricted super-admin roles merely because they are organizationally senior.

### Decision D10

MCS should be used selectively for sensitive, high-impact, difficult-to-reverse, or authority-sensitive operations.

### Decision D11

The exact MCS operation list must be derived and approved before implementation.

### Decision D12

Sensitive approval workflows must be protected at the authoritative security/backend boundary, not merely through UI restrictions.

### Decision D13

MCS workflows should maintain an auditable record of maker, checker, signer, timestamps, decisions, and affected operations where required by the sensitivity of the action.

---

# 17. Updated Unresolved Questions

Add the following questions to the existing unresolved-question set.

## MCS / Separation of Duties

35. Which MyLiberty operations are classified as sensitive?
36. Which operations require Maker → Checker only?
37. Which operations require Maker → Checker → Signer?
38. Which roles can act as Makers for each sensitive operation?
39. Which roles can act as Checkers?
40. Which roles can act as Signers?
41. Must Maker, Checker, and Signer always be different people?
42. Are there circumstances where the same person may perform two stages?
43. Can Director act as Signer for all sensitive operations?
44. Can Vice Director act as Signer?
45. Can Director and Vice Director initiate sensitive operations as Makers?
46. Who can reject or return a request?
47. What happens to a request that expires?
48. Can a submitted request be edited, or must it be returned/cancelled and recreated?
49. How are approval decisions recorded and audited?
50. Which MCS transitions must be enforced directly by Firestore Security Rules or another authoritative backend mechanism?

---

# 18. Revised Required Next Audit

Before implementing the new role model or MCS workflow, perform a repository verification pass.

## Step 1 — Inspect existing identity model

Verify:

- Authentication source.
- User profile structure.
- Current role values.
- Existing branch fields.
- Existing division fields.
- Any existing permission/claims system.
- Whether Director or Vice Director already exist under another role name.

## Step 2 — Inspect Firestore collections

Map:

```text
users
leads
students
classes
payments / transactions
attendance
assessments
progress reports
approval/audit collections
```

or their actual repository equivalents.

Do not assume these exact collection names exist.

## Step 3 — Inspect current Firestore Security Rules

For every relevant resource, determine:

- Who can read?
- Who can create?
- Who can update?
- Who can delete?
- Whether branch scope is enforced.
- Whether division scope is enforced.
- Whether role checks are enforced.
- Whether ownership/assignment is enforced.
- Whether privileged transitions are protected.
- Whether any approval/signing mechanism already exists.

## Step 4 — Inspect UI guards

Determine whether the UI is currently using:

- role checks
- branch checks
- division checks
- feature-level checks
- route-level checks

The UI must not be treated as the security boundary.

## Step 5 — Inspect repositories/services

Determine whether repositories independently enforce business constraints or merely depend on UI restrictions.

Pay particular attention to operations involving:

- payments
- enrollment approval
- staff authority
- class assignment
- sensitive administrative changes

## Step 6 — Inspect tests

Identify existing:

- Firestore emulator tests.
- Security-rule tests.
- Repository tests.
- Role/access tests.
- Workflow tests.
- Approval/audit tests.

Reuse the existing testing architecture rather than creating a parallel test strategy.

## Step 7 — Identify Existing Approval Patterns

Search the repository for concepts such as:

```text
approval
approve
checker
maker
signer
review
authorization
audit
status transition
pending
rejected
signed
```

Determine whether the application already contains partial approval infrastructure that should be extended instead of replaced.

---

# 19. Expected Deliverable From the Executor

The next executor task should produce an **audit/design report first**, not immediately modify application code.

The report should contain:

### A. Current-State Map

```text
Current role model
Current scope model
Current resource model
Current workflow/status model
Current security-rule model
Current UI authorization model
Current approval/audit model
```

### B. Blueprint Comparison

For each area:

```text
ALIGNED
PARTIALLY ALIGNED
DIVERGENT
UNKNOWN
```

### C. Permission Matrix

At minimum:

```text
Role
Branch Scope
Division Scope
Resource
Action
State Constraint
```

### D. Sensitive-Operation Matrix

For every candidate sensitive operation:

```text
Operation
Resource
Maker
Checker
Signer
Separation Requirement
Required Scope
Required State
Final Authority
Audit Requirement
```

### E. Workflow Matrix

For each state:

```text
Current State
Allowed Action
Actor
Next State
Approval Required
```

### F. Data Scope Matrix

For each collection/resource:

```text
Resource
Branch Scope
Division Scope
Ownership
Parent Reference
Security Enforcement
```

### G. Gap List

Each gap should include:

```text
ID
Severity
Current Behavior
Expected Behavior
Evidence
Recommended Fix
Risk
```

### H. Implementation Recommendation

Only after the above should the executor propose code changes.

---

# 20. Non-Goals for This Audit

This document does **not** authorize the executor to:

- Rewrite Firestore rules immediately.
- Implement Director/Vice Director immediately.
- Implement MCS immediately.
- Treat Director or Vice Director as unrestricted super-admins.
- Apply MCS to every workflow.
- Rename existing roles immediately.
- Rename existing status values immediately.
- Add `branchId` or `division` fields indiscriminately.
- Rewrite repositories.
- Restructure feature directories.
- Remove existing tests.
- Replace working authorization logic without repository evidence.
- Assume the blueprint is more accurate than verified production behavior when the two conflict.

Where the blueprint and repository disagree, the executor should **report the discrepancy first**.

---

# 21. Final Audit Position

The blueprint is a strong foundation for the business architecture.

The addition of Director and Vice Director is reasonable as an organizational model, but their technical authority must be explicitly defined.

Maker–Checker–Signer should be used to prevent senior organizational roles from becoming unnecessarily broad direct-write authorities for sensitive operations.

The preferred architecture is therefore:

```text
Business Blueprint
        ↓
Organizational Scope
        ↓
Role Definition
        ↓
Resource Ownership
        ↓
Action/Permission Model
        ↓
Sensitivity Classification
        ↓
MCS Requirement
        ↓
Workflow State Model
        ↓
Data Schema
        ↓
Firestore Security Rules
        ↓
Repository Enforcement
        ↓
UI Guards
        ↓
Tests
```

The central architectural principle is:

> **The application should enforce business authority, not merely reproduce the organizational chart.**

And for sensitive operations:

> **Being senior enough to participate in an operation does not automatically mean being authorized to complete it unilaterally.**

MCS should provide the separation-of-duties mechanism where the business risk justifies it.

The executor should not skip upward or downward in this chain without documenting why.

