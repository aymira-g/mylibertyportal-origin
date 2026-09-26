/**
 * Administrative migration script: backfill-outreach-visits-branch.js
 *
 * Scans all documents in the `visits` subcollections under `schoolOutreach/{schoolId}/visits`,
 * resolves the parent school document, and populates `branchId` and `branch` if missing.
 *
 * Usage:
 *   node scripts/backfill-outreach-visits-branch.js [--dry-run] [--email=admin@email.com] [--password=pass]
 *
 * Flags:
 *   --dry-run       Analyze and print required changes without writing to Firestore.
 *   --email         Admin/Staff user email for authentication.
 *   --password      Password for authentication.
 */

/* global process */
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// Load .env or .env.local variables if available
function loadEnv() {
  const env = { ...process.env };
  const envFiles = [".env.local", ".env"];
  for (const file of envFiles) {
    const fullPath = resolve(process.cwd(), file);
    if (existsSync(fullPath)) {
      const content = readFileSync(fullPath, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
          if (!env[key]) env[key] = val;
        }
      }
    }
  }
  return env;
}

const env = loadEnv();

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyCut-lqqGwpwZ9FjaifrBObi8Kr76tawIU",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "mylibertyies-f2f38.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "mylibertyies-f2f38",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "mylibertyies-f2f38.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1072836543676",
  appId: env.VITE_FIREBASE_APP_ID || "1:1072836543676:web:713dc5f12930e89ce5fcb9",
};

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
  const emailArg = args.find((a) => a.startsWith("--email="))?.split("=")[1];
  const passArg = args.find((a) => a.startsWith("--password="))?.split("=")[1];

  console.log("==================================================");
  console.log(" Outreach Visits Branch Backfill Tool");
  console.log(` Mode: ${isDryRun ? "DRY RUN (no writes)" : "LIVE EXECUTION"}`);
  console.log(` Project: ${firebaseConfig.projectId}`);
  console.log("==================================================\n");

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const auth = getAuth(app);

  if (emailArg && passArg) {
    console.log(`Authenticating as ${emailArg}...`);
    await signInWithEmailAndPassword(auth, emailArg, passArg);
    console.log("Authenticated successfully.\n");
  } else {
    console.log("Note: Running without explicit auth. If security rules require auth, pass --email=... --password=...\n");
  }

  console.log("Fetching all schools from schoolOutreach collection...");
  const schoolsSnap = await getDocs(collection(db, "schoolOutreach"));
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

    const visitsRef = collection(db, "schoolOutreach", schoolId, "visits");
    const visitsSnap = await getDocs(visitsRef);

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
      console.log(`[Target] Visit ${visitId} at school "${schoolData.name}" (${schoolId}):`);
      console.log(`         Current: branchId=${visitData.branchId || "(missing)"}, branch=${visitData.branch || "(missing)"}`);
      console.log(`         Target:  branchId=${parentBranchId}, branch=${parentBranch}`);

      if (!isDryRun) {
        try {
          await updateDoc(doc(db, "schoolOutreach", schoolId, "visits", visitId), {
            branchId: parentBranchId,
            branch: parentBranch,
            source: visitData.source || "schoolOutreach",
          });
          visitsUpdated++;
          console.log(`         -> Successfully updated.`);
        } catch (err) {
          console.error(`         -> FAILED to update: ${err.message}`);
          errors.push({ schoolId, visitId, error: err.message });
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
