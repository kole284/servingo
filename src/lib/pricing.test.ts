import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { SERVINGO_DRINKS } from "./menu";
import { commission, companyFee, priceBills, promoDiscount } from "./pricing";

const fees = { deliveryFee: 400, platformFee: 150, deliveryMinimum: 4000 };
const dish = (price: number, quantity: number, restaurantId = "bistro") => ({
  item: { price, restaurantId },
  quantity,
  restaurantId,
  restaurantName: restaurantId,
});
const drink = (price: number, quantity: number) => ({
  item: { price, restaurantId: SERVINGO_DRINKS },
  quantity,
  restaurantId: "bistro",
  restaurantName: "bistro",
});
const delivered = { method: "dostava" as const, cityOk: true };

describe("priceBills without a deal", () => {
  test("a delivered restaurant bill pays delivery and the platform fee", () => {
    const { bills, total, originalTotal, discount } = priceBills([dish(5000, 1)], fees, delivered);
    assert.equal(bills[0].total, 5000 + 400 + 150);
    assert.equal(total, 5550);
    assert.equal(originalTotal, total);
    assert.equal(discount, 0);
  });

  test("drinks get their own bill with no platform fee", () => {
    const { bills } = priceBills([dish(5000, 1), drink(300, 2)], fees, delivered);
    assert.equal(bills.length, 2);
    assert.equal(bills[1].drinks, true);
    assert.equal(bills[1].platformFee, 0);
  });
});

describe("priceBills with a promo code", () => {
  const deal = { kind: "promo" as const, code: "MARKO", percent: 3 };

  test("delivery and the platform fee are free, the items 3 % cheaper", () => {
    const { bills, total, originalTotal, discount } = priceBills([dish(5000, 1)], fees, { ...delivered, deal });
    assert.equal(bills[0].deliveryFee, 0);
    assert.equal(bills[0].platformFee, 0);
    assert.equal(bills[0].baseDeliveryFee, 400);
    assert.equal(bills[0].basePlatformFee, 150);
    assert.equal(bills[0].discount, 150);
    assert.equal(total, 4850);
    assert.equal(originalTotal, 5550);
    assert.equal(discount, 150);
  });

  test("the order's discount is the sum of each bill's", () => {
    const { bills, discount, total, originalTotal } = priceBills(
      [dish(5000, 1), dish(4100, 1, "torte"), drink(333, 3)],
      fees,
      { ...delivered, deal },
    );
    assert.equal(discount, bills.reduce((sum, bill) => sum + bill.discount, 0));
    assert.equal(total, originalTotal - discount - bills.reduce((s, b) => s + b.baseDeliveryFee + b.basePlatformFee, 0));
  });

  test("the minimum for delivery still applies", () => {
    const { bills } = priceBills([dish(1000, 1)], fees, { ...delivered, deal });
    assert.equal(bills[0].delivery, false);
    assert.equal(bills[0].pickupReason, "minimum");
  });
});

describe("promoDiscount", () => {
  test("whole dinars, never more than the items", () => {
    for (const subtotal of [0, 1, 17, 333, 4999, 5000, 123457]) {
      for (const percent of [0, 3, 10, 100]) {
        const value = promoDiscount(subtotal, percent);
        assert.ok(Number.isInteger(value), `${subtotal} × ${percent} %`);
        assert.ok(value >= 0 && value <= subtotal, `${subtotal} × ${percent} %`);
      }
    }
  });

  test("an exact percentage stays exact", () => {
    assert.equal(promoDiscount(5000, 3), 150);
    assert.equal(promoDiscount(5000, 0), 0);
    assert.equal(promoDiscount(5000, 100), 5000);
  });
});

describe("company on invoice", () => {
  test("pays its percentage of the items on every bill instead of the flat fee", () => {
    const deal = { kind: "company" as const, feePercent: 5 };
    const { bills, total, originalTotal } = priceBills([dish(5000, 1), drink(1000, 1)], fees, { ...delivered, deal });
    assert.equal(bills[0].platformFee, 250);
    assert.equal(bills[1].platformFee, 50);
    assert.equal(bills[0].deliveryFee, 400);
    // A company's price is not a discount: nothing is struck through.
    assert.equal(originalTotal, total);
    assert.equal(companyFee(4999, 5), 250);
  });
});

test("commission is in tenths of a percent", () => {
  assert.equal(commission(10_000, 50), 500);
  assert.equal(commission(10_000, 25), 250);
  assert.equal(commission(999, 50), 50);
});
