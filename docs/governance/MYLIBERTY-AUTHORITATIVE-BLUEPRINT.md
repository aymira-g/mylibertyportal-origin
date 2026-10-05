# MyLiberty Portal — Authoritative Organizational, Authority & Rebuild Blueprint

**Version:** 3.0
**Status:** PROPOSED AUTHORITATIVE BASELINE FOR OWNER APPROVAL
**Date:** 2026-10-05
**Scope:** Organizational identity, authority, access governance, workflow governance, data-scope principles, implementation derivation, and rebuild/re-foundation rules

> **Canonical Repository Location:** `docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md`  
> **Authority Level:** Authoritative Governance Baseline (Governs organizational identity, authority boundaries, roles, separation of duties, and access governance)  
> **Technical Counterparts:** Architecture is governed by [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md); accepted policies by [`docs/decisions/`](../decisions/README.md); agent behavior by [`AGENTS.md`](../../AGENTS.md)  


> **Purpose**
>
> This document establishes the durable organizational truth and authority model from which MyLiberty Portal must be designed, rebuilt, implemented, reviewed, and audited.
>
> It is intentionally independent of a specific frontend framework, database, folder layout, or deployment platform.
>
> The existing application is the starting implementation. The goal is to reconcile it to this blueprint through controlled, evidence-based change — not to rewrite the project merely because a cleaner structure appears possible.

---

# 1. Authority and Status

## 1.1 What this document governs

This blueprint is authoritative for the following subject matter:

- organizational structure;
- organizational roles and reporting relationships that have been established;
- organizational responsibilities;
- durable authority boundaries;
- separation of organizational authority from technical system administration;
- access-governance principles;
- data-scope principles;
- workflow-governance principles;
- separation-of-duties principles;
- auditability requirements;
- constraints placed on human and AI implementation agents;
- the process by which detailed permissions and implementation decisions are derived.

## 1.2 What this document does not govern

This blueprint does **not** itself define:

- framework-specific implementation;
- database field names;
- collection names;
- repository or source-code paths;
- UI component structure;
- exact dashboard layouts;
- exact Firestore rules;
- transient technical workarounds;
- deployment commands;
- individual test-case implementation;
- temporary migration tactics.

Those belong to technical architecture, specifications, plans, or implementation records.

## 1.3 Authority is subject-specific

MyLiberty documentation must not use a single blanket hierarchy in which one document is assumed to override all others regardless of subject.

The governing relationship is:

```text
REAL ORGANIZATION
        ↓
AUTHORITATIVE ORGANIZATIONAL BASELINE
        ↓
ACCEPTED GOVERNANCE / ARCHITECTURAL DECISIONS
        ↓
CURRENT ARCHITECTURE
        ↓
SYSTEM / SUBSYSTEM SPECIFICATIONS
        ↓
IMPLEMENTATION PLANS / PROPOSALS
        ↓
CODE + CONFIGURATION
        ↓
AUDIT EVIDENCE / VERIFICATION
```

With a separate execution layer:

```text
AGENT INSTRUCTIONS
        ↓
How a human or AI agent must behave while operating
within the governed system above.
```

Rules:

1. The organizational baseline governs the real-world organization and durable authority model.
2. Accepted decisions may refine or extend the baseline where explicitly approved and must not contradict it.
3. Architecture documentation governs how the approved model is technically represented at a point in time.
4. Specifications govern detailed system behavior.
5. Plans and proposals are not authority until explicitly accepted.
6. Audits provide evidence about the difference between approved state and implemented state; an audit finding does not silently become policy.
7. Agent instructions govern how an implementation agent works within these constraints.

When two documents disagree, first determine whether they are speaking about the same subject. Then apply the authority appropriate to that subject.

---

# 2. Current-State vs Approved-State Principle

This blueprint defines the **approved governance target** whether or not the current software already complies with it.

Therefore:

```text
APPROVED GOVERNANCE
        ↓
CURRENT IMPLEMENTATION
        ↓
GAP / DRIFT
        ↓
CONTROLLED IMPLEMENTATION WORK
        ↓
VERIFICATION
```

A mismatch between the software and this blueprint is not automatically a reason to alter the blueprint.

A mismatch must first be classified as one of:

- implementation defect;
- architecture drift;
- incomplete implementation;
- legacy compatibility behavior;
- unresolved governance question;
- legitimate exception.

No agent may resolve a governance question by changing technical behavior and then treating the resulting behavior as authoritative.

---

# 3. Core Organizational Identity

