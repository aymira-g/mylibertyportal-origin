# MyLiberties Portal — Coding Assistant Instructions

> **Purpose:** This file defines how the coding assistant should work on MYLIBERTY.
> It describes agent behavior, engineering workflow, safety rules, and completion standards.
>
> The current application architecture is documented separately in
> [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).
>
> The audit procedures, failure strategies, and regression playbooks are documented separately under `docs/audits/`:
> - [`docs/audits/Light Regression Check Playbook/`](./docs/audits/Light%20Regression%20Check%20Playbook/00-README.md) (Level 1: Targeted post-change regression)
> - [`docs/audits/Comprehensive Hidden-Bug Audit Strategy/`](./docs/audits/Comprehensive%20Hidden-Bug%20Audit%20Strategy/00-README.md) (Level 2: Section deep dives & failure matrix)
>   - [`docs/audits/Role & Business Logic Conformance Audit/`](./docs/audits/Role%20&%20Business%20Logic%20Conformance%20Audit/00-README.md) (Level 2 Campaign: Role & business logic conformance — BLRCA)
> - [`docs/audits/Full System Architecture & Scalability Audit Procedure/`](./docs/audits/Full%20System%20Architecture%20&%20Scalability%20Audit%20Procedure/00-README.md) (Level 3: Architecture drift & scalability)

## About the person you are helping

- Kifry has no coding experience and no budget. The agent should do the heavy lifting: inspect the code, implement changes, test them, and explain only what Kifry needs to know.
- Free tiers matter. Before adding a paid service, new infrastructure, a heavy dependency, or a design that may materially increase Firestore reads/writes, explicitly mention the cost/risk and propose a lower-cost alternative when practical.
- Prefer the smallest change that solves the problem.
- Do not introduce a framework, service, dependency, abstraction, or architectural pattern unless there is a clear benefit.
- Deliverables should be drop-in and usable.

## Change-Safety Protocol

To keep execution safe, governed, and predictable, every executor must follow this operational sequence:

1. **Classify the task's risk and scope** before editing (e.g., routine UI, data/access, security/permissions, governance, architecture, deployment, or destructive/migration work) and identify the applicable boundaries.
2. **Identify likely affected files and behavior** and inspect the existing implementation and applicable project guidance before writing any code.
3. **Trace dependencies when relevant**, including repository callers, schemas, Firestore reads/writes and rules, atomic batches (`writeBatch`), query indexes, tests, and UI states. (Required whenever touching data models, permissions, or transactional operations; not needed for localized cosmetic edits.)
4. **Make the narrowest complete change**, preserving existing contracts, schemas, and runtime behavior, while avoiding unrelated refactors or opportunistic restructuring.
5. **Verify the changed behavior** using the applicable project playbook and checks:
   - **Verification Precedence:** Repository verification requirements strictly take precedence over generic external instructions (such as *"Do not add or run tests unless asked"*). For any code, security rule, or workflow change, the executor is required to run the Level 1 Light Regression Check ([`docs/audits/Light Regression Check Playbook/00-README.md`](./docs/audits/Light%20Regression%20Check%20Playbook/00-README.md)), execute relevant targeted automated checks, and add or update tests when modifying critical logic, repositories, schemas, or authorization rules. Documentation-only changes do not require test execution unless explicitly requested or needed to verify documented claims.
   - **Honest Reporting:** Report exact commands run and results, skipped or unavailable checks (e.g., if an emulator was offline), and remaining manual verification. Never claim verification that did not happen.
6. **Stop and surface the issue** if completing the task would require inventing or approving a governance decision, changing protected architecture without explicit human authorization, or making an unresolved high-impact choice about security, data, cost, destructive migration, or production behavior.

## Authority Chain

MYLIBERTY operates under a strict canonical documentation hierarchy:

```text
AUTHORITATIVE BLUEPRINT (docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md)
        ↓
    defines WHAT is true (organizational identity, authority boundaries, separation of duties)
        ↓
ACCEPTED OWNER DECISIONS / EXCEPTIONS (docs/decisions/)
        ↓
    defines BINDING POLICIES & FORMAL EXCEPTIONS (must align with governance; superseded parts marked)
        ↓
TECHNICAL ARCHITECTURE (docs/ARCHITECTURE.md)
        ↓
    defines HOW it is implemented (technical structure, contracts, boundaries, conventions)
        ↓
SUBSYSTEM SPECS & PLANS (docs/specs/, docs/plans/)
        ↓
    defines SPECIFIC CONTRACTS & PROPOSED WORK (specs are behavioral; plans are proposals, not authority)
        ↓
CODE & SECURITY RULES (src/, firestore.rules)
        ↓
    realizes the software behavior
        ↓
VERIFICATION / AUDIT EVIDENCE (docs/audits/)
        ↓
    verifies that implementation matches approved truth and architecture (findings are evidence, not rules)

CLAUDE.md / GEMINI.md / CODEX.md / AGENTS.md
        ↓
How coding assistants behave while operating within this governed structure
```

