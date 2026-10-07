# MY LIBERTY — Role × Branch × Division Authorization Contract

> **Document Type:** Canonical Specification & Technical Authorization Contract  
> **Status:** Formalized Technical Contract  
> **Governing Baseline:** [`docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md`](../governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md) (Organizational authority and roles are defined by the Authoritative Blueprint; this spec defines technical enforcement rules across backend layers).  
> **Applies to:** Backend Security Rules, Data Access Repositories, Schemas, State Normalization, and UI Routing.

---

## 1. Executive Definition & Core Principles

The authorization model is defined by the strict Cartesian product of three orthogonal dimensions:

$$\text{User Access Scope} = \text{ROLE (Capability)} \times \text{BRANCH (Organization)} \times \text{DIVISION (Functional)}$$

| Dimension | Real-World Question | Enforcement Authority |
|---|---|---|
| **ROLE** | *What is the user authorized to do?* | Firestore Security Rules (`isAdmin()`, `isManager()`, `isFrontOffice()`, `isStaff()`, etc.) |
| **BRANCH** | *Where is the user authorized to operate?* | Firestore Security Rules (`isSameBranch(doc)`, `isSameBranchStrict(doc)`) |
| **DIVISION** | *Which academic or operational stream does the user participate in?* | Firestore Security Rules (`isDivisionAllowedForBranchStaff(doc)`), Schemas, UI Scope |

**Key Axiom:** Division is a functional scope, **not** an entitlement automatically bundled with a role. No staff role is permanently or inherently forced into a single division scope unless constrained by an explicit business rule.

