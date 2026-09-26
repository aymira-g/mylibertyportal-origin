import { describe, it, expect } from "vitest";
import {
  DEFAULT_WHATSAPP_NUMBER,
  BRANCH_WHATSAPP_NUMBERS,
  getBranchWhatsAppNumber,
  buildFrontDeskWhatsAppUrl,
} from "./contact.js";

describe("contact constants and helpers", () => {
  it("provides valid default WhatsApp number and branch map", () => {
    expect(DEFAULT_WHATSAPP_NUMBER).toBeTruthy();
    expect(DEFAULT_WHATSAPP_NUMBER).toMatch(/^62\d+$/);
    expect(BRANCH_WHATSAPP_NUMBERS.kota_gorontalo).toBe("6281244445555");
  });

  it("resolves branch WhatsApp number by canonical branchId or display name", () => {
    expect(getBranchWhatsAppNumber("kota_gorontalo")).toBe("6281244445555");
    expect(getBranchWhatsAppNumber("Kota Gorontalo")).toBe("6281244445555");
    expect(getBranchWhatsAppNumber("bone_bolango")).toBe("6281244445556");
    expect(getBranchWhatsAppNumber("Bone Bolango")).toBe("6281244445556");
    expect(getBranchWhatsAppNumber("pohuwato")).toBe("6281244445557");
    expect(getBranchWhatsAppNumber("limboto")).toBe("6281244445558");
  });

  it("falls back to default WhatsApp number for unknown or null branch", () => {
    expect(getBranchWhatsAppNumber(null)).toBe(DEFAULT_WHATSAPP_NUMBER);
    expect(getBranchWhatsAppNumber(undefined)).toBe(DEFAULT_WHATSAPP_NUMBER);
    expect(getBranchWhatsAppNumber("unknown_branch")).toBe(DEFAULT_WHATSAPP_NUMBER);
  });

  it("builds properly formatted wa.me URLs with encoded message text", () => {
    const url = buildFrontDeskWhatsAppUrl("Bone Bolango", "Halo Front Desk!");
    expect(url).toBe("https://wa.me/6281244445556?text=Halo%20Front%20Desk!");
  });

  it("handles empty or special character messages safely", () => {
    const emptyUrl = buildFrontDeskWhatsAppUrl("kota_gorontalo");
    expect(emptyUrl).toBe("https://wa.me/6281244445555?text=");

    const specialUrl = buildFrontDeskWhatsAppUrl("kota_gorontalo", "Tanya #1 & #2?");
    expect(specialUrl).toBe("https://wa.me/6281244445555?text=Tanya%20%231%20%26%20%232%3F");
  });
});
