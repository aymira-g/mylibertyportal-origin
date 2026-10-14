import { describe, it, expect, vi } from "vitest";
import {
  classifyDocBranchStatus,
  computeCollectionBranchMetrics,
  runBranchHealthAudit,
  AUDIT_COLLECTIONS,
} from "./branchAuditRepository";

vi.mock("../../firebase", () => ({
  db: {},
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  query: vi.fn(),
  limit: vi.fn(),
  getDocs: vi.fn().mockResolvedValue({
    docs: [
      { id: "1", data: () => ({ branchId: "kota_gorontalo" }) },
      { id: "2", data: () => ({ branch: "Bone Bolango" }) },
      { id: "3", data: () => ({ name: "No Branch Record" }) },
    ],
  }),
}));

describe("branchAuditRepository", () => {
  it("classifies doc branch status accurately", () => {
    expect(classifyDocBranchStatus({ branchId: "kota_gorontalo" })).toBe("canonical");
    expect(classifyDocBranchStatus({ branchId: "bone_bolango" })).toBe("canonical");
    expect(classifyDocBranchStatus({ branch: "Bone Bolango" })).toBe("legacy");
    expect(classifyDocBranchStatus({ branch: "Pohuwato" })).toBe("legacy");
    expect(classifyDocBranchStatus({})).toBe("missing");
    expect(classifyDocBranchStatus(null)).toBe("missing");
  });

  it("computes collection branch metrics correctly", () => {
    const docs = [
      { branchId: "kota_gorontalo" },
      { branchId: "bone_bolango" },
      { branch: "Bone Bolango" },
      { title: "No Branch" },
    ];

    const metrics = computeCollectionBranchMetrics(docs);
    expect(metrics.total).toBe(4);
    expect(metrics.canonical).toBe(2);
    expect(metrics.legacy).toBe(1);
    expect(metrics.missing).toBe(1);
    expect(metrics.readinessPercent).toBe(50);
  });

  it("runs branch health audit across defined collections", async () => {
    const audit = await runBranchHealthAudit(50);
    expect(audit.collections.length).toBe(AUDIT_COLLECTIONS.length);
    expect(audit.totalScanned).toBeGreaterThan(0);
    expect(audit.overallReadiness).toBeDefined();
    expect(audit.timestamp).toBeDefined();
  });
});
