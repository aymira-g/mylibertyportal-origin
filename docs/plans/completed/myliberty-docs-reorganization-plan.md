---
title: Documentation Reorganization Plan
type: plan
status: completed
created: 2026-09-28
last_verified: 2026-09-28
supersedes: null
superseded_by: null
---

# MyLiberty Portal — Documentation Reorganization Plan

## Purpose

Reorganize the `docs/` directory so that an executor or AI coding agent can immediately understand:

- which documents describe the **current system**
- which documents record **accepted decisions**
- which documents define **intended subsystem behavior**
- which documents describe **planned implementation work**
- which documents are **audits/current findings**
- which documents are **historical**
- which documents are only **audit instructions/prompts**
- which proposals are still awaiting a decision

The goal is **not** to rewrite the documentation or delete history.

The goal is to make document authority and lifecycle obvious.

---

# Important Execution Rules

## 1. This is a documentation-only reorganization

Do not modify application source code, Firestore rules, schemas, tests, configuration, or runtime behavior.

Only reorganize documentation and update documentation references needed because paths changed.

## 2. Do not silently delete documentation

Every existing Markdown document must end up in one of these states:

- moved to its new canonical location
- intentionally archived
- intentionally merged into another document
- intentionally retained where it is

Record any exception in the final execution report.

## 3. Preserve Git history

Prefer `git mv` or equivalent rename/move operations instead of copy-and-delete where possible.

## 4. Do not rewrite substantive content during the move

The executor may:

- update relative links
- update index references
- add document metadata/status headers
- fix references whose paths changed

Do not substantially rewrite the technical content during this task.

## 5. Current code remains the source of truth for actual behavior

Documentation does not override:

1. current source code
2. current Firestore rules
3. current tests
4. verified runtime/emulator behavior

Plans, proposals, and historical audits must not be treated as proof that current code implements their intended behavior.

---

# Target Documentation Structure

Use this structure:

```text
docs/
├── README.md
├── ARCHITECTURE.md
│
├── decisions/
│   ├── README.md
│   └── ...
│
├── specs/
│   ├── README.md
│   ├── attendance/
│   │   └── ...
│   ├── parent/
│   │   └── ...
│   ├── corporate-events/
│   │   └── ...
│   ├── outreach/
│   │   └── ...
│   └── ...
│
├── plans/
│   ├── README.md
│   ├── active/
│   │   └── ...
│   └── completed/
│       └── ...
│
├── audits/
│   ├── README.md
│   ├── current/
│   │   └── ...
│   └── archive/
│       └── ...
│
├── audit-prompts/
│   ├── README.md
│   └── ...
│
├── proposals/
│   ├── README.md
│   └── ...
│
└── archive/
    └── ...
```

Do not create unnecessary extra directories. The purpose of this structure is to make document lifecycle obvious.

---

# Document Category Definitions

## `docs/ARCHITECTURE.md`

**Meaning:** Current system architecture.

Answers:

> What does the system currently look like?

This remains the canonical high-level architecture document.

Do not move it.

Do not replace it with a proposal.

Do not treat old architecture audits as authoritative over it.

---

## `docs/decisions/`

**Meaning:** Accepted business or architectural decisions.

A decision means:

> This is the rule/choice we have officially selected.

Examples:

- multi-branch access model
- parent portal authentication model
- attendance correction precedence
- source-of-truth decisions
- approved role/access rules

Once a proposal is formally accepted, its enduring decision should live here.

---

## `docs/specs/`

**Meaning:** Intended behavior or technical/business contracts for a subsystem.

A specification means:

> This is how this subsystem is intended to behave.

Examples:

- attendance integration
- parent/student data model
- corporate event behavior
- outreach behavior
- class/enrollment rules

Use subsystem folders when they improve navigation.

Suggested starting groups:

```text
docs/specs/
├── attendance/
├── parent/
├── classes/
├── corporate-events/
├── outreach/
└── finance/
```

Do not create a folder merely to hold one file unless that grouping is likely to grow.

---

## `docs/plans/`

**Meaning:** Work that is planned or being executed.

A plan means:

> These are the steps for changing or implementing something.

Recommended lifecycle:

```text
docs/plans/active/
docs/plans/completed/
```

When a plan is fully executed and no longer actionable, move it to `completed/`.

Do not use `plans/` as a general-purpose folder for specifications, audits, or decisions.

---

## `docs/audits/current/`

**Meaning:** Current, relevant findings about the actual implementation.

A current audit should represent findings that are still relevant to the current codebase or are explicitly useful as the present verification baseline.

Examples:

- latest reconciled full audit
- latest cross-feature integration audit
- currently relevant security/architecture audit

