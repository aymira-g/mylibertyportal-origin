# MyLiberty Portal — BLRCA 01: Establishing Approved Role Contracts

**Document Type:** Level 2 Audit Campaign Procedure  
**Status:** Restructured from the owner-ratified BLRCA procedure dated 2026-10-15; moved content is intended to preserve the approved meaning. Passages marked `[NEW — PENDING OWNER REVIEW]` are additions and are not represented as owner-ratified.  
**Scope:** Deriving and defining expected role-to-function contracts from canonical governance  
**Canonical Governance Authority:** [`docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md`](../../governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md)  
**Parent Framework:** [`docs/audits/Role & Business Logic Conformance Audit/00-README.md`](./00-README.md)

---

## 1. Governance Authority & Hierarchy

To determine whether an observed application behavior is correct, the auditor must strictly adhere to the repository's canonical authority hierarchy:

```text
AUTHORITATIVE BLUEPRINT (docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md)
        ↓
    defines WHAT is true (organizational identity, authority boundaries, separation of duties)
        ↓
ACCEPTED OWNER DECISIONS (docs/decisions/)
        ↓
    defines BINDING POLICIES & FORMAL EXCEPTIONS (ratified owner decisions)
        ↓
TECHNICAL ARCHITECTURE (docs/ARCHITECTURE.md) & SUBSYSTEM SPECS (docs/specs/)
        ↓
    defines HOW it is implemented (technical contracts, boundaries, conventions)
        ↓
ACTUAL CODE & SECURITY RULES (src/, firestore.rules, cloudflare-worker/)
        ↓
    provides EVIDENCE of observed behavior, not authority for what the company should do
        ↓
AUDIT REPORTS & LEDGERS (docs/audits/)
        ↓
    provides VERIFICATION EVIDENCE; findings are evidence, never governance authority
```

### Precedence Rules

1. **The Blueprint governs organizational truth:** Organizational identity, division boundaries, executive dual-control, and the absence of a Branch Manager role are defined authoritatively in [`docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md`](../../governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md).
2. **Accepted decisions supplement the blueprint:** Detailed operational rules, financial models, discount delegations, and approval matrices are governed by accepted decisions in [`docs/decisions/`](../../decisions/README.md).
3. **Architecture is not organizational authority:** `docs/ARCHITECTURE.md` defines technical implementation, not business authority. If architecture notes contradict the Authoritative Blueprint, the blueprint governs and the divergence is logged.
4. **Code is never authority:** Implementation and automated tests are evidence of observed behavior. The fact that a button exists, a route is accessible, or code permits an action is never proof of authorization.
5. **Audits verify; they do not rule:** Audit findings do not silently alter policy. When code and governance diverge, the finding records the defect or gap; policy changes require an explicit, ratified owner decision.

---

## 2. Mandatory Pre-Flight Verification

At the beginning of every campaign slice, the auditor must verify and document:

1. **Blueprint State:** Inspect `docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md` and record:
   - Version (Current: v3.4);
   - Status (Current: `RATIFIED AUTHORITATIVE BASELINE — APPROVED BY OWNER KIFRY`);
   - Date (Current: 2026-10-13).
   *If the version, status, or date has changed, review what was amended and determine whether active role expectations are affected.*
2. **Accepted Decisions:** Review `docs/decisions/` to confirm if new decisions or formal exceptions have been ratified by the owner since prior campaign passes (specifically checking financial policies OD-1, OD-2, OD-4, G-009, and branch typology G-012).
3. **Repository State:** Record target Git commit SHA, branch name, and working-tree status.
4. **Active Scope & Boundary:** Define the exact scope of the current slice and list any out-of-scope paths.

---

## 3. Organizational Roles vs. Technical Identities

A critical source of governance drift is collapsing **organizational roles** into **technical identities**. The auditor must maintain clear separation:

- **Organizational Role:** The business capacity held by a human worker under the Authoritative Blueprint, carrying specific business responsibilities, duties, and maker-checker limits (e.g., Course Division Manager, Desk Front Office, Strategic Director).
- **Technical Identity:** The authentication claims, system-access flags, or tokens assigned to a user account in Firebase Auth and Firestore (e.g., `role: "admin"`, `isAdminView: true`, `isExecutiveRole()`).
- **Physical Branch as Scope (`branchId`):** A physical branch is an organizational and data-scope boundary, **NOT a managerial role**. There is no "Branch Manager" role (Blueprint v3.1 §5.1, v3.3 §5.5).
- **Division as Scope (`division`):** Division boundaries (`courses`, `kindergarten`) strictly segment operational and financial authority.

### Canonical Role Identifiers

The application defines canonical operational role strings in [`src/features/shared/roles.js`](../../../src/features/shared/roles.js):

| Canonical Role ID | Organizational Role Under Blueprint | Primary Scope | Division Scope |
|---|---|---|---|
| `director` | Director (Strategic Control) | Province-wide (all branches) | All divisions |
| `vice_director` | Vice Director (Operational Control) | Province-wide (all branches) | All divisions |
| `admin` | System Admin (Technical Infrastructure Only) | System-wide (technical data) | None (technical) |
| `manager` | Division Manager | Assigned branch (`branchId`) | Bound to `division` (`courses` or `kindergarten`) |
| `opslead` | Operational Leader | Main Campus (`kota_gorontalo`) | Operational support |
| `instructorleader` | Central Academic Lead (Instructor Leader) | Province-wide (pedagogical) | Academic curriculum |
| `frontoffice` | Front Office (Customer Service & Cashiering) | Assigned branch (`branchId`) | Bound to `division` |
| `marketing` | Marketing Specialist | Assigned branch / province | Public outreach |
| `instructor` | Teaching Instructor | Assigned branch (`branchId`) | Bound to `division` |
| `officeboy` | Facilities & Support Staff | Assigned branch (`branchId`) | Site maintenance |
| `student` | Learner Profile | Self-record only | Enrolled classes |
| `parent` | Parent / Guardian Profile | Linked children only | Linked students |