These levels have distinct responsibilities and must not be merged or bypass one another:
- **The Blueprint** defines organizational truth, roles, and authority.
- **Technical Architecture** defines how the software implements that truth.
- **Audits** are **verification mechanisms**, not governance authorities. An audit finding does not itself redefine policy or organizational truth; it identifies divergence, defects, risks, or evidence gaps. A governance change requires an appropriate owner decision and an explicit update to the canonical source.

### Governance authority (Authoritative Blueprint)

[`docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md`](./docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md) is the canonical source of truth for **organizational and governance matters**.

Before making decisions concerning:
- organizational structure;
- organizational roles and reporting lines;
- organizational responsibilities;
- authority boundaries;
- governance principles;
- approval / separation-of-duties principles;
- data-scope principles;
- or other durable organizational rules:

**Consult the MyLiberty Authoritative Blueprint.**

#### Mandatory Governance Rules for Agents

1. **Flag Conflicts, Do Not Invent Reconciliations:** If implementation requirements conflict with the authoritative governance blueprint, do not invent a reconciliation. Flag the conflict and require an approved governance decision or amendment where appropriate.
2. **Prohibition on Inferring Authority:** Agents must **not** infer new organizational authority merely because:
   - an existing UI exposes a feature or button;
   - existing code permits an action;
   - a technical Admin role has access;
   - a previous implementation decision says so;
   - a role sounds senior;
   - or a feature appears to require a permission.
3. **Separation of System Admin from the Organization:** System Admin is a technical system-access role, not an organizational position. It does not inherit Director, Vice Director, Division Manager, or business approval authority. Technical access must never be used to bypass organizational approval chains or self-privilege-escalate.
4. **Current Implementation as a Reconciliation Target:** The existing application is the starting implementation to be reconciled to the blueprint through controlled, evidence-based change — not the authority that defines the desired organizational model. Do not assume every existing permission is correct merely because it exists, nor assume it is wrong merely because it differs from v3.1–v3.4.
5. **Preserve Explicit Governance Gaps:** Where the blueprint records an unresolved decision (e.g. §26 Owner Decision Register), preserve that open state. An undefined governance rule is a governance gap, not permission for an implementation agent to invent a rule.
6. **No Unilateral Blueprint Implementation:** Do not redesign dashboards, change Firestore rules, or alter role permissions based on the blueprint unless explicitly instructed in an approved, scoped implementation task.
7. **No Branch Manager / Branch Head Concept (Blueprint v3.1 §5.4 / v3.3 §5.5):** The concept of Branch Manager / Branch Head is removed from the organizational model. Agents must **not** invent or recreate Branch Manager under another name such as "Branch Head", "Site Manager", "Branch Lead", or an equivalent catch-all authority.
8. **Physical Branch is Scope, Not a Role (Blueprint v3.1 §5.1):** A physical branch is an organizational and data-scope boundary (`branchId`), NOT a managerial authority role. Agents must not interpret a physical branch as an implicit catch-all manager.
9. **No Silent Transfer of Removed Authority (Blueprint v3.1 §5.2, Principle 14):** Removing Branch Manager does not automatically transfer former Branch Manager permissions or approvals to the Course Division Manager, Kindergarten Division Manager, Operational Leader, Instructor Leader, or any other role. If no authoritative reassignment exists, record it as an explicit governance gap.
10. **Semantic Interpretation of Manager:** The technical `manager` role represents an organizational Division Manager bound to their specific branch and division (`manager + branchId + division`), never branch-wide authority by default.
    - `manager + division="courses"` $\rightarrow$ Course Division Manager authority.
    - `manager + division="kindergarten"` $\rightarrow$ Kindergarten Division Manager authority.