---

## `docs/audits/archive/`

**Meaning:** Historical audit results.

Move old/superseded audits here.

Archived does **not** mean false. It means:

> This document is historical and should not be assumed to describe the latest state of the codebase.

Preserve dates and original content.

---

## `docs/audit-prompts/`

**Meaning:** Instructions used to perform audits.

Examples:

```text
cross-feature-integration-audit.md
security-audit.md
performance-audit.md
operational-workflow-audit.md
```

An audit prompt is not an audit result and therefore should not live under `audits/`.

---

## `docs/proposals/`

**Meaning:** Ideas or designs that have not yet been formally accepted.

A proposal means:

> This is being considered.

When a proposal is accepted, do not leave the proposal as the only authoritative record. Create or update the corresponding decision.

---

## `docs/archive/`

Use only for documentation that does not fit the active lifecycle categories or is intentionally retired as a general historical artifact.

Prefer `audits/archive/` or `plans/completed/` where the document clearly belongs to one of those categories.

---

# Current Repository → Target Migration Map

The following mapping is based on the current documentation structure that was reviewed.

## Keep in place

### `docs/ARCHITECTURE.md`

Action:

```text
KEEP
```

Reason:

Canonical architecture document.

---

### `docs/README.md`

Action:

```text
KEEP IN PLACE AND UPDATE
```

Reason:

It should become the documentation index explaining the new structure and authority rules.

---

# Audit Files

Current `docs/audits/` contains a mixture of current audits, historical audits, remediation records, and an audit prompt.

Do not leave that mixture after reorganization.

## Current / active audit baseline

The following should be reviewed and, if confirmed current against the latest code, placed under:

```text
docs/audits/current/
```

### `myliberty-reconciled-full-audit-2026-09-27.md`

Recommended destination:

```text
docs/audits/current/2026-09-27-reconciled-full-audit.md
```

Reason:

This is the reconciled audit intended to represent the current baseline.

---

### `2026-09-27-claude-audit-broader-findings.md`

Recommended destination:

```text
docs/audits/current/2026-09-27-claude-audit-broader-findings.md
```

Reason:

Recent supporting audit findings.

Do not rename it to imply that it supersedes the reconciled audit unless the content actually does so.

---

### `2026-09-27-claude-audit-continuation.md`

Recommended destination:

```text
docs/audits/current/2026-09-27-claude-audit-continuation.md
```

Reason:

Recent continuation evidence supporting the current audit trail.

---

### `myliberty-full-audit-2026-09-27.md`

Recommended destination:

```text
docs/audits/archive/2026-09-27-myliberty-full-audit.md
```

Reason:

The reconciled version is the stronger consolidated baseline.

Before archiving, verify there is no unique current information that would be lost. If there is, keep it under `current/` with clear supporting/historical labeling.

---

## Historical audits

The following older audits should normally move to:

```text
docs/audits/archive/
```

Examples:

```text
2026-09-24-audit-revision-v2.md
2026-09-24-front-office-local-audit.md
2026-09-24-maker-checker-operational-audit.md
2026-09-24-system-audit-safety-net.md
2026-09-25-audit-implementation-walkthrough.md
2026-09-25-full-architecture-audit.md
2026-09-25-kiosk-security-audit-revision.md
FULL_ARCHITECTURE_AUDIT.md
architecture-and-performance-audit.md
```

Important:

Do not automatically mark these audits as wrong.

They are historical evidence.

Preserve them, but make their historical status obvious.

---

## Qodo remediation audit

### `qodo-findings-remediation.md`

Recommended destination:

```text
docs/audits/archive/qodo-findings-remediation.md
```

Reason:

It records a previous remediation cycle rather than serving as the primary current system audit.

If parts of it still serve as an active verification reference, note that clearly in its metadata and link it from the current audit index.

---

# Move the Audit Prompt

### Current

```text
docs/audits/myliberty-cross-feature-integration-audit-prompt.md
```

### Target

```text
docs/audit-prompts/cross-feature-integration-audit.md
```

Reason:

This is an instruction set for performing an audit, not an audit result.

The final revised version of this prompt should replace or supersede the older prompt rather than leaving multiple similarly named versions without status.

---

# Plans

Current `docs/plans/` should be separated into:

```text
docs/plans/active/
docs/plans/completed/
```

## Likely active plans

Review status before moving. Likely active examples include:

```text
operational-audit-execution-plan.md
large-file-splitting-plan.md
outreach-manager-marketing-remediation-plan.md
spark-scale-and-log-retention-plan.md
```

Target:

```text
docs/plans/active/
```

Only place a plan here if work remains to be done.

---

## Plans that are actually subsystem specifications

