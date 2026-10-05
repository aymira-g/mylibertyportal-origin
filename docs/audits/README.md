# Audits & Verification Baseline

> **Authority Level:** Verification & Diagnostic Evidence (`docs/audits/`)  
> **Canonical Blueprint:** [`docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md`](../governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md)  
> **Technical Architecture:** [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md)  
>
> **Key Principle:**  
> Audits are **verification mechanisms**, not governance authorities. They verify that the running implementation adheres to the approved organizational truth (governed by the Authoritative Blueprint) and technical architecture (governed by `docs/ARCHITECTURE.md`).  
>
> An audit finding provides diagnostic evidence of divergence, defects, or gaps, but does **not** silently or automatically redefine policy or organizational truth without an explicit owner decision.

## Structure

```text
docs/audits/
├── blueprint-conformance-matrix.md                         ← Cross-cutting Blueprint conformance matrix & baseline
├── Light Regression Check Playbook/                        ← Level 1: Targeted post-change regression checks
├── Comprehensive Hidden-Bug Audit Strategy/                ← Level 2: Deep functional & workflow conformance QA
├── Full System Architecture & Scalability Audit Procedure/  ← Level 3: System architecture drift & scalability
├── current/                                                ← Current cycle findings & active verification baselines
├── archive/                                                ← Historical audit results & previous passes
└── audit-log.md                                            ← Running operational and product audit log
```

---

## 1. Cross-Cutting Conformance Baseline

* **[`blueprint-conformance-matrix.md`](./blueprint-conformance-matrix.md)**  
  Continuous cross-cutting baseline mapping Authoritative Blueprint invariants (INV-01 through INV-08) across Technical Architecture, concrete implementation (UI components, repositories, and `firestore.rules`), and verification coverage.

---

## 2. Permanent Audit Verification Levels

1. **[`Light Regression Check Playbook/`](./Light%20Regression%20Check%20Playbook/00-README.md) (Level 1 — Targeted Post-Change Regression)**  
   Fast, repeatable 5-minute verification pass executed after any code change, patch, or rule edit.  
   **Focus Questions:** Did this change break the affected workflow? Did permissions regress? Did data integrity regress? Did dependent functionality break? Did the change violate an established invariant?

2. **[`Comprehensive Hidden-Bug Audit Strategy/`](./Comprehensive%20Hidden-Bug%20Audit%20Strategy/00-README.md) (Level 2 — Deep Functional & Workflow Conformance)**  
   Detailed conformance layer and operational functional QA. Systematically traces 5 passes through business workflows, failure matrices, and boundary triggers.  
   **Verification Scope:** Role authority, workflow correctness, permission boundaries, state transitions, physical branch/division isolation, cross-feature interactions, failure paths, data scope, separation of duties, dashboard behavior, and business-rule implementation.  
   *Note: This is the **primary audit level** for the active role-by-role and dashboard-by-dashboard refinement effort.*

3. **[`Full System Architecture & Scalability Audit Procedure/`](./Full%20System%20Architecture%20&%20Scalability%20Audit%20Procedure/00-README.md) (Level 3 — System Architecture & Scalability Audit)**  
   Highest technical and system-wide verification level.  
   **Verification Scope:** Verifies the entire implemented system against the Authoritative Blueprint, accepted owner decisions, Technical Architecture, security rules, data architecture, scalability (10 to 10k users), resilience, performance, zero-budget Spark retention, and deployment integrity. Detects both **technical architecture drift** and **governance/implementation divergence**.

4. **[`audit-log.md`](./audit-log.md) (Running Operational Audit Log)**  
   Chronological record of operational items, owner decisions, and status flags across development sessions.

---

## 3. Current Audit Baseline (`audits/current/`)

Active verification baselines and findings from ongoing refinement work are maintained in [`audits/current/`](./current/README.md).

---

## 4. Historical Audits (`audits/archive/`)

Prior cycle audit reports (September – early October 2026) are preserved in [`audits/archive/`](./archive/README.md) to maintain an auditable verification trail.
