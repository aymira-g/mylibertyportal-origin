/* global process */
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const isCommit = args.includes("--commit");
const isDryRun = !isCommit;

const projectIdArg = args.find((a) => a.startsWith("--projectId="))?.split("=")[1];
const projectId = projectIdArg || process.env.FIREBASE_PROJECT_ID;

if (!projectId) {
  console.error("\n[Error] Missing required --projectId=<id> (or set FIREBASE_PROJECT_ID)\n");
  process.exit(1);
}

const keyPath = resolve(process.cwd(), "serviceAccountKey.json");
if (!existsSync(keyPath)) {
  console.error(`\n[Error] serviceAccountKey.json not found at ${keyPath}\n`);
  process.exit(1);
}

const sa = JSON.parse(readFileSync(keyPath, "utf8"));
initializeApp({ projectId, credential: cert(sa) });
const db = getFirestore();

console.log(`\n================================================================================`);
console.log(`  Fix Irnawati Basala Opslead Division [Project: ${projectId}]`);
console.log(`  Mode: ${isCommit ? "COMMIT (applying writes)" : "DRY RUN (no writes)"}`);
console.log(`================================================================================\n`);

const snap = await db.collection("users").where("role", "==", "opslead").get();

for (const doc of snap.docs) {
  const d = doc.data();
  if ((d.displayName || "").toLowerCase().includes("irnawati")) {
    if (isDryRun) {
      console.log(`  [DRY RUN] Would apply division="all" to [opslead] ${d.displayName} (${doc.id})`);
    } else {
      await doc.ref.update({ division: "all", updatedAt: FieldValue.serverTimestamp() });
      console.log(`  [OK] division="all" applied to [opslead] ${d.displayName} (${doc.id})`);
    }
  }
}

if (isDryRun) {
  console.log(`\n[Info] Dry run complete. Run with --commit to apply.\n`);
}