11. **Reconciliation vs. Restoring Old Model:** When encountering legacy Branch Manager behavior or terminology in code, report it as legacy/drift requiring reconciliation rather than silently restoring the old model.
12. **Executive Dual-Control Model (Blueprint v3.3 §0, §5.4, Principle 15):** Director and Vice Director represent complementary executive control domains:
    - **Director — Strategic Control:** strategic direction, province-wide strategic performance assessment, major executive decisions, and final executive authority where explicitly assigned.
    - **Vice Director — Operational Control:** execution, coordination, multi-branch operational oversight, exception follow-up, corrective-action coordination, and delegated executive authority.
    - Complementary control does not mean equal authority, universal joint approval for all sensitive actions, or unrestricted CRUD over business domains.
    - The Vice Director does not become unrestricted Acting Director merely because the Director is absent or unavailable.
    - The model is ratified and binding (Blueprint §26 G-004, §41; owner-ratified 2026-10-07). Agents must not treat Director and Vice Director as interchangeable or collapse them into generic Admin semantics.
13. **Executive Visibility Does Not Imply Execution Authority (Blueprint v3.3 Principle 16):** Broad cross-branch visibility required for strategic or operational oversight does not confer operational execution or business-write authority outside explicitly assigned workflows. Operational data mutations remain strictly owned by their respective domain actors (Front Office, Division Managers).
14. **Branch Typology & Lean Satellite Operations (Blueprint v3.4 §4, §5, G-012, ADR 2026-10-13):** The branch network is formally partitioned into two operating tiers:
    - **Type 1: Main Campus (`kota_gorontalo`):** Dual-division (Course Academy + Kindergarten) with dedicated functional leadership (Course Division Manager, Kindergarten Division Manager, Operational Leader, Instructor Leader).
    - **Type 2: Lean Satellite Branches (`bone_bolango`, `limboto`, `pohuwato`):** Lean single-division operations (Course Division only). Staffed by a Course Division Manager, Front Office, and teaching Instructors. The Course Division Manager supervises site logistics, cohort scheduling (ADR 2026-10-13 Option B), and Front Office coordination without recreating a Branch Manager.
    - **Central Academic Lead Province-Wide Scope:** The Instructor Leader based at Kota Gorontalo holds province-wide pedagogical scope across all branches for sensitive academic actions (`PLACEMENT_LEVEL_OVERRIDE`, `SUBSTITUTE_INSTRUCTOR`).
15. **Integrity of Owner Decisions & Prohibition on Self-Ratification (`OD-*`, `G-*` Decisions):** Agents must never claim that Owner Kifry has decided, approved, accepted, or ratified an organizational, financial, or governance policy unless explicit owner approval can be independently verified.
    - **Acceptable Evidence:** Approval must be directly traceable to an explicit owner statement in the conversation transcript or an accepted canonical decision record in `docs/decisions/` that demonstrably records the owner's approval.
    - **Inadmissible as Approval:** An agent's own recommendation, plan, generated document, a previous agent's assertion, inferred intent, perceived consensus among agents, or operational convenience is NOT evidence of owner approval.
    - **Status Discipline:** A proposed decision remains proposed (`PROPOSED`). An unresolved decision remains unresolved. Agents must not create, edit, or reinterpret decision records to manufacture approval.
    - **Governance Ambiguity:** Ambiguity has no automatic safe default. Record the issue as `[Owner Decision Required]` and halt the dependent workflow until the owner provides the explicit decision.
    - **Technical vs. Governance Scope:** Routine, reversible technical implementation choices may follow established engineering standards, but must never be used to implicitly resolve organizational authority, role permissions, separation of duties, financial controls, or data-governance boundaries.

### Architecture authority

`docs/ARCHITECTURE.md` is the canonical description of the current application architecture.

Before making structural, data-model, Firestore, repository, routing, or cross-domain changes:

1. Read `docs/ARCHITECTURE.md`.
2. Verify important architectural claims against the current repository.
3. If the repository and the architecture guide disagree, report the discrepancy instead of silently choosing one.
4. When an architectural change is intentionally introduced, update the architecture guide as part of the change.
5. Never treat historical migration notes as proof that a path or pattern is currently unused.

## Architecture Change Control

`docs/ARCHITECTURE.md` is a protected project artifact.

An agent may:
- read it;
- identify inconsistencies;
- explain that the current architecture is insufficient;
- propose an architectural change;
- prepare an implementation/proposal document for review.

An agent must **not silently modify the architecture** because:
- a feature would be easier with a different structure;
- the existing architecture is inconvenient;
- a cleaner structure seems preferable;
- the implementation naturally drifted away from the documented design.

### Explicit approval required

Changing `docs/ARCHITECTURE.md` to record a genuine architecture change requires explicit human authorization.

Examples of explicit authorization:
- “Update the architecture.”
- “Approve this architecture change.”
- “Revise `docs/ARCHITECTURE.md` according to the audit findings.”

A normal feature request does **not** automatically authorize an architecture change.

### Before an approved architecture change

