# MyLiberty Portal — Role & Business Logic Conformance Audit (BLRCA)

> **NOTICE — DOCUMENTATION ARCHITECTURE REFACTOR & COMPATIBILITY POINTER**  
>
> **Status:** RATIFIED CAMPAIGN PROCEDURE (Approved by Owner Kifry, 2026-10-15)  
> **Refactor Date:** 2026-10-16  
> **Notice:** This procedure has been refactored into a modular, multi-file Level 2 audit framework following the documentation architecture of [`docs/audits/Comprehensive Hidden-Bug Audit Strategy/`](../Comprehensive%20Hidden-Bug%20Audit%20Strategy/00-README.md).
>
> All substantive requirements, contracts, execution phases, risk tiers, and historical evidence have been preserved and organized across eight numbered procedure files.
>
> This file is maintained as a **backward-compatibility pointer** to preserve existing links in [`docs/audits/audit-log.md`](../audit-log.md), [`docs/audits/current/bug-ledger.md`](../current/bug-ledger.md), [`docs/audits/current/regression-log.md`](../current/regression-log.md), and active remediation plans.

---

## Canonical Framework Entry Point

Please refer to the new modular framework starting at:

👉 **[`00-README.md`](./00-README.md) — MyLiberty Portal BLRCA Framework**

---

## Modular Framework Navigation

| File | Title | Scope |
|---|---|---|
| **[`00-README.md`](./00-README.md)** | Purpose & Operating Model | Purpose, authority hierarchy, framework index, active campaign status, and Appendix A flow. |
| **[`01-governance-and-role-contracts.md`](./01-governance-and-role-contracts.md)** | Establishing Approved Role Contracts | Deriving expected contracts, canonical roles vs. aliases, and tracking open owner decisions. |
| **[`02-feature-discovery-and-coverage.md`](./02-feature-discovery-and-coverage.md)** | Feature Discovery & Coverage | Mapping complete feature surfaces, routes, components, actions, queries, and integrations. |
| **[`03-technical-audit-method.md`](./03-technical-audit-method.md)** | Technical Audit Method | End-to-end tracing method, six dimensions, session cache leaks, fail-closed presentation, and preserved worked example. |
| **[`04-risk-tiers-and-test-matrix.md`](./04-risk-tiers-and-test-matrix.md)** | Risk Tiers & Test Matrix | Tier 1 (high-risk), Tier 2 (operational), Tier 3 (informational); four mandatory test types; financial decisions integration. |
| **[`05-campaign-execution-and-coverage.md`](./05-campaign-execution-and-coverage.md)** | Campaign Execution & Coverage | Execution phases 0–6, slice sequence (Slices 1–5+), working ledger schema, and completion criteria. |
| **[`06-findings-and-closure.md`](./06-findings-and-closure.md)** | Findings, Evidence & Closure | Atomic outcomes, finding categories, severity standards, register integration, and closure rules. |
| **[`07-agent-instructions.md`](./07-agent-instructions.md)** | Auditor Operating Contract | Operating contract for coding assistants: audit-only boundaries, safety rules, and stop protocols. |
