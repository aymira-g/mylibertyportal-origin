# Audits & Verification Baseline

> **Authority Level:** Diagnostic / Verification (`audits/`)  
> This directory contains the system audit procedure, running audit logs, current verification baselines, and historical audit records.  
> **Key Principle:** Audits identify discrepancies between the approved model (governed by the [Authoritative Governance Blueprint](../governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md) and [System Architecture](../ARCHITECTURE.md)) and the current implementation. An audit finding provides diagnostic evidence, but does not silently or automatically become a governance rule or policy without an explicit, approved decision.

## Structure

```text
docs/audits/
├── Full System Architecture & Scalability Audit Procedure/  ← Modular deep architecture & drift audit (Level 3)
├── Comprehensive Hidden-Bug Audit Strategy/                ← Modular functional edge-case & QA strategy (Level 2)
├── Light Regression Check Playbook/                        ← Modular fast post-change regression checks (Level 1)
├── audit-log.md                                            ← Running operational and product audit log
├── current/                                                ← Current verification baseline & active findings
│   ├── 2026-09-27-reconciled-full-audit.md
│   ├── 2026-09-27-claude-audit-broader-findings.md
│   └── 2026-09-27-claude-audit-continuation.md
└── archive/                                                ← Historical audit results & previous passes
```

## Permanent Audit Procedures

1. **[`Full System Architecture & Scalability Audit Procedure/`](./Full%20System%20Architecture%20&%20Scalability%20Audit%20Procedure/00-README.md)**  
   The authoritative full system architecture & scalability audit procedure (modularized into 7 categorized files). Defines how to challenge, test, and verify the architecture against drift, database growth, and high traffic (Level 3 Audit). Governed under the core authority chain in `AGENTS.md`.

2. **[`Comprehensive Hidden-Bug Audit Strategy/`](./Comprehensive%20Hidden-Bug%20Audit%20Strategy/00-README.md)**  
   The operational functional QA and hidden-defect audit strategy (7 categorized files). Defines how to trace business workflows through 5 passes, edge-case triggers, and runtime verification (Level 2 Deep Audit).

3. **[`Light Regression Check Playbook/`](./Light%20Regression%20Check%20Playbook/00-README.md)**  
   The fast, targeted post-change regression check playbook (7 categorized files). Provides the 5-minute core check, domain recipes (kiosk, payments, rules, etc.), and coding-agent handoff templates for daily development (Level 1 Targeted Regression).

4. **[`audit-log.md`](./audit-log.md)**  
   Running chronological record of operational items, owner decisions, and status flags across development sessions.

## Current Audit Baseline (`audits/current/`)

For the upcoming refinement cycle, active baseline findings will be recorded in [`audits/current/`](./current/README.md).

Past baseline reports from prior development cycles have been archived to [`audits/archive/`](./archive/README.md):
- **Primary Consolidated Baseline:** [`archive/2026-09-27-reconciled-full-audit.md`](./archive/2026-09-27-reconciled-full-audit.md)
- **Supporting Broader Findings:** [`archive/2026-09-27-claude-audit-broader-findings.md`](./archive/2026-09-27-claude-audit-broader-findings.md)
- **Supporting Continuation Log:** [`archive/2026-09-27-claude-audit-continuation.md`](./archive/2026-09-27-claude-audit-continuation.md)

## Historical Audits (`audits/archive/`)

Older audit reports and previous remediation walkthroughs are retained in [`audits/archive/`](./archive/README.md) to preserve verification history and audit trails.
