# MyLiberty Portal — Attendance Kiosk Deep Audit & Trigger Map

**Project:** MyLiberty Portal  
**Repository:** `https://github.com/aymira-git/mylibertyportal-origin`  
**Audit target:** Staff kiosk, student kiosk, corporate-event clock-in, class transition, clock-out, and kiosk security plumbing  
**Current repository inspected:** commit `3d1d9d073ba77c09c567a838eb754dc896a19f77`  
**Date:** 2026-09-28

---

# 1. Executive Summary

The kiosk is more security-hardened than it was in earlier versions, but the current implementation still contains several **high-impact failure paths hidden at the seams between the browser, Firestore, and the Cloudflare Worker**.

The most important discovery is:

> **The kiosk security model is strong only when the hardened worker path is actually used. One code path can silently fall back to direct Firestore writes, which defeats the intended fail-closed design.**

There are also separate correctness problems around:

- Clock-out authorization
- Duplicate/parallel clock-in races
- Class switching
- Offline/reconnect behavior
- Client-controlled attendance metadata
- Multiple overlapping corporate events
- Branch labels
- Legacy roles
- Event timing

These are not all equally severe.

The recommended response is **not** to rewrite the kiosk.

The recommended response is:

1. Fix the fail-open and authorization/data-integrity problems.
2. Make shift writes server-authoritative.
3. Make kiosk actions idempotent and race-safe.
4. Make class/event selection authoritative.
5. Then run a real kiosk trigger matrix on physical devices.

---

# 2. Severity Legend

### Critical

Can undermine the kiosk's security boundary or create serious cross-person/cross-branch data corruption.

### High

Can create incorrect attendance/shift records, allow meaningful unauthorized mutation, or reliably break an important operational flow.

### Medium

Meaningful operational/data-quality defect, but narrower impact or easier recovery.

### Low

UX, cleanup, or edge-case issue that should be addressed after the higher-risk findings.

---

# 3. Findings at a Glance

| ID | Finding | Severity | Evidence status |
|---|---|---:|---|
| K-01 | Hardened kiosk clock-in silently falls back to direct Firestore | **Critical** | Verified by code |
| K-02 | Verified clock-out does not bind `shiftId` to the scanned person | **High** | Verified by code |
| K-03 | “Single open shift” protection is race-prone | **High** | Verified design flaw; concurrency test required |
| K-04 | Class switching bypasses kiosk proof and omits branch fields | **High** | Verified by code |
| K-05 | Clock-out/class-switch paths bypass the kiosk network guard | **High** | Verified by code; replay effect needs runtime confirmation |
| K-06 | Worker trusts client-supplied class/event/punctuality metadata | **High** | Verified by code |
| K-07 | Student multi-event attendance loses the selected event identity | **Medium/High** | Verified by code |
| K-08 | Event time-window logic does not model overnight events | **Medium** | Verified by code |
| K-09 | Worker hardcodes only two branch display names | **Medium** | Verified by code |
| K-10 | Legacy role aliases are accepted in parts of the app but rejected by worker shift tracking | **Medium** | Verified by code |
| K-11 | Kiosk class/event eligibility is largely client-resolved | **Medium/High** | Verified architecture; abuse requires kiosk request tampering |
| K-12 | Challenge consumption is not atomically consumed across worker instances | **Medium/High** | Verified design concern; concurrency test required |
| K-13 | Student daily attendance ID cannot represent multiple independent same-day attendance events | **Medium** | Verified data-model limitation |
| K-14 | Kiosk status auto-clear timers can race with newer status messages | **Low** | Verified UI pattern |

---

# 4. K-01 — Hardened Kiosk Clock-In Can Silently Fall Back to Direct Firestore

## Severity

**CRITICAL**

## Status

**Verified by code**

## Location

`src/features/attendance/shiftsRepository.js`

Function:

```text
kioskClockInWithProof()
```

## Current behavior

The hardened kiosk flow uses:

```text
Cloudflare Worker
+
device registration
+
single-use challenge
+
P-256 device signature
+
server-side badge identity
+
server timestamp
```

That is the intended security boundary.

