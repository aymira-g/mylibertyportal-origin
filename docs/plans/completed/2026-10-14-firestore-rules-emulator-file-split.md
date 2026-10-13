# Firestore Rules Emulator File Split — Modularizing the 3,993-Line Monolith

## 1. Goal & Context
`src/features/shared/firestoreRules.emulator.test.js` had grown to **3,993 lines** (150 KB, 139 tests), severely exceeding the ~1,000-line threshold cautioned by `AGENTS.md` by almost 4x.
It contained all real Firebase Emulator integration tests across all 13 application domains in a single massive file.

## 2. Scope & Changes
Created the directory `src/features/shared/firestoreRulesEmulator/` following the same modular architecture as `securityRulesMatrix/`:
- `setup.js`:
  - Contains all shared static fixtures (`USERS`, `FRONT_OFFICE_PROFILE`, `PAYMENT_KOTA`, `APPROVAL_KOTA`, `APPROVAL_BOBA`, `SHIFT_KOTA`, `APPROVED_CORRECTION`).
  - Contains `setupEmulatorHarness(suiteId)`: dynamic test harness initialiser isolating each suite into its own project ID (`myliberty-rules-${suiteId}`).
- Split into 7 domain-specific emulator test files (all under ~1,300 lines; most under 700 lines):
  1. `usersAndProfiles.emulator.test.js` (613 lines, 31 tests): Kindergarten FO queries, user profile visibility, student intake/updates, new staff account gate.
  2. `finance.emulator.test.js` (204 lines, 16 tests): Payments owner scoping, batch payments.
  3. `attendanceAndShifts.emulator.test.js` (275 lines, 14 tests): Shifts kiosk flow, approved shift self-correction gate, shift audit events.
  4. `classesAndAcademic.emulator.test.js` (670 lines, 37 tests): Class attendance, retroactive class attendance gate, Instructor Leader academic monitoring, placement level override gate.
  5. `approvalsAndGates.emulator.test.js` (365 lines, 16 tests): Approval decision contract, gate binding hardening, fallback deny-all.
  6. `integrationAudit.emulator.test.js` (714 lines, 9 tests): Phase 2 integration audit verification & remediation (cross-feature and branch isolation).
  7. `securityHardening.emulator.test.js` (1,331 lines, 16 tests): Phase 1 security hardening, directives integrity, Staff Leave, ADR 2026-10-13 Class Scheduling Option B, Domain 9 Maker-Checker workflows.
- Removed the monolithic file `src/features/shared/firestoreRules.emulator.test.js`.
- Updated `package.json` `"test:rules"` to execute `vitest run src/features/shared/firestoreRulesEmulator`.
- Updated reference in `src/features/shared/securityRulesMatrix/securityRulesMatrix.helpers.js`.

## 3. Cost & Risk Check
- **Cost:** Free tier only, zero new dependencies, zero infrastructure changes.
- **Risk:** Zero behavioral or governance risk. Pure test code reorganization with 100% test count and assertion parity (139 / 139 tests).
- **Concurrency Benefit:** Each domain suite operates on its own isolated Firestore emulator project ID (`myliberty-rules-${suiteId}`), enabling concurrent execution and cutting total emulator suite run duration from **24.20s down to 15.07s (37% faster)**.

## 4. Verification Plan & Results (2026-10-14)
- **Targeted Rules Emulator (`npm run test:rules`):** **7 test files, 139 passed, 0 failed** in 15.07s.
- **Full Test Suite (`npm test`):** **104 test files passed, 7 skipped (111 total), 1,381 tests passed, 0 failed** in 12.23s.
- **Linter (`npm run lint`):** Passed with 0 errors, 0 warnings.
- **Typecheck (`npm run typecheck`):** Passed with 0 errors.
- **Production Build (`npm run build`):** Clean build (5.01s).
- **Status:** COMPLETED & FULLY VERIFIED.