MyLiberty Portal supports a multi-branch English education company.

The organization operates through two distinct pillars:

1. **Operational Structure**
2. **Teaching and Learning Structure**

These pillars cooperate in the operation of the company but remain distinct areas of responsibility.

## 3.1 Operational Structure

The Operational Structure covers:

- business sustainability;
- branch management;
- lead management;
- finance;
- site administration;
- operational coordination;
- facilities support.

## 3.2 Teaching and Learning Structure

The Teaching and Learning Structure covers:

- academic quality;
- curriculum delivery;
- student assessment;
- teaching;
- attendance;
- student progress;
- parent-instructor engagement.

---

# 4. Physical Organization

The current organization operates through **four physical branches** across the province.

Each branch contains two core divisions:

1. **Course Division**
2. **Kindergarten Division**

The current four-branch / two-division structure is an organizational fact at the time of this blueprint.

It is not a permanent promise that the company can never reorganize.

Any addition, removal, merger, or restructuring of organizational units requires an explicit governance amendment.

---

# 5. Organizational Hierarchy

The established hierarchy is:

```text
Director
└── Vice Director
    └── Four Physical Branches
        ├── Branch Manager
        │   ├── Course Division
        │   │   └── Course Division Marketing
        │   ├── Kindergarten Division Manager
        │   │   └── Kindergarten Division Marketing
        │   └── Operational Leader
        │       ├── Front Office / Admin
        │       └── Office Boy / Facilities
        └── Instructor Leader
            └── Instructors / Tutors
```

Important established relationships:

- The Branch Manager is simultaneously the **Branch Head** and **Course Division Manager**.
- The Kindergarten Division Manager reports to the Branch Manager.
- Course Division Marketing reports to the Branch Manager in the Course Division Manager capacity.
- Kindergarten Division Marketing reports to the Kindergarten Division Manager.
- The Operational Leader coordinates branch-site operational functions.
- Front Office / Admin and Office Boy / Facilities operate under the Operational Leader.
- The Instructor Leader manages the academic delivery structure.
- Instructors / Tutors operate under the Instructor Leader.

The reporting relationship of the Instructor Leader above the branch level is **not yet established by this blueprint** and must not be guessed.

---

# 6. Organizational Roles

## 6.1 Director

**Organizational purpose:** Executive strategic leadership.

**Established responsibilities:**

- overall strategic leadership;
- province-wide analytics;
- multi-branch performance oversight.

The Director is an organizational role.

The Director is **not** automatically the technical System Admin.

The Director does not receive technical system-administration authority merely by holding executive office.

## 6.2 Vice Director

**Organizational purpose:** Executive leadership below the Director.

**Established responsibilities:**

- participation in executive leadership;
- province-wide and multi-branch oversight within the authority actually delegated to the role.

The exact division of decision authority between Director and Vice Director is not fully established by this blueprint and remains an owner-governance question.

The Vice Director is not automatically the technical System Admin.

## 6.3 Branch Manager

The Branch Manager is responsible for overall physical branch operations and simultaneously serves as Course Division Manager.

**Established responsibilities:**

- branch-level leadership;
- branch operations;
- Course Division management;
- management oversight relevant to the branch and course division.

The Branch Manager's organizational authority does not automatically create technical system-administration authority.

## 6.4 Kindergarten Division Manager

The Kindergarten Division Manager reports to the Branch Manager.

**Established responsibilities:**

- Kindergarten division operational targets;
- student programs;
- intake;
- leadership of the Kindergarten Division and its approved support functions.

The role's authority is limited to established organizational scope and explicitly delegated authority.

## 6.5 Course Division Marketing

Course Division Marketing operates under the Branch Manager in the Course Division Manager capacity.

**Established responsibility:**

- target-aligned lead generation for the Course Division.

Marketing authority is operational. It does not automatically create academic, financial, executive, or technical authority.

## 6.6 Kindergarten Division Marketing

Kindergarten Division Marketing operates under the Kindergarten Division Manager.

**Established responsibility:**

- specialized campaign activity for the Kindergarten Division.

Marketing authority does not automatically create academic, financial, executive, or technical authority.

## 6.7 Operational Leader

The Operational Leader coordinates branch-site operations.

**Established responsibilities:**

- site logistics;
- facility-maintenance coordination;
- front-office performance coordination.

The Operational Leader is an operational organizational role, not System Admin.

## 6.8 Front Office / Admin

Front Office / Admin is a branch operational function.

**Established responsibilities:**

