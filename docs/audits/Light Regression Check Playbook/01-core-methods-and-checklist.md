# 01 — Core Methods & Checklist

Covers **Section 6 (The Five-Minute Core Check)**, **Section 7 (The Light Regression Checklist)**, **Section 8 (Choosing the Right Adjacent Workflow)**, and **Section 9 (Risk-Based Light Regression)**.

---

# 6. The Five-Minute Core Check

Every light regression check begins with these five fundamental checks:

## Check 1 — Normal Path
Perform the action normally.
- **Question:** Does the intended workflow still work?
- *Example:* Open kiosk → scan valid staff badge → select event/class → clock in → verify shift appears.

## Check 2 — Duplicate / Repeat
Repeat or retry the action immediately.
- **Examples:** Double-click, double-scan, rapid re-submit, immediate retry, refresh and re-submit.
- **Question:** Can the same logical action happen twice or create duplicate records?

## Check 3 — Expected Failure
Trigger one obvious failure condition.
- **Examples:** Invalid barcode ID, missing required form field, network offline, Worker rejection, permission denied.
- **Question:** Does the feature fail safely, gracefully, and clearly without leaving corrupted state?

## Check 4 — Permission / Boundary
Test one security or data boundary appropriate to the feature.
- **Examples:** Wrong role, wrong branch, wrong student ID, wrong class ID, wrong employee.
- **Question:** Is the user prevented from doing something they should not be able to do?

## Check 5 — Result Verification
Do not stop at the UI feedback banner.
- **Examples:** UI says "Clocked in" → inspect stored shift document in Firestore. UI says "Payment completed" → verify student ledger and balance. UI says "Enrolled" → verify class roster.
- **Question:** Did the underlying database state actually change correctly?

---

# 7. The Light Regression Checklist

Use this checklist after every meaningful development change:

### A. Change Understanding
- [ ] What exactly changed?
- [ ] Which file/module was modified?
- [ ] Which user workflow uses it?
- [ ] Which roles use it?
- [ ] Which branch or data boundaries apply?
- [ ] Is a Worker, API, or Firestore rule involved?
- [ ] Is this shared infrastructure code?

### B. Normal Workflow
- [ ] Main action succeeds normally.
- [ ] Expected UI updates appear.
- [ ] Expected database records are created or updated.
- [ ] Downstream result is accurate.

### C. Repeat / Duplicate
- [ ] Double-action / rapid clicks tested.
- [ ] Immediate retry tested.
- [ ] Page reload and duplicate submit checked.
- [ ] Confirmed no duplicate database document was created.

### D. Failure Handling
- [ ] One invalid-input case tested.
- [ ] One dependency failure tested (e.g. offline, mock network error).
- [ ] Actionable error message displayed to the user.
- [ ] Failed operation leaves clean, uncorrupted state.

### E. Security & Boundary
- [ ] Role boundary checked (unauthorized role denied).
- [ ] Branch boundary checked (cross-branch access blocked).
- [ ] Client-only restriction not mistaken for security (rules/server enforced).

### F. Final State & Resource Sanity
- [ ] Database record verified directly.
- [ ] Query limits (`limit()`) and listener cleanup (`unsubscribe()`) intact.
- [ ] Nearest downstream workflow operates correctly with the new state.

---

# 8. Choosing the Right Adjacent Workflow

A common mistake is testing only the code that was edited. Always verify the **closest downstream dependency**:

| Change Made | Direct Check | Adjacent Downstream Dependency to Check |
|---|---|---|
| Kiosk clock-in | Clock-in succeeds | Open shift record created in Firestore |
| Class enrollment | Student added to class | Attendance roster reflects eligibility |
| Payment recorded | Payment writes successfully | Student balance & receipt history update |
| Role update | New role saved | Protected dashboard navigation & rule access |
| Branch change | User branch changed | Branch-scoped queries isolate data |
| Student deletion | Student record removed | Class roster & parent link cleaned up |
| Attendance edit | Correction saved | Reports & student attendance percentage |
| Corporate event | Event selectable | Staff shift & student check-in association |
| Firestore rule edit | Allowed action passes | Denied action / cross-branch blocked |
| Worker endpoint | HTTP request succeeds | Authoritative database state persisted |

*The adjacent check is where the majority of regressions hide.*

---

# 9. Risk-Based Light Regression Depth

Match testing depth to the change's operational risk:

### Low-Risk Change
- **Examples:** Text edits, spacing, cosmetic styling, icon replacement.
- **Minimum Scope:** Normal path + basic UI verification.
- **Time Target:** ~1–5 minutes.

### Medium-Risk Change
- **Examples:** Component state logic, repository queries, form validation, dashboard filtering, shared UI primitives.
- **Minimum Scope:** Normal path + duplicate/repeat check + failure case + database state verification.
- **Time Target:** ~5–15 minutes.

### High-Risk Change
- **Examples:** Firestore security rules, authentication, branch isolation, attendance, kiosk, payments, deletion/cascade, Cloudflare Worker endpoints.
- **Minimum Scope:** Normal path + duplicate check + failure case + permission/branch boundary + database verification + connected adjacent workflow check.
- **Time Target:** ~10–30 minutes.
- *Escalation Question:* Does this high-risk change justify a full Section Deep Audit?
