# Owner Decision Record: Student Portal Scope & Student Account Routing (OD-STU-4)

**Repo Path:** `docs/decisions/2026-10-16-student-portal-scope-and-account-routing.md`  
**Date:** 2026-10-16  
**Status:** **RATIFIED AUTHORITATIVE DECISION — OWNER APPROVED (KIFRY)**  
**Governing Baseline:** [`docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md`](../governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md) (v3.4, Ratified 2026-10-13)  
**Origin:** BLRCA Slice 6 Audit Finding `SL6-STU-01` (`docs/audits/current/role-business-logic-conformance-audit.md` §9.5).

---

## 1. Context & Problem Statement

During the BLRCA Slice 6 audit of external portal and front-line operational roles, an evaluation of student account handling identified an inconsistency between application routing and portal access controls:
- In `src/App.jsx:658-663`, when an authenticated user with `role === "student"` logs into the portal, the application displays a "Student Account" card containing a button: `<a href="/portal">Go to Parent & Student Portal</a>`.
- However, the `/portal` route (`src/features/students/ParentPortalPage.jsx:260`) is strictly reserved for parents:
  ```javascript
  if (normalizeRole(userRole) !== "parent") {
    return <AccessRestrictedScreen />;
  }
  ```
- Authenticated students clicking this button are greeted with an "Access Restricted: This portal is strictly reserved for authenticated parent accounts" screen.
- Under the current zero-budget architecture, student attendance is captured directly at physical campus kiosk stations (`StandaloneKioskPage.jsx`), while payment status, attendance history, and teacher evaluation progress are monitored by parents through the Parent Portal (`ParentDashboard.jsx`).

---

## 2. Ratified Owner Decision: OD-STU-4 (Option A)

Owner Kifry reviewed the options on 2026-10-16 and formally selected **Option A**:

- **Decision (Option A):** **Remove Dead Link & Reinforce Informational Boundary.**
  - Remove the `<a href="/portal">Go to Parent & Student Portal</a>` button from the Student Account card in `src/App.jsx`.
  - Maintain the clear informational guidance that:
    1. Student attendance is recorded directly at campus kiosks.
    2. Parents and guardians monitor academic progress, attendance records, and tuition status through the Parent Portal.
  - Preserve the user's `Sign Out` button and profile inspection capability.
  - No new student-facing dashboard is introduced at this stage, avoiding unnecessary complexity and preserving the $0 free-tier Spark budget.

---

## 3. Enforcement & Boundaries

1. **`src/App.jsx`:**
   - The Student Account card UI presents the student's authenticated email, the informational explanation of kiosk attendance and parent monitoring, and a single `Sign Out` action.
2. **`ParentPortalPage.jsx`:**
   - Retains strict `normalizeRole(userRole) === "parent"` gating. Non-parents cannot access child records or parent dashboard interfaces.
3. **Database Security Rules (`firestore.rules`):**
   - Students retain the ability to read their own profile (`userId == request.auth.uid`), their own class attendance records (`studentId == request.auth.uid`), and their enrolled class metadata where `studentIds.hasAny([request.auth.uid])`.
   - Students remain strictly blocked from internal staff collections (`todos`, `corporateEvents`, `shifts`, `approvals`, `deskInquiries`).
