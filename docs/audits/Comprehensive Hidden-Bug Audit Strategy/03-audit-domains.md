# Audit Domains

What to check in each Portal area, in the recommended audit order. Security and data-integrity layers come first so they're understood before presentation-oriented areas are called complete. Step 14 is the final cross-feature audit (see `04-lifecycle-and-attack-audits.md`).

> **Refreshed 2026-10-12:** updated for the dual-control approval-envelope subsystem, the executive
> dual-control model (Blueprint v3.3), the Ops Lead / Front Office split, the kindergarten division
> portal, the Office Boy / facilities dashboard, log retention, and the progress-report/promotion flow.
> Same-day second pass: service-account integrations & ops tooling (Domain 13), rules expression
> budget and index parity (Domain 2), dev-tool build gating (Domain 1), accessibility (Domain 12).
> The 13-domain numbering is unchanged — domain audit reports and file names reference it.

## 1. Authentication / Roles / Permissions
Login/logout, session state, role normalization, legacy role aliases, custom claims, role-based UI, Firestore rules, server-side role enforcement, employee status, resigned/terminated and invited users, branch assignment and changes.
Also verify the newer authority surfaces: the Ops Lead vs Front Office role separation, the kindergarten division manager portal, and the executive dual-control model — `director` holds strategic control, `vice_director` holds operational control (Blueprint v3.3 §5.4/§41). They are complementary domains, not interchangeable admin roles; no dashboard or rule may collapse them or hand one the other's authority by default. Verify development-only surfaces (`DevQuickSwitcher`, dev presets, debug panels) are genuinely absent from production builds — this exact leak was found and fixed in the 2026-10-12 audit (DOM01-SEC-02) — and that new dev tools are build-gated from birth.
> Does every layer agree on what a user's role actually is?

## 2. Branch Isolation / Firestore Security Rules
Every `get`, `list`, query, and collection-group query; branch filtering; admin/manager/front-office exceptions; client-side filtering; Worker branch validation.

Two file-level constraints to verify on every rules change:
- **Expression budget:** the rules engine caps evaluation at 1000 expressions and this rules file is already shaped by that ceiling (documented at multiple points in `firestore.rules`). Record approximate headroom impact in the audit evidence — a change that pushes over budget fails deployment or forces refactors under pressure.
- **Index parity:** every compound query shape in the repositories must have a matching entry in `firestore.indexes.json`. A missing index does not always error loudly — it can silently degrade into an unbounded fallback that returns wrong numbers (see DOM04-IDX-01, the Kindergarten cash reconciliation reporting IDR 0).
> Can a user ever receive another branch's data, even if the UI later hides it?

## 3. Attendance + Kiosk
Template for future audits. Chain: scanner → QR validation → identity, role, branch, class/event resolution → shift state → clock-in/out → class switching → student attendance → duplicate handling → manual correction → Worker → Firestore → rules → reports.

Special attention: fail-open fallbacks, duplicates, concurrency, kiosk and device identity, physical hardware constraints (camera stream unmount, autofocus, wake lock, offline toggle), challenge replay, clock-out identity binding, branch mapping, role mismatches, ambiguous event matching, overnight events, offline mutations, manual attendance conflicts, and listener cleanup on dashboard views.

## 4. Payments / Cash / Financial State
Creation, confirmation, cash collection, cashier role, refunds, adjustments, discounts, receipts, status changes, duplicate transactions, partial payments, failed writes, reconciliation, audit logging.
> Can money-related state change more than once, or without a trustworthy audit trail?

## 5. Students / Admissions / Profiles
Audit the full lifecycle (see lifecycle file). Watch orphaned references, deleted student IDs, roster cleanup, parent links, duplicate profiles, branch migration, admission status transitions.
Include the progress-report and promotion flow: reports written against a class/instructor, `eligibleForPromotion` flags, and promotion decisions. Can a report or promotion flag outlive the student's class move, branch migration, or withdrawal, and still influence decisions?

## 6. Classes / Rosters / Scheduling
Creation, instructors, substitutes, rosters, enrollments, schedule conflicts, branch ownership, student/instructor removal, attendance linkage, class deletion, stale assignments.
> Can an old or invalid class relationship still influence attendance, reports, or permissions?

## 7. Corporate Events / Staff Shifts / Leave
Event matching and ambiguity, general duty, staff scheduling, shift create/switch/close, leave, approvals, event windows, overnight events, branch, role normalization. Compare client vs Firestore vs Worker role logic; they must not silently disagree.
Include the Office Boy / facilities surface: facility duty and clock-in flows, desk-directive assignment, completion and reopen for facilities staff, and dashboard stat correctness (urgent/overdue counting).

## 8. Parent Portal
Parent-to-student relationships, visibility, multiple children, inactive/deleted students, branch isolation, attendance and payment visibility, stale references.
> Can a parent reach another student's data through an indirect relationship or unscoped query?

## 9. Approvals / Maker-Checker / Audit Logs
Creator vs approver, self-approval prevention, status transitions, duplicate approvals, rejected-state reopening, edits after approval, audit trail integrity.

