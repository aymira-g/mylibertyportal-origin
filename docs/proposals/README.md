# Proposals & Design RFCs

> **Authority Level:** Under Consideration (`proposals/`)  
> Documents in this directory describe proposed designs, feature ideas, and architectural changes that have **not yet been formally accepted**.

## Purpose

A proposal defines:
> *"Here is a problem, analysis, and proposed solution under consideration."*

Proposals do **not** represent approved system policy or binding design until formally accepted and recorded under `docs/decisions/`.

## Active Proposals

- [`2026-10-17-admin-dashboard-reports-tab-replacement.md`](./2026-10-17-admin-dashboard-reports-tab-replacement.md): Dashboard Implementation Proposal: Admin Dashboard Tab Composition & Reports Tab Disposition (Option A vs Option B)
- [`2026-10-17-legacy-progress-reports-division-backfill.md`](./2026-10-17-legacy-progress-reports-division-backfill.md): Data Migration Proposal: Legacy Progress Reports Division Attribute Backfill (Cost & Spark Safety Scoping)
- [`2026-10-18-instructor-leader-tab9-role-fit-and-cleanup.md`](./2026-10-18-instructor-leader-tab9-role-fit-and-cleanup.md): Architectural Disposition: Instructor Leader Tab 9 (Reports) Role Fit & Hardening
- [`2026-10-18-instructor-leader-province-wide-academic-monitoring-scope.md`](./2026-10-18-instructor-leader-province-wide-academic-monitoring-scope.md): Decision Brief & Policy Evaluation: Instructor Leader Academic Monitoring Scope
- [`2026-10-18-instructor-leader-province-wide-monitoring-feasibility.md`](./2026-10-18-instructor-leader-province-wide-monitoring-feasibility.md): Feasibility Design: Province-Wide Academic Monitoring (no implementation architecture selected)

---

## Decision Brief Quality Gate

Before delivering a proposal involving governance, role scope, security, privacy, or data access:

1. **Build an evidence map.** For each material claim, identify its source and classify it as:
   - authoritative policy;
   - accepted owner decision;
   - current code or rule behavior;
   - inference or recommendation;
   - unresolved owner decision.

   Do not present an inference or current implementation behavior as approved policy.

2. **Reconcile sources before drawing conclusions.** Check the current Authoritative Blueprint, applicable accepted decisions, relevant specifications, live code, Firestore rules, indexes, and tests. Explain whether apparent conflicts are real conflicts or describe different layers (for example, role responsibility versus collection-level read permission).

3. **Validate each technical option against its actual enforcement boundary.** For data-access proposals, check:
   - what the user interface displays;
   - what the client actually receives;
   - what a user can request directly under the security rules;
   - query and aggregation semantics, including whether results are sampled, complete, grouped, or distinct;
   - indexes, legacy records, read costs, and quota effects.

   Do not call a UI filter, client-side projection, or aggregate query a security boundary unless the backend rules enforce that boundary.

4. **Do not invent policy thresholds or sufficiency claims.** Labels, score bands, time windows, minimum group sizes, and claims that existing workflows are “adequate” require an authoritative source or must be clearly marked as proposed choices for the owner.

5. **Red-team the recommendation before delivery.** Look for contradictory sections, unsupported certainty, hidden dependencies, privacy inference risks, and options that cannot meet their stated goal. If a key feasibility question is unresolved, label the option conditional rather than validated.

6. **Keep the approval boundary explicit.** A proposal may recommend an option, but it must remain noncanonical and must not change governance records, authorization contracts, production code, or security rules until the owner explicitly approves the relevant decision.

7. **Report remaining uncertainty plainly.** Cite the exact files and sections checked, list material assumptions and evidence gaps, and say what must be decided or verified before implementation.

---

## Archived Proposals (`proposals/archive/`)

Past design proposals and RFCs have been archived to [`proposals/archive/`](./archive/):
- `2026-09-23-front-office-operations-enhancement.md`
- `2026-09-24-multi-branch-data-isolation.md` (Accepted into `docs/decisions/`)
- `2026-09-25-kiosk-clock-in-audit-comparison.md`
- `2026-09-25-kiosk-clock-in-security-hardening.md`
- `myliberty-available-batches-roadmap.md`


