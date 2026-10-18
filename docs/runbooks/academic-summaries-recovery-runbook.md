# Academic Summaries Recovery Runbook & Operational Procedures

> **Document Type:** Operational Runbook & Incident Response Procedure  
> **Status:** Proposed Preparation Runbook (Phase 3.5)  
> **Governing Baseline:** [`docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md`](../governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md); Owner Decision 2026-10-19 ([`docs/decisions/2026-10-19-instructor-leader-academic-monitoring-privacy-and-access.md`](../decisions/2026-10-19-instructor-leader-academic-monitoring-privacy-and-access.md)).  
> **Operational Invariant:** Pre-deployment preparation must clearly distinguish checks executable today from procedures requiring a deployed summary Worker, live alerts, or future recovery tooling.

---

## 1. Readiness & Boundary Architecture

The province-wide academic monitoring pipeline (monthly aggregation across 4 branches into `/academicSummaries`) operates under strict cost, privacy, and security boundaries:

| Dimension | Policy / Readiness Status | Operational Constraint |
|---|---|---|
| **Schedule** | **Proposed Schedule:** Monthly on the 1st (04:00 WITA / 20:00 UTC) | Cloudflare Free Cron Trigger (1 scheduled job; undeployed) |
| **Staleness Threshold** | **Approved Policy:** 35 calendar days | Monthly generation on the 1st + 4-day operational grace period |
| **Worker CPU Limit** | **Architectural Constraint:** 10ms isolate CPU execution time | Cloudflare Free plan (Error 1102 risk if compute spikes) |
| **Firestore Read Volume** | **Modeled Estimate (Unmeasured):** ~100–1,000 reads per batch run | Modeled workload estimate based on synthetic cohorts; draws against daily 50,000 Spark read limit (resetting PT). Not a verified limit. |
| **Alert Destination** | **Pending Readiness Verification:** Vice Director email address | Destination proposed; live alert pipeline unverified (target Worker not deployed; sample test on unrelated Worker rejected). |
| **Write Authority** | **Pending Architecture Approval:** Backend write mechanism undecided | Client writes strictly denied (`allow write: if false;`) |

---

## 2. Checks Executable Today (Pre-Deployment Baseline)

Before any summary Worker or production Cron Trigger is authorized for deployment, an operator can execute and verify the following pre-flight baseline checks using existing infrastructure:

