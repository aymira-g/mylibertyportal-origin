# Accepted Architectural & Business Decisions

> **Authority Level:** Binding Technical & Operational Policies (`decisions/`)  
> Documents in this directory record accepted, binding architectural, operational, and technical policies.

## Authority Relationship

Decisions must align with the **Authoritative Governance Blueprint** ([`docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md`](../governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md)):
- The blueprint defines **WHAT is true** for the organization, roles, authority boundaries, and separation of duties.
- Decisions record **binding technical and operational policies** implementing that model.
- Decisions must not silently contradict the authoritative blueprint.
- When a decision conflicts with the blueprint, the historical decision is **preserved rather than deleted**, and conflicting portions are marked as superseded with reference to the blueprint.

## Purpose

When a proposal, RFC, or audit leads to a formal agreement on policy or architecture, the enduring decision is documented here.

A decision document defines:
- The selected policy and canonical standards.
- Important exceptions and boundary rules.
- What is explicitly forbidden.
- Relationship to current implementation and remediation plans.

## Active Decisions

| Document | Topic | Accepted Date | Status |
|---|---|---|---|
| [`2026-09-24-multi-branch-data-isolation.md`](./2026-09-24-multi-branch-data-isolation.md) | Multi-Branch Data Isolation (`branchId` scoping across Firestore & Maker-Checker) | 2026-09-24 | Active *(Provisional executive representation by technical `admin` is superseded by Blueprint v3)* |
| [`2026-10-04-executive-account-migration-bootstrap-runbook.md`](./2026-10-04-executive-account-migration-bootstrap-runbook.md) | Executive Account Migration & Bootstrapping (Director & Vice Director setup) | 2026-10-04 | Active |
| [`2026-10-04-executive-break-glass-procedure.md`](./2026-10-04-executive-break-glass-procedure.md) | Executive Deadlock Break-Glass Procedure (Console-level recovery) | 2026-10-04 | Active |
| [`2026-10-05-delegation-of-discounts-and-refunds-to-executives.md`](./2026-10-05-delegation-of-discounts-and-refunds-to-executives.md) | Exclusive Executive Authority for Tuition Discounts, Fee Waivers, and Refunds | 2026-10-05 | Active |

## Lifecycle Rule

Proposals under `docs/proposals/` do not represent binding policy until an accepted decision is recorded here. Once accepted, implementations and tests must align with these decisions and remain consistent with the Authoritative Governance Blueprint.

