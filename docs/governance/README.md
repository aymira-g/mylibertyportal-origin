# Authoritative Governance

> **Authority Level:** Authoritative Baseline (`docs/governance/`)  
> Documents in this directory define the canonical organizational and governance truth for **MyLiberty Portal**.

---

## 1. Overview

This directory houses the foundational governance documentation that governs the real-world organization, authority boundaries, role identities, and durable operational principles.

It sits at the top of the repository's subject-specific authority structure:

```text
AUTHORITATIVE GOVERNANCE BLUEPRINT (docs/governance/)
            ↓
     defines WHAT is true
            ↓
TECHNICAL ARCHITECTURE / SPECS (docs/ARCHITECTURE.md, docs/specs/)
            ↓
     defines HOW it is implemented
            ↓
ACCEPTED DECISIONS (docs/decisions/)
            ↓
     defines BINDING POLICIES & PROCEDURES
            ↓
PLANS / IMPLEMENTATION WORK (docs/plans/)
            ↓
     defines WHAT is being changed now
            ↓
AUDITS (docs/audits/)
            ↓
     identify gaps between approved model and implementation
```

---

## 2. Canonical Document

| Document | Status | Description |
|---|---|---|
| [`MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md`](./MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md) | Proposed Authoritative Baseline for Owner Approval | Version 3.0: Definitive organizational identity, hierarchy, roles, system-admin separation, data scope, Maker-Checker signer governance, and rebuild/re-foundation doctrine. |

---

## 3. What Authoritative Governance Governs

The blueprint is authoritative for:
- Organizational structure (4 physical branches, 2 divisions: Course Division & Kindergarten Division);
- Established organizational roles and reporting lines;
- Durable authority boundaries;
- **Separation of organizational authority from technical system administration** (System Admin is technical access, not an organizational role);
- Access-governance and data-scope principles;
- Workflow governance and dual-control / separation-of-duties principles;
- Constraints placed on human and AI implementation agents;
- Safe rebuild / re-foundation doctrine.

### What it does NOT govern
- Framework-specific implementation (React, Vite, Node);
- Database collections, field names, or schema types;
- Source-code paths or folder layouts;
- UI component structure or exact dashboard design;
- Exact Firestore rules syntax;
- Deployment or test scripts.

Those are governed by [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md), [`docs/specs/`](../specs/README.md), and subsequent technical decisions.

---

## 4. Key Rules for Agents & Developers

1. **Consult Before Deciding:** Before making decisions involving organizational authority, roles, responsibilities, governance, approval boundaries, or separation of duties, consult [`MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md`](./MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md).
2. **Flag Conflicts, Do Not Invent Reconciliations:** If implementation requirements conflict with the blueprint, do not invent a reconciliation. Flag the conflict and require an approved governance decision or amendment.
3. **No Inferred Authority:** Agents must not infer organizational authority merely because a UI exposes a button, existing code permits an action, a technical Admin role has access, a previous implementation decision says so, or a role sounds senior.
4. **Current Implementation is a Reconciliation Target:** The existing application is the starting implementation to be reconciled through controlled, evidence-based change — not the authority that defines the desired organizational model.
5. **Preserve Explicit Governance Gaps:** Where the blueprint records an unresolved decision (Section 26), preserve that open state. An undefined rule is a governance gap, not permission to invent a rule.