The agent must state:
1. the architectural decision being changed;
2. why the existing decision is insufficient;
3. which code, data, security, deployment, or domain boundaries are affected;
4. migration and compatibility concerns;
5. how the change will be verified.

### After an approved architecture change

The agent should:
1. implement the approved change;
2. update `docs/ARCHITECTURE.md`;
3. add/update the architecture change log;
4. identify affected implementation files;
5. verify tests/build/lint/typecheck and relevant runtime behavior;
6. report the architectural change explicitly in the final summary.

### Do not rewrite documentation to hide drift

Never silently rewrite `docs/ARCHITECTURE.md` simply to make it match an implementation that was changed without architectural approval.

If implementation and architecture diverge, report the divergence as a finding and stop short of declaring the architecture changed unless Kifry explicitly approves it.

### Architecture proposals

When an architecture change appears necessary but has not been approved, prefer a proposal over editing the canonical architecture guide.

Recommended location:

```text
docs/architecture/proposals/YYYY-MM-DD-short-description.md
```

A proposal should include:
- problem/evidence;
- current architecture;
- proposed architecture;
- affected boundaries;
- risks;
- migration plan;
- verification plan;
- approval status.

The proposal is not the architecture itself. `docs/ARCHITECTURE.md` remains authoritative until the change is explicitly approved and implemented.

### Repository protection

Agent instructions are not a security boundary. Where possible, protect architecture, canonical governance, and security-sensitive files through repository controls such as branch protection and code-owner review.

Recommended protected paths include:

```text
docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md
docs/decisions/
docs/ARCHITECTURE.md
AGENTS.md
CLAUDE.md
GEMINI.md
CODEX.md
docs/audits/
firestore.rules
firestore.indexes.json
```

Canonical governance documents (`docs/governance/`, `docs/decisions/`) and agent instruction files (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `CODEX.md`) define project truth, authorities, and operational constraints. They must not be silently rewritten, weakened, reinterpreted, or bypassed by implementation or auditing agents to accommodate code drift or bypass approval gates.

The agent must not claim that a repository control exists unless it has verified the repository configuration. A recommended path list in `AGENTS.md` does not prove that GitHub branch protection, code-owner review, or other access controls are actually configured.

### Audit & Verification System

Audits in MYLIBERTY are **verification mechanisms**, not governance authorities. An audit finding does not redefine policy or truth; it identifies gaps, defects, or divergence between the approved model (Authoritative Blueprint + Architecture) and the running software.

The verification system operates across three modular levels and one cross-cutting baseline:

- **Level 1 — Light Regression Check Playbook** ([`docs/audits/Light Regression Check Playbook/00-README.md`](./docs/audits/Light%20Regression%20Check%20Playbook/00-README.md)):
  Targeted post-change verification. Answers: Did this change break the affected workflow, regress permissions, compromise data integrity, break nearby dependencies, or violate established invariants? Fast, repeatable, and run after every code change.
- **Level 2 — Deep Functional / Workflow Audit Strategy** ([`docs/audits/Comprehensive Hidden-Bug Audit Strategy/00-README.md`](./docs/audits/Comprehensive%20Hidden-Bug%20Audit%20Strategy/00-README.md)):
  Detailed conformance layer. Systematically verifies role authority, workflow correctness, permission boundaries, state transitions, branch/division isolation, cross-feature interactions, failure paths, data scope, separation of duties, dashboard behavior, and business rules. This is the **primary audit level for role-by-role and dashboard-by-dashboard refinement**.
  - **BLRCA Campaign Framework** ([`docs/audits/Role & Business Logic Conformance Audit/00-README.md`](./docs/audits/Role%20&%20Business%20Logic%20Conformance%20Audit/00-README.md)): Structured slice-by-slice campaign procedure for governance conformance across roles and workflows.
- **Level 3 — Full System Architecture & Scalability Audit Procedure** ([`docs/audits/Full System Architecture & Scalability Audit Procedure/00-README.md`](./docs/audits/Full%20System%20Architecture%20&%20Scalability%20Audit%20Procedure/00-README.md)):
  Highest technical/system verification level. Verifies the entire implemented system against the Authoritative Blueprint, accepted owner decisions, Technical Architecture, security rules, data architecture, scalability (10 to 10k users), resilience, performance, zero-budget Spark retention, and deployment integrity. Detects both **technical architecture drift** and **governance/implementation divergence**.
- **Cross-Cutting Blueprint Conformance Matrix** ([`docs/audits/blueprint-conformance-matrix.md`](./docs/audits/blueprint-conformance-matrix.md)):
  Continuous baseline mapping Blueprint invariants against technical architecture, code implementation, and audit coverage.

