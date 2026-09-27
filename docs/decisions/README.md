# Accepted Architectural & Business Decisions

> **Authority Level:** High (`decisions/`)  
> Documents in this directory record accepted, binding architectural and operational policies.

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
| [`2026-09-24-multi-branch-data-isolation.md`](./2026-09-24-multi-branch-data-isolation.md) | Multi-Branch Data Isolation (`branchId` scoping across Firestore & Maker-Checker) | 2026-09-24 | Active |

## Lifecycle Rule

Proposals under `docs/proposals/` do not represent binding policy until an accepted decision is recorded here. Once accepted, implementations and tests must align with these decisions.
