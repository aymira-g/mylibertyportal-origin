# 05 — Quality, Debt & Architecture Evolution

Covers **Section 14 (Testing Audit)**, **Section 16 (Dependency / Technical-Debt Audit)**, and **Section 17 (Architecture Evolution Test)**.

---

# 14. Testing Audit

Do not simply count test files. Determine whether critical application behavior is meaningfully protected.

### Look For Missing Tests Around:
- authorization and permission boundaries;
- repository query logic and error mapping;
- Zod schema validation and malformed-input rejection;
- state transitions and status lifecycles;
- concurrency, double-submits, and race handling;
- historical and date-windowed queries;
- dashboard aggregations and financial calculations;
- outreach visit tracking;
- network error and retry failure cases;
- empty, missing, or legacy data documents;
- data retention and archival logic;
- deployment-sensitive configuration flags.

### Identify Shallow Tests:
Flag tests that pass while the business feature is still logically broken (e.g. tests asserting only that a component renders without verifying user actions, side effects, or persistence contracts).

---

# 16. Dependency / Technical-Debt Audit

Review package health and codebase hygiene:

- obsolete or deprecated npm packages;
- unnecessary external dependencies where a lightweight built-in suffices;
- duplicate capabilities (e.g. multiple date libraries or duplicate modal handlers);
- dead code, orphaned files, and unreferenced functions;
- unused modules or obsolete mock files;
- inconsistent patterns left behind from different historical refactorings;
- custom implementations that reinvent existing shared repository utilities;
- upgrade and security advisory risks (`npm audit`).

*Rule on upgrades:* Do not recommend upgrades merely because a package version is older. Flag dependencies only when they introduce measurable **security**, **compatibility**, **maintenance**, or **performance** risks.

---

# 17. Architecture Evolution Test

Stress-test the architecture against hypothetical future scale:

### 10× Scale Test:
> **“If this application grew by 10× in active users and data volume, which subsystem breaks first?”**

### 100× Scale Test:
> **“If it grew by 100×, which fundamental architectural assumption becomes invalid?”**

### Findings Categorization:
Separate all architectural findings into four clear operational buckets:

1. **Must fix now** — flaws that present active risk of data loss, security failure, or quota exhaustion at current scale.
2. **Fix before significant growth** — designs that work for 50 users but will fail or become expensive at 500 users.
3. **Monitor** — components where metrics or usage logs should be tracked over time.
4. **Acceptable technical debt** — imperfect patterns that are stable, cheap, and do not justify the risk of unnecessary refactoring.
