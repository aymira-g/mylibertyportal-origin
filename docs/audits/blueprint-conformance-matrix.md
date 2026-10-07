# MyLiberty Portal — Blueprint Conformance Matrix & Verification Baseline

> **Authority Level:** Cross-Cutting Verification Baseline (`docs/audits/`)  
> **Canonical Blueprint:** [`docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md`](../governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md)  
> **Technical Architecture:** [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md)  
> **Working Instructions:** [`AGENTS.md`](../../AGENTS.md)  
>
> **Core Principle:**  
> This matrix is a **verification instrument**, not a source of governance authority. It maps approved Blueprint invariants across technical architecture, concrete code/rule implementation, and verification levels to track compliance, detect drift, and guide systematic refinement.

---

## 1. Conformance Status Scale

| Status | Definition |
|---|---|
| **COMPLIANT** | Architecture, implementation, backend rules, and automated tests fully realize the Blueprint invariant. |
| **PARTIALLY RECONCILED** | Frontend UI or architecture is reconciled, but backend rules, queries, or legacy code paths require follow-up. |
| **DIVERGENT** | Current implementation directly conflicts with the Authoritative Blueprint; requires scheduled remediation. |
| **DECISION REQUIRED** | The Blueprint intentionally records an open organizational question (§26 Owner Decision Register); implementation must not guess the answer. |

---

## 2. Invariant Conformance Matrix

| # | Blueprint Invariant | Canonical Governance Reference | Technical Architecture Conformance | Implementation (Code / Rules) | Verification Level & Playbook | Current Status |
|---|---|---|---|---|---|---|
| **INV-01** | **Executive Dual-Control & Absence of Branch Head** | `Blueprint v3.3 §0, §5.4, §6, Principle 15`: Director holds Strategic Control and Vice Director holds Operational Control across branches; no branch head exists; complementary domains do not collapse into universal joint approvals. | `docs/ARCHITECTURE.md §0.2, §2`: Dedicated `DirectorDashboard.jsx` (strategic planning) and `ExecutiveDashboard.jsx` (operational oversight & health). | `src/App.jsx:549-556` routes `director` and `vice_director` to dedicated executive dashboards with partitioned domain panels. | **Level 2:** Executive workflow trace.<br>**Level 3:** Cross-branch scope audit. | **COMPLIANT** |
| **INV-02** | **Separation of System Admin from Business Authority** | `Blueprint §7`: System Admin is technical maintenance only; cannot approve business records or bypass chains. | `docs/ARCHITECTURE.md §0.2, §2`: Dedicated `AdminDashboard.jsx` restricted to technical maintenance, accounts, terminals, diagnostics. | Frontend separated in `AdminDashboard.jsx`. Backend rules sealed in `firestore.rules` (removed `isAdmin()` from approvals bypass). | **Level 1:** Check Admin UI lacks approval buttons.<br>**Level 2:** Backend bypass test on `/approvals`.<br>**Level 3:** Full privilege escalation audit. | **COMPLIANT** |
| **INV-03** | **No Authority Collapse (`isAdmin = true`)** | `Blueprint §8`: Strictly distinguishes Role, System Access, Capability, and Workflow Authority. | `docs/ARCHITECTURE.md §0.2`: Role-specific routing and granular capability props instead of blanket `isAdmin=true`. | Replaced in `AdminDashboard` and `ExecutiveDashboard`. Legacy subcomponents still undergoing incremental cleanup. | **Level 1:** Regression check on prop passing.<br>**Level 2:** Role permission matrix pass. | **PARTIALLY RECONCILED** |
| **INV-04** | **Multi-Branch & Division Data Isolation** | `Blueprint §4, §5.1, §10, §11`: 4 physical branches as data-scope boundaries; distinct branch-scope leadership functions; cross-branch data blocked. | `docs/ARCHITECTURE.md §0.2, §6`: Repositories and queries carry explicit `branchId` & `division` filters. | `BranchHealthAuditCard.jsx` monitors isolation. Firestore rules enforce `isSameBranch()` and `isDivisionAllowedForManager()`. | **Level 1:** Multi-branch query test.<br>**Level 2:** Cross-branch data leakage audit.<br>**Level 3:** Partition & isolation stress test. | **COMPLIANT** |
| **INV-05** | **Dual-Control Maker-Checker for Sensitive Workflows** | `Blueprint §14, §15, §16, §26`: High-risk actions require independent human review. Discounts strictly executive (`G-009-DECISION-01`); cash discrepancy governed by ratified tiered model (`G-009`). | `docs/ARCHITECTURE.md §0.2`: `ApprovalInbox` mounted in `ExecutiveDashboard` and division views; self-approval rejected. | `approvalsRepository.js` and `firestore.rules` enforce `requestedByUid != decidedByUid` and role matching. | **Level 1:** Self-approval regression test.<br>**Level 2:** 5-pass workflow trace on cash & discount approvals.<br>**Level 3:** Race-condition audit. | **COMPLIANT** |
| **INV-06** | **Dashboard Authority Rule** | `Blueprint §13`: Dashboards are presentation interfaces, not authority sources; backend rules must reject unauthorized calls. | `docs/ARCHITECTURE.md §0.2`: Server-side authorization in Firestore rules and Worker functions is authoritative. | All sensitive mutations protected in `firestore.rules` and Worker endpoint verification. | **Level 1:** Prop alteration test.<br>**Level 2:** Direct Firestore request spoofing.<br>**Level 3:** Malicious client audit. | **COMPLIANT** |
| **INV-07** | **Zero-Budget Free-Tier Spark Compliance** | `Blueprint §7.2, §21` & `AGENTS.md`: Application must operate strictly within Firebase Spark free tier; zero paid services. | `docs/ARCHITECTURE.md §0.1, §6`: Bounded Firestore queries, log retention, no unbounded collection listeners. | `LogRetentionCard.jsx` and `logRetentionRepository.js` automate pruning of operational logs. | **Level 1:** Read volume check.<br>**Level 2:** N+1 query inspection.<br>**Level 3:** 10 to 10k users scaling analysis. | **COMPLIANT** |
| **INV-08** | **High-Risk Financial & Student Data Privacy** | `Blueprint §9, §15`: Tuition adjustments, student records, and parent linkages require strict data protection. | `docs/ARCHITECTURE.md §2`: Dedicated `StudentParentLinkage` and authenticated `parentPortalRepository`. | Parent portal data scoped strictly to authenticated child linkage via Worker and Firestore rules. | **Level 1:** Parent portal auth test.<br>**Level 2:** Student data export & privacy audit.<br>**Level 3:** Full security surface audit. | **COMPLIANT** |
| **INV-09** | **Instructor Leader Reporting Line** | `Blueprint §5, §26 (G-003)`: Upward reporting of Instructor Leader ratified (operational to Vice Director; academic curriculum to Director). | `docs/ARCHITECTURE.md §0.2`: Aligns with Executive Dual-Control; no executive approval powers assigned to Instructor Leader. | Instructor Leader strictly scoped to academic domain and pedagogy gates (`PLACEMENT_LEVEL_OVERRIDE`, `SUBSTITUTE_INSTRUCTOR`). | **Level 2:** Role boundary inspection. | **COMPLIANT** |
| **INV-10** | **No Implicit Branch-Wide Manager** | `Blueprint §5.1, §5.5`: Physical branch is an organizational/data scope, not a managerial authority role; no catch-all branch manager exists. | `docs/ARCHITECTURE.md §0.2, §2`: Technical `manager` is interpreted as Division Manager bound by `branchId` and `division`. | Code interprets `role: manager` with `division`; UI views being reconciled incrementally during dashboard refinement. | **Level 1:** Check manager role is division-scoped.<br>**Level 2:** Multi-branch manager permission trace. | **COMPLIANT** (Governance established; UI refinement in progress) |
| **INV-11** | **Executive Oversight Visibility vs. Execution Authority** | `Blueprint v3.3 Principle 16, §5.4.3`: Broad cross-branch visibility for executive oversight does not grant operational write or execution authority; operations remain owned by domain roles. | `docs/ARCHITECTURE.md §0.2`: Write actions restricted on executive panels; operational mutations routed through domain repositories. | Executive dashboards provide read-only analytical/exception views; direct business writes restricted. | **Level 1:** Executive dashboard write-action check.<br>**Level 2:** Executive operational privilege trace. | **COMPLIANT** |