- walk-in inquiries;
- online inquiries;
- placement-test scheduling;
- student enrollment handling;
- tuition-fee collection;
- parent communications.

**Mandatory naming boundary:** Front Office / Admin is not the technical System Admin role.

## 6.9 Office Boy / Facilities

Office Boy / Facilities provides:

- physical branch maintenance support;
- operational support.

This function does not automatically receive:

- management authority;
- financial authority;
- academic authority;
- system-administration authority.

## 6.10 Instructor Leader

The Instructor Leader leads academic delivery.

**Established responsibilities:**

- curriculum standardization;
- academic quality control;
- teacher schedule assignments;
- teacher evaluations.

The Instructor Leader belongs to the Teaching and Learning Structure.

The exact higher-level reporting line remains an explicit governance gap until confirmed.

## 6.11 Instructors / Tutors

Instructors / Tutors provide direct educational delivery.

**Established responsibilities:**

- placement tests;
- interactive lessons;
- attendance logging;
- periodic student progress reports.

Their authority is academic and operational within assigned scope.

## 6.12 Students

Students are external actors in the internal organizational hierarchy, while remaining first-class participants in the service provided by the company.

Student-facing access must be limited to information and interactions legitimately belonging to the student.

## 6.13 Parents

Parents are external actors.

Established participation includes:

- monitoring student progress;
- attendance tracking;
- financial transactions.

Parent access is controlled access to authorized child-related information, not internal organizational authority.

## 6.14 Unresolved Kindergarten staffing

The phrase **"Kindergarten staff"** is not itself an approved organizational role.

No new role such as Kindergarten Teacher, Kindergarten Front Desk, or equivalent may be invented merely to satisfy an implementation need.

Any missing Kindergarten role must be confirmed and added through governance amendment before it receives authority.

---

# 7. System Administration Is Separate From the Organization

## 7.1 System Admin definition

**System Admin** is a technical system-access role.

It is not a position in the organizational hierarchy.

Its purpose is to maintain the application and its technical operating environment.

## 7.2 System Admin may administer

Where explicitly assigned, System Admin may perform technical capabilities required for:

- account and access administration;
- approved system configuration;
- technical maintenance;
- diagnostics;
- audit/system-event inspection;
- application support.

## 7.3 System Admin may not inherit business authority automatically

System Admin does not automatically become:

- Director;
- Vice Director;
- Branch Manager;
- Kindergarten Division Manager;
- Instructor Leader;
- Finance authority;
- academic authority;
- organizational approval authority.

Technical access must never be interpreted as a shortcut to business authority.

## 7.4 System Admin may not

System Admin must not use technical access to:

- approve its own business request where independent approval is required;
- bypass an organizational approval chain;
- alter protected business records merely because the system permits technical access;
- bypass separation-of-duties controls;
- silently rewrite or erase audit history;
- impersonate an organizational role;
- create organizational authority by editing technical configuration;
- create a hidden self-privilege-escalation path.

Exceptional technical intervention must remain auditable.

---

# 8. Organizational Role vs System Access vs Capability vs Workflow Authority

The system must distinguish four separate concepts.

## 8.1 Organizational Role

Who the person is within the real company.

## 8.2 System Access

Which application access modes the person has.

## 8.3 Capability

Which specific operation the person may perform.

## 8.4 Workflow Authority

Which stage of a controlled business process the person may act upon.

No implementation may collapse these concepts into a generic condition such as:

```text
isAdmin = true
```

or:

```text
role = "admin"
```

when the actual business decision requires more precision.

---

# 9. Explicit Authority Test

Every permission must answer four questions:

1. **Who** may perform the action?
2. **What** may they do?
3. **Which organizational scope or records** does the authority cover?
4. **At which workflow state** may the action occur?

If one of these answers is missing, the permission is not implementation-ready.

The absence of a permission is not permission to guess.

---

# 10. Capability Vocabulary

The following terms have distinct meanings.

| Capability | Meaning |
|---|---|
| View | Access information for permitted records and scope |
| Create | Create a new record |
| Edit | Modify an existing record within permitted scope and workflow state |
| Delete | Remove a record only where deletion is explicitly authorized |
| Submit | Send a record/request into a controlled workflow |
| Check | Validate a submitted item before a decision |
| Approve | Authorize an action within assigned authority |
| Sign | Provide formal final sign-off where required |
| Execute | Cause an approved action to take effect |
| Administer | Perform technical/system administration within explicitly assigned system authority |

These capabilities are not interchangeable.

