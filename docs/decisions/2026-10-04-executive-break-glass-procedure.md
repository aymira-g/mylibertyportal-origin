# Operational Runbook: Executive Deadlock Break-Glass Procedure

> **Document Type:** Operational Architecture Decision & Recovery Runbook  
> **Status:** Active & Authoritative  
> **Date:** 2026-10-04  
> **Applies to:** Firebase Console Custodians, Director, Vice Director  

---

## 1. Context & Purpose

With the introduction of dual-control role elevation between **Director** and **Vice Director**, staff role elevation requires two independent parties:
1. **Maker:** Submits role elevation request ticket.
2. **Signer:** Cross-checks and signs/approves ticket.

In the event of an executive departure, account lockout, credential loss, or unforeseen emergency deadlock where cross-checking is impossible in-app, this document defines the authoritative, break-glass recovery procedure.

---

## 2. Console Ownership & Key Custody

- **Custodians:** Exactly **one or two trusted principals** (the business owner/registered office account) hold access to the Firebase Console.
- **Principle:** The Firebase Console sits outside client security rules and is the ultimate root of trust. No developer or third-party agent should hold perpetual access to the console credentials.
- **Key Hygiene:** Any exported service account key files (`serviceAccountKey.json`) must remain strictly outside code repositories, public drives, or compressed ZIPs.

---

## 3. Step-by-Step Break-Glass Recovery Procedure

If in-app dual-control is deadlocked:

### Step 1: Access Firestore Database
1. Open the [Firebase Console](https://console.firebase.google.com/).
2. Select the `myliberty-portal` project.
3. In the left navigation, open **Build** → **Firestore Database**.

### Step 2: Emergency Role Assignment / Recovery
1. Open the `users` collection.
2. Locate the document corresponding to the target user's Authentication UID (`/users/{uid}`).
3. In the document fields:
   - Set `role` to `"director"` (or `"vice_director"`).
   - Set `status` to `"active"`.
   - Add/update `roleUpdatedAt` with the current UTC timestamp (e.g., `2026-10-04T12:00:00.000Z`).
   - Set `roleUpdatedBy` to `"BREAK_GLASS_CONSOLE"`.
4. Click **Save**.

### Step 3: Verify In-App Access
1. Have the user sign in via Google Authentication at the portal login screen.
2. The user will automatically route to the Executive Dashboard with province-wide authority.
3. The newly recovered executive can now participate as the second signer in the standard in-app Maker-Checker queue.

---

## 4. Break-Glass Incident Logging

Every execution of this procedure must be recorded in this repository's audit log under `docs/audits/` with:
- Date & WITA time of console intervention.
- Reason for deadlock (e.g. credential reset, staff transition).
- Performing custodian email.
- Affected user accounts.
