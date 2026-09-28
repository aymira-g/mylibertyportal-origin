# MyLiberty Portal — Light Regression Check Playbook

Canonical operating playbook for performing the **Light Regression Check** (Level 1 Audit) across the MyLiberty Portal.

**Context:** Level 1 of the canonical audit strategy (`docs/audits/Comprehensive Hidden-Bug Audit Strategy/`).  
**Core Purpose:** Answer one focused question after any change:  
> **"Did this change break the feature, its immediate workflow, or an important nearby dependency?"**

---

## 1. Where Light Regression Fits

The canonical audit lifecycle is:

```text
BUILD
  ↓
CHANGE
  ↓
TARGETED / LIGHT REGRESSION (This Playbook)
  ↓
CONTINUE BUILDING
  ↓
SECTION DEEP AUDIT (Periodic)
  ↓
CROSS-FEATURE AUDIT (Pre-Milestone)
  ↓
RELEASE VERIFICATION
  ↓
PERIODIC FULL PORTAL AUDIT (Architecture & Scalability)
```

- **Light regression check:** happens **frequently** (after every meaningful change).
- **Section deep audit:** happens **periodically** (every 1–2 months).
- **Full system audit:** happens at **major milestones** (every 3–6 months).

---

## 2. What a Light Regression Check Is & Is NOT

### What It IS:
A focused verification pass over:
1. The exact thing that changed;
2. The workflow immediately affected by the change;
3. The most important dependency directly connected to it;
4. The primary failure, permission, or data-integrity path.

It must be **fast, repeatable, evidence-based, limited in scope, and triggered by a specific change.**

### What It Is NOT:
It is **not** a full security audit, complete rules audit, branch isolation audit, concurrency audit, or a substitute for a Section Deep Audit or Full Portal Audit.

*Rule:* When a light regression discovers a serious defect, **escalate it into a deeper audit** rather than trying to cram an entire deep audit into a quick regression check.

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

*(Monolithic single-file reference preserved at [`MyLiberty_Portal_Light_Regression_Check_Playbook.md`](./MyLiberty_Portal_Light_Regression_Check_Playbook.md)).*
