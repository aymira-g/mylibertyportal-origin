# Audit Method

## Trace by Business Workflow, Not Folder

Follow each action from user input to final persisted state and downstream use:

```text
UI → Scanner/Event Handler → Feature Logic → Repository → Worker/API
   → Firestore → Security Rules → Stored Record → Reports/Future Workflows
```

Reading the React code isn't enough. Also ask: What if the Worker rejects the request? Connectivity drops? The request is sent twice or two arrive at once? The client sends manipulated values? Firestore write succeeds but the UI thinks it failed (or vice versa)? The record already exists, was manually changed by another role, involves another branch, or is old/malformed?

## Five-Pass Method

Every major section gets five distinct passes.

**Pass 1 — Internal Logic & Resource Safety.** Business rules, state transitions, validation, role/branch handling, date/time, duplicates, null handling, fallbacks, errors, loading, retry, stale state, races, cleanup, timers, modal/navigation state. **Firestore quota & listener safety:** unmounted listeners (`onSnapshot` without unsub), unbounded queries (missing `limit()`), N+1 reads in loops, and retry storms. *Does it behave correctly and safely under normal and abnormal conditions without burning quota?*

**Pass 2 — Trust Boundary.** List every value the client supplies (role, branch, classId, eventId, timestamp, attendance state, employee identity, permission). For each: *is this just UI data, or is the server treating it as authoritative?* Security- and business-critical identity must be enforced server-side.

**Pass 3 — Failure / Edge / Attack.** Run the matrix below.

**Pass 4 — Cross-Feature Handoff.** Check every module handoff (Admissions → Students → Classes → Attendance → Reports; Students → Payments/Parents; Staff → Roles/Branches/Kiosk; Kiosk → Shifts → Leave → Approvals → Audit Logs). Verify field names, IDs, role names, branch identifiers, date formats, timezones, status values, deleted/legacy records, and security assumptions all match. A feature can be internally correct and still break another.

**Pass 5 — Runtime Proof.** Classify behaviors as:
- **Code-proven** — the implementation clearly establishes it
- **Test-proven** — automated test suite passes (Vitest / Playwright)
- **Hardware / Device-verified** — verified manually on a physical target device (e.g. tablet camera scanner, hardware wake lock, browser PWA install prompt, physical network drop)
- **Production-verified** — verified in the live/deployed staging or production environment
- **Not yet proven** — looks right, still needs verification

Never mark a security/integrity issue fully closed just because the code looks reasonable.

## Failure / Edge-Case Matrix (Pass 3)

| Trigger | Question |
|---|---|
| Invalid / missing input | Rejected safely? Fails safe? |
| Duplicate | Does repeating the action create duplicate data? |
| Concurrent | Can two simultaneous actions both succeed incorrectly? |
| Retry | Safe and idempotent? |
| Reload | What if the page reloads mid-operation? |
| Offline / slow / network drop | Unsafe mutations blocked? Duplicate submits avoided? Partial state handled? |
| Wrong role / wrong branch | Can the action or data cross boundaries? |
| Permission denied | Correctly rejected? |
| Legacy / deleted / stale reference | Does older or changed data break the workflow? |
| Midnight / timezone / clock disagreement | Are windows correct? What if client and server time differ? |
| Partial failure | What if only part of a multi-step workflow succeeds? |
| UI ↔ write mismatch | Can the UI say success while persistence failed, or the reverse? |
| Client ↔ server disagreement | What if client assumptions differ from server validation? |
| Rules ↔ query mismatch | Can a query reach data the UI assumes it can't? |
| Worker ↔ client mismatch | Do they use different role/branch rules? |
| Record ↔ report mismatch | Does the report match what's stored? |
| Audit log mismatch | Does the trail describe the true event? |
| Quota / Read explosion | Are queries bounded with limit()? Can a listener leak or retry loop exhaust free tier? |

## Special Trigger Categories (Never Skip)

**Duplicate** — double click/scan/submit, refresh + retry, network retry. *Can one logical action create two records?*

**Concurrency** — requests A and B arriving together. *Can both read the same old state and both commit?*

**Fail-open** — Worker, crypto, role, branch, or config missing; server unreachable. *Does a missing dependency make the system less secure?* Secure behavior is DENY/STOP, not fallback/guess/continue.

**Client-supplied trust** — *Can a modified browser submit a value the UI wouldn't allow?* Never rely on UI alone for role, branch, identity, permissions, money amounts, event/class eligibility, authoritative timestamps, or approval state.

**Ambiguity** — two corporate events, classes, parent relationships, open shifts, or matching users. Don't silently pick one unless a business rule defines the resolution.

**Manual override conflicts** — e.g. instructor marks a student ABSENT, student later scans a badge: does the scan overwrite the manual correction? Policy must be explicit; automation shouldn't undo a deliberate human correction.

**Resource & Quota Exhaustion (Zero-Budget Risk)** — unbounded historical queries, missing `.limit()`, unbounded `onSnapshot` listeners, listeners left active after component unmount, fan-out reads in client-side loops, or reconnect retry storms. In a zero-budget project, code that drains the 50,000 daily Firestore read quota is a critical operational failure.

## Physical Device & Hardware Boundaries

Some workflows cannot be fully validated by unit tests or emulators alone. Explicitly mark behaviors requiring physical device verification:
- Camera/scanner hardware autofocus, low-light scan, multiple barcode rapid reads
- Kiosk full-screen mode, screen wake-lock, and OS idle sleep
- Hardware network toggle (true airplane mode vs mock offline)
- PWA installation, local storage eviction under low device storage, and camera stream cleanup on component unmount

## Time and Timezone

Treat time as a first-class integrity concern. Audit WITA vs UTC storage, local display, date keys, midnight boundaries, event windows, overnight events, client vs server clock, stale timestamps, and date-based deterministic IDs.

Test: 23:59 / 00:00 / 00:01, an event spanning midnight, late scan, early arrival, wrong client clock, client/server mismatch.

## Branch Isolation Pattern

For every branch-aware feature, trace a Branch A user attempting to read/write Branch B through: UI → client query → Worker → Firestore rule → actual result. The boundary must hold even if the browser is modified. A hidden button or filtered array is **not** security.

## Server / Client Consistency

Where business logic is duplicated, compare the implementations for drift: role normalization, branch mapping, event matching, shift rules, attendance logic (React vs Worker vs Firestore rules). Prefer one canonical source of truth where practical.

## Runtime Test Matrix

For high-impact workflows, track a grid of workflow × {Normal, Duplicate, Concurrent, Offline, Wrong Role, Wrong Branch, Retry, Reload}:

| Workflow | Normal | Dup | Concurrent | Offline | Wrong Role | Wrong Branch | Retry | Reload |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Staff Clock-In | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Staff Clock-Out | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Class Switch | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Student Attendance | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Payment | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Approval | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |

Expand as new risk patterns appear.
