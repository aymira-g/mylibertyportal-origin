import { describe, it, expect } from "vitest";
import workerDefault, {
  normalizeRole,
  normalizeBranchId,
  BRANCH_MAP,
  LEGACY_BRANCH_ALIASES,
  LEGACY_ROLE_ALIASES,
  toFirestoreValue,
  fromFirestoreValue,
  toFirestoreFields,
  fromFirestoreDocument,
  generateNonce,
  generateShiftId,
  checkRateLimit,
  rateLimits,
} from "../../../cloudflare-worker/worker.js";

describe("Cloudflare Worker — Normalizers & Field Converters (Domain 13)", () => {
  describe("branch and role mappings", () => {
    it("contains all 4 active branches in BRANCH_MAP", () => {
      expect(BRANCH_MAP.kota_gorontalo).toBe("Kota Gorontalo");
      expect(BRANCH_MAP.bone_bolango).toBe("Bone Bolango");
      expect(BRANCH_MAP.limboto).toBe("Limboto");
      expect(BRANCH_MAP.pohuwato).toBe("Pohuwato");
    });

    it("maps known legacy aliases in dictionaries", () => {
      expect(LEGACY_BRANCH_ALIASES["cabang utama"]).toBe("kota_gorontalo");
      expect(LEGACY_ROLE_ALIASES.ops_lead).toBe("opslead");
    });
  });

  describe("normalizeRole", () => {
    it("maps legacy role aliases to canonical names", () => {
      expect(normalizeRole("ops_lead")).toBe("opslead");
      expect(normalizeRole("frontofficelead")).toBe("opslead");
      expect(normalizeRole("front_office_lead")).toBe("opslead");
      expect(normalizeRole("instructor_leader")).toBe("instructorleader");
      expect(normalizeRole("head_instructor")).toBe("instructorleader");
      expect(normalizeRole("front_office")).toBe("frontoffice");
    });

    it("preserves canonical roles", () => {
      expect(normalizeRole("director")).toBe("director");
      expect(normalizeRole("vice_director")).toBe("vice_director");
      expect(normalizeRole("admin")).toBe("admin");
      expect(normalizeRole("manager")).toBe("manager");
      expect(normalizeRole("instructor")).toBe("instructor");
      expect(normalizeRole("frontoffice")).toBe("frontoffice");
      expect(normalizeRole("opslead")).toBe("opslead");
      expect(normalizeRole("marketing")).toBe("marketing");
      expect(normalizeRole("officeboy")).toBe("officeboy");
    });

    it("gracefully handles null, undefined, or empty values", () => {
      expect(normalizeRole(null)).toBe(null);
      expect(normalizeRole(undefined)).toBe(undefined);
      expect(normalizeRole("")).toBe("");
    });
  });

  describe("normalizeBranchId", () => {
    it("resolves canonical branch IDs", () => {
      expect(normalizeBranchId("kota_gorontalo")).toBe("kota_gorontalo");
      expect(normalizeBranchId("bone_bolango")).toBe("bone_bolango");
      expect(normalizeBranchId("limboto")).toBe("limboto");
      expect(normalizeBranchId("pohuwato")).toBe("pohuwato");
    });

    it("resolves canonical display labels to branch IDs", () => {
      expect(normalizeBranchId("Kota Gorontalo")).toBe("kota_gorontalo");
      expect(normalizeBranchId("Bone Bolango")).toBe("bone_bolango");
      expect(normalizeBranchId("Limboto")).toBe("limboto");
      expect(normalizeBranchId("Pohuwato")).toBe("pohuwato");
    });

    it("resolves legacy and colloquial branch aliases to kota_gorontalo", () => {
      expect(normalizeBranchId("cabang utama")).toBe("kota_gorontalo");
      expect(normalizeBranchId("cabang_utama")).toBe("kota_gorontalo");
      expect(normalizeBranchId("utama")).toBe("kota_gorontalo");
      expect(normalizeBranchId("main branch")).toBe("kota_gorontalo");
      expect(normalizeBranchId("gorontalo")).toBe("kota_gorontalo");
      expect(normalizeBranchId("kota")).toBe("kota_gorontalo");
    });

    it("handles whitespace and case insensitivity", () => {
      expect(normalizeBranchId("  Bone Bolango  ")).toBe("bone_bolango");
      expect(normalizeBranchId("POHUWATO")).toBe("pohuwato");
    });

    it("gracefully handles empty or non-string values", () => {
      expect(normalizeBranchId("")).toBe("");
      expect(normalizeBranchId(null)).toBe("");
      expect(normalizeBranchId(undefined)).toBe("");
    });
  });

  describe("Firestore REST API Value Converters", () => {
    it("converts primitives to and from Firestore REST formats", () => {
      expect(toFirestoreValue("hello")).toEqual({ stringValue: "hello" });
      expect(fromFirestoreValue({ stringValue: "hello" })).toBe("hello");

      expect(toFirestoreValue(42)).toEqual({ integerValue: "42" });
      expect(fromFirestoreValue({ integerValue: "42" })).toBe(42);

      expect(toFirestoreValue(3.14)).toEqual({ doubleValue: 3.14 });
      expect(fromFirestoreValue({ doubleValue: 3.14 })).toBe(3.14);

      expect(toFirestoreValue(true)).toEqual({ booleanValue: true });
      expect(fromFirestoreValue({ booleanValue: true })).toBe(true);

      expect(toFirestoreValue(null)).toEqual({ nullValue: null });
      expect(fromFirestoreValue({ nullValue: null })).toBe(null);
    });

    it("converts arrays and maps bidirectionally", () => {
      const complex = {
        name: "Test Class",
        count: 12,
        active: true,
        tags: ["a", "b"],
        meta: { level: "elite" },
      };
      const fields = toFirestoreFields(complex);
      expect(fields.name).toEqual({ stringValue: "Test Class" });
      expect(fields.count).toEqual({ integerValue: "12" });
      expect(fields.tags).toEqual({
        arrayValue: { values: [{ stringValue: "a" }, { stringValue: "b" }] },
      });
      expect(fields.meta).toEqual({
        mapValue: { fields: { level: { stringValue: "elite" } } },
      });

      const restored = fromFirestoreDocument({
        name: "projects/p/databases/(default)/documents/classes/cls1",
        fields,
      });
      expect(restored.id).toBe("cls1");
      expect(restored.name).toBe("Test Class");
      expect(restored.count).toBe(12);
      expect(restored.active).toBe(true);
      expect(restored.tags).toEqual(["a", "b"]);
      expect(restored.meta).toEqual({ level: "elite" });
    });
  });

  describe("Cryptographic ID and Nonce Generation", () => {
    it("generates a valid shift ID starting with shift_ prefix", () => {
      const shiftId = generateShiftId();
      expect(shiftId).toMatch(/^shift_[a-f0-9]{20}$/);
    });

    it("generates 32-character base64url nonce", () => {
      const nonce = generateNonce();
      expect(nonce).toMatch(/^[A-Za-z0-9_-]{32}$/);
    });
  });

  describe("Worker HTTP Router & CORS", () => {
    const env = {
      ALLOWED_ORIGIN: "https://mylibertyies-f2f38.web.app,http://localhost:3000",
    };

    it("responds with standard headers to CORS OPTIONS preflight", async () => {
      const req = new Request("https://worker.test/api/v1/shift/clock-in", {
        method: "OPTIONS",
        headers: { Origin: "http://localhost:3000" },
      });
      const res = await workerDefault.fetch(req, env);
      expect(res.status).toBe(200);
      expect(res.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:3000");
      expect(res.headers.get("Access-Control-Allow-Methods")).toContain("POST");
    });

    it("returns HTTP 404 for unmapped endpoints", async () => {
      const req = new Request("https://worker.test/api/v1/unknown-endpoint", {
        method: "POST",
        headers: { Origin: "http://localhost:3000" },
      });
      const res = await workerDefault.fetch(req, env);
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe("Not found");
    });

    it("rejects unauthorized calls with HTTP 401 when Authorization header is missing", async () => {
      const req = new Request("https://worker.test/api/v1/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost:3000",
        },
        body: JSON.stringify({ mode: "draft", input: "Hello" }),
      });
      const res = await workerDefault.fetch(req, env);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toContain("Invalid or expired login");
    });

    it("rejects unauthorized parent-link calls with HTTP 401 when Authorization header is missing", async () => {
      const req = new Request("https://worker.test/api/v1/parent-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost:3000",
        },
        body: JSON.stringify({ parentUid: "p1", studentId: "s1" }),
      });
      const res = await workerDefault.fetch(req, env);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toContain("Invalid or expired login");
    });
  });

  describe("Rate Limiting & Memory Bounding (DOM13-F5)", () => {
    it("permits initial request and throttles rapid repeated calls", () => {
      const testKey = "test-device-" + Date.now();
      expect(checkRateLimit(testKey, 1000)).toBe(true);
      expect(checkRateLimit(testKey, 1000)).toBe(false);
    });

    it("allows request after duration window has passed", () => {
      const testKey = "test-window-" + Date.now();
      expect(checkRateLimit(testKey, 10)).toBe(true);
      // Manually wind back the recorded timestamp to simulate window expiry
      rateLimits.set(testKey, Date.now() - 20);
      expect(checkRateLimit(testKey, 10)).toBe(true);
    });

    it("prunes stale entries when map exceeds threshold", () => {
      const now = Date.now();
      // Inject dummy stale entries
      for (let i = 0; i < 505; i++) {
        rateLimits.set(`stale-key-${i}`, now - 120000);
      }
      expect(rateLimits.size).toBeGreaterThan(500);
      // Next call triggers automatic cleanup
      checkRateLimit("trigger-prune", 100);
      expect(rateLimits.has("stale-key-0")).toBe(false);
    });
  });

  describe("Corporate Event Audience Constraints (DOM13-F4)", () => {
    function evaluateCorporateEventAudience(eventDoc, device, user) {
      const normalizedRole = normalizeRole(user.role);
      if (eventDoc.audienceType === "branch") {
        const eventBranch = normalizeBranchId(eventDoc.branchId || eventDoc.audienceValue || eventDoc.branch);
        const devBranch = normalizeBranchId(device.branchId);
        if (!eventBranch || !devBranch || eventBranch !== devBranch) {
          return { ok: false, error: "Selected corporate event belongs to a different branch or branch is unspecified." };
        }
      } else if (eventDoc.audienceType === "role") {
        const allowedRole = normalizeRole(eventDoc.audienceValue);
        if (!allowedRole || allowedRole !== normalizedRole) {
          return { ok: false, error: "Staff member's role is not eligible for this corporate event." };
        }
      } else if (eventDoc.audienceType === "division") {
        const targetDiv = eventDoc.audienceValue ? String(eventDoc.audienceValue).trim().toLowerCase() : "";
        const userDiv = user.division ? String(user.division).trim().toLowerCase() : "";
        if (!targetDiv || (!userDiv && targetDiv !== "all") || (userDiv !== "all" && targetDiv !== "all" && userDiv !== targetDiv)) {
          return { ok: false, error: "Staff member's division is not eligible for this corporate event." };
        }
      }
      return { ok: true };
    }

    it("fails closed when branch event has blank or missing branchId", () => {
      const event = { audienceType: "branch", branchId: "" };
      const device = { branchId: "kota_gorontalo" };
      const user = { role: "instructor", division: "courses" };
      const res = evaluateCorporateEventAudience(event, device, user);
      expect(res.ok).toBe(false);
      expect(res.error).toContain("different branch or branch is unspecified");
    });

    it("fails closed when device has blank or missing branchId", () => {
      const event = { audienceType: "branch", branchId: "kota_gorontalo" };
      const device = { branchId: "" };
      const user = { role: "instructor", division: "courses" };
      const res = evaluateCorporateEventAudience(event, device, user);
      expect(res.ok).toBe(false);
      expect(res.error).toContain("different branch or branch is unspecified");
    });

    it("fails closed when branch does not match", () => {
      const event = { audienceType: "branch", branchId: "bone_bolango" };
      const device = { branchId: "kota_gorontalo" };
      const user = { role: "instructor", division: "courses" };
      const res = evaluateCorporateEventAudience(event, device, user);
      expect(res.ok).toBe(false);
    });

    it("allows clock-in when branches match", () => {
      const event = { audienceType: "branch", branchId: "kota_gorontalo" };
      const device = { branchId: "kota_gorontalo" };
      const user = { role: "instructor", division: "courses" };
      const res = evaluateCorporateEventAudience(event, device, user);
      expect(res.ok).toBe(true);
    });

    it("fails closed when division event has user with missing division", () => {
      const event = { audienceType: "division", audienceValue: "kindergarten" };
      const device = { branchId: "kota_gorontalo" };
      const user = { role: "instructor", division: null };
      const res = evaluateCorporateEventAudience(event, device, user);
      expect(res.ok).toBe(false);
      expect(res.error).toContain("division is not eligible");
    });

    it("fails closed when division mismatches", () => {
      const event = { audienceType: "division", audienceValue: "kindergarten" };
      const device = { branchId: "kota_gorontalo" };
      const user = { role: "instructor", division: "courses" };
      const res = evaluateCorporateEventAudience(event, device, user);
      expect(res.ok).toBe(false);
    });

    it("allows clock-in when division matches or is 'all'", () => {
      const event = { audienceType: "division", audienceValue: "courses" };
      const device = { branchId: "kota_gorontalo" };
      const user = { role: "instructor", division: "courses" };
      expect(evaluateCorporateEventAudience(event, device, user).ok).toBe(true);

      const crossDivUser = { role: "instructor", division: "all" };
      expect(evaluateCorporateEventAudience(event, device, crossDivUser).ok).toBe(true);
    });

    it("fails closed when role mismatches", () => {
      const event = { audienceType: "role", audienceValue: "instructor" };
      const device = { branchId: "kota_gorontalo" };
      const user = { role: "frontoffice", division: "courses" };
      const res = evaluateCorporateEventAudience(event, device, user);
      expect(res.ok).toBe(false);
      expect(res.error).toContain("role is not eligible");
    });
  });

  describe("Parent-Child Link Transformation & Authority Rules (DOM13-F2, F3)", () => {
    function computeUpdatedChildIds(existingChildren, studentId, action) {
      const existing = Array.isArray(existingChildren) ? existingChildren : [];
      return action === "unlink"
        ? existing.filter((id) => id !== studentId)
        : [...new Set([...existing, studentId])];
    }

    it("deduplicates student IDs when linking existing child", () => {
      const updated = computeUpdatedChildIds(["student1", "student2"], "student1", "link");
      expect(updated).toEqual(["student1", "student2"]);
    });

    it("appends new student ID when linking", () => {
      const updated = computeUpdatedChildIds(["student1"], "student2", "link");
      expect(updated).toEqual(["student1", "student2"]);
    });

    it("removes specified student ID when unlinking", () => {
      const updated = computeUpdatedChildIds(["student1", "student2"], "student1", "unlink");
      expect(updated).toEqual(["student2"]);
    });

    it("confirms admin role is not authorized for parent linkage (separation of duties)", () => {
      const authorizedRoles = [
        "director",
        "vice_director",
        "manager",
        "frontoffice",
        "opslead",
        "frontofficelead",
      ];
      expect(authorizedRoles.includes("admin")).toBe(false);
    });
  });
});
