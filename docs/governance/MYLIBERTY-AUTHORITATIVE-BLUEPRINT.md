# MyLiberty Portal — Authoritative Organizational, Authority & Rebuild Blueprint

**Version:** 3.3  
**Status:** RATIFIED AUTHORITATIVE BASELINE — APPROVED BY OWNER (KIFRY)  
**Date:** 2026-10-07  
**Scope:** Organizational identity, authority, access governance, workflow governance, data-scope principles, implementation derivation, and rebuild/re-foundation rules

> **Canonical Repository Location:** `docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md`
>
> **Authority Level:** Authoritative Governance Baseline (Governs organizational identity, authority boundaries, roles, separation of duties, and access governance)
>
> **Technical Counterparts:** Architecture is governed by [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md); accepted policies by [`docs/decisions/`](../decisions/README.md); agent behavior by [`AGENTS.md`](../../AGENTS.md)

> **Purpose**
>
> This document establishes the durable organizational truth and authority model from which MyLiberty Portal must be designed, rebuilt, implemented, reviewed, and audited.
>
> It is intentionally independent of a specific frontend framework, database, folder layout, or deployment platform.
>
> The existing application is the starting implementation. The goal is to reconcile it to this blueprint through controlled, evidence-based change — not to rewrite the project merely because a cleaner structure appears possible.

## 0. Version 3.1 Organizational Simplification

Version 3.1 adopts an explicit simplification of the physical-branch authority model:

- **The Branch Manager role is removed from the organizational model.**
- **The Branch Head concept is removed with it.**
- A physical branch remains a real organizational unit and a critical data-scope boundary, but it is **not represented by a single branch-wide managerial authority role**.
- Each physical branch instead contains distinct leadership functions:
  - Course Division Manager;
  - Kindergarten Division Manager;
  - Operational Leader;
  - Instructor Leader.
- These roles are **functionally distinct peer leadership roles at branch scope**. None of them automatically inherits the authority of a former Branch Manager merely because another function is absent, unavailable, or operationally senior.
- Cross-functional authority must be established by explicit responsibility, capability, workflow authority, or approved delegation — not by an implicit "acting branch manager" assumption.
- Any existing decision, specification, permission, dashboard, or code path that grants authority specifically to a **Branch Manager / Branch Head** must be reconciled to this revised model before the v3.1 baseline is considered fully implemented.

This change is intended to simplify authority, reduce role overlap, preserve separation of responsibilities, and make the system's authorization model easier to derive and audit.

### Version 3.3 executive clarification

Version 3.3 proposes an explicit **Executive Dual-Control Model** for the Director and Vice Director:

- **Director — Strategic Control:** strategic direction, strategic performance assessment, major executive decisions, and final executive authority where explicitly assigned.
- **Vice Director — Operational Control:** execution, coordination, multi-branch operational oversight, exception follow-up, corrective-action coordination, and delegated executive authority.
- The two executive control domains are intentionally complementary rather than interchangeable.
- **Dual-control does not mean equal authority, automatic joint approval, or unrestricted executive CRUD.**
- Authority remains bounded by explicit capability, organizational scope, workflow state, and approved delegation.
- The Vice Director does not become unrestricted Acting Director merely because the Director is absent or unavailable.
- Sensitive actions that separately require Maker–Checker / Signer controls remain governed by their own workflow rules; the Executive Dual-Control Model must not be interpreted as a requirement that every sensitive action receive approval from both executive roles.

This distinction is the implementation-governance interpretation of **G-004**. It was formally ratified by the Owner on **2026-10-07** (see §26 and §41) and is therefore binding, not a proposal.

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
- multi-branch operational coordination;
- lead management;
- finance;
- site administration;
- operational coordination;
- facilities support.

A physical branch is an organizational unit and operational scope. It is **not** itself represented by a separate Branch Manager authority role in v3.1.

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

Each physical branch also contains branch-scope operational and teaching leadership functions as defined in §5.

The current four-branch / two-division structure is an organizational fact at the time of this blueprint.

It is not a permanent promise that the company can never reorganize.

Any addition, removal, merger, or restructuring of organizational units requires an explicit governance amendment.

A branch remains a meaningful organizational and data-scope boundary even though it no longer has a single branch-wide manager.

---

# 5. Organizational Hierarchy

The established hierarchy is:

```text
Director
└── Vice Director
    └── Four Physical Branches
        ├── Course Division Manager
        │   └── Course Division Marketing
        ├── Kindergarten Division Manager
        │   └── Kindergarten Division Marketing
        ├── Operational Leader
        │   ├── Front Office / Admin
        │   └── Office Boy / Facilities
        └── Instructor Leader
            └── Instructors / Tutors
```

## 5.1 Meaning of the physical branch node

The **Physical Branch** is an organizational unit, not a role.