---

## 3. How Audit Levels Utilize This Matrix

```text
AUTHORITATIVE BLUEPRINT
         ↓
BLUEPRINT CONFORMANCE MATRIX (This Document)
         ↓
┌───────────────────────┬───────────────────────────────┬───────────────────────────────┐
│        Level 1        │            Level 2            │            Level 3            │
│   Light Regression    │    Deep Workflow & QA Audit   │  Full Architecture & Scaling  │
├───────────────────────┼───────────────────────────────┼───────────────────────────────┤
│ Targeted post-change  │ Section deep dives & role     │ Whole-system architecture &   │
│ verification to catch │ conformance; traces 5 passes  │ drift inspection; 10x-100x    │
│ immediate breakage of │ through Maker-Checker, scope, │ scale, Firestore limits, and  │
│ invariants INV-01..08 │ and organizational boundaries │ governance drift detection    │
└───────────────────────┴───────────────────────────────┴───────────────────────────────┘
```

1. **Level 1 (Targeted Regression):**  
   Whenever a PR, feature, or bugfix modifies code touching any invariant (e.g. changing an approval gate, modifying a query, or editing a dashboard), Level 1 verifies that the affected invariant was not regressed.
2. **Level 2 (Deep Functional & Workflow Conformance):**  
   During the ongoing role-by-role refinement, Level 2 systematically traces each role's dashboard and workflows against the invariants above to guarantee that the UI and backend accurately represent the real organization.
3. **Level 3 (Full Architecture & Scalability Audit):**  
   At major milestones or upon request, Level 3 inspects the whole repository against this matrix to detect architectural drift, database bloat, and unauthorized privilege expansion.
