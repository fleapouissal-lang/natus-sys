import test from "node:test";
import assert from "node:assert/strict";

function promoDiscountAmount(subtotalAfterLoyalty, discountPercent) {
  if (subtotalAfterLoyalty <= 0 || discountPercent <= 0) return 0;
  return Math.round(subtotalAfterLoyalty * (discountPercent / 100) * 100) / 100;
}

function checkoutTotal(subtotal, loyaltyDiscount, promo) {
  const afterLoyalty = Math.max(0, subtotal - loyaltyDiscount);
  const promoOff = promo ? promoDiscountAmount(afterLoyalty, promo.discountPercent) : 0;
  return Math.max(0, Math.round((afterLoyalty - promoOff) * 100) / 100);
}

function looksLikePromoCode(input) {
  const raw = input.trim();
  if (!raw || raw.length < 4) return false;
  if (/^0\d{9}$/.test(raw)) return false;
  if (/^\+?212\d{8,9}$/.test(raw.replace(/\s/g, ""))) return false;
  if (/^FID-/i.test(raw)) return false;
  if (raw.includes(":")) return false;
  const t = raw.toUpperCase();
  if (/^NATUS-[A-Z0-9]{4,10}$/.test(t)) return true;
  if (/^[A-Z][A-Z0-9]{3,11}$/.test(t) && /[A-Z]/.test(t) && /\d/.test(t)) return true;
  return false;
}

test("promoDiscountAmount 10% on 100", () => {
  assert.equal(promoDiscountAmount(100, 10), 10);
});

test("checkoutTotal stacks loyalty then promo", () => {
  assert.equal(
    checkoutTotal(200, 20, { discountPercent: 10 }),
    162
  );
});

test("looksLikePromoCode detects store and winback codes", () => {
  assert.equal(looksLikePromoCode("NATUS10"), true);
  assert.equal(looksLikePromoCode("MEDINA10"), true);
  assert.equal(looksLikePromoCode("NATUS-K5QJ7B"), true);
});

test("looksLikePromoCode rejects phone numbers", () => {
  assert.equal(looksLikePromoCode("0719750914"), false);
});