The branch node establishes:

- physical location;
- branch-level operating scope;
- organizational grouping of the functions that work at that site;
- a durable data-scope boundary where branch-local access applies.

The branch node does **not** imply the existence of a Branch Manager, Branch Head, or equivalent catch-all authority.

## 5.2 Branch leadership model

The four branch-scope leadership roles are:

- Course Division Manager;
- Kindergarten Division Manager;
- Operational Leader;
- Instructor Leader.

These are separate functions with separate responsibilities.

No one of these roles automatically becomes the overall head of the physical branch.

A user must not receive branch-wide authority merely because:

- they are the most senior person physically present;
- another branch-scope leader is absent;
- they manage more people than another role;
- a dashboard is easier to implement that way;
- legacy code previously referred to a Branch Manager.

Where an action crosses multiple functions, the authority must come from the applicable workflow, explicit delegated authority, or a higher organizational authority established by governance.

## 5.3 Established relationships

- Course Division Marketing operates under the Course Division Manager.
- Kindergarten Division Marketing operates under the Kindergarten Division Manager.
- Front Office / Admin and Office Boy / Facilities operate under the Operational Leader.
- Instructors / Tutors operate under the Instructor Leader.
- All four branch-scope leadership functions belong to the relevant physical branch.
- The Vice Director provides multi-branch oversight within the authority actually delegated to the role.

The exact detailed reporting mechanics among the branch-scope leaders and upward executive authority must not be guessed beyond what this blueprint establishes.

The higher-level reporting line of the Instructor Leader is resolved by **G-003** (ratified 2026-10-07, see §26): operationally to the **Vice Director** (instructor scheduling, class coverage, shift adherence, substitute assignments) and strategically to the **Director** (pedagogical curriculum standards, placement testing criteria, academic excellence).

## 5.4 Executive Dual-Control Model

The Director and Vice Director form a **complementary executive control structure**.

The purpose of this model is to prevent strategic direction and operational execution from collapsing into one undifferentiated executive authority layer.

### 5.4.1 Strategic Control — Director

The Director is the primary executive role for:

- strategic direction;
- province-wide strategic performance assessment;
- major organizational direction;
- strategic risk review;
- executive decisions where the role is explicitly assigned authority;
- final executive decisions where governance identifies the Director as the required authority.

The Director determines **where the organization is going**, whether the organization is meeting strategic objectives, and which material matters require executive direction.

### 5.4.2 Operational Control — Vice Director

The Vice Director is the primary executive role for:

- execution of approved organizational priorities;
- multi-branch operational oversight;
- operational coordination;
- exception identification;
- corrective-action follow-up;
- cross-branch coordination;
- escalation of matters beyond delegated authority;
- delegated executive approval where explicitly assigned.

The Vice Director determines **what is happening, what needs action, who needs to act, and whether the matter remains within delegated authority**.

### 5.4.3 Complementary control, not equal authority

Executive Dual-Control must not be interpreted as:

- equal organizational authority;
- automatic joint ownership of every decision;
- automatic joint approval of every sensitive action;
- inheritance of all Director authority by the Vice Director;
- inheritance of all operational authority by the Director;
- unrestricted CRUD over business domains;
- replacement of operational domain ownership.

The roles are complementary:

```text
Director
→ Strategic Control
→ Direction / Major Decision

Vice Director
→ Operational Control
→ Coordination / Execution / Follow-up
```

Neither role becomes a universal operator merely because it is executive.

### 5.4.4 Delegation boundary

Delegated authority must be explicit.

The Vice Director does not become unrestricted Acting Director merely because:

- the Director is absent;
- the Director is unavailable;
- the Director is operationally uninvolved;
- the Vice Director is the senior person present.

Any temporary exercise of Director authority requires an explicit approved delegation under the applicable governance procedure.

### 5.4.5 Escalation relationship

The executive control model establishes a directional escalation path:

```text
Operational matter
       ↓
Vice Director coordinates
       ↓
Within delegated authority?
   ┌───────────────┴───────────────┐
   ↓                               ↓
  Yes                              No
   ↓                               ↓
Execute / follow up          Escalate to Director
                                   ↓
                              Executive decision
```

Escalation is a governance routing mechanism. It does not itself grant the Vice Director additional authority.

### 5.4.6 Relationship to Maker–Checker / Signer

Executive Dual-Control is distinct from the transactional Maker–Checker / Signer model in §15.

Where a sensitive workflow requires:

```text
Maker
  ↓
Checker / Signer
  ↓
Approved
  ↓
Execution
```

that workflow must follow its approved rules.

The existence of two executive control domains does **not** mean the Director and Vice Director must both approve the same transaction unless a specific approved workflow requires it.

### 5.4.7 Executive visibility vs executive authority

Both executive roles may require broad organizational visibility to perform their responsibilities.

