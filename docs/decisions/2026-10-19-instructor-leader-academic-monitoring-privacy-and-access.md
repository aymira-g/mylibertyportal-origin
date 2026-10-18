# Owner Decision: Instructor Leader Academic Monitoring — Privacy, View Access & Export Boundaries (OD-AM-08 / Residual Privacy Resolution)

> **Authority Level:** Binding operational, architectural, and data access policy  
> **Status:** RATIFIED BY OWNER — 2026-10-19  
> **Ratified by:** Owner / Director Kifry (explicit approval in conversation on 2026-10-19)  
> **Blueprint Alignment:** Authoritative Blueprint v3.4 §4, §5, §6.11, §11, §15, §16, §19, §23, §26 G-012, and v3.3 §0, §5.4 (Principles 11, 15 & 16; Least Privilege, Role Seniority Is Not a Permission Shortcut, and Executive Dual-Control Model); governs consumer view access, export boundaries, and formal risk acceptance for province-wide academic summaries without compromising branch isolation or student privacy.

---

## 1. Context & Governance Background

Under Authoritative Blueprint v3.4 §5 and §26 G-012, the Central Academic Lead / Instructor Leader holds province-wide pedagogical quality assurance and curriculum coordination responsibility across all branches, while raw `/progressReports` data access remains strictly branch-isolated ([`2026-10-18-instructor-leader-academic-monitoring-scope.md`](./2026-10-18-instructor-leader-academic-monitoring-scope.md)).

Prior owner decisions established the foundation for candidate precomputed summary partitions (`/academicSummaries`):
1. **Stage 1 Strategic Disposition (`OD-AM-01` Option B):** Formally committed to pursuing province-wide monitoring in principle, keeping Tab 4 home-campus scoped (`kota_gorontalo`), and deferring production implementation pending remaining technical and operational gates ([`2026-10-18-instructor-leader-academic-monitoring-strategic-disposition.md`](./2026-10-18-instructor-leader-academic-monitoring-strategic-disposition.md)).
2. **Stage 2 Reporting Policies (`OD-AM-02`, `OD-AM-03` Period, `OD-AM-04`, `OD-AM-06`):** Ratified learner-weighted deduplicated averaging, fixed calendar quarters (`2026-Q1` through `Q4`), small-cell disclosure suppression for $N < 5$, and strict exclusion of staff submission tracking metrics ([`2026-10-18-instructor-leader-academic-monitoring-reporting-policy.md`](./2026-10-18-instructor-leader-academic-monitoring-reporting-policy.md)).
3. **Stage 3 Execution Model & Readiness Gate (`OD-AM-03` Cadence, `OD-AM-05`, `OD-AM-07`):** Ratified monthly batch generation, automated scheduled background execution with the Vice Director designated as Accountable Operator (monitoring only, with zero trigger, deployment, or expanded data access authority), and a mandatory production readiness gate with bounded retries ([`2026-10-19-instructor-leader-academic-monitoring-execution-readiness.md`](./2026-10-19-instructor-leader-academic-monitoring-execution-readiness.md)).

In Decision #48 §2.1, Owner Kifry explicitly preserved an open privacy gate: while monthly generation reduces observation points compared to weekly, it does not eliminate temporal differencing risk for cohorts with $N \ge 5$ under stable scoring conditions. Following presentation of a dedicated privacy options analysis evaluating four practical mitigation candidates, Owner Kifry reviewed the trade-offs and formally approved the privacy, access, and export direction set forth below.

---

## 2. Ratified Policies (Privacy, View Access & Export Boundaries)

### 2.1 Consumer View Access Boundary: Central Academic Lead Only (`OD-AM-08` View Access)
* **Ratified Access Policy:** Read visibility on `/academicSummaries` is limited strictly to the **Central Academic Lead** (`instructorleader`).
* **Exclusion of Executive View Access:** View access for the **Director** and **Vice Director** is **not included** in this decision and remains omitted unless explicitly approved separately by Owner Kifry.
  - *Governance Rationale:* Under Blueprint §11 (Data Scope), §23 (Role Seniority Is Not a Permission Shortcut), and Principle 11 ("access follows legitimate purpose and need-to-know, not seniority"), executive authority does not confer automatic read access to all derived academic collections. Limiting consumer access strictly to the role holding direct pedagogical quality assurance responsibility (Central Academic Lead, Blueprint §6.11) enforces the principle of least privilege.
* **Exclusion of System Administrator:** In accordance with Blueprint §7, Blueprint §16, Decision #40 (`OD-ADM-01`), and Rule 3, the System Administrator holds technical platform access only and is strictly barred from viewing academic progress summaries.
* **Exclusion of Branch Staff:** Front Office, Instructors, Operational Leaders, and Branch Division Managers have no read access to cross-branch summaries on `/academicSummaries`.

