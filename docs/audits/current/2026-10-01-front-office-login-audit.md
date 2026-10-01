# MYLIBERTY — Front Office Login / Dashboard Failure Audit

> Date: 2026-10-01  
> Repository: aymira-git/mylibertyportal-origin  
> Audited commit: 2a7c7ac8ca7afc9d145319ecc20c778e18b58f9d  
> Status: Root-cause investigation — do not patch blindly

## 1. Symptom

The reported problem is that a Front Office user cannot successfully reach/use the Front Office dashboard after login. The exact failure layer is not yet proven.

Possible layers:
1. Firebase authentication failure.
2. Firebase authentication succeeds but the Firestore profile cannot be loaded.
3. Authentication and profile load succeed, but Front Office Firestore listeners receive permission-denied.
4. The profile contains an unexpected role, division, branch, or status.
5. The dashboard component throws at runtime.

These must not be fixed with the same speculative patch.

## 2. Authentication flow

LoginPage calls App.handleLogin(), which calls signInWithEmailAndPassword(auth, email, password). App then relies on onAuthStateChanged().

After authentication, App reads users/{uid}, normalizes role/division, determines branch, and renders the dashboard.

Therefore the login button itself is not responsible for deciding whether the Front Office dashboard is rendered.

## 3. Front Office routing is present

App.jsx explicitly routes normalized Front Office roles:
- frontoffice
- opslead
- ops_lead
- frontofficelead

Routing then selects:
- division = all -> CrossDivDashboard
- division = kindergarten -> KidsFrontOfficeDashboard
- otherwise -> FrontOfficeDashboard

Conclusion: there is no obvious missing Front Office route. Do not start by rewriting the router.

## 4. HIGH-PRIORITY HYPOTHESIS: role contract mismatch

src/features/shared/roles.js supports the legacy alias:

    front_office -> frontoffice

The React application therefore treats a Firestore profile containing role = front_office as canonical frontoffice.

However, firestore.rules defines isFrontOffice() using:

    frontoffice
    opslead
    ops_lead
    frontofficelead

It does NOT include front_office.

This can produce:

    Firestore role = front_office
        -> frontend normalizeRole() = frontoffice
        -> Front Office dashboard renders
        -> Firestore isFrontOffice() = false
        -> dashboard listeners can receive permission-denied

This is a strong hypothesis for a symptom described as 'Front Office cannot login', even if Firebase authentication itself succeeds.

Classification: HIGH-PRIORITY HYPOTHESIS, NOT YET PROVEN.

## 5. Inspect the affected user before changing code

Read users/{uid} for the actual affected account and record:

    uid
    email
    role
    division
    branch
    branchId
    status

Expected canonical Courses Front Office:

    role = frontoffice
    division = courses
    status = active
    branchId = valid canonical branch id

Expected Kindergarten Front Office:

    role = frontoffice
    division = kindergarten
    status = active
    branchId = valid canonical branch id

Expected cross-divisional Front Office:

    role = frontoffice
    division = all
    status = active
    branchId = valid canonical branch id

Do not infer these values from the visible name or invite label.

## 6. Branch and division checks

useDashboardData() uses the current profile branch and converts it through branchToId(). Firestore rules separately evaluate branch isolation.

Therefore verify that the affected profile has a valid branch/branchId and that records used by the dashboard use compatible branch values.

Front Office Courses uses FrontOfficeDashboard with division = courses.
Kindergarten uses KidsFrontOfficeDashboard.
division = all uses CrossDivDashboard.

Do not solve a login problem by removing branch/division filtering.

## 7. Dashboard listeners

useDashboardData.js creates separate listeners for:
- users
- classes
- applications
- todos
- invites

Each listener has its own error handler. A dashboard can therefore authenticate and render while one or more data streams are denied.

The browser console is therefore critical evidence.

## 8. Required diagnostic procedure

### Step A — prove Firebase Auth