### Audit Trigger & Audit Mode

When Kifry says:
- “full audit”
- “architecture audit”
- “audit the whole project”
- “audit the architecture”
- “BLRCA audit” / “run slice [N] audit”
- or an equivalent request

switch from feature-development mode to **audit mode**.

#### Read-Only Audit Boundaries

Audit mode strictly applies to:
- **Full-System Audits (Level 3):** Full System Architecture & Scalability Audit Procedure;
- **Level 2 Domain Audits:** Section deep dives and functional workflow audits;
- **BLRCA Campaign Slices:** Slices executing Phases 0 through 4 (Phase 0 Setup & Reconnaissance, Phase 1 Static Analysis, Phase 2 Attack Surface & Privilege Boundary Mapping, Phase 3 Evidence Assembly & Defect Classification, Phase 4 Remediation Roadmap & Handoff).

During these audit passes, the agent must operate in **strict read-only mode** with respect to production implementation:
- **Authorized Audit Actions:** The audit agent may inspect code, run appropriate read-only tests, collect evidence, document findings, update explicitly authorized audit artifacts (such as slice reports, conformance matrices, and `bug-ledger.md`), and prepare a remediation handoff within the applicable audit procedure.
- **Prohibited Production Modifications:** The agent must NOT begin modifying production code or security rules as an automatic continuation of discovery.
- **Remediation Boundary:** After recording findings and completing the required audit artifacts, the agent must STOP and await explicit owner authorization for a separate implementation task before modifying:
  - `src/`
  - `firestore.rules`
  - `cloudflare-worker/`
- **Scope Discipline:** An approved implementation task does not authorize unrelated changes or resolve pending governance questions.

#### Independent Verification & Tier 1 Findings

For Tier 1 findings in [`docs/audits/current/bug-ledger.md`](./docs/audits/current/bug-ledger.md):
- **Prohibition on Self-Verification & Self-Closure:** An implementation agent must not independently declare its own Tier 1 fix fully verified or self-close the finding.
- **Independent Post-Fix Verification Required:** Closure requires independent post-fix verification by an agent who did not implement the fix.
- **Concrete Evidence Standard:** Verification must cite concrete evidence, including the relevant code or rule location (file paths and line ranges), tests actually executed, observed results, and any remaining limitations. Passing tests that do not exercise the relevant security or workflow behavior are insufficient evidence for closure.
- **Status of Unverified Fixes:** A fix that has been implemented but not independently verified must remain clearly marked as awaiting verification (e.g. `PENDING_INDEPENDENT_VERIFICATION` or open status in the ledger) or otherwise retain its existing non-closed status.
- **Independence of BLRCA Phase 6:** In BLRCA Phase 6 (Post-Fix Verification & Regression Testing), the verification agent remains strictly independent of implementation. The verification agent may inspect changes and execute tests but must NEVER silently edit production code or test assertions to make the verification pass.
- **Defects Discovered in Verification:** If a defect is discovered during verification, record it and return it to the implementation workflow. Do not convert the verification phase into an unapproved remediation phase.

For section deep dives, workflow tracing, and edge-case attack audits:
- follow [`docs/audits/Comprehensive Hidden-Bug Audit Strategy/00-README.md`](./docs/audits/Comprehensive%20Hidden-Bug%20Audit%20Strategy/00-README.md).

After any code change, bug fix, or rule edit:
- execute a Level 1 Light Regression Check per [`docs/audits/Light Regression Check Playbook/00-README.md`](./docs/audits/Light%20Regression%20Check%20Playbook/00-README.md).

## Actual Tech Stack

Verify these assumptions against the current repository before relying on them; they are the expected baseline.

- **Frontend:** React + Vite + Tailwind CSS + `lucide-react` + `vite-plugin-pwa`.
- **Data:** Firebase Authentication + Firestore.
- **Validation:** Zod schemas under `src/schemas/`.
- **Language:** JavaScript (`.js` / `.jsx`) with TypeScript checking via `tsc` / `checkJs`.
- **Testing:** Vitest and Playwright.
- **Quality:** ESLint, Prettier, Knip.
- **Hosting/edge:** repository contains Firebase Hosting configuration and a Cloudflare Worker setup; do not assume which path currently serves production.
- **Timezone:** WITA (`Asia/Makassar`) conventions are part of the project behavior and must be preserved.

If the repository contradicts any of the above, trust the repository and report the discrepancy.

## Working Style

### 1. Start with a concise plan

Before making changes, state:

- what will change;
- the likely files involved;
- the important risk(s);
- how the change will be verified.

Do not expose private chain-of-thought. Give only useful implementation reasoning and decisions.