However, the function contains this fallback:

```javascript
// If worker base is not available or non-browser environment, fall back to direct clockIn
if (!workerBase || typeof window === "undefined" || !window.crypto?.subtle) {
  return clockIn({
    uid: badgeToken,
    role,
    classId,
    className,
    shiftType,
    eventId,
    punctuality,
    stationId,
    clockInAt: new Date(),
  });
}
```

## Why this is dangerous

The kiosk is supposed to fail closed if its server-mediated proof system is unavailable.

Instead:

```text
Worker unavailable
       ↓
Direct Firestore write
       ↓
Kiosk proof bypassed
```

A missing production environment variable could therefore silently downgrade the kiosk.

A browser capability problem could also trigger the fallback.

The application would still appear to work.

That is exactly the kind of hidden failure that is dangerous in an operational security system.

## Additional problem

The fallback call does **not pass a branch**.

`clockIn()` defaults branch information from `DEFAULT_BRANCH_ID`.

Therefore a fallback clock-in may also be written as:

```text
branchId: kota_gorontalo
branch: Kota Gorontalo
```

even when the kiosk is physically at another branch.

## Required direction

For a production kiosk:

> **No silent fallback.**

Preferred behavior:

```text
Worker unavailable
        ↓
STOP
        ↓
"Kiosk security service unavailable.
Please contact the administrator."
```

The direct `clockIn()` function may remain available for explicitly authorized non-kiosk workflows, but `kioskClockInWithProof()` should not use it as an automatic fallback.

## Test

Temporarily remove:

```text
VITE_AI_WORKER_URL
```

or point it at an unavailable endpoint.

Expected:

- Kiosk refuses staff clock-in.
- No shift document is created.
- User receives an actionable error.
- No direct Firestore shift write occurs.

---

# 5. K-02 — Verified Clock-Out Does Not Bind the Shift to the Person

## Severity

**HIGH**

## Status

**Verified by code**

## Location

`cloudflare-worker/worker.js`

Function:

```text
handleShiftClockOut()
```

## Current behavior

The client sends:

```text
deviceId
shiftId
nonce
signature
```

The server verifies:

1. Device exists.
2. Device is active.
3. Challenge is valid.
4. Device signature is valid.

The signature is based on:

```text
deviceId + nonce + shiftId
```

The server then loads:

```text
shifts/{shiftId}
```

and closes that shift.

## Missing authorization binding

The server does **not** establish:

```text
shift.userId === the employee whose badge was scanned
```

There is no scanned badge/user identity in the clock-out request.

Therefore the proof currently means:

> “This request came from a valid kiosk device and knows this shift ID.”

It does not mean:

> “This kiosk is legitimately closing this employee's shift.”

## Required direction

Bind clock-out to the employee identity.

Preferred design:

```text
badgeToken
+
shiftId
+
nonce
+
signature
```

The signature should cover the identity as well.

Server:

```text
load shift
verify shift.userId === badgeToken
verify shift is still open
close shift
```

Do not rely on the browser to choose the right shift ID.

## Test

Create:

```text
Shift A → Employee A
Shift B → Employee B
```

Use Employee A's kiosk flow and attempt to submit Shift B.

Expected:

```text
403 / 409
Clock-out rejected
Shift B remains open
```

---

# 6. K-03 — Single Open Shift Invariant Is Race-Prone

## Severity

**HIGH**

## Status

**Verified design flaw; runtime concurrency test required**

The worker does:

```text
query for existing open shift
        ↓
if one exists → reject
        ↓
create new shift
```

These are separate operations.

Two valid requests can arrive close together:

```text
Request A                  Request B

check open shift           check open shift
none found                 none found

create shift A             create shift B
```

Result:

```text
two open shifts
```

The worker calls this a “Single Open Shift Invariant”, but the current implementation does not make that invariant atomic.

## Triggers

- Two kiosk devices scan the same badge almost simultaneously.
- Duplicate camera event processing.
- Network retry.
- Two reception devices operating on the same staff member.
- A maliciously repeated valid kiosk request.

## Required direction

Enforce uniqueness atomically.

