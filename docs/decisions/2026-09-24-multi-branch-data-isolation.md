---
title: Multi-Branch Data Isolation Policy
type: decision
status: active
created: 2026-09-24
accepted: 2026-09-24
last_verified: 2026-09-28
supersedes: null
superseded_by: Partially superseded by docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md and docs/decisions/2026-10-04-executive-account-migration-bootstrap-runbook.md (provisional admin representation of executive roles and global admin routing)
related_proposal: docs/proposals/archive/2026-09-24-multi-branch-data-isolation.md
---

# Decision: Multi-Branch Data Isolation (`branchId` Scoping)

> [!NOTE]
> **Governance Alignment Notice (2026-10-05):**  
> The multi-branch data isolation policy (`branchId` scoping across Firestore collections, repository normalizers, and Maker-Checker branch routing) remains **active and binding**.  
> However, the provisional statements in §1.1 and §2.1 that Owner / Director / Vice Director are "provisionally represented by the `admin` role" and that escalated actions route to `admin` are **superseded** by the Authoritative Governance Blueprint ([`docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md`](../governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md), §6–§7) and the Executive Bootstrap runbook ([`docs/decisions/2026-10-04-executive-account-migration-bootstrap-runbook.md`](./2026-10-04-executive-account-migration-bootstrap-runbook.md)). Technical System Admin is not an organizational role; executive authority is held by Director and Vice Director under dual-control governance.

## 1. Selected Policy

1. **Organizational Hierarchy & Boundary:**
   - **Global Tier (Cross-Branch):** Owner / Director / Vice Director (provisionally represented by the `admin` role). They oversee all campus branches and have aggregate cross-branch visibility and authority.
   - **Branch Tier (Location-Isolated):** Branch Manager (`manager`), Operations / Front Office Lead (`frontoffice` / `opslead`), Instructor Leader (`instructorleader`), Marketing (`marketing`), and Instructors (`instructor`) operate strictly within their assigned campus branch.

2. **Canonical Branch Identifiers:**
   All branches must map deterministically through `src/constants/branches.js`:
   - `kota_gorontalo` ("Kota Gorontalo") — Default branch
   - `bone_bolango` ("Bone Bolango")
   - `pohuwato` ("Pohuwato")
   - `limboto` ("Limboto")

3. **Dual Stamping Data Contract:**
   Every operational entity in Firestore must be stamped with both `branchId` (slug for indexing and rule checks) and `branch` (human-readable string for display):
   - `users/{userId}`
   - `deskInquiries/{inquiryId}`
   - `payments/{paymentId}`
   - `shifts/{shiftId}`
   - `applications/{appId}`
   - `schoolOutreach/{schoolId}`
   - `classes/{classId}`

4. **Maker-Checker Approval Routing Isolation:**
   - Approvals requested by branch staff must route only to the corresponding approver of the same branch (`approverBranchId == currentManager.branchId`).
   - Escalated governance actions (staff role modifications, deactivations, terminations) route globally to Admin.

## 2. Important Exceptions

1. **Admin / Superadmin Exemption:**
   - The `admin` role is completely exempt from single-branch boundaries. Admins can view, query, and modify records across all branches.
2. **Legacy Document Normalization:**
   - Legacy documents created before branch scoping was introduced that lack a `branchId` attribute are automatically resolved to `DEFAULT_BRANCH_ID` (`"kota_gorontalo"`) by repository read normalizers (`branchToId(record.branch || record.branchId)`).
3. **Kiosk Shared Devices:**
   - Physical kiosk stations at a physical branch authenticate through a role bound to that branch, but must never leak data belonging to other branches.

## 3. What Is Explicitly Not Allowed

1. **No Unscoped Cross-Branch Queries for Branch Roles:**
   - A Branch Manager or Marketing officer must never query or receive user profiles, tuition receipts, or walk-in leads originating from a different branch.
2. **No Client-Only Security Boundaries:**
   - UI `.filter(item => item.branchId === currentBranch)` is strictly a visual filter and is never considered an authoritative security boundary. Firestore security rules must enforce `isSameBranch(branchId)` on all read/write paths.
3. **No Unstamped Document Writes:**
   - Repositories are strictly forbidden from writing new documents to `users`, `payments`, `shifts`, `deskInquiries`, `schoolOutreach`, or `classes` without canonical `branchId` and `branch` fields.

## 4. Relationship to Current Implementation

- **Constants & Helpers (`src/constants/branches.js`):** Implemented. Includes `BRANCH_MAP`, `branchToId()`, `idToBranch()`, `normalizeBranch()`, and legacy alias normalization.
- **Repository Stamping:** Active in primary repositories (`usersRepository`, `deskInquiriesRepository`, `paymentsRepository`).
- **Remediation In Progress:**
  - Collection-group query branch scoping for `schoolOutreach` visits is documented in `docs/plans/active/outreach-manager-marketing-remediation-plan.md`.
  - Firestore security rule enforcement (`isSameBranch` helper) is pending full deployment as identified in audit `docs/audits/current/2026-09-27-reconciled-full-audit.md`.

## 5. Review & Authority

- **Date Accepted:** 2026-09-24
- **Authority:** Approved operational architecture decision per `AGENTS.md` and owner confirmation.