### Non-Human System Identities

In addition to user accounts, the system encompasses automated and administrative execution identities that bypass normal user workflows:

- **Cloudflare Worker (`cloudflare-worker/worker.js`):** Executes public intake, kiosk clock-in/out, and parent linkage with administrative privileges.
- **Service Accounts & Apps Script (`FormSync.gs`):** Background ingestion pipeline synchronizing external forms directly into Firestore, bypassing Firestore Security Rules.
- **Administrative Scripts (`scripts/`):** Maintenance scripts executing direct database mutations via Admin SDK.

*Audit Requirement:* Automated and non-human execution paths must be audited directly at their own input validation, sanitization, and authorization boundaries.

---

## 4. Normalization of Legacy Role Aliases

Legacy documents and older components contain historical role strings. The application normalizes these in `src/features/shared/roles.js` via `LEGACY_ROLE_ALIASES`:

| Legacy Alias | Canonical ID | Technical Normalization Location | Notes / Governance Status |
|---|---|---|---|
| `vicedirector`, `vice-director`, `vice_dir` | `vice_director` | `src/features/shared/roles.js` | Normalizes to Vice Director |
| `ops_lead` | `opslead` | `src/features/shared/roles.js` | Normalizes to Operational Leader |
| `instructor_leader`, `head_instructor` | `instructorleader` | `src/features/shared/roles.js` | Normalizes to Instructor Leader |
| `front_office` | `frontoffice` | `src/features/shared/roles.js` | Normalizes to Front Office |
| `frontofficelead`, `front_office_lead` | `opslead` | `src/features/shared/roles.js` | Normalized in code to `opslead` *(See Governance Gap below)* |

### Open Governance Question: Front Office Lead

`[NEW — PENDING OWNER REVIEW: Explicit Governance Gap Tracking]`

> **Open Governance Question:**  
> **Is "Front Office Lead" an approved, distinct organizational role with unique authority boundaries, or is it merely an operational alias for Front Office staff or the Operational Leader?**
>
> - **Observed in Code:** `src/features/shared/roles.js` line 35-36 explicitly normalizes `frontofficelead` and `front_office_lead` to `opslead`. In `firestore.rules:45`, `isFrontOffice()` includes `role == 'frontofficelead'`.
> - **Status in Blueprint:** The Authoritative Blueprint v3.4 does not define a separate "Front Office Lead" executive or managerial position.
> - **Auditor Rule:** This status is recorded as **OWNER DECISION REQUIRED**. Until formally ratified by the owner, auditors must **not** invent a separate role contract for "Front Office Lead."

---

## 5. Deriving the Role-to-Function Contract

For every role evaluated in a campaign slice, the auditor must derive an explicit contract containing:

1. **Role Purpose:** Why this role exists in the organization.
2. **Allowed Business Functions:** Permitted operational tasks directly derived from governance.
3. **Prohibited / Reserved Functions:** Business capabilities explicitly forbidden or reserved for other roles (e.g., System Admin forbidden from viewing tuition revenue; Division Managers forbidden from approving discounts).
4. **Information Visibility & Business Justification:** Exactly what records the role may read, and the legitimate operational reason for viewing them.
5. **Data Mutation Authority (CRUD):** Explicit create, read, update, delete, and export permissions.
6. **Decision & Workflow Rights:** Initiation (Maker), review (Checker), approval, rejection, and execution authority.
7. **Scope Constraints:** Branch isolation (`branchId`), division isolation (`division`), and record-level isolation (e.g., self, linked child).
8. **Maker-Checker & Separation of Duties:** Self-approval prohibitions and dual-control gates.
9. **Approved Delegations:** Any ratified temporary delegations or break-glass provisions.
10. **Canonical Citations:** Specific Blueprint section(s) and accepted decision IDs supporting each requirement.

### Contract Classification Labels

Every requirement in a role contract must be tagged with one of the following labels:

- **`[Established]`:** Directly established by ratified text in the Authoritative Blueprint or an accepted owner decision. *Only an Established requirement can independently support a confirmed conformance failure (FAIL).*
- **`[Inferred]`:** Logically deduced from code patterns, historical practice, or architectural convenience, but not explicitly stated in governance. *Inferences can guide testing but cannot independently support a FAIL without owner validation.*
- **`[Proposed]`:** Recommended by technical design or audit proposals, but not yet ratified by the owner.
- **`[Owner Decision Required]`:** A material policy ambiguity or unaddressed organizational rule. Must be escalated to the owner for formal resolution.

---

## 6. Strict Prohibition on Inferring Authority

Auditors must adhere to the mandatory governance rules established in `AGENTS.md`:

1. **No Inferred Authority from UI:** The presence of a button, card, or menu in the UI does not grant organizational authority.
2. **No Inferred Authority from Code Convenience:** The fact that an existing query succeeds or a database rule permits an action does not make it authorized.
3. **No Inferred Authority from Seniority:** Operational seniority does not grant business authority outside explicitly defined roles.
4. **No Inferred Catch-All Managers:** Removing the Branch Manager role does not transfer former permissions to the Course Division Manager or Operational Leader. If a workflow lacks a designated approver, log it as an **Owner Decision Required**.
5. **No System Admin Business Authority:** System Admin is a technical maintenance role only. It possesses zero business management, financial visibility, or workflow approval rights.
