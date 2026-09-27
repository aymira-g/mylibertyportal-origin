# MyLiberty Portal — Audit Continuation (Claude)

**Date:** 2026-09-27 (continues `2026-09-27-claude-audit-broader-findings.md`)
**Scope of this pass:** Picked up the "Not covered" list from that document — concurrency/races, `docs/ARCHITECTURE.md` drift, and a spot-check of the "26 findings" remediation doc — plus a light look at PWA/bundle config. Worked directly against the uploaded repo zip, not just the .md files. Everything below is Claude's reading of the code; it's fallible, so treat line numbers and claims as a starting point to re-verify, not as settled fact.

**A gentle heads-up first:** the previous document's headline claim (the cross-branch `isSameBranch`/`isSameBranchStrict` `list` leak) checked out. I re-read `firestore.rules` in full and traced `WalkInInquiryTab.jsx` directly — both match what was reported. I also confirmed the exact current wording for the collections that document flagged as "still needs the split" or "re-check before editing." That wording is below, so whoever executes this doesn't have to re-derive it.

---

## Part A — Exact current wording for the `isSameBranch` → `isSameBranchStrict` list split

For each collection below, this is the **current literal rule** (re-read fresh this session) and one reasonable way to split it. This is a starting point, not a mandate — if the executing agent sees a cleaner way to express the same boundary, that's a fine thing to push back with.

A general note that applies to all of these: only the *branch-fallback* clause (`isSameBranch(...)`) needs to become `isSameBranchStrict(...)` in the `list` version. Any clause that checks a specific field equality against `request.auth.uid` (self-access) or an explicit sentinel like `branch == 'all'` is **not** part of the leak — Firestore's `list` rule evaluation only sees fields the query actually filters on, so those clauses only ever pass when the query is already scoped correctly. They can stay untouched in both `get` and `list`.

### `/users` (already split — just needs one word changed twice)
Current (`allow list`, right below an already-correct `allow get`):
```
allow list: if isAdmin()
  || (isManager() && isSameBranch(resource.data))
  || (isStaff() && resource.data.role in ['student', 'instructor', 'instructorleader', 'instructor_leader', 'parent'] && isSameBranch(resource.data));
```
Suggested:
```
allow list: if isAdmin()
  || (isManager() && isSameBranchStrict(resource.data))
  || (isStaff() && resource.data.role in ['student', 'instructor', 'instructorleader', 'instructor_leader', 'parent'] && isSameBranchStrict(resource.data));
```
`allow get` stays exactly as it is.

### `/applications`
Current (single combined `allow read`):
```
allow read: if isAdmin() || ((isFrontOffice() || isManager() || hasRole('marketing')) && isSameBranch(resource.data));
```
Suggested split:
```
allow get: if isAdmin() || ((isFrontOffice() || isManager() || hasRole('marketing')) && isSameBranch(resource.data));
allow list: if isAdmin() || ((isFrontOffice() || isManager() || hasRole('marketing')) && isSameBranchStrict(resource.data));
```

### `/classes`
Current — this one has three extra OR-clauses beyond branch (instructor/substitute assignment, student's own roster membership, parent's linked children). None of those three are branch-fallback based, so they carry over unchanged:
```
allow read: if isAdmin()
  || (isStaff() && isSameBranch(resource.data))
  || (isStaff() && (
      resource.data.instructorId == request.auth.uid
      || ('substituteInstructorId' in resource.data && resource.data.substituteInstructorId == request.auth.uid)
    ))
  || (signedIn() && ('studentIds' in resource.data) && resource.data.studentIds.hasAny([request.auth.uid]))
  || (isParent() && ('childStudentIds' in userProfile()) && ('studentIds' in resource.data) && resource.data.studentIds.hasAny(userProfile().childStudentIds));
```
Suggested — `allow get` unchanged; `allow list` swaps only the first clause:
```
allow list: if isAdmin()
  || (isStaff() && isSameBranchStrict(resource.data))
  || (isStaff() && (
      resource.data.instructorId == request.auth.uid
      || ('substituteInstructorId' in resource.data && resource.data.substituteInstructorId == request.auth.uid)
    ))
  || (signedIn() && ('studentIds' in resource.data) && resource.data.studentIds.hasAny([request.auth.uid]))
  || (isParent() && ('childStudentIds' in userProfile()) && ('studentIds' in resource.data) && resource.data.studentIds.hasAny(userProfile().childStudentIds));
```

