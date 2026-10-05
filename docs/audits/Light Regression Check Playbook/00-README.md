# MyLiberty Portal — Light Regression Check Playbook

Canonical operating playbook for performing the **Light Regression Check** (Level 1 Audit) across the MyLiberty Portal.

**Context:** Level 1 Verification Mechanism of the canonical audit system.  
**Canonical Governance Authority:** [`docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md`](../../governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md)  
**Technical Architecture:** [`docs/ARCHITECTURE.md`](../../ARCHITECTURE.md)  
**Conformance Baseline:** [`docs/audits/blueprint-conformance-matrix.md`](../blueprint-conformance-matrix.md)  

**Core Purpose:** Fast, targeted verification after a change. It answers five focused questions:
1. **Did the change break the affected workflow?**
2. **Did permissions regress?**
3. **Did data integrity regress?**
4. **Did dependent functionality break?**
5. **Did the change violate an established Blueprint invariant?**

---

## 1. Where Light Regression Fits

The canonical verification lifecycle is:

```text
AUTHORITATIVE BLUEPRINT → TECHNICAL ARCHITECTURE
  ↓
BUILD / CODE CHANGE
  ↓
LEVEL 1: TARGETED / LIGHT REGRESSION (This Playbook)
  ↓
CONTINUE BUILDING / REFINING
  ↓
LEVEL 2: DEEP FUNCTIONAL & WORKFLOW CONFORMANCE AUDIT (Periodic / Per-Role)
  ↓
LEVEL 3: FULL SYSTEM ARCHITECTURE & SCALABILITY AUDIT (Milestones)
```

- **Level 1 (Light Regression Check):** happens **frequently** (after every bug fix, feature addition, or rule edit).
- **Level 2 (Deep Conformance Audit):** happens **per role and dashboard** during systematic refinement.
- **Level 3 (Full System Audit):** happens at **major architecture milestones** (every 3–6 months or upon request).

---

## 2. What a Light Regression Check Is & Is NOT

### What It IS:
A fast, lightweight, and repeatable verification pass over:
1. The exact code or rule that changed;
2. The immediate workflow and permissions affected by the change;
3. Direct dependencies and data contracts connected to it;
4. Established invariants (from [`blueprint-conformance-matrix.md`](../blueprint-conformance-matrix.md)) governing the touched domain.

### What It Is NOT:
It is **not** a miniature full-system audit, complete database stress-test, or a substitute for Level 2 or Level 3 audits.

*Rule:* When a light regression check discovers a systemic defect or governance divergence, **record it and escalate to Level 2 or Level 3** rather than turning Level 1 into an uncontrolled deep audit.

---

## 3. When to Run It (Triggers)

Run a Light Regression Check after:
- any bug fix or patch;
- new feature addition;
- workflow modifications;
- Firestore query or repository changes;
- role, branch, or security rule edits;
- Worker or API contract updates;
- schema, deletion, or cascade behavior changes;
- attendance, kiosk, payment, or scheduling edits;
- shared utility, helper, or component modifications.

---

## 4. The Basic Light Regression Formula

For every change, execute this minimum sequence:

```text
CHANGE
  ↓
DIRECT WORKFLOW (Normal Path)
  ↓
ONE ADJACENT DEPENDENCY (Downstream Consumer)
  ↓
ONE FAILURE PATH (Invalid / Drop / Network)
  ↓
ONE PERMISSION / DATA-INTEGRITY CHECK (Wrong Role / Wrong Branch)
```

---

## 5. Files in This Playbook

| File | Sections | Scope |
|---|---|---|
| [`01-core-methods-and-checklist.md`](./01-core-methods-and-checklist.md) | §§ 6–9 | 5-Minute Core Check, Full Regression Checklist (A–F), Adjacent Dependency Mapping, Risk-Based Depth |
| [`02-security-and-data-rules.md`](./02-security-and-data-rules.md) | §§ 10, 19–21 | Security & Data Changes, "One Bad Thing" Rule, "Did State Really Change?" Rule, Escalation Criteria |
| [`03-domain-playbooks-kiosk-attendance-finance.md`](./03-domain-playbooks-kiosk-attendance-finance.md) | §§ 11–14 | Targeted Playbooks: Kiosk, Attendance & Manual Overrides, Payments & Cash, Roles & Navigation |
| [`04-domain-playbooks-branch-data-rules-worker.md`](./04-domain-playbooks-branch-data-rules-worker.md) | §§ 15–18 | Targeted Playbooks: Branch Logic, Deletion & Cascades, Firestore Rules, Cloudflare Worker/API |
| [`05-evidence-logging-and-status.md`](./05-evidence-logging-and-status.md) | §§ 22–24 | Regression Evidence Schema & Example, Status Codes (PASS/FAIL/BLOCKED/ESCALATE), Regression Log |
| [`06-agent-workflow-and-mistakes.md`](./06-agent-workflow-and-mistakes.md) | §§ 25–29, 31 | 10-Step Coding Agent Workflow, Handoff Template, Time Budgets, 7 Common Mistakes, Completion Criteria |