A user does not gain `Approve` merely because they can `Edit`.

A user does not gain `Administer` merely because they are organizationally senior.

A user does not gain `Execute` merely because they can view an approved record.

---

# 11. Data Scope Principles

The organization is multi-branch and multi-division. The application must represent that organizational boundary in its authorization model.

The durable principle is:

> Every business record must belong to an appropriate organizational scope, and access must be limited to the scope justified by the user's responsibility.

The current organization uses:

- four physical branches;
- Course Division;
- Kindergarten Division.

Technical implementations may use any appropriate representation of those boundaries. The representation must remain consistent with the real organization.

## 11.1 Scope dimensions

Where relevant, access must consider:

- organizational role;
- system access;
- capability;
- branch scope;
- division scope;
- workflow state;
- record relationship;
- external-actor relationship where applicable.

## 11.2 No accidental organization-wide access

A user does not receive province-wide or all-branch access merely because:

- the user can log in;
- the user has a senior title;
- the user has a technical admin account;
- a dashboard needs a report;
- a client-side filter is absent.

Organization-wide access must be explicitly justified and authorized.

---

# 12. Domain Responsibility Principle

Application domains represent business areas, not automatic permission grants.

Current major business domains include:

- Marketing;
- Students;
- Finance;
- Classes;
- Attendance;
- Staff Operations;
- Reporting and Analytics;
- Parent / Student access;
- role-specific dashboards.

A domain may have multiple participating organizational roles.

Participation does not imply unrestricted access to every operation in the domain.

The responsible question is always:

```text
Role
  + Capability
  + Scope
  + Workflow state
  = Authorized action
```

---

# 13. Dashboard Authority Rule

A dashboard is an interface, not an authority source.

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
Dashboard / Menu
```

Never:

```text
Dashboard Menu
        ↓
Assume Permission
```

A hidden button is not a security boundary.

Backend/data authorization must reject unauthorized operations even when an unauthorized user manages to call the underlying operation directly.

---

# 14. Workflow Governance

Controlled business actions must use explicit workflow states whenever review, authorization, approval, or execution must be separated.

The canonical controlled pattern is:

```text
Draft
  ↓
Submitted
  ↓
Checked / Independently Reviewed where required
  ↓
Approved
  ↓
Executed
  ↓
Archived / Completed
```

Not every workflow requires every state.

The required states depend on the risk and business significance of the action.

No unauthorized user may:

- skip a required approval state;
- force a protected state transition;
- roll back a protected state without authority;
- silently change material data after approval;
- create a fake approval merely by manipulating technical state.

---

# 15. Simplified Maker–Checker / Signer Model

For sensitive actions, use the following governance model:

```text
Maker
  ↓
Checker / Signer
  ↓
Approved
  ↓
Execution
```

## 15.1 Maker

Creates or submits the action/request.

## 15.2 Checker / Signer

Independently reviews the action and gives the required approval or sign-off.

## 15.3 Execution

Execution is the consequence of an approved action.

Execution does **not** create a mandatory separate human governance role.

The system may technically represent execution as an operation or state transition, but the governance model does not require a separate human Executor for every sensitive workflow.

## 15.4 Normal vs sensitive action

The desired operating principle is:

```text
Normal action
    → one appropriate person

Sensitive action
    → Maker → Checker / Signer