Possible approaches:

### Option A — Transactional open-shift lock

Use a server-side transaction/lock so only one request can win.

### Option B — Deterministic open-shift identity

Use a stable identity for the open-shift state while retaining separate historical shift records.

### Option C — Server-side idempotency key

Treat the same scan/action as one operation and reject duplicates.

The final design must preserve historical shift records.

## Required test

Fire multiple concurrent valid clock-in requests for the same staff member.

Expected:

```text
Exactly one open shift
All other requests rejected
```

---

# 7. K-04 — Class Switching Bypasses Kiosk Proof and Omits Branch Data

## Severity

**HIGH**

## Status

**Verified by code**

## Location

`src/features/attendance/shiftsRepository.js`

Function:

```text
switchClassAtomic()
```

## Current behavior

The function writes directly to Firestore using:

```javascript
writeBatch(db)
```

It:

1. clocks out the previous shift;
2. creates the new shift.

But the new shift does not include:

```text
branch
branchId
verifiedDeviceId
```

and it uses:

```text
clockInSource: "kiosk"
```

without going through the server-mediated kiosk proof path.

## Consequences

### Branch problem

A new shift created by this path may lack branch identity.

That can break:

- branch reporting
- later branch-scoped queries
- branch-based rules
- reconciliation
- historical data consistency

### Security-model inconsistency

Normal staff clock-in uses:

```text
Worker
+
device proof
+
server timestamp
```

Class switching uses:

```text
browser
+
direct Firestore batch
```

One part of the kiosk shift lifecycle therefore has a stronger trust model than another.

## Required direction

Use one server-authoritative shift-transition operation.

Conceptually:

```text
kiosk scan
    ↓
server verifies device
    ↓
server verifies current shift
    ↓
server closes old shift
    ↓
server validates new class
    ↓
server creates new shift
```

The transition should preserve:

- branchId
- branch
- station
- device identity
- server clock
- audit trail

---

# 8. K-05 — Clock-Out and Class-Switch Paths Bypass the Network Guard

## Severity

**HIGH**

## Status

**Verified by code; exact replay effect should be tested**

Initial scanning performs:

```javascript
checkNetworkReachability()
```

Clock-in creation also performs a reachability check.

But these paths do not:

```text
clockOutOnly()
switchToNextClass()
```

and they eventually call direct Firestore functions:

```javascript
await clockOutShift(...)
```

and:

```javascript
await switchClassAtomic(...)
```

## Why this matters

The application uses Firestore client persistence.

If a critical mutation is allowed while disconnected, the SDK may hold the mutation locally and send it later.

That is exactly what the kiosk hardening effort was trying to avoid for shift records.

## Trigger

1. Staff member has an open shift.
2. Reception phone loses Internet but remains connected to Wi-Fi.
3. Staff scans badge.
4. Clock-out or class transition is initiated.
5. Client queues or locally accepts the mutation.
6. Device reconnects much later.

The result can be an incorrect historical clock-out time or delayed class transition.

## Required direction

Critical kiosk mutations should use the same fail-closed policy:

```text
clock-in
clock-out
class switch
```

all require live reachability.

Better still:

> **All three should use the same server-authoritative kiosk endpoint.**

---

# 9. K-06 — Worker Trusts Client-Supplied Class/Event/Punctuality Metadata

## Severity

**HIGH**

## Status

**Verified by code**

The Worker accepts:

```text
classId
className
shiftType
eventId
punctuality
```

The server verifies the kiosk device and badge identity.

However, it does not appear to independently validate:

```text
classId belongs to this instructor
eventId is active
eventId matches the staff member's audience/branch
className matches classId
event metadata matches eventId
punctuality matches the actual server schedule
```

## Why this matters

A legitimate kiosk device is strong evidence of physical terminal custody.

It is not proof that the **business metadata supplied by the browser is correct**.

A modified request could potentially claim:

```text
classId = some other class
className = "Special Event"
punctuality.status = "Present"
minutesEarlyOrLate = 0
```

## Required direction

The server should derive or verify:

- employee role
- employee branch
- class assignment
- event eligibility
- class name
- event name
- schedule
- punctuality

using authoritative server-side data.

The browser should submit only the minimum intended action.

---

# 10. K-07 — Multiple Corporate Events Still Lose Student Event Identity

## Severity

**MEDIUM/HIGH**

## Status

**Verified by code**

When multiple events match, the matcher intentionally returns:

```text
match: null
matchedEvents: [...]
```

The student kiosk then writes:

```javascript
eventId: null,
eventName: null,
matchingEventIds: [...]
```

## Problem

The student record says:

> “This student was checked in while multiple events were active.”

but does not identify **which event the student actually attended**.

Example:

```text
Event A: Corporate English Workshop
Event B: Teacher Training

Student scans.

Stored:

eventId = null
eventName = null
matchingEventIds = [A, B]
```

This is not equivalent to:

```text
student attended Event A
```

## Required business decision

Choose one:

### Option A — Student event picker

Ask the operator/student which event applies.

### Option B — Deterministic event resolution

Define a strict rule such as event priority or nearest start time.

### Option C — Explicitly reject ambiguous event scans

Do not silently convert them into ordinary attendance.

---

# 11. K-08 — Corporate Event Time Window Does Not Model Overnight Events

## Severity

**MEDIUM**

## Status

**Verified by code**

`isEventWithinTimeWindow()` calculates:

```text
startTime - 120 minutes
→ endTime
```

using the same WITA calendar day.

For:

```text
start = 23:00
end = 01:00
```

the calculated end is earlier than the start.

Either:

- overnight events must be prohibited, or
- the function must explicitly handle next-day end times.

Do not leave this ambiguous.

---

# 12. K-09 — Worker Hardcodes Only Two Branch Display Names

## Severity

**MEDIUM**

## Status

**Verified by code**

Current Worker mapping:

```javascript
branch:
  device.branchId === "bone_bolango"
    ? "Bone Bolango"
    : "Kota Gorontalo"
```

The application has additional branches.

Therefore a kiosk at:

```text
Pohuwato
```

or:

```text
Limboto
```

can write:

```text
branchId = correct branch
branch = "Kota Gorontalo"
```

## Required direction

Use the existing canonical branch mapping such as:

```text
idToBranch(device.branchId)
```

Never maintain a second hand-written branch map.

---

# 13. K-10 — Legacy Roles Can Be Accepted by the App but Rejected by the Worker

## Severity

**MEDIUM**

## Status

**Verified by code**

The repository has role normalization and legacy aliases.

The Worker uses its own raw tracked-role list.

Legacy roles such as:

```text
head_instructor
branch_manager
```

are not represented there.

## Consequence

A user may be accepted by some UI logic but rejected by the kiosk Worker.

## Required direction

Use one canonical server-side role normalization strategy.

Do not maintain separate role taxonomies in:

- React
- Firestore rules
- Cloudflare Worker

---

# 14. K-11 — Kiosk Class/Event Eligibility Is Too Client-Trusting

## Severity

**MEDIUM/HIGH**

## Status

**Verified architecture; abuse scenario needs runtime testing**

The browser performs much of the business resolution:

```text
find classes
find events
resolve selection
send class/event payload
```

The Worker then creates the shift.

That means the Worker is currently acting strongly as:

> “trusted kiosk proof + identity gate”

rather than:

> “complete server-side attendance policy engine.”

For a hardened attendance system, the server should independently validate the critical business constraints.

The UI can guide the user, but should not be the final authority.

---

# 15. K-12 — Challenge Consumption Is Not Atomically Consumed Across Worker Instances

## Severity

**MEDIUM/HIGH**

## Status

**Verified design concern; concurrency test required**

Challenge handling follows:

```text
read challenge
↓
verify nonce
↓
delete in-memory value
↓
delete Firestore value
```

The Firestore delete is not itself an atomic consume operation.

Cloudflare Workers run across multiple instances, while the in-memory cache is explicitly per instance.

A possible concurrent sequence is:

```text
Worker A reads challenge
Worker B reads same challenge

A verifies
B verifies

A deletes
B deletes
```

## Required test