Therefore:

```text
Broad visibility
≠
Broad CRUD authority

Multi-branch visibility
≠
Automatic branch-wide management authority

Executive role
≠
System Admin
```

The system must derive action authorization from:

```text
Role
+
Capability
+
Scope
+
Workflow state
+
Approved delegation
=
Authorized action
```

## 5.5 Explicit removal of the Branch Manager layer

The following concepts are intentionally **not part of the v3.1 organizational model**:

- Branch Manager;
- Branch Head;
- Branch Manager as Course Division Manager;
- Branch Manager as an implicit approver for unrelated branch functions;
- Branch Manager as the default owner of branch-wide permissions;
- Branch Manager as an automatic substitute for operational, kindergarten, or academic leadership.

Any existing technical or documentation references to those concepts must be treated as legacy material requiring reconciliation.

---

# 6. Organizational Roles

## 6.1 Director

**Organizational purpose:** Executive strategic direction and overall organizational leadership.

**Primary executive function:** Determine and maintain the organization's strategic direction, assess province-wide strategic performance, and make executive decisions specifically assigned to the role.

**Established responsibilities:**

- overall strategic leadership;
- province-wide analytics;
- multi-branch performance oversight;
- definition, ownership, or approval of strategic objectives where governance assigns that authority;
- assessment of organization-wide performance against strategic objectives;
- review of major strategic risks, material exceptions, and matters escalated for executive decision;
- executive direction of the organization within the authority established by governance.

The Director's primary executive focus is **strategy and direction**: determining where the organization is going, whether it is meeting its strategic objectives, and which high-impact decisions require executive direction.

The Director is an organizational role.

The Director is **not** automatically the technical System Admin.

The Director does not receive technical system-administration authority merely by holding executive office.

Holding the Director role does not automatically grant unrestricted authority over every operational workflow. Specific approval, signing, execution, and technical capabilities must still be explicitly assigned through the applicable role, capability, scope, and workflow rules.

## 6.2 Vice Director

**Organizational purpose:** Executive execution, coordination, and multi-branch operational oversight under the Director.

**Primary executive function:** Translate approved organizational priorities into coordinated execution, monitor multi-branch operational performance, follow up on exceptions, and exercise only the authority expressly delegated to the role.

**Established responsibilities:**

- participation in executive leadership;
- province-wide and multi-branch operational oversight within delegated authority;
- coordination of execution of organizational priorities and approved strategic objectives;
- monitoring of branch performance and identification of operational or organizational exceptions requiring intervention;
- follow-up and coordination of corrective actions across branch-scope leadership functions;
- oversight of branch-scope functions as explicitly delegated by governance;
- escalation of material or strategic matters to the Director when they exceed the Vice Director's delegated authority;
- executive coordination among Course Division Manager, Kindergarten Division Manager, Operational Leader, and Instructor Leader functions where governance explicitly assigns such coordination authority.

The Vice Director's primary executive focus is **execution and coordination**: understanding what is happening across the organization, identifying what requires action, coordinating the appropriate responsible functions, and ensuring that approved priorities are followed through.

The Vice Director is not a technical System Admin.

The Vice Director does not automatically inherit unrestricted Director authority by virtue of being next in the organizational hierarchy. Temporary exercise of Director authority requires **explicit delegation under the applicable approved governance procedure**. The Vice Director must not infer or self-assume Acting Director authority merely because the Director is absent, unavailable, or operationally uninvolved.

The Vice Director's authority remains bounded by the specific capability, organizational scope, and workflow authority expressly delegated to the role.

## 6.3 Executive role boundary: Director vs Vice Director

The executive distinction is intentionally functional rather than merely hierarchical:

| Dimension | Director | Vice Director |
|---|---|---|
| Primary purpose | Strategic direction | Strategic execution and coordination |
| Control domain | Strategic Control | Operational Control |
| Primary question | **Where are we going?** | **What is happening, what needs action, and who needs to act?** |
| Time horizon | Long-term / strategic | Short- to medium-term execution and follow-up |
| Strategic plan | Owns overall strategic direction and strategic performance assessment where authorized | Coordinates execution of approved priorities and monitors progress |
| Multi-branch performance | Evaluates organization-wide strategic performance | Monitors operational performance, exceptions, and corrective-action follow-up |
| Major issues | Provides executive direction on matters within assigned authority | Coordinates response and escalates matters beyond delegated authority |
| Branch leadership interaction | Strategic oversight | Active executive coordination and follow-up within delegated authority |
| Approval/sign-off | Higher-level or final executive authority only where explicitly assigned | Delegated executive authority only where explicitly assigned |
| Absence/delegation | May delegate specific authority through approved governance | Does not become unrestricted Acting Director without explicit delegation |

