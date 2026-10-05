# MyLiberty Portal — Documentation Index

Welcome to the central documentation directory for **MyLiberty Portal**.

## Start Here

When working on this codebase as an engineer or AI coding assistant, orient yourself in this sequence:

1. **[`governance/`](./governance/README.md)** — Authoritative Governance Blueprint: organizational identity, authority boundaries, roles, separation of duties, and access principles (**defines WHAT is true**).
2. **[`ARCHITECTURE.md`](./ARCHITECTURE.md)** — Canonical system architecture and structure (**defines HOW it is implemented**).
3. **[`decisions/`](./decisions/README.md)** — Accepted business and architectural policies (**binding policy; must not contradict governance**).
4. **[`specs/`](./specs/README.md)** — Intended behavior and technical contracts for subsystems.
5. **[`plans/active/`](./plans/README.md)** — Active implementation and remediation plans (**proposed work; not authority**).
6. **[`audits/current/`](./audits/current/README.md)** — Reconciled audit findings and current verification baselines (**identifies gaps; findings do not silently become rules**).

---

## Documentation Authority & Work Lifecycle

```text
1. AUTHORITATIVE GOVERNANCE (What IS True)
   └── governance/        Canonical organizational blueprint (roles, authority, separation of duties).

2. PERMANENT SYSTEM KNOWLEDGE (How It Is Implemented)
   ├── ARCHITECTURE.md    Describes current canonical system architecture (protected).
   ├── decisions/         Contains accepted business and architectural policies.
   └── specs/             Contains intended subsystem behaviors, contracts, and schemas.

3. WORK LIFECYCLE (Pre-Execution & Post-Execution)
   ├── PRE-EXECUTION (The Plans — Not Authority)
   │     ├── plans/active/     Active plans: scope, affected files, cost/risk check, verification plan.
   │     └── proposals/        Ideas and designs under consideration awaiting decision.
   │
   └── POST-EXECUTION (The Reports & Proof — Evidence, Not Policy)
         ├── plans/completed/  Completed execution reports and verified implementation history.
         ├── audits/current/   Active verified audit baselines and investigation findings.
         └── audits/archive/   Historical audit logs and past verification passes.

Historical documents do not override current source code, Firestore rules,
tests, or verified runtime behavior.
```

---

## Folder Guide

```text
docs/
├── governance/              # Authoritative organizational & authority baseline
│   ├── README.md
│   └── MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md
│
├── ARCHITECTURE.md          # Protected canonical architecture guide
├── README.md                # Documentation index and authority guide (this file)
│
├── decisions/               # Formally accepted architectural and business policies
│   ├── README.md
│   └── 2026-09-24-multi-branch-data-isolation.md
│
├── specs/                   # Behavioral contracts and subsystem specifications
│   ├── README.md
│   ├── attendance/          # Attendance module contracts
│   ├── parent/              # Parent & student roster contracts
│   └── dev-tools/           # Developer tooling specifications
│
├── plans/                   # Implementation and remediation plans
│   ├── README.md
│   ├── active/              # Active, actionable implementation and remediation work
│   └── completed/           # Finished execution plans
│
├── audits/                  # System audits, procedures, and findings
│   ├── README.md
│   ├── Light Regression Check Playbook/                        # Level 1: Post-change checks
│   ├── Comprehensive Hidden-Bug Audit Strategy/                # Level 2: Section deep dives
│   ├── Full System Architecture & Scalability Audit Procedure/  # Level 3: Architecture drift
│   ├── audit-log.md                                            # Running operational items log
│   ├── current/                                                # Latest reconciled findings & verification baselines
│   └── archive/                                                # Historical audit reports
│
├── audit-prompts/           # Reusable audit instructions and evaluation criteria
│   ├── README.md
│   └── cross-feature-integration-audit.md
│
├── proposals/               # Forward-looking designs and RFCs under consideration
│   ├── README.md
│   └── archive/             # Archived proposals (e.g. converted to decisions)
│
└── archive/                 # General documentation archive
    └── README.md
```

---

## Permanent Audit Procedures

The authoritative audit suites and verification playbooks:

