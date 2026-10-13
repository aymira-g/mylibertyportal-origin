# MyLiberty Authoritative Blueprint v3

**Baseline Version:** 3.4  
**Status:** RATIFIED AUTHORITATIVE BASELINE — APPROVED BY OWNER (KIFRY)  
**Date:** 2026-10-13  

> **CANONICAL POINTER** — This file is a root pointer to the canonical Authoritative Governance Blueprint. All reference and maintenance must be conducted in [`docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md`](./docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md).

The active canonical blueprint lives at:
👉 **[`docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md`](./docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md)**

---

## Authority & Governance Role

- **What it governs:** Organizational identity, structure, roles, responsibilities, authority boundaries, governance principles, approval / separation-of-duties principles, and organizational data scope.
- **What it does not govern:** Technical implementation details, database collections/fields, UI component layouts, or framework choice.
- **Technical Architecture:** [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) defines HOW the software implements the approved organizational model.
- **Accepted Decisions:** [`docs/decisions/README.md`](./docs/decisions/README.md) records accepted business and architectural policies.
- **Agent Instructions:** [`AGENTS.md`](./AGENTS.md) defines coding assistant behavior.

## Core Baseline Invariants (v3.1 – v3.4)

1. **Executive Dual-Control Model (v3.3 §0, §5.4, Principles 15 & 16):** Director holds Strategic Control (direction, provincial performance, major decisions); Vice Director holds Operational Control (execution, coordination, multi-branch oversight, exception follow-up). Broad executive visibility does not imply execution or write authority.
2. **Absence of Branch Manager (v3.1 §0, §5.5):** Branch Manager / Branch Head is removed from the organizational model. Physical branch is an organizational boundary and data scope (`branchId`), not a managerial authority.
3. **Branch-Scope Leadership Functions (v3.1 §5):** Four distinct peer leadership functions exist at branch scope: Course Division Manager, Kindergarten Division Manager, Operational Leader, and Instructor Leader.
4. **Branch Typology & Lean Operating Model (v3.4 §4, §5, G-012):** Main Campus (Kota Gorontalo) maintains dual divisions and full leadership. Satellite branches (Bone Bolango, Limboto, Pohuwato) are lean single-division campuses (Courses only) staffed by Course Division Manager, Front Office, and Instructors. Central Instructor Leader holds province-wide academic scope across all branches.
5. **Separation of System Admin (§7):** Technical system maintenance only; does not inherit business authority or bypass approval workflows.
6. **Maker-Checker Dual-Control (§14–16):** Sensitive and financial actions require independent human verification; self-approval is strictly blocked.
