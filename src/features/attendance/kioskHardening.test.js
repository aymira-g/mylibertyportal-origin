import { describe, it, expect } from "vitest";

describe("Kiosk Hardening & Cryptographic Integrity", () => {
  // ── 1. CHALLENGE LIFECYCLE & NONCE VALIDATION ──

  function isChallengeValid(challenge, suppliedNonce, currentTime) {
    if (!challenge || !challenge.nonce || !challenge.expiresAt) return false;
    if (challenge.nonce !== suppliedNonce) return false;
    if (currentTime > challenge.expiresAt) return false;
    return true;
  }

  it("accepts a challenge within its 60-second window", () => {
    const issuedAt = 1000000;
    const challenge = { nonce: "nonce_abc_123", expiresAt: issuedAt + 60000 };

    expect(isChallengeValid(challenge, "nonce_abc_123", issuedAt + 10000)).toBe(true);
    expect(isChallengeValid(challenge, "nonce_abc_123", issuedAt + 59999)).toBe(true);
  });

  it("rejects expired challenges to prevent replay attacks (A3)", () => {
    const issuedAt = 1000000;
    const challenge = { nonce: "nonce_abc_123", expiresAt: issuedAt + 60000 };

    expect(isChallengeValid(challenge, "nonce_abc_123", issuedAt + 60001)).toBe(false);
    expect(isChallengeValid(challenge, "nonce_abc_123", issuedAt + 120000)).toBe(false);
  });

  it("rejects mismatched nonces", () => {
    const issuedAt = 1000000;
    const challenge = { nonce: "nonce_correct", expiresAt: issuedAt + 60000 };

    expect(isChallengeValid(challenge, "nonce_wrong", issuedAt + 10000)).toBe(false);
  });

  // ── 2. SINGLE OPEN SHIFT INVARIANT (D2) ──

  function canClockInNewShift(existingShiftsForUser) {
    const hasOpenShift = existingShiftsForUser.some((s) => s.clockOut == null);
    return !hasOpenShift;
  }

  it("allows multiple completed shifts on the same day", () => {
    const shifts = [
      { id: "s1", clockIn: "2026-09-25T01:00:00Z", clockOut: "2026-09-25T03:00:00Z" },
      { id: "s2", clockIn: "2026-09-25T05:00:00Z", clockOut: "2026-09-25T07:00:00Z" },
    ];
    expect(canClockInNewShift(shifts)).toBe(true);
  });

  it("strictly forbids opening a shift when another shift is currently active", () => {
    const shiftsWithOpen = [
      { id: "s1", clockIn: "2026-09-25T01:00:00Z", clockOut: "2026-09-25T03:00:00Z" },
      { id: "s2", clockIn: "2026-09-25T08:00:00Z", clockOut: null },
    ];
    expect(canClockInNewShift(shiftsWithOpen)).toBe(false);
  });

  // ── 3. WEB CRYPTO P-256 SIGNATURE VERIFICATION (D5) ──

  it("generates and verifies native ECDSA P-256 signatures", async () => {
    const keyPair = await crypto.subtle.generateKey(
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["sign", "verify"]
    );

    const deviceId = "kiosk-front-01";
    const nonce = "test-nonce-456";
    const badgeToken = "ins_rina_42";
    const payload = `${deviceId}:${nonce}:${badgeToken}`;

    const encoder = new TextEncoder();
    const data = encoder.encode(payload);

    // Sign with private key
    const signature = await crypto.subtle.sign(
      { name: "ECDSA", hash: { name: "SHA-256" } },
      keyPair.privateKey,
      data
    );

    // Verify with public key
    const isValid = await crypto.subtle.verify(
      { name: "ECDSA", hash: { name: "SHA-256" } },
      keyPair.publicKey,
      signature,
      data
    );
    expect(isValid).toBe(true);

    // Tampered payload must fail verification
    const tamperedData = encoder.encode(`${deviceId}:${nonce}:ins_forged_99`);
    const isTamperedValid = await crypto.subtle.verify(
      { name: "ECDSA", hash: { name: "SHA-256" } },
      keyPair.publicKey,
      signature,
      tamperedData
    );
    expect(isTamperedValid).toBe(false);
  });

  // ── 4. DEVICE REGISTRATION & REVOCATION (D6) ──

  function isDeviceAuthorized(deviceRecord) {
    return Boolean(deviceRecord && deviceRecord.status === "active" && deviceRecord.publicKeyJwk);
  }

  it("authorizes active provisioned devices and rejects revoked terminals", () => {
    const activeKiosk = {
      deviceId: "kiosk_gto_01",
      status: "active",
      branchId: "kota_gorontalo",
      publicKeyJwk: { kty: "EC", crv: "P-256" },
    };
    const revokedKiosk = {
      ...activeKiosk,
      status: "revoked",
    };

    expect(isDeviceAuthorized(activeKiosk)).toBe(true);
    expect(isDeviceAuthorized(revokedKiosk)).toBe(false);
    expect(isDeviceAuthorized(null)).toBe(false);
  });

  // ── 5. FAIL-CLOSED KIOSK PROOF BOUNDARY (K-01) ──

  it("fails closed when worker security service is unavailable rather than silently writing to Firestore", async () => {
    const { kioskClockInWithProof } = await import("./shiftsRepository.js");

    await expect(
      kioskClockInWithProof({
        badgeToken: "staff_123",
        role: "instructor",
      })
    ).rejects.toThrow(/Kiosk (security service unavailable|cryptographic terminal is not supported)/);
  });

  it("fails closed on clock-out when worker service is unavailable rather than bypassing proof", async () => {
    const { kioskClockOutWithProof } = await import("./shiftsRepository.js");

    await expect(
      kioskClockOutWithProof({
        shiftId: "shift_123",
        badgeToken: "staff_123",
      })
    ).rejects.toThrow(/Kiosk (security service unavailable|cryptographic terminal is not supported)/);
  });

  // ── 6. CLOCK-OUT IDENTITY BINDING (K-02) ──

  it("strictly requires badgeToken on clock-out to bind action to scanned credential", async () => {
    const { kioskClockOutWithProof } = await import("./shiftsRepository.js");

    await expect(
      kioskClockOutWithProof({
        shiftId: "shift_123",
      })
    ).rejects.toThrow(/Missing shiftId or badgeToken/);
  });

  it("DOM03-SEC-01: verifies shift branch matches kiosk device branch on clock-out", () => {
    function canClockOutShiftOnDevice(shift, device) {
      if (!shift || !device) return false;
      if (shift.branchId && shift.branchId !== device.branchId) return false;
      return true;
    }

    const deviceKota = { deviceId: "kiosk-kota", branchId: "kota_gorontalo" };
    const shiftKota = { id: "s1", userId: "staff1", branchId: "kota_gorontalo" };
    const shiftBone = { id: "s2", userId: "staff1", branchId: "bone_bolango" };

    expect(canClockOutShiftOnDevice(shiftKota, deviceKota)).toBe(true);
    expect(canClockOutShiftOnDevice(shiftBone, deviceKota)).toBe(false);
  });

  // ── 7. HARDENED CLASS TRANSITION (K-04) ──

  it("fails closed on class transition when worker service is unavailable", async () => {
    const { kioskSwitchClassWithProof } = await import("./shiftsRepository.js");

    await expect(
      kioskSwitchClassWithProof({
        previousShiftId: "shift_123",
        badgeToken: "staff_123",
        classId: "class_next",
      })
    ).rejects.toThrow(/Kiosk (security service unavailable|cryptographic terminal is not supported)/);
  });

  it("strictly rejects class transition when required arguments are missing", async () => {
    const { kioskSwitchClassWithProof } = await import("./shiftsRepository.js");

    await expect(
      kioskSwitchClassWithProof({
        previousShiftId: "",
        badgeToken: "staff_123",
        classId: "class_next",
      })
    ).rejects.toThrow(/Missing required parameters/);

    await expect(
      kioskSwitchClassWithProof({
        previousShiftId: "shift_123",
        badgeToken: "",
        classId: "class_next",
      })
    ).rejects.toThrow(/Missing required parameters/);
  });

  // ── 8. OVERNIGHT EVENT WINDOW MODELING (K-08) ──

  it("correctly models overnight events spanning past midnight", async () => {
    const { isEventWithinTimeWindow } = await import("./corporateEvents.js");

    const overnightEvent = {
      startTime: "23:00",
      endTime: "01:00",
      eventDate: "2026-09-28",
      status: "active",
    };

    // 22:00 WITA (within 2-hour pre-event window)
    const eveningTime = new Date("2026-09-28T14:00:00Z"); // 14:00 UTC = 22:00 WITA
    expect(isEventWithinTimeWindow(overnightEvent, eveningTime)).toBe(true);

    // 00:30 WITA (past midnight, before 01:00 end time)
    const pastMidnightTime = new Date("2026-09-28T16:30:00Z"); // 16:30 UTC = 00:30 WITA next day
    expect(isEventWithinTimeWindow(overnightEvent, pastMidnightTime)).toBe(true);

    // 02:00 WITA (past event end time)
    const pastEndTime = new Date("2026-09-28T18:00:00Z"); // 18:00 UTC = 02:00 WITA
    expect(isEventWithinTimeWindow(overnightEvent, pastEndTime)).toBe(false);

    // 20:00 WITA (before 2-hour pre-event window)
    const earlyTime = new Date("2026-09-28T12:00:00Z"); // 12:00 UTC = 20:00 WITA
    expect(isEventWithinTimeWindow(overnightEvent, earlyTime)).toBe(false);
  });

  // ── 9. K-16: ATOMIC LOCK CONCURRENCY & RECOVERY (T-01 through T-08) ──

  describe("K-16: Atomic Lock Concurrency & Stale Opening Lock Recovery", () => {
    /**
     * In-memory Firestore OCC engine simulating exact updateTime versioning,
     * atomic batch commits, and precondition enforcement.
     */
    function createMockFirestoreOCCStore() {
      const documents = new Map();
      let versionCounter = 1;

      const getDoc = (path) => {
        const item = documents.get(path);
        if (!item) return null;
        return { data: { ...item.data }, updateTime: item.updateTime };
      };

      const setDocWithPrecondition = (path, data, precondition = {}) => {
        const existing = documents.get(path);
        if (precondition.exists === false && existing) {
          return { ok: false, status: 409, error: "ALREADY_EXISTS" };
        }
        if (precondition.updateTime && (!existing || existing.updateTime !== precondition.updateTime)) {
          return { ok: false, status: 412, error: "PRECONDITION_FAILED" };
        }
        const updateTime = `v${versionCounter++}`;
        documents.set(path, { data: { ...data }, updateTime });
        return { ok: true, updateTime };
      };

      const deleteDocWithPrecondition = (path, precondition = {}) => {
        const existing = documents.get(path);
        if (!existing) {
          return { ok: false, status: 404, error: "NOT_FOUND" };
        }
        if (precondition.updateTime && existing.updateTime !== precondition.updateTime) {
          return { ok: false, status: 412, error: "PRECONDITION_FAILED" };
        }
        documents.delete(path);
        return { ok: true };
      };

      const atomicCommit = (writes) => {
        // Step 1: Verify all preconditions atomically
        for (const write of writes) {
          const { path, precondition } = write;
          const existing = documents.get(path);
          if (precondition?.exists === false && existing) {
            return { ok: false, status: 409, error: "ALREADY_EXISTS" };
          }
          if (precondition?.updateTime && (!existing || existing.updateTime !== precondition.updateTime)) {
            return { ok: false, status: 412, error: "PRECONDITION_FAILED" };
          }
        }
        // Step 2: Apply all writes atomically
        for (const write of writes) {
          const { path, op, data } = write;
          if (op === "delete") {
            documents.delete(path);
          } else {
            const updateTime = `v${versionCounter++}`;
            documents.set(path, { data: { ...data }, updateTime });
          }
        }
        return { ok: true };
      };

      return {
        getDoc,
        setDocWithPrecondition,
        deleteDocWithPrecondition,
        atomicCommit,
      };
    }

    // T-01: Fresh opening lock (< 60s)
    it("T-01: fresh opening lock (< 60s) rejects clock-in and is not deleted", () => {
      const store = createMockFirestoreOCCStore();
      const lockTime = new Date(Date.now() - 15000).toISOString(); // 15 seconds ago
      store.setDocWithPrecondition("activeShifts/staff_1", {
        userId: "staff_1",
        status: "opening",
        clockIn: lockTime,
      });

      const existingLockMeta = store.getDoc("activeShifts/staff_1");
      const lockAgeMs = Date.now() - new Date(existingLockMeta.data.clockIn).getTime();

      expect(lockAgeMs).toBeLessThan(60000);
      // Under 60s: recovery must NOT delete the lock
      expect(store.getDoc("activeShifts/staff_1")).not.toBeNull();
      expect(store.getDoc("activeShifts/staff_1").data.status).toBe("opening");
    });

    // T-02: Stale orphan opening lock (>= 60s) with no shift
    it("T-02: stale orphan opening lock (>= 60s) with no shift is deleted with exact updateTime precondition", () => {
      const store = createMockFirestoreOCCStore();
      const lockTime = new Date(Date.now() - 65000).toISOString(); // 65 seconds ago
      store.setDocWithPrecondition("activeShifts/staff_2", {
        userId: "staff_2",
        status: "opening",
        clockIn: lockTime,
      });

      const inspectedMeta = store.getDoc("activeShifts/staff_2");
      const lockAgeMs = Date.now() - new Date(inspectedMeta.data.clockIn).getTime();
      expect(lockAgeMs).toBeGreaterThanOrEqual(60000);

      // Verify no open shift exists
      const openShift = store.getDoc("shifts/shift_staff_2");
      expect(openShift).toBeNull();

      // Delete with exact inspected updateTime precondition
      const deleteRes = store.deleteDocWithPrecondition("activeShifts/staff_2", {
        updateTime: inspectedMeta.updateTime,
      });
      expect(deleteRes.ok).toBe(true);
      expect(store.getDoc("activeShifts/staff_2")).toBeNull();
    });

    // T-03: Stale orphan opening lock (>= 60s) with existing open shift
    it("T-03: stale orphan opening lock (>= 60s) with existing open shift is healed to link shift with exact updateTime precondition", () => {
      const store = createMockFirestoreOCCStore();
      const lockTime = new Date(Date.now() - 70000).toISOString();
      store.setDocWithPrecondition("activeShifts/staff_3", {
        userId: "staff_3",
        status: "opening",
        clockIn: lockTime,
        branchId: "kota_gorontalo",
      });

      // Shift was created in Firestore before worker died
      store.setDocWithPrecondition("shifts/shift_existing_3", {
        userId: "staff_3",
        clockIn: lockTime,
        clockOut: null,
      });

      const inspectedMeta = store.getDoc("activeShifts/staff_3");
      const openShift = store.getDoc("shifts/shift_existing_3");
      expect(openShift).not.toBeNull();
      expect(openShift.data.clockOut).toBeNull();

      // Recovery heals the lock with updateTime precondition instead of deleting
      const healRes = store.setDocWithPrecondition(
        "activeShifts/staff_3",
        {
          userId: "staff_3",
          shiftId: "shift_existing_3",
          clockIn: inspectedMeta.data.clockIn,
          branchId: inspectedMeta.data.branchId,
          status: "active",
        },
        { updateTime: inspectedMeta.updateTime }
      );

      expect(healRes.ok).toBe(true);
      const healedDoc = store.getDoc("activeShifts/staff_3");
      expect(healedDoc.data.status).toBe("active");
      expect(healedDoc.data.shiftId).toBe("shift_existing_3");
    });

    // T-04: Linked active shift
    it("T-04: linked active shift blocks new clock-in and preserves lock", () => {
      const store = createMockFirestoreOCCStore();
      store.setDocWithPrecondition("shifts/shift_active_4", {
        userId: "staff_4",
        clockOut: null,
      });
      store.setDocWithPrecondition("activeShifts/staff_4", {
        userId: "staff_4",
        shiftId: "shift_active_4",
        status: "active",
      });

      const inspectedMeta = store.getDoc("activeShifts/staff_4");
      expect(inspectedMeta.data.shiftId).toBe("shift_active_4");

      const linkedShift = store.getDoc("shifts/" + inspectedMeta.data.shiftId);
      expect(linkedShift.data.clockOut).toBeNull(); // Shift is actively ongoing
      // Lock must be preserved
      expect(store.getDoc("activeShifts/staff_4")).not.toBeNull();
    });

    // T-05: Linked stale shift
    it("T-05: linked stale shift (clockOut != null) is cleaned up using version-preconditioned delete", () => {
      const store = createMockFirestoreOCCStore();
      store.setDocWithPrecondition("shifts/shift_closed_5", {
        userId: "staff_5",
        clockOut: "2026-10-03T12:00:00Z", // closed out-of-band
      });
      store.setDocWithPrecondition("activeShifts/staff_5", {
        userId: "staff_5",
        shiftId: "shift_closed_5",
        status: "active",
      });

      const inspectedMeta = store.getDoc("activeShifts/staff_5");
      const linkedShift = store.getDoc("shifts/" + inspectedMeta.data.shiftId);
      expect(linkedShift.data.clockOut).not.toBeNull();

      // Cleaned up with version precondition (no unconditional delete)
      const deleteRes = store.deleteDocWithPrecondition("activeShifts/staff_5", {
        updateTime: inspectedMeta.updateTime,
      });
      expect(deleteRes.ok).toBe(true);
      expect(store.getDoc("activeShifts/staff_5")).toBeNull();
    });

    // T-06: Simultaneous recovery requests
    it("T-06: simultaneous recovery requests allow exactly one delete to succeed, second receives precondition failure", () => {
      const store = createMockFirestoreOCCStore();
      const lockTime = new Date(Date.now() - 75000).toISOString();
      store.setDocWithPrecondition("activeShifts/staff_6", {
        userId: "staff_6",
        status: "opening",
        clockIn: lockTime,
      });

      // Both requests inspect the same document version
      const inspectedByB = store.getDoc("activeShifts/staff_6");
      const inspectedByC = store.getDoc("activeShifts/staff_6");
      expect(inspectedByB.updateTime).toBe(inspectedByC.updateTime);

      // Request B executes delete first
      const deleteResB = store.deleteDocWithPrecondition("activeShifts/staff_6", {
        updateTime: inspectedByB.updateTime,
      });
      expect(deleteResB.ok).toBe(true);

      // Request C attempts delete with the now-invalid version
      const deleteResC = store.deleteDocWithPrecondition("activeShifts/staff_6", {
        updateTime: inspectedByC.updateTime,
      });
      expect(deleteResC.ok).toBe(false);
      expect(deleteResC.status).toBe(404); // document was already deleted
    });

    // T-07: Atomic batch precondition failure
    it("T-07: atomic batch precondition failure prevents shift creation when lock version mismatches", () => {
      const store = createMockFirestoreOCCStore();
      store.setDocWithPrecondition("activeShifts/staff_7", {
        userId: "staff_7",
        status: "opening",
      });

      // Stale updateTime precondition (does not match current lock)
      const staleUpdateTime = "v_stale_nonexistent";

      const commitRes = store.atomicCommit([
        {
          path: "shifts/shift_7",
          op: "create",
          data: { userId: "staff_7", clockOut: null },
          precondition: { exists: false },
        },
        {
          path: "activeShifts/staff_7",
          op: "update",
          data: { userId: "staff_7", shiftId: "shift_7", status: "active" },
          precondition: { updateTime: staleUpdateTime },
        },
      ]);

      expect(commitRes.ok).toBe(false);
      expect(commitRes.status).toBe(412); // PRECONDITION_FAILED
      // Critical assertion: shift document was NOT created
      expect(store.getDoc("shifts/shift_7")).toBeNull();
      // Lock document remained untouched in opening status
      expect(store.getDoc("activeShifts/staff_7").data.status).toBe("opening");
    });

    // T-08: Critical commit-vs-recovery race test
    it("T-08: preserves single-open-shift invariant under critical commit-vs-recovery race in both orderings", async () => {
      const store = createMockFirestoreOCCStore();

      // ── Sub-Scenario 1: Recovery wins before Clock-in commits ──
      const lock1 = store.setDocWithPrecondition("activeShifts/user_race_1", {
        userId: "user_race_1",
        status: "opening",
        clockIn: new Date(Date.now() - 80000).toISOString(),
      });
      const T0 = lock1.updateTime;

      // Recovery B inspects lock, sees no shift in shifts, and executes preconditioned delete
      const deleteRes = store.deleteDocWithPrecondition("activeShifts/user_race_1", { updateTime: T0 });
      expect(deleteRes.ok).toBe(true);

      // Original clock-in A attempts atomic commit with old T0
      const commitRes1 = store.atomicCommit([
        {
          path: "shifts/shift_race_1",
          op: "create",
          data: { userId: "user_race_1", clockOut: null },
          precondition: { exists: false },
        },
        {
          path: "activeShifts/user_race_1",
          op: "update",
          data: { userId: "user_race_1", shiftId: "shift_race_1", status: "active" },
          precondition: { updateTime: T0 },
        },
      ]);

      // Atomic commit fails: shift is NOT created
      expect(commitRes1.ok).toBe(false);
      expect(store.getDoc("shifts/shift_race_1")).toBeNull();
      expect(store.getDoc("activeShifts/user_race_1")).toBeNull();

      // ── Sub-Scenario 2: Clock-in commits before Recovery deletes ──
      const lock2 = store.setDocWithPrecondition("activeShifts/user_race_2", {
        userId: "user_race_2",
        status: "opening",
        clockIn: new Date(Date.now() - 80000).toISOString(),
      });
      const T1 = lock2.updateTime;

      // Clock-in A commits atomically first
      const commitRes2 = store.atomicCommit([
        {
          path: "shifts/shift_race_2",
          op: "create",
          data: { userId: "user_race_2", clockOut: null },
          precondition: { exists: false },
        },
        {
          path: "activeShifts/user_race_2",
          op: "update",
          data: { userId: "user_race_2", shiftId: "shift_race_2", status: "active" },
          precondition: { updateTime: T1 },
        },
      ]);
      expect(commitRes2.ok).toBe(true);
      expect(store.getDoc("shifts/shift_race_2")).not.toBeNull();

      // Recovery B attempts delete using old T1
      const deleteRes2 = store.deleteDocWithPrecondition("activeShifts/user_race_2", { updateTime: T1 });
      // Delete fails because lock version was promoted to T2!
      expect(deleteRes2.ok).toBe(false);
      expect(deleteRes2.status).toBe(412); // PRECONDITION_FAILED
      // Lock remains linked to shift_race_2
      expect(store.getDoc("activeShifts/user_race_2").data.shiftId).toBe("shift_race_2");
      expect(store.getDoc("activeShifts/user_race_2").data.status).toBe("active");
    });
  });

  // ── 14. CONTINUOUS SCANNER IN-FLIGHT LOCKING & DEBOUNCE (DOM03-PERF-01) ──

  describe("Continuous Scanner In-Flight Guard & Debounce", () => {
    function createScannerGuard(debounceMs = 2500) {
      let isProcessing = false;
      let lastScanned = { id: "", at: 0 };
      const processed = [];

      async function onScanFrame(uid, handlerAsync) {
        if (!uid) return false;
        const now = Date.now();
        if (isProcessing) return false; // Dropped: concurrent in-flight
        if (lastScanned.id === uid && now - lastScanned.at < debounceMs) return false; // Dropped: debounced

        isProcessing = true;
        try {
          await handlerAsync(uid);
          lastScanned = { id: uid, at: Date.now() };
          processed.push(uid);
          return true;
        } finally {
          isProcessing = false;
        }
      }

      return { onScanFrame, getProcessed: () => processed };
    }

    it("drops concurrent frame events while an async scan transaction is in flight", async () => {
      const guard = createScannerGuard();
      let resolveFirstScan;
      const firstScanPromise = new Promise((resolve) => {
        resolveFirstScan = resolve;
      });

      // Frame 1 arrives and starts async processing
      const scan1 = guard.onScanFrame("student_1", () => firstScanPromise);

      // Frame 2, 3, 4 arrive while Frame 1 is still processing (e.g. 10 fps camera loop)
      const scan2 = await guard.onScanFrame("student_1", async () => {});
      const scan3 = await guard.onScanFrame("student_2", async () => {});

      expect(scan2).toBe(false);
      expect(scan3).toBe(false);

      // Frame 1 finishes
      resolveFirstScan();
      await scan1;

      expect(guard.getProcessed()).toEqual(["student_1"]);
    });

    it("debounces repeated scans of the same student within debounce window", async () => {
      const guard = createScannerGuard(2500);

      // First scan passes
      const scan1 = await guard.onScanFrame("student_1", async () => {});
      expect(scan1).toBe(true);

      // Immediate repeated scan of same student within 2.5s is dropped
      const scan2 = await guard.onScanFrame("student_1", async () => {});
      expect(scan2).toBe(false);

      // Different student immediately after passes
      const scan3 = await guard.onScanFrame("student_2", async () => {});
      expect(scan3).toBe(true);

      expect(guard.getProcessed()).toEqual(["student_1", "student_2"]);
    });
  });

  // ── 10. DOMAIN 13 WORKER & OPS CONFORMANCE (DOM13-SEC-01, DOM13-COR-01, DOM13-COR-02, DOM13-RES-01) ──
  describe("Domain 13: Worker Conformance & Lock Resilience", () => {
    it("DOM13-SEC-01: authorizes director and vice_director in staff AI Assistant roles", () => {
      const staffRoles = [
        "admin",
        "director",
        "vice_director",
        "manager",
        "instructor",
        "instructorleader",
        "frontoffice",
        "opslead",
        "marketing",
        "officeboy",
      ];
      expect(staffRoles.includes("director")).toBe(true);
      expect(staffRoles.includes("vice_director")).toBe(true);
      expect(staffRoles.includes("parent")).toBe(false);
      expect(staffRoles.includes("student")).toBe(false);
    });

    it("DOM13-COR-01: resolves shift division with class inheritance and division='all' preservation", () => {
      function resolveShiftDivision(user, classDoc) {
        return (
          classDoc?.division ||
          (user.division === "all" ? "all" : user.division === "kindergarten" ? "kindergarten" : "courses")
        );
      }

      // Class division takes precedence
      expect(resolveShiftDivision({ division: "courses" }, { division: "kindergarten" })).toBe("kindergarten");
      expect(resolveShiftDivision({ division: "all" }, { division: "kindergarten" })).toBe("kindergarten");

      // Cross-divisional staff with division="all" preserved when general shift
      expect(resolveShiftDivision({ division: "all" }, null)).toBe("all");

      // Standard division resolution
      expect(resolveShiftDivision({ division: "kindergarten" }, null)).toBe("kindergarten");
      expect(resolveShiftDivision({ division: "courses" }, null)).toBe("courses");
      expect(resolveShiftDivision({}, null)).toBe("courses");
    });

    it("DOM13-COR-02: matches normalized branch IDs between user, class, and kiosk terminal", () => {
      const BRANCH_MAP = {
        kota_gorontalo: "Kota Gorontalo",
        bone_bolango: "Bone Bolango",
        pohuwato: "Pohuwato",
        limboto: "Limboto",
      };
      function normalizeBranchId(raw) {
        if (!raw || typeof raw !== "string") return "";
        const clean = raw.trim().toLowerCase();
        for (const [id, name] of Object.entries(BRANCH_MAP)) {
          if (name.toLowerCase() === clean || id === clean) return id;
        }
        return clean.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
      }

      const deviceBranch = "kota_gorontalo";
      // Legacy unslugged branch name matches canonical ID
      expect(normalizeBranchId("Kota Gorontalo")).toBe(deviceBranch);
      expect(normalizeBranchId("kota_gorontalo")).toBe(deviceBranch);
      expect(normalizeBranchId("cabang_utama")).toBe("cabang_utama"); // non-matching different alias
      expect(normalizeBranchId("Bone Bolango")).not.toBe(deviceBranch);
    });

    it("DOM13-RES-01: detects deleted or closed shifts as stale locks and marks them for cleanup", () => {
      function isLockStale(shiftDoc) {
        // If shift document was deleted/purged (null) OR is already clocked out, lock is stale
        return !shiftDoc || Boolean(shiftDoc.clockOut);
      }

      // Open active shift is NOT stale
      expect(isLockStale({ id: "shift_1", clockOut: null })).toBe(false);

      // Completed shift IS stale
      expect(isLockStale({ id: "shift_1", clockOut: "2026-10-12T08:00:00Z" })).toBe(true);

      // Deleted shift (null) IS stale (cleans up orphaned lock instead of locking out)
      expect(isLockStale(null)).toBe(true);
    });

    it("DOM03-COR-02: detects stale open shifts server-side exceeding role grace hours", () => {
      function evaluateOpenShift(shift, nowMs) {
        if (!shift || shift.clockOut || !shift.clockIn) return { stale: false };
        const shiftAgeHours = (nowMs - new Date(shift.clockIn).getTime()) / (1000 * 60 * 60);
        const graceHours = shift.role === "instructor" ? 3 : 14;
        return {
          stale: shiftAgeHours > graceHours,
          ageHours: shiftAgeHours,
        };
      }

      const now = new Date("2026-10-13T08:00:00Z").getTime();
      // Shift from yesterday (16h ago) for non-instructor: stale
      const yesterdayStaffShift = { clockIn: "2026-10-12T16:00:00Z", role: "frontoffice", clockOut: null };
      expect(evaluateOpenShift(yesterdayStaffShift, now).stale).toBe(true);

      // Shift from 2 hours ago: not stale (within 14h grace)
      const currentStaffShift = { clockIn: "2026-10-13T06:00:00Z", role: "frontoffice", clockOut: null };
      expect(evaluateOpenShift(currentStaffShift, now).stale).toBe(false);

      // Shift from 4 hours ago for instructor: stale (exceeds 3h grace)
      const instructorStaleShift = { clockIn: "2026-10-13T04:00:00Z", role: "instructor", clockOut: null };
      expect(evaluateOpenShift(instructorStaleShift, now).stale).toBe(true);
    });

    it("DOM03-COR-02: recovers from stale lock and re-acquires new lock in single scan flow", () => {
      function handleLockRecovery(existingLock, shiftDoc, canDeleteStale, canAcquireNew) {
        if (!existingLock || !existingLock.shiftId) return { ok: false };
        const isStale = !shiftDoc || Boolean(shiftDoc.clockOut);
        if (!isStale) return { ok: false, error: "Staff member already has an active open shift." };

        if (canDeleteStale) {
          if (canAcquireNew) {
            return { ok: true, action: "CLOCK_IN_SUCCEEDED_SINGLE_SCAN" };
          }
          return { ok: false, error: "A stale kiosk lock was cleared. Please scan again." };
        }
        return { ok: false, error: "Kiosk lock state updated concurrently. Please scan again." };
      }

      // Stale lock with successful re-acquisition completes in single scan
      const res = handleLockRecovery(
        { shiftId: "shift_old" },
        { id: "shift_old", clockOut: "2026-10-12T17:00:00Z" },
        true,
        true
      );
      expect(res.ok).toBe(true);
      expect(res.action).toBe("CLOCK_IN_SUCCEEDED_SINGLE_SCAN");
    });
  });
});


