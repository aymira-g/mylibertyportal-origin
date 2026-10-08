import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fake } from "../../test/firestoreFake.js";
import {
  PLACEMENT_SCORE_THRESHOLDS,
  recommendLevelFromScore,
} from "../../constants/levels.js";
import {
  addPlacementTestToInquiry,
  applyApprovedPlacementOverride,
  clearPendingPlacementOverride,
} from "../dashboard/frontoffice/deskInquiriesRepository.js";

vi.mock(
  "firebase/firestore",
  async () => (await import("../../test/firestoreFake.js")).firestoreModule
);
vi.mock("../../firebase", () => ({
  db: {},
  auth: { currentUser: { uid: "foGto", displayName: "FO Budi" } },
}));

const RULES_PATH = join(dirname(fileURLToPath(import.meta.url)), "../../../firestore.rules");

beforeEach(() => fake.reset());

const COURSE_INQUIRY = {
  id: "inq1",
  studentName: "Andi",
  branchId: "kota_gorontalo",
  division: "courses",
  currentLevel: "",
  placementTests: [],
};

const KINDER_INQUIRY = {
  ...COURSE_INQUIRY,
  id: "inqK",
  division: "kindergarten",
  currentLevel: "",
};

const seedInquiry = (doc) => fake.seed("deskInquiries", [doc]);

describe("recommendLevelFromScore (single source of truth for the placement rubric)", () => {
  it("maps scores to levels at the recorded thresholds", () => {
    expect(recommendLevelFromScore(85)).toBe("epic");
    expect(recommendLevelFromScore(100)).toBe("epic");
    expect(recommendLevelFromScore(84)).toBe("master");
    expect(recommendLevelFromScore(65)).toBe("master");
    expect(recommendLevelFromScore(64)).toBe("warrior");
    expect(recommendLevelFromScore(0)).toBe("warrior");
  });

  it("returns no recommendation when there is nothing to recommend from", () => {
    expect(recommendLevelFromScore("")).toBeNull();
    expect(recommendLevelFromScore(null)).toBeNull();
    expect(recommendLevelFromScore("not-a-score")).toBeNull();
  });

  it("never recommends for kindergarten, which is tier/age based", () => {
    expect(recommendLevelFromScore(90, { isKindergarten: true })).toBeNull();
  });

  it("stays in sync with the scoreImpliedLevel() mirror in firestore.rules", () => {
    const rules = readFileSync(RULES_PATH, "utf8");
    const match = rules.match(/function scoreImpliedLevel\(score\)\s*\{([\s\S]*?)\n\s*\}/);
    expect(match, "scoreImpliedLevel() is missing from firestore.rules").toBeTruthy();

    const body = match[1];
    // Any threshold change in constants/levels.js must be mirrored in the rules,
    // otherwise an ordinary assessment could be refused (or an override allowed).
    expect(body).toContain(`score >= ${PLACEMENT_SCORE_THRESHOLDS.epic} ? 'epic'`);
    expect(body).toContain(`score >= ${PLACEMENT_SCORE_THRESHOLDS.master} ? 'master'`);
    expect(body).toContain("'warrior'");
  });
});

describe("addPlacementTestToInquiry — ordinary assessment (ungated)", () => {
  it("sets currentLevel together with the score that justifies it", async () => {
    seedInquiry(COURSE_INQUIRY);

    const res = await addPlacementTestToInquiry("inq1", {
      score: 90,
      assessedLevel: "epic",
      testedBy: "FO Budi",
      testedAt: "2026-10-08",
    });

    const op = fake.find("deskInquiries/inq1");
    expect(op.data.currentLevel).toBe("epic");
    expect(op.data.latestPlacementScore).toBe(90);
    expect(op.data.placementTests).toHaveLength(1);
    expect(res.currentLevel).toBe("epic");
  });

  it("trusts the stored division, not the caller, so kindergarten stays ordinary", async () => {
    seedInquiry(KINDER_INQUIRY);

    await addPlacementTestToInquiry("inqK", {
      score: 90,
      assessedLevel: "tk_a",
      testedBy: "FO Budi",
    });

    // 90 would imply "epic" for a course; for kindergarten there is no rubric, so this
    // is an ordinary placement and must not be parked as an override.
    const op = fake.find("deskInquiries/inqK");
    expect(op.data.currentLevel).toBe("tk_a");
    expect(op.data.pendingPlacementOverride).toBeUndefined();
  });
});

