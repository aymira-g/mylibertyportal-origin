# Subsystem Technical Specifications

> **Authority Level:** Technical Contracts (`specs/`)  
> Documents in this directory define intended behavior, data contracts, and integration models for specific subsystems.  
> Technical specifications implement the approved organizational model defined in the [Authoritative Governance Blueprint](../governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md).

## Purpose

Specifications define:
> *"How is this subsystem intended to behave?"*

Unlike general proposals or transient plans, specifications represent stable behavioral contracts and system interfaces.

## Subsystems & Documents

### 1. Authorization & Access Scope (`specs/`)
- [`authorization-contract.md`](./authorization-contract.md) — Technical Role × Branch × Division contract enforced across Firestore rules, repositories, and schemas.

### 2. Attendance (`specs/attendance/`)
- [`attendance-module-v4-myliberty-integration-spec.md`](./attendance/attendance-module-v4-myliberty-integration-spec.md) — Comprehensive technical contract for the Attendance Module v4 integration with MyLiberty Portal.

### 3. Parent & Student (`specs/parent/`)
- [`myliberty-parent-student-roster-data-model.md`](./parent/myliberty-parent-student-roster-data-model.md) — Data model, schema contracts, and relationships between parents, students, classes, and roster entries.
- [`myliberty-parent-student-link-fix.md`](./parent/myliberty-parent-student-link-fix.md) — Specification and data migration contract for parent-to-student account linking and verification.

### 4. Developer Tools (`specs/dev-tools/`)
- [`hybrid-quick-switch-user-spec.md`](./dev-tools/hybrid-quick-switch-user-spec.md) — Dual-mode user and role switcher specification (Live Firebase Auth switch vs instant in-memory UI preview).

### 5. UI & Design System (`specs/`)
- [`shared-design-language.md`](./shared-design-language.md) — Shared visual standards, color tokens, button hierarchies, and responsive layout guidelines.