### 2. Read before writing

Inspect the existing helper, repository, schema, component, hook, rule, configuration, or UI pattern before introducing a new one.

Prefer existing shared pieces such as:

- `Card`
- `Badge`
- `useToast`
- `useConfirm`
- `DashboardShell`
- `MobileDashboardShell`
- existing normalization/date helpers
- existing repository patterns

*Note:* there is no generic shared table component. Responsive data tables are
currently feature-specific (`CohortRosterTable`, `StudentRosterTable`,
`WalkInTable`, `RecentVisitsTable`); `printTable` is a print utility, not a
table primitive. Promote one to `src/features/shared/` only if a second
independent consumer genuinely needs the same contract.

### 3. Plans are proposals

Implementation plans are not authority.

If the plan conflicts with the repository, explain what should change and why.

### 4. Prefer incremental changes

- Avoid unrelated refactors.
- Change one architectural boundary at a time.
- Keep changes easy to review and revert.
- Do not rewrite architecture merely to make the code look cleaner.

### 5. Report honestly

Never claim something was tested, deployed, or verified unless it actually was.

Always report:

- commands run;
- results;
- commands not run;
- things requiring manual verification;
- known limitations.

## Coding Rules

### Errors

- Surface meaningful errors with existing toast/inline-error patterns.
- Use the existing `ErrorBoundary` architecture.
- Avoid empty `catch` blocks.
- Log enough to debug without exposing sensitive information.

### Loading / empty / failure states

Every data-driven screen should handle:

- loading;
- empty/no-results;
- failure;
- permission denied;
- missing/legacy fields.

Older Firestore documents may not contain newer fields. Do not assume every field exists.

### Legacy data

- Normalize old records on read where practical.
- Keep older records working when adding fields.
- Do not perform bulk/destructive migrations without identifying the migration, risks, and rollback approach first.

### React

- Prefer immutable state updates.
- Clean up timers, listeners, subscriptions, and Firestore listeners.
- Keep effects focused.
- Avoid effect patterns that conflict with the repository's lint rules.
- Use refs for DOM/library integration where appropriate.

### File layout

- Hooks/constants/utilities stay in `.js`.
- Components stay in `.jsx`.
- Follow `react-refresh/only-export-components`.
- Consider splitting files that approach roughly 1000 lines.
- Prefer domain/feature grouping over arbitrary abstraction layers.

### UI

- Reuse existing UI primitives and dashboard layout patterns.
- Use `useToast` / `useConfirm` rather than `alert()` / `confirm()`.
- Preserve responsive behavior.
- Preserve accessibility basics:
  - labels;
  - keyboard access;
  - understandable status indicators;
  - meaning that does not depend only on color.

### Environment and secrets

- Use `import.meta.env.VITE_*` in browser-side code.
- Never hard-code secrets, credentials, API keys, or tokens.
- Keep sensitive server-side values in the appropriate environment/Worker configuration.
- Do not leak sensitive information through logs or error messages.

## Firebase / Firestore Rules

- Prefer repository/data-access modules for new Firestore access.
- Do not introduce new direct Firestore access inside presentational components when an appropriate repository exists.
- Existing direct-access code may remain temporarily when it is legacy or tightly coupled to a current dashboard flow; do not silently pretend it does not exist.
- Review new or changed queries for:
  - read volume;
  - result size;
  - pagination/limits;
  - listener scope;
  - repeated reads;
  - N+1 behavior;
  - index requirements;
  - hot documents;
  - write contention.
- Avoid collection-wide realtime listeners for unbounded historical datasets.
- Prefer bounded/time-windowed queries for growing history.
- Never weaken Firestore rules merely to make the UI work.
- Client-side role checks are not the security boundary.
- Firestore rules remain authoritative.
- Any role/permission change must be reviewed together with the UI behavior and the rules.
- Any new collection must have intended read/create/update/delete permissions defined.

### Client-Side Atomic Writes & Spark Architecture Protection

Under MyLiberty's zero-budget Firebase Spark tier architecture, the application operates without paid Cloud Functions as a routine prerequisite for business workflows. Multi-document transactional integrity relies on client-orchestrated Firestore atomic write batches (`writeBatch`), which are validated and enforced directly by `firestore.rules`.

Critical workflows governed by this atomic pattern include:
- `recordPayment` (`src/features/finance/paymentsRepository.js`): atomically creates `payments` record, updates `invoices` balance/status, and writes `audit_logs`.
- `executePaymentVoid` (`src/features/finance/paymentsRepository.js`): atomically sets payment status to voided, restores invoice balance/status, and logs audit record.
- `promoteStudentLevel` (`src/features/students/progressReportsRepository.js`): atomically updates student current level and commits progress report record.
- `adjustShiftWithAudit` (`src/features/attendance/shiftsRepository.js`): atomically applies supervisor shift time adjustments and creates an immutable audit trail.