### `/todos`
Current — has the academy-wide `branch == 'all'` escape hatch, which is also safe to carry over unchanged (it's an equality check, not a fallback):
```
allow read: if isAdmin()
  || (isStaff() && (
    isSameBranch(resource.data)
    || (('branch' in resource.data) && (resource.data.branch == 'all' || resource.data.branch == 'All'))
    || (('branchId' in resource.data) && resource.data.branchId == 'all')
  ));
```
Suggested `allow list`: same shape, `isSameBranch` → `isSameBranchStrict`.

### `/attendance`
Current:
```
allow read: if isAdmin()
  || (isStaff() && isSameBranch(resource.data));
```
Suggested split, same pattern as `/applications`.

### `/deskInquiries`
Current:
```
allow read: if isAdmin() || ((isManager() || isFrontOffice() || isStaff()) && isSameBranch(resource.data));
```
Suggested split, same pattern. (This is the one behind the live `WalkInInquiryTab.jsx` leak — see Part B, item 1, for why the rule fix alone doesn't fully close it.)

### `/schoolOutreach` (top-level document, not the `visits` subcollection — that one's already fixed)
Current:
```
allow read: if isAdmin() || ((isManager() || hasRole('marketing')) && isSameBranch(resource.data));
```
Suggested split, same pattern.

### `/kioskDevices`
Current:
```
allow read: if isAdmin()
  || ((isFrontOffice() || isManager()) && isSameBranch(resource.data));
```
Suggested split, same pattern.

### `/staffLeave` and `/shifts` — same shape, both carry a safe self-access clause
Both currently look like:
```
allow read: if isAdmin()
  || (isManager() && isSameBranch(resource.data))
  || (signedIn() && resource.data.userId == request.auth.uid);
```
Suggested `allow list`: swap only the manager clause to `isSameBranchStrict`; keep the self-access clause (a person listing their own shifts/leave via `where("userId","==", myUid)` is not part of this leak).

### `/classAttendance` — narrower than the pattern above, worth a closer look before treating it the same
This is the one the prior document flagged as "re-check before editing" rather than describing verbatim. Here's the exact current text:
```
allow read: if
  isAdmin()
  || (
    (isManager() || isFrontOffice())
    && isSameBranch(classDoc(resource.data.classId))
  )
  || (
    (hasRole('instructor') || hasRole('instructorleader') || hasRole('instructor_leader'))
    && isAssignedToClass(resource.data.classId)
  )
  || (signedIn() && resource.data.studentId == request.auth.uid)
  || (signedIn() && isParentOf(resource.data.studentId));
```
The important difference: this checks `isSameBranch(classDoc(...))` — the *class* document's branch, fetched with a real `get()` — not `resource.data` directly. That changes the exposure:
- If a query has **no `classId` filter at all**, `resource.data.classId` is absent from the synthetic doc, `classDoc(undefined)` resolves to `null` data, and `isSameBranch(null)` evaluates to `isAdmin()` only — so a fully-unscoped query is actually **denied already**, not leaked. Good news, and a correction to the prior document's assumption that "the same pattern likely applies."
- The real (narrower) gap: a query filtered to one specific `classId` whose **class document itself predates `branchId`** (a legacy class with only a `branch` string, or with neither field) would still hit the same Kota-Gorontalo fallback, just one class at a time instead of the whole collection.
- Given `docs/ARCHITECTURE.md` §12 explicitly says legacy documents without `branchId` are expected to still exist, this gap is plausible but narrow — closer in severity to the `/approvals` item in the prior document than to the deskInquiries/applications leak.

Suggested treatment for `allow list`: swap to `isSameBranch(classDoc(...))` → a strict equivalent (either a small `isSameBranchStrict`-style version of the class-doc check, or simply requiring `classDoc(...)` to have a `branchId` field before trusting it). Worth doing for consistency, but this one can reasonably wait behind the higher-severity collections above — that's a sequencing call the executing agent can make either way.

### `/approvals` — unchanged assessment
Still what the prior document said: the `isSameBranch` fallback only fires for legacy docs missing `approverBranchId`, via `isApproverForDoc`. Lower priority, no new information this pass.

---

## Part B — Concurrency / race conditions (the first "not covered" item)

The repo's own `docs/audits/2026-09-25-full-architecture-audit.md` already flagged the general shape of this (plain `updateDoc` calls with no read-check = last-write-wins, "acceptable at current scale except the placement-test merge"). This pass looked at three specific, currently-live spots with fresh eyes:

**1. Payments have no server-side duplicate guard.**
`recordPayment()` in `paymentsRepository.js` always creates a brand-new payment document (`doc(collection(db, "payments"))`) and never checks whether a payment with the same receipt number, or the same student+period+amount on the same day, already exists. The only protection against a duplicate is a client-side `saving` flag in `PaymentModal.jsx` that disables the submit button while a save is in flight — which stops a double-click in the same browser tab, but not a network retry, a second tab, or the modal being reopened and resubmitted. On a flaky connection this can silently produce two committed payment records for one actual payment.
- *Severity:* Medium — money already changed hands in real life; this is a bookkeeping/reporting integrity risk (double-counted revenue), not a security hole.
- *A starting point, not a mandate:* the smallest fix is probably a deterministic-ish dedupe check before the batch commits (e.g., query for an existing payment with the same `receiptNumber`, or a short-lived idempotency token generated when the modal opens and cleared on success). There may be a simpler approach given how the front office actually works day to day — worth asking them before picking one.

**2. Class roster edits use overwrite-the-array instead of atomic array ops — except when adding, which is done right.**
`classesRepository.js`'s "add a student to a class" path is genuinely well-built: it runs inside `runTransaction`, re-reads capacity fresh, and uses `arrayUnion`. But "remove a student" and "transfer a student between classes" both read the roster array, filter it in JavaScript, and write the whole array back with a plain `updateDoc`/`writeBatch` — no transaction, no `arrayRemove`. Two staff editing the same class's roster within the same moment (rare, but not impossible during enrollment season) could have one edit silently overwrite the other.
- *Severity:* Low-to-medium — narrow window, but the fix is small (`arrayRemove(studentId)` instead of a filtered array) and removes the risk entirely rather than just shrinking it.

**3. Shift self-correction approvals are never marked "consumed."**
`isApprovedShiftCorrection()` in the rules only checks that the referenced approval's `status == 'approved'` — nothing ever flips it to something like `applied`. In the current UI (`ApprovalInbox.jsx`), this isn't exploitable today: `applyApprovedShiftCorrection()` is only called once, immediately inside the same `handleApprove` action that approves the request, and the inbox only lists *pending* approvals, so there's no lingering button inviting a second click. One thing worth flagging, though: the error-toast on line ~68 tells the approver "an admin can apply it from Staff Duty Reports" if the automatic apply fails — I couldn't find any actual UI path that does that (the only other place `STAFF_SHIFT_SELF_CORRECTION` appears is `ShiftAdjustmentModal.jsx`, which only *creates* the request, not applies it). So today that message is either describing a manual admin edit (which does work, since admins can freely update shifts) or it's a promise the UI doesn't keep — worth a two-minute check with whoever wrote that message.
- *Severity:* Low today, but it's a latent trap: if a future feature ever surfaces approved-but-unapplied corrections in a list (e.g., a "retry failed applies" screen), nothing stops someone from applying the same old correction twice, potentially overwriting a shift that's been legitimately edited again since. Cheap insurance: have `applyApprovedShiftCorrection()` also stamp the approval doc with something like `appliedAt`, and have the rule/`isApprovedShiftCorrection` check that it's *not* already set.

**Also verified as solid, no action needed:** the kiosk clock-in/out flow (nonce-consumption + single-open-shift rule) and the `classAttendance` close-out batch (see Part C, item verified below) both handle concurrent writes correctly already.

---

## Part C — `docs/ARCHITECTURE.md` drift

The doc's own change log entry for 2026-09-24 reads:

> *"Multi-Branch Isolation & Dual-Control Approvals — Implemented branchId normalization across admissions, payments, shifts, outreach, and inquiries with Firestore rule scoping."*

Read at face value, that entry says branch isolation is done for exactly the collections this whole audit chain has found are still leaking on `list` (`applications` = admissions, `shifts`, `schoolOutreach` = outreach, `deskInquiries` = inquiries). It's not a fabrication — `payments` really did get the full `get`/`list` split, and the other four did get real `branchId` normalization and a working `get`/self-access boundary — but "with Firestore rule scoping" reads as more complete than the current file actually is for four of those five. Once Part A's fixes land, this line becomes accurate; until then, it's worth a mental asterisk if anyone (human or agent) is trusting the architecture doc as a status report rather than a design description. Per the doc's own §17 (and `AGENTS.md`, which I didn't have in this zip to read directly), doc updates should follow the fix and wait for explicit sign-off rather than happening automatically — so this is a note for later, not something to change right now.

No other drift jumped out on this pass — the feature-domain list, repository boundary section, and "known architectural risks" section all still matched what's in `src/`.

---

## Part D — Spot-check of `docs/audits/qodo-findings-remediation.md`

That document claims all 26 Qodo findings are fixed and verified. Rather than take that at face value or re-verify all 26 (see "Not covered" below), I picked the one most relevant to this pass — **Finding 6, the classAttendance close-out TOCTOU race** — and traced it against the actual current `classAttendanceRepository.js`.

**It checks out**, and it's a nice piece of work worth calling out rather than just fixing things: the close-out batch writes new attendance docs with `method: 'CLOSE_OUT'`, and if a concurrent scan/manual mark already created that same document (with `method: 'MANUAL'`), the batch fails atomically — not because `batch.set()` is "create-only" in the way the code comment slightly overstates, but because the Firestore rule's `allow update` block requires `method == 'MANUAL'`, so a `CLOSE_OUT` write against an existing doc gets rejected by the *rule*, which has the same effect. The retry logic that follows (re-read, only fill in truly-missing students) is exactly as described. No changes needed here.

**Not covered this pass:** I didn't re-verify the other 25 findings. Given the time-efficiency ask, spot-checking one that intersected with this session's concurrency focus seemed like better value than either skipping the doc entirely or grinding through all 26 findings' worth of file/line references. Happy to do a batch of the higher-stakes-sounding ones (the Firestore-rules-related findings 1, 9, 10 would be quick, since I already have the rules file loaded) in a future session if that's useful.

---

## Part E — PWA / bundle, briefly

This turned out to be in reasonably good shape already, so this section is intentionally short:
- `vite.config.js` already does deliberate manual chunking (Firestore, Auth, QR scanner, QR generator each split out) specifically to avoid one giant Firebase bundle — that's a real fix already in place, not something to redo.
- The service worker uses `registerType: "autoUpdate"` with a sensible `navigateFallback` and explicitly avoids caching API/database calls.
- One pre-existing, low-priority item the 2026-09-25 audit already flagged and which is still true: `devOptions.enabled: true` means the service worker is also active during local development, which can serve a stale build to a developer testing locally. Dev-only, not a production issue — fine to leave alone unless it's actually bitten someone.

I did not do a full performance/Lighthouse pass or measure actual bundle sizes — that needs a real build + profiling, which is a different kind of session than reading source.

---

## For the executor, suggested order (not a locked sequence — argue with it if a better order exists)

1. The app-code fixes from the prior document (`WalkInInquiryTab.jsx`, `fetchAdmissionsReportData`, `KidsManagerDashboard.jsx`, `findParentsForStudent`) are today's actual live leaks — those still come first regardless of anything in this document.
2. Re-read the live `firestore.rules` fresh (don't trust this document's quoted text blindly — it may have drifted since this pass) and apply the `get`/`list` splits in Part A, one collection at a time. `/classAttendance` and `/approvals` can reasonably come last given their narrower exposure.
3. Extend `src/features/shared/firestoreRules.emulator.test.js` — right now it has zero `getDocs`/query-level assertions; every existing test exercises `get`/`create`/`update` on a single doc. Add at least one `list`-style test per fixed collection: a Kota-Gorontalo staff member running an unscoped query should come back empty or denied, not full of other branches' documents. This is the same gap the 2026-09-25 internal audit already called "the single highest-leverage test investment" — still true.
4. Part B's concurrency items are all independent and lower urgency than 1-3 — `arrayRemove` for roster edits is the cheapest one to knock out; the payment idempotency guard probably deserves a quick conversation with whoever handles front-office cash flow about how they'd actually want a duplicate caught.
5. The `docs/ARCHITECTURE.md` changelog wording (Part C) is a documentation follow-up for after 1-2 land, not a code change.

---

## Not covered, still

- Full independent re-verification of Qodo findings 1-5, 7-26 (only #6 spot-checked this pass).
- Load testing / real Firestore read-volume numbers — needs actual usage data from the Firebase console, which isn't in a repo zip.
- A real Lighthouse/bundle-size measurement (would need `npm run build` + profiling, not just reading config).
- `AGENTS.md` itself wasn't in this upload, so I couldn't check the architecture doc's drift against it directly, only against the code.
