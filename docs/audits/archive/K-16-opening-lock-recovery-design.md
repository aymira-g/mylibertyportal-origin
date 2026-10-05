# K-16: Stale/Orphaned `status: "opening"` Kiosk Lock Recovery Design (Revised)

> **Document Type:** Remediation Architecture & Concurrency Control Design (Revision 2)  
> **Target Finding:** K-16 (Orphaned opening lock in `activeShifts/{badgeToken}`)  
> **Component:** `cloudflare-worker/worker.js` (Clock-in state machine & concurrency control)  
> **Date:** 2026-10-04 (WITA) / 2026-10-03 (Local)  
> **Status:** Revised Proposal — Complete Invariant Proof — Awaiting User Authorization Before Code Changes

---

## 1. Executive Summary & Problem Restatement

In `cloudflare-worker/worker.js`, clock-in concurrency is managed by an initial lock write to Firestore at `activeShifts/{badgeToken}`.

The primary vulnerability identified in K-16 is that a Worker isolate failure or network termination between acquiring the `status: "opening"` lock and successfully creating/linking the `shifts` document leaves an orphaned document in `activeShifts`:
```json
{
  "userId": "staff_uid",
  "status": "opening",
  "clockIn": "2026-10-03T13:00:00.000Z",
  "branchId": "kota_gorontalo"
}
```
*(Notice: `shiftId` is absent).*

### The Critical Race in Naive/Decoupled Recovery
The initial design proposed:
```text
Recovery: read opening lock
Recovery: query shifts -> no open shift found
Recovery: delete activeShifts/{badgeToken} using updateTime precondition
```
**Why that was not fully race-proof:**  
`activeShifts` and `shifts` were being written via separate HTTP calls. If Request A (the original clock-in) was delayed, Request B (recovery) could check `shifts` and find nothing, then Request A could create `shifts/{newShift}`, and *then* Request B could delete `activeShifts` using the unchanged `updateTime` of the lock document. This would leave an open shift in `shifts` with `activeShifts` absent, enabling a second scan to open a duplicate shift.

---

## 2. The Architectural Solution: Atomic Shift Creation & Lock Promotion

To eliminate this race condition mathematically, **shift creation and lock promotion must not be separate operations.**

### Core Invariant Principle: The Mutual Serialization Pivot
In Google Cloud Firestore REST API, multi-document atomicity is provided by `documents:commit`:
```text
POST https://firestore.googleapis.com/v1/projects/{project}/databases/(default)/documents:commit
```
When multiple write operations are submitted in a single `commit` call without a transaction, Firestore applies them as an **Atomic Batch Write**:
> *"The writes will be applied atomically. If any write fails its precondition, the entire batch fails and no changes are committed."* — Google Cloud Firestore Documentation.

By combining the creation of the `shifts` document and the update of `activeShifts/{badgeToken}` into a **SINGLE ATOMIC COMMIT**, Request A cannot create a shift unless `activeShifts/{badgeToken}` is simultaneously updated under its exact lock version precondition:

```text
Request A (Clock-in) sends commit([
  Write 1: CREATE shifts/{newShiftId} (precondition: exists == false),
  Write 2: UPDATE activeShifts/{badgeToken} to status: "active", shiftId: newShiftId
           (precondition: currentDocument.updateTime == lockUpdateTime)
])
```

Because Write 1 and Write 2 are in the same atomic commit:
1. **It is physically impossible for `shifts/{newShiftId}` to be created without `activeShifts` also being updated.**
2. If Recovery (Request B) deletes or modifies `activeShifts/{badgeToken}` first, Request A's Write 2 precondition fails, which causes Firestore to **reject the entire atomic commit**. Write 1 is dropped; **no shift is created**.
3. Conversely, if Request A's atomic commit executes first, `activeShifts.updateTime` changes immediately, which causes Request B's preconditioned delete to **fail with HTTP 412**. The lock is not deleted, and the open shift remains safely tracked.

---

## 3. Analysis of Specific Architectural Questions