This distinction does **not** mean that the Vice Director has less visibility merely because the role has less ultimate authority. The Vice Director may require broad multi-branch visibility to perform coordination and oversight responsibilities while still lacking authority over actions outside the role's delegated capabilities.

The exact approval thresholds, signing authorities, and detailed workflow participation for both executive roles must be defined through the applicable workflow cards and owner-approved decisions.

## 6.4 Course Division Manager

The Course Division Manager leads the Course Division within an assigned physical branch.

**Established responsibilities:**

- Course Division management;
- branch-local Course Division targets;
- oversight of Course Division activities within assigned authority;
- leadership of Course Division Marketing.

The Course Division Manager is **not** a Branch Manager or Branch Head.

The role does not automatically inherit authority over:

- Kindergarten Division operations;
- branch facilities;
- Front Office / Admin;
- academic teaching leadership outside its assigned Course Division responsibility;
- executive decisions;
- technical system administration;
- restricted financial actions unless separately and explicitly authorized.

## 6.5 Kindergarten Division Manager

The Kindergarten Division Manager leads the Kindergarten Division within an assigned physical branch.

**Established responsibilities:**

- Kindergarten division operational targets;
- student programs;
- intake;
- leadership of the Kindergarten Division and its approved support functions.

The role does not report through a Branch Manager because no such role exists in v3.1.

Its detailed upward reporting authority remains limited to what is explicitly established or later approved.

The role does not automatically inherit authority over:

- the Course Division;
- general branch operations;
- facilities;
- academic teaching governance beyond its established kindergarten responsibilities;
- executive decisions;
- technical system administration;
- restricted financial actions unless separately and explicitly authorized.

## 6.6 Course Division Marketing

Course Division Marketing operates under the Course Division Manager.

**Established responsibility:**

- target-aligned lead generation for the Course Division.

Marketing authority is operational. It does not automatically create academic, financial, executive, or technical authority.

## 6.7 Kindergarten Division Marketing

Kindergarten Division Marketing operates under the Kindergarten Division Manager.

**Established responsibility:**

- specialized campaign activity for the Kindergarten Division.

Marketing authority does not automatically create academic, financial, executive, or technical authority.

## 6.8 Operational Leader

The Operational Leader coordinates branch-site operations.

**Established responsibilities:**

- site logistics;
- facility-maintenance coordination;
- front-office performance coordination;
- operational coordination of Front Office / Admin and Office Boy / Facilities.

The Operational Leader is an operational organizational role, not System Admin.

The Operational Leader is **not** a replacement Branch Manager. The role has the operational authority expressly assigned to it and does not automatically acquire authority over the Course Division, Kindergarten Division, or Teaching and Learning Structure.

## 6.9 Front Office / Admin

Front Office / Admin is a branch operational function.

**Established responsibilities:**

- walk-in inquiries;
- online inquiries;
- placement-test scheduling;
- student enrollment handling;
- tuition-fee collection;
- parent communications.

**Mandatory naming boundary:** Front Office / Admin is not the technical System Admin role.

## 6.10 Office Boy / Facilities

Office Boy / Facilities provides:

- physical branch maintenance support;
- operational support.

This function does not automatically receive:

- management authority;
- financial authority;
- academic authority;
- system-administration authority.

## 6.11 Instructor Leader

The Instructor Leader leads academic delivery within the assigned branch scope.

**Established responsibilities:**

- curriculum standardization;
- academic quality control;
- teacher schedule assignments;
- teacher evaluations.

The Instructor Leader belongs to the Teaching and Learning Structure.

The higher-level reporting line is resolved by **G-003** (ratified 2026-10-07, see §26): operationally to the **Vice Director**, strategically to the **Director**. All branch Instructors report directly to the Instructor Leader.

The Instructor Leader is **not** a Branch Manager and does not automatically inherit general operational or financial authority.

## 6.12 Instructors / Tutors

Instructors / Tutors provide direct educational delivery.

**Established responsibilities:**

- placement tests;
- interactive lessons;
- attendance logging;
- periodic student progress reports.

Their authority is academic and operational within assigned scope.

## 6.13 Students

Students are external actors in the internal organizational hierarchy, while remaining first-class participants in the service provided by the company.

Student-facing access must be limited to information and interactions legitimately belonging to the student.

## 6.14 Parents

Parents are external actors.

Established participation includes:

- monitoring student progress;
- attendance tracking;
- financial transactions.

Parent access is controlled access to authorized child-related information, not internal organizational authority.

## 6.15 Unresolved Kindergarten staffing

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
- Course Division Manager;
- Kindergarten Division Manager;
- Operational Leader;
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

## 11.3 Branch scope does not imply branch-wide authority

A user's assignment to a physical branch establishes relevant scope, but it does **not** by itself grant access to every function at that branch.

For example:

- Course Division scope does not automatically grant facility-management authority;
- Kindergarten scope does not automatically grant Course Division authority;
- Operational scope does not automatically grant academic authority;
- Instructor scope does not automatically grant finance or operational administration authority.

The application must model both **where** the user operates and **what** the user is authorized to do.

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

## 13.1 Executive dashboard derivation

The Director and Vice Director should have distinguishable executive dashboard experiences because their organizational responsibilities are intentionally different.

The governance model therefore establishes the following **dashboard intent**, without defining a framework-specific layout:

- **Director dashboard:** emphasize strategic objectives, province-wide strategic performance, major organizational trends, material risks, and executive decisions requiring strategic direction.
- **Vice Director dashboard:** emphasize execution of approved priorities, multi-branch operational performance, exceptions, corrective-action follow-up, coordination, and matters requiring escalation to the Director.

Shared analytics or domain components may be reused technically, but the dashboard composition must reflect the different executive purposes of the two roles.

Dashboard differences must remain downstream of authorization. A dashboard must not grant a capability merely because the role's executive interface exposes the information or action.

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

> **v3.1 reconciliation note — resolved 2026-10-07:** The original G-009 decision text named **Branch Managers** as retaining cash-drawer reconciliation authority. Because the Branch Manager role is removed, that historical text was explicitly superseded by the ratified **G-009** decision (2026-10-07, see §26), which identifies the successor authority: cash discrepancy approval follows materiality tiers — `< Rp 20.000` to the Operational Leader (`opslead`), `Rp 20.000 – Rp 49.999` to the Vice Director (`vice_director`), and `≥ Rp 50.000` to the Director (`director`), with the drawer handler excluded (Maker ≠ Checker). No such authority transfers to the Course Division Manager, Kindergarten Division Manager, or Instructor Leader.

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

In v3.1, **"branch management authority" does not refer to a Branch Manager role**. It means authority over unrelated branch functions merely by virtue of being associated with a branch.

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
- a branch-scope leader does not automatically receive unrestricted authority over other branch functions;
- a division manager does not automatically receive unrelated finance, facilities, or academic authority;
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

The branch-scope leadership roles must receive separate role cards. The implementation must not create a shared "branch manager" role card as a convenience abstraction.

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

Because no Branch Manager role exists in v3.1, any workflow that previously used "Branch Manager" as a normal actor or approver must be explicitly reassigned by governance rather than automatically mapped to another branch-scope leader.

---

# 26. Owner Decision Register — Formally Ratified Resolutions (2026-10-07)

The following governance decisions have been formally reviewed, ratified, and adopted by the **Owner / Director (Kifry)** on **2026-10-07** (recorded canonically in [`docs/decisions/2026-10-07-resolution-of-governance-questions-g001-g011.md`](../decisions/2026-10-07-resolution-of-governance-questions-g001-g011.md)).

