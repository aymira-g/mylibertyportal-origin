# MyLiberty Portal — Audit Strategy

Canonical operating model for finding hidden bugs in the MyLiberty Portal.

**Loop:** Build → Change → Targeted Regression → Continue Building → Section Deep Audit → Cross-Feature Audit → Release Verification → Periodic Full Audit

Don't repeat one giant audit after every change. Make QA part of the development lifecycle.

## Core Insight

Serious defects rarely sit in the happy path. They live at **boundaries**:

UI → client logic → repository → Firestore · client → Worker/API → Firestore · Firestore → security rules · one workflow → another · one role → another · one branch → another · an operation → its retry/failure path.

So audit **section by section**, trace each section as a **complete business workflow**, and finish with a **cross-feature attack audit**.

## Files

| File | Contents |
|---|---|
| `01-audit-cadence.md` | Three audit levels, triggers, rhythm, risk-based depth, audit debt |
| `02-audit-method.md` | Workflow tracing, five-pass method, failure matrix, special trigger categories, time, branch, consistency, runtime matrix |
| `03-audit-domains.md` | What to audit in each of the 13 Portal areas, plus recommended order |
| `04-lifecycle-and-attack-audits.md` | Student/staff lifecycles, final attack audit, kiosk lessons |
| `05-bug-tracking.md` | Bug ledger, audit record, bug lifecycle, remediation phases, severity |
| `06-checklists-and-agent-instructions.md` | Definition of done, coding-agent instructions |

## Goal

Not "find some bugs." Instead: **demonstrate, with evidence, that every important workflow behaves correctly** under normal use, misuse, failure, concurrency, retry, network loss, permission and branch boundaries, and cross-feature handoffs.

Move from *"I think the Portal works"* to *"We tested the important workflows and know what works, what's broken, and what still needs verification."*

The Kiosk audit is the template for the rest of the Portal: deep vertical audits per section, then cross-feature attack audits, then runtime verification.
