# 03 — Data Model & Firestore Scalability

Covers **Section 6 (Data Model / Schema Audit)**, **Section 7 (Firestore Scalability Audit)**, **Section 8 (Heavy-Traffic Audit)**, and **Section 9 (Concurrency / Race-Condition Audit)**.

---

# 6. Data Model / Schema Audit

For each important Firestore collection and document type, determine:

- **purpose** and business domain;
- **ownership** (which feature or service is the sole author);
- **required fields** vs optional fields;
- **related entities** and foreign keys;
- **ID generation strategy** (deterministic date/composite vs random UUID vs Firestore auto-id);
- **timestamps** and audit fields;
- **read and write patterns** (read-heavy, append-only, high-write);
- **query patterns** and index coverage;
- **expected growth** and data retention rules.

### Look For:
- **unbounded arrays** — documents containing growing lists (e.g. attendance records or notes stored inside a student document);
- **indefinitely growing documents** — documents that will eventually hit the 1 MB Firestore document limit;
- **hot documents** — single documents written by multiple concurrent users (e.g. global counters, daily rollups without sharding);
- **write contention** — frequent concurrent updates to the same document causing transaction retries;
- **fan-out writes** — one user action triggering multiple writes that could partially fail;
- **unnecessary denormalization** — duplicated fields without reliable synchronization rules;
- **insufficient denormalization** — requiring massive client-side joins to display a simple list;
- **current state mixed with unbounded history** — placing historic audit events in the same document as live operational status;
- **orphanable references** — soft deletes or missing cascade handlers;
- **stale derived values** — cached summaries that never refresh after raw record changes.

---

# 7. Firestore Scalability Audit

For important queries and listeners, determine:

- expected document reads per invocation;
- result-set size;
- query frequency;
- listener scope (`onSnapshot` across an entire collection vs scoped by branch/date);
- repeated reads and missing client-side caches;
- pagination and limits (explicit `.limit()` presence);
- date windows (bounded history);
- index requirements;
- transactions and batching;
- retry behavior.

### Pay Special Attention To:
- dashboard-wide listeners;
- historical collections;
- collection-group queries;
- manager reporting;
- real-time operational dashboards;
- **anything that reads an entire collection**.

### Scale Modeling
Evaluate how query and write behavior changes at:

```text
10 users
100 users
1,000 users
10,000 users
```

*Note on limits:* Do not invent exact Firebase limits or prices. When current platform limits/pricing are required, mark the issue:
> **UNVERIFIED — requires confirmation against current Firebase documentation/usage data.**

---

# 8. Heavy-Traffic Audit

Model at least these four operational scenarios:

## Scenario A — Normal
Ordinary school day usage.

## Scenario B — Busy
Multiple staff members simultaneously:
- logging attendance;
- logging outreach visits;
- updating tasks;
- viewing dashboards;
- searching data.

## Scenario C — Peak
A concentrated burst of reads and writes (e.g. 50 students scanning into a corporate event within 5 minutes, or month-end payment reconciliations).

## Scenario D — Growth
The dataset becomes substantially larger (10× to 100× records) while the application architecture remains mostly unchanged.

### For Every Scenario, Identify:
- the primary bottleneck;
- the failure mechanism;
- likely user-facing symptom;
- whether degradation is graceful or catastrophic;
- whether Firestore reads grow acceptably or linearly/super-linearly;
- whether realtime listeners amplify reads under concurrent mutations;
- whether a hot document appears;
- whether the frontend remains usable and responsive.

*Never write only: "This may become slow." Explain specifically why.*

---

# 9. Concurrency / Race-Condition Audit

Inspect workflows with concurrent or sequential state:

- counters and sequence numbers;
- status transitions (e.g. pending → approved);
- assignment changes (e.g. teacher reassignment);
- attendance scans and clock-in/out shifts;
- visit logging;
- shared documents;
- aggregates and totals;
- last-write-wins behavior;
- optimistic UI updates;
- double submissions.

### Look For:
- **lost updates** — two users reading state A, one writing B and the second overwriting with C, losing B's edits;
- **duplicate writes** — rapid double-tapping creating twin records;
- **stale writes overwriting newer state** — delayed network responses arriving out of order;
- **inconsistent summaries** — parent document count out of sync with child subcollections;
- **race conditions between UI and server** — UI assuming success before server validation commits.

*Identify where Firestore transactions, batched writes, or server-side Worker logic are required to enforce atomicity.*