| ID | Decision required | Ratified State & Approved Resolution |
|---|---|---|
| **G-001** | Who is the formal authority for approving amendments to this blueprint? | **RESOLVED — The Owner / Director (Kifry)** holds sole constitutional authority to approve and amend this Authoritative Blueprint. Technical agents and operational roles cannot unilaterally alter governance truth. |
| **G-002** | Who may appoint/revoke System Admin access and who oversees it? | **RESOLVED — Appointment & revocation exclusively by the Director.** Dual-executive oversight (Director & Vice Director) via immutable audit logs. System Admin is strictly technical maintenance with **zero business or operational approval authority** (Blueprint §7). |
| **G-003** | What is the exact reporting line of the Instructor Leader? | **RESOLVED — Upward to Executive Leadership.** Operationally reports to the **Vice Director** (scheduling, coverage, substitute teaching); strategically reports to the **Director** (curriculum standards, academic pedagogy). Instructors report directly to the Instructor Leader. |
| **G-004** | What is the exact division of authority between Director and Vice Director, including the proposed Executive Dual-Control interpretation? | **RESOLVED — Executive Dual-Control Formally Adopted:**<br>• **Director — Strategic Control:** Strategic direction, school expansion, academic standards, tuition pricing policies, staff role elevation/deactivation, and final executive authority.<br>• **Vice Director — Operational Control:** Day-to-day execution, multi-branch operational coordination, operational exception follow-up, cross-branch issue resolution, and delegated executive approvals.<br>• Complementary domains; not universal joint-sign and not interchangeable automatic substitution. |
| **G-005** | Which real-world Kindergarten roles exist in addition to the Kindergarten Division Manager? | **RESOLVED — Real-World Kindergarten Roles Established:**<br>• Kindergarten Division Manager (`manager` + `division: "kindergarten"`)<br>• Kindergarten Instructors (`instructor` + `division: "kindergarten"`)<br>• Kindergarten Learners (`student` + `division: "kindergarten"`) and linked Parents (`parent`)<br>• Front Office and Office Boy support the division either via explicit cross-divisional appointment (`division: "all"`) or campus facility scope (`division: null`). |
| **G-006** | Which actions are formally classified as sensitive? | **RESOLVED — 13 Gated Actions Ratified:**<br>• **Strategic (Level 3):** `STAFF_ROLE_ELEVATION`, `STAFF_DEACTIVATION`<br>• **Executive Operational (Level 2):** `NEW_STAFF_ACCOUNT`, `DISCOUNT_OR_REFUND`<br>• **Domain Operations (Level 1):** `TUITION_PLAN_CHANGE`, `STUDENT_WITHDRAWAL_OR_FREEZE`, `PLACEMENT_LEVEL_OVERRIDE`, `SUBSTITUTE_INSTRUCTOR`, `CLASS_CANCELLATION_OR_RESCHEDULE`, `RETROACTIVE_STUDENT_ATTENDANCE`, `STUDENT_CLASS_TRANSFER`<br>• **Dynamic Tiers:** `STAFF_SHIFT_SELF_CORRECTION`, `CASH_DISCREPANCY`, `STAFF_STATUS_CHANGE`. |
| **G-007** | Who may approve each sensitive action? | **RESOLVED — Authorized Approvers Assigned:**<br>• Director (`director`): `STAFF_ROLE_ELEVATION`, `STAFF_DEACTIVATION`<br>• Director / Vice Director (`director`, `vice_director`): `NEW_STAFF_ACCOUNT`, `DISCOUNT_OR_REFUND`<br>• Division Manager (`manager`): `TUITION_PLAN_CHANGE`, `STUDENT_WITHDRAWAL_OR_FREEZE`<br>• Instructor Leader (`instructorleader`): `PLACEMENT_LEVEL_OVERRIDE`, `SUBSTITUTE_INSTRUCTOR`<br>• Operations Lead / Front Office (`opslead`, `frontoffice`): `CLASS_CANCELLATION_OR_RESCHEDULE`, `RETROACTIVE_STUDENT_ATTENDANCE`, `STUDENT_CLASS_TRANSFER`<br>• Dynamic workflows resolved by hierarchy; executives review each other (Director $\leftrightarrow$ Vice Director). |
| **G-008** | What is the limited-staff / absence / emergency approval procedure? | **RESOLVED — Resilience & Absence Workflow Ratified:**<br>• **Acting Director Delegation:** Vice Director acts as Acting Director **only** while Director has active, approved leave status. Strictly excludes role elevations, executive authority modification, and self-actions. Delegate cannot act as second signer if already signed.<br>• **Absence Escalation:** Unavailable leader's requests escalate upward to executive layer; peer leaders never cover peer leaders.<br>• **Both Executives Away (Status Records Only):** Status records fall back in order: Course Div Manager $\rightarrow$ Kindergarten Div Manager $\rightarrow$ Ops Lead $\rightarrow$ Instructor Leader. High-level business gates wait; deadlock covered by console break-glass runbook.<br>• **Separation of Duties:** Never share accounts or create fake users. |
| **G-009** | What are the operational boundaries for financial correction, refund, discount, and price changes, including cash-drawer reconciliation ownership after removal of Branch Manager? | **RESOLVED — Tiered Cash Discrepancy & Financial Authority Ratified:**<br>• **< Rp 20.000:** Approved by Operational Leader (`opslead`). Escalates to Vice Director if Ops Lead handled the drawer.<br>• **Rp 20.000 – Rp 49.999:** Approved by Vice Director (`vice_director`).<br>• **$\ge$ Rp 50.000:** Approved by Director (`director`) (or Vice Director as Acting Director if Director on approved leave).<br>• Drawer handler cannot approve discrepancy (Maker $\ne$ Checker).<br>• Routine tuition collections executed directly without approval envelopes.<br>• Discounts and refunds strictly restricted to Executive layer (`director`, `vice_director`). |
| **G-010** | Which governance changes require preservation as superseded historical decisions? | **RESOLVED — Supersession Protocol Ratified:** Historical records under `docs/decisions/` are preserved rather than deleted. Superseded decisions are tagged with `Status: SUPERSEDED BY ADR-XXX` / `Blueprint v3.3` with date, rationale, and link to the governing document. |
| **G-011** | What detailed upward reporting/accountability arrangement applies to the branch-scope Course Division Manager, Kindergarten Division Manager, Operational Leader, and Instructor Leader? | **RESOLVED — Peer Accountability & Executive Dual-Reporting Ratified:** The four branch leadership roles are functional peers. Daily operational execution, exception coordination, and multi-branch tracking report upward to the **Vice Director** (Operational Control). Academic curriculum standards, strategic planning, and major policy escalations report upward to the **Director** (Strategic Control). |

