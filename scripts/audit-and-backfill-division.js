/**
 * Administrative audit and backfill script: audit-and-backfill-division.js
 *
 * Implements R5 and R10 from docs/plans/active/kindergarten-division-scope-revision-plan.md:
 * - Read-only audit counting division distribution across collections
 * - Derives missing division values via divisionOfProgram(programId || program)
 * - Safe dry-run mode generating a structured report of unambiguous vs ambiguous records
 * - Audits staff profiles for invalid values like "studio"
 * - Batched writes (max 400 per commit) protecting free-tier Spark quotas
 *
 * Usage:
 *   node scripts/audit-and-backfill-division.js --projectId=<id> [--audit-only] [--dry-run] [--commit] [--collection=<name>]
 *
 * Flags:
 *   --projectId=<id>        Firebase project ID (or FIREBASE_PROJECT_ID env var). Required.
 *   --audit-only            Only report counts and distribution without preparing backfill payloads.
 *   --dry-run               (Default) Analyze and output changes to backfill-division-report.json without writing.
 *   --commit                Apply unambiguous updates in batched writes.
 *   --collection=<name>     Restrict operation to a specific collection (users, classes, applications, deskInquiries, progressReports).
 *   --service-account=<path>Path to GCP service account key (or GOOGLE_APPLICATION_CREDENTIALS).
 *   --emulator[=<host>]     Run against local Firestore emulator (default: 127.0.0.1:8080).
 *   --adc                   Use Google Cloud Application Default Credentials.
 */

