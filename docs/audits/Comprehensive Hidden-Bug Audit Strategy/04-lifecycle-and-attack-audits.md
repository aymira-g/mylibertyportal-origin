# Lifecycle and Attack Audits

## Student Lifecycle

```text
Inquiry → Application → Student Profile → Parent Relationship → Class Enrollment
→ Attendance → Payment → Reports → Archive → Delete
```

At every stage ask:
- Is the same student ID used, and the same branch preserved?
- Is the student still active?
- Can stale references remain, or deletion leave orphaned IDs?
- Do reports still include deleted data?
- Can the parent still see the student after removal?
- Can attendance still be recorded after archival?

## Staff Lifecycle

```text
Invite → Profile → Role → Branch → Class Assignment → Kiosk → Shift → Leave → Approval → Reports
```

At every stage verify: role consistency, branch consistency, employment status, permissions, shift ownership, class eligibility, approval permissions, report visibility.

A staff member changing branches or roles should be an explicit test case.

## Final Cross-Feature Attack Audit

After the section audits, do one pass that ignores module boundaries:

> How could one valid user misuse normal workflows to produce an invalid result?

Scenarios: student lifecycle manipulation, staff role manipulation, branch switching, duplicate attendance, duplicate payment, unauthorized approval, stale invitation, deleted-user references, old class assignments, event ambiguity, shift duplication, manual correction overwrite, cross-branch query leakage, offline mutation replay, Worker/client disagreement.

Section audits can make each module look correct while the combined app still has exploitable workflow combinations.

## What the Kiosk Audit Taught Us

The deeper Attendance/Kiosk review surfaced issues a broad audit missed:

- Security-sensitive kiosk path silently falling back to a weaker direct Firestore path
- Clock-out proof not fully tied to employee identity
- Non-atomic open-shift creation
- Class switching bypassing the hardened kiosk Worker path
- Inconsistent reachability safeguards for critical kiosk mutations
- Excessive trust in client-supplied business metadata
- Ambiguous student event matching and overnight event-window edge cases
- Incomplete human-readable branch mapping in the Worker
- Client/Worker role-normalization drift
- Possible concurrency issues in challenge consumption
- Deterministic student attendance IDs blocking multiple same-day events
- Status-timer race in the kiosk UI

> Hidden bugs often live at the boundaries between systems, not inside the obvious happy path.

That's why the Portal should be audited with vertical workflow slices.
