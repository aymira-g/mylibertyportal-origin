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

function deriveDivisionFromProgram_(program) {
  if (!program) return "review";
  const p = String(program).toLowerCase().trim();
  // Match whole words to prevent accidental substring collisions (e.g., "praktik", "batik")
  if (/\b(kindergarten|kids school|paud|tk|nursery|preschool|playgroup)\b/i.test(p)) {
    return "kindergarten";
  }
  if (/\b(course|courses|english|regular|private|toefl|ielts|general|conversation)\b/i.test(p)) {
    return "courses";
  }
  return "review";
}

/**
 * Safely extracts question answers from either:
 * 1. Google Sheets "On form submit" trigger (`e.namedValues`)
 * 2. Google Forms native "On form submit" trigger (`e.response.getItemResponses()`)
 *
 * @param {object} e The Apps Script event object
 * @returns {Record<string, string> | null} Key-value map of UPPERCASE question titles to answers
 */
function extractFormAnswers_(e) {
  if (!e) return null;

  // Case 1: Triggered from Google Sheets ("From spreadsheet" -> "On form submit")
  if (e.namedValues && typeof e.namedValues === "object") {
    const map = {};
    for (const [k, v] of Object.entries(e.namedValues)) {
      const cleanKey = String(k || "").trim().toUpperCase();
      const val = Array.isArray(v) ? (v[0] || "") : (v || "");
      map[cleanKey] = String(val).trim();
    }
    return map;
  }

  // Case 2: Triggered directly from Google Forms ("From form" -> "On form submit")
  if (e.response && typeof e.response.getItemResponses === "function") {
    const map = {};
    const itemResponses = e.response.getItemResponses();
    for (const itemResponse of itemResponses) {
      const title = String(itemResponse.getItem().getTitle() || "").trim().toUpperCase();
      const resp = itemResponse.getResponse();
      const val = Array.isArray(resp) ? (resp[0] || "") : (resp || "");
      map[title] = String(val).trim();
    }
    return map;
  }

  return null;
}

/**
 * Finds answer by exact question title, trimmed match, or substring match.
 */
function findAnswer_(answers, targetQuestion) {
  const target = String(targetQuestion || "").trim().toUpperCase();
  if (answers[target] !== undefined && answers[target] !== "") {
    return answers[target];
  }
  // Try substring match to tolerate question variations (e.g. colons, extra words)
  for (const [q, val] of Object.entries(answers)) {
    if ((q.includes(target) || target.includes(q)) && val !== "") {
      return val;
    }
  }
  return "";
}

function onFormSubmit(e) {
  if (!e) {
    throw new Error(
      "Cannot run onFormSubmit manually with the 'Run' button because there is no form submission event. " +
      "To test your configuration, select 'testConnection' from the function dropdown above and click 'Run'. " +
      "When a real applicant submits the Google Form, this function runs automatically."
    );
  }

  const answers = extractFormAnswers_(e);
  if (!answers || Object.keys(answers).length === 0) {
    throw new Error(
      "Invalid submission event: Could not extract form answers from event. " +
      "If this script is inside Google Forms, ensure the trigger is 'From form' -> 'On form submit'. " +
      "If inside Google Sheets, ensure the trigger is 'From spreadsheet' -> 'On form submit'."
    );
  }

  const application = {
    status: "pending",
    submittedAt: new Date().toISOString(),
    intakeSource: "google_forms_sync",
  };

  for (const [firestoreField, formQuestion] of Object.entries(FIELD_MAP)) {
    application[firestoreField] = findAnswer_(answers, formQuestion);
  }

  // Fallback heuristics if question titles differ slightly from FIELD_MAP
  if (!application.displayName) {
    for (const [q, val] of Object.entries(answers)) {
      if (q.includes("NAMA") && !q.includes("AYAH") && !q.includes("IBU") && !q.includes("SEKOLAH") && val) {
        application.displayName = val;
        break;
      }
    }
  }

  if (!application.displayName) {
    throw new Error(
      "Invalid submission: Student full name could not be identified from the form answers. " +
      "Available questions detected: [" + Object.keys(answers).join(", ") + "]"
    );
  }

  if (!application.phone) {
    for (const [q, val] of Object.entries(answers)) {
      if ((q.includes("HP") || q.includes("TELEPON") || q.includes("WA") || q.includes("WHATSAPP")) && !q.includes("AYAH") && !q.includes("IBU") && val) {
        application.phone = val;
        break;
      }
    }
  }

  if (!application.branch) {
    for (const [q, val] of Object.entries(answers)) {
      if ((q.includes("CABANG") || q.includes("LOKASI") || q.includes("BRANCH")) && val) {
        application.branch = val;
        break;
      }
    }
  }

  // Normalize branch to standard branchId
  const rawBranch = String(application.branch || "").toLowerCase();
  let branchId = "unassigned";
  if (rawBranch.includes("bone")) {
    branchId = "bone_bolango";
  } else if (rawBranch.includes("pohuwato")) {
    branchId = "pohuwato";
  } else if (rawBranch.includes("limboto")) {
    branchId = "limboto";
  } else if (rawBranch.includes("gorontalo") || rawBranch.includes("utama") || rawBranch.includes("cabang")) {
    branchId = "kota_gorontalo";
  }

  const BRANCH_NAMES = {
    kota_gorontalo: "Kota Gorontalo",
    bone_bolango: "Bone Bolango",
    limboto: "Limboto",
    pohuwato: "Pohuwato",
    unassigned: "Unassigned (Review Needed)",
  };

  application.branchId = branchId;
  application.branch = BRANCH_NAMES[branchId] || "Unassigned (Review Needed)";
  application.division = deriveDivisionFromProgram_(application.program);

  // Blueprint v3.4 validation: Kindergarten is strictly offered at Kota Gorontalo (Main Campus)
  if (application.division === "kindergarten" && branchId !== "kota_gorontalo" && branchId !== "unassigned") {
    application.intakeWarning = "Satellite branch selected for Kindergarten; requires admissions consultation.";
  }

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

// Run this manually (▶ button, select this function) to test your Firebase
// service account connection without writing mock records into production.
function testConnection() {
  const token = getAccessToken_();
  const projectId = getFirebaseProjectId_();
  Logger.log("Authentication successful with Firebase Project: " + projectId);
  Logger.log("Token acquired (length " + token.length + "). Dry-run complete. No production records written.");
}

// Optional manual test: submits a sample student to verify the full Firestore intake pipeline.
function testSubmit() {
  onFormSubmit({
    namedValues: {
      "PILIHAN CABANG": ["Kota Gorontalo"],
      "PROGRAM": ["English for Adults (Regular)"],
      "NAMA LENGKAP": ["Test Applicant"],
      "NOMOR HP PENDAFTAR": ["081234567890"],
    },
  });
  Logger.log("Test submission sent to Firestore successfully.");
}
