# MyLiberty Portal — Documentation Index

Welcome to the central documentation directory for **MyLiberty Portal**.

This directory is organized by document purpose in accordance with the guidelines in [`README.md`](../README.md) and [`AGENTS.md`](../AGENTS.md):

```text
docs/
├── ARCHITECTURE.md    # Protected canonical architecture guide
├── README.md          # Central documentation index (this file)
├── audits/            # Audit procedures, security reviews, and verification logs
├── proposals/         # Architectural proposals, option analyses, and roadmaps
└── plans/             # Feature, modernization, and operational implementation plans
```

---

## 📚 Table of Contents

### 1. Architecture & Core Guidelines
* **[`ARCHITECTURE.md`](./ARCHITECTURE.md)**
  * Protected, canonical application architecture specification.
  * Domain boundaries under `src/features/` (`auth`, `students`, `attendance`, `classes`, `finance`, `staff`, `reports`, `shared`, `dashboard`).
  * Public barrel rules (`src/features/*/index.js`) and repository patterns (`*Repository.js`).
  * Firestore data growth classes (Class A unbounded, Class B slowly growing, Class C bounded).
  * Protected infrastructure rules and safe refactoring protocol.

---

### 2. Audits & Scalability Assessments (`docs/audits/`)
Procedures, diagnostic checklists, and historical system review findings:

* **[`audits/FULL_ARCHITECTURE_AUDIT.md`](./audits/FULL_ARCHITECTURE_AUDIT.md)** — Canonical full-system architecture and scalability audit procedure (protected).
* **[`audits/2026-09-25-full-architecture-audit.md`](./audits/2026-09-25-full-architecture-audit.md)** — Comprehensive architecture, security, and scalability audit report (Sept 25, 2026).
* **[`audits/2026-09-25-audit-implementation-walkthrough.md`](./audits/2026-09-25-audit-implementation-walkthrough.md)** — Walkthrough and verification of implemented audit remediations.
* **[`audits/2026-09-25-kiosk-security-audit-revision.md`](./audits/2026-09-25-kiosk-security-audit-revision.md)** — Audit revision and security corrections for kiosk clock-in and device anchoring.
* **[`audits/2026-09-24-front-office-local-audit.md`](./audits/2026-09-24-front-office-local-audit.md)** — Front Office operational audit report (cashier, walk-in inquiries, tuition tracking).
* **[`audits/2026-09-24-maker-checker-operational-audit.md`](./audits/2026-09-24-maker-checker-operational-audit.md)** — Maker-Checker governance and dual-control approval audit report.
* **[`audits/2026-09-24-system-audit-safety-net.md`](./audits/2026-09-24-system-audit-safety-net.md)** — System audit, safety nets, and error handling verification.
* **[`audits/2026-09-24-audit-revision-v2.md`](./audits/2026-09-24-audit-revision-v2.md)** — Multi-branch and shift audit revision report.
* **[`audits/architecture-and-performance-audit.md`](./audits/architecture-and-performance-audit.md)** — Architectural health, query boundaries, and performance baseline audit.
* **[`audits/qodo-findings-remediation.md`](./audits/qodo-findings-remediation.md)** — Automated code quality and security findings remediation review.

---

### 3. Proposals & Roadmaps (`docs/proposals/`)
Forward-looking architecture proposals, option analyses, and strategic roadmaps:

* **[`proposals/2026-09-23-front-office-operations-enhancement.md`](./proposals/2026-09-23-front-office-operations-enhancement.md)** — Front office operations enhancement proposal (cashier, reconciliation, walk-ins).
* **[`proposals/2026-09-24-multi-branch-data-isolation.md`](./proposals/2026-09-24-multi-branch-data-isolation.md)** — Multi-branch data isolation and maker-checker dual-control governance proposal.
* **[`proposals/2026-09-25-kiosk-clock-in-audit-comparison.md`](./proposals/2026-09-25-kiosk-clock-in-audit-comparison.md)** — Decision options analysis for instructor kiosk clock-in security hardening.
* **[`proposals/2026-09-25-kiosk-clock-in-security-hardening.md`](./proposals/2026-09-25-kiosk-clock-in-security-hardening.md)** — Canonical executor specification for action-bound kiosk clock-in security hardening (v1.2).
* **[`proposals/myliberty-available-batches-roadmap.md`](./proposals/myliberty-available-batches-roadmap.md)** — Strategic product roadmap for available batches, scheduling, and capacity planning.

