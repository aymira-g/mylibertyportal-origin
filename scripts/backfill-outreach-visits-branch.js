/**
 * Administrative migration script: backfill-outreach-visits-branch.js
 *
 * Scans all documents in the `visits` subcollections under `schoolOutreach/{schoolId}/visits`,
 * resolves the parent school document, and populates `branchId` and `branch` if missing.
 *
 * Usage:
 *   node scripts/backfill-outreach-visits-branch.js --projectId=<id> [--dry-run] [--service-account=path/to/key.json] [--emulator] [--adc]
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
    console.error("  --projectId=<id>  (e.g. node scripts/backfill-outreach-visits-branch.js --projectId=my-project-id)");
    console.error("  or set FIREBASE_PROJECT_ID in your environment.\n");
    process.exit(1);
  }

  // Emulator configuration
  const emulatorFlag = args.find((a) => a.startsWith("--emulator"));
  const emulatorHost =
    (emulatorFlag && emulatorFlag.includes("=") ? emulatorFlag.split("=")[1] : null) ||
    (emulatorFlag ? "127.0.0.1:8080" : null) ||
    process.env.FIRESTORE_EMULATOR_HOST;

  if (emulatorHost) {
    process.env.FIRESTORE_EMULATOR_HOST = emulatorHost;
  }

  // Service account or Application Default Credentials
  const serviceAccountArg = args.find((a) => a.startsWith("--service-account="))?.split("=")[1];
  const serviceAccountPath = serviceAccountArg || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const useAdc = args.includes("--adc");

  /** @type {any} */
  let appConfig = { projectId };

  if (emulatorHost) {
    console.log(`[Config] Connected to Firestore Emulator: ${emulatorHost}`);
  } else if (serviceAccountPath) {
    const resolvedPath = resolve(process.cwd(), serviceAccountPath);
    if (!existsSync(resolvedPath)) {
      console.error(`\n[Error] Service account file not found at: ${resolvedPath}\n`);
      process.exit(1);
    }
    console.log(`[Config] Using Service Account credentials: ${resolvedPath}`);
    const serviceAccount = JSON.parse(readFileSync(resolvedPath, "utf-8"));
    appConfig.credential = cert(serviceAccount);
  } else if (useAdc) {
    console.log("[Config] Using Google Cloud Application Default Credentials (ADC)...");
    appConfig.credential = applicationDefault();
  } else {
    console.error("\n[Error] Authentication or emulator configuration required.");
    console.error("To prevent unintended live access, specify one of the following:");
    console.error("  1) Local Emulator:      --emulator[=127.0.0.1:8080]");
    console.error("  2) Service Account Key: --service-account=path/to/key.json");
    console.error("  3) Google Cloud ADC:    --adc (requires 'gcloud auth application-default login')\n");
    process.exit(1);
  }

  console.log("==================================================");
  console.log(" Outreach Visits Branch Backfill Tool");
  console.log(` Mode:    ${isDryRun ? "DRY RUN (no writes)" : "LIVE EXECUTION"}`);
  console.log(` Project: ${projectId}`);
  console.log("==================================================\n");

  const app = initializeApp(appConfig);
  const db = getFirestore(app);

  console.log("Fetching all schools from schoolOutreach collection...");
  const schoolsSnap = await db.collection("schoolOutreach").get();
  console.log(`Found ${schoolsSnap.size} school documents.\n`);

  let totalVisitsScanned = 0;
  let visitsToUpdate = 0;
  let visitsAlreadyValid = 0;
  let visitsUpdated = 0;
  let errors = [];

  for (const schoolDoc of schoolsSnap.docs) {
    const schoolId = schoolDoc.id;
    const schoolData = schoolDoc.data();
    const parentBranchId = schoolData.branchId || normalizeBranchId(schoolData.branch || schoolData.municipality);
    const parentBranch = schoolData.branch || BRANCH_MAP[parentBranchId] || "Kota Gorontalo";

    const visitsSnap = await db
      .collection("schoolOutreach")
      .doc(schoolId)
      .collection("visits")
      .get();

    if (visitsSnap.empty) continue;

    for (const visitDoc of visitsSnap.docs) {
      totalVisitsScanned++;
      const visitData = visitDoc.data();
      const visitId = visitDoc.id;

      const hasBranchId = Boolean(visitData.branchId);
      const hasBranch = Boolean(visitData.branch);

      if (hasBranchId && hasBranch && visitData.branchId === parentBranchId) {
        visitsAlreadyValid++;
        continue;
      }

      visitsToUpdate++;
      console.log(`[Target] Visit ${visitId} at school "${schoolData.name || schoolId}" (${schoolId}):`);
      console.log(`         Current: branchId=${visitData.branchId || "(missing)"}, branch=${visitData.branch || "(missing)"}`);
      console.log(`         Target:  branchId=${parentBranchId}, branch=${parentBranch}`);

      if (!isDryRun) {
        try {
          await visitDoc.ref.update({
            branchId: parentBranchId,
            branch: parentBranch,
            source: visitData.source || "schoolOutreach",
          });
          visitsUpdated++;
          console.log(`         -> Successfully updated.`);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error(`         -> FAILED to update: ${message}`);
          errors.push({ schoolId, visitId, error: message });
        }
      }
    }
  }

  console.log("\n==================================================");
  console.log(" Backfill Summary");
  console.log("==================================================");
  console.log(`Total Visits Scanned:   ${totalVisitsScanned}`);
  console.log(`Already Valid:          ${visitsAlreadyValid}`);
  console.log(`Visits Needing Update:  ${visitsToUpdate}`);
  if (!isDryRun) {
    console.log(`Visits Updated:         ${visitsUpdated}`);
  }
  console.log(`Errors / Failures:      ${errors.length}`);
  if (errors.length > 0) {
    console.log("\nError details:", JSON.stringify(errors, null, 2));
  }
  console.log("==================================================\n");
}

runMigration().catch((err) => {
  console.error("Migration fatal error:", err);
  process.exit(1);
});