### 3.1 Can this Cloudflare Worker use Firestore REST Transactions?
Yes, Firestore REST API supports `documents:beginTransaction`, `documents:runQuery` with transaction tokens, and `documents:commit`.  
**However, transactions do not lock non-existent documents or provide predicate range locks.**  
In Firestore's Optimistic Concurrency Control (OCC), executing a query inside a transaction does *not* prevent phantom inserts (i.e. another request creating a new document in `shifts` with a generated ID). Firestore transactions only validate that documents that were *explicitly read* by their path have not changed versions.

Therefore, whether using `documents:beginTransaction` or `documents:commit` with preconditions, the **only document that can provide mutual exclusion is `activeShifts/{badgeToken}`**. Making `activeShifts/{badgeToken}` the serialization anchor of the atomic batch write gives 100% atomic mutual exclusion without requiring multi-round-trip transaction leases.

### 3.2 Can recovery atomically decide lock removal without races?
Yes, because Request A's ability to create a shift is **contingent on `activeShifts/{badgeToken}` still possessing its original `lockUpdateTime`**.  
When Request B checks `shifts` and finds no shift, it deletes `activeShifts` with `currentDocument.updateTime == lockUpdateTime`.  
If Request A attempts to write a shift after Request B's query:
- Either Request A commits first $\rightarrow$ `activeShifts.updateTime` changes $\rightarrow$ Request B's delete fails (412).
- Or Request B deletes first $\rightarrow$ `activeShifts` is gone $\rightarrow$ Request A's commit fails (412) and the shift is never created.

There is zero possibility of an unlinked shift being created.

### 3.3 Re-evaluating the 60-Second Threshold
In this revised architecture, the 60-second timer is **NOT** the safety mechanism that prevents duplicate shifts. The atomic commit and `updateTime` preconditions are the safety mechanism.  
The 60-second threshold is strictly a **Recovery Eligibility Threshold**:
- **Role of Threshold:** It prevents Request B from unnecessarily interfering with Request A while Request A is normally executing under standard network latencies (200ms–5s).
- **Threshold Value:** 60 seconds is chosen because the maximum Cloudflare Worker subrequest timeout is 30 seconds. At 60 seconds, Request A has passed its execution window and is provably abandoned.

### 3.4 Handling Swallowed Link-Update Failures
In the previous code:
```javascript
createdShift = await fsCreateDoc("shifts", shiftPayload, token);
await fsSetDoc("activeShifts", badgeToken, ...).catch(() => {});
```
Because the link update was a separate call wrapped in `.catch(() => {})`, a transient failure in the second call left an open shift with an unlinked opening lock.  
**In the revised architecture, this failure mode is eliminated by construction:** Shift creation and lock linking occur in the exact same `fsCommitWrites` call. They succeed together or fail together. Furthermore, if legacy data or an out-of-band crash already left an unlinked shift, Recovery's step 3.b detects `existingOpenShift` and **heals** the link rather than deleting it.

### 3.5 Handling Precondition Failures (HTTP 412 / FAILED_PRECONDITION)
When a recovery operation (or clock-in) receives HTTP 412 from Firestore:
- It means the document changed state between inspection and execution (e.g. another concurrent scan cleared it, healed it, or completed clock-in).
- The Worker does not panic or leave corrupted state; it returns HTTP 409 with an informative response:
  `"Kiosk state was updated by a concurrent operation. Please scan again."`
- The client receives a clean retry signal.

### 3.6 Simultaneous Recovery Requests (Two rapid rescans)
If Request B and Request C both detect an old orphan lock at $T = 65\text{s}$:
1. Both read `activeShifts` with `updateTime = T_lock`.
2. Both query `shifts` and find no open shift.
3. Both issue a preconditioned delete with `currentDocument.updateTime == T_lock`.
4. Firestore serializes the two requests:
   - Request B's delete succeeds (200 OK).
   - Request C's delete receives HTTP 412 / 404 (Precondition Failed).
5. Request C catches the 412/404 and safely returns: `"Kiosk lock was cleared. Please scan again."`
6. Neither creates a duplicate shift; the lock is cleanly deleted exactly once.

---

## 4. Complete State Machine & Failure Transitions

### 4.1 State Definitions in `activeShifts/{badgeToken}`