### Rule for resolved decisions

All governance items G-001 through G-011 are formally resolved and binding across all software layers. Implementation agents must strictly enforce these contracts without introducing unapproved deviations.

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

## 27.1 v3.1 migration requirement for removed Branch Manager references

Because v3.1 removes a previously used organizational role, reconciliation should identify at least:

- governance decisions naming Branch Manager;
- role cards and permission matrices naming Branch Manager;
- workflow specifications naming Branch Manager as maker/checker/approver;
- dashboards and routes tied to a Branch Manager role;
- authorization rules checking a Branch Manager role;
- seeded accounts or claims using a Branch Manager role;
- audit reports and historical records containing Branch Manager references.

Historical audit records should preserve the fact that a Branch Manager role existed at the time of those events. Historical evidence must not be rewritten merely to make old events appear to have been performed under the new organizational model.

Current-state authorization must, however, stop granting Branch Manager authority once v3.1 is formally approved and the controlled migration is complete.

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
15. Do not treat Executive Dual-Control as automatic joint approval of all sensitive actions.
16. Do not turn an audit finding directly into a production rule without the required governance decision.
17. Preserve branch and division boundaries in implementation.
18. Prefer least necessary authority.
19. Keep technical implementation details out of the organizational baseline.
20. When architecture changes, follow the repository's explicit architecture-change process.
21. When implementation and governed policy diverge, report the gap rather than redefining the policy silently.
22. Do not recreate the removed Branch Manager role under another name such as "Branch Head," "Site Manager," "Branch Lead," or an equivalent catch-all role unless governance explicitly approves such a role.
23. Do not silently transfer former Branch Manager permissions to the Course Division Manager, Kindergarten Division Manager, Operational Leader, or Instructor Leader.
24. When a legacy Branch Manager permission or workflow is encountered, classify it as a reconciliation item and identify the exact intended authority before changing it.
25. Do not treat Director or Vice Director status as a generic Admin capability.
26. Do not infer Executive Dual-Control authority merely from organizational seniority; use explicit role, capability, scope, workflow, and delegation rules.
27. Do not allow dashboard composition to become the source of organizational authority.

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
- formally mark conflicting historical decisions as superseded where applicable;
- approve the removal of Branch Manager and the corresponding redistribution of authority;
- approve or refine the Executive Dual-Control interpretation in G-004.

## Phase 2 — High-risk workflows

Define and approve the priority workflow cards, beginning with money and staff authority changes.

## Phase 3 — Role authority

Create role cards using the approved organizational structure and workflow decisions.

For v3.1 this means distinct cards for the four branch-scope leadership functions rather than a single branch-manager abstraction.

For v3.3, Director and Vice Director role cards must reflect the complementary Executive Dual-Control domains.

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
- workflows without an authorized completion path;
- former Branch Manager responsibilities that have no approved successor.

## Excess authority

- unnecessary access;
- unrelated data access;
- broad permissions unsupported by responsibility;
- accidental business authority attached to System Admin;
- accidental branch-wide authority attached to a single branch-scope leader;
- accidental equivalence of Director and Vice Director authority where not approved.

## Separation-of-duties failures

- self-approval;
- one-person control of sensitive workflows;
- technical bypasses;
- conflicting workflow roles;
- false dual-control created by assigning multiple roles to the same human.

## Data-scope failures

- branch leakage;
- division leakage;
- unauthorized organization-wide access;
- unrelated sensitive-record access.

## Workflow failures

- unauthorized state transitions;
- skipped approval states;
- unauthorized rollback;
- silent modification after approval;
- legacy Branch Manager approval paths still functioning after v3.1 migration.

## Audit failures

- missing actor identity;
- missing timestamps;
- missing state history;
- missing approver identity;
- silent alteration of important records;
- historical records incorrectly rewritten to remove evidence of former roles.

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
- technical migration strategy;
- technical representation of branch and division scope.

This blueprint should not duplicate those details.

When a technical architecture decision affects an organizational authority boundary, the technical decision must conform to this blueprint.

When the technical architecture guide and the repository disagree, the discrepancy must be investigated and documented rather than silently resolved.

Technical architecture must not recreate Branch Manager as an implementation shortcut merely because existing code was built around that abstraction.

---

# 33. Security Enforcement Principle

Security must be enforced by actual authorization boundaries, not by the user interface.

The implementation must ensure that:

- unauthorized requests fail even when manually constructed;
- role checks are not the sole security mechanism;
- data scope is enforced at the actual data-access boundary;
- workflow transitions are protected at the actual authorization boundary;
- technical administrators cannot silently bypass governed business controls;
- former Branch Manager capabilities cannot be invoked through stale claims, hidden routes, or compatibility code once the v3.1 migration is complete.

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