Attempt login and determine whether auth.currentUser becomes non-null.

If Firebase Auth fails, capture the exact error code, such as auth/invalid-credential, auth/user-disabled, auth/too-many-requests, auth/network-request-failed, or auth/operation-not-allowed.

Do not replace the real error with a generic 'login failed'.

### Step B — inspect the profile

If Auth succeeds, inspect users/{uid}. Record raw role, division, branch, branchId, and status.

Specifically check for raw role = front_office.

### Step C — inspect the first Firestore error

Look for permission-denied or listener errors involving users, classes, applications, todos, or invites.

The first meaningful error is more valuable than the final visual symptom.

### Step D — classify the incident

Use exactly one:
- AUTH_FAILURE
- PROFILE_READ_FAILURE
- ROLE_NORMALIZATION_FAILURE
- FIRESTORE_AUTHORIZATION_FAILURE
- DASHBOARD_RUNTIME_FAILURE

Do not patch until the incident is classified.

## 9. Recommended regression coverage

Add a focused test for:

    authenticated Firebase user
    + users/{uid}.role = frontoffice
    + division = courses
    + status = active
    + valid branchId
    = FrontOfficeDashboard route

Also test the legacy alias if legacy profiles are intentionally supported:

    role = front_office
    -> normalizeRole(role) = frontoffice

Then verify that Firestore authorization uses the same canonical role contract.

## 10. Architectural concern

The current system maintains role aliases in frontend JavaScript and separately maintains role lists in Firestore Security Rules.

This creates a dangerous split where:

    Frontend says: this is Front Office
    Firestore says: this is not Front Office

That split is exactly the kind of defect that can look like a broken login while actually being an authorization failure.

Long-term, staff profiles should use canonical persisted role values, with deliberate migration of old values. Do not endlessly add aliases to security rules just to hide inconsistent data unless legacy compatibility is an explicit requirement.

## 11. Do NOT do these things yet

1. Do not rewrite LoginPage.jsx without proving Firebase Auth is failing.
2. Do not rewrite FrontOfficeDashboard.jsx without proving a runtime failure.
3. Do not disable Firestore rules.
4. Do not grant Front Office Admin permissions.
5. Do not remove branch/division filtering.
6. Do not change division to all just to make queries work.
7. Do not silently swallow permission-denied and show an empty dashboard.
8. Do not add random fallback roles.
9. Do not change the user's password as a code fix.
10. Do not declare the issue fixed without testing the actual affected account.

## 12. Current conclusion

The repository has a functioning authentication-to-dashboard architecture for Front Office and the routing is present.

The strongest code-level suspicion is the frontend/Firestore role-contract mismatch: frontend normalization supports front_office, while firestore.rules does not recognize that raw role as Front Office.

This is not yet a proven root cause because the affected user's actual profile and browser error have not been captured.

Correct next move: diagnosis first, patch second.

## 13. Exact instruction for the coder agent

Stop patching the Front Office login flow for now. Diagnose the failure layer first.

1. Prove whether signInWithEmailAndPassword() succeeds.
2. Capture the exact Firebase Auth error if it fails.
3. If Auth succeeds, inspect users/{uid} and report raw role, division, branch, branchId, and status.
4. Specifically check whether raw role is front_office.
5. Inspect the browser console for the first Firestore permission-denied.
6. Identify which listener fails: users, classes, applications, todos, or invites.
7. Classify the failure as AUTH_FAILURE, PROFILE_READ_FAILURE, ROLE_NORMALIZATION_FAILURE, FIRESTORE_AUTHORIZATION_FAILURE, or DASHBOARD_RUNTIME_FAILURE.
8. Do not change permissions, role, division, or routing until the failure is classified.
9. Report evidence and the smallest proposed fix before modifying code.

Current high-priority hypothesis to verify: frontend role normalization supports front_office -> frontoffice, but firestore.rules isFrontOffice() does not include front_office.