* **Level 1 (Targeted Regression):** [`audits/Light Regression Check Playbook/`](./audits/Light%20Regression%20Check%20Playbook/00-README.md) — 5-minute targeted regression checks following any code change.
* **Level 2 (Section Deep Audits):** [`audits/Comprehensive Hidden-Bug Audit Strategy/`](./audits/Comprehensive%20Hidden-Bug%20Audit%20Strategy/00-README.md) — Section deep dives, 5-pass workflow tracing, and failure matrices.
* **Level 3 (Architecture & Scalability):** [`audits/Full System Architecture & Scalability Audit Procedure/`](./audits/Full%20System%20Architecture%20&%20Scalability%20Audit%20Procedure/00-README.md) — Architectural drift, database growth, and high-load stress testing.
* **Running Operational Audit Log:** [`audits/audit-log.md`](./audits/audit-log.md)

---

## Authoritative Governance

The foundational governance baseline that defines the organization, roles, authority boundaries, and operating principles:

* **[`governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md`](./governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md)**  
  **Authoritative Organizational, Authority & Rebuild Blueprint (v3.0):** Defines 4 branches, 2 divisions (Course & Kindergarten), organizational roles, strict separation of System Admin from organizational roles, data scope, simplified Maker-Checker / Signer governance, and safe rebuild doctrine.

---

## Current Decisions

Formally accepted policies that govern ongoing implementation and operational procedures. These must align with the Authoritative Governance Blueprint:

* **[`decisions/2026-09-24-multi-branch-data-isolation.md`](./decisions/2026-09-24-multi-branch-data-isolation.md)**  
  Multi-branch data isolation policy (`branchId` scoping across Firestore collections, repository normalizers, and Maker-Checker dual-control routing). *(Note: Provisional representation of executive roles by technical `admin` is superseded by Blueprint v3 and executive bootstrap decisions below).*
* **[`decisions/2026-10-04-executive-account-migration-bootstrap-runbook.md`](./decisions/2026-10-04-executive-account-migration-bootstrap-runbook.md)**  
  Executive Account Migration & Bootstrapping: Separation of Director and Vice Director roles from technical admin, with one-time Firebase Console bootstrap procedure.
* **[`decisions/2026-10-04-executive-break-glass-procedure.md`](./decisions/2026-10-04-executive-break-glass-procedure.md)**  
  Executive Deadlock Break-Glass Procedure: Console-level recovery runbook when dual-control in-app approvals cannot proceed.

---

## Subsystem Specifications

Intended technical contracts and behavioral rules:

* **Authorization Scope Contract:** [`specs/authorization-contract.md`](./specs/authorization-contract.md)
* **Attendance Subsystem:** [`specs/attendance/attendance-module-v4-myliberty-integration-spec.md`](./specs/attendance/attendance-module-v4-myliberty-integration-spec.md)
* **Parent & Student Subsystem:** [`specs/parent/myliberty-parent-student-roster-data-model.md`](./specs/parent/myliberty-parent-student-roster-data-model.md) & [`specs/parent/myliberty-parent-student-link-fix.md`](./specs/parent/myliberty-parent-student-link-fix.md)
* **Developer Tools:** [`specs/dev-tools/hybrid-quick-switch-user-spec.md`](./specs/dev-tools/hybrid-quick-switch-user-spec.md)
* **UI & Design System:** [`specs/shared-design-language.md`](./specs/shared-design-language.md)

---

## Work Lifecycle & Archives (Refinement Workspace)

To prepare for the upcoming project refinement:
- **Active Plans (`plans/active/`):** Cleared for incoming refinement plans. Past sprint plans safely archived under [`plans/archive/`](./plans/README.md).
- **Proposals (`proposals/`):** Cleared for incoming RFCs. Past proposals archived under [`proposals/archive/`](./proposals/README.md).
- **Audit Findings Baseline (`audits/current/`):** Prior cycle investigation reports moved to [`audits/archive/`](./audits/archive/README.md) to make way for the new refinement verification baseline.
- **Historical Material & Archives:** All historical documents are preserved in [`archive/`](./archive/README.md), [`audits/archive/`](./audits/archive/README.md), and [`plans/archive/`](./plans/archive/).