describe("addPlacementTestToInquiry — placement level override (gated)", () => {
  it("refuses to record an override without a ticket", async () => {
    seedInquiry(COURSE_INQUIRY);

    await expect(
      addPlacementTestToInquiry("inq1", { score: 50, assessedLevel: "epic" })
    ).rejects.toThrow(/needs an approved Instructor Leader ticket/);

    expect(fake.find("deskInquiries/inq1")).toBeUndefined();
  });

  it("treats a level chosen without a score as an override, not an assessment", async () => {
    seedInquiry(COURSE_INQUIRY);

    await expect(
      addPlacementTestToInquiry("inq1", { score: "", assessedLevel: "master" })
    ).rejects.toThrow(/needs an approved Instructor Leader ticket/);
  });

  it("parks the override when a ticket exists, without touching the level", async () => {
    seedInquiry(COURSE_INQUIRY);

    await addPlacementTestToInquiry("inq1", {
      score: 50,
      assessedLevel: "epic",
      approvalId: "ap1",
      notes: "Parent requested a higher level",
      testedBy: "FO Budi",
    });

    const op = fake.find("deskInquiries/inq1");
    expect(op.data.pendingPlacementOverride).toMatchObject({
      approvalId: "ap1",
      assessedLevel: "epic",
      recommendedLevel: "warrior",
      score: 50,
    });
    // The whole point: the level must NOT be applied, and no assessment entry may
    // appear as if it had been.
    expect("currentLevel" in op.data).toBe(false);
    expect("placementTests" in op.data).toBe(false);
  });
});

describe("applyApprovedPlacementOverride", () => {
  it("is the only path that applies an override, and marks it as applied", async () => {
    seedInquiry({ ...COURSE_INQUIRY, pendingPlacementOverride: { approvalId: "ap1" } });

    const res = await applyApprovedPlacementOverride({
      approval: {
        id: "ap1",
        payload: { inquiryId: "inq1", assessedLevel: "epic", score: 50, testedBy: "FO Budi" },
      },
      actorUid: "ilGto",
    });

    const op = fake.find("deskInquiries/inq1");
    expect(op.data.currentLevel).toBe("epic");
    expect(op.data.appliedFromApproval).toBe("ap1");
    expect(op.data.pendingPlacementOverride).toBeNull();
    expect(op.data.placementTests[0]).toMatchObject({
      assessedLevel: "epic",
      approvedOverrideRef: "ap1",
    });
    expect(res.currentLevel).toBe("epic");
  });

  it("refuses an approval that does not name an inquiry and level", async () => {
    seedInquiry(COURSE_INQUIRY);
    await expect(
      applyApprovedPlacementOverride({ approval: { id: "ap1", payload: {} } })
    ).rejects.toThrow(/does not identify an inquiry and level/);
  });

  it("fails loudly when the inquiry no longer exists", async () => {
    await expect(
      applyApprovedPlacementOverride({
        approval: { id: "ap1", payload: { inquiryId: "missing", assessedLevel: "epic" } },
      })
    ).rejects.toThrow(/no longer exists/);
  });
});

describe("clearPendingPlacementOverride", () => {
  it("releases an inquiry whose override was rejected", async () => {
    seedInquiry({ ...COURSE_INQUIRY, pendingPlacementOverride: { approvalId: "ap1" } });

    await clearPendingPlacementOverride("inq1", "ilGto");

    expect(fake.find("deskInquiries/inq1").data.pendingPlacementOverride).toBeNull();
  });
});
