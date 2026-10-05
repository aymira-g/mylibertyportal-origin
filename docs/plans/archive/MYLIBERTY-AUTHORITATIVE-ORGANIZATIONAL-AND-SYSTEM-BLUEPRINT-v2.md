# MyLiberty Portal — Authoritative Organizational & System Baseline (v2 — Superseded)

> [!WARNING]
> **SUPERSEDED ARCHIVE DOCUMENT (2026-10-05):**  
> This version 2 draft baseline has been **superseded** by **MyLiberty Authoritative Blueprint v3.0**, canonically located at:  
> 👉 [`docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md`](../../governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md)  
> This file is preserved under `docs/plans/archive/` solely for historical reference and chronology. Do not treat this document as active authority.

**Status:** ARCHIVED & SUPERSEDED BY V3  
**Document Type:** Historical organizational & system-governance baseline draft  
**Applies To:** Preserved historical reference only; superseded by [`docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md`](../../governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md)

---

# 1. Authority of This Document

This document is the authoritative baseline for the MyLiberty Portal organizational model, system authority model, role boundaries, access principles, workflow governance, and implementation constraints.

All human and AI agents working on MyLiberty Portal must treat this document as the primary source of truth.

No implementation, role, permission, dashboard, menu, workflow, data-access rule, or architectural decision may contradict this document unless an explicitly approved amendment changes the relevant rule.

When another document, implementation detail, prompt, code comment, UI design, or agent instruction conflicts with this document, this document takes precedence unless the conflicting material is an approved amendment.

This document defines the organization and the authority model. It does not delegate authority merely because a technical feature exists.

---

# 2. Core Organizational Identity

MyLiberty Portal supports a multi-branch English education company.

The organization operates through two organizational pillars:

1. **Operational Structure**
2. **Teaching and Learning Structure**

These pillars represent two distinct areas of company operation.

## 2.1 Operational Structure

The Operational Structure covers:

- business sustainability,
- branch management,
- lead management,
- finance,
- site administration,
- operational coordination,
- facilities support.

## 2.2 Teaching and Learning Structure

The Teaching and Learning Structure covers:

- academic quality,
- curriculum delivery,
- student assessment,
- teaching,
- attendance,
- student progress,
- parent-instructor engagement.

The two pillars interact operationally, but they remain distinct areas of responsibility.

---

# 3. Physical Branch Structure

The organization operates across **four physical branches** located across the province.

Each physical branch contains two core divisions:

1. **Course Division**
2. **Kindergarten Division**

## 3.1 Course Division

The Course Division provides general and academic English programs.

## 3.2 Kindergarten Division

The Kindergarten Division provides early-childhood English and foundational programs.

The branch structure and division structure are fundamental organizational boundaries.

---

# 4. Organizational Hierarchy

The organizational hierarchy is:

```text
Director
└── Vice Director
    └── Four Physical Branches
        ├── Branch Manager
        │   ├── Course Division
        │   │   └── Marketing (Course Division)
        │   ├── Kindergarten Division Manager
        │   │   └── Marketing (Kindergarten Division)
        │   └── Operational Leader
        │       ├── Front Office / Admin
        │       └── Office Boy / Facilities
        └── Instructor Leader
            └── Instructors / Tutors
```

The Branch Manager has a dual organizational responsibility:

- Branch Head
- Course Division Manager

The Kindergarten Division Manager reports to the Branch Manager.

The Marketing function for the Course Division reports to the Branch Manager in the Course Division Manager capacity.

The Marketing function for the Kindergarten Division reports to the Kindergarten Division Manager.

The Operational Leader coordinates branch-site operational functions.

The Front Office / Admin and Office Boy / Facilities functions operate under the Operational Leader.

The Instructor Leader manages the academic delivery structure.

Instructors / Tutors operate under the Instructor Leader.

---

# 5. Executive Roles

## 5.1 Director

The Director is an executive organizational role.

The Director is responsible for:

- overall strategic leadership,
- province-wide analytics,
- multi-branch performance oversight.

The Director is part of the organizational hierarchy.

The Director is not defined as the technical System Admin role.

## 5.2 Vice Director

The Vice Director is an executive organizational role below the Director.

The Vice Director operates within the executive organizational hierarchy and participates in province-wide and multi-branch oversight.

The Vice Director is not defined as the technical System Admin role.

---

