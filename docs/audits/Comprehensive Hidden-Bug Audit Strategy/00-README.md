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

## Goal

Move from *"I think the Portal works"* to:
**"We tested the important workflows against the Authoritative Blueprint and know what conforms, what's broken, and what still needs owner decisions."**
