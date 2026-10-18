# Architecture Proposal: Province-Wide Academic Summary Pipeline Backend Generation & Write Mechanism

> **Document Type:** Technical Architecture Proposal & Security Review RFC  
> **Status:** `PROPOSED — UNDER REVIEW (NONCANONICAL; SECURITY-GATED)`  
> **Governing Baseline:**  
> - [`docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md`](../governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md) (v3.4.1 Baseline, §4, §5, §6.11, §11, §15, §16, §19, §23, §26 G-012)  
> - [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) (Target Architecture Reconciliation Target)  
> - Accepted Owner Decisions: [`OD-AM-01`](../decisions/2026-10-18-instructor-leader-academic-monitoring-strategic-disposition.md), [`OD-AM-02, 03, 04, 06`](../decisions/2026-10-18-instructor-leader-academic-monitoring-reporting-policy.md), [`OD-AM-03, 05, 07`](../decisions/2026-10-19-instructor-leader-academic-monitoring-execution-readiness.md), and [`OD-AM-08`](../decisions/2026-10-19-instructor-leader-academic-monitoring-privacy-and-access.md)  
> - Target Authorization Contract: [`docs/specs/authorization-contract.md`](../specs/authorization-contract.md) §6.8  
> - Operational Recovery Runbook: [`docs/runbooks/academic-summaries-recovery-runbook.md`](../runbooks/academic-summaries-recovery-runbook.md)  
> - Service Building Blocks: [`src/features/reports/academicSummaryService.js`](../../src/features/reports/academicSummaryService.js)  
>
> **Security Quality Gate Notice:** This document incorporates a formal security review of backend authentication, authorization boundaries, and governance constraints:  
> 1. As established by official Google Cloud Firestore documentation, Google Cloud IAM evaluates access **only at the Database level or higher**, and does **not** support collection-path isolation. Direct service account REST requests bypass `firestore.rules`.  
> 2. Introducing a client-authenticated synthetic service user to enforce `firestore.rules` (Pattern 2) requires granting that identity cross-branch read access to `/progressReports`, which represents a **formal governance exception to Owner Decision `OD-AM-01`**.  
> 3. Security rules specifications must enforce strict top-level and nested schema typing, validate branch-division topology, bind document IDs to partition identities, and decompose write operations to ensure `delete` cannot be permitted through overlapping rule OR semantics.  
> 4. **No pattern is currently presented for immediate selection; all candidate patterns require technical verification, emulator testing, and governance deliberation.**
>
> **Enforcement Notice:** This document is an architectural proposal only. It does **not** alter `docs/ARCHITECTURE.md`, accepted owner decisions, production `firestore.rules`, or live cloud configuration. Implementation and deployment remain strictly blocked pending formal Owner approval (`Gate 4`).

---

## 1. Problem Definition & Current Implementation Boundary

### 1.1 Organizational Need vs. Data Isolation Invariant
Under Authoritative Blueprint v3.4 §5 and §26 G-012, the Central Academic Lead / Instructor Leader (based at the Main Campus `kota_gorontalo`) holds a **province-wide pedagogical quality assurance mandate** across all branches. In contrast, under Blueprint §11 and Owner Decision 2026-10-18 (`OD-AM-01`), raw student evaluation records under `/progressReports` are **strictly branch-isolated** (`isSameBranch(resource.data)` and `isSameBranchStrict(resource.data)` in `firestore.rules`).

The Central Academic Lead cannot read individual progress reports from satellite branches (`limboto`, `bone_bolango`, `pohuwato`). Allowing direct raw cross-branch queries in client-facing code would expose student PII, teacher evaluations, and sensitive student progress narratives across branch boundaries, violating core data isolation invariants.

### 1.2 Ratified Governance Baseline (OD-AM-01 through OD-AM-08)
To bridge this gap without weakening raw data isolation, Owner Kifry ratified the following binding policies:
1. **Candidate D Staged Direction (`OD-AM-01` Option B):** Precomputed partition summaries under `/academicSummaries` are pursued in principle; Tab 4 remains strictly home-campus scoped; production implementation is deferred. *Governance Invariant:* Raw progress reports remain strictly branch-isolated; any cross-branch query access represents a potential exception to `OD-AM-01`.
2. **Small-Cell Suppression (`OD-AM-02`):** Aggregates with fewer than 5 distinct learners represented ($N < 5$) have score details and group counts suppressed to `null`.
3. **Fixed Calendar Quarters (`OD-AM-03` Period):** Summaries aggregate over fixed calendar quarters: `Q1` (Jan–Mar), `Q2` (Apr–Jun), `Q3` (Jul–Sep), and `Q4` (Oct–Dec).
4. **Monthly Generation Cadence (`OD-AM-03` Cadence):** Batch generation is approved for monthly frequency (3 runs per quarter). *Status Distinction:* Monthly cadence is ratified policy; the exact trigger day and time (e.g. 1st of month at 04:00 WITA) remain a **proposed operational parameter**, not ratified policy.
5. **Staff Metric Exclusion (`OD-AM-04`):** Instructor submission timeliness and compliance tracking are strictly excluded from summary payloads.
6. **Accountable Operator (`OD-AM-05`):** The Vice Director is designated as Accountable Operator for operational monitoring and alert reception only, with **zero manual trigger authority, zero deployment authority, and zero raw data access**.
7. **Per-Learner Weighted Average & Risk Acceptance (`OD-AM-06`):** Reports are averaged per distinct learner first; each learner carries an equal weight of 1. Owner Kifry explicitly accepted the residual temporal differencing risk for cohorts with $N \ge 5$ under monthly updates.
8. **Production Readiness Gate (`OD-AM-07` Option C):** Background cron deployment is prohibited until: (1) alert delivery is verified, (2) UI staleness indicator is implemented, and (3) operational recovery runbook is established. Bounded failure handling is mandatory. 35-day staleness threshold approved. *Status Distinction:* Gate prerequisites 1 and 3 are **unverified and incomplete in production**.
9. **Consumer View Access & Export Ban (`OD-AM-08`):** Read access on `/academicSummaries` is limited exclusively to the Central Academic Lead at Kota Gorontalo. Bulk CSV export is strictly banned.

### 1.3 Current Implementation Boundary in Repository
- **Delivered:** Pure calculation, strict score validation (`parseValidScore`), small-cell suppression, prototype error classification, and UI predicate helpers exist in [`src/features/reports/academicSummaryService.js`](../../src/features/reports/academicSummaryService.js) and are tested by 24 unit tests.
- **Contract Field Alignment:** The calculation helper produces the canonical `isSuppressed` boolean field (aligned with the security contract) alongside `suppressed` (maintained as an in-memory alias for existing callers).
- **Delivered:** The UI staleness indicator (`SummaryStalenessBanner`) is implemented in [`src/features/dashboard/instructor/leader/AcademicProgressLeader.jsx`](../../src/features/dashboard/instructor/leader/AcademicProgressLeader.jsx), but remains **completely dormant and unconnected to live summaries**.
- **Delivered:** The target Firestore security rule is drafted in [`docs/specs/authorization-contract.md`](../specs/authorization-contract.md) §6.8, but is **explicitly inactive and undeployed**.
- **Crucial Architectural Gap:** **There is currently NO operational backend pipeline.** No background Worker or repository flow exists to fetch cross-branch progress reports, partition them into cohorts, compute aggregates, or persist documents to `/academicSummaries`.
- **Crucial Security & Governance Gap:** A viable backend least-privilege boundary that isolates the summary generator without either exposing the entire database (Pattern 1), requiring an unratified governance exception to `OD-AM-01` (Pattern 2), or consuming 80% of account-wide Cron Triggers while managing four identities (Pattern 3) remains under exploratory evaluation and has not yet been resolved.

---

## 2. Evaluation of Backend Generation & Storage Approaches

Under MYLIBERTY’s strict **zero-budget constraint** (zero paid services, zero subscription commitments, and Spark plan quota preservation), four potential technical architectures are evaluated.

### 2.1 Option 1: Scheduled Cloudflare Worker via Google Cloud Firestore REST API (Candidate D Baseline)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Cloudflare Edge (Free Tier)                                                │
│                                                                             │
│  [Cron Trigger] (Proposed: Monthly on 1st, 04:00 WITA / 20:00 UTC)         │
│         │                                                                   │
│         ▼                                                                   │
│  [academic-summaries-worker]                                                │
│         │                                                                   │
│         ├─► 1. Authenticate Identity (Service Account vs. Synthetic User)   │
│         ├─► 2. Obtain Token (Google OAuth2 Access Token vs. Firebase ID)    │
│         │                                                                   │
│         ├─► 3. GET /progressReports (structuredQuery per branch/division)   │
│         │      [SECURITY BOUNDARY: Evaluates bypass vs rules enforcement]   │
│         │                                                                   │
│         ├─► 4. In-Memory Aggregation: aggregatePartitionReports()           │
│         │      (parseValidScore, N < 5 suppression, learner averaging)      │
│         │                                                                   │
│         ├─► 5. Persistence Serialization: serializeAcademicSummary()        │
│         │      (Strips suppressed/metadata, enforces exact 12-field keys)   │
│         │                                                                   │
│         └─► 6. POST :commit (Atomic batch write of 5 partition docs)        │
│                into /academicSummaries/{branchId}_{division}_{period}        │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Google Cloud Firestore (Spark Free Plan)                                    │
│                                                                             │
│  /progressReports (Modeled ~100–1,000 docs once/month against 50k limit)    │
│  /academicSummaries (Modeled 5 documents once/month against 20k limit)      │
│  [All Other Collections: /users, /finances, /payments, /attendance, etc.]   │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### A. Authentication & Actual Google Cloud IAM Scope (Security Quality Gate Finding)
- **Authentication Mechanism:** Worker signs an RS256 JWT using `crypto.subtle` with a Google Service Account private key (`FIREBASE_SERVICE_ACCOUNT_KEY`) stored as an encrypted Cloudflare Worker secret, and exchanges it at `https://oauth2.googleapis.com/token` for an OAuth2 access token (`https://www.googleapis.com/auth/datastore`).
- **Official Google Cloud IAM Boundary (Verified):**
  > [!CAUTION]
  > **Firestore IAM Operates Exclusively at the Database Level:**  
  > According to official Google Cloud IAM documentation, permissions such as `datastore.entities.get`, `datastore.entities.list`, `datastore.entities.create`, and `datastore.entities.update` (and pre-defined roles like `roles/datastore.user`) **operate strictly at the Project or Database level** (`projects/{project}/databases/{database}`).  
  > **Google Cloud IAM does NOT support collection-level or document-path level permissions.** IAM Conditions (`resource.name`) evaluate only up to `firestore.googleapis.com/Database`. There is no IAM condition syntax or custom role definition capable of restricting permissions to specific collection paths such as `/progressReports` or `/academicSummaries`.
- **Actual Resulting Authority:** Any service account granted `datastore.entities.get` and `datastore.entities.list` can read **every document across all collections in the entire Firestore database**. Any service account granted `datastore.entities.create` and `datastore.entities.update` can insert or overwrite documents in **every collection in the entire Firestore database**.
- **Denial of `delete` is Insufficient:** Denying `datastore.entities.delete` prevents document deletion, but does **not** prevent an attacker or corrupted script with `update` from overwriting sensitive records, wiping fields, or zeroing out financial or user data.

#### B. Security Rules Boundary & Resulting Security Perimeter
- **Security Rules Bypassed:** Google Cloud Service Account REST requests authenticated via Google OAuth2 **bypass `firestore.rules` entirely**.
- **Resulting Security Perimeter:** The boundary between the Worker and the rest of the Firestore database is **NOT** enforced by Google Cloud IAM collection scoping. The boundary rests entirely upon:
  1. **Cloudflare Worker Application Code:** The worker code faithfully querying only `/progressReports` and writing only to `/academicSummaries`.
  2. **Cloudflare Environment Secret Protection:** Cloudflare's platform security protecting the stored private key secret from exfiltration.
- **Critical Architectural Deficit:** **Application code running on a third-party edge platform is not a backend security boundary.** If the Cloudflare Worker code is compromised, misconfigured, or if the private key is extracted, Google Cloud Firestore provides **zero backend enforcement** to reject unauthorized reads of `/finances`, `/payments`, `/users`, `/attendance`, or unauthorized writes to arbitrary collections.

#### C. Compromise Blast Radius & Incident Response
- **Confidentiality Blast Radius:** **Database-Wide.** An adversary obtaining the service account private key gains immediate read access to the entire institution’s data: student personal records, parent contact details, employee profiles, payroll/salary records, tuition payments, financial ledger entries, shift logs, and internal audit records.
- **Integrity Blast Radius:** **Database-Wide.** With `create` and `update` permissions across the database, an adversary can overwrite student evaluations, tamper with user role definitions in `/users`, forge financial balances, or disrupt system configuration.
- **Incident Response & Revocation:**
  1. Revocation is instantaneous by deleting or disabling the service account key in the Google Cloud Console (`IAM & Admin -> Service Accounts -> Keys`).
  2. However, detection depends on Google Cloud Cloud Audit Logs (which are limited on free tier) or discovering anomalous data corruption after the fact.
  3. Key rotation requires generating a new key in GCP Console and updating Cloudflare secrets via `npx wrangler secret put FIREBASE_SERVICE_ACCOUNT_KEY`.

#### D. Cross-Branch Reads & Partition Formation
- **Query Strategy:** Executes up to 5 structured REST queries targeting branch and division partitions:
  1. `kota_gorontalo` Courses
  2. `kota_gorontalo` Kindergarten
  3. `bone_bolango` Courses
  4. `limboto` Courses
  5. `pohuwato` Courses