```text
State 1: ABSENT
         No document exists at activeShifts/{badgeToken}.

State 2: OPENING_UNLINKED
         Document exists with status: "opening", lockToken: string, shiftId: absent/null.

State 3: ACTIVE_LINKED
         Document exists with status: "active", shiftId: string (valid shift ID).

State 4: STALE_CLOSED
         Document exists with status: "active", shiftId: string, but shifts/{shiftId}.clockOut != null.
```

### 4.2 State Transition Diagram

```text
                             ┌──────────────────────────────────────────────┐
                             │                                              │
                             ▼                                              │ (Kiosk Clock-Out: fsDeleteDoc)
                        [ ABSENT ]                                          │
                             │                                              │
                             │ (Step 1: fsCreateDocWithIdPrecondition       │
                             │          exists == false)                    │
                             ▼                                              │
                    [ OPENING_UNLINKED ]                                    │
                             │                                              │
                 ┌───────────┴───────────────────────────┐                  │
                 │                                       │                  │
                 │ (Atomic Commit: Shift + Lock Link)    │ (Worker Crash)   │
                 ▼                                       ▼                  │
         [ ACTIVE_LINKED ]                       [ ORPHANED_OPENING ]       │
                 │                                       │                  │
                 │ (Out-of-band shift close)             │ (Recovery:       │
                 ▼                                       │  Age >= 60s &&   │
          [ STALE_CLOSED ]                               │  no shift exists)│
                 │                                       │                  │
                 │ (Stale lock cleaned on next scan)     │                  │
                 └───────────────────┬───────────────────┘                  │
                                     ▼                                      │
                                 [ ABSENT ] ────────────────────────────────┘
```

---

## 5. Detailed Step-by-Step Recovery & Clock-In Algorithms

### 5.1 Hardened Clock-In Flow (Request A)

```text
1. Read existingOpenShift via fsQueryOpenShift(badgeToken, token).
   IF existingOpenShift != null:
     RETURN 409: "Staff member already has an active open shift." (existingShiftId)

2. Generate lockToken = crypto.randomUUID().
   Attempt atomic lock creation:
   lockResult = await fsCreateDocWithIdPrecondition(
     "activeShifts",
     badgeToken,
     {
       userId: badgeToken,
       status: "opening",
       clockIn: serverTime,
       branchId: device.branchId,
       lockToken
     },
     token
   );

3. IF lockResult.ok === false:
     // Lock already exists -> Route to Recovery / Concurrency Handler (§5.2)
     RETURN await handleExistingLock(badgeToken, device, token, request, env);

4. Lock acquired! Store lockUpdateTime = lockResult.updateTime.

5. Prepare shiftPayload:
   Generate shiftId = "shift_" + crypto.randomUUID().replace(/-/g, "").slice(0, 20).

6. Execute ATOMIC COMMIT (Shift Creation + Lock Promotion):
   commitResult = await fsCommitWrites([
     {
       update: {
         name: `${FIRESTORE_BASE}/shifts/${shiftId}`,
         fields: toFirestoreFields(shiftPayload)
       },
       currentDocument: { exists: false }
     },
     {
       update: {
         name: `${FIRESTORE_BASE}/activeShifts/${badgeToken}`,
         fields: toFirestoreFields({
           userId: badgeToken,
           shiftId,
           clockIn: serverTime,
           branchId: device.branchId,
           status: "active",
           lockToken
         })
       },
       currentDocument: { updateTime: lockUpdateTime }
     }
   ], token);

7. IF commitResult.ok === false:
     // Commit failed its precondition! (e.g. Recovery deleted the lock, or timeout occurred)
     // Write 1 was NOT committed. No shift exists.
     RETURN 409: "Clock-in lock expired or was cleared. Please scan again to clock in.";

8. Log audit event SHIFT_CLOCK_IN_VERIFIED.
   RETURN 200: { success: true, shift: { id: shiftId, ...shiftPayload } };
```

### 5.2 Hardened Recovery & Existing Lock Resolution (Request B)