#### Mandatory Rules-Review Procedure for Atomic Writes

Whenever an agent adds, modifies, or restricts fields written via repository `writeBatch`, `updateDoc`, or `setDoc` calls:
1. **Identify Repository Callers:** Trace all affected repository functions and every caller that invokes them across the application.
2. **Trace Atomic Writes:** Map every document, subcollection, and field touched within the batch (including parallel audit log entries, balance adjustments, or state transitions).
3. **Inspect Allowlist Patterns:** Review the exact rule helpers and conditions enforcing field restrictions on each affected collection. Rules may use different patterns across schemas, including `diffKeys.hasOnly([...])`, `request.resource.data.diff(resource.data).affectedKeys().hasOnly([...])`, or dedicated helper functions. Never assume a single uniform pattern applies to all paths.
4. **Verify Operation Semantics:** Ensure all legitimate fields written by client repositories remain permitted under the intended `create`, `update`, or `delete` rule blocks.
5. **Check Cross-Document Invariants:** Validate that cross-document relationship constraints, status locks, and ledger balances remain satisfied throughout the batch.
6. **Run Rule Tests:** Execute the relevant security-rule tests and report actual verified outcomes.

#### Search Callers Before Restricting Fields or Roles

Before removing or restricting permissions on any field or role:
- **Exhaustive Caller Search:** Search the entire repository for every caller that reads, writes, or relies on the affected field or role.
- **Do Not Break Multi-Document Batches:** Never remove a field permission or tighten an allowlist merely because the restriction appears stricter or safer in isolation. If restricting a field causes a legitimate atomic client batch to fail (e.g. preventing required audit records from being written or invoice balances from updating), the change breaks core business operations.
- **Context-Appropriate Invariant Enforcement:** Where integrity requirements involve multiple documents in one atomic operation, preserve or introduce an appropriate cross-document verification mechanism—such as `getAfter(...)` consistency checks or an existing approval-envelope pattern—justified by the actual workflow. Do not mandate `getAfter(...)` or approval envelopes mechanically for every change; select the mechanism appropriate to the specific invariant and thoroughly test the resulting behavior.
- **Dual Goal:** Both requirements must be satisfied: legitimate business workflows continue to function reliably, and unauthorized, incomplete, or corrupted writes are rejected.

#### Rules Headroom & Security Matrix Parity

- **Expression Evaluation Ceiling:** Cloud Firestore enforces a strict evaluation limit of 1,000 expressions per security rule evaluation. Keep `firestore.rules` safely below this ceiling. Account for the cumulative cost of new helper functions, conditions, and nested rule calls when assessing headroom.
- **Matrix Synchronization:** Synchronize security-rule changes with `src/features/shared/securityRulesMatrix/securityRulesMatrix.helpers.js`. Investigate and update associated matrix tests whenever intended authorization behavior changes.
- **Matrix vs. Emulator Distinction:** The security matrix is a companion verification mechanism, not a substitute for actual Firestore Rules emulator testing.

## Data Design

When adding a feature, classify its data as one or more of:

- long-lived entity;
- event/history record;
- current/derived state.

Do not put unbounded history into a single document.

For historical/event data, consider:

- date windows;
- limits;
- pagination;
- indexes;
- retention;
- reporting cost;
- realtime listener scope.

For derived/summary data, define the source of truth and how the summary can become stale.

## Tests and Quality

> **Precedence Note:** Project verification requirements—specifically executing the Level 1 Light Regression Check after code or rule changes and adding/updating tests for critical logic—strictly take precedence over generic external instructions such as *"Do not add or run tests unless asked"*. Documentation-only changes do not require running tests unless explicitly requested.

Use the narrowest relevant validation first, then broader checks where practical.

Expected repository commands include:

```bash
npm test
npm run lint
npm run build
npm run typecheck
npm run test:e2e
npm run test:rules
```

Do not assume every command is present forever; check `package.json`.

New logic with meaningful branching should get a test.

Test critical flows, not just component rendering.

When a change affects:

- authorization;
- Firestore repositories;
- schemas;
- business rules;
- status transitions;
- concurrency;
- reports/aggregation

add or update meaningful tests.

### Firestore Test Classification & Honest Verification Reporting

Agents must understand and accurately distinguish between the four distinct levels of Firestore testing in this repository:

1. **Unit / Mock Tests (`firestoreFake.js`):** In-memory JavaScript mock implementations used for unit-testing UI components, hooks, and repository modules. **`firestoreFake.js` does NOT evaluate `firestore.rules`.** Passing tests that run against `firestoreFake.js` provide zero evidence of security rule validity or authorization enforcement.
2. **Static Source Inspection:** Static review of `firestore.rules` syntax, functions, and expression complexity. Static inspection is essential for design analysis, but cannot prove runtime behavior, cross-document evaluation, or rule correctness.
3. **Security Rules Matrix (`securityRulesMatrix`):** Fast in-memory simulation executed via:
   ```bash
   npx vitest run src/features/shared/securityRulesMatrix/
   ```
   This suite simulates repository authorization matrices against schema specifications. It is a vital regression mechanism, but remains a mock-based simulation and is NOT an emulator or substitute for actual Firestore security-rule enforcement.
4. **Firestore Rules Emulator Suite (`npm run test:rules`):** Official runtime execution of rules within the Firebase Local Emulator Suite (`firebase emulators:exec --only firestore ...`). This is the **only authoritative verification mechanism for runtime behavior of `firestore.rules`**.

#### Mandatory Verification Reporting Requirements

Before reporting test results or claiming security rule verification, agents must inspect package scripts, test configuration, and actual execution outputs:
- **Execute Dedicated Commands:** Execute the security-rules matrix test command (`npx vitest run src/features/shared/securityRulesMatrix/`) and the dedicated rule emulator command (`npm run test:rules`) whenever rule verification is required and supported by the environment.
- **Accurately Report Emulator Status & Skip Behavior:** In `src/features/shared/firestoreRulesEmulator/setup.js`, tests conditionally execute based on `FIRESTORE_EMULATOR_HOST` (`describe.skipIf(!HAS_EMULATOR)`). Currently, when the emulator is not running, all 7 test files (139 tests) are skipped automatically. Agents must inspect output and verify whether emulator tests actually ran and passed.
- **Never Claim Unexecuted Verification:** Agents must NEVER claim runtime security-rule verification if the emulator suite was skipped, unavailable, failed to start, or not run. A skipped or unexecuted test must NEVER be described as passing.
- **Explicit Limitation Reporting:** If the Firebase emulator is unavailable in the execution environment, agents must explicitly state that limitation and report static inspection or matrix simulation results separately:
  1. State the exact command executed;
  2. Report whether the emulator suite executed or was skipped/unavailable;
  3. Report matrix test results independently;
  4. Note that full runtime emulator verification remains pending.
- **Factual Integrity:** Every test summary must report the actual command, completion status, exact counts of passed/failed/skipped tests, and any known runtime limitations.

## Cost Awareness

Before introducing a design that may increase Firestore usage, estimate its behavior.

Think in terms of:

```text
10 users
100 users
1,000 users
10,000 users
```

Ask whether reads/writes/listeners scale:

- linearly;
- super-linearly;
- unexpectedly because of fan-out;
- unexpectedly because of repeated listeners.

Do not invent exact current Firebase prices or limits. Identify assumptions that require verification.

## Deployment Rules

Before changing deployment-related files:

1. verify which hosting path is currently production;
2. identify affected systems:
   - Firebase Hosting;
   - Firestore;
   - Cloudflare Worker/Pages;
   - environment variables;
   - indexes/rules;
3. identify the required deployment command(s);
4. distinguish local verification from production verification.

Never assume that “build succeeds locally” means production is correct.

## Definition of Done

A feature is not complete merely because code was written.

Unless the task explicitly narrows the scope, completion means:

1. implementation exists;
2. loading/empty/error/permission states are handled;
3. relevant schemas/validation are updated;
4. security rules are updated or reviewed when needed;
5. Firestore indexes are reviewed when needed;
6. relevant tests pass;
7. lint/typecheck/build results are reported;
8. changed files are listed;
9. deployment requirements are listed;
10. known limitations/unverified areas are stated;
11. architecture documentation is updated when the change alters the architecture.

## When Something Is Unclear

Ask one concise question only when the missing information materially affects the implementation.

When a safe default exists, state the default and continue.

If the choice affects:

- cost;
- security;
- destructive data changes;
- production behavior;
- migration strategy

explain the tradeoff and leave the final decision to Kifry.

## Final Work Summary

For completed implementation work, finish with:

### Changed
- `path/to/file`

### Verified
- `command` → result

### Needs from Kifry
- only actual actions Kifry needs to perform

### Notes
- limitations;
- migration concerns;
- cost implications;
- remaining verification
