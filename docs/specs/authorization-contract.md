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
> **Blueprint v3.1 Organizational Model:**  
> The concept of **Branch Manager / Branch Head is removed from the organizational model** ([`Blueprint §5.4`](../governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md#54-explicit-removal-of-the-branch-manager-layer)).  
> A physical branch is an organizational and data-scope boundary, **not** a managerial authority role. There is no implicit branch-wide manager. Authority requires the full conjunction:  
> $$\text{Role} + \text{Branch Scope} + \text{Division Scope} + \text{Capability} + \text{Workflow State} = \text{Authorized Action}$$

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
| **`officeboy`** | **YES (Required)** | `null` | **Division-Independent.** Facility maintenance, cleaning, supply logistics, and classroom setup are campus-wide and must never be blocked by academic division boundaries. |
| **`admin`** | Permitted (Canonically `"all"`) | `"all"`, `null` | **Global Authority.** System administrator holds cross-branch and cross-divisional authorization by role hierarchy. |
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