The removal of Branch Manager should be treated as a **governance and authorization migration**, not merely as a string rename.

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

For the v3.1 hierarchy change, verification should additionally establish that:

- no active authorization path requires a Branch Manager role unless explicitly preserved as a historical-only concept;
- each former Branch Manager capability has an explicit approved destination, an explicit removal, or an open governance decision;
- no branch-scope role has silently inherited unrelated branch-wide authority;
- dashboards, routes, role claims, seeded accounts, and policy checks are aligned with the new role model;
- historical audit records remain intact.

For the v3.3 executive model, verification should additionally establish that:

- Director and Vice Director dashboard composition reflects different control domains;
- neither executive role inherits generic Admin semantics;
- executive authority remains capability- and workflow-based;
- broad executive visibility does not become a blanket business-write permission;
- unresolved approval authority remains unresolved until explicitly approved;
- Executive Dual-Control is not misimplemented as mandatory joint approval for all sensitive actions.

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

### Principle 13 — No implicit branch head

A physical branch is a scope and organizational unit, not a reason to invent or infer a single branch-wide manager.

### Principle 14 — No silent transfer of removed authority

Removing Branch Manager does not automatically transfer its historical permissions to another role.

### Principle 15 — Executive Dual-Control

Director and Vice Director are complementary executive control domains. Their distinction must remain explicit, and neither role may be treated as a universal operational or technical administrator.

### Principle 16 — Executive visibility does not imply execution authority

An executive may require broad data visibility for legitimate oversight while remaining unable to perform operational actions outside explicitly assigned capability and workflow authority.

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

The v3.1 organization model and v3.3 executive control model must be reflected consistently across those layers. A lower-level document may describe a technical migration away from Branch Manager, but it may not re-establish Branch Manager as current organizational authority.

---

# 39. Implementation Readiness Boundary

This blueprint is sufficient to begin the next governance/engineering stage.

It establishes:

- organizational structure;
- the four-branch / two-division model;
- the removal of Branch Manager / Branch Head from the current organizational model;
- distinct branch-scope leadership functions;
- the ratified Executive Dual-Control Model separating Director Strategic Control from Vice Director Operational Control;
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
- owner-decision register, including the ratified resolution for the Director/Vice Director authority split.

It does **not** claim to have finalized:

- every role capability;
- every field-level permission;
- every approval threshold;
- every workflow;
- every organizational reporting line;
- every Kindergarten role;
- the exact successor authority for all former Branch Manager responsibilities;
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

Never reverse the dependency by allowing the existing UI, a technical role, an old Branch Manager abstraction, or an implementation convenience to define the organization's authority model.

---

# 41. Owner Approval Record

This section records the owner's formal approval of this blueprint.

**Blueprint:** MyLiberty Portal — Authoritative Organizational, Authority & Rebuild Blueprint v3.3

**Approval status:** `APPROVED — RATIFIED AUTHORITATIVE BASELINE`

**Approved by:** Owner / Director (Kifry)

**Role / Authority:** Owner / Director

**Approval date:** 2026-10-07

**Notes / approved exceptions:**

- Decisions **G-001 through G-011** are ratified and binding across all software layers (see §26).
- This approval includes the Director / Vice Director authority split and the Executive Dual-Control Model, ratified as **G-004** (see §26 and §5.4).
- Items recorded elsewhere in this document as unresolved, and which were **not** part of the G-001 – G-011 register, remain open governance gaps. Approval of this document does not approve them; see §26 and the "does not claim to have finalized" list in §39.
- Amendments and supersessions follow the normal owner-decision process recorded under `docs/decisions/`.

**Recorded basis:** Owner ratification is recorded canonically in
[`docs/decisions/2026-10-07-resolution-of-governance-questions-g001-g011.md`](../decisions/2026-10-07-resolution-of-governance-questions-g001-g011.md)
("Authority: Ratified & Approved by Owner / Director (Kifry)", "Status: Active & Binding"), which §26 of this
blueprint cites as the canonical source for the ratified G-001 – G-011 decisions.

### Effect of approval

This document is the authoritative governance baseline for the rules it establishes, including the Director / Vice Director executive distinction and the Executive Dual-Control Model.

Subsequent technical work must derive from it rather than redefine it.

This approval is also explicit authorization to reconcile the legacy Branch Manager model out of current organizational authority, subject to the controlled migration and any separately approved exceptions.

---

# Foundation Statement

> **MyLiberty Portal represents the real organization first. It separates organizational authority from technical system administration, treats physical branches as organizational and data-scope boundaries rather than as implicit single-manager authorities, uses a complementary Executive Dual-Control Model that separates strategic direction from operational coordination, limits access by explicit role, capability, scope, and workflow state, uses independent human review for sensitive actions where required, preserves auditable accountability, and refuses to let technical implementation invent organizational authority.**
