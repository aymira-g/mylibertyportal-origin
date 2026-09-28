# 04 — Security, Resilience & Infrastructure

Covers **Section 10 (Security / Authorization Audit)**, **Section 11 (Failure / Recovery Audit)**, **Section 12 (Performance Audit)**, **Section 13 (Observability Audit)**, and **Section 15 (Deployment / Operations Audit)**.

---

# 10. Security / Authorization Audit

Audit all layers of access control:

- Firebase Authentication;
- client-side route guards;
- UI role checks;
- Firestore security rules;
- repository data access constraints;
- document-level ownership;
- manager/admin boundary exceptions;
- direct Firestore access bypassing business logic.

### Assume the Client is Malicious
Always ask:
> **“Can a user bypass this UI and call Firestore directly with modified parameters?”**

If yes, determine whether Firestore rules still prevent unauthorized actions.

### Client-Provided Values Under Scrutiny:
Pay particular attention to client-provided:
- `role` (custom claims vs Firestore document vs client state);
- `userId` / `employeeId`;
- `branchId` (cross-branch data leakage);
- `manager` / `admin` boolean flags;
- authoritative business timestamps;
- financial amounts or discount rates.

*Also check for overbroad reads where a query technically retrieves more fields or documents than the UI displays.*

---

# 11. Failure / Recovery Audit

Determine system behavior under failure conditions:

- Firestore is temporarily unavailable or network drops;
- a write fails validation or permission checks;
- a realtime `onSnapshot` listener disconnects and reconnects;
- a write succeeds on the server, but the UI thinks it failed (network timeout on response);
- UI assumes a write succeeded, but the server rejected it;
- the browser tab or app closes mid-operation;
- user session or authentication token expires during an edit;
- permissions change while the user is actively working;
- a document is malformed or unparseable by Zod schemas;
- an older legacy document is missing newly required fields;
- offline cache returns stale state that overwrites fresh server data.

**Look for silent inconsistency and data corruption.**

---

# 12. Performance Audit

Inspect frontend and network efficiency:

- initial bundle size and JavaScript asset weight;
- lazy loading of routes and heavy dialogs;
- duplicated or un-memoized fetches;
- unnecessary React component rerenders;
- expensive client-side filtering and sorting of large datasets;
- oversized Firestore read payloads;
- large list/table DOM rendering without virtualization;
- large component files (> 1000 lines) with tight coupling;
- image and asset optimization;
- PWA caching policies and service worker cache lifetime;
- code splitting at feature and dashboard boundaries.

*Use evidence and profiling, not aesthetic preference.*

---

# 13. Observability Audit

Determine whether production failures are diagnosable.

### Review:
- frontend error reporting and ErrorBoundary coverage;
- Firestore error context (collection, operation, document ID);
- log retention and structured log outputs;
- timezone and timestamp accuracy in logs;
- action context (what the user was attempting);
- user and branch context where appropriate (without leaking PII);
- audit events for security- and financial-critical actions;
- deployment visibility and build version markers.

### Core Question:
> **“When a user reports that something disappeared or failed, what evidence can the engineer actually inspect to debug it?”**

---

# 15. Deployment / Operations Audit

Verify deployment pipelines, environments, and infrastructure:

- actual production hosting path (Firebase Hosting vs Cloudflare Pages/Worker);
- Firebase configuration and project bindings;
- Cloudflare Worker and API configuration if present;
- environment variables (`VITE_*` browser vs secure server-side keys);
- build commands and check scripts (`npm run build`, `npm run lint`, etc.);
- Firestore rules deployment and automated rule validation;
- Firestore index deployment (`firestore.indexes.json`);
- migration requirements and backward-compatible data handling;
- rollback strategy if a deployment causes immediate production failure;
- service worker / PWA cache update behavior (preventing stale bundle lock-in);
- staging vs production data separation.

**Identify “works locally but fails in production” risks.**
