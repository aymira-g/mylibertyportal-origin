// ── SETUP: these live in Project Settings → Script Properties.
// If SERVICE_ACCOUNT_KEY contains the entire downloaded JSON key file,
// this script will automatically parse the email and private key from it!
const props = PropertiesService.getScriptProperties();

function getFirebaseProjectId_() {
  let pid = props.getProperty("FIREBASE_PROJECT_ID");
  if (!pid) {
    const rawKey = props.getProperty("SERVICE_ACCOUNT_KEY") || "";
    if (rawKey.trim().startsWith("{")) {
      try {
        pid = JSON.parse(rawKey).project_id;
      } catch (e) {}
    }
  }
  return (pid || "mylibertyies-f2f38").trim().replace(/^["']|["']$/g, "");
}

function getServiceAccountEmail_() {
  let email = props.getProperty("SERVICE_ACCOUNT_EMAIL");
  if (!email) {
    const rawKey = props.getProperty("SERVICE_ACCOUNT_KEY") || "";
    if (rawKey.trim().startsWith("{")) {
      try {
        email = JSON.parse(rawKey).client_email;
      } catch (e) {}
    }
  }
  if (!email) {
    throw new Error(
      "Missing SERVICE_ACCOUNT_EMAIL: Please add 'SERVICE_ACCOUNT_EMAIL' in Project Settings → Script Properties."
    );
  }
  return email.trim().replace(/^["']|["']$/g, "");
}

function getServiceAccountKey_() {
  let raw = props.getProperty("SERVICE_ACCOUNT_KEY");
  if (!raw || !raw.trim()) {
    throw new Error(
      "Missing SERVICE_ACCOUNT_KEY: Please add 'SERVICE_ACCOUNT_KEY' in Project Settings → Script Properties."
    );
  }
  raw = raw.trim();

  // If the user pasted the entire service account JSON file into this property
  if (raw.startsWith("{")) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed.private_key) {
        raw = parsed.private_key;
      }
    } catch (e) {
      // Not valid JSON, proceed with raw string
    }
  }

  // Remove surrounding quotes if copied with quotes
  raw = raw.replace(/^["']|["']$/g, "").trim();

  // Convert literal \n characters to real newlines
  raw = raw.replace(/\\n/g, "\n");

  if (!raw.includes("BEGIN PRIVATE KEY") && !raw.includes("BEGIN RSA PRIVATE KEY")) {
    throw new Error(
      "Invalid SERVICE_ACCOUNT_KEY: Key must start with '-----BEGIN PRIVATE KEY-----'. " +
        "Make sure you copied the private_key field from your Firebase service account JSON."
    );
  }

  return raw;
}

// ── FIELD MAPPING: match these to your form's EXACT question text ──
const FIELD_MAP = {
  branch: "PILIHAN CABANG",
  program: "PROGRAM",
  classType: "JENIS KELAS",
  displayName: "NAMA LENGKAP",
  gender: "JENIS KELAMIN",
  placeOfBirth: "TEMPAT LAHIR",
  dob: "TANGGAL LAHIR",
  religion: "AGAMA",
  address: "ALAMAT LENGKAP",
  phone: "NOMOR HP PENDAFTAR",
  fatherName: "NAMA AYAH",
  fatherJob: "PEKERJAAN AYAH",
  fatherPhone: "NOMOR HP AYAH",
  motherName: "NAMA IBU",
  motherJob: "PEKERJAAN IBU",
  motherPhone: "NOMOR HP IBU",
  schoolOrJob: "NAMA SEKOLAH/UNIVERSITAS/PEKERJAAN",
  classOrSemester: "KELAS/SEMESTER/JABATAN",
  referralSource: "DARI MANAKAH ANDA MEMPEROLEH INFORMASI MENGENAI MYLIBERTY?",
};

// Base64url encode (JWT needs this, NOT plain base64 — different charset, no padding)
function base64UrlEncode_(input) {
  return Utilities.base64Encode(input)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// Exchanges the service account's key for a short-lived Firestore access token.
// This is the whole "authentication" step — no library needed for this part,
// it's just signing a standard JWT and trading it in with Google directly.
function getAccessToken_() {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const email = getServiceAccountEmail_();
  const key = getServiceAccountKey_();

  const claims = {
    iss: email,
    scope: "https://www.googleapis.com/auth/datastore",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const toSign = base64UrlEncode_(JSON.stringify(header)) + "." + base64UrlEncode_(JSON.stringify(claims));
  const signatureBytes = Utilities.computeRsaSha256Signature(toSign, key);
  const jwt = toSign + "." + base64UrlEncode_(signatureBytes);

  const res = UrlFetchApp.fetch("https://oauth2.googleapis.com/token", {
    method: "post",
    payload: {
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    },
    muteHttpExceptions: true,
  });

  const data = JSON.parse(res.getContentText());
  if (!data.access_token) throw new Error("Auth failed: " + res.getContentText());
  return data.access_token;
}

// Wraps every value as a Firestore REST "stringValue" field.
function toFirestoreFields_(obj) {
  const fields = {};
  for (const [key, value] of Object.entries(obj)) {
    fields[key] = { stringValue: String(value || "") };
  }
  return fields;
}

function onFormSubmit(e) {
  const application = { status: "pending", submittedAt: new Date().toISOString() };
  for (const [firestoreField, formQuestion] of Object.entries(FIELD_MAP)) {
    const answer = e.namedValues[formQuestion];
    application[firestoreField] = answer ? answer[0] : "";
  }

  // Normalize branch to standard branchId so branch-isolated admissions views display it
  const rawBranch = String(application.branch || "").toLowerCase();
  let branchId = "kota_gorontalo";
  if (rawBranch.includes("bone")) {
    branchId = "bone_bolango";
  } else if (rawBranch.includes("pohuwato")) {
    branchId = "pohuwato";
  } else if (rawBranch.includes("limboto")) {
    branchId = "limboto";
  }
  application.branchId = branchId;

  const token = getAccessToken_();
  const projectId = getFirebaseProjectId_();
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/applications`;

  const res = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + token },
    payload: JSON.stringify({ fields: toFirestoreFields_(application) }),
    muteHttpExceptions: true,
  });

  if (res.getResponseCode() >= 300) {
    throw new Error("Firestore write failed: " + res.getContentText());
  }
}

// Run this manually (▶ button, select this function) to test the whole
// pipeline without needing to submit the real form each time.
function testConnection() {
  onFormSubmit({
    namedValues: {
      "NAMA LENGKAP": ["Test Student"],
      "NOMOR HP PENDAFTAR": ["081234567890"],
    },
  });
  Logger.log("If no error appeared above, check Firestore's applications collection now.");
}