### 2.1 Firestore Daily Read Quota Inspection (GCP Console)
- **Objective:** Inspect baseline Firestore read activity in Google Cloud Console against the Spark plan's 50,000 daily read limit.
- **Execution Step:**
  1. Navigate to [Google Cloud Console — Firestore Usage](https://console.cloud.google.com/firestore/databases/(default)/usage?project=mylibertyies-f2f38).
  2. Review historical daily document read volume across existing applications and client listeners.
- **Quota & Cost Context:**
  - **Spark Plan Cap:** The Spark plan provides strictly **50,000 document reads per day**, resetting daily around midnight Pacific Time (no cumulative monthly quota).
  - **Modeled Batch Estimate:** Feasibility Proposal D models approximately **100–1,000 document reads per batch run** across all four branches based on synthetic cohort sizes. This is a modeled workload estimate, not an empirical wire count, verified budget limit, or guaranteed ceiling.
  - **Unresolved Baseline & Headroom:** The repository has no empirical baseline measurement or established daily traffic allowance for existing operational workflows (attendance kiosks, admissions, cashiering). Daily headroom and traffic allowances have not been decided or ratified by the Owner (`[Owner Decision / Empirical Baseline Required]`). Operators should observe real daily traffic patterns to ensure any future batch runs will not exhaust the project's 50,000 daily read limit.

### 2.2 Cloudflare Live Dashboard Verification Result & Alert Delivery Status
- **Objective:** Record the live dashboard verification findings regarding Worker inventory and alert policy readiness.
- **Account Identity & Script Inventory Verified:**
  - Account Name: `Mylibertyies@gmail.com's Account`
  - Account ID: `da5c58a1009c09a01236ab90f1b84a3b`
  - Active Workers & Pages: Confirmed in dashboard that the account list shows **only `myliberty-ai-proxy`**. The target academic-summary Cron Worker does not exist.
- **Dashboard Inspection Findings:**
  - *Worker Issues Inspection:* The Issues tab for `myliberty-ai-proxy` displays an "Enable issue detection" option. However, this belongs to an entirely separate, unrelated Worker (`myliberty-ai-proxy`), not the proposed academic-summary Cron Worker.
  - *Operational Invariant & Prohibitions:* Issues detection must **not** be enabled on `myliberty-ai-proxy`. Creating a generic alert on an unrelated Worker, deploying a test or production Worker, and altering any Cloudflare account configuration remain strictly unauthorized.
- **Readiness & Evidence Gap:**
  - Scheduled academic-summary Worker failure detection and alert delivery remain **strictly unverified** because the target summary Worker is not deployed.
  - Performing a sample alert test on an unrelated Worker (`myliberty-ai-proxy`) would not test or satisfy the academic monitoring failure detection requirement.
  - Consequently, alert delivery readiness remains open, and Phase 3.5 / OD-AM-07 cannot be marked complete.
  - All existing production, deployment, and authorization boundaries remain preserved.

### 2.3 UI Staleness Indicator Dormancy Verification
- **Objective:** Verify that the UI component in Tab 4 ([`AcademicProgressLeader.jsx`](../../src/features/dashboard/instructor/leader/AcademicProgressLeader.jsx)) remains completely dormant before live data is connected.
- **Execution Steps:**
  1. Run automated unit tests: `npm test -- src/features/dashboard/instructor/leader/AcademicProgressLeader.test.js`.
  2. Confirm that when `summaryPartition` is null or `generatedAt` is missing, the component renders `null` and displays no staleness warning.
  3. Confirm that the 35-day threshold and WITA formatting are enforced when test data is supplied.

---

## 3. Post-Deployment Operational Procedures (Phase 4 / Live Pipeline)

The following procedures apply **only after** a production summary Worker and live Cron Trigger have been separately authorized and deployed.

### 3.1 Live Worker Log Inspection
- **Objective:** Observe real-time execution during scheduled runs or investigate failures.
- **Commands:**
  ```bash
  # Stream live tail logs from the edge isolate
  npx wrangler tail academic-summaries-worker
  ```
- **Log Markers to Verify:**
  - `[ACADEMIC_SUMMARY] Batch run started for partition: YYYY-MM`
  - `[ACADEMIC_SUMMARY] Progress reports fetched: N (HTTP subrequests: 4)`
  - `[ACADEMIC_SUMMARY] Partitions computed with small-cell suppression (N < 5)`
  - `[ACADEMIC_SUMMARY] Partition written successfully. Duration: Xms`

### 3.2 Error 1102 (Cloudflare CPU Limit Exhaustion)
- **Symptom:** Worker returns Error 1102 ("Worker Exceeded CPU Limit") or terminates abnormally.
- **Root Cause Analysis:**
  - The Free plan enforces a strict 10ms CPU execution time limit per invocation (I/O wait does not count, but in-memory parsing, aggregation, and JSON serialization do).
  - Gate 2A benchmark demonstrated that local V8 isolate compute times for $N=100..1000$ reports require $0.7\text{ms}$ to $2.1\text{ms}$, well within 10ms. However, cold starts or hypervisor load on multi-tenant edge nodes can cause spikes.
- **Immediate Response:**
  1. Inspect Cloudflare Workers Dashboard Analytics under "CPU Time per Execution".
  2. If CPU time approaches 8–9ms, optimize string operations or consider chunking branch aggregations across separate subrequests.
  3. Confirm whether `controller.noRetry()` prevented infinite retry loops.

### 3.3 Firestore REST Error Classification & Retry Behavior (Gate 2A Prototype Alignment)
- **Symptom:** Worker fails during Firestore document read or batch write.
- **Classification & Handler Invariant (Gate 2A Implementation):**
  - **Fatal Client / Configuration Errors (HTTP 400, 401, 403, 404):** Non-retryable failures (invalid queries, schema mismatch, missing composite indexes, authentication failure). The handler calls `controller.noRetry()` to suppress automated retries, then **re-throws the error**, while production platform handling and alert delivery remain unverified.
  - **Ambiguous Resource Exhaustion (HTTP 429) — Defensively Suppressed:** In the Gate 2A prototype, HTTP 429 is treated as **unresolved policy and defensively suppressed**. Simple REST responses cannot reliably distinguish daily project quota exhaustion (where retries are futile until midnight PST) from temporary rate limits, and Cloudflare Free Cron cannot delay retries until quota replenishment. The handler calls `controller.noRetry()` and **re-throws the error**, while production platform handling and alert delivery remain unverified.
  - **Server Internal Error (HTTP 500) — Defensively Suppressed:** Firestore REST guidance explicitly advises that `INTERNAL` should not be retried more than once. Because Cloudflare Free Cron on the Free plan lacks retry counters or backoff schedules, Gate 2A calls `controller.noRetry()` and **re-throws the error** to flag this structural platform mismatch, while production platform handling and alert delivery remain unverified.
  - **Transient Backend Unavailable (HTTP 503, 504):** Transient service unavailability. The handler does **not** call `controller.noRetry()` and **re-throws the error**, while production platform retry queuing, backoff timing, and alert delivery remain unverified.
- **Platform Limitation & Unverified Behavior:** While the Gate 2A prototype suppresses retries on fatal/defensive errors and throws on failures, Cloudflare Free Cron provides only binary retry suppression (`controller.noRetry()`). Cloudflare platform's actual production retry queuing, backoff schedule, and alert triggering behavior remain **unverified on live infrastructure**.
- **Action:** If failure is caused by an expired service account token or modified security rule, do not attempt manual retries until credentials or rules are repaired.

---

## 4. Recovery & Rerun Boundaries (Future Capabilities Requiring Separate Authorization)

> [!WARNING]
> **Strict Operational Prohibition & Capability Gap:**  
> The repository currently has **no administrative CLI script, recovery UI, or batch clearing tool** for `/academicSummaries`. Furthermore:  
> 1. **No Database Console Edits:** Operators are **not** authorized to manually delete summary documents in the Firebase Console.  
> 2. **No Ad-Hoc Deployment / Schedule Changes:** Changing and deploying Cron schedules in `wrangler.toml` to force an out-of-cycle batch rerun is strictly prohibited. No deployment authority exists for ad-hoc schedule modifications.  
> 3. **No Manual Trigger Authority:** Neither the Vice Director nor the Central Academic Lead possesses manual trigger authority.  
> 4. **No Production Summary Collection:** The `/academicSummaries` collection does not currently exist in production Firestore.

### 4.1 Future Recovery Tooling Requirements
If a future scheduled batch job fails midway or produces corrupted aggregate partitions:
- **Partition Clearing:** Purging or invalidating corrupted partitions cannot be done via ad-hoc database console edits. A formal, auditable administrative script or server-authoritative recovery tool must be specified, tested, and authorized before production activation.
- **Batch Reruns:** Ad-hoc reruns cannot be performed by altering Cron schedules or deploying temporary configurations. If manual rerun capability is required, an authorized, authenticated administrative endpoint with strict rate limiting and audit logging must be formally approved by the Owner.

### 4.2 Privacy Differencing Caveat on Reruns & Cadence Adjustments
- **Temporal Differencing Risk Under Ratified Cadence:** Under the ratified monthly generation cadence (Option B, OD-AM-03; quarter-end-only publication rejected), snapshots are computed on the 1st of each month. In cohorts with small net learner additions ($N \ge 5$), monthly snapshots—as well as any out-of-cycle reruns or retroactive data corrections—can expose temporal score differencing under stable scoring conditions.
- **Irreversibility of Observed Snapshots:** Changing publication cadence to a less frequent schedule in the future cannot retroactively eliminate differencing comparisons derived from monthly snapshots that have already been viewed, cached, or recorded by the user.
- **Governance Invariant:** Any out-of-cycle batch rerun or retroactive data correction introduces potential differencing exposure in cohorts with small additions and must be treated as a governed exception under Owner Decision 2026-10-19.

---

## 5. Operational Incident Governance (Unresolved Owner Decisions)

> [!IMPORTANT]
> **Operational Roles & Resolution Targets Require Owner Ratification:**  
> Operational incident ownership, escalation paths, and target resolution timeframes are currently **unresolved owner decisions (`[Owner Decision Required]`)**:
> - **System Admin Role Boundary (Blueprint §7):** The System Admin is a technical maintenance role with platform access, not an organizational position or business incident commander. System Admin does not inherit approval or operational leadership authority.
> - **Incident Escalation Path:** Formal assignment of first-responder responsibilities between technical administration and operational leadership (Vice Director) remains undefined.
> - **Resolution Timeframes:** Specific operational response targets (SLAs) have not been established or ratified by Owner Kifry. No target resolution times may be asserted as policy until formally decided.
