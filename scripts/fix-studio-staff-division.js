/**
 * One-shot fix: assign correct division values to staff profiles
 * that were flagged as invalid_division_studio or missing_division
 * by audit-and-backfill-division.js.
 *
 * Usage:
 *   node scripts/fix-studio-staff-division.js --projectId=<id> [--dry-run] [--commit]
 */

/* global process */
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// ---------------------------------------------------------------------------
// Assignments confirmed by Kifry on 2026-09-30
// ---------------------------------------------------------------------------
const STAFF_FIXES = [
  { uid: "FZWmUbuMF9YOnmK0UeguMKSsYTq1", displayName: "Test Instructor Leader",               role: "instructorleader", division: "all"     },
  { uid: "GwDqsy9MQUQGMHurMjyA6f6yksL2", displayName: "Test Office Boy",                      role: "officeboy",        division: "all"     },
  { uid: "H1Bxio5cVtPGvo113geeBqklkWg1", displayName: "MYLIBERTY International English School", role: "admin",          division: "all"     },
  { uid: "LbzBeVbZxpVHEmjJJiy5Us33PsZ2", displayName: "Test Front Office Lead",                role: "opslead",         division: "all"     },
  { uid: "PN9HoJV8GRX49PONdQAimdZDlv43", displayName: "Test Manager · Courses",                 role: "manager",         division: "courses" },
  { uid: "UvAIuGfGBMgaQ0w9rCgqQdjBTf13", displayName: "Test Marketing",                        role: "marketing",       division: "courses" },
  { uid: "X3HCkUqU2eSETq7pmnqZwONsMsi2", displayName: "Test Admin",                            role: "admin",           division: "all"     },
  { uid: "a3Tb7qr3TFc2LFYUQpJMpmBu0eI3", displayName: "Test Instructor · Courses",               role: "instructor",      division: "courses" },
  { uid: "eLiBKSmcJoOpMUAxkL8INsfre7l2", displayName: "Test Front Office · Courses",             role: "frontoffice",     division: "courses" },
];

async function main() {
  const args = process.argv.slice(2);
  const isCommit = args.includes("--commit");
  const isDryRun = !isCommit;

  const projectIdArg = args.find((a) => a.startsWith("--projectId="))?.split("=")[1];
  const projectId = projectIdArg || process.env.FIREBASE_PROJECT_ID;

  if (!projectId) {
    console.error("\n[Error] Missing --projectId=<id>\n");
    process.exit(1);
  }

  const defaultKeyPath = resolve(process.cwd(), "serviceAccountKey.json");
  const fallback = resolve(process.cwd(), "service-account.json");
  const keyPath = existsSync(defaultKeyPath) ? defaultKeyPath : existsSync(fallback) ? fallback : null;

  if (!keyPath) {
    console.error("\n[Error] serviceAccountKey.json not found in project root.\n");
    process.exit(1);
  }

  const serviceAccount = JSON.parse(readFileSync(keyPath, "utf8"));
  initializeApp({ projectId, credential: cert(serviceAccount) });
  const db = getFirestore();

  console.log("\n================================================================================");
  console.log(`  Fix Studio Staff Division [Project: ${projectId}]`);
  console.log(`  Mode: ${isCommit ? "COMMIT (applying writes)" : "DRY RUN (no writes)"}`);
  console.log("================================================================================\n");

  let applied = 0;

  for (const fix of STAFF_FIXES) {
    const label = `[${fix.role}] ${fix.displayName} (${fix.uid})`;
    if (isDryRun) {
      console.log(`  [DRY RUN] Would set division="${fix.division}" on ${label}`);
      applied++;
      continue;
    }

    try {
      const ref = db.collection("users").doc(fix.uid);
      const snap = await ref.get();
      if (!snap.exists) {
        console.warn(`  [SKIP] Document not found: ${fix.uid}`);
        continue;
      }
      await ref.update({ division: fix.division, updatedAt: FieldValue.serverTimestamp() });
      console.log(`  [OK] division="${fix.division}" applied to ${label}`);
      applied++;
    } catch (err) {
      console.error(`  [ERROR] ${label}: ${err.message}`);
    }
  }

  const verb = isCommit ? "updated" : "would be updated";
  const status = isCommit ? "[Success]" : "[Dry run complete]";
  console.log(`\n${status} ${applied}/${STAFF_FIXES.length} staff profiles ${verb}.`);
  if (isDryRun) console.log("  Run with --commit to apply.\n");
}

main().catch((err) => {
  console.error("\n[Fatal]:", err);
  process.exit(1);
});
