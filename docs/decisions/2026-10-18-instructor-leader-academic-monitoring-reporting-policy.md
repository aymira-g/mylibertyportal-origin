# Owner Decision: Instructor Leader Academic Monitoring Reporting Policy (OD-AM-02, OD-AM-03, OD-AM-04, OD-AM-06)

> **Authority Level:** Binding operational, reporting, and data-privacy policy  
> **Status:** RATIFIED BY OWNER — 2026-10-18  
> **Ratified by:** Owner / Director Kifry (explicit approval in conversation on 2026-10-18)  
> **Blueprint Alignment:** Authoritative Blueprint v3.4 §4, §5, §6.11, and §26 G-012; governs aggregated academic reporting definitions and small-cell privacy boundaries for the Central Academic Lead / Instructor Leader without expanding raw-record data access.

---

## 1. Context & Governance Background

Under Authoritative Blueprint v3.4 §5 and §26 G-012, the Central Academic Lead / Instructor Leader holds province-wide pedagogical coordination responsibility across all branches, while raw `/progressReports` data access remains strictly branch-isolated ([`2026-10-18-instructor-leader-academic-monitoring-scope.md`](./2026-10-18-instructor-leader-academic-monitoring-scope.md)).

To enable potential aggregated province-wide academic monitoring without compromising student privacy or branch isolation, core reporting definitions and disclosure policies must be established by the Owner before committing to any software implementation, schema, or backend service.

Following presentation of empirical Gate 1 and Gate 2A feasibility findings in [`docs/proposals/2026-10-18-instructor-leader-province-wide-monitoring-feasibility.md`](../proposals/2026-10-18-instructor-leader-province-wide-monitoring-feasibility.md), Owner Kifry reviewed the Stage 2 reporting policies and explicitly approved the durable standards set forth below.

---

## 2. Ratified Policies (Stage 2)

### 2.1 Score Weighting: Per-Learner Deduplicated Average (`OD-AM-06`)
* **Ratified Policy:** Division and branch score averages must be weighted **per learner**, not per report.
* **Calculation Standard:**
  1. For each distinct learner represented in a cohort within the reporting period, all report scores belonging to that learner are averaged first to compute a single learner-level period score.
  2. Each distinct learner carries an equal weight of 1 in calculating the cohort’s average score and in categorizing into score distribution buckets (e.g. `<70`, `70–84`, `85–100`).
* **Governance Rationale:** Prevents learners who are evaluated multiple times within a quarter from disproportionately skewing division-wide or branch-wide performance indicators relative to learners evaluated once.

### 2.2 Reporting Period: Fixed Calendar Quarters (`OD-AM-03` Period)
* **Ratified Policy:** Academic monitoring aggregates reports over **fixed calendar quarters** (Q1: Jan 1 – Mar 31; Q2: Apr 1 – Jun 30; Q3: Jul 1 – Sep 30; Q4: Oct 1 – Dec 31).
* **Governance & Privacy Rationale:** Fixed calendar quarters avoid continuously overlapping date ranges. They reduce some differencing risks associated with sliding windows, but they do not eliminate differencing risks or guarantee protection against comparisons across periods or other overlapping summaries.
* **Explicit Cadence Boundary:** This approval defines the **reporting period window** only. The **generation/aggregation cadence** (e.g., whether batch summaries are computed weekly or monthly) remains explicitly **undecided**.

### 2.3 Small-Group Disclosure Suppression: Threshold $N < 5$ (`OD-AM-02`)
* **Ratified Policy:** Aggregate score details must be suppressed whenever fewer than five distinct learners ($N < 5$) are represented in an academic cohort partition (`branchId + division + period`).
* **Suppression Enforcement Standard:**
  - When $N < 5$, `scoreBuckets` and `averageScore` must be set to `null` (or entirely omitted from presentation).
  - Counts or score details must **not** be exposed for suppressed groups if doing so would reveal the small cell or allow inferential reconstruction of individual performance.
* **Privacy Rationale:** While no mathematical threshold guarantees complete anonymity against auxiliary background knowledge in small satellite branch communities, $N < 5$ provides a rigorous defense against casual re-identification of struggling or excelling students.

### 2.4 Staff Submission Tracking Exclusion (`OD-AM-04`)
* **Ratified Policy:** Instructor submission metrics (e.g. report counts per instructor, submission recency, or staff-level submission rates) are **strictly excluded** from the academic progress summary (`/academicSummaries`).
* **Governance Boundary:** Progress summaries must remain focused exclusively on student learning distributions. Any proposal to track staff submission timeliness or compliance requires an independent, dedicated supervisory inquiry with its own explicit purpose, access rules, supervisory boundaries, and separate Owner decision.

---

## 3. Implementation and Governance Boundaries

The ratification of these reporting policies is subject to strict operational and architectural boundaries:

1. **Candidate D Implementation Remains Unapproved (`OD-AM-01`):** Ratifying reporting policies does **not** approve implementation of the Candidate D precomputed summary architecture, creation of new collections (`/academicSummaries`), or UI modification.
2. **Security Rules Untouched:** No changes to `firestore.rules` are approved. Raw `/progressReports` access remains strictly branch-scoped.
3. **No Cloud Testing or Deployments:** Deploying workers, configuring Cron Triggers, or running live cloud tests on Cloudflare or Google Cloud remains strictly unapproved.
4. **Current Dashboard Scope Maintained:** Tab 4 ([`AcademicProgressLeader.jsx`](file:///e:/myliberty-portal/src/features/reports/tabs/AcademicProgressLeader.jsx)) remains strictly home-campus scoped (`kota_gorontalo`).
5. **Gate 2A Status Preserved:** The feasibility status remains **Partially demonstrated with open findings; do not advance to next gate**.
6. **Remaining Open Decisions:**
   - `OD-AM-01`: Strategic implementation disposition (deferred pending technical blocker resolution).
   - `OD-AM-03` (Cadence): Generation cadence (weekly vs monthly).
   - `OD-AM-05`: Backend execution model & trigger authority (automated cron vs manual trigger; trigger authority undecided).
   - `OD-AM-07`: Automated failure recovery design constraint (defer automated cron until bounded retry and recovery are demonstrated).

---

## 4. Evidence of Owner Ratification

Owner / Director Kifry explicitly approved these policies in the conversation transcript on 2026-10-18:

> *"I approve these Stage 2 reporting policies:*  
> *- **Score weighting:** Per learner. Average each learner’s reports within the reporting period first, then give each distinct learner equal weight.*  
> *- **Reporting period:** Fixed calendar quarters.*  
> *- **Small-group suppression:** Suppress results when fewer than five distinct learners are represented. Do not expose counts or score details for suppressed groups if those would reveal the small cell.*  
> *- **Staff submission tracking:** Exclude staff-submission metrics from the academic progress summary. Any separate staff-tracking proposal requires a separate decision."*
