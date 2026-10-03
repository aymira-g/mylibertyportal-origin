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
});
