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
| **INV-01** | **Executive Authority & Separation from Branch Head** | `Blueprint §5–6`: Director & Vice Director hold province-wide strategic authority; not branch heads. | `docs/ARCHITECTURE.md §0.2, §2`: Dedicated `ExecutiveDashboard.jsx` handles province-wide capacity & reports. | `src/App.jsx:549-556` routes `director`/`vice_director` to `ExecutiveDashboard`. | **Level 2:** Executive workflow trace.<br>**Level 3:** Cross-branch scope audit. | **COMPLIANT** |
| **INV-02** | **Separation of System Admin from Business Authority** | `Blueprint §7`: System Admin is technical maintenance only; cannot approve business records or bypass chains. | `docs/ARCHITECTURE.md §0.2, §2`: Dedicated `AdminDashboard.jsx` restricted to technical maintenance, accounts, terminals, diagnostics. | Frontend separated in `AdminDashboard.jsx`.<br>*Backend gap:* `firestore.rules:43` bundles `isAdmin()` into `isExecutive()`. | **Level 1:** Check Admin UI lacks approval buttons.<br>**Level 2:** Backend bypass test on `/approvals`.<br>**Level 3:** Full privilege escalation audit. | **PARTIALLY RECONCILED** (Frontend Compliant, Backend Rule scheduled for remediation) |
| **INV-03** | **No Authority Collapse (`isAdmin = true`)** | `Blueprint §8`: Strictly distinguishes Role, System Access, Capability, and Workflow Authority. | `docs/ARCHITECTURE.md §0.2`: Role-specific routing and granular capability props instead of blanket `isAdmin=true`. | Replaced in `AdminDashboard` and `ExecutiveDashboard`. Legacy subcomponents still undergoing incremental cleanup. | **Level 1:** Regression check on prop passing.<br>**Level 2:** Role permission matrix pass. | **PARTIALLY RECONCILED** |
| **INV-04** | **Multi-Branch & Division Data Isolation** | `Blueprint §4, §10, §11`: 4 physical branches; Course & Kindergarten divisions; cross-branch data blocked. | `docs/ARCHITECTURE.md §0.2, §6`: Repositories and queries carry explicit `branchId` & `division` filters. | `BranchHealthAuditCard.jsx` monitors isolation. Firestore rules enforce `isSameBranch()` and `isDivisionAllowedForManager()`. | **Level 1:** Multi-branch query test.<br>**Level 2:** Cross-branch data leakage audit.<br>**Level 3:** Partition & isolation stress test. | **COMPLIANT** |
| **INV-05** | **Dual-Control Maker-Checker for Sensitive Workflows** | `Blueprint §14, §15, §16`: High-risk actions (tuition discounts, cash discrepancy, departures) require independent human review. | `docs/ARCHITECTURE.md §0.2`: `ApprovalInbox` mounted in `ExecutiveDashboard` and manager views; self-approval rejected. | `approvalsRepository.js` and `firestore.rules` enforce `requestedByUid != decidedByUid` and role matching. | **Level 1:** Self-approval regression test.<br>**Level 2:** 5-pass workflow trace on cash & discount approvals.<br>**Level 3:** Race-condition audit. | **COMPLIANT** |
| **INV-06** | **Dashboard Authority Rule** | `Blueprint §13`: Dashboards are presentation interfaces, not authority sources; backend rules must reject unauthorized calls. | `docs/ARCHITECTURE.md §0.2`: Server-side authorization in Firestore rules and Worker functions is authoritative. | All sensitive mutations protected in `firestore.rules` and Worker endpoint verification. | **Level 1:** Prop alteration test.<br>**Level 2:** Direct Firestore request spoofing.<br>**Level 3:** Malicious client audit. | **COMPLIANT** |
| **INV-07** | **Zero-Budget Free-Tier Spark Compliance** | `Blueprint §7.2, §21` & `AGENTS.md`: Application must operate strictly within Firebase Spark free tier; zero paid services. | `docs/ARCHITECTURE.md §0.1, §6`: Bounded Firestore queries, log retention, no unbounded collection listeners. | `LogRetentionCard.jsx` and `logRetentionRepository.js` automate pruning of operational logs. | **Level 1:** Read volume check.<br>**Level 2:** N+1 query inspection.<br>**Level 3:** 10 to 10k users scaling analysis. | **COMPLIANT** |
| **INV-08** | **High-Risk Financial & Student Data Privacy** | `Blueprint §9, §15`: Tuition adjustments, student records, and parent linkages require strict data protection. | `docs/ARCHITECTURE.md §2`: Dedicated `StudentParentLinkage` and authenticated `parentPortalRepository`. | Parent portal data scoped strictly to authenticated child linkage via Worker and Firestore rules. | **Level 1:** Parent portal auth test.<br>**Level 2:** Student data export & privacy audit.<br>**Level 3:** Full security surface audit. | **COMPLIANT** |
| **INV-09** | **Instructor Leader Reporting Line** | `Blueprint §5, §26`: Reporting relationship of Instructor Leader above branch level is unestablished. | `docs/ARCHITECTURE.md §0.2`: Preserves open state; does not invent higher organizational authority. | Code does not assign executive approval powers to Instructor Leader. | **Level 2:** Role boundary inspection. | **DECISION REQUIRED** (Preserved as open governance gap) |

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
