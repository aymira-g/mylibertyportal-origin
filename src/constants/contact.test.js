import { describe, it, expect } from "vitest";
import {
  DEFAULT_WHATSAPP_NUMBER,
  BRANCH_WHATSAPP_NUMBERS,
  getBranchWhatsAppNumber,
  buildFrontDeskWhatsAppUrl,
} from "./contact.js";

describe("contact constants and helpers", () => {
  it("provides valid default WhatsApp number and branch map", () => {
    expect(DEFAULT_WHATSAPP_NUMBER).toBe("628114382345");
    expect(DEFAULT_WHATSAPP_NUMBER).toMatch(/^62\d+$/);
    expect(BRANCH_WHATSAPP_NUMBERS.kota_gorontalo).toBe("628114382345");
  });

  it("resolves branch WhatsApp number by canonical branchId or display name", () => {
    expect(getBranchWhatsAppNumber("kota_gorontalo")).toBe("628114382345");
    expect(getBranchWhatsAppNumber("Kota Gorontalo")).toBe("628114382345");
    expect(getBranchWhatsAppNumber("bone_bolango")).toBe("628114382345");
    expect(getBranchWhatsAppNumber("Bone Bolango")).toBe("628114382345");
    expect(getBranchWhatsAppNumber("pohuwato")).toBe("628114382345");
    expect(getBranchWhatsAppNumber("limboto")).toBe("628114382345");
  });

  it("falls back to default WhatsApp number for unknown or null branch", () => {
    expect(getBranchWhatsAppNumber(null)).toBe("628114382345");
    expect(getBranchWhatsAppNumber(undefined)).toBe("628114382345");
    expect(getBranchWhatsAppNumber("unknown_branch")).toBe("628114382345");
  });

  it("builds properly formatted wa.me URLs with encoded message text", () => {
    const url = buildFrontDeskWhatsAppUrl("Bone Bolango", "Halo Front Desk!");
    expect(url).toBe("https://wa.me/628114382345?text=Halo%20Front%20Desk!");
  });

  it("handles empty or special character messages safely", () => {
    const emptyUrl = buildFrontDeskWhatsAppUrl("kota_gorontalo");
    expect(emptyUrl).toBe("https://wa.me/628114382345?text=");

    const specialUrl = buildFrontDeskWhatsAppUrl("kota_gorontalo", "Tanya #1 & #2?");
    expect(specialUrl).toBe("https://wa.me/628114382345?text=Tanya%20%231%20%26%20%232%3F");
  });
});
