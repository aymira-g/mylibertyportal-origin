# Owner Decision: Instructor Leader Academic Monitoring Stage 3 — Cadence, Execution Model & Production Readiness Gate (OD-AM-03, OD-AM-05, OD-AM-07)

> **Authority Level:** Binding operational, architectural, and failure-handling policy  
> **Status:** RATIFIED BY OWNER — 2026-10-19  
> **Ratified by:** Owner / Director Kifry (explicit approval in conversation on 2026-10-19)  
> **Blueprint Alignment:** Authoritative Blueprint v3.4 §4, §5, §6.11, §15, §16, §19, §26 G-012, and v3.3 §0, §5.4 (Director Strategic Control / Vice Director Operational Control & Dual-Control Model); governs execution cadence, operational accountability, and production readiness prerequisites for province-wide academic monitoring without compromising branch isolation or deploying unverified infrastructure.

---

## 1. Context & Governance Background

Under Authoritative Blueprint v3.4 §5 and §26 G-012, the Central Academic Lead / Instructor Leader holds province-wide pedagogical coordination responsibility across all branches, while raw `/progressReports` data access remains strictly branch-isolated ([`2026-10-18-instructor-leader-academic-monitoring-scope.md`](./2026-10-18-instructor-leader-academic-monitoring-scope.md)).

On 2026-10-18, Owner / Director Kifry ratified two sequential governance milestones:
1. **Stage 2 Reporting Policies (`OD-AM-02`, `OD-AM-03` Period, `OD-AM-04`, `OD-AM-06`):** Ratified learner-weighted deduplicated averaging, fixed calendar quarters (`2026-Q1` through `Q4`), small-cell disclosure suppression for $N < 5$, and the strict exclusion of staff submission tracking metrics ([`2026-10-18-instructor-leader-academic-monitoring-reporting-policy.md`](./2026-10-18-instructor-leader-academic-monitoring-reporting-policy.md)).
2. **Stage 1 Strategic Disposition (`OD-AM-01` Option B):** Formally committed to pursuing province-wide monitoring in principle, keeping Tab 4 home-campus scoped (`kota_gorontalo`), and deferring production implementation pending remaining technical and operational gates ([`2026-10-18-instructor-leader-academic-monitoring-strategic-disposition.md`](./2026-10-18-instructor-leader-academic-monitoring-strategic-disposition.md)).

Following presentation and refinement of the Decision Briefs for Stage 3 in [`docs/proposals/2026-10-18-instructor-leader-province-wide-monitoring-feasibility.md`](../proposals/2026-10-18-instructor-leader-province-wide-monitoring-feasibility.md), Owner Kifry reviewed the concrete options, trade-offs, quota baselines, and failure risks, and explicitly approved the Stage 3 policy direction set forth below.

---

## 2. Ratified Policies (Stage 3)

### 2.1 Summary Generation Cadence: Monthly Batch Generation (`OD-AM-03` Cadence)
* **Ratified Cadence Policy:** Precomputed partition summaries are to be generated **monthly** (e.g., on the 1st of each calendar month, yielding up to 3 runs per calendar quarter).
* **Policy Rationale:** Monthly generation represents an operational compromise between data freshness (up to 31 days stale during active teaching terms, assuming scheduled runs succeed; failures or delivery delays extend staleness) and fewer observation points than weekly (3 runs vs ~12 runs per quarter), while drawing against the 50,000 daily read allowance (which resets around midnight Pacific Time) only once per month (~100–1,000 modeled reads/run).
* **Explicit Caveat on Temporal Differencing ($N \ge 5$):**
  - Monthly generation significantly reduces the number of observation points compared to weekly, but **it does not eliminate temporal differencing risk for cohorts with $N \ge 5$**.
  - For cohorts with 5 or more distinct learners, aggregates are not suppressed under the ratified `OD-AM-02` rule ($N < 5$). Under conditions where existing learner scores remain stable across successive monthly runs, an observer comparing consecutive monthly summaries could deduce the score of a newly evaluated learner by simple subtraction.
* **Identification of Unresolved Privacy Choice:**
  - Whether an additional privacy mitigation is required before production implementation—such as raising the suppression threshold (e.g., $N < 10$), applying differential privacy noise injection, or restricting in-quarter access until end-of-quarter snapshot freezing—remains an **open owner choice**.
  - This decision explicitly records the monthly cadence while preserving the unresolved privacy choice for subsequent owner determination, rather than silently resolving it.