---

### 4. Implementation Plans (`docs/plans/`)
Detailed execution specs for features, workflows, data models, and modernizations:

#### Attendance, Shifts & Kiosk Operations
* **[`plans/attendance-module-v4-myliberty-integration-spec.md`](./plans/attendance-module-v4-myliberty-integration-spec.md)** — Comprehensive attendance domain integration spec (shifts, classes, kiosk, offline sync).
* **[`plans/corporate-event-attendance-plan.md`](./plans/corporate-event-attendance-plan.md)** — Implementation plan for corporate event attendance tracking and staff presence logging.
* **[`plans/private-toefl-vs-corporate-event-clock-in-plan.md`](./plans/private-toefl-vs-corporate-event-clock-in-plan.md)** — Plan for resolving private batch / TOEFL instructor vs corporate event kiosk clock-in options.

#### Students, Parents & Rosters
* **[`plans/myliberty-parent-student-roster-data-model.md`](./plans/myliberty-parent-student-roster-data-model.md)** — Canonical data model spec for parent accounts, student entities, class roster, and UI separation.

#### Marketing & School Outreach
* **[`plans/gorontalo-school-outreach-plan.md`](./plans/gorontalo-school-outreach-plan.md)** — Canonical audited implementation plan for Kota Gorontalo school visits map & outreach tracking.
* **[`plans/outreach-manager-marketing-remediation-plan.md`](./plans/outreach-manager-marketing-remediation-plan.md)** — Repo-verified remediation plan for manager & marketing outreach module (branch isolation, collection groups).

#### Scalability, Governance & Platform Engineering
* **[`plans/spark-scale-and-log-retention-plan.md`](./plans/spark-scale-and-log-retention-plan.md)** — Plan for Spark free tier optimization (1,000 students / 200 staff) and 38-day log retention.
* **[`plans/large-file-splitting-plan.md`](./plans/large-file-splitting-plan.md)** — Safe modularization and file-splitting plan for oversized dashboard and reporting components.
* **[`plans/operational-audit-execution-plan.md`](./plans/operational-audit-execution-plan.md)** — Operational audit execution plan and status matrix.
* **[`plans/myliberty-audit-log.md`](./plans/myliberty-audit-log.md)** — Operational audit logging specifications and system event tracking.
* **[`plans/myliberty-revision-brief.md`](./plans/myliberty-revision-brief.md)** — Consolidated execution brief and revision requirements.
* **[`plans/hybrid-quick-switch-user-spec.md`](./plans/hybrid-quick-switch-user-spec.md)** — Dev quick switcher user spec and multi-mode authentication testing.

---

## 🤖 Guide for Developers & AI Agents

When working on this codebase:
1. **Start with [`README.md`](../README.md) and [`AGENTS.md`](../AGENTS.md)** for developer instructions, safety rules, and coding standards.
2. **Consult [`ARCHITECTURE.md`](./ARCHITECTURE.md)** before modifying architecture, directory structures, data models, or cross-domain boundaries.
3. **Follow the Documentation Schema**:
   - Audit findings and checklists belong in `docs/audits/`.
   - Architectural proposals belong in `docs/proposals/`.
   - Implementation plans belong in `docs/plans/`.
   - Keep `docs/` root clean (containing only `ARCHITECTURE.md` and this `README.md`).
4. **Update documentation**: When an approved change alters implementation plans or architecture, update the corresponding document and reflect changes in this index.