Submit the same:

```text
deviceId
nonce
signature
badgeToken
```

simultaneously.

Expected:

```text
one succeeds
one fails
```

---

# 16. K-13 — Student Attendance ID Cannot Represent Multiple Independent Same-Day Events

## Severity

**MEDIUM**

## Status

**Verified data-model limitation**

Student kiosk attendance uses:

```text
${uid}_${dateKey}
```

as the document ID.

That is excellent for preventing double-tap duplicates.

But it also means:

```text
one student
+
one WITA date
=
one attendance document
```

If the business later requires:

```text
morning academy attendance
+
evening corporate event attendance
```

on the same date, the current key cannot naturally represent two independent attendance records.

Do not change this automatically.

First decide whether student attendance means:

```text
one daily presence record
```

or:

```text
multiple attendance events per day
```

---

# 17. K-14 — Kiosk Status Timers Can Race

## Severity

**LOW**

## Status

**Verified by code**

`showStatus()` creates a new `setTimeout()` each time.

An older timer can therefore clear a newer message.

Example:

```text
19:00:00 → Success
19:00:01 → Error
19:00:04.5 → older timer clears Error
```

Suggested fix: keep a timeout ref and cancel the previous timer before scheduling a new one.

---

# 18. Existing Corporate Event Findings That Must Stay on the Kiosk Fix List

The current repository contains a dedicated corporate-event kiosk investigation.

### Addressed in current code

- Instructor Leader role matching
- Branch slug normalization
- Multiple-event selection for instructors
- Strict event lookup during confirmation

### Still requiring explicit decisions/testing

- Multiple events for non-instructor staff
- Multiple events for students
- General Duty fallback policy
- Event start-time enforcement
- Legacy role migration

Do not treat “the original corporate event bug was fixed” as proof that the entire event/kiosk workflow is now correct.

---

# 19. Trigger Matrix

## A. Connectivity

| Test | Expected |
|---|---|
| Internet disconnected before scan | Reject |
| Wi-Fi connected but Firestore unreachable | Reject or clearly show unavailable |
| Network drops immediately after challenge | No false success |
| Network drops during clock-out | No queued stale mutation |
| Network reconnects later | No surprise old clock-out |

## B. Duplicate Scans

| Test | Expected |
|---|---|
| Same badge scanned twice rapidly | One attendance/shift |
| Same badge scanned on two kiosk devices | One open shift |
| Same challenge submitted twice | One accepted |
| Same clock-out submitted twice | One close |

## C. Staff Clock-In

| Test | Expected |
|---|---|
| Instructor | Correct class selection |
| Instructor Leader | Correct instructor behavior |
| Front Office | Correct general/event behavior |
| Manager | Correct behavior |
| Marketing | Correct behavior |
| Office Boy | Correct behavior |
| Legacy role | Explicitly supported or explicitly rejected |
| Resigned/terminated | Rejected |

## D. Corporate Events

| Test | Expected |
|---|---|
| One matching event | Correct event |
| Two matching events | Explicit selection |
| No matching event | Defined General Duty / no-entry behavior |
| Cancel event during selection | Selected event rejected |
| Event expires before confirmation | Rejected |
| Event at Pohuwato | Correct branch label |
| Event at Limboto | Correct branch label |
| Event crossing midnight | Defined behavior |

## E. Class Transitions

| Test | Expected |
|---|---|
| Same instructor switches class | Old shift closes, new shift opens atomically |
| Branch other than Kota Gorontalo | New shift retains branch |
| Offline transition | Rejected |
| Duplicate transition | One result |
| Invalid next class | Rejected |
| Unauthorized class | Rejected |

## F. Security / Tampering

Attempt to modify the browser request:

```text
classId
className
eventId
eventName
punctuality
branchId
shiftType
```

Expected:

> The server rejects inconsistent or unauthorized values.

---

# 20. Recommended Fix Order

## Phase K1 — Stop unsafe fallbacks

1. Remove automatic direct-Firestore fallback from `kioskClockInWithProof`.
2. Fail closed when the Worker is unavailable.
3. Verify production Worker configuration explicitly.