### 2.2 Backend Execution Model & Accountable Operator (`OD-AM-05`)
* **Ratified Execution Model:** **Automated scheduled generation** (background cron via Cloudflare Worker) is approved as the preferred execution model, **subject strictly to satisfying the `OD-AM-07` readiness gate**.
* **Accountable Operator Designation:** The **Vice Director** is designated as the Accountable Operator for monitoring pipeline operational health, tracking summary staleness, receiving failure notifications, and coordinating recovery actions. This assignment directly aligns with the Vice Director's province-wide operational control, multi-branch coordination, exception follow-up, and corrective-action mandate established in Authoritative Blueprint v3.3 §0 and §5.4.
* **Strict Authority Boundaries & Prohibition on Inferred Permissions:**
  1. **Monitoring Accountability Only:** Designating the Vice Director as Accountable Operator assigns responsibility for operational health monitoring and recovery coordination only.
  2. **No Trigger Authority:** This designation does **NOT** grant authority to manually invoke or trigger summary generation runs. Interactive or on-demand execution is not authorized.
  3. **No Deployment Authority:** This designation does **NOT** grant authority to deploy, configure, or modify Cloudflare Workers, Cron Triggers, credentials, or cloud infrastructure.
  4. **No Expanded Data Access:** The Accountable Operator monitors summary execution and pipeline health, but does **NOT** gain access to raw cross-branch progress reports (`/progressReports`). Their data access remains strictly bound by existing role permissions and branch boundaries.
  5. **No Inferred Permissions:** No additional permissions, privileges, or claims are granted or inferred by this operator designation.
  6. **System Admin Authority Boundary:** In accordance with Rule 3 and Blueprint §16, the System Administrator holds no business trigger or approval authority over academic summaries or background generation. Any technical maintenance or infrastructure operations remain strictly technical and require separate, explicit authorization.

### 2.3 Mandatory Production Readiness Gate & Bounded Retries (`OD-AM-07`)
* **Ratified Deployment Gate (Option C Adopted):** Unattended background cron must **NOT** be deployed to production until all three operational readiness prerequisites are verified and satisfied:
  1. **Alert Delivery Verification:** Out-of-band email alert delivery from Cloudflare Workers is configured and empirically tested for this account.
  2. **UI Staleness Indicator:** The Tab 4 UI staleness indicator/banner (displaying data currency and warning staff when summary data is older than expected) is implemented and tested.
  3. **Operational Recovery Runbook:** A documented recovery runbook for diagnosing failed runs, clearing stale partitions, and re-running failed batches is established and tested.
* **Bounded Failure Handling:** The pipeline must enforce **bounded failure handling with no unbounded retries**. The runtime must never enter unbounded retry loops that risk exhausting Firestore's 50,000 daily read quota or breaching Cloudflare edge execution limits.
* **Identification of Unresolved Retry Classifications:**
  - Exact error retry classifications (e.g. distinguishing between HTTP 429 daily Spark quota exhaustion vs transient rate limits) and platform-level scheduled event retry queuing remain **unresolved** until platform behavior is empirically validated.
  - The runtime policy for distinguishing fatal quota exhaustion from transient edge hiccups will be finalized during the Gate 4 operational verification pass.

---

## 3. Explicit Boundaries & Implementation Preconditions (Gate 4 Preconditions)

This decision is governed by strict operational and governance boundaries:

1. **Policy Direction Only:** This approval concerns Stage 3 policy direction and documentation only.
2. **Zero Code or Configuration Changes:** This decision does **NOT** authorize production code changes, creating `/academicSummaries` collections or schemas, altering `firestore.rules`, deploying `firestore.indexes.json`, or configuring live Cloudflare Cron Triggers.
3. **Tab 4 Maintained as Home-Campus Scoped:** Tab 4 ([`AcademicProgressLeader.jsx`](file:///e:/myliberty-portal/src/features/reports/tabs/AcademicProgressLeader.jsx)) remains **strictly home-campus scoped** (`kota_gorontalo`). All existing security boundaries and branch isolation rules remain intact.
4. **Gate 4 Production Implementation Gate:** Transition to production implementation, rules modification, and cloud deployment remains **strictly blocked** pending fulfillment of the `OD-AM-07` readiness gate and explicit written authorization from Owner Kifry.

---

## 4. Evidence of Owner Ratification

In the conversation transcript on 2026-10-19, in response to the refined Stage 3 decision briefs presented in [`docs/proposals/2026-10-18-instructor-leader-province-wide-monitoring-feasibility.md`](../proposals/2026-10-18-instructor-leader-province-wide-monitoring-feasibility.md), Owner / Director Kifry explicitly approved the Stage 3 policy direction:

> “I approve the following Stage 3 policy direction. Please update the feasibility proposal and prepare the corresponding canonical decision record(s), keeping proposal wording and ratified decisions clearly distinguished.
> 
> - **OD-AM-03 — Monthly summary generation.** Select monthly as the proposed cadence: a compromise between freshness and fewer observation points than weekly. Preserve the explicit caveat that this does not eliminate temporal differencing risk for cohorts with N ≥ 5. If the proposal requires an unresolved privacy choice before this can be ratified, identify it rather than silently resolving it.
> - **OD-AM-05 — Conditional automated schedule.** Select automated scheduled generation as the preferred execution model, subject to the OD-AM-07 readiness gate. Designate the Vice Director as the proposed Accountable Operator for monitoring failures and coordinating recovery. This role does not grant trigger authority, deployment authority, or expanded data access. Do not infer or add any permissions.
> - **OD-AM-07 — Mandatory production readiness gate.** Do not deploy unattended production cron until alert delivery is verified, the Tab 4 staleness indicator is implemented, and a recovery runbook is established and tested. Require bounded failure handling with no unbounded retries. Keep exact retry classifications unresolved until the remaining platform behavior is validated.
> 
> This approval concerns Stage 3 policy direction and documentation only. It does not authorize production implementation, changes to Firestore rules/schema, cloud configuration, or deployment. Keep Tab 4 home-campus scoped and preserve all existing security boundaries.”
