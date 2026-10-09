# MyLiberty Portal — Marketing Dashboard — Phase 0 Brief (Base)

> **Document Type:** Owner-provided audit brief (base instruction; procedural, non-authoritative)
> **Recorded:** 2026-10-09
> **Provenance:** Provided in full by the owner and transcribed verbatim. This is the **base**
> Phase 0 brief. It is not authoritative governance and grants no permission.
> **Amended by:** [`2026-10-09-marketing-dashboard-phase0-amendments.md`](./2026-10-09-marketing-dashboard-phase0-amendments.md),
> which **replaces** §2's governance baseline instruction, §3-C, §4-1, and the §5 acceptance
> conditions. All other sections stand unchanged.
> **Status:** Base scope. Objectives A–G, the deliverables, and the audit principles below are
> **owner-defined scope**. An executor must not synthesize, substitute, or re-derive them.
> **Execution precondition:** Read this brief **and** the amendment set. Neither document is
> self-contained without the other.

---

# MyLiberty Portal — Marketing Dashboard
## Phase 0: Governance, Architecture & Conformance Audit

### 1. Role and Mission

You are the implementation executor working on the MyLiberty Portal repository.

Your assignment is to conduct a **Phase 0 Conformance Audit of the Marketing Dashboard** and produce an evidence-based report that will serve as the foundation for a subsequent implementation phase.

You are NOT authorized to implement the dashboard refinement during this phase.

Your job is to establish:
- What the current Marketing Dashboard actually does.
- Whether its implementation conforms to the authoritative governance blueprint.
- Whether its authorization and branch-scope boundaries are enforced by the backend.
- Which existing components and repositories should be preserved.
- Which defects, governance conflicts, and architectural risks must be resolved before refinement.
- What the safest incremental refinement plan should be.

**Do not modify application code, Firestore rules, tests, configuration, dependencies, or authoritative governance documents.**

Documentation-only audit deliverables are permitted in the designated audit/report location, provided that they do not overwrite authoritative documents or modify application behavior.

Do not begin implementation even if you identify an obvious defect. Document the evidence, impact, and recommended correction.

---

### 2. Mandatory Repository and Governance Verification

Use the current repository on the active working branch. Do not rely on an old ZIP, previous audit, previous conversation, or cached assumptions if the repository has changed.

Begin with `README.md`, then inspect the following in order.

#### A. Authoritative governance

1. `docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md`
2. All relevant accepted owner decisions in `docs/decisions/`
3. `docs/ARCHITECTURE.md`
4. `docs/specs/`, especially `authorization-contract.md`
5. The relevant role, permission, separation-of-duties, and branch-scope specifications

Record the blueprint's exact:
- Version
- Date
- Status

Identify relevant accepted decision IDs and any open or unresolved decisions.

The blueprint is the authority for what the system must do. Architecture defines how approved requirements should be implemented. Existing code is evidence of current behavior, not proof of authorization.

If the blueprint version, status, or date differs from the version referenced in existing project instructions, report the discrepancy and identify which instructions may be outdated.

Do not invent missing governance rules or resolve owner decisions yourself.

#### B. Actual implementation

Inspect at minimum:

- `src/features/dashboard/marketing/MarketingDashboard.jsx` or the actual current Marketing Dashboard entry point.
- All components rendered by the dashboard.
- Admissions/inquiry components and repositories.
- School outreach repositories, models, and UI.
- School directory, visit tracking, and map-related modules.
- Available-batch data access.
- Directive and task-related integrations.
- Shared authorization helpers, role mappings, route guards, and authentication/profile loading.
- `firestore.rules`
- `cloudflare-worker/worker.js`, if relevant to the Marketing Dashboard's actual data or authorization flows.
- Relevant tests, fixtures, seeds, and development account definitions.
- `AGENTS.md` and applicable `CLAUDE.md`, `GEMINI.md`, and `CODEX.md` instructions.
- Relevant current audit reports and the blueprint conformance matrix.

Follow the actual data flow from the dashboard to the repository, API, or database and back. Do not stop at the visible component.

Inspect the current files before drawing conclusions. Report the exact files, functions, rules, and tests examined. Do not claim to have reviewed a file or behavior that you did not inspect.

---

### 3. Audit Objectives

#### Objective A — Establish the current dashboard state

