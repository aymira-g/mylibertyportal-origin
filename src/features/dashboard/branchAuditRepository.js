import { collection, getDocs, limit, query } from "firebase/firestore";
import { db } from "../../firebase";
import { BRANCH_MAP } from "../../constants/branches";

export const AUDIT_COLLECTIONS = [
  { id: "users", label: "Users (Students & Staff)" },
  { id: "payments", label: "Payments & Tuition" },
  { id: "applications", label: "Admissions Applications" },
  { id: "deskInquiries", label: "Desk Inquiries / Leads" },
  { id: "shifts", label: "Staff Shifts" },
  { id: "classes", label: "Academic Classes" },
  { id: "approvals", label: "Maker-Checker Approvals" },
  { id: "schoolOutreach", label: "School Outreach Records" },
];

/**
 * Categorizes a single document's branch status.
 *
 * @param {object} data
 * @returns {"canonical" | "legacy" | "missing"}
 */
export function classifyDocBranchStatus(data) {
  if (!data || typeof data !== "object") return "missing";

  const record = /** @type {Record<string, any>} */ (data);
  const rawBranchId = record.branchId;
  const rawBranch = record.branch;

  if (rawBranchId && typeof rawBranchId === "string" && BRANCH_MAP[rawBranchId.toLowerCase()]) {
    return "canonical";
  }

  if (rawBranch && typeof rawBranch === "string" && rawBranch.trim().length > 0) {
    return "legacy";
  }

  return "missing";
}

/**
 * Computes audit metrics for a list of document objects.
 *
 * @param {Array<object>} docs
 * @returns {{ total: number, canonical: number, legacy: number, missing: number, readinessPercent: number }}
 */
export function computeCollectionBranchMetrics(docs = []) {
  let canonical = 0;
  let legacy = 0;
  let missing = 0;

  for (const doc of docs) {
    const status = classifyDocBranchStatus(doc);
    if (status === "canonical") canonical++;
    else if (status === "legacy") legacy++;
    else missing++;
  }

  const total = docs.length;
  const readinessPercent = total === 0 ? 100 : Math.round((canonical / total) * 100);

  return {
    total,
    canonical,
    legacy,
    missing,
    readinessPercent,
  };
}

/**
 * Scans Firestore collections for branch health.
 * Bounded by maxPerCollection to protect Spark free tier read quotas.
 *
 * @param {number} maxPerCollection - Max documents to sample per collection (default 100)
 * @returns {Promise<{ overallReadiness: number | null, totalScanned: number, totalCanonical: number, totalLegacy: number, totalMissing: number, failedScansCount: number, collections: Array<object>, timestamp: string }>}
 */
export async function runBranchHealthAudit(maxPerCollection = 100) {
  const results = [];
  let sumTotal = 0;
  let sumCanonical = 0;
  let sumLegacy = 0;
  let sumMissing = 0;

  for (const colDef of AUDIT_COLLECTIONS) {
    try {
      const colRef = collection(db, colDef.id);
      const q = query(colRef, limit(maxPerCollection));
      const snap = await getDocs(q);

      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const metrics = computeCollectionBranchMetrics(docs);

      sumTotal += metrics.total;
      sumCanonical += metrics.canonical;
      sumLegacy += metrics.legacy;
      sumMissing += metrics.missing;

      results.push({
        collectionId: colDef.id,
        label: colDef.label,
        ...metrics,
      });
    } catch (err) {
      console.warn(`[BranchAudit] Could not query collection ${colDef.id}:`, err);
      results.push({
        collectionId: colDef.id,
        label: colDef.label,
        total: 0,
        canonical: 0,
        legacy: 0,
        missing: 0,
        readinessPercent: null,
        error: err instanceof Error ? err.message : "Query failed",
      });
    }
  }

  const successfulCollections = results.filter((r) => !r.error);
  const failedScansCount = results.filter((r) => Boolean(r.error)).length;
  const overallReadiness =
    successfulCollections.length === 0
      ? null
      : sumTotal === 0
        ? 100
        : Math.round((sumCanonical / sumTotal) * 100);

  return {
    overallReadiness,
    totalScanned: sumTotal,
    totalCanonical: sumCanonical,
    totalLegacy: sumLegacy,
    totalMissing: sumMissing,
    failedScansCount,
    collections: results,
    timestamp: new Date().toISOString(),
  };
}

