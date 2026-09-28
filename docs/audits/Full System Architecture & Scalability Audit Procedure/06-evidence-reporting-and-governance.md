# 06 — Evidence Standards, Reporting & Governance

Covers **Section 18 (Evidence Standard)**, **Section 19 (Required Final Report)**, **Section 20 (Required Final Questions)**, and **Section 21 (Audit Output Rule)**.

---

# 18. Evidence Standard

Do not make significant findings based on aesthetic or stylistic preferences.

Every significant finding must strictly contain:

- **Evidence:** Exact file path, line numbers, and relevant code, query, or security rule snippet.
- **Impact:** What can actually go wrong in operations, security, or financial state.
- **Likelihood:** `Low` / `Medium` / `High` (with reasoning).
- **Severity:** `Low` / `Medium` / `High` / `Critical`.
- **Confidence:** `Low` / `Medium` / `High`.
- **Recommendation:** Concrete code correction, architectural adjustment, or follow-up verification test.

*If runtime, load, or production configuration is required to verify the claim:*
> **UNVERIFIED — requires runtime/load/production verification.**  
> *(Do not present speculative assumptions as verified facts).*

---

# 19. Required Final Report

Produce the final audit report in this exact structure:

## 1. Executive Summary
- Major architectural strengths;
- Major architectural weaknesses;
- Current architectural fitness for present scale;
- Major risks for future growth.  
*(Do not reduce this to a generic "good/bad" score).*

## 2. Architecture Map
- High-level component diagram and authoritative data flow.

## 3. Architecture Drift
Categorized into:
- Documented and accurate;
- Documented but stale;
- Implemented but undocumented;
- Contradictory;
- Unverified.

## 4. Critical Findings
Only issues that could cause:
- security failure;
- data corruption or loss;
- severe reliability failure;
- major scalability/performance failure or free-tier quota exhaustion;
- architectural dead ends.

## 5. High-Priority Findings
Important issues that should be resolved before significant feature expansion or user growth.

## 6. Medium / Low Findings
Maintainability, consistency, and non-critical technical debt.

## 7. Missing Links
Broken or incomplete business and data propagation chains.

## 8. Data Model Assessment
Collection ownership, relationships, history handling, duplication, aggregation, and growth risk.

## 9. Security Assessment
Authorization boundaries, client trust boundaries, and concrete rule weaknesses.

## 10. Scalability Assessment
Structured using this table:

| Subsystem | Current Design | Growth Risk | Bottleneck | Recommended Direction |
|---|---|---|---|---|

## 11. Failure Mode Assessment
What happens when dependencies, networks, or underlying services fail.

## 12. Testing Gaps
Critical behaviors lacking meaningful automated or regression test protection.

## 13. Technical Debt
Separating cosmetic debt from debt that poses future engineering or stability risk.

## 14. Recommended Roadmap
- **Fix Now:** Must be addressed before major feature expansion.
- **Fix Before Growth:** Acceptable today; must be addressed before usage grows materially.
- **Monitor:** Track metrics or review later.
- **Do Not Change Yet:** Stable, reasonable implementations that do not justify refactoring.

---

# 20. Required Final Questions

The audit report must explicitly answer all 12 of these core architectural questions:

1. **Is there an architectural flaw that could cause data corruption or security failure?**
2. **Is there a missing link in the business/data logic?**
3. **What becomes the first bottleneck under heavy traffic?**
4. **What becomes the first bottleneck as the database grows?**
5. **Which current decisions are safe now but risky at 10× scale?**
6. **What must be fixed before adding more features?**
7. **What can safely remain technical debt?**
8. **What should be load-tested rather than guessed?**
9. **What assumptions could not be verified from the repository?**
10. **Does `docs/ARCHITECTURE.md` still describe reality?**
11. **What architecture changes should be documented after this audit?**
12. **What is the smallest practical roadmap toward stronger production readiness and scalability?**

---

# 21. Audit Output Rule

**Do not modify production code until the audit report is complete and reviewed.**

After the report is approved, implementation must proceed as a separate controlled task:

```text
Audit Report (§ 19)
  ↓
Findings & Evidence (§ 18)
  ↓
Prioritization & Review with Kifry
  ↓
Implementation Plan
  ↓
Controlled Incremental Changes
  ↓
Automated & Runtime Verification
  ↓
Update docs/ARCHITECTURE.md
```

*This separation prevents the audit from becoming biased toward whatever quick fix an agent might prefer during inspection.*