> [!IMPORTANT]
> **Blueprint v3.1–v3.3 Organizational Model:**  
> The concept of **Branch Manager / Branch Head is removed from the organizational model** ([`Blueprint §5.5`](../governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md#55-explicit-removal-of-the-branch-manager-layer)).  
> A physical branch is an organizational and data-scope boundary, **not** a managerial authority role. There is no implicit branch-wide manager. Authority requires the full conjunction:  
> $$\text{Role} + \text{Branch Scope} + \text{Division Scope} + \text{Capability} + \text{Workflow State} = \text{Authorized Action}$$
>
> **Executive Dual-Control Model (Blueprint v3.3 §0, §5.4, Principles 15 & 16):**  
> Executive leadership is partitioned into complementary domains: Strategic Control (`director`) and Operational Control (`vice_director`). Executive roles hold province-wide cross-branch oversight and cross-divisional visibility (`division: "all"`), but **executive oversight visibility does not imply execution authority** (Principle 16). Day-to-day operational mutations remain strictly owned by designated domain roles.

---

## 2. Canonical Division Scopes

| Division Identifier | Scope Definition | Backend Semantics | Presentation Semantics |
|---|---|---|---|
| `"courses"` | Course Academy (English, Kids Course, TOEFL, Professional School) | Permits read/write of records where `division == "courses"` or legacy docs without division. | Renders native Course Academy dashboard & operational tools. |
| `"kindergarten"` | Kids School (Early Childhood, PAUD, Nursery, TK-A, TK-B) | Strictly permits read/write of records where `division == "kindergarten"`. | Renders native Kids School dashboard & operational tools. |
| `"all"` | Cross-Divisional Authorization Scope | Explicitly permits read/write of records in **both** `courses` and `kindergarten`. | Authorizes the Segmented Container: `[ Overview \| Courses \| Kindergarten ]`. |
| `null` | Division-Independent (Campus Facility Scope) | Not evaluated against academic division checks. Unconstrained by curriculum boundaries. | Renders facility-wide task checklist; unaffected by academic division filters. |

---

## 3. Explicit Constraints: Which Roles May Have `division = null`?

> [!IMPORTANT]
> To prevent data contamination and privilege ambiguity, `division = null` is **strictly restricted by role**:

| Role | May Have `division = null`? | Allowed Division Scopes | Mandatory Constraint & Rationale |
|---|:---:|---|---|
| **`director`** | **NO** | `"all"` | **Strategic Control (Province-Wide).** Province-wide strategic oversight, strategic planning, executive approvals (Blueprint v3.3 §5.4.1). Visibility does not confer operational write authority (Principle 16). |
| **`vice_director`** | **NO** | `"all"` | **Operational Control (Province-Wide).** Multi-branch operational oversight, exception coordination, delegated executive approvals (Blueprint v3.3 §5.4.2). Not an unrestricted acting director; visibility does not confer operational write authority (Principle 16). |
| **`officeboy`** | **YES (Required)** | `null` | **Division-Independent.** Facility maintenance, cleaning, supply logistics, and classroom setup are campus-wide and must never be blocked by academic division boundaries. |
| **`admin`** | Permitted (Canonically `"all"`) | `"all"`, `null` | **Technical System Maintenance Only.** System administrator holds technical platform access for maintenance, user provisioning, terminals, and diagnostics (Blueprint §7). Does not inherit business or approval authority. |
| **`manager`** | **NO** | `"courses"`, `"kindergarten"`, `"all"` | **Division Management Oversight.** In Blueprint v3.1, `manager` does not represent a catch-all Branch Manager or Branch Head. A user with `role: "manager"` is an organizational Division Manager bound to their specific branch and division (`manager + branchId + division`):<br>• `manager + division="courses"` $\rightarrow$ Course Division Manager.<br>• `manager + division="kindergarten"` $\rightarrow$ Kindergarten Division Manager.<br>• Cross-divisional (`"all"`) is an explicit administrative exception and does not create an implicit single-branch head. |
| **`frontoffice`** | **NO** | `"courses"`, `"kindergarten"`, `"all"` | **Reception & Cashier.** Front desk staff register students and collect fees; they must be bound to a specific division or explicit cross-divisional scope. |
| **`opslead`** | **NO** | `"courses"`, `"kindergarten"`, `"all"` | **Front Desk Operations Lead.** Same operational requirements as Front Office. |
| **`instructorleader`**| **NO** | `"courses"`, `"kindergarten"`, `"all"` | **Pedagogical Supervision.** Supervises teachers; must be bound to Course Academy, Kids School, or both. |
| **`instructor`** | **NO** | `"courses"`, `"kindergarten"`, `"all"` | **Teacher.** Delivers curriculum; bound to Course Academy, Kids School, or cross-appointed (`"all"`). |
| **`marketing`** | **NO** | `"courses"`, `"kindergarten"`, `"all"` | **Field Outreach.** Structurally supports all academic divisions. Operational roadshow UX defaults to Course Academy pending early childhood outreach campaigns. |
| **`student`** | **NO** | `"courses"`, `"kindergarten"` | **Learner.** Students are enrolled in a specific educational program. Never `"all"`, never `null`. |
| **`parent`** | Contextual | Derived from children | Parents access records via `childStudentIds`. Division is derived from linked student documents. |

---

## 4. Layered Enforcement Contract

The Role × Branch × Division contract is enforced across five distinct system layers:

### Layer 1: Schema Validation (`src/schemas/inviteSchema.js`)
- `role === "officeboy"` $\rightarrow$ `division` is normalized to `null`.
- Academic staff (`manager`, `frontoffice`, `opslead`, `instructor`, `instructorleader`, `marketing`) $\rightarrow$ `division` must be one of `["courses", "kindergarten", "all"]`. Rejects `null`.

### Layer 2: State Normalization (`src/constants/divisions.js`)
- `isDivisionIndependentRole(role)` returns `true` for `"officeboy"`.
- `normalizeStaffDivision(raw, role)` preserves `null` for division-independent roles; defaults missing values to `"courses"` for academic roles.

### Layer 3: Backend Security Rules (`firestore.rules`)
- `isDivisionAllowedForBranchStaff(data)` evaluates:
  1. `!(isManager() || isFrontOffice())` $\rightarrow$ Staff without division-gated collections (such as `officeboy`) are not restricted by division.
  2. `userDivision() == 'all'` $\rightarrow$ Authorizes both divisions within the branch.
  3. `userDivision() == 'kindergarten'` $\rightarrow$ Strictly requires `data.division == 'kindergarten'`.
  4. Non-kindergarten (`"courses"`) $\rightarrow$ Requires `data.division != 'kindergarten'`.

### Layer 4: Directive & Task Execution (`useStaffDirectives.js`)
- Staff with `division = null` (e.g. `officeboy`) receive all branch facility tasks.
- Staff with `division = "all"` receive directives for `courses`, `kindergarten`, and `all`.
- Staff with `courses` or `kindergarten` receive only their division's directives plus academy-wide directives.

### Layer 5: Presentation & Routing (`App.jsx` & Segmented Container)
- `division === "courses"` $\rightarrow$ Native Courses Dashboard.
- `division === "kindergarten"` $\rightarrow$ Native Kids School Dashboard.
- `division === "all"` $\rightarrow$ Cross-Divisional Segmented Container `[ Overview | Courses | Kindergarten ]`.
- `role === "officeboy"` $\rightarrow$ Native Office Boy Facilities Dashboard (division-independent).

---

## 5. Change Control & Governance

Any deviation from this contract—such as opening Kindergarten outreach to Marketing, or introducing a new division-independent staff role—requires an update to this document, accompanying schema updates, and automated security matrix verification.

---

## 6. Executive Dual-Control & Risk-Based Approval Architecture (Blueprint v3.3)

### 6.1 Core Ground Formula
$$\text{Role} + \text{Capability} + \text{Scope} + \text{Workflow State} + \text{Approved Delegation} = \text{Authorized Action}$$
$$\text{Risk Profile} \longrightarrow \text{Control Level} \longrightarrow \text{Required Workflow} \longrightarrow \text{Authorized Checker / Signer}$$

### 6.2 Peer Branch Functional Authorities
The four branch leadership functions are peer authorities within their respective domains (never "mini-admins" or subordinate to each other):
- **Course Division Manager (`manager` + `courses`):** Course-domain control.
- **Kindergarten Division Manager (`manager` + `kindergarten`):** Kindergarten-domain control.
- **Operational Leader (`opslead`):** Operations, desk workflows, and shift scheduling.
- **Instructor Leader (`instructorleader`):** Pedagogy, placement overrides, substitute teaching.

### 6.3 Executive Dual-Control Separation
- **Director — Strategic Control:** Strategic direction, irreversible decisions, staff authority/termination, and high-impact pricing policies.
- **Vice Director — Operational Control:** Operational execution, cross-branch coordination, and material operational exceptions.
- **Dual-Control Invariant:** Director and Vice Director have complementary domains; dual-control does **not** mean automatic joint approval or executive substitution for branch domain gates.

### 6.4 Human Separation of Duties
- `makerUid !== checkerUid` is strictly enforced across all dual-control and approval workflows.
- No user may self-approve their own request or self-promote their own role.

### 6.5 Materiality Tiers & Special Workflows (Owner Decision 2026-10-07 §4.5)
- **Cash Discrepancies:**
  - `< Rp 20.000`: Operational Leader (escalates to Vice Director if Ops Lead balanced drawer).
  - `Rp 20.000 – Rp 49.999`: Vice Director.
  - `≥ Rp 50.000`: Director (or Vice Director as Acting Director if Director on approved leave).
- **Executive Shift Corrections:** Director and Vice Director review each other's.
- **Staff Status / Leave Changes:** Maker is always Front Office (never the subject); checker is the subject's domain superior; peer leaders escalate to executives; executives review each other; 4-peer fallback chain when both executives are on leave.
- **Acting Director Delegation:** Explicit, active only during Director's approved leave, excludes role elevations/executive modifications, excludes delegate's own requests, and cannot count as a second signature if delegate already signed.

