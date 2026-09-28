# 03 — Domain Playbooks: Kiosk, Attendance & Finance

Covers **Section 11 (Light Regression for Kiosk Changes)**, **Section 12 (Light Regression for Attendance Changes)**, **Section 13 (Light Regression for Payment Changes)**, and **Section 14 (Light Regression for Role Changes)**.

---

# 11. Light Regression for Kiosk Changes

The Kiosk combines UI, hardware scanning, Cloudflare Worker APIs, Firestore persistence, and multi-branch rules.

After any change touching the Kiosk or staff shifts, execute this minimum sequence:

### 1. Normal Path
```text
Valid staff badge scanned
→ event or class selected
→ clock-in action triggered
→ shift created with correct employeeId, branchId, timestamp
```

### 2. Duplicate Check
```text
Scan badge twice in rapid succession
→ second attempt rejected
→ confirm no duplicate open shift created
```

### 3. Failure Check
```text
Simulate Worker unavailable / invalid endpoint URL
→ operation fails safe (FAIL-CLOSED)
→ actionable error displayed; NO silent fallback to unauthenticated direct writes
```

### 4. Boundary Check
```text
Wrong role (non-staff user scanning staff badge) → rejected
Wrong branch badge scanned → rejected
```

### 5. Final State Verification
```text
UI reports success
→ inspect Firestore shift document
→ verify employeeId, branch, clockIn timestamp, and status ("open")
```

---

# 12. Light Regression for Attendance Changes

After any change to attendance recording, QR scanning, or class rosters:

1. **Mark Normal Attendance:** Scan or submit valid student attendance for today's active session.
2. **Duplicate Check:** Re-scan the same student badge immediately → verify duplicate warning and no secondary record.
3. **Existing Record:** Verify attendance for a student who was already marked PRESENT or EXCUSED.
4. **Manual Override Conflict Test:**
   ```text
   Instructor manually marks student ABSENT
           ↓
   Student scans QR code later in the session
           ↓
   Verify manual instructor decision is PRESERVED (automated scan does not overwrite human correction)
   ```
5. **Database Verification:** Confirm student attendance document exists with correct composite ID, date key, and branch.
6. **Downstream Check:** Verify class attendance percentage updates in instructor dashboard or daily report.

---

# 13. Light Regression for Payment Changes

After any change to student billing, tuition recording, cashiering, or receipt generation:

1. **Record Normal Payment:** Process a standard tuition or fee payment.
2. **Double Submission:** Double-click the "Record Payment" button or trigger rapid dual requests.
3. **Failure Case:** Trigger an invalid amount (e.g. 0, negative, or non-numeric) or simulated network timeout.
4. **Verify Ledger:** Inspect the payment transaction document in Firestore.
5. **Verify Balance:** Confirm student balance decreases by the exact payment amount.
6. **Audit Trail:** Confirm cashier identity, branch, payment method, and timestamp are permanently recorded.

> **Critical Escalation Question:** *Can one logical payment ever create two financial records or alter balance twice? If yes, STOP and ESCALATE.*

---

# 14. Light Regression for Role Changes

After any change to authentication, user roles, permission checks, or custom claims:

1. **Intended Role Allowed:** Log in as the assigned role → confirm permitted pages, buttons, and actions work.
2. **Unauthorized Role Denied:** Log in as an unauthorized role (e.g. Instructor attempting Admin billing actions) → confirm action is blocked.
3. **Navigation & UI State:** Confirm navigation menus and action buttons render strictly according to role permissions.
4. **Server / Rules Enforcement:**
   > *Never stop when the UI simply hides a button.*
   Attempt the underlying Firestore read or write directly to verify rules enforce the boundary independently of the UI.
5. **Worker Contract:** Confirm Worker endpoints validate role claims and reject mismatches.