# 6. Branch and Division Management

## 6.1 Branch Manager

The Branch Manager is responsible for overall physical branch operations.

The Branch Manager simultaneously serves as the Course Division Manager.

The Branch Manager therefore holds two organizational responsibilities:

- branch-level leadership,
- Course Division management.

The Branch Manager's authority is organizational and operational. It is not automatically technical system-administration authority.

## 6.2 Kindergarten Division Manager

The Kindergarten Division Manager reports to the Branch Manager.

The Kindergarten Division Manager manages:

- Kindergarten division operational targets,
- student programs,
- intake.

The Kindergarten Division Manager's authority is limited by the organizational scope of the Kindergarten Division and the authority delegated by the organizational hierarchy.

---

# 7. Marketing Functions

## 7.1 Course Division Marketing

Course Division Marketing operates under the Branch Manager in the Course Division Manager capacity.

Its organizational responsibility is target-aligned lead generation for the Course Division.

## 7.2 Kindergarten Division Marketing

Kindergarten Division Marketing operates under the Kindergarten Division Manager.

Its organizational responsibility is specialized early-childhood campaign activity for the Kindergarten Division.

Marketing functions are operational functions. Marketing authority does not automatically create academic, financial, technical, or executive authority.

---

# 8. Branch Site Operations

## 8.1 Operational Leader

The Operational Leader coordinates branch-site operations.

Responsibilities include:

- site logistics,
- facility maintenance coordination,
- front-office performance coordination.

The Operational Leader is an organizational operational role.

## 8.2 Front Office / Admin

Front Office / Admin is a branch operational function.

Responsibilities include:

- walk-in inquiries,
- online inquiries,
- placement-test scheduling,
- student enrollment handling,
- tuition-fee collection,
- parent communications.

The term **Front Office / Admin** in this organizational context does not mean the separate technical **System Admin** authority defined in Section 11.

These are different concepts and must remain different in the application.

## 8.3 Office Boy / Facilities

Office Boy / Facilities provides:

- physical branch maintenance support,
- operational support.

This function does not automatically receive management, financial, academic, or system-administration authority.

---

# 9. Academic Leadership and Delivery

## 9.1 Instructor Leader

The Instructor Leader is responsible for academic leadership and delivery coordination.

Responsibilities include:

- curriculum standardization,
- academic quality control,
- teacher schedule assignments,
- teacher evaluations.

The Instructor Leader operates within the Teaching and Learning Structure.

## 9.2 Instructors / Tutors

Instructors / Tutors are responsible for direct educational delivery.

Responsibilities include:

- placement tests,
- interactive lessons,
- attendance logging,
- periodic student progress reports.

Instructor authority is academic and operational within the scope assigned to the instructor.

Instructor authority does not automatically create branch-management, executive, finance, or technical-administration authority.

---

# 10. Students and Parents

Students and Parents are external actors in the organization's operating model.

Parents participate in:

- student progress monitoring,
- attendance tracking,
- financial transactions.

The application may provide controlled access to information and interactions for these external actors.

External access must not be treated as internal organizational authority.

---

# 11. System Administration Is Separate From the Organization

The technical **Admin** role is a system-access role.

It is not an organizational position in the company hierarchy.

The system must distinguish:

```text
Organizational Authority
├── Director
├── Vice Director
├── Branch Manager
├── Kindergarten Division Manager
├── Marketing functions
├── Operational Leader
├── Front Office / Admin
├── Office Boy / Facilities
├── Instructor Leader
└── Instructors / Tutors

System Administration
└── Admin
```

The organizational role **Front Office / Admin** must never be confused with the technical **Admin** system role.

---

# 12. Admin Authority

## 12.1 Core Rule

> **Admin has system authority, not automatic business authority.**

System Admin exists to maintain and operate the application as a technical system.

Admin may be granted technical capabilities required for:

- account and access administration,
- approved system configuration,
- technical maintenance,
- diagnostics,
- audit and system-event inspection,
- application support.

Admin does not automatically inherit organizational authority from any organizational role.

---

# 13. Admin Is Not Organizational Super-Authority

Admin must not automatically become:

- Director,
- Vice Director,
- Branch Manager,
- Kindergarten Division Manager,
- Instructor Leader,
- Finance authority,
- academic authority,
- organizational approval authority.

Admin must not receive business authority merely because the account has technical administrative access.

Admin must not automatically:

- approve business transactions,
- approve its own requests,
- bypass organizational approval chains,
- alter protected business records merely because of technical access,
- bypass separation-of-duties controls,
- silently alter or erase audit history,
- impersonate an organizational role,
- manufacture organizational authority through technical configuration.

Technical access and organizational authority must remain separate.

---

# 14. Role Identity Must Be Explicit

The system must distinguish the following concepts:

## 14.1 Organizational Role

Defines the person's real-world responsibility in the company.

## 14.2 System Access

Defines the person's technical access to the application.

## 14.3 Capability

Defines the specific operation the person is permitted to perform.

## 14.4 Workflow Authority

Defines what stage of a controlled workflow the person may act upon.

These concepts must not be collapsed into one generic permission such as:

```text
isAdmin = true
```

or:

```text
role = "admin"
```

when the actual business model requires more precise authority.

---

# 15. Authority Must Be Explicit

Every permission must answer four questions:

1. **Who** may perform the action?
2. **What** action may they perform?
3. **On which records or organizational scope** may they perform it?
4. **At which workflow state** may they perform it?

A role title alone is not sufficient to answer all four questions.

---

# 16. Permission Vocabulary

The system must use explicit capability meanings.

## View

The user may access information for permitted records and scope.

## Create

The user may create a new record.

## Edit

The user may modify an existing record within permitted scope and workflow state.

## Delete

The user may remove a record only where deletion is explicitly permitted.

Important business history should not be deleted merely to correct mistakes where an auditable correction, cancellation, or archival mechanism is required.

## Submit

The user may send a record or request into a controlled workflow.

## Check

The user may validate a submitted item before an approval decision.

## Approve

The user may authorize an action within explicitly assigned organizational authority.

## Sign

The user may provide final authorization where formal sign-off is required.

## Execute

The user may cause an approved action to take effect.

## Administer

The user may perform technical/system administration within explicitly assigned system authority.

These permissions are distinct and must not be treated as interchangeable.

---

# 17. Data Scope

The system uses organizational boundaries to control data access.

Core business records are scoped using:

- `branchId`
- `division`

## 17.1 branchId

`branchId` identifies one of the four physical branches.

## 17.2 division

`division` identifies one of the two organizational divisions:

- `course`
- `kindergarten`

The application must enforce data scope according to organizational responsibility.

A user must not receive organization-wide access merely because the user can access the application.

A user's access must be determined by the combination of:

- organizational role,
- system access,
- capability,
- branch scope,
- division scope,
- workflow authority.

---

# 18. Application Domains

The current system architecture identifies the following application domains.

| Domain | Responsibility | Organizational roles identified by the blueprint |
|---|---|---|
| Marketing | Lead intake, campaign performance tracking, prospect routing | Marketing functions |
| Students | Prospect profiling, placement-test records, active student management | Front Office / Admin, Instructors |
| Finance | Tuition billing, payment logging, receipt generation | Front Office / Admin, Branch Manager |
| Classes | Class batching, scheduling, roster management | Instructor Leader, Front Office / Admin |
| Attendance | Student lesson attendance and staff clock-in/out records | Instructors, System Admin |
| Manager Dashboard | Registration approvals, division KPIs, financial summaries | Branch and Division Managers |
| Instructor Dashboard | Teaching workspace, grading, class rosters, lesson logs | Instructors |
| Kindergarten Dashboard | Kindergarten division and parent interaction portal | Kindergarten staff, Parents |

These domain assignments define application responsibility. They do not, by themselves, grant unrestricted CRUD or approval authority to every listed role.

Specific capabilities must be defined through the role-permission model.

---

# 19. Dashboard Authority Rule

A dashboard is not an authority source.

A dashboard is an interface that exposes capabilities already granted by the authorization model.

The correct dependency is:

```text
Organizational Model
        ↓
Role Authority
        ↓
Capabilities
        ↓
Data Scope
        ↓
Workflow Authority
        ↓
Authorization Enforcement
        ↓
Dashboard and Menus
```

The system must not use this dependency:

```text
Dashboard Menu
        ↓
Assume Permission
```

A hidden button is not a security boundary.

A user must be denied by the actual authorization layer even if the corresponding UI element is hidden.

---

# 20. Menu Design Rule

Each dashboard menu must exist only because the current user has an authorized capability for that function.

A menu must not be created merely because the user's role sounds senior.