/* global process */
import { initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const COLLECTIONS = [
  "users", // students role only for backfill; staff audited for invalid division
  "classes",
  "applications",
  "deskInquiries",
  "progressReports",
];

const VALID_DIVISIONS = ["courses", "kindergarten"];

function deriveDivisionFromProgram(programIdOrName) {
  if (!programIdOrName || typeof programIdOrName !== "string") return null;
  const s = programIdOrName.trim().toLowerCase();
  if (
    s.includes("kindergarten") ||
    s.includes("kids school") ||
    s.includes("paud") ||
    s.includes("tk_a") ||
    s.includes("tk_b") ||
    s.includes("nursery") ||
    s === "kids_school"
  ) {
    return "kindergarten";
  }
  if (
    s.includes("course") ||
    s.includes("english") ||
    s.includes("toefl") ||
    s.includes("pro") ||
    s.includes("general")
  ) {
    return "courses";
  }
  return null;
}

async function runDivisionAudit() {
  const args = process.argv.slice(2);
  const isAuditOnly = args.includes("--audit-only");
  const isCommit = args.includes("--commit");

  const projectIdArg = args.find((a) => a.startsWith("--projectId="))?.split("=")[1];
  const projectId = projectIdArg || process.env.FIREBASE_PROJECT_ID;

  if (!projectId) {
    console.error("\n[Error] Missing required Firebase Project ID.");
    console.error("Provide --projectId=<id> or set FIREBASE_PROJECT_ID environment variable.\n");
    process.exit(1);
  }

  const emulatorFlag = args.find((a) => a.startsWith("--emulator"));
  const emulatorHost =
    (emulatorFlag && emulatorFlag.includes("=") ? emulatorFlag.split("=")[1] : null) ||
    process.env.FIRESTORE_EMULATOR_HOST;

  if (emulatorFlag || emulatorHost) {
    process.env.FIRESTORE_EMULATOR_HOST = emulatorHost || "127.0.0.1:8080";
    console.log(`[Config] Using Firestore Emulator at ${process.env.FIRESTORE_EMULATOR_HOST}`);
  }

  const serviceAccountFlag = args.find((a) => a.startsWith("--service-account="))?.split("=")[1];
  const serviceAccountPath = serviceAccountFlag || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const useAdc = args.includes("--adc");

  const appOptions = { projectId };
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
    try {
      appOptions.credential = applicationDefault();
    } catch {
      console.error(
        "\n[Error] Failed to initialize default administrative credentials. Please supply:\n" +
          "  --service-account=path/to/key.json\n" +
          "  --adc\n" +
          "  --emulator\n"
      );
      process.exit(1);
    }
  }

  initializeApp(appOptions);
  const db = getFirestore();

  const collectionArg = args.find((a) => a.startsWith("--collection="))?.split("=")[1];
  const targetCollections = collectionArg ? [collectionArg] : COLLECTIONS;

  console.log(`\n================================================================================`);
  console.log(`  MYLIBERTY Division Audit & Backfill [Project: ${projectId}]`);
  console.log(`  Mode: ${isCommit ? "COMMIT (APPLYING WRITES)" : isAuditOnly ? "AUDIT ONLY" : "DRY RUN"}`);
  console.log(`================================================================================\n`);

  const report = {
    timestamp: new Date().toISOString(),
    projectId,
    mode: isCommit ? "commit" : isAuditOnly ? "audit_only" : "dry_run",
    collections: {},
    staffProfilesWithInvalidDivision: [],
    unambiguousUpdates: [],
    ambiguousRecords: [],
  };

  for (const collName of targetCollections) {
    console.log(`--> Auditing collection: "${collName}"...`);
    const collRef = db.collection(collName);

    // Use aggregation count queries when possible to conserve Spark quota reads
    try {
      const totalCountSnap = await collRef.count().get();
      const kgCountSnap = await collRef.where("division", "==", "kindergarten").count().get();
      const coursesCountSnap = await collRef.where("division", "==", "courses").count().get();

      const total = totalCountSnap.data().count;
      const kg = kgCountSnap.data().count;
      const courses = coursesCountSnap.data().count;
      const missingOrOther = total - (kg + courses);

      console.log(`    Total docs: ${total}`);
      console.log(`    division == 'kindergarten': ${kg}`);
      console.log(`    division == 'courses': ${courses}`);
      console.log(`    division missing / other: ${missingOrOther}`);

      report.collections[collName] = { total, kindergarten: kg, courses, missingOrOther };
    } catch (err) {
      console.warn(`    Aggregation count fallback: ${err.message}`);
    }

    if (isAuditOnly) continue;

    // Scan docs to identify missing or invalid values
    const snap = await collRef.get();
    for (const doc of snap.docs) {
      const data = doc.data();

      // Special handling for users collection: distinguish students vs staff
      if (collName === "users") {
        const role = data.role || "student";
        if (role !== "student") {
          // Staff profile audit
          const div = data.division;
          if (!div || !VALID_DIVISIONS.includes(div)) {
            report.staffProfilesWithInvalidDivision.push({
              uid: doc.id,
              displayName: data.displayName || data.email || "Unknown Staff",
              role,
              branch: data.branch || data.branchId || "Unknown Branch",
              currentDivision: div || null,
              issue: !div ? "missing_division" : `invalid_division_${div}`,
            });
          }
          continue;
        }
      }

      const existingDiv = data.division;
      if (existingDiv && VALID_DIVISIONS.includes(existingDiv)) {
        continue; // Already has canonical division
      }

      // Attempt to derive division from educational program or class metadata
      const prog = data.programId || data.program || data.course || data.targetProgram;
      const derived = deriveDivisionFromProgram(prog);

      if (derived) {
        report.unambiguousUpdates.push({
          collection: collName,
          docId: doc.id,
          currentDivision: existingDiv || null,
          program: prog || null,
          derivedDivision: derived,
        });
      } else {
        report.ambiguousRecords.push({
          collection: collName,
          docId: doc.id,
          currentDivision: existingDiv || null,
          program: prog || null,
          role: data.role || null,
          reason: "No programId/program metadata could be reliably matched to courses or kindergarten.",
        });
      }
    }
  }

  // Summary output
  console.log(`\n--------------------------------------------------------------------------------`);
  console.log(`Audit Summary:`);
  console.log(`  Unambiguous records ready for backfill: ${report.unambiguousUpdates.length}`);
  console.log(`  Ambiguous records requiring manual review: ${report.ambiguousRecords.length}`);
  console.log(`  Staff profiles with missing/invalid division: ${report.staffProfilesWithInvalidDivision.length}`);
  console.log(`--------------------------------------------------------------------------------\n`);

  if (report.staffProfilesWithInvalidDivision.length > 0) {
    console.log(`[Notice] Staff profiles requiring attention:`);
    report.staffProfilesWithInvalidDivision.forEach((s) => {
      console.log(`  - [${s.role}] ${s.displayName} (${s.uid}) -> division: "${s.currentDivision}" (${s.issue})`);
    });
    console.log(`\n`);
  }

  // Write report to local JSON file
  const reportPath = resolve(process.cwd(), "backfill-division-report.json");
  writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
  console.log(`Report generated at: ${reportPath}`);

  // Apply writes if --commit was explicitly supplied
  if (isCommit) {
    if (report.unambiguousUpdates.length === 0) {
      console.log("No unambiguous records to update. Done.");
      return;
    }

    console.log(`\nApplying updates to ${report.unambiguousUpdates.length} records in batches of 400...`);
    const BATCH_SIZE = 400;
    let batch = db.batch();
    let batchCount = 0;
    let totalCommitted = 0;

    for (const update of report.unambiguousUpdates) {
      const docRef = db.collection(update.collection).doc(update.docId);
      batch.update(docRef, { division: update.derivedDivision });
      batchCount++;

      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        totalCommitted += batchCount;
        console.log(`  Committed batch: ${totalCommitted} / ${report.unambiguousUpdates.length} records`);
        batch = db.batch();
        batchCount = 0;
      }
    }

    if (batchCount > 0) {
      await batch.commit();
      totalCommitted += batchCount;
      console.log(`  Committed final batch: ${totalCommitted} records total`);
    }

    console.log(`\n[Success] Backfill complete. Applied ${totalCommitted} updates.\n`);
  } else {
    console.log(`[Info] Dry run only. No writes committed. Run with --commit to apply.`);
  }
}

runDivisionAudit().catch((err) => {
  console.error("\n[Fatal Exception]:", err);
  process.exit(1);
});
