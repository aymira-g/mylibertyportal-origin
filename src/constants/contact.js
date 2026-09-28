/**
 * contact.js
 * Canonical front desk and branch contact configurations.
 */

import { branchToId } from "./branches.js";

export const DEFAULT_WHATSAPP_NUMBER =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_FRONT_DESK_WA) ||
  "628114382345";

export const BRANCH_WHATSAPP_NUMBERS = Object.freeze({
  kota_gorontalo: "628114382345",
  bone_bolango: "6281244445556",
  pohuwato: "6281244445557",
  limboto: "6281244445558",
});

/**
 * Returns the front desk WhatsApp contact number for a given branch.
 * Falls back to DEFAULT_WHATSAPP_NUMBER if branch is unknown or unset.
 *
 * @param {string | null | undefined} branchOrBranchId
 * @returns {string} Digits-only WhatsApp phone number
 */
export function getBranchWhatsAppNumber(branchOrBranchId) {
  if (!branchOrBranchId) return DEFAULT_WHATSAPP_NUMBER;
  const branchId = branchToId(branchOrBranchId);
  return BRANCH_WHATSAPP_NUMBERS[branchId] || DEFAULT_WHATSAPP_NUMBER;
}

/**
 * Generates a wa.me URL with prefilled encoded text for contacting Front Desk.
 *
 * @param {string | null | undefined} branchOrBranchId
 * @param {string} [messageText]
 * @returns {string}
 */
export function buildFrontDeskWhatsAppUrl(branchOrBranchId, messageText = "") {
  const phone = getBranchWhatsAppNumber(branchOrBranchId);
  const clean = String(phone).replace(/\D/g, "");
  const encoded = encodeURIComponent(messageText);
  return `https://wa.me/${clean}?text=${encoded}`;
}
