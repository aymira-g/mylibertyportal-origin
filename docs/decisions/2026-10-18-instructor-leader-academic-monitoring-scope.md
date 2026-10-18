# Owner Decision: Instructor Leader Academic Monitoring Scope

> **Authority Level:** Binding operational and data-access policy  
> **Status:** RATIFIED BY OWNER — 2026-10-18  
> **Ratified by:** Owner / Director Kifry (explicit approval in the Codex conversation on 2026-10-18)  
> **Blueprint Alignment:** Authoritative Blueprint v3.4, §6.11 and G-012; this decision distinguishes province-wide academic coordination from raw-record read permission.

## 1. Decision

The Owner approves the following bounded direction for the Instructor Leader dashboard and academic-monitoring work:

1. **Province-wide academic monitoring is authorized for feasibility design.** This is approval to investigate and specify a solution, not approval to implement a cross-branch UI, query, data projection, backend service, or security-rule expansion.
2. **Tab 4 remains unchanged and home-campus scoped during feasibility work.** No interim dashboard broadening is authorized.
3. **Raw `/progressReports` access remains branch-scoped.** An Instructor Leader may read same-branch reports from either division. Individual `get` authorization follows the existing `isSameBranch` legacy behavior; `list` authorization requires `isSameBranchStrict` so the query itself proves branch scope. Province-wide academic coordination and approval duties do not, by themselves, grant unrestricted raw student-report reads.
4. **Teacher evaluation remains a separate future workflow.** Student progress reports and their submission recency are not a teacher-evaluation rubric or observation record.

## 2. Feasibility Design Requirements

The separate feasibility design must resolve, with evidence and cost/privacy analysis:

- how satellite instructors and their relevant cohorts can be discovered without violating `/users` and `/classes` branch boundaries;
- complete query shapes, expected read counts, refresh behavior, and Spark quota impact, including the absence of Firestore `GROUP BY`;
- how distinct learners are counted and how small-cell and inferential disclosure risks are bounded;
- how legacy reports missing `branchId`, `division`, or normalized dates are handled without silently implying full historical coverage;
- which minimum data fields and aggregation level support the approved academic purpose;
- how any future read path is enforced server-side and tested.

The feasibility document must present alternatives and tradeoffs. It must not select or implement a data-access architecture without a further explicit owner decision where the choice materially changes privacy, access, cost, or production behavior.

## 3. Implementation and Deployment Boundary

- Repository rules must constrain Instructor Leader raw report `get` to same-branch documents and `list` to queries that prove same-branch scope.
- This decision does not authorize deploying Firestore rules. Deployment requires a separate explicit instruction after the deployed ruleset has been inspected and the candidate rules have passed the emulator security suite.
- Province-wide summary or projection access, if proposed, requires its own explicit data-access design and owner approval.

## 4. Approval Evidence

Owner Kifry explicitly approved the staged recommendation in the 2026-10-18 conversation: authorize the province-wide monitoring feasibility design while keeping Tab 4 unchanged, separately select the same-branch raw-report rule option, and keep teacher evaluations distinct. This record captures that approval; it does not extend it to implementation of province-wide monitoring or deployment.