- **Partition Formation:** Passes retrieved documents to `aggregatePartitionReports(reports, metadata)`, which outputs clean partition aggregates strictly returning `isSuppressed` (the compatibility alias `suppressed` is omitted).
- **Persistence Serialization Gate:** Passes each partition summary through `serializeAcademicSummary(summary)` prior to persistence. This explicit validator and serializer strictly validates required fields (rejecting malformed non-boolean values like `"false"`, missing required fields, or satellite kindergarten pairings rather than filling nulls/defaults), guarantees that the payload's keys exactly match the 12-field contract whitelist (`CANONICAL_SUMMARY_FIELDS`), strips any legacy, internal, or unapproved fields (such as `suppressed` or `metadata`), and enforces explicit `null` on all four sensitive metrics (`averageScore`, `scoreBuckets`, `distinctLearnersCount`, and `totalReportsCount`) when `isSuppressed == true`.
- **Output Partitions:** Forms 5 deterministic summary documents with ID format `${branchId}_${division}_${period}` (e.g. `limboto_courses_2026-Q3`).

#### E. Quotas, Resource Limits, Modeled Subrequests & Idempotency
- **Firestore Reads (Modeled):** Queries retrieve an estimated ~100–1,000 progress reports across 4 branches once per month. Draws ~0.2%–2% of the Spark plan's 50,000 daily read quota once monthly (quota resets daily at midnight PT).
- **Firestore Writes (Modeled):** Writes 5 documents via one atomic REST `:commit` batch. Consumes 5 writes of the 20,000 daily write allowance.
- **Isolate CPU Execution:** Local V8 isolate benchmarks (Gate 2A) measured 0.7ms–2.1ms for $N=100..1000$ documents, well within Cloudflare Free plan's 10ms CPU limit.
- **Subrequests per Invocation (Modeled Baseline vs. Production Realities):**
  - *Theoretical Baseline:* 1 OAuth2 token exchange + 5 partition read queries + 1 `:commit` batch write = **7 HTTP subrequests**. This falls comfortably below the Cloudflare Free plan limit of 50 subrequests per invocation.
  - *Untested / Modeled Caveat (Pagination Risk):* The 7-subrequest figure assumes that all reports for each branch/division fit within a single query response page. If student population grows or if Firestore REST API enforces page-size limits (defaulting to 300 documents per structuredQuery page), cursor-based pagination (`startAt` / `endBefore`) will require additional round-trip subrequests. If each partition requires multiple pages, subrequest consumption will increase.
  - *Subrequest Budget Limit:* Because the Cloudflare Free plan imposes a hard ceiling of 50 subrequests per invocation, any pagination logic must strictly budget subrequests to ensure total calls across all 5 partitions remain below 50.
- **Idempotency:** Document IDs are deterministic (`${branchId}_${division}_${period}`). Reruns cleanly overwrite existing partition summaries without creating duplicate documents or orphan partitions.
- **Retry Handling (Prototype Behavior):** Bounded failure handling. Fatal client errors (400, 401, 403, 404) and ambiguous resource exhaustion (429, 500) call `controller.noRetry()` to prevent runaway retries against the Spark daily quota. Exact platform-level retry queuing remains unverified on Cloudflare Free infrastructure.

#### F. Consumer Read Path & 35-Day Freshness
- **Read Path:** Central Academic Lead logs in $\rightarrow$ Tab 4 checks user claims $\rightarrow$ client queries `/academicSummaries` where `period == currentQuarter`.
- **Target Security Rule:** `firestore.rules` enforces `allow read: if signedIn() && isInstructorLeader() && userBranch() == 'kota_gorontalo';`. All other roles receive `PERMISSION_DENIED`. *(Currently inactive and undeployed).*
- **Freshness Evaluation:** Tab 4 passes fetched document's `generatedAt` to `SummaryStalenessBanner`. If `now - generatedAt > 35 days`, passive warning banner renders; otherwise dormant. *(Banner implemented in UI, but currently disconnected).*

#### G. Scheduled Failure Detection & Alerting (Incomplete Gate Prerequisites)
- **Failure Path:** Uncaught exceptions in `scheduled()` event handler re-throw after calling `controller.noRetry()`.
- **Alert Delivery Requirement:** Requires an account-level Cloudflare Notification policy routing to the Vice Director's verified email address.
- **Current Evidence Gap & Blockers:**
  1. Cloudflare notification delivery for scheduled worker failure remains **untested and unverified**. The wrangler CLI token lacks `Account.Alerting` permissions, and no alert policy exists for this pipeline.
  2. The target worker is not deployed, meaning live cron failure cannot be tested without deploying infrastructure.
  3. The Vice Director's email address is not recorded in repository decisions (`[OD-AM-07-EMAIL / Owner Decision Required]`).
  4. OD-AM-07 readiness gate remains **open and incomplete**.

#### H. Legitimate Recovery Actions (Zero Inferred Authority)
- **No Console Deletions:** Operators are forbidden from manually editing Firestore in the Firebase Console.
- **No Ad-Hoc Schedule Changes:** Changing `wrangler.toml` crons to force ad-hoc runs is prohibited.
- **Recovery Procedure:** If a monthly run fails, the Vice Director checks logs (`npx wrangler tail academic-summaries-worker`). The pipeline is idempotent, so the subsequent scheduled run will automatically compute full quarter summaries and overwrite partitions. An out-of-cycle manual rerun tool requires separate future authorization.

#### I. Cost & Financial Risk
- **Cost:** **$0.00 / Zero Cost**. Uses Cloudflare Free Worker + Firebase Spark Free Plan.

---

### 2.2 Option 2: Firebase Cloud Functions (2nd Gen) Scheduled via Google Cloud Scheduler

#### A. Architecture Overview
A Node.js Cloud Function triggered via Cloud Scheduler on the 1st of the month, using the Firebase Admin SDK to query `/progressReports` and write to `/academicSummaries`.

#### B. Assessment & Evaluation
- **Authentication:** Application Default Credentials (ADC) native to Google Cloud environment.
- **Security Rules:** Bypassed by Admin SDK (same database-wide authority as Service Account).
- **Quotas & Limits:** Within 50k daily read quota.
- **FATAL COST & PLAN BLOCKER:**  
  > [!CAUTION]
  > **Requires Blaze (Pay-As-You-Go) Plan:**  
  > Firebase Cloud Functions **cannot be deployed on the Spark (Free) plan**. Google Cloud requires upgrading the billing account to Blaze (requiring a linked credit card). Even though small usage may fall within free tier compute allocations, enabling Blaze violates MYLIBERTY's core zero-budget invariant and introduces financial risk of unexpected usage spikes or billing charges.
- **Verdict:** **Disqualified on Cost & Plan Grounds.**

---

### 2.3 Option 3: Client-Side Interactive On-Demand Aggregation (Candidate A/B)

#### A. Architecture Overview
When the Central Academic Lead opens Tab 4 or clicks "Load Province-Wide View", the browser client queries all 4 branches directly and aggregates in the browser.

#### B. Assessment & Evaluation
- **Authentication:** Firebase Auth ID Token (`request.auth.uid`).
- **Security Rules:** Evaluated and applied.
- **FATAL GOVERNANCE, PRIVACY & QUOTA BLOCKERS:**  
  > [!CAUTION]
  > **Violates Raw Data Isolation Invariant:**  
  > Under Blueprint §5, §11, and `OD-AM-01`, raw `/progressReports` access is strictly branch-isolated. Enabling client-side aggregation would require widening `firestore.rules` to allow the Central Academic Lead to read raw, identifiable student evaluations across all branches. This exposes raw student names, teacher feedback narratives, and grades in client memory.  
  > **Quota Multiplier:** Every dashboard view or refresh by the leader would execute 100–1,000 raw Firestore reads. 50 page reloads would completely exhaust the project's daily 50,000 Spark read limit.
- **Verdict:** **Disqualified on Governance, Privacy, and Cost Grounds.**

---

### 2.4 Option 4: GitHub Actions Scheduled Cron Workflow

#### A. Architecture Overview
A Node.js script executed on a monthly cron schedule via GitHub Actions (`.github/workflows/academic-summary-cron.yml`), using a Service Account secret to read and write Firestore via REST.

#### B. Assessment & Evaluation
- **Authentication:** Google Service Account key stored in GitHub Repository Secrets.
- **Security Rules:** Bypassed via REST (same database-wide IAM scope as Option 1).
- **Costs:** Free (2,000 free runner minutes per month for private repositories; runs require < 1 minute/month).
- **Failure & Alerting:** Native GitHub Actions failure notifications automatically email repository collaborators.
- **Architectural Trade-offs & Risks:**
  1. *Infrastructure Fragmentation:* MYLIBERTY’s edge backend infrastructure is hosted on Cloudflare Workers (`myliberty-ai-proxy`). Introducing GitHub Actions as an operational runtime creates an unmonitored second execution environment.
  2. *Security Surface:* GitHub Actions runners run in third-party shared runner pools with broader repository access tokens (`GITHUB_TOKEN`).
  3. *Cron Schedule Inaccuracy:* Free-tier GitHub Actions cron schedules suffer documented queuing delays of 15 minutes to over 2 hours during peak usage hours.
- **Verdict:** **Viable Zero-Cost Fallback, but Shares Option 1's Database-Wide IAM Deficit and Fragments Operations.**

---

## 3. Comparative Architecture Matrix

| Architectural Dimension | Option 1: Scheduled Cloudflare Worker + REST | Option 2: Firebase Cloud Functions | Option 3: Client-Side Tab 4 Aggregation | Option 4: GitHub Actions Cron |
|---|---|---|---|---|
| **Zero-Budget Compliant** | **YES** (100% Free Tier) | **NO** (Requires Blaze Plan / Credit Card) | **YES** (Spark Plan) | **YES** (2,000 free mins) |
| **Branch Isolation Preserved** | **YES** (Client never sees raw docs) | **YES** (Client never sees raw docs) | **NO (Fatal Privacy Breach)** | **YES** (Client never sees raw docs) |
| **Firestore Security Rules** | **Bypassed** (Evaluated by IAM) | **Bypassed** (Admin SDK) | **Applied** (Requires Rule Widening) | **Bypassed** (Evaluated by IAM) |
| **Least-Privilege Enforcement Boundary** | **Application Code Only** (IAM has NO collection granularity) | **Application Code Only** (Admin SDK has full DB access) | **Firestore Security Rules** | **Application Code Only** (IAM has NO collection granularity) |
| **Credential Compromise Blast Radius** | **Database-Wide Read & Write** (All collections exposed) | **Project-Wide Admin Access** | Scoped to User Claims | **Database-Wide Read & Write** (All collections exposed) |
| **Daily Read Quota Impact** | **~100–1,000 reads / month** (< 2% daily) | **~100–1,000 reads / month** | **100–1,000 reads PER PAGE VIEW** | **~100–1,000 reads / month** |
| **Write Atomicity** | **Single `:commit` Batch** (5 docs) | **Single `writeBatch`** (5 docs) | **Blocked** (`allow write: if false`) | **Single `:commit` Batch** (5 docs) |
| **Idempotency** | **Deterministic Keys** | **Deterministic Keys** | N/A (In-memory only) | **Deterministic Keys** |
| **Execution CPU Time** | **Modeled: ~1–3ms** (Limit: 10ms) | Serverless container | Browser CPU | Serverless container |
| **Subrequests / Invocation** | **Modeled: ~7 subrequests** (Limit: 50; pagination untested) | N/A | Direct SDK | N/A |
| **Alert Delivery** | Cloudflare Notifications (Unverified) | Google Cloud Monitoring (Blaze) | Console error only | Native GitHub Failure Email |
| **Operational Operator Fit** | Aligned with Blueprint §5.4 | Aligned with Blueprint §5.4 | Violates Least Privilege | Developer/Admin only |
| **Ratified Decision Alignment** | **Aligned in Principle; Security-Gated by IAM Scope & OD-AM-07** | Blocked by Budget Constraint | **Direct Conflict with OD-AM-01/08** | Aligned in Principle; Infrastructure Fragmentation |

---

## 4. Technical vs. Governance Enforcement Matrix

To satisfy the Decision Brief Quality Gate, each system boundary is mapped to its actual enforcement layer:

| Boundary / Policy | Actual Enforcement Mechanism | Technical Boundary vs. Governance / Policy | Status in Repository |
|---|---|---|---|
| **Raw Progress Report Isolation** | `firestore.rules` (`isSameBranchStrict`) | **Technical Backend Security Boundary** | Active in production rules |
| **Summary Read Access Control** | `firestore.rules` (`allow get, list: if signedIn() && isInstructorLeader() && userBranch() == 'kota_gorontalo'`) | **Technical Backend Security Boundary** (Evaluated by Firebase auth tokens) | Specified in Contract §6.8; inactive pending rules deployment |
| **Summary Write Restrictions** | `firestore.rules` (`allow create, update: ...; allow delete: if false;`) | **Technical Backend Security Boundary** (Granular operation decomposition) | Proposed specification; inactive pending rules deployment |
| **Client Access Predicate** | `canReadAcademicSummaries(user)` | **Client-Side Predicate Only** (UI gating only; NOT a security boundary) | Implemented in `academicSummaryService.js` |
| **Bulk CSV Export Ban** | `canExportAcademicSummaries()` & Tab 4 UI omission | **Application Code & Governance Policy** (API prevention requires rules read limit) | Implemented in `academicSummaryService.js` |
| **Small-Cell Suppression ($N < 5$)** | Rules-enforced explicit null metrics + Worker logic | **Technical Security Rule & Application Logic** | Logic implemented; rules specification drafted |
| **Quarter Dates Matching** | Rules-enforced calendar boundaries (`isValidQuarterDates`) | **Technical Security Rule** (Enforces OD-AM-03 quarter boundaries) | Proposed specification; inactive pending rules deployment |
| **Branch-Division Topology** | Rules-enforced pair check (`isValidBranchDivision`) | **Technical Security Rule** (Enforces Blueprint v3.4 §4) | Proposed specification; inactive pending rules deployment |
| **Worker Collection Isolation** | **Worker Application Code Only** (GCP IAM lacks collection granularity) | **Application Logic Only; NOT a Cloud Security Boundary** | **Unresolved Security Deficit under Pattern 1** |
| **Worker Database Access Scope** | Google Cloud IAM Role Binding | **Technical Cloud Security Boundary** (Database-level only) | Unresolved; requires Owner decision |
| **35-Day Freshness Warning** | `SummaryStalenessBanner` in Tab 4 | **Client Presentation Layer** | Dormant in `AcademicProgressLeader.jsx` (unconnected to `/academicSummaries`; per-partition freshness display and integration are future requirements) |
| **Bounded Error Retries** | `classifyFirestoreError()` & `controller.noRetry()` | **Application Logic on Edge Runtime** | Implemented as prototype behavior; platform queuing unverified |
| **Vice Director Zero-Trigger** | Absence of trigger endpoints | **Architectural Omission & Governance Rule** | Enforced by architecture design |

---

## 5. Architectural Analysis of Least-Privilege Boundary Approaches

Because official Google Cloud Firestore documentation confirms that Google Cloud IAM **cannot enforce collection-level isolation**, relying on a direct Service Account (Option 1 as originally formulated) grants the Worker database-wide access. To resolve this, five architectural boundary patterns are compared:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Architectural Options to Establish a Least-Privilege Generator Boundary     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ Pattern 1: Coarse IAM + Formal Owner Risk Acceptance (Direct Service Account)│
│   Worker ──(Service Account OAuth2)──► Firestore REST (Bypasses Rules)      │
│   • Enforced by: Cloudflare secret encryption + Worker application code.    │
│   • Blast radius: Database-wide read/write if key leaked.                   │
│   • Budget: 100% Free / Spark.                                              │
│                                                                             │
│ Pattern 2: Single Central Synthetic Service User (Rules-Enforced Central)   │
│   Worker ──(Firebase Auth Sign-In)──► Firestore REST (Evaluates Rules!)     │
│   • Enforced by: firestore.rules backend checks for service identity.       │
│   • Blast radius: Scoped to /progressReports and /academicSummaries.        │
│   • Governance: Requires a formal Governance Exception to OD-AM-01!         │
│   • Budget: 100% Free / Spark (Identity Toolkit supported).                 │
│                                                                             │
│ Pattern 3: Four Branch-Scoped Scheduled Workers (Decentralized Edge Workers)│
│   4 Workers ──(4 Branch Auth Users)──► Firestore REST (Evaluates Rules!)    │
│   • Enforced by: firestore.rules binding each worker strictly to its branch.│
│   • Blast radius: Single branch progress reports per worker credential.     │
│   • Governance: Appears compatible with OD-AM-01 on paper (no cross-branch).│
│   • Budget: 100% Free / Spark (consumes 4 of 5 account Cron Triggers).      │
│                                                                             │
│ Pattern 4: Intermediate Microservice / Cloud Run Proxy                      │
│   Worker ──► Cloud Run / Functions ──► Firestore                             │
│   • Enforced by: Internal backend proxy code.                               │
│   • Blocker: Requires billing account / Blaze plan; violates zero-budget.   │
│                                                                             │
│ Pattern 5: Multi-Database Firestore Partitioning                             │
│   Worker ──► Dedicated secondary database (academic-db)                     │
│   • Enforced by: GCP IAM Database-level condition.                          │
│   • Blocker: Multiple databases require Blaze plan; violates zero-budget.   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.1 Pattern 1: Direct Service Account with Formal Owner Risk Acceptance (Coarse IAM Baseline)
- **Mechanism:** Worker uses an RS256 JWT to acquire a Google Service Account OAuth2 token with database-level `datastore.entities.get`, `list`, `create`, `update` permissions (without `delete`).
- **Security Assessment:**
  - Google Cloud IAM provides **no collection isolation**.
  - Bypasses `firestore.rules`.
  - Blast radius is database-wide (all collections exposed to read/write if the Cloudflare secret is compromised).
- **Cost & Plan Impact:** $0 / Spark Free Plan compliant.
- **Operational Complexity:** Low (single Cloudflare Worker script, direct REST calls).
- **Governance Requirement:** Requires an explicit Owner Decision (`[OD-AM-09-BOUNDARY]`) wherein Owner Kifry formally accepts the database-wide compromise risk of storing a privileged service account key in Cloudflare Worker secrets.

### 5.2 Pattern 2: Synthetic Service User via Firebase Auth (Rules-Enforced Security Boundary with Governance Exception to OD-AM-01)

#### A. Governance Exception to OD-AM-01 (Policy Requirement)
> [!IMPORTANT]
> **Cross-Branch Raw Report Access Is a Formal Governance Exception, Not an Implementation Detail:**  
> Owner Decision `OD-AM-01` explicitly committed to preserving raw `/progressReports` branch isolation (`isSameBranchStrict(resource.data)`).  
> Granting a client-authenticated synthetic service user (`academic-summary-worker@myliberty.local`) cross-branch read access to `/progressReports` introduces an identity capable of reading raw student progress evaluations across all four branches via standard client REST and SDK endpoints.  
> If this synthetic user's credentials were breached, an adversary could dump raw progress reports across all branches.  
> **Therefore, this access cannot be introduced as an informal security rule tweak.** It constitutes a **formal governance exception to `OD-AM-01`** that requires explicit Owner review, risk assessment, and formal ratification before adoption.

#### B. Mechanism & Rules-Enforced Perimeter
1. A dedicated non-human service user account (e.g. `academic-summary-worker@myliberty.local`) is provisioned in Firebase Authentication.
2. The Worker authenticates using Firebase Auth REST API (`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={WEB_API_KEY}`) with credentials stored in encrypted secrets, obtaining an ID token.
3. The Worker makes subsequent Firestore REST API calls sending `Authorization: Bearer <ID_TOKEN>`.
4. **Crucial Security Property:** When an ID token is provided, **Cloud Firestore evaluates requests against `firestore.rules`**!
5. In `firestore.rules`, an explicit rule block governs both raw report reading and summary writing.

#### C. Tightened Proposed Summary Permissions & Invariants
To ensure defense-in-depth, permissions on `/academicSummaries` are strictly constrained:

1. **Operation Decomposition & Absolute Denial of Deletes:**
   - In Firestore Security Rules, permissions must be granted per granular operation (`get`, `list`, `create`, `update`, `delete`). Generic `allow write:` must **never** be used on `/academicSummaries`, because `allow write:` grants `create`, `update`, AND `delete`.
   - `allow delete: if false;` applies to all callers (human and service identities). Summaries can only be created or updated; historical partition documents cannot be erased by the worker.
   - **Rules Combining Semantics (OR Logic):** Because Firestore rules combine with OR semantics across matching blocks, the repository ruleset must ensure no overlapping wildcard matchers (e.g., `match /{document=**}`) exist that could inadvertently grant delete permissions. The emulator test suite must verify this final combined behavior.

2. **Removal of Unvalidated Maps (`metadata` Exclusion):**
   - The top-level schema whitelist strictly excludes `metadata`. Because open maps can contain arbitrary nested key-value pairs (which could be used to exfiltrate unapproved student narratives or staff IDs), removing `metadata` entirely prevents nested unvalidated payload injection.

3. **Strict Top-Level Schema Whitelist, Exact 12-Field Contract & Serialization Gate:**
   - **Canonical Field Name & Alias Removal:** The security contract requires `isSuppressed` (boolean). The calculation helper [`src/features/reports/academicSummaryService.js`](../../src/features/reports/academicSummaryService.js) outputs `isSuppressed: isSuppressed` directly; the compatibility alias `suppressed` was completely removed from the helper's output to prevent rule whitelist rejection.
   - **Tested Persistence Serializer & Validator (`serializeAcademicSummary`):** To guarantee that any summary document written to Firestore strictly satisfies the 12-field contract, an explicit serializer (`serializeAcademicSummary`) strictly validates and serializes documents before persistence. It fails fast by rejecting non-boolean `isSuppressed` (preventing false boolean coercion from strings like `"false"`), rejecting missing required fields or branch typology mismatches (rather than filling nulls/defaults), stripping any legacy aliases (such as `suppressed`), excluding extraneous maps (such as `metadata`), enforcing explicit `null` on the four sensitive metrics when `isSuppressed == true`, and guaranteeing that the document's keys strictly match the 12-field contract.
   - **Strict Required Keys:** All 12 fields are mandatory and must be present in every partition document (`data.keys().hasOnly(requiredKeys) && data.keys().hasAll(requiredKeys)`):
     ```text
     [
       'branchId', 'division', 'period', 'periodStartDate', 'periodEndDate',
       'generatedAt', 'aggregationMethod', 'isSuppressed',
       'totalReportsCount', 'distinctLearnersCount', 'averageScore', 'scoreBuckets'
     ]
     ```
   - **Explicitly Forbidden Fields:**
     - *No staff tracking fields:* `instructorId`, `submissionTimeliness`, `complianceRate`, `submissionCount`, etc. are strictly forbidden per `OD-AM-04`.
     - *No student identifying fields:* `studentId`, `studentName`, `notes`, `evaluations`, `narratives` are strictly forbidden.

4. **Strict Nested Typing on `scoreBuckets`:**
   - When unsuppressed (`isSuppressed == false`):
     - `scoreBuckets` must be a map containing **strictly and only** three performance bands: `below70`, `band70_84`, and `band85_100`.
     - Each band value must be a non-negative integer: `data.scoreBuckets.below70 is int && data.scoreBuckets.below70 >= 0` (and identically for `band70_84` and `band85_100`).
     - **Mathematical Consistency Invariant:** The sum of bucket values must exactly equal `distinctLearnersCount`:
       `data.scoreBuckets.below70 + data.scoreBuckets.band70_84 + data.scoreBuckets.band85_100 == data.distinctLearnersCount`.
   - When suppressed (`isSuppressed == true`):
     - `scoreBuckets` must be explicitly set to `null` (`data.scoreBuckets == null`).

5. **Branch Typology & Branch–Division Pair Validation (Blueprint v3.4 §4):**
   - The rule validates that partitions adhere strictly to the ratified institutional branch typology:
     - Type 1 Main Campus (`kota_gorontalo`): Dual-division (`courses` and `kindergarten`).
     - Type 2 Satellite Branches (`bone_bolango`, `limboto`, `pohuwato`): Lean single-division (`courses` only).
   - Any attempt to write a Kindergarten summary partition for a satellite branch (e.g. `limboto_kindergarten_...`) is rejected at the rules layer.

6. **Quarter Dates Consistency & Immutability (OD-AM-03 Validation):**
   - The rule enforces that `periodStartDate` and `periodEndDate` strictly match the fixed calendar quarter boundaries defined by `period`:
     - `Q1`: `YYYY-01-01` to `YYYY-03-31`
     - `Q2`: `YYYY-04-01` to `YYYY-06-30`
     - `Q3`: `YYYY-07-01` to `YYYY-09-30`
     - `Q4`: `YYYY-10-01` to `YYYY-12-31`
   - Validated via CEL helper `isValidQuarterDates(data.period, data.periodStartDate, data.periodEndDate)`.
   - On `update`: Partition identity fields (`branchId`, `division`, `period`, `periodStartDate`, `periodEndDate`) are **strictly immutable**.

7. **Document ID Binding:**
   - On `create` and `update`: The document ID must strictly match the partition identity:
     `summaryId == request.resource.data.branchId + '_' + request.resource.data.division + '_' + request.resource.data.period`.

8. **Suppression Invariants & Explicit Null Requirement (`OD-AM-02`):**
   - **Explicit Null Requirement:** Unlike loose prose that might suggest sensitive fields could be omitted, the security contract strictly requires explicit `null` for all four sensitive metrics (`averageScore`, `scoreBuckets`, `distinctLearnersCount`, and `totalReportsCount`) when `isSuppressed == true`. Because all 12 keys are required to be present via `hasAll(...)`, direct equality comparison to `null` is completely deterministic and prevents missing-key evaluation failures.
   - *Suppressed State ($N < 5$):*
     `data.averageScore == null && data.scoreBuckets == null && data.distinctLearnersCount == null && data.totalReportsCount == null`.
   - *Unsuppressed State ($N \ge 5$):*
     `data.distinctLearnersCount is int && data.distinctLearnersCount >= 5 && data.totalReportsCount is int && data.totalReportsCount >= data.distinctLearnersCount && data.averageScore is number && data.averageScore >= 0 && data.averageScore <= 100 && isValidScoreBuckets(data.scoreBuckets, data.distinctLearnersCount)`.

