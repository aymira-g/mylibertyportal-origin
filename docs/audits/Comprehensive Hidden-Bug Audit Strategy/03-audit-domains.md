# Audit Domains

What to check in each Portal area, in the recommended audit order. Security and data-integrity layers come first so they're understood before presentation-oriented areas are called complete. Step 14 is the final cross-feature audit (see `04-lifecycle-and-attack-audits.md`).

## 1. Authentication / Roles / Permissions
Login/logout, session state, role normalization, legacy role aliases, custom claims, role-based UI, Firestore rules, server-side role enforcement, employee status, resigned/terminated and invited users, branch assignment and changes.
> Does every layer agree on what a user's role actually is?

## 2. Branch Isolation / Firestore Security Rules
Every `get`, `list`, query, and collection-group query; branch filtering; admin/manager/front-office exceptions; client-side filtering; Worker branch validation.
> Can a user ever receive another branch's data, even if the UI later hides it?

## 3. Attendance + Kiosk
Template for future audits. Chain: scanner → QR validation → identity, role, branch, class/event resolution → shift state → clock-in/out → class switching → student attendance → duplicate handling → manual correction → Worker → Firestore → rules → reports.

Special attention: fail-open fallbacks, duplicates, concurrency, kiosk and device identity, physical hardware constraints (camera stream unmount, autofocus, wake lock, offline toggle), challenge replay, clock-out identity binding, branch mapping, role mismatches, ambiguous event matching, overnight events, offline mutations, manual attendance conflicts, and listener cleanup on dashboard views.

## 4. Payments / Cash / Financial State
Creation, confirmation, cash collection, cashier role, refunds, adjustments, discounts, receipts, status changes, duplicate transactions, partial payments, failed writes, reconciliation, audit logging.
> Can money-related state change more than once, or without a trustworthy audit trail?

## 5. Students / Admissions / Profiles
Audit the full lifecycle (see lifecycle file). Watch orphaned references, deleted student IDs, roster cleanup, parent links, duplicate profiles, branch migration, admission status transitions.

## 6. Classes / Rosters / Scheduling
Creation, instructors, substitutes, rosters, enrollments, schedule conflicts, branch ownership, student/instructor removal, attendance linkage, class deletion, stale assignments.
> Can an old or invalid class relationship still influence attendance, reports, or permissions?

## 7. Corporate Events / Staff Shifts / Leave
Event matching and ambiguity, general duty, staff scheduling, shift create/switch/close, leave, approvals, event windows, overnight events, branch, role normalization. Compare client vs Firestore vs Worker role logic; they must not silently disagree.

## 8. Parent Portal
Parent-to-student relationships, visibility, multiple children, inactive/deleted students, branch isolation, attendance and payment visibility, stale references.
> Can a parent reach another student's data through an indirect relationship or unscoped query?

## 9. Approvals / Maker-Checker / Audit Logs
Creator vs approver, self-approval prevention, status transitions, duplicate approvals, rejected-state reopening, edits after approval, audit trail integrity.

## 10. PWA / Network / Service Worker / Updates
Offline detection vs actual reachability, stale service worker, update prompts, reloads, network transitions, queued writes, Firestore persistence, failed requests, reconnect recovery, preload errors, stale JS bundles.
> `navigator.onLine` does not prove backend reachability.

## 11. Reports / Dashboards / Derived Data
Source queries, bounded query limits (preventing unbounded historical scans), listener lifecycle cleanup on unmount, branch/role filters, date ranges, timezone, aggregation, stale/missing/duplicate records, manual corrections, archived records. Compare dashboards against source-of-truth records.

## 12. UX / Navigation / Mobile
Discoverability, primary actions, hierarchy, labels, button clarity, errors, loading and empty states, mobile navigation, More menus, kiosk feedback, destructive actions, confirmations. UX is a correctness concern when unclear UI can cause the wrong action.

## 13. Cloudflare Worker / External Integrations
Authentication, signature verification, challenge generation/consumption, replay prevention, identity binding, role and branch validation, rate limiting, server time, payload validation, error handling, concurrency, multi-instance behavior, Firestore writes, audit events. Never assume server-side code is secure just because it's server-side.

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