```text
handleExistingLock(badgeToken, device, token, request, env):

1. Read existingLock and its metadata (raw.updateTime) via fsGetDocWithMetadata("activeShifts", badgeToken, token).
   IF !existingLock:
     // Lock was cleared between step 2 and now
     RETURN 409: "Kiosk lock released. Please scan again.";

2. IF existingLock.shiftId is present (State: ACTIVE_LINKED or STALE_CLOSED):
     Fetch linked shift: shiftDoc = await fsGetDoc("shifts", existingLock.shiftId, token).

     a. IF shiftDoc && shiftDoc.clockOut != null:
          // Shift closed out-of-band -> Clean stale lock atomically
          deleteRes = await fsDeleteDocWithPrecondition("activeShifts", badgeToken, raw.updateTime, token);
          IF deleteRes.ok:
            RETURN 409: "A stale kiosk lock was cleared. Please scan again.";
          ELSE:
            RETURN 409: "Lock state updated concurrently. Please scan again.";

     b. ELSE:
          // Genuine ongoing shift
          RETURN 409: "Staff member already has an active open shift." (existingShiftId: existingLock.shiftId);

3. ELSE (existingLock.shiftId is absent/null -> State: OPENING_UNLINKED):
     // Check if a shift was created previously by querying Firestore
     openShift = await fsQueryOpenShift(badgeToken, token);

     a. IF openShift != null:
          // Window B: Shift exists! HEAL the lock atomically
          healResult = await fsPatchDocWithPrecondition(
            "activeShifts",
            badgeToken,
            {
              userId: badgeToken,
              shiftId: openShift.id,
              clockIn: existingLock.clockIn,
              branchId: existingLock.branchId,
              status: "active"
            },
            raw.updateTime,
            token
          );
          RETURN 409: "Staff member already has an active open shift." (existingShiftId: openShift.id);

     b. ELSE (No open shift exists):
          // Window A: Potential abandoned opening lock
          lockAgeMs = Date.now() - new Date(existingLock.clockIn).getTime();

          IF lockAgeMs < 60000:
            // Still within in-flight eligibility window (< 60s)
            RETURN 409: "A clock-in is currently being processed. Please wait a few seconds and try again.";

          ELSE:
            // Lock is >= 60s old and eligible for recovery
            deleteRes = await fsDeleteDocWithPrecondition(
              "activeShifts",
              badgeToken,
              raw.updateTime,
              token
            );

            IF deleteRes.ok:
              await logKioskAudit("KIOSK_ORPHAN_LOCK_RECOVERED", { badgeToken, lockAgeMs }, token);
              RETURN 409: "An abandoned kiosk lock was safely cleared. Please scan again to clock in.";
            ELSE:
              RETURN 409: "Kiosk lock state changed concurrently. Please scan again.";
```

---

## 6. Mathematical Invariant Proofs

### Invariant 1: `count(open shifts for a staff member) <= 1`
- **Proof:** To create a shift in `shifts`, an atomic commit must execute Write 1 (`shifts/{newShift}`) AND Write 2 (`activeShifts/{badgeToken}` with precondition `updateTime == lockUpdateTime`).
- If `activeShifts/{badgeToken}` is modified or deleted by Recovery, Write 2 fails.
- In Firestore, if any write in a `commit` batch fails its precondition, the entire batch fails. Write 1 is never committed.
- Therefore, a shift document cannot be created unless the lock document is simultaneously transitioned to `status: "active"`.
- Since lock acquisition enforces `exists == false`, only one lock can exist at a time.
- Thus, at most one valid open shift can ever exist for a staff member. $\blacksquare$

### Invariant 2: Recovery cannot leave `open shift exists + activeShifts absent`
- **Proof:** Before deleting any opening lock, Recovery executes `fsQueryOpenShift`.
- If an open shift exists, Recovery branches to step 3.a and **heals** `activeShifts` to link to that shift. It never issues a delete.
- If no open shift exists, Recovery issues a delete with `currentDocument.updateTime == raw.updateTime`.
- If Clock-in attempts to commit a shift during this window, either Clock-in commits first (causing Recovery's delete to fail with 412), or Recovery deletes first (causing Clock-in's commit to fail with 412).
- Neither path leaves an open shift without an active lock. $\blacksquare$

### Invariant 3: Recovery cannot delete a newly created/replaced lock
- **Proof:** Every delete operation specifies `currentDocument.updateTime == raw.updateTime`.
- If the document was replaced or modified by a new clock-in, its `updateTime` is different. Firestore returns HTTP 412 and aborts the deletion. $\blacksquare$