#### D. Draft Security Rules Specification (Illustrative Contract)
```text
// ============================================================================
// ILLUSTRATIVE DRAFT CONTRACT (Requires OD-AM-01 Governance Exception)
// ============================================================================

function isSummaryWorker() {
  return signedIn() && request.auth.token.email == 'academic-summary-worker@myliberty.local';
}

function isValidBranchDivision(branchId, division) {
  return (branchId == 'kota_gorontalo' && (division == 'courses' || division == 'kindergarten')) ||
         ((branchId == 'bone_bolango' || branchId == 'limboto' || branchId == 'pohuwato') && division == 'courses');
}

function isValidQuarterDates(period, startDate, endDate) {
  let year = period[0:4];
  let quarter = period[5:7];
  return (quarter == 'Q1' && startDate == year + '-01-01' && endDate == year + '-03-31') ||
         (quarter == 'Q2' && startDate == year + '-04-01' && endDate == year + '-06-30') ||
         (quarter == 'Q3' && startDate == year + '-07-01' && endDate == year + '-09-30') ||
         (quarter == 'Q4' && startDate == year + '-10-01' && endDate == year + '-12-31');
}

function isValidScoreBuckets(buckets, learnerCount) {
  let allowedBucketKeys = ['below70', 'band70_84', 'band85_100'];
  return buckets is map &&
         buckets.keys().hasOnly(allowedBucketKeys) &&
         buckets.keys().hasAll(allowedBucketKeys) &&
         buckets.below70 is int && buckets.below70 >= 0 &&
         buckets.band70_84 is int && buckets.band70_84 >= 0 &&
         buckets.band85_100 is int && buckets.band85_100 >= 0 &&
         (buckets.below70 + buckets.band70_84 + buckets.band85_100 == learnerCount);
function isValidGeneratedAt(val) {
  return val is string &&
         val.matches('^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](\\.[0-9]{1,3})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$');
}

function isValidAcademicSummary(data) {
  let requiredKeys = [
    'branchId', 'division', 'period', 'periodStartDate', 'periodEndDate',
    'generatedAt', 'aggregationMethod', 'isSuppressed',
    'totalReportsCount', 'distinctLearnersCount', 'averageScore', 'scoreBuckets'
  ];
  let hasExactKeys = data.keys().hasOnly(requiredKeys) && data.keys().hasAll(requiredKeys);
  let validBranchDiv = isValidBranchDivision(data.branchId, data.division);
  let validPeriod = data.period.matches('^[0-9]{4}-Q[1-4]$');
  let validQuarterDates = validPeriod && isValidQuarterDates(data.period, data.periodStartDate, data.periodEndDate);
  let validGeneratedAt = isValidGeneratedAt(data.generatedAt);
  let validMethod = data.aggregationMethod == 'learner_average';
  let validSuppression = data.isSuppressed == true ?
    (data.averageScore == null && data.scoreBuckets == null &&
     data.distinctLearnersCount == null && data.totalReportsCount == null) :
    (data.isSuppressed == false &&
     data.distinctLearnersCount is int && data.distinctLearnersCount >= 5 &&
     data.totalReportsCount is int && data.totalReportsCount >= data.distinctLearnersCount &&
     data.averageScore is number && data.averageScore >= 0 && data.averageScore <= 100 &&
     isValidScoreBuckets(data.scoreBuckets, data.distinctLearnersCount));
     
  return hasExactKeys && validBranchDiv && validQuarterDates && validGeneratedAt && validMethod && validSuppression;
}

function arePartitionIdentityFieldsImmutable() {
  return request.resource.data.branchId == resource.data.branchId &&
         request.resource.data.division == resource.data.division &&
         request.resource.data.period == resource.data.period &&
         request.resource.data.periodStartDate == resource.data.periodStartDate &&
         request.resource.data.periodEndDate == resource.data.periodEndDate;
}

// Collection: /progressReports/{reportId}
match /progressReports/{reportId} {
  // Existing branch isolation + Proposed OD-AM-01 Governance Exception
  allow get, list: if signedIn() && (isSameBranchStrict(resource.data) || isSummaryWorker());
  // Writes remain strictly governed by existing branch rules
}

// Collection: /academicSummaries/{summaryId}
match /academicSummaries/{summaryId} {
  // Read access: Limited strictly to Central Academic Lead at Kota Gorontalo
  allow get, list: if signedIn() && isInstructorLeader() && userBranch() == 'kota_gorontalo';

  // Create: Allowed only for verified summary worker with valid document ID, schema, and invariants
  allow create: if isSummaryWorker() &&
                   summaryId == request.resource.data.branchId + '_' + request.resource.data.division + '_' + request.resource.data.period &&
                   isValidAcademicSummary(request.resource.data);

  // Update: Allowed only for verified summary worker with immutable partition identity and valid schema
  allow update: if isSummaryWorker() &&
                   arePartitionIdentityFieldsImmutable() &&
                   summaryId == request.resource.data.branchId + '_' + request.resource.data.division + '_' + request.resource.data.period &&
                   isValidAcademicSummary(request.resource.data);

  // Delete: Denied unconditionally for all principals
  allow delete: if false;
}
```

### 5.3 Pattern 3: Four Branch-Scoped Scheduled Workers (Decentralized Branch-Bound Identities)

#### A. Architecture Overview & Core Concept
Rather than concentrating execution in a single centralized worker holding province-wide access:
- **Four independent Cloudflare Worker scripts** are deployed:
  1. `academic-summary-worker-kota`
  2. `academic-summary-worker-bone`
  3. `academic-summary-worker-limboto`
  4. `academic-summary-worker-pohuwato`
- Each Worker is bound to **its own dedicated Firebase Auth synthetic identity**:
  - `worker-kota@myliberty.local` (`branchId: 'kota_gorontalo'`)
  - `worker-bone@myliberty.local` (`branchId: 'bone_bolango'`)
  - `worker-limboto@myliberty.local` (`branchId: 'limboto'`)
  - `worker-pohuwato@myliberty.local` (`branchId: 'pohuwato'`)
- Each Worker environment holds **only its own credentials as encrypted Cloudflare secrets**. No Worker script ever possesses the secrets of another branch.
- **Design Property:** Each Worker queries only its own branch's `/progressReports` and writes only its own branch's `/academicSummaries` partition(s), enforced server-side by `firestore.rules`.
- **Status of Design Artifacts:** The proposed rules, helper functions, service identities, and their provisioning are **unimplemented design items** that must be empirically tested before implementation.

