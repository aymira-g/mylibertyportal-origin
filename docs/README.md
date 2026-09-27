# MyLiberty Portal — Documentation Index

Welcome to the central documentation directory for **MyLiberty Portal**.

## Start Here

When working on this codebase as an engineer or AI coding assistant, orient yourself in this sequence:

1. **[`ARCHITECTURE.md`](./ARCHITECTURE.md)** — Canonical system architecture and structure.
2. **[`decisions/`](./decisions/README.md)** — Accepted business and architectural policies.
3. **[`specs/`](./specs/README.md)** — Intended behavior and technical contracts for subsystems.
4. **[`plans/active/`](./plans/README.md)** — Active implementation and remediation plans.
5. **[`audits/current/`](./audits/current/README.md)** — Reconciled audit findings and current verification baselines.

---

## Documentation Authority

```text
DOCUMENT AUTHORITY

ARCHITECTURE.md
    Describes the current system architecture.

decisions/
    Contains accepted business and architectural decisions.

specs/
    Describes intended subsystem behavior and contracts.

plans/
    Describes work that is planned or being executed.

audits/current/
    Contains current audit findings and verification baselines.

audits/archive/
    Contains historical audit results.

audit-prompts/
    Contains instructions used to perform audits.

proposals/
    Contains ideas and designs that have not yet been accepted.

Historical documents do not override current source code, Firestore rules,
tests, or verified runtime behavior.
```

---

## Folder Guide

```text
docs/
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
│   ├── FULL_ARCHITECTURE_AUDIT.md  # Deep audit procedure (governed by AGENTS.md)
│   ├── audit-log.md                 # Running operational items log
│   ├── current/                     # Latest reconciled findings & verification baselines
│   └── archive/                     # Historical audit reports
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

## Current Audit Baseline

The authoritative, reconciled verification baseline describing current findings in the codebase:

* **Consolidated Baseline:** [`audits/current/2026-09-27-reconciled-full-audit.md`](./audits/current/2026-09-27-reconciled-full-audit.md)
* **Broader Findings:** [`audits/current/2026-09-27-claude-audit-broader-findings.md`](./audits/current/2026-09-27-claude-audit-broader-findings.md)
* **Continuation Evidence:** [`audits/current/2026-09-27-claude-audit-continuation.md`](./audits/current/2026-09-27-claude-audit-continuation.md)
* **Permanent Deep Audit Procedure:** [`audits/FULL_ARCHITECTURE_AUDIT.md`](./audits/FULL_ARCHITECTURE_AUDIT.md)

---

## Current Decisions

Formally accepted policies that govern ongoing implementation and security rules:

* **[`decisions/2026-09-24-multi-branch-data-isolation.md`](./decisions/2026-09-24-multi-branch-data-isolation.md)**  
  Multi-branch data isolation policy (`branchId` scoping across Firestore collections, repository normalizers, and Maker-Checker dual-control routing).

---

## Subsystem Specifications

Intended technical contracts and behavioral rules:

* **Attendance Subsystem:** [`specs/attendance/attendance-module-v4-myliberty-integration-spec.md`](./specs/attendance/attendance-module-v4-myliberty-integration-spec.md)
* **Parent & Student Subsystem:** [`specs/parent/myliberty-parent-student-roster-data-model.md`](./specs/parent/myliberty-parent-student-roster-data-model.md)
* **Developer Tools:** [`specs/dev-tools/hybrid-quick-switch-user-spec.md`](./specs/dev-tools/hybrid-quick-switch-user-spec.md)

---

## Active Plans

Actionable implementation and remediation sequences currently in progress:

* **School Outreach Remediation:** [`plans/active/outreach-manager-marketing-remediation-plan.md`](./plans/active/outreach-manager-marketing-remediation-plan.md)
* **Operational Audit Execution Plan:** [`plans/active/operational-audit-execution-plan.md`](./plans/active/operational-audit-execution-plan.md)
* **File Splitting Plan (>1000 lines):** [`plans/active/large-file-splitting-plan.md`](./plans/active/large-file-splitting-plan.md)
* **Operational Execution Brief:** [`plans/active/myliberty-revision-brief.md`](./plans/active/myliberty-revision-brief.md)
* **Corporate Event Attendance:** [`plans/active/corporate-event-attendance-plan.md`](./plans/active/corporate-event-attendance-plan.md)
* **Private/TOEFL vs Event Clock-in Fix:** [`plans/active/private-toefl-vs-corporate-event-clock-in-plan.md`](./plans/active/private-toefl-vs-corporate-event-clock-in-plan.md)
* **Gorontalo School Outreach Map:** [`plans/active/gorontalo-school-outreach-plan.md`](./plans/active/gorontalo-school-outreach-plan.md)
* **Scale & Log Retention:** [`plans/active/spark-scale-and-log-retention-plan.md`](./plans/active/spark-scale-and-log-retention-plan.md)

---

## Proposals Under Consideration

Design proposals that have not yet been formally accepted as binding policy:

* **Front Office Operations Enhancement:** [`proposals/2026-09-23-front-office-operations-enhancement.md`](./proposals/2026-09-23-front-office-operations-enhancement.md)
* **Kiosk Clock-in Options Comparison:** [`proposals/2026-09-25-kiosk-clock-in-audit-comparison.md`](./proposals/2026-09-25-kiosk-clock-in-audit-comparison.md)
* **Kiosk Security Hardening:** [`proposals/2026-09-25-kiosk-clock-in-security-hardening.md`](./proposals/2026-09-25-kiosk-clock-in-security-hardening.md)
* **Available Batches Roadmap:** [`proposals/myliberty-available-batches-roadmap.md`](./proposals/myliberty-available-batches-roadmap.md)

---

## Historical Material & Archives

* **Historical Audits:** Retained under [`audits/archive/`](./audits/archive/README.md) for verification provenance and audit trail.
* **Completed Implementation Plans:** Moved to [`plans/completed/`](./plans/README.md) upon full verification.
* **Archived Proposals:** Preserved in [`proposals/archive/`](./proposals/README.md).
