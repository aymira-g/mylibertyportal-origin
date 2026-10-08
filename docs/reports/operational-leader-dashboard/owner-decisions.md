# Operational Leader Dashboard: Owner Decision Register (OD-O)

> **Document Type:** Binding Owner Decision Register for Operational Leader Conformance  
> **Audited By:** Coding / Executor Agent  
> **Companion Document:** [`00-phase0-audit.md`](./00-phase0-audit.md)  
> **Date:** 2026-10-08  
> **Status:** PENDING OWNER (KIFRY) REVIEW  

---

### OD-O1: "Front Office Lead" Legacy Alias vs. Operational Leader
- **Question (plain words):** Is there a real staff member at the school who is a "Front Office Lead" (head receptionist) who is **different** from the Operational Leader?
- **Why it came up:** In `src/features/shared/roles.js` (line 36) and `InvitesPanel.jsx`, the system treats `frontofficelead` as identical to `opslead`. In the Blueprint (§6.8, §6.9), the Operational Leader coordinates the whole branch site and facilities, while Front Office operates under them. If someone is just a senior receptionist, giving them the `opslead` role gives them authority over facility logs, shift approvals, and cash discrepancy sign-offs.
- **Already decided?:** Blueprint §6.8 explicitly defines "Operational Leader" and §6.9 defines "Front Office / Admin". There is no "Front Office Lead" in the blueprint.
- **Option A (Separate):** "Front Office Lead" does not exist as an independent role. Anyone in charge of the site operations is the **Operational Leader** (`opslead`). We remove "Front Office Lead" from new staff invites, and keep the code alias only so older test accounts don't break.
- **Option B (Real Role):** A "Front Office Lead" exists as a senior receptionist, distinct from the site leader. (This would require amending the Blueprint to define their exact job and authority).
- **Suggested default and why:** **Option A.** Follow the ratified blueprint strictly. No new roles should be invented without formal governance.
- **What the executor does in the meantime:** Retains the alias in `roles.js` for backwards compatibility, but does not grant any extra powers to it in new screens.
- **Answer (Kifry fills in):** **OPTION A (RATIFIED BY OWNER 2026-10-08)** — "Front Office Lead" is not an organizational role. Site leader is Operational Leader (`opslead`).

---

### OD-O2: Operational Leader Division Scope (Branch-Wide vs. Division-Bound)
- **Question (plain words):** Should the Operational Leader oversee the **entire physical branch** (both Course and Kindergarten buildings/areas), or can an Operational Leader be assigned to only one division?
- **Why it came up:** In `src/App.jsx` (lines 584-590), an `opslead` with `division: "kindergarten"` is routed into the kindergarten front desk, while one with `division: "courses"` is routed into the course front desk. However, Blueprint §6.8 says the Operational Leader coordinates **branch-site operations** (logistics, facility maintenance, and front desk). A physical branch has only one physical building/site with both programs.
- **Already decided?:** Blueprint §6.8 states: "The Operational Leader coordinates branch-site operations... site logistics; facility-maintenance coordination; front-office performance coordination; operational coordination of Front Office / Admin and Office Boy / Facilities."
- **Option A (Whole Branch):** The Operational Leader always has branch-wide operational scope (`division: "all"` or cross-divisional), giving them oversight over the facility, office boy cleaning tasks, and front desk throughput for the whole branch.
- **Option B (Division Bound):** A branch can have separate Operational Leaders for Courses and Kindergarten.
- **Suggested default and why:** **Option A.** The physical building, security, office boys, and reception desk serve the whole school branch. Splitting site facilities into two managers per building creates unnecessary confusion and budget overhead.
- **What the executor does in the meantime:** Keeps current routing intact until confirmed; designs the proposed dashboard to support a whole-branch view.
- **Answer (Kifry fills in):** **OPTION A (RATIFIED BY OWNER 2026-10-08)** — Operational Leader oversees the whole physical branch site (both Course and Kindergarten areas), site logistics, facilities, and front-desk coordination.

---

### OD-O3: Cash Drawer & Shift Discrepancy Ownership
- **Question (plain words):** Should the Operational Leader be the primary person who monitors daily cash drawer balances and resolves small shortages or surpluses under Rp 20.000?
- **Why it came up:** The Course and Kindergarten Manager dashboards removed the daily cash drawer breakdown so managers focus on enrollment and academic targets. The cashiers count the money at shift change. Under Owner Decision G-009, small discrepancies under Rp 20.000 must be reviewed and approved by the Operational Leader.
- **Already decided?:** Yes, formally ratified in G-009 §2 ("< Rp 20.000: Approved by Operational Leader; $\ge$ Rp 20.000 escalates to Vice Director / Director; Maker $\ne$ Checker").
- **Option A (Confirm G-009):** The Operational Leader dashboard includes a "Cash Reconciliation & Discrepancies" view to review shift balancing and authorize discrepancy tickets under Rp 20.000. Ops Lead does not personally act as cashier.
- **Option B (Front Office Only):** Cashiers resolve discrepancies themselves without leader sign-off. (Violates dual-control maker-checker).
- **Suggested default and why:** **Option A.** It directly implements the ratified decision G-009 and ensures zero money slips through unaccounted for.
- **What the executor does in the meantime:** Prepares the Reconciliation tab in the Phase 0 architecture map based on Option A.
- **Answer (Kifry fills in):** **OPTION A (RATIFIED BY OWNER 2026-10-08)** — Formally confirms G-009. Operational Leader reviews daily drawer reconciliation and approves discrepancies < Rp 20.000.

---

### OD-O4: Backend Security Rule Separation (Decoupling Cashier from Lead)
- **Question (plain words):** Do you approve updating the Firestore backend security rules so that ordinary front desk cashiers CANNOT approve tickets addressed to the Operational Leader?
- **Why it came up:** Our Phase 0 probe test proved that right now, because `firestore.rules` groups all front desk staff together under `isFrontOffice()`, a clever user at the front desk could approve their own peer's class cancellations or discrepancy tickets by bypassing the screen.
- **Already decided?:** Ratified Blueprint §15 & G-006 require strict Maker-Checker dual control.
- **Option A (Approve Fix):** Update `firestore.rules` to create a strict `isOpsLead()` check and deploy it.
- **Option B (Keep As-Is):** Keep the rules loose.
- **Suggested default and why:** **Option A.** Closes the security gap immediately and protects school integrity.
- **What the executor does in the meantime:** Documented the probe test and finding; ready to implement upon approval.
- **Answer (Kifry fills in):** **OPTION A (RATIFIED BY OWNER 2026-10-08)** — Approved to tighten `firestore.rules` with strict `isOpsLead()` to decouple cashiers from Operational Leader approvals.
