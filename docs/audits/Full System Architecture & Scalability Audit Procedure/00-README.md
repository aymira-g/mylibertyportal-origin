# Full System Architecture & Scalability Audit

Canonical procedure for auditing architecture drift, structural coherence, and scalability in the MyLiberty Portal.

**Declared architecture:** `docs/ARCHITECTURE.md`  
**Agent working rules:** `AGENTS.md` / `CLAUDE.md`  
**Complementary functional bug audit:** `docs/audits/Comprehensive Hidden-Bug Audit Strategy/`

---

## Purpose

This audit is specifically designed to detect not only code defects, but also **architecture drift**: places where the documented architecture, implemented architecture, and real operational behavior no longer agree.

It also stress-tests system scalability, database growth limits, and concurrency boundaries under the project's zero-budget constraint.

## Audit Mode

This is an **audit**, not a feature-development task.

Unless explicitly instructed otherwise:
- do not modify production code;
- do not “fix” findings during the audit;
- do not rewrite architecture merely to make it look cleaner;
- do not suppress inconvenient findings because they are old;
- do not treat documentation as proof that implementation matches it.

**Produce the evidence and findings first.**

---

## Files in This Procedure

| File | Sections | Scope |
|---|---|---|
| [`01-audit-principles-and-drift.md`](./01-audit-principles-and-drift.md) | §§ 1–3 | Audit Principles, Whole-System Inspection, Architecture Drift Audit, Architecture Integrity Audit |
| [`02-business-flows-and-missing-links.md`](./02-business-flows-and-missing-links.md) | §§ 4–5 | Business & Logic Flow Tracing (9 Questions), Missing-Link & Broken-Chain Audit |
| [`03-data-model-and-firestore-scalability.md`](./03-data-model-and-firestore-scalability.md) | §§ 6–9 | Data Model / Schema Audit, Firestore Scalability (10–10k users), Heavy Traffic Scenarios (A–D), Concurrency & Races |
| [`04-security-resilience-and-infrastructure.md`](./04-security-resilience-and-infrastructure.md) | §§ 10–13, 15 | Security / Authorization (Malicious Client), Failure & Recovery, Performance, Observability, Deployment & Operations |
| [`05-quality-debt-and-evolution.md`](./05-quality-debt-and-evolution.md) | §§ 14, 16–17 | Testing Audit (Shallow vs Deep), Technical Debt & Dependencies, Architecture Evolution Test (10× & 100×) |
| [`06-evidence-reporting-and-governance.md`](./06-evidence-reporting-and-governance.md) | §§ 18–21 | Evidence Standard, Required Final Report Format, 12 Mandatory Final Questions, Audit Output Governance |

---

## Audit Workflow

```text
Audit Trigger (AGENTS.md)
  ↓
Read docs/ARCHITECTURE.md
  ↓
Read & Execute §§ 1–17 across the Procedure Files
  ↓
Compile Evidence to Standard (§ 18)
  ↓
Answer 12 Final Questions (§ 20)
  ↓
Produce Formal Report (§ 19)
  ↓
Kifry Review & Prioritization
  ↓
Controlled Remediation & Architecture Guide Update (§ 21)
```