The following should be evaluated for movement to `docs/specs/` rather than remaining in `plans/`.

### `attendance-module-v4-myliberty-integration-spec.md`

Preferred destination:

```text
docs/specs/attendance/attendance-module-v4-myliberty-integration-spec.md
```

Reason:

The filename itself identifies it as an integration specification.

---

### `myliberty-parent-student-roster-data-model.md`

Preferred destination:

```text
docs/specs/parent/myliberty-parent-student-roster-data-model.md
```

Reason:

This describes a data model/behavior contract more than an execution plan.

---

### `corporate-event-attendance-plan.md`

Review its actual content.

If it primarily describes intended subsystem behavior:

```text
docs/specs/corporate-events/corporate-event-attendance.md
```

If it is genuinely an implementation sequence:

```text
docs/plans/active/corporate-event-attendance-plan.md
```

Do not decide based on the filename alone.

---

### `private-toefl-vs-corporate-event-clock-in-plan.md`

Review its content.

If it defines the business/technical behavior boundary between the two flows, prefer:

```text
docs/specs/corporate-events/
```

If it remains an implementation action list, keep it under:

```text
docs/plans/active/
```

---

### `gorontalo-school-outreach-plan.md`

Review whether it is:

- a subsystem specification
- a business strategy
- or an implementation plan

If it contains intended system behavior/contracts, move to:

```text
docs/specs/outreach/
```

If it is still an implementation roadmap:

```text
docs/plans/active/
```

---

# Audit Log

### `myliberty-audit-log.md`

This should not remain under `docs/plans/`.

Preferred destination:

```text
docs/audits/audit-log.md
```

or, if it is specifically an index of historical audit activity:

```text
docs/audits/README.md
```

Choose based on its actual content.

The executor should inspect it before moving it.

---

# Revision Brief

### `myliberty-revision-brief.md`

Inspect its purpose.

Possible destinations:

```text
docs/plans/active/
```

if it is an actionable implementation brief,

or:

```text
docs/specs/
```

if it defines intended system behavior.

Do not automatically classify it without inspecting its contents.

---

# Proposals

Current `docs/proposals/` contains appropriate proposal-style documents.

Keep unfinished proposals under:

```text
docs/proposals/
```

Examples:

```text
2026-09-23-front-office-operations-enhancement.md
2026-09-25-kiosk-clock-in-audit-comparison.md
2026-09-25-kiosk-clock-in-security-hardening.md
myliberty-available-batches-roadmap.md
```

---

# Important Special Case: Multi-Branch Data Isolation

### Current

```text
docs/proposals/2026-09-24-multi-branch-data-isolation.md
```

This proposal should be reviewed against the current accepted architecture.

If the branch-isolation model has been formally accepted and is now an intended architectural rule, create:

```text
docs/decisions/2026-09-24-multi-branch-data-isolation.md
```

The old proposal may then be retained in:

```text
docs/proposals/archive/
```

or:

```text
docs/archive/
```

if the repository wants to preserve proposal history separately.

Important:

Do not simply move the proposal and call it a decision.

A decision document should clearly state:

- the selected policy
- important exceptions
- what is explicitly not allowed
- effective status
- date accepted
- relationship to implementation
- superseded/superseding decision, if applicable

---

# Document Metadata Standard

Add a lightweight metadata header to major documents.

Example:

```yaml
---
title: Multi-Branch Data Isolation
type: decision
status: active
created: 2026-09-24
last_verified: 2026-09-28
verified_against_commit: <CURRENT_COMMIT>
supersedes: null
superseded_by: null
---
```

Suggested `type` values:

```text
architecture
decision
spec
plan
audit
audit-prompt
proposal
```

Suggested `status` values:

```text
active
draft
planned
completed
current
archived
superseded
```

Use only metadata values that actually describe the document.

Do not fabricate verification dates or commit hashes.

---

# Authority Rules

Add the following policy to `docs/README.md`.

```text
DOCUMENT AUTHORITY

ARCHITECTURE.md
    Describes the current system architecture.

decisions/
    Contains accepted business and architectural decisions.

specs/
    Describes intended subsystem behavior and contracts.

plans/
    Describes work that is planned or being executed.

audits/current/
    Contains current audit findings and verification baselines.

audits/archive/
    Contains historical audit results.

audit-prompts/
    Contains instructions used to perform audits.

proposals/
    Contains ideas and designs that have not yet been accepted.

Historical documents do not override current source code, Firestore rules,
tests, or verified runtime behavior.
```

---

# Important Lifecycle Model

Use this conceptual lifecycle:

```text
PROPOSAL
   ↓
DECISION
   ↓
SPEC
   ↓
PLAN
   ↓
IMPLEMENTATION
   ↓
AUDIT / VERIFICATION
```

Not every document must pass through every stage.

The purpose is to prevent old documents from becoming accidental implementation instructions.

---

# Naming Convention

Prefer descriptive names with dates where time matters.

### Audits

```text
YYYY-MM-DD-short-description.md
```

Example:

```text
2026-09-27-reconciled-full-audit.md
```

### Decisions

```text
YYYY-MM-DD-short-decision-name.md
```

### Proposals

```text
YYYY-MM-DD-short-proposal-name.md
```

### Stable specifications

A date is optional.

Example:

```text
attendance-module-v4-integration-spec.md
```

### Prompts

Use stable names rather than version clutter where possible.

Example:

```text
cross-feature-integration-audit.md
```

If a prompt changes significantly, Git history records the revisions; avoid filenames like:

```text
prompt-v7-final-final-2.md
```

---

# Required `docs/README.md` Structure

Update `docs/README.md` so a new AI agent can understand the documentation hierarchy immediately.

Suggested outline:

```text
# MyLiberty Portal Documentation

## Start Here

1. `ARCHITECTURE.md`
2. `decisions/`
3. `specs/`
4. `plans/active/`
5. `audits/current/`

## Documentation Authority

[Explain the authority rules.]

## Folder Guide

[Explain each folder.]

## Current Audit Baseline

[Link to the current reconciled audit.]

## Current Decisions

[List important accepted decisions.]

## Active Plans

[List active implementation plans.]

## Historical Material

[Explain archive locations.]
```

Do not duplicate entire documents into the README.

Use links.

---

# Safety Checks Before Moving Anything

Before executing:

1. Inventory every file currently under `docs/`.
2. Identify Markdown files not covered by the migration map.
3. Inspect ambiguous files before classifying them.
4. Check for internal Markdown links.
5. Check for references from `AGENTS.md`.
6. Check for references from `docs/ARCHITECTURE.md`.
7. Check for references from audit prompts.
8. Check for references from other documentation.
9. Preserve filenames/content where there is no strong reason to rename.
10. Confirm no source code path depends on a Markdown path.

---

# Safety Checks After Moving

After reorganization:

1. Confirm every original document still exists somewhere in the documentation tree unless explicitly retired.
2. Confirm internal Markdown links resolve.
3. Confirm `docs/README.md` points to the new canonical locations.
4. Confirm `AGENTS.md` references still resolve.
5. Confirm `docs/ARCHITECTURE.md` references still resolve.
6. Confirm the current audit index points to the current audit.
7. Confirm no document claims to be current while marked `archived` or `superseded`.
8. Confirm no active plan is accidentally placed under `completed/`.
9. Confirm no audit prompt remains under `audits/`.
10. Confirm no current architecture document is accidentally placed under `archive/`.

---

# Final Executor Report

After completing the reorganization, produce a concise report containing:

## 1. Changes Made

A table:

| Old Path | New Path | Action | Reason |
|---|---|---|---|

## 2. Documents Not Moved

List every document intentionally left in its original location and explain why.

## 3. Ambiguous Documents

List any documents where classification was uncertain.

Do not silently guess.

## 4. Link Verification

Report whether internal Markdown links were checked and whether any broken links remain.

## 5. Documentation Authority

Confirm that:

- `ARCHITECTURE.md` remains canonical
- current decisions are identifiable
- current specs are identifiable
- active plans are identifiable
- current audits are identifiable
- historical audits are clearly archived
- audit prompts are separated from audit results
- proposals are clearly distinguished from accepted decisions

## 6. No Application Logic Changed

Explicitly confirm that this task changed documentation organization only.

---

# Definition of Done

This documentation reorganization is complete when:

- `docs/` clearly separates architecture, decisions, specs, plans, audits, audit prompts, and proposals
- current vs historical audit material is obvious
- an AI coding agent can identify the correct document type without guessing
- historical documents are preserved
- substantive documentation content is not accidentally rewritten
- internal links are updated
- `docs/README.md` explains the structure and authority model
- no application code or Firestore behavior was changed
- the final executor report documents all moves and exceptions

---

# Recommended End State

The intended end state is:

```text
docs/
├── README.md
├── ARCHITECTURE.md
├── decisions/
├── specs/
├── plans/
│   ├── active/
│   └── completed/
├── audits/
│   ├── current/
│   └── archive/
├── audit-prompts/
├── proposals/
└── archive/
```

Keep this structure intentionally simple.

The goal is not to create a large documentation bureaucracy.

The goal is to make the answer to this question obvious:

> "Which document should an AI coding agent trust for this question?"
