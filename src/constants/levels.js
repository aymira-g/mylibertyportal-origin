/**
 * Academic Model Constants: Levels & Tiers (Single Source of Truth)
 *
 * CORE PRINCIPLE:
 * Level is the stored academic fact. Tier is a derived label.
 * Never store both as independently editable fields in Firestore.
 */

export const LEVELS = {
  warrior: {
    id: "warrior",
    label: "Warrior",
    tier: "beginner",
    stars: 1,
    order: 1,
  },
  elite: {
    id: "elite",
    label: "Elite",
    tier: "beginner",
    stars: 1,
    order: 2,
  },
  master: {
    id: "master",
    label: "Master",
    tier: "intermediate",
    stars: 2,
    order: 3,
  },
  grandmaster: {
    id: "grandmaster",
    label: "Grandmaster",
    tier: "intermediate",
    stars: 2,
    order: 4,
  },
  epic: {
    id: "epic",
    label: "Epic",
    tier: "fluent",
    stars: 3,
    order: 5,
  },
};

export const LEVEL_KEYS = Object.keys(LEVELS);
export const LEVEL_LIST = Object.values(LEVELS);

/**
 * Explicit "not yet assessed" sentinel for `currentLevel`.
 *
 * Deliberately NOT a member of LEVELS / LEVEL_LIST, so ladder helpers
 * (`getNextLevel`) return null for it by construction rather than by special case.
 *
 * Why an explicit sentinel instead of a missing field (OD-FO-3 / Phase 3, F-11):
 * level is an academic fact owned by instructors and recorded assessments. Previously
 * every student was seeded with a fabricated default ("warrior" / "nursery"), which is
 * indistinguishable from a genuine beginner placement. "unassessed" states the truth.
 *
 * HAZARD: this is a TRUTHY string, so it defeats every `currentLevel || "warrior"`
 * fallback in the codebase. Always read levels through `hasAssessedLevel()`.
 */
export const UNASSESSED = "unassessed";

/**
 * True only when `level` represents a real assessment outcome.
 *
 * The single predicate every level read should route through. See UNASSESSED.
 */
export function hasAssessedLevel(level) {
  return Boolean(level) && level !== UNASSESSED;
}

/**
 * Resolve a stored level to a valid LEVELS key, or null when unassessed/unknown.
 *
 * Use this wherever a caller previously wrote `currentLevel || "warrior"` — that
 * fallback silently relabels an unassessed student as a beginner.
 */
export function resolveLevel(level) {
  return hasAssessedLevel(level) && LEVELS[level] ? level : null;
}

export const TIERS = {
  beginner: {
    id: "beginner",
    label: "Beginner",
    stars: 1,
    starText: "⭐",
    levels: ["warrior", "elite"],
    tone: "blue",
  },
  intermediate: {
    id: "intermediate",
    label: "Intermediate",
    stars: 2,
    starText: "⭐⭐",
    levels: ["master", "grandmaster"],
    tone: "purple",
  },
  fluent: {
    id: "fluent",
    label: "Fluent",
    stars: 3,
    starText: "⭐⭐⭐",
    levels: ["epic"],
    tone: "rose",
  },
};

export const TIER_KEYS = Object.keys(TIERS);
export const TIER_LIST = Object.values(TIERS);

import {
  getBatchProgram,
  getProgramLevel,
  getProgramLevels,
  normalizeProgram,
} from "./programs.js";

export function getTier(level) {
  if (!hasAssessedLevel(level)) return null;
  return LEVELS[level]?.tier || null;
}

export function getStars(level) {
  if (!hasAssessedLevel(level)) return null;
  return LEVELS[level]?.stars || null;
}

export function getStarText(level) {
  const stars = getStars(level);
  if (!stars) return "";
  return "⭐".repeat(stars);
}

export function getNextLevel(level) {
  if (!hasAssessedLevel(level)) return null;
  const current = LEVELS[level];
  if (!current) return null;
  const next = LEVEL_LIST.find((lvl) => lvl.order === current.order + 1);
  return next ? next.id : null;
}

/**
 * Placement score -> recommended level. **Single source of truth.**
 *
 * Used by the walk-in placement test modal and by the placement override gate.
 * `firestore.rules` mirrors this mapping inline as `scoreImpliedLevel()` so that an
 * ordinary assessment can only set a level the recorded score itself justifies — an
 * override needs an approved PLACEMENT_LEVEL_OVERRIDE envelope. Changing the
 * thresholds here without changing the rules breaks
 * `placementLevelGate.test.js`, which reads both.
 *
 * Returns `null` when there is no recommendation to override:
 * - kindergarten placement is tier/age based and carries no score rubric;
 * - no score recorded (a level chosen without a score is a placement decision,
 *   not an assessment result, and is treated as an override by the gate).
 */
export const PLACEMENT_SCORE_THRESHOLDS = Object.freeze({ epic: 85, master: 65 });

export function recommendLevelFromScore(score, { isKindergarten = false } = {}) {
  if (isKindergarten) return null;
  if (score === "" || score == null) return null;
  const num = Number(score);
  if (Number.isNaN(num)) return null;
  if (num >= PLACEMENT_SCORE_THRESHOLDS.epic) return "epic";
  if (num >= PLACEMENT_SCORE_THRESHOLDS.master) return "master";
  return "warrior";
}

/**
 * Option B Compatibility Rule:
 * If batch specifies minLevel / maxLevel, compares studentOrder within that range.
 * If batch only specifies classLevel, falls back to exact match.
 *
 * Program Rule 3:
 * If studentProgram is provided, student and batch must belong to the same program.
 */
export function isCompatible(studentLevel, batch, studentProgram = null) {
  if (!batch || Object.keys(batch).length === 0) return true;
  if (!hasAssessedLevel(studentLevel)) return false;

  const batchProg = getBatchProgram(batch);

  if (studentProgram) {
    const normStudentProg = normalizeProgram(studentProgram);
    if (batchProg !== normStudentProg) {
      return false;
    }
  }

  const studentLvlObj = getProgramLevel(batchProg, studentLevel) || LEVELS[studentLevel];
  if (!studentLvlObj) return false;

  const studentOrder = studentLvlObj.order;

  if (batch.minLevel || batch.maxLevel) {
    const progLevels = getProgramLevels(batchProg);
    const minLvlObj = batch.minLevel
      ? getProgramLevel(batchProg, batch.minLevel) || LEVELS[batch.minLevel]
      : null;
    const maxLvlObj = batch.maxLevel
      ? getProgramLevel(batchProg, batch.maxLevel) || LEVELS[batch.maxLevel]
      : null;

    const minOrder = minLvlObj ? minLvlObj.order : 1;
    const maxOrder = maxLvlObj ? maxLvlObj.order : progLevels.length || 5;

    return studentOrder >= minOrder && studentOrder <= maxOrder;
  }

  if (batch.classLevel) {
    return String(batch.classLevel).toLowerCase() === String(studentLevel).toLowerCase();
  }

  return true;
}