Document:
- Dashboard sections, tabs, cards, and primary user journeys.
- Which components and data repositories each section uses.
- Which metrics are displayed and how they are calculated.
- Which records Marketing users can read, create, update, or delete.
- Which actions are delegated to other roles or workflows.
- Loading, empty, error, and incomplete-profile behavior.
- Existing tests and known limitations.

Create a current-state component and data-flow map.

Separate existing, verified functionality from proposed functionality.

Do not recommend rebuilding working components merely to achieve visual consistency.

#### Objective B — Audit authorization and branch isolation

Verify access across all relevant layers:
- UI visibility and action availability.
- Client-side data filtering.
- Repository query constraints.
- Server/API validation where applicable.
- Firestore security rules.
- Record ownership and branch metadata.
- Authentication and profile-loading behavior.

Determine whether Marketing users can access only the records permitted by their approved role, branch, and workflow.

Test or inspect direct database/API access paths. Hidden buttons and client-side filtering do not constitute security enforcement.

Explicitly investigate:

1. Whether branch identity is obtained from a trusted and authorized source.
2. Whether `DEFAULT_BRANCH` or equivalent fallback logic can cause a user to operate in the wrong branch.
3. Whether any inquiry or guestbook component uses a hardcoded branch label or branch identifier.
4. Whether missing, delayed, invalid, or incomplete user profiles fail safely.
5. Whether repository operations accept arbitrary branch or organization identifiers from the client.
6. Whether records can be read, modified, deleted, or reassigned outside the caller's authorized scope.
7. Whether record creation and updates preserve trustworthy branch and ownership metadata.
8. Whether role changes, stale claims, and account provisioning can leave excessive access in place.

A suspicious pattern is not automatically a confirmed vulnerability. Trace its actual effects and state what is proven, what remains unverified, and what testing is required.

#### Objective C — Investigate the Technical Admin deletion finding

Prior review identified a potential governance conflict in `firestore.rules`:

The `schoolOutreach` deletion rule appeared to allow deletion when `isAdmin()` is true.

Re-open the current rule and verify its exact behavior. Inspect related school, visit, and outreach-record rules as well as every relevant `isAdmin()` definition and usage.

Determine:
- What `isAdmin()` actually means.
- Which authenticated users satisfy it.
- Whether System Admin can delete business records directly.
- Whether deletion bypasses an approved business workflow.
- Whether audit history or related records can be destroyed or orphaned.
- Whether similar permissions exist elsewhere in Marketing-related data.
- Whether an accepted owner decision explicitly authorizes the behavior.

Apply the authoritative blueprint's separation between technical authority and business authority.

**Do not assume that a technically privileged account automatically has authority over business records.**

If the conflict is confirmed, classify it appropriately, document its severity, identify the affected operations, and recommend the narrowest correction consistent with accepted governance.

Do not silently transfer deletion authority to Marketing, another administrator, or a senior leader. If the correct business authority or retention policy is not established, mark it as an Owner Decision Required.

Do not modify the rules during this phase.

#### Objective D — Audit separation of duties and workflow integrity

Check whether Marketing functionality can:
- Approve or finalize a transaction that the same user created.
- Bypass an approved admissions or enrollment workflow.
- Change finalized records without preserving their history.
- Manipulate status fields to skip required checks.
- Modify authority, impersonate another role, or access another branch by changing client parameters.
- Delete or overwrite records that should remain auditable.

Review any relevant Maker–Checker–Approved–Execution requirements and apply controls proportionately to the sensitivity of each operation.

Do not assume every marketing action requires dual approval. Follow accepted governance and flag unresolved workflow requirements instead of inventing new ones.

#### Objective E — Establish the Marketing business workflow

Map the actual lifecycle of an inquiry, from initial contact through follow-up and any subsequent handoff, enrollment, or closure.

Identify:
- The authoritative record for each stage.
- Who owns each stage.
- Which status transitions are permitted.
- Where follow-up dates and outcomes are stored.
- How duplicate inquiries are handled, if defined.
- Whether Marketing has appropriate access to relevant enrollment outcomes.
- Whether admissions decisions belong to another role.
- Whether records have reliable timestamps, ownership, and branch scope.

Do not assume that a pending application is the same as a new marketing inquiry or that an available batch guarantees enrollment capacity.

Document gaps in the lifecycle as governance or specification gaps when the intended behavior is not established.

#### Objective F — Assess marketing analytics

Review existing metrics and determine whether their calculations and underlying data are trustworthy.

Assess the feasibility of:
- New and open inquiries.
- Follow-ups due and overdue.
- Inquiry-to-enrollment conversion.
- Campaign effectiveness.
- School outreach activity and outcomes.
- Available batches and relevant capacity indicators.
- Completion of assigned directives and commitments.

