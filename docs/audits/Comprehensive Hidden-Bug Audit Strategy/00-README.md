# MyLiberty Portal — Level 2: Deep Functional & Workflow Conformance Audit

Canonical operating model for deep functional verification and workflow conformance in the MyLiberty Portal.

**Context:** Level 2 Verification Mechanism of the canonical audit system.  
**Canonical Governance Authority:** [`docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md`](../../governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md)  
**Technical Architecture:** [`docs/ARCHITECTURE.md`](../../ARCHITECTURE.md)  
**Conformance Baseline:** [`docs/audits/blueprint-conformance-matrix.md`](../blueprint-conformance-matrix.md)  

---

## Purpose & Refinement Role

Level 2 is the **detailed conformance verification layer** and the **primary audit level for the role-by-role and dashboard-by-dashboard refinement effort**.

The goal is not merely:
> *"Does the feature work?"*

Instead, Level 2 proves:
> **"Does the implemented workflow correctly realize the authority, scope, permissions, and business rules derived from the approved Authoritative Blueprint?"**

## Verification Scope

Level 2 audits explicitly inspect and verify:
- **Role Authority:** Does the user hold genuine organizational authority for this action?
- **Workflow Correctness:** Are business stages, states, and prerequisites strictly enforced?
- **Permission Boundaries:** Can the operation be triggered directly from an unauthorized client?
- **State Transitions:** Can closed or terminal states (e.g. signed-off shifts, approved records) be re-opened?
- **Branch & Division Scope:** Are physical branch (`branchId`) and division boundaries strictly isolated?
- **Cross-Feature Interactions:** Do changes in one domain (e.g. shifts) corrupt another (e.g. cash discrepancy approvals)?
- **Failure & Retry Paths:** Does the system fail closed when network, authentication, or validation fails?
- **Data Scope & Privacy:** Is personal, student, or staff data exposed beyond legitimate need?
- **Separation of Duties:** Does the workflow enforce independent human review (Maker-Checker) without self-approval?
- **Dashboard Behavior:** Does the dashboard present only already-authorized capabilities without assuming permission?
- **Business-Rule Implementation:** Are calculation rules (tuition, discounts, punctuality, attendance) accurate?
- **Dev-Tool Build Gating:** Are development-only tools (`DevQuickSwitcher`, debug panels) strictly stripped from production builds?
- **Accessibility Basics:** Are form labels, keyboard navigation, and color-independent status indicators properly implemented?
- **Index Parity & Quota Safety:** Does every compound query shape have a matching index in `firestore.indexes.json` to prevent silent degradation or false zero figures?
- **Rules Expression Headroom:** Do Firestore security rules evaluate safely within the 1000-expression ceiling?
- **Privileged Ops & Integration Safety:** Do service-account operations (`FormSync.gs`, `scripts/`) enforce pre-write validation, dedupe, and mandatory rollback plans?

## Core Insight

Serious defects rarely sit in the happy path. They live at **boundaries**:
UI → client logic → repository → Firestore · client → Worker/API → Firestore · Firestore → security rules · one workflow → another · one role → another · one branch → another · an operation → its retry/failure path.

So audit **section by section**, trace each section as a **complete business workflow** through the 5-pass method, and finish with a **cross-feature attack audit**.

## Files

| File | Contents |
|---|---|
| `01-audit-cadence.md` | Three audit levels, triggers, rhythm, risk-based depth, audit debt |
| `02-audit-method.md` | Workflow tracing, five-pass method, failure matrix, special trigger categories, time, branch, consistency, runtime matrix |
| `03-audit-domains.md` | What to audit in each of the 13 Portal areas, plus recommended order |
| `04-lifecycle-and-attack-audits.md` | Student/staff lifecycles, final attack audit, kiosk lessons |
| `05-bug-tracking.md` | Bug ledger, audit record, bug lifecycle, remediation phases, severity |
| `06-checklists-and-agent-instructions.md` | Definition of done, coding-agent instructions |

### Specialized Campaign Procedures

- [`Role & Business Logic Conformance Audit (BLRCA)`](../Role%20&%20Business%20Logic%20Conformance%20Audit/00-README.md): Structured slice-by-slice campaign procedure for role-by-role and dashboard-by-dashboard governance conformance.

## Goal

Move from *"I think the Portal works"* to:
**"We tested the important workflows against the Authoritative Blueprint and know what conforms, what's broken, and what still needs owner decisions."**