```

Maker–Checker / Signer is risk-based. It is not a rule that every company operation must pass through multiple humans.

---

# 16. Separation of Duties

For sensitive actions requiring independent review:

> **Maker and Checker / Signer must be different human beings.**

Two labels assigned to the same human do not constitute meaningful separation.

The system must therefore evaluate the **human actor identity**, not merely the role labels attached to the account.

## 16.1 Limited-staff exception

MyLiberty operates as a real organization and may occasionally lack sufficient staff for the ideal normal separation.

The exception policy is therefore:

- never share credentials;
- never create a fake second user merely to simulate independence;
- use the highest legitimately available independent authority;
- record the exception and the reason;
- require later review where appropriate.

The exact emergency/limited-staff procedure is a later governance decision and may not be invented by an implementation agent.

---

# 17. Sensitive-Action Governance

The model cannot be implemented safely until the organization defines what qualifies as a sensitive action.

The following list is the **initial candidate set** derived from the governance discussion. It is **not automatically approved merely because it appears here**.

Candidate categories:

- staff role or access changes;
- staff termination or other high-impact staff-status changes;
- refunds;
- payment corrections or voids;
- material discounts;
- tuition-price changes;
- attendance corrections with payroll implications;
- deletion of important business records;
- broad data exports;
- other actions later designated by explicit governance decision.

The owner/governance authority must approve, reject, or refine this list before detailed permissions are finalized.

Until an action is explicitly classified, an implementation agent must not invent a more permissive interpretation merely for convenience.

---

# 18. Financial Governance Principles

Money handling deserves early workflow definition.

The system must distinguish normal operational collection from sensitive financial correction.

### Normal payment collection

Ordinary tuition collection should remain operationally simple within the responsibilities legitimately assigned to Front Office / Admin and other authorized roles.

### Sensitive financial correction

Actions such as the following are candidates for controlled approval:

- refunds;
- voids;
- material corrections;
- unusual discounts;
- tuition-price changes.

The exact approval thresholds and authorized approvers remain governance decisions.

No technical implementation may invent monetary thresholds.

The financial workflow should preserve enough information to trace:

- who initiated the action;
- what changed;
- why it changed;
- who approved it when approval was required;
- when it occurred;
- resulting financial state.

---

# 19. Parent and Child Data Privacy Principle

Personal information must be accessible only to people whose responsibilities genuinely require it.

Information concerning children requires additional care and must be restricted to legitimate business or participant need.

The organization should minimize unnecessary exposure of:

- child personal information;
- parent contact details;
- academic/progress information;
- attendance history;
- financial information.

This is a durable governance principle, not a substitute for legal advice or a legal-compliance manual.

Specific legal obligations must be verified separately against authoritative applicable sources.

---

# 20. External Actor Boundary

Students and Parents are not internal managerial roles.

External access must be deliberately scoped.

Parent access should be based on an explicitly authorized relationship to the child or children.

Student access should be limited to the student's own legitimate information and functions.

Neither parent nor student access may be used as an indirect route to another family's or student's data.

External access must not grant:

- internal organizational approval authority;
- branch management authority;
- financial administration authority beyond explicitly intended participant actions;
- system administration authority.

---

# 21. Auditability

Important actions must produce an auditable record.

At minimum, an audit record for a controlled action must be sufficient to establish:

- actor identity;
- action performed;
- affected record or subject;
- relevant workflow state before the action;
- resulting workflow state;
- time of action;
- approval identity where approval occurred;
- whether an exception was used where applicable.

Normal operational users must not silently rewrite or erase important audit history.

Technical administrators must not use technical access to silently rewrite business history.

Correction should generally be represented as a new accountable action rather than destructive rewriting of historical truth.

---

# 22. Self-Privilege Escalation Prohibition

A user must not be able to use their own existing access to manufacture additional authority and then use it.

The prohibited pattern is:

```text
User
  ↓
changes own authority
  ↓
performs restricted action
  ↓