For every metric, record:
1. Business definition.
2. Source of truth.
3. Calculation method.
4. Required data fields or events.
5. Time period and branch scope.
6. Known data-quality limitations.
7. Whether it is ready to display, requires clarification, or requires additional data.

Do not introduce fabricated metrics, misleading percentages, duplicate sources of truth, or client-side calculations that can be manipulated.

Do not add a new analytics platform or paid service without an explicit owner decision.

#### Objective G — Assess dashboard UX and maintainability

Evaluate whether the existing dashboard can be improved incrementally around these proposed priorities:

1. Daily priorities and overdue follow-ups.
2. Inquiry and admissions workflow.
3. School outreach and campaign activity.
4. Reliable performance indicators.
5. Supporting information, such as available batches and directives.

These are proposed product directions, not pre-approved requirements.

Assess:
- Existing component reuse.
- Duplicate data fetching and duplicated business logic.
- Query efficiency and unnecessary repeated reads.
- Large lists and pagination.
- Loading, empty, and failure states.
- Accessibility and responsive behavior.
- Clear ownership of shared UI components.
- Maintainability and regression risk.

Prefer incremental changes over rewrites. A rewrite must not be recommended without evidence of a specific problem, why incremental changes cannot solve it, and the risks of replacing the current implementation.

---

### 4. Required Deliverables

Create the Phase 0 report in the repository's established audit/report location. Check existing naming conventions before creating new files.

Do not overwrite accepted decisions, authoritative specifications, or existing audit history.

#### Deliverable 1 — Executive verdict

State one of:
- READY
- READY WITH MINOR FOLLOW-UP
- NOT READY
- BLOCKED BY GOVERNANCE DECISION
- BLOCKED BY SECURITY-CORRECTNESS ISSUE

Explain the verdict in plain language.

Separate the readiness of the current implementation from readiness to begin refinement.

*(Superseded by Amendment 4 — two-axis verdict.)*

#### Deliverable 2 — Scope and evidence register

List:
- Repository and branch.
- Current commit hash and date, where available.
- Blueprint version, status, and date.
- Files and rules reviewed.
- Tests actually run and their results.
- Tests or behaviors not verified.
- Any limitations affecting confidence.

Do not claim a clean audit merely because the build succeeds.

#### Deliverable 3 — Current-state architecture and workflow map

Show the relationship between:
- Dashboard entry point.
- Child components.
- Data repositories.
- Authentication and authorization.
- Firestore or backend operations.
- Relevant business workflows.

Identify duplicated logic, unnecessary coupling, and existing components worth preserving.

#### Deliverable 4 — Authorization matrix

Provide a matrix covering each relevant role and operation.

Include, at minimum, where applicable:
- Marketing.
- Front Office.
- Division Manager.
- Ops Lead.
- Director.
- Vice Director.
- System Admin.

For each relevant resource and action, distinguish:
- Explicitly authorized by accepted governance.
- Observed in implementation.
- Denied by backend rules.
- Unverified.
- Owner Decision Required.

Cover read, create, update, delete, approval, status transition, and export where applicable.

Do not infer that a role has authority simply because the current code grants it.

Do not recreate the removed Branch Manager role under another name or move its old permissions to another leader without an accepted decision.

#### Deliverable 5 — Findings register

Each finding must include:

- Unique ID, such as MKT-P0-001.
- Classification: Bug, Security Vulnerability, Governance Conflict, Governance Gap, Technical Debt, or Improvement.
- Severity: CRITICAL, HIGH, MEDIUM, LOW, or INFO.
- Status: Confirmed, Suspected, or Not Reproduced.
- Exact evidence: file, function, rule, and line numbers where possible.
- What happens today.
- Why it matters and who or what is affected.
- Recommended direction.
- Owner Decision Required: Yes/No.
- Blocking: Yes/No.
- Priority: Must Fix Now, Before Completion, Defer, Owner Decision, or Governance Amendment.
- Verification or regression test needed.

Severity must reflect the plausible impact and evidence, not personal preference.

Do not inflate findings. Do not dismiss security risks because they are consistent with existing patterns.

#### Deliverable 6 — Proposed dashboard structure

Provide a concise, text-based wireframe or component hierarchy.

For each proposed section, identify:
- User need.
- Existing component to retain or extend.
- New capability, if any.
- Required data.
- Permission boundary.
- Acceptance criteria.

