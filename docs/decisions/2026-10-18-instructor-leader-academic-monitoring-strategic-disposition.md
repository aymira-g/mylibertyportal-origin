# Owner Decision: Instructor Leader Academic Monitoring Strategic Disposition (OD-AM-01)

> **Authority Level:** Binding strategic, operational, and architectural disposition policy  
> **Status:** RATIFIED BY OWNER — 2026-10-18  
> **Ratified by:** Owner / Director Kifry (explicit approval in conversation on 2026-10-18)  
> **Governing Blueprint:** Authoritative Blueprint v3.4 §4, §5, §6.11, §15, §16, §19, and §26 G-012; governs the strategic direction and implementation boundaries for province-wide academic monitoring for the Central Academic Lead / Instructor Leader without expanding raw student data access or prematurely deploying unverified infrastructure.

---

## 1. Context & Governance Background

Under Authoritative Blueprint v3.4 §5 and §26 G-012, the Central Academic Lead / Instructor Leader holds province-wide pedagogical coordination responsibility across all branches. In contrast, raw `/progressReports` data access remains strictly branch-isolated under [`2026-10-18-instructor-leader-academic-monitoring-scope.md`](./2026-10-18-instructor-leader-academic-monitoring-scope.md).

To address the Central Academic Lead's pedagogical quality assurance mandate without compromising student data privacy or branch isolation, Candidate D (precomputed partition summaries) was evaluated across Gates 1, 2A, and 2B in [`docs/proposals/2026-10-18-instructor-leader-province-wide-monitoring-feasibility.md`](../proposals/2026-10-18-instructor-leader-province-wide-monitoring-feasibility.md). Furthermore, durable Stage 2 reporting policies (learner-weighted averaging, fixed calendar quarters, small-group disclosure suppression $N<5$, and staff metric exclusion) were ratified by Owner Kifry in [`2026-10-18-instructor-leader-academic-monitoring-reporting-policy.md`](./2026-10-18-instructor-leader-academic-monitoring-reporting-policy.md).

Following review of the empirical Gate 2B feasibility findings and the Decision Brief for `OD-AM-01`, Owner Kifry rendered an explicit decision selecting Option B (the staged path).

---

## 2. Ratified Policy (OD-AM-01 Option B: Staged Path)

Owner / Director Kifry formally approved **Option B** as the binding strategic disposition for province-wide academic monitoring:

1. **Pursue Province-Wide Monitoring in Principle:** MYLIBERTY formally commits to pursuing software-based province-wide academic monitoring in principle. This aligns technical system evolution with the Central Academic Lead’s province-wide pedagogical quality assurance mandate established in Authoritative Blueprint v3.4 §6.11 and §26 G-012.
2. **Tab 4 Maintained as Home-Campus Only:** Tab 4 ([`AcademicProgressLeader.jsx`](file:///e:/myliberty-portal/src/features/reports/tabs/AcademicProgressLeader.jsx)) remains **strictly home-campus scoped** (`kota_gorontalo`). No interim dashboard broadening, client-side filtering bypass, or unverified cross-branch UI exposure is permitted.
3. **Production Implementation Deferred:** Production implementation, Firestore security rules modifications, and cloud deployment are **deferred** pending the resolution of remaining technical and operational blockers (Stage 3 execution and retry evaluations, and Gate 4 operational readiness checks).

---

## 3. Explicit Boundaries & Non-Approval Scope

Option B defines strict operational, architectural, and authorization boundaries:

1. **Feasibility and Planning Authorization Only:** Approval of Option B authorizes **continued feasibility research, architectural planning, and local prototyping ONLY**.
2. **Candidate D Is Not Permanently Selected:** This decision does **NOT** select Candidate D (precomputed background summaries) as the permanent architecture. Candidate D remains a candidate under active investigation alongside potential alternative models (such as on-demand or manual triggers).
3. **No Production Code, Schemas, or Rules Modifications:** This decision does **NOT** authorize modifying production application code, creating new collections/schemas (`/academicSummaries`), or altering `firestore.rules`. Raw `/progressReports` access remains strictly branch-isolated (`isSameBranchStrict`).
4. **No Cloud Deployments Authorized:** This decision does **NOT** authorize deploying Cloudflare Workers, configuring Cron Triggers, modifying live Firebase infrastructure, or deploying Firestore composite indexes.
5. **Production Authorization Held for Gate 4:** Any transition to production implementation, rules modification, and cloud deployment requires a separate, subsequent owner decision in Gate 4.
6. **Remaining Open Decisions:**
   - `OD-AM-03` (Generation Cadence): Summary generation frequency (e.g., weekly vs. monthly batch generation) remains **open and proposed**.
   - `OD-AM-05`: Backend execution model & trigger authority (automated cron vs. manual trigger; trigger authority undecided) remains **open and proposed**.
   - `OD-AM-07`: Automated failure recovery and retry design constraint remains **open and proposed**.

---

## 4. Evidence of Owner Ratification

In the conversation transcript on 2026-10-18, in response to the Stage 1 recommendation and decision brief presented in [`docs/proposals/2026-10-18-instructor-leader-province-wide-monitoring-feasibility.md`](../proposals/2026-10-18-instructor-leader-province-wide-monitoring-feasibility.md), Owner / Director Kifry explicitly selected and approved Option B:

> “option b it is”