restores prior authority
```

Any workflow that changes a person's authority must itself be governed.

Technical Admin must not provide a hidden path around this rule.

Any emergency technical intervention must remain auditable and must not silently change the organization's historical record.

---

# 23. Role Seniority Is Not a Permission Shortcut

Neither organizational seniority nor technical status is sufficient by itself to determine all permissions.

Therefore:

- a senior organizational role does not automatically receive technical Admin authority;
- technical Admin does not automatically receive executive authority;
- a manager does not automatically receive unrestricted finance authority;
- an instructor does not automatically receive student administration authority;
- a marketing user does not automatically receive academic or finance authority.

Authority must be explicitly assigned.

---

# 24. Role Definition Standard

Before detailed implementation, each role must receive a role card with the following structure:

### Role identity

- organizational name;
- organizational purpose;
- reporting relationship;
- direct reports where established;
- whether the role is organizational, technical, or external.

### Responsibilities

The actual business responsibilities established by this blueprint or an approved amendment.

### Authority

The decisions and actions the role may legitimately make.

### Data scope

The records and organizational units the role may access.

### Capabilities

The exact operations permitted.

### Prohibited actions

The operations the role must not perform.

### Approval authority

The actions the role may approve or sign.

### Workflow participation

Whether the role may participate as:

- Maker;
- Checker / Signer;
- observer;
- other explicitly defined workflow participant.

### Dashboard / menu access

The application surfaces required to exercise already-authorized responsibilities.

Dashboard access is defined last.

---

# 25. High-Priority Workflow Cards

Before detailed permissions are frozen, define the following governance workflows in plain language.

Priority order:

1. **Money / Payment Workflow**
2. **Staff Access / Role-Change Workflow**
3. **Staff Attendance Correction Workflow**
4. **Staff Joining / Leaving Workflow**
5. **Class Creation / Scheduling Workflow**
6. **Student / Parent Access Workflow**

These workflow cards are governance artifacts, not UI specifications.

Each workflow card should contain:

- purpose;
- normal actor(s);
- normal path;
- sensitive path;
- approval requirement, if any;
- who may approve;
- who may not approve;
- scope rules;
- allowed state transitions;
- audit requirements;
- exception conditions;
- unresolved owner decisions.

---

# 26. Known Governance Questions — Owner Decision Register

The following questions are intentionally **not answered by technical agents**.

| ID | Decision required | Current state |
|---|---|---|
| G-001 | Who is the formal authority for approving amendments to this blueprint? | **OPEN** |
| G-002 | Who may appoint/revoke System Admin access and who oversees it? | **OPEN** |
| G-003 | What is the exact reporting line of the Instructor Leader? | **OPEN** |
| G-004 | What is the exact division of authority between Director and Vice Director? | **OPEN** |
| G-005 | Which real-world Kindergarten roles exist in addition to the Kindergarten Division Manager? | **OPEN** |
| G-006 | Which actions are formally classified as sensitive? | **OPEN — candidate list exists in §17** |
| G-007 | Who may approve each sensitive action? | **OPEN** |
| G-008 | What is the limited-staff / absence / emergency approval procedure? | **OPEN — later phase** |
| G-009 | What are the operational boundaries for financial correction, refund, discount, and price changes? | **OPEN** |
| G-010 | Which governance changes require preservation as superseded historical decisions? | **OPEN — process principle established** |

### Rule for open decisions

An OPEN decision is not a license to guess.

Until resolved:

1. preserve the currently established organizational responsibility;
2. avoid granting broader authority than necessary;
3. document the gap;
4. do not create a new organizational role without approval;
5. do not weaken a security boundary to unblock implementation.

---

# 27. Documentation Change and Supersession Rules

Governance changes must be explicit.

If a new rule conflicts with an older accepted decision:

1. preserve the historical decision;
2. mark the conflicting rule as superseded;
3. reference the new governing decision;
4. record the date and reason for the change;
5. update the current authoritative document set.

Historical material must not silently disappear simply because it is no longer current.

This preserves organizational history and prevents agents from treating contradictory old documents as current policy.

---

# 28. Implementation-Agent Rules

Any human or AI agent working on MyLiberty Portal must obey the following.

1. Do not invent organizational roles.
2. Do not treat System Admin as an organizational role.
3. Do not treat Front Office / Admin as System Admin.
4. Do not create a permission merely because a dashboard needs a button.
5. Do not grant broad authority merely because a role is senior.
6. Do not grant business authority merely because a user has technical Admin access.
7. Do not use hidden UI elements as the security mechanism.
8. Do not bypass backend/data authorization.
9. Do not allow self-approval where independent review is required.
10. Do not bypass protected workflow states.
11. Do not silently erase or rewrite important business history.
12. Do not invent monetary thresholds, approval chains, or legal requirements.
13. Do not invent Kindergarten roles.
14. Do not invent reporting lines.
15. Do not turn an audit finding directly into a production rule without the required governance decision.
16. Preserve branch and division boundaries in implementation.
17. Prefer least necessary authority.
18. Keep technical implementation details out of the organizational baseline.
19. When architecture changes, follow the repository's explicit architecture-change process.
20. When implementation and governed policy diverge, report the gap rather than redefining the policy silently.

---

# 29. Rebuild / Re-Foundation Doctrine

The term **rebuild** in this project means **re-foundation and controlled reconciliation**, not automatic deletion of the existing application.

The existing application should be treated as an asset containing:

- working business behavior;
- accumulated data contracts;
- tested workflows;
- existing security logic;
- legacy compatibility requirements;
- known defects and drift.

The implementation strategy is therefore:

```text
APPROVED GOVERNANCE
        ↓
RECONCILE CURRENT IMPLEMENTATION
        ↓
DEFINE GAPS
        ↓
IMPLEMENT ONE BOUNDARY AT A TIME
        ↓
VERIFY
        ↓
