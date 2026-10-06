# Operational Runbook: Executive Account Migration & Bootstrapping

> **Document Type:** Operational Architecture Decision & Setup Runbook  
> **Status:** Active & Authoritative  
> **Date:** 2026-10-04  
> **Applies to:** Business Owner (Kifry), Director, Vice Director, Firebase Console Custodians  

---

## 1. Overview & Objective

To eliminate the single "all-powerful admin" risk, MyLiberties Portal introduces two distinct top-level executive roles:
- **Director (`director`):** Primary strategic leader and signer for sensitive organization-wide actions.
- **Vice Director (`vice_director`):** Strategic partner, province-wide oversight, and independent cross-check / backup signer for dual-control Maker-Checker flows (such as staff role elevation).

Because client-side Firestore security rules require a two-party signed approval record to elevate any user account to an executive or managerial role, the **very first Director and Vice Director accounts cannot be approved by an existing in-app signer**. They must be bootstrapped once directly in the Firebase Console.

This runbook gives the exact, step-by-step instructions for:
1. Bootstrapping the real Director account.
2. Bootstrapping the real Vice Director account.
3. Enabling dual-control in-app approvals.
4. Testing and local development using the Dev Quick Switcher.

---

## 2. Bootstrapping Steps (One-Time Setup in Firebase Console)

### Step 1: Designate the Real Human Accounts
Before making changes, confirm the Google email addresses of the two real people:
- **Director Email:** `[director-email]@myliberties.com` (or authorized personal Gmail)
- **Vice Director Email:** `[vice-director-email]@myliberties.com`

> [!IMPORTANT]
> If Kifry's current personal or office account was previously acting as the single `admin`, that account should either:
> 1. Be transitioned to the real Director (if Kifry is the Director), OR
> 2. Be transitioned to the real Director's email, while Kifry uses local Dev Presets for daily portal development.

---

### Step 2: Ensure Accounts Exist in Firebase Authentication
1. Have the Director and Vice Director sign into the portal once via Google Sign-In, OR create their accounts under **Authentication** in the Firebase Console.
2. Note each user's unique identifier (**UID**) from the Firebase Console Authentication tab.

---

### Step 3: Configure the Director Record in Firestore
1. Open the [Firebase Console](https://console.firebase.google.com/).
2. Navigate to **Build** → **Firestore Database** → `users` collection.
3. Locate (or create) the document whose Document ID is the Director's Auth UID (`users/{directorUid}`).
4. Ensure the following fields are set:
   ```json
   {
     "displayName": "Director Name",
     "email": "director@myliberties.com",
     "role": "director",
     "branch": null,
     "division": null,
     "status": "active",
     "updatedAt": "2026-10-04T12:00:00.000Z"
   }
   ```
   *(Note: Setting `branch: null` and `division: null` grants province-wide, multi-branch, multi-division authority).*
5. Save the document.

---

### Step 4: Configure the Vice Director Record in Firestore
1. In the same `users` collection, locate (or create) the document whose Document ID is the Vice Director's Auth UID (`users/{viceDirectorUid}`).
2. Ensure the following fields are set:
   ```json
   {
     "displayName": "Vice Director Name",
     "email": "vicedirector@myliberties.com",
     "role": "vice_director",
     "branch": null,
     "division": null,
     "status": "active",
     "updatedAt": "2026-10-04T12:00:00.000Z"
   }
   ```
3. Save the document.

---

## 3. Transitioning the Legacy Admin Account

The portal codebase includes full backwards-compatibility aliases:
- Legacy role `'admin'` is automatically normalized to `'director'` in memory via `normalizeRole()`.
- However, for security hygiene, open the document for the legacy admin account and explicitly update:
  - `role`: change `"admin"` to `"director"`.

---

## 4. How In-App Role Elevation Works Going Forward

Once the Director and Vice Director accounts are bootstrapped, **no one needs to open the Firebase Console for normal staff promotions**:

1. **Staff Promotion Request (Maker):**
   - An executive or manager opens the Staff Directory in the Dashboard.
   - They edit an employee's profile and select a new role (e.g., promoting an Instructor to Instructor Leader, or appointing a Division Manager).
   - Clicking **Save** automatically creates a pending `STAFF_ROLE_ELEVATION` approval request.
   - Non-role changes (phone, division, address) save immediately, while the role elevation waits for authorization.
2. **Independent Authorization (Signer / Checker):**
   - The pending request appears in the **Approvals** inbox.
   - Either the Director or Vice Director reviews the ticket and clicks **Approve** (with an optional audit note).
   - **Dual Control Enforcement:** The security rules strictly forbid the maker from approving their own request, and forbid anyone from approving a promotion on their own profile.
   - Upon approval, the staff member's role is automatically updated in Firestore.

---

## 5. Development & Testing Workflow (Without Touching Production Roles)

To allow Kifry to test the portal without needing to log into the production Director's Google account:

1. In local development (`npm run dev`), the portal includes the **Dev Quick Switcher** in the bottom-right corner.
2. Two dedicated presets are available:
   - **Director Preset:** Loads a mock executive profile with role `"director"` and province-wide visibility across all 4 branches.
   - **Vice Director Preset:** Loads a mock executive profile with role `"vice_director"`.
3. To test Maker-Checker flows locally:
   - Switch to **Director** in the Quick Switcher, initiate a role change for a staff member.
   - Switch to **Vice Director** in the Quick Switcher, open the Approvals tab, and sign/approve the request.
   - Observe the live update.
4. The Dev Quick Switcher is automatically stripped out in production builds and is never bundled into public releases.
