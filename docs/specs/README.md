# Subsystem Technical Specifications

> **Authority Level:** High (`specs/`)  
> Documents in this directory define intended behavior, data contracts, and integration models for specific subsystems.

## Purpose

Specifications define:
> *"How is this subsystem intended to behave?"*

Unlike general proposals or transient plans, specifications represent stable behavioral contracts and system interfaces.

## Subsystems & Documents

### 1. Attendance (`specs/attendance/`)
- [`attendance-module-v4-myliberty-integration-spec.md`](./attendance/attendance-module-v4-myliberty-integration-spec.md) — Comprehensive technical contract for the Attendance Module v4 integration with MyLiberty Portal.

### 2. Parent & Student (`specs/parent/`)
- [`myliberty-parent-student-roster-data-model.md`](./parent/myliberty-parent-student-roster-data-model.md) — Data model, schema contracts, and relationships between parents, students, classes, and roster entries.

### 3. Developer Tools (`specs/dev-tools/`)
- [`hybrid-quick-switch-user-spec.md`](./dev-tools/hybrid-quick-switch-user-spec.md) — Dual-mode user and role switcher specification (Live Firebase Auth switch vs instant in-memory UI preview).