### 2.2 Bulk CSV Export Prohibition (`OD-AM-08` Export Rights)
* **Ratified Export Policy:** Bulk CSV export is **strictly prohibited** for province-wide academic summary aggregates. Tab 4 must not expose bulk download or tabular export controls for data fetched from `/academicSummaries`.
* **Bounded Scope of Export Restriction:** This prohibition applies **solely to `/academicSummaries`**. It does **not** modify or restrict existing CSV export policies for unrelated reports, operational tables, or branch-isolated rosters (such as the Operational Leader roster export boundary established in Decision #43 / `OD-OPS-02`).
* **Policy Rationale:** Disallowing bulk CSV exports prevents automated harvesting and programmatic offline diffing of historical summary partitions, limiting exposure to interactive, in-dashboard inspection.

### 2.3 Explicit Acceptance of Residual Temporal Differencing Risk ($N \ge 5$)
* **Formal Risk Acceptance:** Owner Kifry explicitly accepts that monthly summaries for cohorts with $N \ge 5$ can still permit temporal differencing under the specific mathematical conditions documented in the privacy analysis:
  $$\text{Score}_{N+1} = (N+1) \cdot A_{t+1} - N \cdot A_t$$
* **Required Mathematical Conditions for Differencing:** This algebraic deduction occurs only when all of the following conditions hold simultaneously:
  1. *Single Addition:* Exactly one learner was evaluated and added between consecutive monthly runs ($N_{t+1} = N_t + 1$).
  2. *Score Invariance:* None of the existing learners had scores corrected, re-evaluated, or updated in that interval.
  3. *Zero Removals or Withdrawals:* No student records were deleted or withdrawn.
  4. *Zero Reclassifications or Transfers:* No students transferred classes, divisions, or branches.
  5. *No Multi-Student Batching:* Evaluations were not entered in groups of two or more.
* **Nature of Ratification:** This is an **explicit operational risk acceptance** by the Owner, based on the low frequency of monthly updates (3 runs per quarter) and strict access controls. **It is NOT a claim that summary aggregates guarantee mathematical privacy.**
* **Rejection / Supersession of Alternative Proposals:**
  - *Proposal A ($N < 10$ Suppression Threshold):* Rejected. Raising the threshold shifts the boundary to $N = 10 \rightarrow 11$ without eliminating differencing, and risks widespread blackouts in small satellite cohorts.
  - *Proposal B (Metric Coarsening / Rounded Scores):* Rejected. Rounding or qualitative bins alter ratified reporting metrics without eliminating inference, and degrade pedagogical utility.
  - *Proposal C (End-of-Quarter Snapshot Freezing):* Rejected. Eliminating in-quarter monthly updates removes real-time pedagogical utility, while reruns, out-of-band corrections, or prior exported data would still enable comparison.

### 2.4 Preserved Reporting Invariants
The following previously ratified policies remain active and completely unchanged:
1. **$N < 5$ Suppression Rule (`OD-AM-02`):** Aggregates for cohorts with fewer than 5 distinct learners remain suppressed (`null`).
2. **Monthly Generation Cadence (`OD-AM-03`):** Summary generation remains monthly (1st of each calendar month, 3 runs/quarter).
3. **Learner Academic Average (`OD-AM-06`):** Score calculations remain deduplicated, learner-weighted arithmetic averages.
4. **Staff Metric Exclusion (`OD-AM-04`):** Summaries strictly exclude staff submission tracking metrics.

---

## 3. Explicit Boundaries & Implementation Preconditions

This decision is governed by strict operational, architectural, and documentation boundaries:

1. **Documentation Authorization Only:** This decision authorizes **documentation only**.
2. **Zero Code or Configuration Changes:** This decision does **NOT** authorize modifying production code, creating `/academicSummaries` schemas or collections, altering `firestore.rules`, deploying `firestore.indexes.json`, or configuring Cloudflare Workers or Cron Triggers.
3. **Tab 4 Maintained as Home-Campus Scoped:** Tab 4 ([`AcademicProgressLeader.jsx`](file:///e:/myliberty-portal/src/features/dashboard/instructor/leader/AcademicProgressLeader.jsx)) remains **strictly home-campus scoped** (`kota_gorontalo`). No cross-branch data is queried or rendered.
4. **Authorization Contract Gap for `/academicSummaries`:** The `/academicSummaries` collection is a future collection that is **not yet defined in the technical authorization contract** ([`docs/specs/authorization-contract.md`](../specs/authorization-contract.md)) and does not exist in `firestore.rules`. This decision records binding governance and access policy (`OD-AM-08`), but does **not** prove or constitute implemented technical access. The future collection's role-limited access contract must be formally specified in `docs/specs/authorization-contract.md`, implemented in `firestore.rules`, and verified under emulator tests before any production deployment.
5. **Sequencing Distinction (Preparation vs. Production Activation):** Fulfilling the `OD-AM-07` readiness prerequisites (authoring the passive Tab 4 staleness banner in UI code, configuring out-of-band email notifications in the Cloudflare dashboard, and documenting the recovery runbook) requires a **separate, limited-scope preparatory authorization** from Owner Kifry. That limited preparation authorization must be kept distinct from—and does not authorize—final production activation (deploying scheduled Cron Triggers, creating production database documents, or activating live cron runs), which remains strictly blocked pending final Gate 4 authorization.

---

## 4. Evidence of Owner Ratification

In the conversation transcript on 2026-10-19, Owner / Director Kifry reviewed the privacy analysis for cohorts with $N \ge 5$ and explicitly approved the privacy recommendation and access boundaries:

> “My approved direction for province-wide academic summaries is:
> 
> - **View access:** Limit `/academicSummaries` to the Central Academic Lead. Director and Vice Director access is not included unless I approve it separately.
> - **CSV export:** Do not provide bulk CSV export for these province-wide summary aggregates. This decision applies only to `/academicSummaries`; it does not change unrelated reports or existing export policies.
> - **Residual risk:** I accept that monthly summaries for cohorts with `N ≥ 5` can still permit temporal differencing under the conditions documented in the privacy analysis. This is an explicit risk acceptance, not a claim that the summaries guarantee privacy.
> - Keep the existing `N < 5` suppression rule and monthly cadence unchanged. Do not change the ratified reporting metrics.
> 
> This approval authorizes **documentation only**. Do not change production code, Firestore rules or indexes, schemas, cloud configuration, or deployment. Do not commit or push. Keep the Tab 4 home-campus view unchanged.”
