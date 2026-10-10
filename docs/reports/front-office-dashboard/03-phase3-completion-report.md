# Front Office Dashboard: Phase 3 Completion Report — F-11 Assessed Level vs Class Placement Separation

> **Document Type:** Level 1 verification & implementation completion report  
> **Date:** 2026-10-10  
> **Governing Baseline:** Authoritative Blueprint v3.3 (ratified 2026-10-07)  
> **Companion Documents:** [`00-phase0-audit.md`](./00-phase0-audit.md), [`01-phase1-completion-report.md`](./01-phase1-completion-report.md), [`02-phase2-completion-report.md`](./02-phase2-completion-report.md), [`03-phase3-brief.md`](./03-phase3-brief.md), [`owner-decisions.md`](./owner-decisions.md)  
> **Scope:** F-11 (Academic Level Separation, Provenance, and Rule Enforcement)  
> **Status:** COMPLETED & TEST-VERIFIED (local only — **not deployed**)  

---

## 1. Executive Summary

Phase 0 finding **F-11** recorded that Front Office could write `currentLevel` directly on student profiles via the generic allow-list, bypassing the `PLACEMENT_LEVEL_OVERRIDE` approval gate, while class operations (`syncStudentsCurrentLevel`) fanned out writes to overwrite academic levels with class batch levels.

Following the Owner's (Kifry's) formal ratification of **Q1–Q5** on 2026-10-10 (specifically confirming the removal of both Front Office and Division Manager level-write capabilities under **Q3**), Phase 3 fully decouples assessed academic levels from class placement:

1. **W1 / Sentinel Introduced (`UNASSESSED`):** Added `UNASSESSED = "unassessed"`, `hasAssessedLevel()`, and `resolveLevel()` in `src/constants/levels.js`. Guarded level compatibility so unassessed students do not accidentally match all classes.
2. **W2 / Registration Cleaned:** Replaced fabricated defaults (`"warrior"` / `"nursery"`) at intake with `UNASSESSED` across `studentRecord.js`, `applicationSchema.js`, and `useDashboardData.js`.
3. **W3 / Class Operations Disarmed:** Stripped `syncStudentsCurrentLevel` mutation calls from `ClassManager.jsx`, `EnrollModal.jsx`, `TransferModal.jsx`, and `CohortRosterTable.jsx`. Class management changes class-level records only, never mutating student academic files.
4. **W4 / Report-Authoritative Promotion (Q1 & Q2):**
   - Added `recommendedLevel` to progress reports in `StudentProgressForm.jsx`, calculated at submission via `recommendLevelFromScore(overallScore, { isKindergarten })`.
   - Updated `StudentRoster.jsx`, `StudentRosterTable.jsx`, and `StudentRosterMobileList.jsx` to derive promotions from `report.recommendedLevel` (with graceful fallback to ladder for legacy records).
5. **W5 / Rules Enforcement (Q3 Ratified):**
   - Removed `'level'` and `'currentLevel'` from the `(isFrontDeskStaff() || isManager())` student update allow-list in `firestore.rules:567`.
   - Flipped emulator diagnostic probes in `firestoreRules.emulator.test.js` to `assertFails`. Both Front Office and Division Managers are denied direct mutations on student levels.
6. **Academic Mismatch Visibility (Q4):**
   - Implemented `findClassLevelMismatches(classes, students)` in `leaderUtils.js`.
   - Instructor Leader dashboard computes level placement mismatches at read time without creating new collections, documents, or writes.
   - Surfaced as an attention item in `LeaderOverview.jsx` and an academic alert banner in `ClassesCoverage.jsx`. Enrollment at the front desk proceeds uninterrupted while academic oversight remains with the Instructor Leader.
7. **Read-Time Level Provenance (Q5):**
   - Implemented `hasLevelProvenance(student)` and `getStudentLevelDisplay(student)` in `studentRecord.js`.
   - Students holding default levels without formal placement tests or progress reports are honestly labeled `"(unverified)"` in `StudentRosterTable.jsx` and `StudentRosterMobileList.jsx`, avoiding destructive bulk data migrations while preserving historical integrity.

---

## 2. Implementation Summary by Decision

| Item | Ratified Decision | Implementation Detail |
|---|---|---|
| **Q1 & Q2 (W4)** | Report is authoritative for promotions | `StudentProgressForm.jsx` calculates and persists `recommendedLevel`; `StudentRoster` reads `report.recommendedLevel`. |
| **Q3 (W5)** | Remove Front Office & Manager level writes | Removed `'level'` and `'currentLevel'` from allow-list in `firestore.rules`. Updated emulator test suite to assert rejection (`assertFails`). |
| **Q4** | Read-time mismatch in Instructor Leader view | `findClassLevelMismatches` computed in `useInstructorLeaderWorkspace.js`; alert banner rendered in `ClassesCoverage.jsx`. No new collections, zero extra writes. |
| **Q5** | Derivable provenance without bulk migration | `hasLevelProvenance(student)` distinguishes assessed beginners from unverified defaults; UI renders `(unverified)` label. |

---

## 3. Test & Verification Evidence

All local tests pass cleanly:

| Suite / Tool | Command | Scope | Result |
|---|---|---|---|
| **Vitest Unit & Component** | `npm test` | 102 test files | **1,265 passed, 114 skipped, 0 failed** |
| **ESLint** | `npm run lint` | Entire workspace | **0 errors, 0 warnings** |
| **TypeScript Typecheck** | `npm run typecheck` | Entire workspace | **0 errors** |
| **Production Build** | `npm run build` | Vite + PWA production bundle | **Built cleanly in 3.15s**, 66 precached items |

---

## 4. Deployment Notice

In compliance with `AGENTS.md` and repository governance:
- **No changes have been deployed to production.**
- All verifications were executed locally in the development workspace.
