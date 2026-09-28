# 01 — Audit Principles & Architecture Drift

Covers **Section 1 (Audit Principles)**, **Section 2 (Architecture Drift Audit)**, and **Section 3 (Architecture Integrity Audit)**.

---

# 1. Audit Principles

## Read the whole system before judging it

Inspect the repository broadly enough to understand:

- frontend structure;
- routing;
- authentication;
- authorization;
- Firestore collections and document relationships;
- repositories/data access;
- schemas/validation;
- shared infrastructure;
- hooks/state;
- dashboards;
- Workers/Cloud Functions if present;
- Firebase configuration;
- Firestore rules;
- Firestore indexes;
- environment/configuration;
- tests;
- build tooling;
- PWA/service worker behavior;
- logging;
- retention mechanisms;
- deployment paths.

Follow important flows end-to-end:

```text
user action
  ↓
UI
  ↓
state/hook
  ↓
validation
  ↓
repository/data-access
  ↓
Firestore/API/Worker
  ↓
response/subscription
  ↓
UI state
```

Identify where assumptions, validation, authorization, concurrency handling, or error handling disappear.

---

# 2. Architecture Drift Audit

This is mandatory.

Compare:

### A. Declared architecture
What `docs/ARCHITECTURE.md` says the system is.

### B. Implemented architecture
What the source code actually does.

### C. Runtime/configuration architecture
What deployment/configuration/test setup implies.

### Reporting Drift
Report findings under these categories:

- **Documented and accurate** — implementation strictly matches documentation.
- **Documented but stale** — documentation describes historical patterns no longer present.
- **Implemented but undocumented** — features, collections, or patterns exist in code but are missing from `docs/ARCHITECTURE.md`.
- **Contradictory** — documentation and code give opposing rules or expectations.
- **Unverified — requires runtime/load/production verification** — claims that cannot be proven purely from static repository inspection.

### Examples of Drift to Look For
- Architecture says all Firestore access is in repositories, but components bypass them.
- Architecture says a legacy directory is unused, but current imports still reference it.
- A new feature/domain exists but is absent from architecture documentation.
- Manager/reporting workflows depend on data contracts not described in the guide.
- Security rules changed but the architecture guide still describes older role semantics.

**Do not silently reconcile these differences.**

---

# 3. Architecture Integrity Audit

Determine whether the architecture is internally coherent.

### Look For:
- duplicated business logic;
- UI components containing persistence logic that should be centralized;
- repositories bypassed by new direct Firestore access;
- duplicated schemas;
- multiple sources of truth;
- derived state stored unnecessarily;
- state synchronization assumptions;
- circular dependencies;
- hidden coupling;
- undocumented side effects;
- role dashboards duplicating business logic;
- shared utilities that have become hidden domain owners;
- abstractions that are declared but not respected.

### Finding Format for Architecture Integrity
For every significant finding:

```text
Assumption
→ Actual behavior
→ Failure mode
→ Impact
→ Recommendation
```
