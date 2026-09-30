import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const sa = JSON.parse(readFileSync(resolve(process.cwd(), "serviceAccountKey.json"), "utf8"));
initializeApp({ projectId: "mylibertyies-f2f38", credential: cert(sa) });
const db = getFirestore();

// Find IRNAWATI BASALA (opslead, courses -> all)
const snap = await db.collection("users")
  .where("role", "==", "opslead")
  .get();

for (const doc of snap.docs) {
  const d = doc.data();
  if ((d.displayName || "").toLowerCase().includes("irnawati")) {
    await doc.ref.update({ division: "all", updatedAt: FieldValue.serverTimestamp() });
    console.log(`[OK] division="all" applied to [opslead] ${d.displayName} (${doc.id})`);
  }
}
