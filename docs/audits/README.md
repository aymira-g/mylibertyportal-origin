# Audits & Verification Baseline

> **Authority Level:** Diagnostic / Verification (`audits/`)  
> This directory contains the system audit procedure, running audit logs, current verification baselines, and historical audit records.

## Structure

```text
docs/audits/
├── FULL_ARCHITECTURE_AUDIT.md       ← Canonical deep audit procedure (referenced by AGENTS.md)
├── audit-log.md                     ← Running operational and product audit log
├── current/                         ← Current verification baseline & active findings
│   ├── 2026-09-27-reconciled-full-audit.md
│   ├── 2026-09-27-claude-audit-broader-findings.md
│   └── 2026-09-27-claude-audit-continuation.md
└── archive/                         ← Historical audit results & previous remediation passes
```

## Permanent Documents

1. **[`FULL_ARCHITECTURE_AUDIT.md`](./FULL_ARCHITECTURE_AUDIT.md)**  
   The authoritative full system architecture & scalability audit procedure. This document defines how to challenge, test, and verify the architecture against drift. Governed under the core authority chain in `AGENTS.md`.

2. **[`audit-log.md`](./audit-log.md)**  
   Running chronological record of operational items, owner decisions, and status flags across development sessions.

## Current Audit Baseline (`audits/current/`)

For the latest confirmed findings, verification evidence, and baseline gaps, consult [`audits/current/`](./current/README.md).

- **Primary Consolidated Baseline:** [`current/2026-09-27-reconciled-full-audit.md`](./current/2026-09-27-reconciled-full-audit.md)
- **Supporting Broader Findings:** [`current/2026-09-27-claude-audit-broader-findings.md`](./current/2026-09-27-claude-audit-broader-findings.md)
- **Supporting Continuation Log:** [`current/2026-09-27-claude-audit-continuation.md`](./current/2026-09-27-claude-audit-continuation.md)

## Historical Audits (`audits/archive/`)

Older audit reports and previous remediation walkthroughs are retained in [`audits/archive/`](./archive/README.md) to preserve verification history and audit trails.