## Phase K2 — Secure the shift lifecycle

1. Bind clock-out to employee identity.
2. Make the single-open-shift invariant atomic.
3. Make clock-out server-authoritative.
4. Move class switching to the same authoritative kiosk path.
5. Preserve branch fields and kiosk device evidence.

## Phase K3 — Stop client-controlled attendance metadata

Server should derive or verify:

- branch
- class
- event
- class name
- event name
- punctuality
- schedule eligibility

## Phase K4 — Fix event semantics

1. Student multi-event handling.
2. Staff multi-event handling.
3. Event cancellation between selection and confirmation.
4. Overnight event policy.

## Phase K5 — Data consistency

1. Replace the Worker branch ternary with the shared branch mapping.
2. Resolve legacy role aliases.
3. Decide daily-vs-event attendance identity.

## Phase K6 — Device/runtime testing

Perform the trigger matrix on real phones/devices.

At minimum:

- reception phone
- staff badge
- student badge
- two simultaneous devices
- Wi-Fi interruption
- mobile-data transition
- corporate event
- branch-specific event
- class transition

---

# 21. Definition of Done

The kiosk should not be considered hardened merely because a large unit-test suite passes.

The kiosk is ready only when:

### Security

- No automatic fallback bypasses kiosk proof.
- Clock-out is bound to the correct employee.
- Duplicate/concurrent clock-ins cannot create multiple open shifts.
- The server validates critical class/event metadata.

### Data integrity

- Every shift has correct branch data.
- Class transitions retain branch identity.
- Event attendance is attributable to a specific event when required.
- Punctuality comes from authoritative time/schedule logic.

### Reliability

- Offline kiosk operations fail safely.
- Reconnect does not replay stale clock actions.
- Release/update events do not interrupt active scans.

### Operational UX

- Users receive a clear error when an event disappears.
- Multi-event cases do not silently become the wrong attendance type.
- Duplicate scans produce a clear result.
- Clock-out and transition failures are actionable.

---

# 22. What Should NOT Be Done

Do not respond to these findings by:

- rewriting the entire kiosk;
- replacing Firestore;
- removing kiosk cryptography;
- turning kiosk operation into offline queueing;
- trusting more client-side flags;
- adding more UI warnings without fixing the server boundary;
- merging all attendance collections blindly;
- creating a second role-normalization system;
- inventing a new branch mapping table.

The kiosk already has useful infrastructure.

The problem is **inconsistent trust boundaries and incomplete atomicity**, not absence of technology.

---

# 23. Final Recommendation

Treat the current kiosk as:

> **Functionally mature but not yet fully trustworthy under adversarial, concurrent, offline, or cross-branch conditions.**

The next remediation should focus on:

```text
CLIENT
  ↓
request intent

SERVER
  ↓
verify device
verify identity
verify branch
verify class/event eligibility
verify timing
enforce uniqueness
write authoritative shift
```

The browser should help users choose.

The server should decide what is valid.

---

# 24. Handoff Statement for the Coding Agent

> **This is a kiosk hardening pass, not a kiosk rewrite.**
>
> Preserve the existing QR flow, Web Crypto device identity, challenge mechanism, Cloudflare Worker, Firestore model, and current UI unless a finding explicitly requires a change.
>
> Fix the trust-boundary and race-condition problems first.
>
> In particular:
>
> 1. fail closed when the kiosk Worker is unavailable;
> 2. bind clock-out to the correct employee;
> 3. make the single-open-shift invariant atomic;
> 4. move class switching into the authoritative kiosk path;
> 5. stop trusting client-supplied class/event/punctuality metadata;
> 6. make offline kiosk mutation impossible;
> 7. resolve ambiguous corporate-event attendance explicitly;
> 8. preserve correct branch identity everywhere.
>
> For every fix, provide:
>
> ```text
> Trigger
> → Current behavior
> → Risk
> → Code/rule change
> → Test
> → Result
> ```
>
> Do not mark a kiosk finding “fixed” from a unit test alone when the defect involves concurrency, Firestore rules, Cloudflare execution, or real device/network state.
