import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GATED_ACTIONS, APPROVAL_MODES } from "./approvalGates.js";

/**
 * Drift guard: a gate's *declared* control level must match the control the code actually
 * delivers.
 *
 * Origin: audit-ledger finding **H5** — *"'Blocking' approval gates never block"* — and the
 * Phase 3 acceptance criterion *"a registry test fails if a future gate is added as
 * `blocking` without enforcement"*.
 *
 * This is the single place that ties `mode` to real enforcement. Adding a gate to the
 * registry, or declaring one `blocking`, without classifying it here fails the suite. The
 * enforcement claims are checked against the real `firestore.rules` text, so deleting a
 * clause — or leaving one that nothing calls — cannot leave a stale claim standing.
 *
 * Why the classification cannot live in the registry itself: `gateAllowsApprover()` lists
 * every gated actionId for *addressing* ("who may decide this ticket"), whether or not any
 * write rule consumes the result. Addressing is not enforcement, and conflating the two is
 * exactly how five gates came to advertise a block they never delivered.
 *
 * `approvalGates.test.js` still pins each gate's ratified `mode`; that remains the place a
 * *ratified* mode change is recorded. This file asserts the consequence: a `blocking` gate
 * must be enforced, or be a decision someone wrote down on purpose.
 */

const RULES_PATH = join(dirname(fileURLToPath(import.meta.url)), "../../../firestore.rules");
const RULES_TEXT = readFileSync(RULES_PATH, "utf8");

/**
 * Gates whose guarded write is genuinely refused without an approved envelope.
 *
 * - `entry` is the predicate a **write rule calls**. That is what makes the gate real, so
 *   the guard asserts it is called and not merely defined.
 * - `pins` are the helpers below it; exactly one must pin the gate's actionId.
 *
 * Keeping the rule-facing entry point explicit is what catches the failure mode where the
 * chain still exists, still reads approvals, and nothing calls it any more.
 */
const RULES_ENFORCED = {
  STAFF_ROLE_ELEVATION: {
    entry: "isApprovedRoleElevation",
    pins: ["isApprovedRoleElevation"],
  },
  STAFF_SHIFT_SELF_CORRECTION: {
    entry: "isApprovedShiftCorrection",
    pins: ["isApprovedShiftCorrection"],
  },
  PLACEMENT_LEVEL_OVERRIDE: {
    entry: "placementLevelAllowed",
    pins: ["isApprovedPlacementLevelOverride"],
  },
  RETROACTIVE_STUDENT_ATTENDANCE: {
    entry: "isApprovedRetroactiveAttendance",
    pins: ["isApprovedRetroactiveBackfill"],
  },
  NEW_STAFF_ACCOUNT: {
    entry: "isApprovedNewStaffAccount",
    pins: ["isApprovedNewStaffAccount"],
  },
};

/**
 * Declared `blocking`, a producer records the ticket, but **no rule consumes it**, so the
 * guarded write still goes through.
 *
 * **Empty as of 2026-10-09** — the last two members were decided under OD-IL-ENF4
 * (`CASH_DISCREPANCY` relabelled to `logged`, `NEW_STAFF_ACCOUNT` enforced). This list is
 * the ratchet: a future `blocking` gate with nothing behind it must be added here on
 * purpose, with an owner decision recorded, or the suite fails.
 */
const BLOCKING_AWAITING_DECISION = [];

/**
 * Ratified **Option C on 2026-10-08**: declared `blocking`, deliberately not wired, and
 * tracked in the register rather than silently tolerated. Their verdict is honest only
 * while they stay recorded here.
 */
const TRACKED_NOT_WIRED = [
  "STAFF_DEACTIVATION",
  "TUITION_PLAN_CHANGE",
  "STUDENT_CLASS_TRANSFER",
  "STAFF_STATUS_CHANGE",
];

/**
 * Declared `logged`: no block is claimed, so advisory behaviour is correct. Listed so that
 * relabelling one of them back to `blocking` (or wiring one without saying so) is caught.
 */
const LOGGED_ADVISORY = [
  "DISCOUNT_OR_REFUND",
  "CASH_DISCREPANCY",
  "SUBSTITUTE_INSTRUCTOR",
  "CLASS_CANCELLATION_OR_RESCHEDULE",
  "STUDENT_WITHDRAWAL_OR_FREEZE",
];

/** Every helper named in RULES_ENFORCED (entry points and pins alike). */
const ALL_CONSUMPTION_HELPERS = Object.values(RULES_ENFORCED).flatMap(({ entry, pins }) => [
  entry,
  ...pins,
]);

