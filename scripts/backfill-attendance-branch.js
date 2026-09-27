/**
 * Administrative migration script: backfill-attendance-branch.js
 *
 * Scans all documents in the `attendance` collection, resolves missing `branchId`
 * and `branch` fields (by querying the student's user profile or defaulting to
 * canonical Kota Gorontalo), and backfills them in chunked batched writes.
 *
 * Usage:
 *   node scripts/backfill-attendance-branch.js --projectId=<id> [--dry-run] [--service-account=path/to/key.json] [--emulator] [--adc]
 *
 * Flags:
 *   --projectId=<id>        Firebase project ID (or set FIREBASE_PROJECT_ID env var). Required.
 *   --service-account=<path> Path to GCP service account JSON key (or set GOOGLE_APPLICATION_CREDENTIALS).
 *   --emulator[=<host>]     Run against local Firestore emulator (default: 127.0.0.1:8080).
 *   --adc                   Use Google Cloud Application Default Credentials (gcloud auth application-default login).
 *   --dry-run               Analyze and print required changes without writing to Firestore.
 */

/* global process */
import { initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const BRANCH_MAP = {
  cabang_utama: "Kota Gorontalo",
  kota_gorontalo: "Kota Gorontalo",
  bone_bolango: "Bone Bolango",
  limboto: "Limboto",
  pohuwato: "Pohuwato",
};

function normalizeBranchId(raw) {
  if (!raw) return "kota_gorontalo";
  const s = String(raw).toLowerCase().trim().replace(/[\s-]+/g, "_");
  if (s.includes("bone")) return "bone_bolango";
  if (s.includes("limboto")) return "limboto";
  if (s.includes("pohuwato")) return "pohuwato";
  return "kota_gorontalo";
}

async function runMigration() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");

  // Explicit project ID requirement — no hardcoded fallback or implicit frontend .env lookup
  const projectIdArg = args.find((a) => a.startsWith("--projectId="))?.split("=")[1];
  const projectId = projectIdArg || process.env.FIREBASE_PROJECT_ID;

  if (!projectId) {
    console.error("\n[Error] Missing required Firebase Project ID.");
    console.error("To prevent targeting the wrong environment, you must explicitly provide:");
    console.error("  --projectId=<id>  (e.g. node scripts/backfill-attendance-branch.js --projectId=my-project-id)");
    console.error("  or set FIREBASE_PROJECT_ID in your environment.\n");
    process.exit(1);
  }

  // Emulator configuration
  const emulatorFlag = args.find((a) => a.startsWith("--emulator"));
  const emulatorHost =
    (emulatorFlag && emulatorFlag.includes("=") ? emulatorFlag.split("=")[1] : null) ||
    process.env.FIRESTORE_EMULATOR_HOST;

  if (emulatorFlag || emulatorHost) {
    process.env.FIRESTORE_EMULATOR_HOST = emulatorHost || "127.0.0.1:8080";
    console.log(`[Config] Using Firestore Emulator at ${process.env.FIRESTORE_EMULATOR_HOST}`);
  }

  // Authentication resolution: Service Account JSON, Application Default Credentials, or Emulator
  const serviceAccountFlag = args.find((a) => a.startsWith("--service-account="))?.split("=")[1];
  const serviceAccountPath = serviceAccountFlag || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const useAdc = args.includes("--adc");

  let appOptions = { projectId };

  if (serviceAccountPath) {
    const resolvedPath = resolve(process.cwd(), serviceAccountPath);
    if (!existsSync(resolvedPath)) {
      console.error(`\n[Error] Service account file not found: ${resolvedPath}\n`);
      process.exit(1);
    }
    const serviceAccount = JSON.parse(readFileSync(resolvedPath, "utf8"));
    appOptions.credential = cert(serviceAccount);
    console.log(`[Auth] Using Service Account credentials: ${resolvedPath}`);
  } else if (useAdc) {
    appOptions.credential = applicationDefault();
    console.log("[Auth] Using Google Cloud Application Default Credentials (ADC)");
  } else if (!process.env.FIRESTORE_EMULATOR_HOST) {
    console.warn(
      "[Warning] No --service-account or --adc specified. Attempting applicationDefault() credentials."
    );
    try {
      appOptions.credential = applicationDefault();
    } catch {
      console.error(
        "\n[Error] Failed to initialize default administrative credentials. Please supply either:\n" +
          "  --service-account=path/to/key.json\n" +
          "  --adc (requires 'gcloud auth application-default login')\n" +
          "  --emulator (for local testing)\n"
      );
      process.exit(1);
    }
  }

  initializeApp(appOptions);
  const db = getFirestore();

  console.log(`\nStarting attendance branch backfill [Project: ${projectId}]${isDryRun ? " (DRY RUN)" : ""}`);
  console.log("---------------------------------------------------------------------------------");

  const attendanceSnap = await db.collection("attendance").get();
  console.log(`Found ${attendanceSnap.size} attendance records.`);

  if (attendanceSnap.empty) {
    console.log("No attendance records to inspect. Finished.");
    return;
  }

  // Cache user branch lookups to avoid repeated Firestore reads
  const userBranchCache = new Map();

  let missingCount = 0;
  let updatedCount = 0;
  let batch = db.batch();
  let batchOps = 0;
  const BATCH_LIMIT = 400;

  for (const docSnap of attendanceSnap.docs) {
    const data = docSnap.data();

    // Check if branchId or branch is missing or empty
    const hasBranchId = typeof data.branchId === "string" && data.branchId.trim().length > 0;
    const hasBranch = typeof data.branch === "string" && data.branch.trim().length > 0;

    if (hasBranchId && hasBranch) {
      continue;
    }

    missingCount++;
    let resolvedBranchId;

    if (hasBranchId) {
      resolvedBranchId = normalizeBranchId(data.branchId);
    } else if (hasBranch) {
      resolvedBranchId = normalizeBranchId(data.branch);
    } else if (data.userId) {
      if (userBranchCache.has(data.userId)) {
        resolvedBranchId = userBranchCache.get(data.userId);
      } else {
        try {
          const userDoc = await db.collection("users").doc(data.userId).get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            resolvedBranchId = normalizeBranchId(userData?.branchId || userData?.branch);
          } else {
            resolvedBranchId = "kota_gorontalo";
          }
        } catch {
          resolvedBranchId = "kota_gorontalo";
        }
        userBranchCache.set(data.userId, resolvedBranchId);
      }
    } else {
      resolvedBranchId = "kota_gorontalo";
    }

    const resolvedBranch = BRANCH_MAP[resolvedBranchId] || "Kota Gorontalo";

    const updatePayload = {
      branchId: resolvedBranchId,
      branch: resolvedBranch,
      _backfilledBranchAt: new Date().toISOString(),
    };

    if (isDryRun) {
      console.log(`[DryRun] Would update attendance/${docSnap.id}:`, updatePayload);
    } else {
      batch.update(docSnap.ref, updatePayload);
      batchOps++;
      updatedCount++;

      if (batchOps >= BATCH_LIMIT) {
        await batch.commit();
        console.log(`Committed batch of ${batchOps} attendance updates.`);
        batch = db.batch();
        batchOps = 0;
      }
    }
  }

  if (!isDryRun && batchOps > 0) {
    await batch.commit();
    console.log(`Committed final batch of ${batchOps} attendance updates.`);
  }

  console.log("---------------------------------------------------------------------------------");
  console.log(`Total inspected: ${attendanceSnap.size}`);
  console.log(`Missing branch fields: ${missingCount}`);
  console.log(`Successfully updated: ${isDryRun ? 0 : updatedCount}${isDryRun ? ` (${missingCount} identified)` : ""}`);
  console.log("Migration complete.\n");
}

runMigration().catch((err) => {
  console.error("\n[Fatal Migration Error]:", err);
  process.exit(1);
});