### Invariant 4: Two recovery requests cannot create conflicting states
- **Proof:** If two recovery requests run concurrently against the same orphan lock, both specify `currentDocument.updateTime == raw.updateTime`.
- Exactly one request can match the precondition and succeed. The second request receives HTTP 412/404 and exits safely. $\blacksquare$

### Invariant 5: A failed/terminated clock-in eventually becomes recoverable
- **Proof:** If a Worker crashes after writing `status: "opening"`, `activeShifts/{badgeToken}` remains with `shiftId: null`.
- On the next scan after 60 seconds, `lockAgeMs >= 60000` evaluates to true, `openShift` is null, and `fsDeleteDocWithPrecondition` removes the document. The terminal returns to `ABSENT` without manual intervention. $\blacksquare$

---

## 7. Required Firestore REST Operations in `worker.js`

To implement this specification, `worker.js` requires three atomic REST primitives:

```javascript
// 1. Commit an atomic batch of writes (used for Shift Create + Lock Link)
async function fsCommitWrites(writes, token) {
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents:commit`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ writes }),
  });
  if (res.status === 412 || res.status === 409 || res.status === 400) {
    return { ok: false, status: res.status, error: "PRECONDITION_FAILED" };
  }
  if (!res.ok) throw new Error(`Firestore COMMIT failed: ${res.status} ${await res.text()}`);
  return { ok: true, data: await res.json() };
}

// 2. Fetch document alongside its exact Firestore server updateTime
async function fsGetDocWithMetadata(collectionPath, docId, token) {
  const url = `${FIRESTORE_BASE}/${collectionPath}/${encodeURIComponent(docId)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Firestore GET failed: ${res.status}`);
  const raw = await res.json();
  return { data: fromFirestoreDocument(raw), updateTime: raw.updateTime };
}

// 3. Delete document with optimistic concurrency precondition
async function fsDeleteDocWithPrecondition(collectionPath, docId, updateTime, token) {
  const url = `${FIRESTORE_BASE}/${collectionPath}/${encodeURIComponent(docId)}?currentDocument.updateTime=${encodeURIComponent(updateTime)}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 412 || res.status === 404) {
    return { ok: false, status: res.status, error: "PRECONDITION_FAILED" };
  }
  if (!res.ok) throw new Error(`Firestore DELETE precondition failed: ${res.status}`);
  return { ok: true };
}
```

---

## 8. Failure & Recovery Scenarios for Testing

The following unit and integration test matrix will be added to `kioskHardening.test.js`:

| Test # | Scenario | Setup Condition | Expected Behavior |
| :--- | :--- | :--- | :--- |
| **T-01** | Fresh opening lock (< 60s) | `status: "opening"`, `clockIn` age 15s, `shiftId: null` | Returns 409 in-flight message; lock is preserved. |
| **T-02** | Stale orphan opening lock (Window A) | `status: "opening"`, `clockIn` age 65s, no open shift in `shifts` | Lock deleted with `updateTime` precondition; returns rescan prompt. Next clock-in succeeds. |
| **T-03** | Stale orphan opening lock with existing shift (Window B) | `status: "opening"`, `clockIn` age 70s, open shift exists in `shifts` | Lock is **healed** (`shiftId` linked, `status: "active"`); returns 409 with `existingShiftId`. |
| **T-04** | Linked active shift | `status: "active"`, `shiftId: "s1"`, shift `clockOut: null` | Returns 409 active shift error; lock is preserved. |
| **T-05** | Linked stale shift | `status: "active"`, `shiftId: "s1"`, shift `clockOut: "2026-..."` | Lock deleted with version precondition (no unconditional delete); returns rescan prompt. |
| **T-06** | Simultaneous recovery requests | Two simultaneous recovery requests on same lock | Exactly one delete succeeds; the second receives 412/404 and returns clean rescan prompt. |
| **T-07** | Atomic batch precondition failure | Lock update precondition fails during clock-in commit | Entire batch fails; shift document is never created. |
| **T-08** | Critical commit-vs-recovery race | Clock-in commit races against Recovery delete | Tested in both orderings: recovery-first proves no shift is created; commit-first proves shift remains tracked and linked. |

---
EOF