MIGRATE / REPLACE ONLY WHERE JUSTIFIED
```

A clean-looking rewrite is not a sufficient reason for a rewrite.

A controlled replacement of a subsystem is appropriate where evidence shows the current implementation cannot safely satisfy the approved model.

---

# 30. Rebuild Sequence

The recommended sequence is:

## Phase 1 — Governance baseline

- adopt this blueprint;
- resolve the minimum owner decisions required to unblock implementation;
- formally mark conflicting historical decisions as superseded where applicable.

## Phase 2 — High-risk workflows

Define and approve the priority workflow cards, beginning with money and staff authority changes.

## Phase 3 — Role authority

Create role cards using the approved organizational structure and workflow decisions.

## Phase 4 — Detailed permissions

Derive exact capabilities and data scope from the role cards and workflows.

## Phase 5 — Authorization enforcement

Bring backend/data authorization into alignment with the approved capabilities and scope.

## Phase 6 — Dashboards and menus

Expose only already-authorized capabilities through the appropriate dashboard experiences.

## Phase 7 — Cross-role audit

Test the complete model for authority gaps, excess authority, data leakage, self-approval, workflow bypass, and auditability failures.

## Phase 8 — Controlled implementation

Implement and migrate the affected areas incrementally, maintaining checkpoints and compatibility until the new behavior is proven.

---

# 31. Cross-Role Authority Audit

Before the new authority model is considered implementation-complete, perform a system-wide audit covering:

## Authority gaps

- required actions without an authorized actor;
- required approvals without an authorized approver;
- workflows without an authorized completion path.

## Excess authority

- unnecessary access;
- unrelated data access;
- broad permissions unsupported by responsibility;
- accidental business authority attached to System Admin.

## Separation-of-duties failures

- self-approval;
- one-person control of sensitive workflows;
- technical bypasses;
- conflicting workflow roles.

## Data-scope failures

- branch leakage;
- division leakage;
- unauthorized organization-wide access;
- unrelated sensitive-record access.

## Workflow failures

- unauthorized state transitions;
- skipped approval states;
- unauthorized rollback;
- silent modification after approval.

## Audit failures

- missing actor identity;
- missing timestamps;
- missing state history;
- missing approver identity;
- silent alteration of important records.

The cross-role audit is mandatory before declaring the new authority model implemented.

---

# 32. Technical Architecture Boundary

The technical architecture must remain subordinate to this governance model while retaining its own legitimate authority over implementation details.

The repository's architecture documentation should determine matters such as:

- feature/domain organization;
- data-access boundaries;
- authentication implementation;
- persistence design;
- routing and code splitting;
- test structure;
- deployment structure;
- technical migration strategy.

This blueprint should not duplicate those details.

When a technical architecture decision affects an organizational authority boundary, the technical decision must conform to this blueprint.

When the technical architecture guide and the repository disagree, the discrepancy must be investigated and documented rather than silently resolved.

---

# 33. Security Enforcement Principle

Security must be enforced by actual authorization boundaries, not by the user interface.

The implementation must ensure that:

- unauthorized requests fail even when manually constructed;
- role checks are not the sole security mechanism;
- data scope is enforced at the actual data-access boundary;
- workflow transitions are protected at the actual authorization boundary;
- technical administrators cannot silently bypass governed business controls.

The frontend may hide controls for usability, but hiding a control must never be treated as equivalent to authorization.

---

# 34. Safe Change Principle

For significant changes, implementation should follow a controlled sequence:

```text
Working checkpoint
    ↓
One meaningful boundary change
    ↓
Targeted verification
    ↓
Adjacent workflow verification
    ↓
Permission / data-scope verification
    ↓