Clearly label the structure as a proposal pending review.

#### Deliverable 7 — Prioritized implementation roadmap

Divide recommendations into:
- P0: Security or governance blockers.
- P1: Core workflow and dashboard improvements.
- P2: Analytics and usability enhancements.
- P3: Optional improvements.

For each proposed task, estimate complexity as Small, Medium, or Large and identify dependencies.

Do not invent precise time or monetary estimates without evidence.

Identify which changes can be completed independently and which must wait for an owner decision.

#### Deliverable 8 — Verification and acceptance plan

Define tests for:
- Authorized and unauthorized branch access.
- Direct database/API operations.
- Missing or invalid profile information.
- Role changes and privilege escalation.
- Business-record deletion and preservation of audit history.
- Valid and invalid workflow transitions.
- Loading, empty, and error states.
- Metric correctness.
- Existing functionality and regression coverage.
- Build and test execution.

Where emulator or integration tests are unavailable, specify what remains unverified and the additional evidence required.

---

### 5. Mandatory Audit Principles

1. **Governance first.** Do not invent permissions or settle open owner decisions.
2. **Backend enforcement.** UI restrictions are not security controls by themselves.
3. **Technical Admin is not business authority.** Investigate any path to changing business records, approving work, bypassing workflows, altering scope, or destroying audit history.
4. **Preserve branch isolation.** Never use seniority or a client-supplied identifier as proof of access.
5. **Preserve separation of duties.** Do not enable self-approval, workflow bypass, or silent changes to finalized records.
6. **Respect the zero-budget constraint.** Flag paid, usage-based, or temporarily free dependencies as Cost / Owner Decision Required. Prefer existing capabilities where appropriate.
7. **Preserve historical records.** Do not casually delete or rewrite business history.
8. **No unsupported rewrites.** Recommend the smallest safe change supported by evidence.
9. **No hidden governance changes.** Any authority change requires an accepted governance basis.
10. **Evidence over assumptions.** Clearly distinguish Established, Observed, Inferred, Proposed, and Owner Decision Required.
11. **No code changes in Phase 0.** The executor must stop at audit, evidence, and recommendations.

---

### 6. Definition of Done

Phase 0 is complete only when:

- The current authoritative blueprint and relevant decisions have been read.
- The Marketing Dashboard's actual component and data flows have been traced.
- Branch isolation and backend authorization have been examined.
- The potential System Admin business-record deletion conflict has been verified or explicitly left unverified with a clear reason.
- The inquiry lifecycle and existing metric definitions have been documented.
- Findings are evidence-based, classified, and prioritized.
- Proposed UX improvements preserve approved authority boundaries.
- A practical incremental implementation plan and test plan are available.
- All owner decisions are explicitly identified.
- No application code or security rules have been modified.

*(Acceptance conditions replaced by the amendment set's "Acceptance conditions" section.)*

---

### 7. Final Response to the Owner

When finished, provide a concise summary containing:

1. Verdict.
2. Most important confirmed findings.
3. Any security or governance blockers.
4. Files changed, if any, limited to authorized audit documentation.
5. Tests actually run and their results.
6. Owner decisions required.
7. Recommended next step.

**Stop after delivering the audit. Do not implement Phase 1 or any subsequent phase until the owner has reviewed the report and explicitly authorizes the next step.**

---

## Transcription notes (not part of the brief)

Added when recording this brief on 2026-10-09. These are transcriber observations, clearly
separated from the owner's text above, and they do not modify the brief's scope:

1. **§2-B names a path that does not exist.** `src/features/dashboard/marketing/MarketingDashboard.jsx`
   is absent; the actual entry point is `src/features/dashboard/MarketingDashboard.jsx`, and the
   `marketing/` directory contains its child components. The brief already allows for this
   ("or the actual current Marketing Dashboard entry point"), so no correction is required — but
   an executor should not report the missing path as a defect.
2. **§2-A's version/status check is already resolvable.** The canonical blueprint is Version 3.3,
   `RATIFIED AUTHORITATIVE BASELINE — APPROVED BY OWNER (KIFRY)`, dated 2026-10-07. Amendment 1
   governs how the root-level pointer stubs must be treated.
3. **§2-A asks for "accepted owner decisions in `docs/decisions/`" only.** A second register of
   owner decisions exists at `docs/reports/instructor-leader-dashboard/owner-decisions.md`.
   Amendment 3 expands the required search surfaces accordingly.