function helperBody(name) {
  const match = RULES_TEXT.match(new RegExp(`function ${name}\\([\\s\\S]*?\\n    \\}`));
  return match ? match[0] : null;
}

describe("approval registry vs real enforcement (H5 drift guard)", () => {
  it("classifies every registered gate exactly once", () => {
    const classified = [
      ...Object.keys(RULES_ENFORCED),
      ...BLOCKING_AWAITING_DECISION,
      ...TRACKED_NOT_WIRED,
      ...LOGGED_ADVISORY,
    ];

    // A gate in two lists would let a wrong classification hide behind the other one.
    expect(new Set(classified).size).toBe(classified.length);
    expect(classified.slice().sort()).toEqual(Object.keys(GATED_ACTIONS).sort());
  });

  it("refuses a blocking gate that is neither enforced nor a recorded decision", () => {
    const unaccountedFor = Object.entries(GATED_ACTIONS)
      .filter(([, gate]) => gate.mode === APPROVAL_MODES.BLOCKING)
      .map(([actionId]) => actionId)
      .filter((actionId) => !(actionId in RULES_ENFORCED))
      .filter((actionId) => !BLOCKING_AWAITING_DECISION.includes(actionId))
      .filter((actionId) => !TRACKED_NOT_WIRED.includes(actionId));

    // A new gate here means the registry claims a block nothing delivers. Either enforce
    // it, relabel it to `logged`, or record the decision in the owner-decision register
    // and add it to the appropriate list above.
    expect(unaccountedFor).toEqual([]);
  });

  it("proves every enforcement claim against the real rules text", () => {
    ALL_CONSUMPTION_HELPERS.forEach((helper) => {
      expect(helperBody(helper), `${helper}() is not defined in firestore.rules`).toBeTruthy();
    });

    Object.entries(RULES_ENFORCED).forEach(([actionId, { entry, pins }]) => {
      // Exactly one helper in the chain pins the gate: the one that reads the approval doc.
      const pinning = pins.filter((helper) => helperBody(helper).includes(`'${actionId}'`));
      expect(pinning, `${actionId} is not pinned by ${pins.join(", ")}`).toHaveLength(1);

      // The rule-facing predicate must actually be *called* by a rule. A chain that still
      // exists, still reads approvals, and is called by nothing enforces nothing.
      const occurrences = RULES_TEXT.split(entry).length - 1;
      expect(
        occurrences,
        `${entry}() is defined but no rule calls it, so ${actionId} is not enforced`
      ).toBeGreaterThan(1);
    });
  });

  it("fails when a gate that nothing enforces is credited to a consumption helper", () => {
    const unenforced = [
      ...BLOCKING_AWAITING_DECISION,
      ...TRACKED_NOT_WIRED,
      ...LOGGED_ADVISORY,
    ];

    unenforced.forEach((actionId) => {
      ALL_CONSUMPTION_HELPERS.forEach((helper) => {
        expect(
          helperBody(helper),
          `${helper}() mentions ${actionId}, but no rule consumes that gate`
        ).not.toContain(`'${actionId}'`);
      });
    });
  });

  it("keeps the recorded lists honest, so none can rot into a rubber stamp", () => {
    // Still blocking: if one is relabelled, this list, the register, and the UI copy all
    // need revisiting rather than quietly drifting apart.
    [...BLOCKING_AWAITING_DECISION, ...TRACKED_NOT_WIRED].forEach((actionId) => {
      expect(GATED_ACTIONS[actionId]?.mode, `${actionId} is no longer blocking`).toBe(
        APPROVAL_MODES.BLOCKING
      );
    });

    LOGGED_ADVISORY.forEach((actionId) => {
      expect(GATED_ACTIONS[actionId]?.mode, `${actionId} is no longer logged`).toBe(
        APPROVAL_MODES.LOGGED
      );
    });
  });

  it("keeps the placement and attendance gates it added genuinely enforced", () => {
    // Guards the two gates Phase 3 enforced, so a later edit cannot reduce them to a
    // label while the registry still says `blocking`.
    expect(GATED_ACTIONS.PLACEMENT_LEVEL_OVERRIDE.mode).toBe(APPROVAL_MODES.BLOCKING);
    expect(GATED_ACTIONS.RETROACTIVE_STUDENT_ATTENDANCE.mode).toBe(APPROVAL_MODES.BLOCKING);
    expect(helperBody("isApprovedPlacementLevelOverride")).toContain(
      "'instructor_leader'"
    );
    expect(helperBody("isApprovedRetroactiveBackfill")).toContain("'ops_lead'");
  });
});