Broader audit where risk requires it
```

Behavior should not be changed merely as a side effect of moving code.

Legacy compatibility paths should remain until repository evidence confirms they are no longer needed.

Destructive migrations require an explicit migration and rollback plan.

---

# 35. Verification and Completion Doctrine

A governed implementation is not complete merely because code exists.

For meaningful changes, completion requires evidence appropriate to the risk, including as applicable:

- relevant tests;
- authorization verification;
- data-scope verification;
- workflow-state verification;
- audit-log verification;
- build/type/lint verification;
- deployment verification where applicable;
- documentation synchronization when architecture changes.

The implementation agent must report honestly:

- what changed;
- what was verified;
- what was not verified;
- what remains blocked by an owner decision;
- what migration or cost risks remain.

---

# 36. Cost and Operational Sustainability

MyLiberty is intended to remain sustainable on constrained/free-tier infrastructure where practical.

Therefore, implementation decisions must consider:

- unnecessary read amplification;
- unbounded realtime listeners;
- repeated queries;
- large historical scans;
- excessive write fan-out;
- storage and log growth;
- unnecessary infrastructure or paid services.

No exact provider price or limit should be invented inside this blueprint.

Technical documentation should record the measured or verified implementation behavior separately.

---

# 37. Governance Non-Negotiables

The following are mandatory principles.

### Principle 1 — Organization before UI

Model the real organization before deciding dashboard behavior.

### Principle 2 — Authority before menus

Define authority before exposing application functions.

### Principle 3 — Backend enforcement

Actual authorization must enforce security.

### Principle 4 — System Admin separation

Technical Admin is not automatic business authority.

### Principle 5 — Least necessary authority

Grant the authority required for legitimate responsibility, not unlimited access.

### Principle 6 — Separation of duties

Sensitive actions require independent human review where governance classifies them as controlled.

### Principle 7 — Auditability

Important actions remain traceable.

### Principle 8 — No invented business rules

Unknown rules are governance gaps, not invitations to guess.

### Principle 9 — Organizational scope

Access must respect the organization's current branch and division structure and other legitimate relationship boundaries.

### Principle 10 — Single authoritative governance baseline

This blueprint is the source of truth for the organizational and authority rules it establishes.

### Principle 11 — Implementation is not authority

The existence of code, a route, a collection, a dashboard, or a technical admin switch does not itself establish business authority.

### Principle 12 — Exceptions remain accountable

Emergency or exceptional actions must be explicit, limited, and auditable.

---

# 38. Relationship to Existing MyLiberty Documentation

The repository already maintains distinct documentation responsibilities.

The blueprint should therefore be integrated as the governance layer rather than replacing the technical documentation system.

Conceptually:

```text
AUTHORITATIVE BLUEPRINT
    ↓
Durable organization + authority

ACCEPTED DECISIONS
    ↓
Approved binding policies and explicit exceptions

ARCHITECTURE
    ↓
Current technical structure

SPECS
    ↓
Detailed behavioral contracts

PLANS / PROPOSALS
    ↓
How a change may be implemented

AUDITS
    ↓
Evidence that the system does or does not conform

AGENT INSTRUCTIONS
    ↓
How coding agents operate safely within all of the above
```

No single layer should impersonate another.

---

# 39. Implementation Readiness Boundary

This blueprint is sufficient to begin the next governance/engineering stage.

It establishes:

- organizational structure;
- role identities that are actually established;
- the organizational/technical Admin separation;
- permission vocabulary;
- scope principles;
- workflow governance principles;
- simplified Maker–Checker / Signer model;
- separation-of-duties principle;
- auditability;
- privacy principle;
- documentation authority relationship;
- rebuild/re-foundation strategy;
- owner-decision register.

It does **not** claim to have finalized:

- every role capability;
- every field-level permission;
- every approval threshold;
- every workflow;
- every organizational reporting line;
- every Kindergarten role;
- emergency/delegation procedure;
- every dashboard menu;
- exact technical authorization rules.

Those must be derived through the next controlled phases.

---

# 40. Final Rebuild Rule

The implementation team must follow this dependency:

```text
REAL COMPANY
    ↓
AUTHORITATIVE GOVERNANCE BASELINE
    ↓
OWNER GOVERNANCE DECISIONS
    ↓
CORE WORKFLOWS
    ↓
ROLE AUTHORITY
    ↓
DETAILED PERMISSIONS
    ↓
DATA SCOPE
    ↓
SECURITY ENFORCEMENT
    ↓
DASHBOARDS / MENUS
    ↓
TESTING + CROSS-ROLE AUDIT
    ↓
CONTROLLED RELEASE
```

Never reverse the dependency by allowing the existing UI, a technical role, or an implementation convenience to define the organization's authority model.

---

# 41. Owner Approval Record

This section is intentionally left for explicit governance approval.

**Blueprint:** MyLiberty Portal — Authoritative Organizational, Authority & Rebuild Blueprint v3.0

**Approval status:** `PENDING OWNER APPROVAL`

**Approved by:** ______________________________

**Role / Authority:** ___________________________

**Approval date:** ______________________________

**Notes / approved exceptions:**

____________________________________________________________

____________________________________________________________

### Upon approval

After approval, this document becomes the authoritative governance baseline for the rules it establishes.

Subsequent technical work must derive from it rather than redefine it.

---

# Foundation Statement

> **MyLiberty Portal represents the real organization first. It separates organizational authority from technical system administration, limits access by explicit role, capability, scope, and workflow state, uses independent human review for sensitive actions where required, preserves auditable accountability, and refuses to let technical implementation invent organizational authority.**
