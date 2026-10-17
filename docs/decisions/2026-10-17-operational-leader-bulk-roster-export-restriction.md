# Formal Owner Decision: Operational Leader Restriction on Bulk Student Roster CSV Export

> **Authority Level:** Binding Operational Policy (`docs/decisions/`)
> **Decision Identifier:** `OD-OPS-02` / `G-014`
> **Status:** RATIFIED & ACTIVE
> **Ratified by:** Owner / Director (Kifry)
> **Date:** 2026-10-17
> **Ratification Basis:** Explicit owner approval in project conversation transcript on 2026-10-17
> **Blueprint Alignment:** Amends Authoritative Blueprint v3.4.1 §6.8, adds §26 G-014, and updates §41 Owner Approval Record

---

## 1. Context and Problem Statement

Under Authoritative Blueprint v3.4.1:
- The **Operational Leader** coordinates branch-site logistics, facility maintenance, student throughput tracking, and class cohort scheduling at the Main Campus (`kota_gorontalo`) (§6.8).
- Under `DOM05-PRIV-01` and Blueprint §6.10, §7.3, privacy safeguards were established to prevent bulk data harvesting of sensitive student and parent Personally Identifiable Information (PII), such as full names, parent contacts, WhatsApp phone numbers, and home addresses. Teaching instructors and technical System Administrators were explicitly restricted from bulk CSV exports.
- In `src/features/students/StudentRoster.jsx:77`, `canExportRoster` evaluated to `true` for `userRole === "opslead"`, exposing the "Export CSV" button in the roster header.
- During the Frontend Workspace Placement Pass (`FP-OPS-13`), this was identified as an unresolved governance question: Does the Operational Leader's on-screen student throughput and capacity monitoring authority authorize downloading bulk student PII to local device storage via CSV, or should bulk roster export be restricted to Division Managers, Front Office, and Executive Leadership?
- Under the principle that operational monitoring does not infer bulk PII export rights, the question was held as `[Owner Decision Required]`.

---

## 2. Binding Decision & Owner Confirmation

> **Binding Owner Decision (2026-10-17):**
> *"Ops Leads must not export bulk student roster CSVs. Preserve their existing on-screen, read-only roster access. Apply the restriction to the normalized Ops Lead role and its recognized aliases. Do not change CSV export access for other roles. Do not remove roster fields or weaken/expand Firestore read permissions as a side effect."*
> — Owner / Director (Kifry), 2026-10-17

### 2.1 Scope of the Policy

1. **Disabling of Built-in Bulk CSV Export Action (UI Policy Boundary):**
   - The application-provided bulk CSV export action button is disabled and suppressed from the `StudentRoster` header for Operational Leaders and all recognized aliases.
   - **Technical Boundary & Extraction Disclosure:** This control disables the application-provided bulk CSV download feature. Because on-screen read-only roster access is intentionally preserved for operational logistics, this control does not technically prevent all data extraction (users with on-screen access may still copy or extract visible data from their display). It removes the automated bulk harvesting mechanism without altering underlying database permissions.

2. **Normalized Role & Alias Enforcement:**
   - The restriction applies to the canonical `opslead` role and all recognized aliases supported by `src/features/shared/roles.js`:
     - `opslead`
     - `ops_lead`
     - `operational_leader`
     - `operationalleader`
     - `frontofficelead`
     - `front_office_lead`

3. **Preservation of On-Screen Read-Only Roster Visibility:**
   - Operational Leaders retain their approved on-screen read-only visibility into the student roster (`StudentRoster` mounted with `readOnly={true}`, `canEditStatus={false}`).
   - This on-screen visibility supports site logistical coordination, classroom room capacity planning, and front-desk visitor reception.

4. **Preservation of Access for Other Roles:**
   - Existing authorized roles retain their approved roster export access:
     - `director` (Executive)
     - `vice_director` (Executive)
     - `manager` (Division Manager)
     - `frontoffice` (Front Office admissions and communications)
   - Previously restricted roles remain blocked:
     - `instructor` (Teaching staff blocked per `DOM05-PRIV-01`)
     - `admin` / `isAdmin` (System Administrator blocked per `DOM05-PRIV-01`)

5. **No Mutation of Roster Fields or Security Rules:**
   - Zero changes are made to Firestore read permissions, schemas, or query bounds for `/students`.
   - On-screen roster fields, badges, and linked parent contact visibility remain completely intact.