This domain now includes the **directives / approval-envelope subsystem** (dual-control maker-checker), which gates sensitive actions behind approved envelopes and rules enforcement. Verify at minimum:
- **Envelope binding is server-side.** `actionId → approverRole` and envelope → action binding must be enforced by Firestore rules, never by client-supplied fields (this exact class of bug was caught in October 2026 — see `docs/audits/current/regression-log.md`, 2026-10-10).
- **Server timestamp integrity.** Completion and decision records must use `request.time` / `serverTimestamp()` semantics; forged client timestamps must be rejected.
- **Attribution integrity.** Completion/decision records must bind to the acting UID, with display names resolved server-side or verified against the actor.
- **Supervisor authority.** Who may reopen, complete, or approve for whom; assignee-scoped completion; creator-vs-supervisor asymmetry.
- **Known envelope families** (verify each against rules, not this list): `NEW_STAFF_ACCOUNT`, staff role elevation, staff deactivation/termination, `RETROACTIVE_STUDENT_ATTENDANCE`, placement-level override, student withdrawal/enrollment freeze, substitute-instructor assignment (logged), whole-class cancellation/reschedule (logged), staff shift self-correction routing, plus facilities desk-directive reopen/complete authority.
- **Audit log integrity and retention** (`logRetentionRepository`): can logs be edited after the fact, and does retention deletion preserve the trails that governance requires?

## 10. PWA / Network / Service Worker / Updates
Offline detection vs actual reachability, stale service worker, update prompts, reloads, network transitions, queued writes, Firestore persistence, failed requests, reconnect recovery, preload errors, stale JS bundles.
> `navigator.onLine` does not prove backend reachability.

## 11. Reports / Dashboards / Derived Data
Source queries, bounded query limits (preventing unbounded historical scans), listener lifecycle cleanup on unmount, branch/role filters, date ranges, timezone, aggregation, stale/missing/duplicate records, manual corrections, archived records. Compare dashboards against source-of-truth records.

Also audit the executive dashboards against the dual-control model: Director (strategic) and Vice Director (operational) views must present only authority each actually holds — broad visibility does not confer business-write authority (Blueprint v3.3 Principle 16). The dashboard-by-dashboard refinement effort (front office, instructor leader, office boy, marketing, kindergarten, executive) should pair each refinement phase with the Level 1 playbook and this domain's checks. Derived cards such as `BranchHealthAuditCard` and `LogRetentionCard` need their staleness model verified: what is the source of truth, and how stale can the summary become?

## 12. UX / Navigation / Mobile
Discoverability, primary actions, hierarchy, labels, button clarity, errors, loading and empty states, mobile navigation, More menus, kiosk feedback, destructive actions, confirmations. UX is a correctness concern when unclear UI can cause the wrong action.
Include the accessibility basics AGENTS.md requires: form labels, keyboard operability, understandable status indicators, and meaning that does not depend on color alone.

## 13. Cloudflare Worker / External Integrations & Ops Tooling

### Cloudflare Worker
Authentication, signature verification, challenge generation/consumption, replay prevention, identity binding, role and branch validation, rate limiting, server time, payload validation, error handling, concurrency, multi-instance behavior, Firestore writes, audit events. Never assume server-side code is secure just because it's server-side.

### Service-Account Integrations & Privileged Ops Tooling
Anything holding a service-account key writes with admin privilege and bypasses every Firestore rule — the Google Apps Script form sync (`FormSync.gs`, writing to the `applications` collection via REST API) and the administrative backfill/migration scripts (`scripts/audit-and-backfill-division.js`, `scripts/backfill-attendance-branch.js`, etc.) belong to this class: "anything holding a service-account key writes as admin, not as a user — audit it like server-side code."

**Checklist for Service-Account Integrations & Ops Scripts:**
- **Key custody & credential hygiene:** Where is the key stored? In Apps Script, verify it stays strictly in Script Properties (`SERVICE_ACCOUNT_KEY`). Locally, verify `serviceAccountKey.json` remains gitignored and untracked (never committed to repository history).
- **Pre-write input validation:** Does the script validate data types, required attributes, and domain boundaries before calling Firestore REST/Admin endpoints, or does it write unvalidated external payloads directly with admin privilege?
- **Schema & migration drift:** What happens when Portal document schemas evolve (e.g. required division/branchId fields, status enums) while the external script continues writing legacy payload shapes?
- **Deduplication & idempotency:** If form submissions trigger multiple times or network retries occur, does `FormSync.gs` deduplicate by natural key/email or flood Firestore with ghost applicant documents?
- **Trigger authorization & abuse prevention:** Who can trigger the integration or invoke the endpoint? Can arbitrary public actors submit spam or manipulated payloads directly into Firestore?
- **Identity & audit trail attribution:** Do writes carry explicit system/script metadata identifying them as automated or batch operations, rather than anonymous or user-initiated updates?
- **Bulk mutation risk & rollback plan:** For any ops/backfill script executed against production, is there a documented risk assessment, dry-run mode, and verified rollback script before execution (mandatory per `AGENTS.md`)?
- **Batching & contention:** Do bulk scripts respect Firestore batch limits (500 ops/commit) and prevent write contention on shared/hot documents?

> **Cleared baseline checks (verified negatives):**
> - `serviceAccountKey.json` is confirmed gitignored, untracked, and was never committed across any git branch in history.
> - No Firebase Storage usage exists (`getStorage` in `walkInUtils.js` is a local wrapper, not Firebase Storage; no storage security rules required).
> - No push notifications (`firebase-messaging`), no Cloud Functions; school outreach is maintained under the marketing dashboard.

## Audit Order

1. Auth / Roles / Permissions
2. Branch Isolation / Firestore Rules
3. Attendance + Kiosk
4. Payments / Cash
5. Students / Admissions
6. Classes / Rosters / Scheduling
7. Corporate Events / Shifts / Leave
8. Parent Portal
9. Approvals / Audit Logs
10. PWA / Network
11. Reports / Dashboards
12. UX / Navigation / Mobile
13. Cloudflare Worker / Integrations
14. Final Cross-Feature Attack Audit