A role must not receive an entire domain simply because one operation in that domain is required.

Access must be as specific as the business responsibility requires.

---

# 21. Workflow Governance

Controlled business actions must use explicit workflow states where authorization, review, approval, or execution must be separated.

The general controlled workflow model is:

```text
Draft
  ↓
Submitted
  ↓
Checked
  ↓
Approved
  ↓
Executed
  ↓
Archived
```

Not every workflow requires every state.

The required states must be determined by the risk and business significance of the operation.

The system must not allow unauthorized users to skip required states.

The system must not allow unauthorized users to force a protected state transition.

---

# 22. Separation of Duties

Sensitive actions must preserve separation of duties.

The person who creates a sensitive action must not automatically be allowed to be the sole person who validates, approves, and executes that same action.

The application must prevent self-approval whenever the applicable workflow requires separation of duties.

Technical Admin access must not be used to bypass separation of duties.

---

# 23. Maker–Checker / Signer

Maker–Checker / Signer is a governance mechanism for sensitive operations.

It is risk-based. It is not required for normal company operations.

## Maker

The Maker creates or submits the action.

## Checker / Signer

The Checker / Signer independently reviews the action and provides the required approval or sign-off.

The Checker / Signer is a separate approval responsibility from the Maker.

The system must prevent self-approval whenever the applicable workflow requires independent review.

Execution after approval is a system or operational consequence of the approved action. It is not a separate governance role in the Maker–Checker / Signer model.

Not every business action requires Maker–Checker / Signer.

The organization must apply approval controls only where the sensitivity or risk of the action requires them.

The purpose of the model is to preserve accountability and separation of responsibility without introducing unnecessary approval bureaucracy.

# 24. Auditability

Important actions must produce an auditable record.

At minimum, controlled actions must preserve enough information to identify:

- the actor,
- the action,
- the affected record,
- the relevant workflow state,
- the resulting state,
- the time of the action.

Audit history must not be silently rewritten or erased by normal operational users.

Technical administrators must not use technical access to silently rewrite business history.

---

# 25. Self-Privilege Escalation Is Prohibited

The system must prevent a user from using their existing access to manufacture additional authority for themselves.

The following class of behavior is prohibited:

```text
User
→ changes own authority
→ performs restricted action
→ restores previous authority
```

Administrative access must not provide a hidden path around organizational authorization.

Any exceptional technical intervention must remain auditable and must not silently rewrite the organization's business history.

---

# 26. Role Authority Is Not Determined by Seniority Alone

A higher organizational position does not automatically grant every technical permission.

A technical Admin does not automatically receive higher organizational authority.

A senior organizational role does not automatically receive technical system-administration authority.

Authority must be explicitly assigned.

---

# 27. Current Organizational Responsibilities by Domain

The baseline currently establishes these responsibilities:

| Domain | Established responsibility |
|---|---|
| Strategic leadership | Director and Vice Director |
| Multi-branch oversight | Director and Vice Director |
| Branch operations | Branch Manager |
| Course Division management | Branch Manager |
| Kindergarten Division management | Kindergarten Division Manager |
| Course marketing | Course Division Marketing |
| Kindergarten marketing | Kindergarten Division Marketing |
| Site operations | Operational Leader |
| Front-office operations | Front Office / Admin |
| Facilities support | Office Boy / Facilities |
| Academic leadership | Instructor Leader |
| Teaching delivery | Instructors / Tutors |
| Placement testing | Instructors / Tutors |
| Attendance logging | Instructors / Tutors |
| Student progress reporting | Instructors / Tutors |
| Parent communications | Front Office / Admin |
| Tuition collection | Front Office / Admin |
| Tuition billing and payment records | Finance domain with Front Office / Admin and Branch Manager involvement identified by the blueprint |
| Class scheduling and roster management | Instructor Leader and Front Office / Admin |
| Technical system administration | System Admin |

Where the source architecture identifies a role as involved in a domain, that involvement must not be interpreted as unrestricted authority over the entire domain.

---

# 28. Explicit Boundary: Front Office / Admin vs System Admin

This distinction is mandatory.

## Front Office / Admin

Is an organizational branch-operation function.

Its established responsibilities include:

- inquiries,
- placement-test scheduling,
- student enrollment handling,
- tuition-fee collection,
- parent communications.

## System Admin

Is a technical system-access role.

Its established purpose is:

- application maintenance,
- technical access administration,
- system configuration,
- diagnostics,
- audit/system support.

The two roles must not be merged merely because both contain the word "Admin".

---

# 29. Current System Data Model Boundary

The current architecture identifies these core business collections:

- `users`
- `leads`
- `students`
- `classes`
- `payments`

These collections use:

- `branchId`
- `division`

as organizational scoping fields.

The data model must preserve the organization's branch and division boundaries.

Field-level permissions and complete CRUD matrices are not established by this baseline alone. They must be derived from the approved role authority model rather than guessed.

---

# 30. Current Feature Boundary

The current application architecture identifies these feature areas:

```text
src/features/dashboard/marketing/
src/features/students/
src/features/finance/
src/features/classes/
src/features/attendance/
src/features/dashboard/manager/
src/features/dashboard/instructor/
src/features/dashboard/kids/
```

The feature structure must remain subordinate to the authority model.

A feature's existence does not imply that every user can access it.

A role's access to a feature does not imply unrestricted access to every operation inside that feature.

---

# 31. Role Definition Standard

Every organizational role must eventually be defined using the following structure:

## Role identity

- organizational name,
- organizational purpose,
- reporting relationship,
- direct reports where established.

## Responsibilities

The actual responsibilities established for the role.

## Authority

The decisions and actions the role is authorized to make.

## Data scope

The organizational records the role may access.

## Capabilities

The exact operations the role may perform.

## Prohibited actions

The actions the role must not perform.

## Approval authority

The actions the role may approve.

## Workflow participation

Whether the role may act as:

- Maker,
- Checker,
- Signer,
- Executor,
- Observer.

## Dashboard and menu access

The application surfaces required to perform the authorized responsibilities.

Dashboard access is determined last.

---

# 32. Role-by-Role Governance Order

The authority model will be defined in this order:

1. System Admin boundary
2. Director
3. Vice Director
4. Branch Manager
5. Kindergarten Division Manager
6. Marketing functions
7. Operational Leader
8. Front Office / Admin
9. Instructor Leader
10. Instructors / Tutors
11. Office Boy / Facilities
12. External actor access
13. Cross-role authority audit

This sequence establishes the authority boundary before detailed dashboard implementation.

---

# 33. Cross-Role Audit Requirement

After role definitions are established, the complete model must be audited as one system.

The audit must identify:

## Authority gaps

- required actions with no authorized actor,
- required approvals with no authorized approver,
- workflows with no authorized executor.

## Excess authority

- unnecessary access,
- unrelated data access,
- broad permissions unsupported by responsibility,
- accidental System Admin business authority.

## Separation-of-duties failures

- self-approval,
- one-person control of sensitive workflows,
- technical bypasses,
- conflicting workflow roles.

## Data-scope failures

- branch boundary violations,
- division boundary violations,
- unauthorized organization-wide access,
- access to unrelated sensitive records.

## Workflow failures

- unauthorized state transitions,
- skipped approval states,
- unauthorized rollback,
- silent modification after approval.

## Audit failures

- missing actor identity,
- missing timestamps,
- missing state history,
- silent alteration of important records.

The cross-role audit is mandatory before the authority model is considered implementation-ready.

---

# 34. Implementation Rules for Human and AI Agents

Any human or AI agent working on MyLiberty Portal must follow these rules:

1. Do not invent a new organizational role without an approved organizational decision.
2. Do not treat System Admin as an organizational role.
3. Do not treat Front Office / Admin as System Admin.
4. Do not create a permission solely because a dashboard needs a button.
5. Do not grant broad access merely because a role is senior.
6. Do not grant business authority merely because a user has technical Admin access.
7. Do not use hidden UI elements as the security mechanism.
8. Do not bypass backend/data authorization.
9. Do not allow self-approval where separation of duties applies.
10. Do not bypass protected workflow states.
11. Do not silently delete or rewrite important business history.
12. Do not invent missing business rules.
13. If the authoritative baseline does not establish a required rule, flag the gap for governance decision instead of guessing.
14. When implementing a rule, preserve the organizational branch and division boundaries.
15. When changing a governed rule, update the authoritative baseline through the approved amendment process before treating the new rule as authoritative.

---

# 35. Handling Ambiguity

The system must not resolve organizational ambiguity by silently guessing.

When the baseline establishes a responsibility but does not establish its exact permission level, the executor must:

