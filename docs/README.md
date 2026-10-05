# MyLiberty Portal — Documentation Index

Welcome to the central documentation directory for **MyLiberty Portal**.

## Start Here

When working on this codebase as an engineer or AI coding assistant, orient yourself in this sequence:

1. **[`governance/`](./governance/README.md)** — **Authoritative Governance Blueprint:** organizational identity, authority boundaries, roles, separation of duties, and access principles (**defines WHAT is true**).
2. **[`decisions/`](./decisions/README.md)** — **Accepted Business & Architectural Decisions:** binding owner policies, formal exceptions, and migration runbooks (**must align with governance**).
3. **[`ARCHITECTURE.md`](./ARCHITECTURE.md)** — **Canonical Technical Architecture:** technical implementation authority for structure, persistence, boundaries, and dependencies (**defines HOW it is implemented**).
4. **[`specs/`](./specs/README.md)** — **Subsystem Specifications:** concrete behavioral contracts and schemas for subsystems.
5. **[`plans/active/`](./plans/README.md)** — **Active Execution Plans:** current proposed work, scope, and verification steps (**proposals, not authority**).
6. **[`audits/`](./audits/README.md)** — **Verification & Conformance Evidence:** 3 modular audit levels and the Blueprint Conformance Matrix (**verifies implementation matches truth; findings are evidence, not rules**).

---

## Canonical Documentation Hierarchy

```text
1. AUTHORITATIVE BLUEPRINT (What IS True)
   └── governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md
       Canonical organizational truth, roles, authority boundaries, and invariants.

2. ACCEPTED OWNER DECISIONS / EXCEPTIONS (Binding Policies)
   └── decisions/
       Formally accepted owner policies, runbooks, and explicit exceptions.

3. TECHNICAL ARCHITECTURE (How It Is Implemented)
   └── ARCHITECTURE.md
       Protected technical implementation authority (derived from & constrained by Blueprint).

4. SUBSYSTEM CONTRACTS & EXECUTION PLANS (Concrete Behavior & Proposed Work)
   ├── specs/            Behavioral contracts, interfaces, and schemas.
   ├── plans/active/     Proposed implementation and remediation work (not authority).
   └── proposals/        Designs and RFCs under evaluation.

5. CODE & SECURITY RULES (Software Behavior)
   ├── src/              Application logic, React components, repositories.
   ├── firestore.rules   Server-side database access boundaries.
   └── cloudflare-worker/ Edge security verification and cryptographic validation.

6. VERIFICATION / AUDIT EVIDENCE (Testing Implementation Against Authority)
   ├── audits/blueprint-conformance-matrix.md  Cross-cutting Blueprint conformance baseline.
   ├── audits/Light Regression Check Playbook/  Level 1: Fast post-change checks.
   ├── audits/Comprehensive Hidden-Bug Audit/  Level 2: Deep functional & workflow QA.
   ├── audits/Full System Architecture Audit/  Level 3: Architecture drift & scalability.
   └── audits/current/                         Active verification findings & baselines.
```

The key principle is:
> **The Blueprint defines organizational truth and authority.**  
> **Technical Architecture defines how the software implements that truth.**  
> **Audits verify that the implementation matches the approved truth and architecture.** (Audits are verification mechanisms, not governance authorities).

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
│   ├── blueprint-conformance-matrix.md                         # Cross-cutting Blueprint conformance baseline
│   ├── Light Regression Check Playbook/                        # Level 1: Post-change checks
│   ├── Comprehensive Hidden-Bug Audit Strategy/                # Level 2: Section deep dives & workflow QA
│   ├── Full System Architecture & Scalability Audit Procedure/  # Level 3: Architecture drift & scalability
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

## Permanent Audit Verification System

Audits are **verification mechanisms**, not governance authorities. They verify that the running system conforms to the Authoritative Blueprint and Technical Architecture:

* **Cross-Cutting Conformance Baseline:** [`audits/blueprint-conformance-matrix.md`](./audits/blueprint-conformance-matrix.md) — Maps Blueprint invariants (INV-01 through INV-08) across architecture, implementation, and audit coverage.
* **Level 1 (Targeted Regression):** [`audits/Light Regression Check Playbook/`](./audits/Light%20Regression%20Check%20Playbook/00-README.md) — 5-minute targeted post-change regression checks following any code change.
* **Level 2 (Deep Functional & Workflow Conformance):** [`audits/Comprehensive Hidden-Bug Audit Strategy/`](./audits/Comprehensive%20Hidden-Bug%20Audit%20Strategy/00-README.md) — Section deep dives, 5-pass workflow tracing, and failure matrices. Primary audit level for role-by-role and dashboard-by-dashboard refinement.
* **Level 3 (Architecture & Scalability):** [`audits/Full System Architecture & Scalability Audit Procedure/`](./audits/Full%20System%20Architecture%20&%20Scalability%20Audit%20Procedure/00-README.md) — Verifies system against Blueprint, decisions, architecture, security rules, scalability, and detects architecture drift and governance divergence.
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