#### B. Cloudflare Free Plan Platform Limits & Schedule Dates (Corrected)
1. **Account-Wide Cron Trigger Ceiling (Official Limits):**
   - According to official Cloudflare documentation ([Cloudflare Workers Limits — Cron Triggers](https://developers.cloudflare.com/workers/platform/limits/#cron-triggers)), Cloudflare Free allows up to **5 Cron Triggers per account** (and up to 3 per Worker script).
   - Deploying 4 branch workers with 1 schedule each consumes **4 out of the 5 allowed Cron Triggers across the entire Cloudflare account** (80% of the account-wide ceiling).
2. **Account-Wide Trigger Inventory Constraint (Strictly Unverified):**
   - The four proposed triggers fit within the Free Plan *only if* the Cloudflare account currently utilizes no more than one other Cron Trigger across all other Worker scripts.
   - **Crucial Evidence Gap:** While the repository's local `wrangler.toml` for `myliberty-ai-proxy` specifies no schedules and the active script list showed 1 script, **account-wide usage must NOT be inferred from `wrangler.toml` or the local Worker list**. The live account's complete trigger inventory across all inactive, deleted, or dashboard-configured resources has **not been verified** via the Cloudflare account API or dashboard. It remains strictly unverified.
3. **UTC Scheduling & Month-End Timezone Nuance:**
   - Cloudflare Cron Triggers execute strictly in **UTC** time.
   - Central Indonesia Time (WITA) is UTC+8.
   - The previously proposed expression `0 20 1 * *` represents 20:00 UTC on the 1st day of the month. Converted to WITA, this executes at **04:00 WITA on the second day of the month** (20:00 UTC on the 1st + 8 hours = 04:00 on the 2nd).
   - To execute at 04:00 WITA on the **first day of the month**, execution must occur at **20:00 UTC on the last day of the previous calendar month**.
   - **Cloudflare Support for Exact Expression:** Official Cloudflare documentation confirms that Cloudflare Workers Cron Triggers support Quartz-style cron extensions, specifically the **`L` (Last)** character in the day-of-month field.
   - The exact expression **`0 20 L * *`** runs at 20:00 UTC on the last day of each month, which maps precisely to **04:00 WITA on the 1st day of the subsequent month**. Cloudflare explicitly supports this exact expression.
   - If running on a quarterly schedule under `OD-AM-03` (end of Q1, Q2, Q3, Q4: March 31, June 30, September 30, December 31), the expression is `0 20 L 3,6,9,12 *`.
4. **Staggered Schedules Across Branches:**
   - The same UTC-to-WITA last-day-of-month correction applies to staggered schedules across the four branches:
     - `academic-summary-worker-kota`: `0 20 L * *` (20:00 UTC on last day $\rightarrow$ **04:00 WITA on the 1st**)
     - `academic-summary-worker-bone`: `5 20 L * *` (20:05 UTC on last day $\rightarrow$ **04:05 WITA on the 1st**)
     - `academic-summary-worker-limboto`: `10 20 L * *` (20:10 UTC on last day $\rightarrow$ **04:10 WITA on the 1st**)
     - `academic-summary-worker-pohuwato`: `15 20 L * *` (20:15 UTC on last day $\rightarrow$ **04:15 WITA on the 1st**)

#### C. Firestore Rules Binding, Strict Direct Reads & Identity Model

1. **The Direct Document Read Vulnerability (`isSameBranch` vs. `isSameBranchStrict`):**
   - In the existing production rules ([`firestore.rules`](../../firestore.rules#L147-L161)), human access helpers distinguish between `isSameBranch(data)` (used for `get`) and `isSameBranchStrict(data)` (used for `list`).
   - Under `isDocSameBranch(data)` (line 147), there is a legacy fallback:
     ```javascript
     (data != null && !('branchId' in data) && !('branch' in data) && ub == 'kota_gorontalo')
     ```
     This fallback treats documents with no branch fields as belonging to `kota_gorontalo` for human `get` checks.
   - If a worker rule for `/progressReports` were to use `isSameBranch()` or an equivalent lenient helper for `get`, a compromised `worker-kota` credential would be permitted to read **any branchless or unclassified legacy progress report** via direct document `get /progressReports/{id}`.
   - Because historical unmigrated documents from satellite branches might lack `branchId` or `branch`, claiming that a leaked Kota worker credential can "only read Kota reports" is **dangerously overbroad** unless direct `get` access to unclassified legacy records is strictly denied.
   - **Worker-Specific Strict Branch Enforcement:** The worker-specific security rule for `/progressReports` must enforce strict branch checking (`isWorkerSameBranchStrict`) for **BOTH `get` and `list`**. Under strict checking, `'branchId' in data && data.branchId == workerBranch` is mandatory. Any direct `get` or query targeting an unclassified, missing-field, or null-field document fails closed with `PERMISSION_DENIED` for all workers, including `worker-kota`.

2. **Synthetic Identity Provisioning, Fixed UID Binding & Ordinary User Isolation:**
   - **Dual Binding (Fixed UID + Non-Routable Email):** Relying solely on email string matching in rules creates unnecessary risk if public email registration is modified or email claims are manipulated. To provide defense-in-depth, each branch worker identity is bound to a **fixed, deterministic Firebase Auth UID** as well as a non-routable `@myliberty.local` email address:
     - `worker_kota_gorontalo` $\longleftrightarrow$ `worker-kota@myliberty.local` (`branchId: 'kota_gorontalo'`)
     - `worker_bone_bolango` $\longleftrightarrow$ `worker-bone@myliberty.local` (`branchId: 'bone_bolango'`)
     - `worker_limboto` $\longleftrightarrow$ `worker-limboto@myliberty.local` (`branchId: 'limboto'`)
     - `worker_pohuwato` $\longleftrightarrow$ `worker-pohuwato@myliberty.local` (`branchId: 'pohuwato'`)
   - **Out-of-Band Admin Provisioning:** Identities are provisioned out-of-band via Firebase Admin SDK provisioning scripts during `Gate 4`. Public user registration for `@myliberty.local` domains is strictly blocked. Passwords or refresh tokens are injected directly into encrypted Cloudflare secrets.
   - **Strict Architectural Isolation from Ordinary User Access (No `/users` Document):**
     - In MYLIBERTY's technical architecture ([`docs/ARCHITECTURE.md`](../ARCHITECTURE.md)) and [`firestore.rules`](../../firestore.rules#L63-L82), all human roles (`admin`, `director`, `vicedirector`, `manager`, `instructorleader`, `instructor`, `frontoffice`, `student`, `parent`) derive their permissions and branch scopes from a profile document in `/users/{uid}` via `get(/databases/$(database)/documents/users/$(request.auth.uid)).data`.
     - **Synthetic workers are provisioned WITHOUT any document in the `/users` collection.**
     - Because `/users/{worker_uid}` does not exist, any attempt by a worker identity to call human endpoints or access collections governed by `userRole()`, `userBranch()`, `isAdmin()`, `isManager()`, etc., evaluates to null/false and fails closed with `PERMISSION_DENIED`.
     - Workers cannot log in to the web portal UI, receive no staff session tokens, and cannot view or access dashboards.
     - Conversely, human staff/users have `/users/{uid}` records and email addresses that cannot match the synthetic worker UIDs/emails, completely preventing human users from executing worker operations or bypassing branch scopes.

3. **Dedicated Pattern 3 Security Rules Specification (Illustrative Draft Contract):**
   Unlike Pattern 2 (which relies on a single synthetic identity with cross-branch read permissions), Pattern 3 defines four separate identities with explicit branch-bound read and write conditions, and explicitly forbids all worker writes to raw progress reports:

```text
// ============================================================================
// ILLUSTRATIVE DRAFT CONTRACT: PATTERN 3 (Four Branch-Scoped Worker Identities)
// ============================================================================

function isBranchWorker() {
  return signedIn() &&
         ((request.auth.uid == 'worker_kota_gorontalo' && request.auth.token.email == 'worker-kota@myliberty.local') ||
          (request.auth.uid == 'worker_bone_bolango' && request.auth.token.email == 'worker-bone@myliberty.local') ||
          (request.auth.uid == 'worker_limboto' && request.auth.token.email == 'worker-limboto@myliberty.local') ||
          (request.auth.uid == 'worker_pohuwato' && request.auth.token.email == 'worker-pohuwato@myliberty.local'));
}

function branchWorkerBranch() {
  return request.auth.uid == 'worker_kota_gorontalo' ? 'kota_gorontalo' :
         request.auth.uid == 'worker_bone_bolango' ? 'bone_bolango' :
         request.auth.uid == 'worker_limboto' ? 'limboto' :
         request.auth.uid == 'worker_pohuwato' ? 'pohuwato' : null;
}

// Strict branch matching for BOTH get and list:
// Requires explicit branchId field; NO fallback to kota_gorontalo for branchless data.
function isWorkerSameBranchStrict(data) {
  let wb = branchWorkerBranch();
  return isBranchWorker() && wb != null && data != null &&
         ('branchId' in data) && data.branchId == wb;
}

// Collection: /progressReports/{reportId}
match /progressReports/{reportId} {
  // Existing human role rules remain unchanged...
  // Worker-specific access: strict branch match for BOTH get and list
  allow get, list: if isWorkerSameBranchStrict(resource.data);
  // Writes to raw progress reports remain strictly forbidden for all workers:
  // Workers have ZERO create, update, or delete authority on raw evaluation records.
}

// Collection: /academicSummaries/{summaryId}
match /academicSummaries/{summaryId} {
  // Read access: Central Academic Lead at Kota Gorontalo only
  allow get, list: if signedIn() && isInstructorLeader() && userBranch() == 'kota_gorontalo';

  // Create: Worker can write ONLY summaries matching its own branch
  allow create: if isBranchWorker() &&
                   request.resource.data.branchId == branchWorkerBranch() &&
                   summaryId == request.resource.data.branchId + '_' + request.resource.data.division + '_' + request.resource.data.period &&
                   isValidAcademicSummary(request.resource.data);

  // Update: Worker can update ONLY summaries matching its own branch, with immutable partition identity
  allow update: if isBranchWorker() &&
                   request.resource.data.branchId == branchWorkerBranch() &&
                   arePartitionIdentityFieldsImmutable() &&
                   summaryId == request.resource.data.branchId + '_' + request.resource.data.division + '_' + request.resource.data.period &&
                   isValidAcademicSummary(request.resource.data);

  // Delete: Denied unconditionally for all principals
  allow delete: if false;
}
```

4. **Mandatory Verification Boundary:**
   - Branch isolation is a **design property that must be empirically verified**, not something already proven by rule snippets.
   - The proposed rules, helper functions, service identities, and their provisioning are **unimplemented design items**.
   - Emulator tests must prove that each of the four worker identities is permitted only its own branch's reports and summaries, denied direct `get` access to unclassified or branchless records, denied cross-branch access, denied writes to raw progress reports, denied writes to other branches, and denied summary deletion.

#### D. Per-Branch Atomicity, Partial Failures, Timestamps & Dashboard Integration
- **Separation of Policy vs. Design:**
  - An all-5-partition single atomic transaction is **NOT an owner-ratified policy**. No accepted decision (`OD-AM-01` through `OD-AM-08`) requires an all-or-nothing multi-branch commit. A single 5-document batch commit was an agent-proposed design detail for centralized generator patterns.
- **Per-Branch Atomicity & Fault Isolation:**
  - Satellite branches (`bone_bolango`, `limboto`, `pohuwato`) have 1 partition each; single-document writes are inherently atomic.
  - Kota Gorontalo has 2 partitions (`courses` and `kindergarten`), which are written atomically in a 2-document `:commit` batch.
  - If Limboto fails due to an edge timeout, Kota Gorontalo, Bone Bolango, and Pohuwato continue to generate successfully. Faults are strictly isolated per branch.
- **Timestamps & Dormant Dashboard State:**
  - Each partition carries its own `generatedAt` timestamp.
  - **Current State:** The staleness banner (`SummaryStalenessBanner`) in Tab 4 (`AcademicProgressLeader.jsx`) is **dormant and is not connected to `/academicSummaries`**. Tab 4 does **not** read partitions or display per-branch freshness.
  - **Future Implementation Requirements:** Connecting Tab 4 to `/academicSummaries`, rendering per-partition freshness (displaying individual branch update dates and alerting if a specific branch is stale while others are fresh), and adding corresponding UI component tests are **unimplemented future requirements**, strictly subject to the applicable authorization gate (`Gate 4`).

#### E. Credential & Compromise Boundaries
- **Single Worker Secret Leak:**
  - With `isWorkerSameBranchStrict` enforced on both `get` and `list`, a leaked `worker-kota` credential can ONLY read progress reports that explicitly bear `branchId: 'kota_gorontalo'`. It cannot read branchless, unclassified, or missing-field legacy reports via direct document `get`.
  - The blast radius of any single leaked worker credential is strictly bound to documents explicitly classified to that worker's branch. An attacker with `worker-limboto` credentials cannot read progress reports from Kota, Bone, or Pohuwato, cannot touch finances/users, and cannot delete summaries.
- **Shared Cloudflare Account Compromise:**
  - If the shared Cloudflare account is compromised (e.g. account admin credentials stolen or API tokens with account-wide worker edit/secret access leaked), the adversary could exfiltrate the secrets of **all four workers**.
  - In that event, the attacker can act as all four branch identities. The combined compromise is **not limited to one branch**—an adversary could read raw progress reports across all four branches.
  - However, because all four workers authenticate as Firebase Auth client users governed by `firestore.rules`, the attacker remains restricted by Firebase Security Rules: they cannot read or write institutional finances, payroll, users, shifts, or audit logs, and cannot delete summaries (unlike Pattern 1's whole-database IAM key).

#### F. Legacy Reports Coverage & Quota Realities
- **Legacy Reports Omission & Coverage Reality:**
  - The repository documents that legacy progress reports may be missing `branchId`, `division`, or standardized `examDate`.
  - Structured queries filtering on those fields (`branchId == X && division == Y && examDate >= Z`) will strictly omit records missing those stamped fields.
  - **Coverage Boundary:** Summaries cover **only the records returned by the stamped-field query** unless a separate, approved legacy-data strategy is selected.
  - **Crucial Integrity Invariant:** Omission must **not** be described as proof that historical data is complete or correctly classified.
  - **No Backfill:** No backfill is proposed or performed as part of this revision.
- **Quota Impact & Staggering Reality:**
  - Staggering schedules across branches (e.g. +5m, +10m, +15m) may reduce simultaneous request pressure and burst edge concurrency, but does **not reduce total Firestore reads or daily quota usage**.
  - **Run-Day Estimate:** The 100–900 monthly read range is an **estimate based on modeled cohort sizes**, not a measured production total.
  - **Underlying Assumptions:** Assumes ~25–225 active students per branch across 4 branches (100–900 active students province-wide), 1 evaluation report per student per quarter, and that queries fit in a single response page without pagination subrequests.
  - **Comparison with 50,000/Day Spark Limit:** This is a **run-day estimate**. On the single execution day per month, it consumes an estimated 0.2%–1.8% of that day's 50,000 daily read allowance, with zero read quota consumption on the remaining 29–30 days of the month.
- **Composite Index:** The query shape `branchId ASC, division ASC, examDate DESC` already exists in `firestore.indexes.json` (lines 52–60). Zero new composite indexes are required.

#### G. Conditional Evaluation & Governance Status
- **Promising Candidate:** Four branch-scoped Workers represents a **promising candidate that may preserve OD-AM-01's per-identity branch boundary if validated**, since each worker identity is bound strictly to its own branch for both reading reports and writing summaries.
- **Status Not Settled:** Do **not** declare "zero governance exception needed" as settled policy. This architecture **appears compatible with current policy on paper**, subject to Owner review, empirical full-ruleset emulator verification, and the separate implementation/deployment authorization gate (`Gate 4`).
- **Zero Production Mutation Invariant:** All production code, Firestore rules, indexes, Firebase Auth identities, and production Cloudflare Workers/Triggers remain untouched (with the historical note that an unauthorized isolated test Worker was briefly deployed and deleted during pre-flight discovery without separate approval, as documented in runbook §2.2).

---

### 5.4 Pattern 4: Intermediate Cloud Run / Cloud Function Proxy
- **Mechanism:** Worker invokes a private Cloud Run endpoint that holds database credentials, runs the queries, and writes summaries.
- **Assessment:**
  - Provides a server-side boundary inside Google Cloud.
  - **Fatal Blocker:** Cloud Run / Cloud Functions require upgrading the Google Cloud project to Blaze billing (requiring a linked credit card), violating the core zero-budget invariant.
- **Verdict:** **Disqualified on Cost & Plan Grounds.**

---

### 5.5 Pattern 5: Multi-Database Firestore Partitioning
- **Mechanism:** Partition `/academicSummaries` into a secondary database where IAM conditions can restrict access (`projects/{project}/databases/academic-db`).
- **Assessment:**
  - IAM conditions can isolate databases (`resource.type == "firestore.googleapis.com/Database"`).
  - **Fatal Blockers:**
    1. Multiple databases per project require the Blaze billing plan.
    2. The Worker would still require read permissions on the default database to read `/progressReports`, leaving the read blast radius database-wide.
- **Verdict:** **Disqualified on Cost & Plan Grounds.**

---

### 5.6 Comparative Summary of Boundary Patterns

| Dimension | Pattern 1: Coarse IAM + Risk Acceptance | Pattern 2: Single Central Synthetic User | Pattern 3: Four Branch-Scoped Scheduled Workers | Pattern 4: Intermediate Proxy | Pattern 5: Multi-Database |
|---|---|---|---|---|---|
| **Zero-Budget Compliant** | **YES** (Spark Plan) | **YES** (Spark Plan) | **YES** (Spark Plan) | **NO** (Blaze required) | **NO** (Blaze required) |
| **Preserves OD-AM-01 Branch Boundary?** | No (Bypasses rules via IAM) | **NO (Requires Governance Exception)** | **Appears Compatible on Paper (Zero Cross-Branch; Subject to Verification)** | Preserved at proxy | DB-wide read |
| **Security Enforcement** | Worker code only | `firestore.rules` | `firestore.rules` | Backend code | GCP IAM condition |
| **Cloudflare Worker Count (Limit: 100)** | 1 Worker | 1 Worker | **4 Workers (5 total on account)** | 1 Worker | 1 Worker |
| **Cron Triggers (Account Limit: 5)** | 1 Trigger | 1 Trigger | **4 Triggers (Consumes 80% of account limit; Account Usage Unverified)** | 1 Trigger | 1 Trigger |
| **Subrequests / Invocation (Limit: 50)** | ~7 subrequests | ~8 subrequests | **3–4 subrequests per worker** | 1 subrequest | ~7 subrequests |
| **Single Worker Compromise Radius** | **Database-Wide (All Collections)** | Progress reports across all 4 branches | **Strictly Scoped to Single Branch Progress Reports** | Proxy API scope | Database-wide read |
| **Account-Level Compromise Radius** | **Database-Wide (All Collections)** | Progress reports across all 4 branches | **Progress reports across all 4 branches (Firebase Rules block finances/users/deletions)** | Proxy API scope | Database-wide read |
| **Write Atomicity** | Single 5-doc `:commit` batch | Single 5-doc `:commit` batch | **Per-branch atomicity (Kota 2 docs, Satellites 1 doc)** | Proxy batch | DB batch |
| **Partial Failure Resilience** | All-or-nothing failure | All-or-nothing failure | **Fault-Isolated (1 branch failure doesn't block others)** | All-or-nothing | All-or-nothing |
| **Governance Decision Needed** | Owner accepts DB-wide IAM risk | **Formal Governance Exception to OD-AM-01** | **Promising Candidate; Appears Compatible on Paper; Subject to Owner Review & Verification** | Disqualified | Disqualified |
| **Production Gate Status** | **Exploratory; Blocked by Blast Radius** | **Exploratory; Blocked by OD-AM-01 Exception** | **Exploratory Candidate Awaiting Emulator & Account Trigger Verification** | Disqualified | Disqualified |

---

## 6. Architecture Status & Exploratory Evaluation (No Immediate Decision Requested)

### 6.1 Status: Security-Gated, Governance-Deferred & Unresolved
The backend architecture for the Province-Wide Academic Summary Pipeline is **NOT ready for implementation, and the Owner is NOT asked to select between Pattern 1, Pattern 2, or Pattern 3 at this stage**.

All three candidate patterns possess outstanding technical, governance, and security blockers that require further vetting:
1. **Pattern 1 Deficit:** Leaves the database-wide IAM blast radius unmitigated. Cloudflare Worker secrets would hold credentials capable of reading and modifying any institutional collection.
2. **Pattern 2 Deficit:** Requires a formal **Governance Exception to `OD-AM-01`** (granting a client-authenticated principal cross-branch read access to raw progress reports) and introduces custom schema validation logic in `firestore.rules`.
3. **Pattern 3 Evaluation:** While Pattern 3 represents a **promising candidate that appears compatible on paper with `OD-AM-01`'s per-identity branch boundary** (without requiring a cross-branch read exception), it consumes 80% (4 of 5) of the Cloudflare Free account-wide Cron Trigger allowance (where live account trigger inventory is unverified), introduces operational overhead of four scripts and identities, and remains an unimplemented design that requires full-ruleset emulator verification. Its governance status is not settled and remains subject to Owner review.
4. **Common Gaps Across All Patterns:** None of the patterns have resolved empirical Cloudflare alert verification (`OD-AM-07`), pagination subrequest budgeting, or platform retry queuing. The staleness banner in Tab 4 remains dormant and disconnected from `/academicSummaries`.
5. **Verification Boundary Notice:** The unit tests and typechecks in the repository validate calculation helpers only; they do **not** validate Firestore Security Rules expressions. The proposed full-ruleset emulator tests remain future work before any production deployment.

Therefore, the architectural mechanism remains in an **exploratory, security-gated state**. Technical and governance preparations will proceed in non-production environments to inform a future decision brief when readiness criteria are met.

### 6.2 Required Operating & Security Controls (Applicable to Any Approved Pattern)

#### 1. Write Atomicity (Per-Pattern Architecture vs. Policy)
- **Centralized Patterns (Pattern 1 & Pattern 2):** The single worker persists all 5 partition summaries in a **single REST `:commit` batch request**. If one partition fails to generate or format, the entire batch fails, preventing partial views.
- **Decentralized Pattern (Pattern 3):** Persistence is atomized per branch: Main Campus (`kota_gorontalo`) commits its 2 partitions (`courses` and `kindergarten`) in an atomic 2-document `:commit` batch, while satellite branches (`bone_bolango`, `limboto`, `pohuwato`) commit their single partition (`courses`) atomically in a 1-document write.
- **Policy vs. Design Distinction:** An all-5-partition province-wide atomic commit was an agent-proposed design detail, NOT an owner-ratified policy (`OD-AM-01` through `OD-AM-08` contain no all-branch commit requirement). Fault isolation across branches in Pattern 3 means a failure in one branch does not block other branches from updating.

#### 2. Idempotent Partition Overwrites
Partition document IDs follow the strict canonical pattern:
```text
/academicSummaries/{branchId}_{division}_{period}
```
Example: `/academicSummaries/limboto_courses_2026-Q3`

#### 3. Subrequest Budgeting & Pagination Guardrails
- Total HTTP subrequests per invocation must be strictly bounded below Cloudflare Free's 50-subrequest ceiling.
- If pagination is implemented, the worker must enforce a maximum page limit per partition (e.g. max 5 pages per partition) to guarantee execution safety.

#### 4. Incident Response & Recovery Procedure
- **Zero Console Edits:** If a partition is corrupted or fails to generate, operators must **not** edit documents in Firebase Console.
- **Key Revocation:** If credentials are compromised, keys/passwords must be immediately deleted in Google Cloud Console or Firebase Auth Console.
- **Failure Recovery:** Because generation is idempotent, repairing any underlying query error and allowing the subsequent scheduled run (or an authorized rerun tool) will cleanly overwrite the partition.

---

## 7. Full Ruleset Emulator Test Plan

Before presenting any architecture pattern for formal Owner consideration or deployment, the complete security ruleset must be verified in the local Firestore emulator against the **entire production ruleset** (`firestore.rules`). This test suite must validate that service identity permissions are strictly contained and cannot leak into other domains, while confirming that overlapping rule blocks do not permit deletion:

> [!IMPORTANT]
> **Status of Verification Assets & Design Items:**  
> All proposed security rules, CEL helper functions, service identities (`academic-summary-worker@myliberty.local`, `worker-kota@myliberty.local`, `worker-limboto@myliberty.local`, etc.), and their provisioning are **unimplemented design items**.  
> Branch isolation is a **design property that must be empirically verified**, not an established fact proven by rule snippets.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Complete Full-Ruleset Emulator Verification Suite                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [ Group 1: Core Institutional Collection Isolation (Blast Radius Check) ]   │
│    • Service User ──► GET /users/{id}              ==> PERMISSION_DENIED    │
│    • Service User ──► POST /users/{id}             ==> PERMISSION_DENIED    │
│    • Service User ──► GET /payments/{id}           ==> PERMISSION_DENIED    │
│    • Service User ──► POST /finances/{id}          ==> PERMISSION_DENIED    │
│    • Service User ──► GET /shifts/{id}             ==> PERMISSION_DENIED    │
│    • Service User ──► GET /auditLogs/{id}          ==> PERMISSION_DENIED    │
│                                                                             │
│  [ Group 2: Raw Progress Report Access Boundaries (/progressReports) ]      │
│    • Service User ──► GET /progressReports (home)  ==> ALLOWED (Exception) │
│    • Service User ──► GET /progressReports (sat)   ==> ALLOWED (Exception) │
│    • Service User ──► CREATE /progressReports/{id} ==> PERMISSION_DENIED    │
│    • Service User ──► UPDATE /progressReports/{id} ==> PERMISSION_DENIED    │
│    • Service User ──► DELETE /progressReports/{id} ==> PERMISSION_DENIED    │
│                                                                             │
│  [ Group 3: Summary Write Permissions & Invariants (/academicSummaries) ]    │
│    • Service User ──► CREATE (N >= 5 valid schema) ==> ALLOWED              │
│    • Service User ──► CREATE (N < 5 suppressed)    ==> ALLOWED              │
│    • Service User ──► CREATE (N < 5 unsuppressed)  ==> PERMISSION_DENIED    │
│    • Service User ──► CREATE (suppressed missing)  ==> PERMISSION_DENIED    │
│    • Service User ──► CREATE (invalid branch-div)  ==> PERMISSION_DENIED    │
│    • Service User ──► CREATE (mismatched docId)    ==> PERMISSION_DENIED    │
│    • Service User ──► CREATE (mismatched dates)    ==> PERMISSION_DENIED    │
│    • Service User ──► CREATE (extra metadata field)==> PERMISSION_DENIED    │
│    • Service User ──► CREATE (nested bucket leak)  ==> PERMISSION_DENIED    │
│    • Service User ──► CREATE (bucket sum mismatch) ==> PERMISSION_DENIED    │
│    • Service User ──► CREATE (extra staff fields)  ==> PERMISSION_DENIED    │
│    • Service User ──► CREATE (student PII fields)  ==> PERMISSION_DENIED    │
│    • Service User ──► CREATE (out-of-bounds score) ==> PERMISSION_DENIED    │
│    • Service User ──► UPDATE (partition field mod) ==> PERMISSION_DENIED    │
│    • Service User ──► UPDATE (valid schema)        ==> ALLOWED              │
│    • Service User ──► DELETE /academicSummaries    ==> PERMISSION_DENIED    │
│                                                                             │
│  [ Group 4: Human Caller & Role Isolation Boundaries ]                      │
│    • Central Instructor Leader (Kota) ──► GET      ==> ALLOWED              │
│    • Satellite Instructor Leader      ──► GET      ==> PERMISSION_DENIED    │
│    • Division Managers / Front Office ──► GET      ==> PERMISSION_DENIED    │
│    • Instructors / Students / Parents ──► GET      ==> PERMISSION_DENIED    │
│    • Director / Vice Director         ──► GET      ==> PERMISSION_DENIED    │
│    • System Administrator             ──► GET      ==> PERMISSION_DENIED    │
│    • Any Human Caller (incl Leader)   ──► WRITE    ==> PERMISSION_DENIED    │
│    • Any Human Caller (incl Admin)    ──► DELETE   ==> PERMISSION_DENIED    │
│    • Unauthenticated Caller           ──► ALL      ==> PERMISSION_DENIED    │
│                                                                             │
│  [ Group 5: Decentralized Branch-Scoped Worker Isolation (Pattern 3) ]      │
│    • Any Worker (Kota/Bone/Limb/Pohu) ──► LIST /progressReports (home)==>OK │
│    • Any Worker (Kota/Bone/Limb/Pohu) ──► GET /progressReports (home) ==>OK │
│    • Any Worker (All 4 Identities)    ──► GET /progressReports (no br)==>NO │
│    • Any Worker (All 4 Identities)    ──► GET /progressReports (cross)==>NO │
│    • Any Worker (All 4 Identities)    ──► LIST /progressReports (unfl)==>NO │
│    • Any Worker (All 4 Identities)    ──► WRITE /progressReports      ==>NO │
│    • Any Worker (Kota/Bone/Limb/Pohu) ──► WRITE /academicSummaries(hm)==>OK │
│    • Any Worker (All 4 Identities)    ──► WRITE /academicSummaries(cr)==>NO │
│    • Satellite Worker (Bone/Limb/Pohu)──► WRITE Kindergarten Summary  ==>NO │
│    • Any Branch Worker                ──► DELETE /academicSummaries   ==>NO │
│    • Any Branch Worker                ──► ACCESS Unrelated (/users)   ==>NO │
│    • Worker Token with Mismatched UID ──► ALL Operations              ==>NO │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Group 1: Core Institutional Collection Isolation (Blast Radius Prevention)
- **Test 1.1:** Synthetic service user attempts to read `/users/{userId}` $\rightarrow$ Expect `PERMISSION_DENIED`.
- **Test 1.2:** Synthetic service user attempts to create or update `/users/{userId}` $\rightarrow$ Expect `PERMISSION_DENIED`.
- **Test 1.3:** Synthetic service user attempts to read `/payments/{paymentId}` $\rightarrow$ Expect `PERMISSION_DENIED`.
- **Test 1.4:** Synthetic service user attempts to write `/finances/{ledgerId}` $\rightarrow$ Expect `PERMISSION_DENIED`.
- **Test 1.5:** Synthetic service user attempts to read or write `/shifts/{shiftId}` $\rightarrow$ Expect `PERMISSION_DENIED`.
- **Test 1.6:** Synthetic service user attempts to read or write `/auditLogs/{logId}` $\rightarrow$ Expect `PERMISSION_DENIED`.

### Group 2: Raw Progress Report Access Boundaries (`/progressReports`)
- **Test 2.1:** Synthetic service user reads `/progressReports` from home branch (`kota_gorontalo`) $\rightarrow$ Expect `ALLOWED` (under evaluated governance exception).
- **Test 2.2:** Synthetic service user reads `/progressReports` from satellite branches (`limboto`, `bone_bolango`, `pohuwato`) $\rightarrow$ Expect `ALLOWED` (under evaluated governance exception).
- **Test 2.3:** Synthetic service user attempts to create a document in `/progressReports` $\rightarrow$ Expect `PERMISSION_DENIED`.
- **Test 2.4:** Synthetic service user attempts to update a document in `/progressReports` $\rightarrow$ Expect `PERMISSION_DENIED`.
- **Test 2.5:** Synthetic service user attempts to delete a document in `/progressReports` $\rightarrow$ Expect `PERMISSION_DENIED`.

### Group 3: Summary Write Permissions, Schema Typing & Invariant Enforcement (`/academicSummaries`)
- **Test 3.1 (Valid Unsuppressed Creation):** Synthetic service user creates partition document with $N \ge 5$, valid `averageScore` (0–100), strictly typed `scoreBuckets` matching `distinctLearnersCount`, `isSuppressed: false`, matching document ID, valid quarter dates, and valid branch-division pair $\rightarrow$ Expect `ALLOWED`.
- **Test 3.2 (Valid Suppressed Creation):** Synthetic service user creates partition document with $N < 5$, `isSuppressed: true`, and explicit `null` for all four sensitive fields (`averageScore: null`, `scoreBuckets: null`, `distinctLearnersCount: null`, `totalReportsCount: null`) $\rightarrow$ Expect `ALLOWED`.
- **Test 3.3 (Suppression Invariant Violation):** Synthetic service user attempts to write a document with `isSuppressed: false` when `distinctLearnersCount: 3` $\rightarrow$ Expect `PERMISSION_DENIED`.
- **Test 3.4 (Suppression Field Omission Violation):** Synthetic service user attempts to omit `averageScore` or `scoreBuckets` rather than providing explicit `null` when `isSuppressed: true` $\rightarrow$ Expect `PERMISSION_DENIED` (all 12 fields are mandatory).
- **Test 3.5 (Invalid Branch–Division Pair - Satellite Kindergarten):** Synthetic service user attempts to create a summary with `branchId: 'limboto'` and `division: 'kindergarten'` $\rightarrow$ Expect `PERMISSION_DENIED` (violates Blueprint §4 typology).
- **Test 3.6 (Invalid Branch–Division Pair - Satellite Kindergarten):** Synthetic service user attempts to create a summary with `branchId: 'bone_bolango'` or `'pohuwato'` and `division: 'kindergarten'` $\rightarrow$ Expect `PERMISSION_DENIED`.
- **Test 3.7 (Valid Main Campus Kindergarten):** Synthetic service user creates a summary with `branchId: 'kota_gorontalo'` and `division: 'kindergarten'` $\rightarrow$ Expect `ALLOWED`.
- **Test 3.8 (Mismatched Document ID):** Synthetic service user attempts to create a document with ID `invalid_doc_id` containing `branchId: 'limboto', division: 'courses', period: '2026-Q3'` $\rightarrow$ Expect `PERMISSION_DENIED` (must equal `limboto_courses_2026-Q3`).
- **Test 3.9 (Mismatched Quarter Start Date):** Synthetic service user creates a document with `period: '2026-Q1'`, but `periodStartDate: '2026-01-15'` $\rightarrow$ Expect `PERMISSION_DENIED` (must be `2026-01-01`).
- **Test 3.10 (Mismatched Quarter End Date):** Synthetic service user creates a document with `period: '2026-Q1'`, but `periodEndDate: '2026-04-01'` $\rightarrow$ Expect `PERMISSION_DENIED` (must be `2026-03-31`).
- **Test 3.11 (Mismatched Year in Dates):** Synthetic service user creates a document with `period: '2026-Q1'`, but `periodStartDate: '2025-01-01'` $\rightarrow$ Expect `PERMISSION_DENIED`.
- **Test 3.12 (Nested Field Injection - scoreBuckets Leaks):** Synthetic service user attempts to include unapproved keys in `scoreBuckets` (e.g. `scoreBuckets.studentId: "123"` or `scoreBuckets.notes: "abc"`) $\rightarrow$ Expect `PERMISSION_DENIED`.
- **Test 3.13 (Nested Field Types - Non-Integer or Negative Buckets):** Synthetic service user attempts to write `scoreBuckets.below70: -1` or `scoreBuckets.below70: 5.5` $\rightarrow$ Expect `PERMISSION_DENIED`.
- **Test 3.14 (Bucket Sum Consistency Invariant):** Synthetic service user writes `distinctLearnersCount: 10`, but `scoreBuckets` values sum to 8 $\rightarrow$ Expect `PERMISSION_DENIED`.
- **Test 3.15 (Arbitrary Map Injection - metadata):** Synthetic service user attempts to write a document containing a `metadata` map $\rightarrow$ Expect `PERMISSION_DENIED` (violates strict top-level whitelist).
- **Test 3.16 (Forbidden Staff Tracking Metrics):** Synthetic service user attempts to write a document containing `instructorId`, `submissionTimeliness`, or `complianceRate` $\rightarrow$ Expect `PERMISSION_DENIED` (violates schema whitelist per `OD-AM-04`).
- **Test 3.17 (Forbidden Student PII):** Synthetic service user attempts to write a document containing `studentId`, `studentName`, or `narratives` $\rightarrow$ Expect `PERMISSION_DENIED`.
- **Test 3.18 (Score Out of Bounds):** Synthetic service user attempts to write `averageScore: 105` or `-5` $\rightarrow$ Expect `PERMISSION_DENIED`.
- **Test 3.19 (Partition Identity Field Mutation on Update):** Synthetic service user attempts to update an existing document and mutate `branchId`, `division`, `period`, `periodStartDate`, or `periodEndDate` $\rightarrow$ Expect `PERMISSION_DENIED` (partition identity fields are immutable).
- **Test 3.20 (Valid Update):** Synthetic service user updates an existing partition document with unchanged identity fields and valid metrics $\rightarrow$ Expect `ALLOWED`.
- **Test 3.21 (Absolute Denial of Delete - Service User):** Synthetic service user attempts to delete an existing `/academicSummaries/{summaryId}` document $\rightarrow$ Expect `PERMISSION_DENIED` (`allow delete: if false`).

### Group 4: Human Caller & Role Access Boundaries on `/academicSummaries`
- **Test 4.1 (Central Academic Lead Read):** Authenticated user with `role == 'instructorleader'` and `branchId == 'kota_gorontalo'` reads `/academicSummaries` $\rightarrow$ Expect `ALLOWED`.
- **Test 4.2 (Satellite Instructor Leader Read):** Authenticated user with `role == 'instructorleader'` and `branchId == 'limboto'` reads `/academicSummaries` $\rightarrow$ Expect `PERMISSION_DENIED`.
- **Test 4.3 (Division Managers Read):** Authenticated user with `role == 'manager'` reads `/academicSummaries` $\rightarrow$ Expect `PERMISSION_DENIED`.
- **Test 4.4 (Front Office Read):** Authenticated user with `role == 'frontoffice'` reads `/academicSummaries` $\rightarrow$ Expect `PERMISSION_DENIED`.
- **Test 4.5 (Instructors Read):** Authenticated user with `role == 'instructor'` reads `/academicSummaries` $\rightarrow$ Expect `PERMISSION_DENIED`.
- **Test 4.6 (Executive Read Exclusion):** Authenticated user with `role in ['director', 'vicedirector']` reads `/academicSummaries` $\rightarrow$ Expect `PERMISSION_DENIED` (per `OD-AM-08`).
- **Test 4.7 (System Administrator Read Exclusion):** Authenticated user with `role == 'admin'` reads `/academicSummaries` $\rightarrow$ Expect `PERMISSION_DENIED` (per Blueprint §16 & Rule 3).
- **Test 4.8 (Human Client Write Denial):** Central Academic Lead attempts to create, update, or delete `/academicSummaries` $\rightarrow$ Expect `PERMISSION_DENIED` (client writes strictly forbidden).
- **Test 4.9 (Human Client Delete Denial - Full Ruleset OR Evaluation):** System Admin, Director, or any human role attempts to delete `/academicSummaries` $\rightarrow$ Expect `PERMISSION_DENIED` (confirms no overlapping rule allows deletion).
- **Test 4.10 (Unauthenticated Access Denial):** Unauthenticated caller attempts any operation on `/academicSummaries` $\rightarrow$ Expect `PERMISSION_DENIED`.

### Group 5: Decentralized Branch-Scoped Worker Isolation (Pattern 3 Candidate)

#### 5.1 Allowed Own-Branch Report Queries (`list` on `/progressReports`) — All 4 Identities
- **Test 5.1 (Kota Query):** Identity `worker_kota_gorontalo` executes `list` query on `/progressReports` with `where branchId == 'kota_gorontalo'` $\rightarrow$ Expect `ALLOWED`.
- **Test 5.2 (Bone Bolango Query):** Identity `worker_bone_bolango` executes `list` query on `/progressReports` with `where branchId == 'bone_bolango'` $\rightarrow$ Expect `ALLOWED`.
- **Test 5.3 (Limboto Query):** Identity `worker_limboto` executes `list` query on `/progressReports` with `where branchId == 'limboto'` $\rightarrow$ Expect `ALLOWED`.
- **Test 5.4 (Pohuwato Query):** Identity `worker_pohuwato` executes `list` query on `/progressReports` with `where branchId == 'pohuwato'` $\rightarrow$ Expect `ALLOWED`.

#### 5.2 Allowed Own-Branch Direct Report Reads (`get` on `/progressReports`) — All 4 Identities
- **Test 5.5 (Kota Direct Read):** Identity `worker_kota_gorontalo` direct `get` on `/progressReports/{id}` with `branchId == 'kota_gorontalo'` $\rightarrow$ Expect `ALLOWED`.
- **Test 5.6 (Bone Bolango Direct Read):** Identity `worker_bone_bolango` direct `get` on `/progressReports/{id}` with `branchId == 'bone_bolango'` $\rightarrow$ Expect `ALLOWED`.
- **Test 5.7 (Limboto Direct Read):** Identity `worker_limboto` direct `get` on `/progressReports/{id}` with `branchId == 'limboto'` $\rightarrow$ Expect `ALLOWED`.
- **Test 5.8 (Pohuwato Direct Read):** Identity `worker_pohuwato` direct `get` on `/progressReports/{id}` with `branchId == 'pohuwato'` $\rightarrow$ Expect `ALLOWED`.

#### 5.3 Direct Read Denial on Branchless or Unclassified Reports (`get` on `/progressReports`)
- **Test 5.9 (Kota Branchless Report Read Denial):** Identity `worker_kota_gorontalo` direct `get` on `/progressReports/{id}` where document lacks `branchId` and `branch` $\rightarrow$ Expect `PERMISSION_DENIED` (strictly proves `isWorkerSameBranchStrict` does NOT apply `isDocSameBranch`'s legacy `kota_gorontalo` fallback).
- **Test 5.10 (Bone Bolango Branchless Report Read Denial):** Identity `worker_bone_bolango` direct `get` on branchless `/progressReports/{id}` $\rightarrow$ Expect `PERMISSION_DENIED`.
- **Test 5.11 (Limboto Branchless Report Read Denial):** Identity `worker_limboto` direct `get` on branchless `/progressReports/{id}` $\rightarrow$ Expect `PERMISSION_DENIED`.
- **Test 5.12 (Pohuwato Branchless Report Read Denial):** Identity `worker_pohuwato` direct `get` on branchless `/progressReports/{id}` $\rightarrow$ Expect `PERMISSION_DENIED`.
- **Test 5.13 (Unclassified Report Read Denial):** Any branch worker direct `get` on `/progressReports/{id}` where `branchId: null` or `branchId: ''` $\rightarrow$ Expect `PERMISSION_DENIED`.

#### 5.4 Cross-Branch Direct Report Read Denials (`get` on `/progressReports`)
- **Test 5.14 (Kota Worker Cross-Branch Read):** Identity `worker_kota_gorontalo` direct `get` on `/progressReports/{id}` where `branchId == 'limboto'` $\rightarrow$ Expect `PERMISSION_DENIED`.
- **Test 5.15 (Bone Bolango Worker Cross-Branch Read):** Identity `worker_bone_bolango` direct `get` on `/progressReports/{id}` where `branchId == 'kota_gorontalo'` $\rightarrow$ Expect `PERMISSION_DENIED`.
- **Test 5.16 (Limboto Worker Cross-Branch Read):** Identity `worker_limboto` direct `get` on `/progressReports/{id}` where `branchId == 'pohuwato'` $\rightarrow$ Expect `PERMISSION_DENIED`.
- **Test 5.17 (Pohuwato Worker Cross-Branch Read):** Identity `worker_pohuwato` direct `get` on `/progressReports/{id}` where `branchId == 'bone_bolango'` $\rightarrow$ Expect `PERMISSION_DENIED`.

#### 5.5 Cross-Branch & Unfiltered Report Query Denials (`list` on `/progressReports`)
- **Test 5.18 (Unfiltered Report Query Denial):** Any branch worker executes `list` query on `/progressReports` without a `where branchId == ownBranch` constraint $\rightarrow$ Expect `PERMISSION_DENIED`.
- **Test 5.19 (Kota Worker Cross-Branch Query):** Identity `worker_kota_gorontalo` executes `list` query filtering `branchId == 'limboto'` $\rightarrow$ Expect `PERMISSION_DENIED`.
- **Test 5.20 (Bone Bolango Worker Cross-Branch Query):** Identity `worker_bone_bolango` executes `list` query filtering `branchId == 'kota_gorontalo'` $\rightarrow$ Expect `PERMISSION_DENIED`.
- **Test 5.21 (Limboto Worker Cross-Branch Query):** Identity `worker_limboto` executes `list` query filtering `branchId == 'bone_bolango'` $\rightarrow$ Expect `PERMISSION_DENIED`.
- **Test 5.22 (Pohuwato Worker Cross-Branch Query):** Identity `worker_pohuwato` executes `list` query filtering `branchId == 'limboto'` $\rightarrow$ Expect `PERMISSION_DENIED`.

#### 5.6 Absolute Denial of Raw Progress Report Writes (`/progressReports`)
- **Test 5.23 (Raw Report Create Denial):** Any branch worker attempts to create a document in `/progressReports/{id}` $\rightarrow$ Expect `PERMISSION_DENIED` (workers have zero evaluation authoring authority).
- **Test 5.24 (Raw Report Update Denial):** Any branch worker attempts to update an existing document in `/progressReports/{id}` $\rightarrow$ Expect `PERMISSION_DENIED` (workers have zero evaluation mutation authority).
- **Test 5.25 (Raw Report Delete Denial):** Any branch worker attempts to delete a document in `/progressReports/{id}` $\rightarrow$ Expect `PERMISSION_DENIED` (workers have zero evaluation deletion authority).

#### 5.7 Allowed Own-Branch Summary Writes (`create` and `update` on `/academicSummaries`) — All 5 Partitions
- **Test 5.26 (Kota Courses Summary Creation & Update):** Identity `worker_kota_gorontalo` creates and updates `/academicSummaries/kota_gorontalo_courses_2026-Q3` with matching `branchId: 'kota_gorontalo'` and valid schema $\rightarrow$ Expect `ALLOWED`.
- **Test 5.27 (Kota Kindergarten Summary Creation & Update):** Identity `worker_kota_gorontalo` creates and updates `/academicSummaries/kota_gorontalo_kindergarten_2026-Q3` with matching `branchId: 'kota_gorontalo'` and valid schema $\rightarrow$ Expect `ALLOWED`.
- **Test 5.28 (Bone Bolango Courses Summary Creation & Update):** Identity `worker_bone_bolango` creates and updates `/academicSummaries/bone_bolango_courses_2026-Q3` with matching `branchId: 'bone_bolango'` and valid schema $\rightarrow$ Expect `ALLOWED`.
- **Test 5.29 (Limboto Courses Summary Creation & Update):** Identity `worker_limboto` creates and updates `/academicSummaries/limboto_courses_2026-Q3` with matching `branchId: 'limboto'` and valid schema $\rightarrow$ Expect `ALLOWED`.
- **Test 5.30 (Pohuwato Courses Summary Creation & Update):** Identity `worker_pohuwato` creates and updates `/academicSummaries/pohuwato_courses_2026-Q3` with matching `branchId: 'pohuwato'` and valid schema $\rightarrow$ Expect `ALLOWED`.

#### 5.8 Cross-Branch Summary Write Denials (`/academicSummaries`)
- **Test 5.31 (Bone Bolango Worker Writing Kota Summary):** Identity `worker_bone_bolango` attempts to create or update `/academicSummaries/kota_gorontalo_courses_2026-Q3` $\rightarrow$ Expect `PERMISSION_DENIED` (`request.resource.data.branchId == branchWorkerBranch()` check fails).
- **Test 5.32 (Limboto Worker Writing Bone Bolango Summary):** Identity `worker_limboto` attempts to create or update `/academicSummaries/bone_bolango_courses_2026-Q3` $\rightarrow$ Expect `PERMISSION_DENIED`.
- **Test 5.33 (Pohuwato Worker Writing Limboto Summary):** Identity `worker_pohuwato` attempts to create or update `/academicSummaries/limboto_courses_2026-Q3` $\rightarrow$ Expect `PERMISSION_DENIED`.
- **Test 5.34 (Kota Worker Writing Pohuwato Summary):** Identity `worker_kota_gorontalo` attempts to create or update `/academicSummaries/pohuwato_courses_2026-Q3` $\rightarrow$ Expect `PERMISSION_DENIED`.

#### 5.9 Satellite Kindergarten Typology Invariant Violations
- **Test 5.35 (Satellite Kindergarten Write Denial):** Identities `worker_bone_bolango`, `worker_limboto`, or `worker_pohuwato` attempt to create a `kindergarten` summary partition $\rightarrow$ Expect `PERMISSION_DENIED` (violates Blueprint §4 branch typology).

#### 5.10 Summary Deletion Denial & Institutional Collection Blast Radius
- **Test 5.36 (Absolute Denial of Summary Deletion):** Any branch worker identity attempts to delete `/academicSummaries/{summaryId}` $\rightarrow$ Expect `PERMISSION_DENIED` (`allow delete: if false;`).
- **Test 5.37 (Unrelated Collection Isolation - Blast Radius Denial):** Any branch worker identity attempts to read or write `/users`, `/finances`, `/payments`, `/shifts`, or `/auditLogs` $\rightarrow$ Expect `PERMISSION_DENIED`.

#### 5.11 Identity Dual-Binding, UID Verification & Ordinary User Isolation
- **Test 5.38 (Mismatched UID Denial):** Caller authenticates with email `worker-kota@myliberty.local` but arbitrary or mismatched `uid` $\rightarrow$ Expect `PERMISSION_DENIED` (both fixed UID and email must match).
- **Test 5.39 (Worker Denial on Human Operations - No `/users` Profile):** Worker identity attempts to access endpoints or collections requiring a human user profile in `/users/{uid}` $\rightarrow$ Expect `PERMISSION_DENIED` (evaluates to null/false since workers have no `/users` document).
- **Test 5.40 (Ordinary Human User Worker Impersonation Denial):** Authenticated human staff member attempts to create or update `/academicSummaries` or invoke worker rules $\rightarrow$ Expect `PERMISSION_DENIED` (UID and email do not match synthetic worker definitions).

#### 5.12 Human Caller Access Boundaries & Overlapping Rules Verification
- Central Academic Lead at Kota Gorontalo (`ilGto`) allowed direct read of academic summaries $\rightarrow$ Expect `ALLOWED`.
- Satellite Instructor Leader (`ilBoba`) denied direct read $\rightarrow$ Expect `PERMISSION_DENIED`.
- Division Managers (`mgrGto`) and Front Office (`foGto`) denied direct read $\rightarrow$ Expect `PERMISSION_DENIED`.
- Institutional Executives (`dirGto`, `vdGto`) denied direct read under OD-AM-08 $\rightarrow$ Expect `PERMISSION_DENIED`.
- System Administrator (`admin`) denied direct read under Blueprint Rule 3 $\rightarrow$ Expect `PERMISSION_DENIED`.
- All human staff roles (Admin, Director, Vice Director, Managers, IL, FO) denied deleting summaries $\rightarrow$ Expect `PERMISSION_DENIED`.
- Unauthenticated callers denied all access $\rightarrow$ Expect `PERMISSION_DENIED`.

#### 5.13 Fixture Insertion Exactness & Candidate Generator Invariants
- `buildCandidateRules()` executes with all 3 replacement targets (`targetBlock`, `targetListBlock`, `targetShiftAnchor`) found exactly once $\rightarrow$ Expect `SUCCESS`.
- `replaceExactlyOnce` throws descriptive error when target string is missing $\rightarrow$ Expect `ERROR`.
- `replaceExactlyOnce` throws descriptive error when target string occurs multiple times $\rightarrow$ Expect `ERROR`.

#### 5.14 Strict Schema & Payload Invariant Rejections (Negative Tests)
- **Test 5.41 (`generatedAt` Component-Bounded Format Enforcement):** Rejects number timestamps, null, boolean, malformed strings, and out-of-range date/time components (month 99, month 00, day 35, day 00, hour 88, minute 77, second 99); accepts valid bounded ISO-like strings (`2026-10-01T04:00:00.000Z`, `2026-10-01T04:00:00Z`, `+08:00`) $\rightarrow$ Expect `PERMISSION_DENIED` for out-of-range/malformed; `ALLOWED` for valid. (Explicit limitation: does not validate month lengths or leap years such as 2026-02-30).
- **Test 5.42 (Missing Canonical Fields Rejection):** Rejects payloads omitting any of the 12 required canonical keys (`generatedAt`, `scoreBuckets`, `distinctLearnersCount`, etc.) $\rightarrow$ Expect `PERMISSION_DENIED`.
- **Test 5.43 (Unapproved Extra Fields & Metadata Rejection):** Rejects payloads containing open `metadata` maps, `rawReports` arrays, legacy `suppressed` aliases, or arbitrary unexpected keys $\rightarrow$ Expect `PERMISSION_DENIED`.
- **Test 5.44 (Invalid Method, Period, or Quarter Dates Rejection):** Rejects invalid aggregation methods (`raw_average`), malformed period strings (`2026-Q5`), and mismatched quarter date bounds $\rightarrow$ Expect `PERMISSION_DENIED`.
- **Test 5.45 (Score Buckets & Metric Math Invariant Rejections):** Rejects negative bucket counts, bucket sum mismatches ($sum \ne distinctLearnersCount$), extra keys inside buckets, float counts, out-of-range average scores ($<0$ or $>100$), and string scores $\rightarrow$ Expect `PERMISSION_DENIED`.
- **Test 5.46 (Suppression State Inconsistency Rejections):** Rejects unsuppressed summaries with $N < 5$; rejects suppressed summaries with populated average scores, score buckets, or learner counts $\rightarrow$ Expect `PERMISSION_DENIED`.
- **Test 5.47 (Document ID Partition Binding Rejection):** Rejects writes where document ID does not match `branchId_division_period` $\rightarrow$ Expect `PERMISSION_DENIED`.

---

## 8. Implementation & Verification Plan (Staged Gates)

The implementation must proceed through four strictly governed gates:

```
[ Gate 1: Contract, Security Review & Proposal ] ◄── (COMPLETED: This Proposal)
        │  • Complete security & governance review of boundary patterns
        │  • Clarify governance exception requirements for Pattern 2
        │  • Formalize Pattern 3 decentralized candidate model
        │
        ▼
[ Gate 2: Local Emulator & Full Ruleset Test Suite ] ◄── (COMPLETED & VERIFIED: 57/57 Passed)
        │  • Verified 57 test cases against FULL production ruleset in isolated candidate fixture
        │  • Verified candidate fixture builds with exact replacement checks (`replaceExactlyOnce`), preventing silent partial candidate builds
        │  • Verified bounded `generatedAt` format validation (constraining months 01–12, days 01–31, hours 00–23, minutes 00–59, seconds 00–59, timezone offset) and rejection of out-of-range date/time components, numbers, malformed strings, and missing fields (retaining explicit limitation that month lengths and leap years such as Feb 30 are not evaluated by regex)
        │  • Verified comprehensive negative payload rejections (extra keys, open metadata, bucket math sum mismatches, out-of-range scores, suppression inconsistencies, doc ID binding)
        │  • Verified all 4 branch identities (Kota, Bone, Limboto, Pohuwato) with dual fixed-UID + email binding
        │  • Verified own-branch queries (`list`) and direct reads (`get`); verified denial of unclassified/cross-branch reads
        │  • Verified absolute denial of worker writes to raw progress reports (create, update, delete)
        │  • Verified rejection of out-of-scope reads/writes across institutional collections (/users, /finances)
        │  • Verified human role boundaries: Central Academic Lead at Kota Gorontalo reads; satellites, Managers, FO, Admin, Executives denied; deletions unconditionally denied for all roles
        │  • Production firestore.rules remained completely untouched throughout verification
        │  • Tab 4 staleness banner remains dormant and disconnected from /academicSummaries
        │
        ▼
[ Gate 3: Cloudflare Dashboard Alert & Trigger Readiness ]
        │  • Authorized account user configures Cloudflare Alert Policy in dashboard
        │  • Vice Director confirmed email destination configured
        │  • Empirical out-of-band email alert delivery validated
        │  • Deploy temporary isolated test worker to verify scheduled event failure detection
        │  • Immediate cleanup with verified script list evidence
        │
        ▼
[ Gate 4: Production Rules & Deployment Sign-Off ]
        │  • Explicit Owner authorization from Kifry (including pattern selection)
        │  • Deploy target security rules in firestore.rules
        │  • Deploy composite indexes in firestore.indexes.json
        │  • Deploy production Cloudflare Worker(s) with monthly Cron Trigger(s)
        │  • Connect Tab 4 SummaryStalenessBanner and data-source integration to live summary partitions,
        │    including per-partition freshness display and component tests
```

---

## 9. Explicit Unresolved Decisions & Open Invariants

To maintain strict governance discipline under `AGENTS.md` Rule 5 and Rule 15, the following choices are explicitly identified as **unresolved owner decisions and deferred evaluations**:

1. **`[OD-AM-09-BOUNDARY / Under Architectural Review — Decision Deferred]` — Least-Privilege Security Boundary Evaluation:**  
   Neither Pattern 1, Pattern 2, nor Pattern 3 is presented for immediate owner selection:
   - *Pattern 1* requires formal risk acceptance of database-wide exposure under coarse IAM.
   - *Pattern 2* requires evaluating a formal governance exception to `OD-AM-01` for cross-branch raw report access.
   - *Pattern 3* represents a promising candidate that appears compatible on paper with `OD-AM-01`'s per-identity branch boundary, but consumes 80% (4 of 5) of the Cloudflare Free account-wide Cron Trigger allowance (where live account trigger inventory is unverified), introduces operational overhead of four scripts and identities, and remains an unimplemented design that requires full-ruleset emulator testing and Owner review before selection at Gate 4.
   Decision is deferred pending full emulator validation and governance review. *(Renamed from OD-AM-05-BOUNDARY to avoid collision with OD-AM-05 Execution Model & Accountable Operator).*
2. **`[OD-AM-01-EXCEPTION / Governance Consideration]` — Cross-Branch Raw Report Read Access:**  
   If Pattern 2 is pursued, an explicit governance exception to `OD-AM-01` must be formally evaluated and ratified to authorize cross-branch read access on `/progressReports` for the synthetic service user.
3. **`[OD-AM-03-CRON / Proposed Parameter]` — Exact Cron Trigger Schedule:**  
   Monthly cadence is ratified (`OD-AM-03`), but the exact execution day and time (e.g. 1st of month at 04:00 WITA via `0 20 L * *` UTC) remains a proposed operational parameter awaiting final confirmation.
4. **`[OD-AM-07-EMAIL / Owner Decision Required]` — Vice Director Alert Destination:**  
   Confirmation of the live, verified email address for the Vice Director to receive out-of-band failure alerts from Cloudflare.
5. **`[OD-AM-07-CRON / Operational Blocker]` — Empirical Cron Failure Verification:**  
   An authorized account user must configure alerting in the Cloudflare dashboard and empirically verify that a scheduled Cron invocation failure dispatches an alert email to the Vice Director.
6. **`[OD-AM-07-RETRY / Platform Validation Required]` — Production Platform Retry Queuing:**  
   Empirical validation of Cloudflare Free platform scheduled event retry queuing (distinguishing HTTP 429 quota exhaustion from edge hiccups).
7. **`[Gate 4 / Explicit Owner Authorization Required]` — Production Deployment Gate:**  
   Formal owner authorization before modifying `firestore.rules`, deploying `firestore.indexes.json`, or deploying live production Cron Triggers.
8. **`[Gate 2 Verification Scope & Explicit Operational Boundaries]` — Emulator Evidence vs. Production Scope:**  
   - *Candidate Fixture Boundary:* Tests build candidate rules in memory using exact-occurrence replacement checks (`replaceExactlyOnce`) against `firestore.rules`. Production rules remain untouched and undeployed.
   - *Payload Validation Boundary:* Strict schema validation covers all 12 canonical fields, `isValidGeneratedAt` calendar-bounded ISO-like format checking (constraining months 01–12, days 01–31, hours 00–23, minutes 00–59, seconds 00–59, timezone offset; rejects out-of-range date/time components, with the explicit limitation that month lengths and leap years such as 2026-02-30 are not evaluated by regex), exact key whitelist (no open metadata), bucket math sum matching, suppression invariants, and partition document ID binding.
   - *Credential Lifecycle Simulation Boundary:* Emulator tests simulate worker identities using mock auth tokens (`uid` and `email` claims). They do **NOT** test how real Firebase worker credentials would be created, stored in encrypted Cloudflare secrets, refreshed, or rotated in production (deferred to Gate 4).
   - *Runtime & Infrastructure Boundary:* Passing this emulator suite establishes rules engine logic under emulator conditions. It does **NOT** establish deployed live Firebase rule behavior, Cloudflare runtime worker limits, production out-of-band alert delivery, or Tab 4 frontend data integration.
   - All production and deployment gates remain strictly closed pending Owner review and authorization.