1. preserve the established responsibility,
2. identify the missing authority rule,
3. avoid granting broader authority than necessary,
4. record the unresolved governance question,
5. obtain an approved decision before finalizing the permission.

The absence of a permission is not permission.

The existence of a feature is not permission.

The existence of a role title is not unrestricted authority.

---

# 36. Conflict Resolution

When two implementation requirements conflict:

1. This authoritative baseline takes precedence.
2. An approved amendment to this baseline takes precedence over the previous version.
3. Organizational authority takes precedence over UI assumptions.
4. Explicit capability rules take precedence over role-title assumptions.
5. Backend authorization takes precedence over frontend visibility.
6. Separation-of-duties rules take precedence over convenience.
7. Auditability takes precedence over silent correction of important history.

No AI or implementation agent may resolve a governance conflict by inventing a new rule and treating it as authoritative.

---

# 37. Change and Amendment Control

A change to any of the following requires an explicit governance decision:

- organizational hierarchy,
- role definition,
- reporting line,
- business responsibility,
- system-admin boundary,
- permission,
- data scope,
- approval authority,
- workflow state,
- separation-of-duties rule,
- dashboard authority boundary.

The change must be reflected in this authoritative baseline.

Implementation must follow the amended baseline rather than creating a separate competing rule set.

---

# 38. Non-Negotiable System Principles

The following principles are mandatory:

### Principle 1 — Organization before UI

The real organizational model is defined before dashboard design.

### Principle 2 — Authority before menus

Permissions are defined before menus.

### Principle 3 — Backend enforcement

Security is enforced by authorization and data rules, not by hidden UI elements.

### Principle 4 — Admin separation

System Admin is separate from organizational authority.

### Principle 5 — Least necessary authority

Roles receive the authority required for their responsibilities, not unlimited access.

### Principle 6 — Separation of duties

Sensitive actions must not be controlled by one person where the workflow requires independent validation or approval.

### Principle 7 — Auditability

Important actions must remain traceable.

### Principle 8 — No invented business rules

Unknown rules are governance gaps, not invitations to guess.

### Principle 9 — Branch and division boundaries

The four-branch and two-division organizational structure must remain represented in data access and operational design.

### Principle 10 — Single source of truth

This baseline is the authoritative reference for the rules it establishes.

---

# 38. Durable Governance Boundary

This authoritative baseline contains durable organizational truths and durable governance rules.

It defines:

- the organizational structure,
- organizational roles and responsibilities,
- reporting relationships,
- authority boundaries,
- System Admin separation,
- permission principles,
- data-scope principles,
- approval and separation-of-duties principles,
- dashboard authority principles,
- auditability requirements,
- constraints for human and AI implementation agents.

Temporary technical implementation decisions do not belong in this baseline.

Technical workflows, UI decisions, implementation details, feature-specific procedures, and other changeable technical matters must be governed in separate technical documentation unless they represent a durable organizational rule.

The authoritative baseline must remain valid even if the application is redesigned or rebuilt.

# 39. Implementation Readiness Boundary

This baseline is authoritative for:

- organizational structure,
- organizational roles,
- reporting relationships established in the source blueprint,
- organizational responsibilities,
- System Admin separation,
- authority principles,
- permission vocabulary,
- data-scope principles,
- workflow governance principles,
- dashboard authority principles,
- separation-of-duties principles,
- auditability principles,
- implementation-agent constraints.

This baseline does **not** yet define:

- the complete field-level permission matrix for every role,
- every CRUD operation for every collection,
- every approval threshold,
- every workflow in the company,
- every dashboard menu,
- every UI component,
- every Firestore Security Rule,
- every exception or emergency procedure,
- temporary technical workflow decisions.

Those items must be derived from this baseline through explicit role-by-role governance work.

---

# 40. Current Governance Status

The authoritative organizational structure is established.

The System Admin boundary is established.

The authority model is established at the governance level.

Detailed role permissions remain to be defined role by role.

Detailed dashboard menus remain to be derived from those permissions.

The cross-role audit remains mandatory before final implementation authority is granted.

The application should not treat unfinished permission matrices as permission to invent access.

---

# 41. Foundation Statement

> **MyLiberty Portal represents the real organization first, separates organizational authority from technical system administration, limits access by explicit role, capability, scope, and workflow state, and requires auditable separation of duties for sensitive operations.**
