# Audit Cadence

**Principle:** Small targeted audits continuously, deeper section audits periodically, a full cross-feature audit at milestones. The calendar is a baseline; coverage must not slip.

## Three Audit Levels

| Level | When | Question |
|---|---|---|
| **1. Targeted Regression** | After every meaningful feature change, bug fix, rule/schema/workflow change | Did this break the feature or any directly connected workflow? |
| **2. Section Deep Audit** | Every 1–2 months during active development, or sooner after heavy changes | What hidden defects exist inside this workflow? |
| **3. Full Portal Audit** | Every 3–6 months, before major releases, after major architecture/security changes | Does the Portal still work correctly as one system? |

Plus **Release Verification** (security, data integrity, critical workflows) before major releases.

**Level 1** applies especially to: attendance, kiosk, payments, roles, branch logic, Firestore rules, deletions, approvals, shared repositories, Worker/API contracts, scheduling. Example chain: fix Kiosk clock-in → kiosk → shift → attendance regression.

**Level 2** can rotate between sections (e.g. Cycle A: Attendance/Kiosk + Roles/Branch; Cycle B: Payments + Admissions; Cycle C: Classes + Events/Shifts). Risky or fast-changing sections go sooner.

**Level 3** hunts lifecycle and cross-feature problems: student/staff lifecycle, branch isolation, role transitions, Attendance ↔ Classes/Reports, Payments ↔ Students, Approvals ↔ Audit Logs, Kiosk ↔ Worker ↔ Firestore.

## Triggers Override the Calendar

Run an immediate focused audit when changing: Firestore rules, authentication, role normalization, branch logic, payment/attendance/kiosk logic, deletion/cascade behavior, Worker/API auth, identity verification, challenge/signature logic, shared data models, class/enrollment relationships, approval rules, or high-volume queries/listeners risking quota spikes.

Example: change rules → immediate security regression → audit affected workflows → deep audit if it crosses trust boundaries.

## Depth Matches Risk

| Risk | Examples | Audit |
|---|---|---|
| Low | Wording, spacing, cosmetic layout | Targeted regression |
| Medium | Feature-state logic, repository behavior, dashboard queries, form validation, role-aware navigation | Targeted regression + affected-workflow review |
| High | Firestore rules, Worker auth, branch isolation, role enforcement, payments, attendance, deletion, identity, approvals, queries over unbounded collections, listener lifecycle changes | Targeted regression + connected-workflow audit + deep audit when warranted |

Goal: proportional rigor, not maximum process for every commit.

## Default Calendar

| Timing | Audit | Scope |
|---|---|---|
| After every significant change | Targeted Regression | Changed feature + connected workflows |
| Every 1–2 months (active dev) | Section Deep Audit | One or more sections |
| Every 3–6 months | Full Portal Audit | Cross-feature system |
| Before major release | Release Verification | Security, integrity, critical workflows |
| After high-risk change | Triggered Deep Audit | Security/data-sensitive area |

## Audit Debt

If a section keeps changing but its deep audit keeps slipping, record it as **audit debt** so it stays visible:

```text
Section: Payments
Last deep audit: 2026-08-01
Major changes since audit: 17
Deep audit due: YES
```

## Stable Sections Still Need Audits

Unchanged features can still break from shared rule, role, branch, schema, or Worker changes, new reports, new clients, or new mobile flows. *"Nothing changed in this feature" ≠ "this feature can't break."* The full Portal audit exists partly to catch indirect regressions.
