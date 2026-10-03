import { beforeEach, describe, expect, it, vi } from "vitest";
import { fake } from "../../test/firestoreFake.js";
import {
  createCorporateEvent,
  updateCorporateEvent,
  cancelCorporateEvent,
  fetchActiveCorporateEventsForDate,
  fetchCorporateEvents,
  subscribeCorporateEvents,
} from "./corporateEventsRepository.js";

vi.mock(
  "firebase/firestore",
  async () => (await import("../../test/firestoreFake.js")).firestoreModule
);
vi.mock("../../firebase", () => ({ db: {}, auth: {} }));

beforeEach(() => fake.reset());

describe("corporateEventsRepository", () => {
  describe("createCorporateEvent", () => {
    it("creates an active corporate event with normalized data", async () => {
      await createCorporateEvent(
        {
          name: "Annual Gathering",
          eventDate: "2026-10-15",
          audienceType: "all",
        },
        "admin-1"
      );

      const op = fake.opsOf("add")[0];
      expect(op.path.startsWith("corporateEvents/")).toBe(true);
      expect(op.data).toMatchObject({
        name: "Annual Gathering",
        eventDate: "2026-10-15",
        audienceType: "all",
        audienceValue: null,
        status: "active",
        createdBy: "admin-1",
      });
    });

    it("normalizes branch audience on creation", async () => {
      await createCorporateEvent(
        {
          name: "Campus Workshop",
          eventDate: "2026-10-15",
          audienceType: "branch",
          audienceValue: "cabang utama",
        },
        "admin-1"
      );

      const op = fake.opsOf("add")[0];
      expect(op.data.audienceValue).toBe("Kota Gorontalo");
      expect(op.data.branchId).toBe("kota_gorontalo");
      expect(op.data.branch).toBe("Kota Gorontalo");
    });

    it("rejects invalid event payload via schema", () => {
      expect(() =>
        createCorporateEvent(
          {
            name: "",
            eventDate: "invalid-date",
            audienceType: "all",
          },
          "admin-1"
        )
      ).toThrow();
    });
  });

  describe("updateCorporateEvent", () => {
    it("updates event fields", async () => {
      await updateCorporateEvent("evt-123", { name: "Updated Name" });
      const op = fake.find("corporateEvents/evt-123");
      expect(op.data).toMatchObject({
        name: "Updated Name",
      });
    });
  });

  describe("cancelCorporateEvent", () => {
    it("soft-cancels an event without deleting it", async () => {
      await cancelCorporateEvent("evt-123", "admin-uid");
      const op = fake.find("corporateEvents/evt-123");
      expect(op.data).toMatchObject({
        status: "cancelled",
        cancelledBy: "admin-uid",
      });
    });
  });

  describe("query split and branch isolation", () => {
    beforeEach(() => {
      fake.seed("corporateEvents", [
        {
          id: "evt-all",
          name: "Company Wide Assembly",
          eventDate: "2026-10-15",
          audienceType: "all",
          status: "active",
        },
        {
          id: "evt-gto",
          name: "Kota Workshop",
          eventDate: "2026-10-15",
          audienceType: "branch",
          branchId: "kota_gorontalo",
          status: "active",
        },
        {
          id: "evt-boba",
          name: "Bone Bolango Retreat",
          eventDate: "2026-10-15",
          audienceType: "branch",
          branchId: "bone_bolango",
          status: "active",
        },
      ]);
    });

    it("fetchActiveCorporateEventsForDate returns company-wide and branch-scoped events for branch staff", async () => {
      const events = await fetchActiveCorporateEventsForDate("2026-10-15", "kota_gorontalo");
      const ids = events.map((e) => e.id);
      expect(ids).toContain("evt-all");
      expect(ids).toContain("evt-gto");
      expect(ids).not.toContain("evt-boba");
    });

    it("fetchActiveCorporateEventsForDate returns only company-wide events if no branch resolved", async () => {
      const events = await fetchActiveCorporateEventsForDate("2026-10-15", null);
      const ids = events.map((e) => e.id);
      expect(ids).toContain("evt-all");
      expect(ids).not.toContain("evt-gto");
      expect(ids).not.toContain("evt-boba");
    });

    it("fetchCorporateEvents merges and sorts events for branch staff", async () => {
      const events = await fetchCorporateEvents("kota_gorontalo");
      const ids = events.map((e) => e.id);
      expect(ids).toContain("evt-all");
      expect(ids).toContain("evt-gto");
      expect(ids).not.toContain("evt-boba");
    });

    it("subscribeCorporateEvents invokes onData with merged results and unsubscribes cleanly", () => {
      let received = [];
      const unsub = subscribeCorporateEvents(
        (data) => {
          received = data;
        },
        null,
        "kota_gorontalo"
      );

      expect(received.map((e) => e.id)).toContain("evt-all");
      expect(received.map((e) => e.id)).toContain("evt-gto");
      expect(received.map((e) => e.id)).not.toContain("evt-boba");
      expect(typeof unsub).toBe("function");
      unsub();
    });
  });
});
