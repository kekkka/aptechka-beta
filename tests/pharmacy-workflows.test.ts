import assert from "node:assert/strict";
import { test } from "node:test";
import { addDays, seed, shopping, medKey } from "../src/model";
import { addManualStock, correctStock, inventoryItems, type StockInput } from "../src/inventory";
import { shoppingListText } from "../src/shopping-list";
import { careNotifications } from "../src/notifications";

function setup() {
  const s = seed(); s.role = "anna"; s.stock = []; s.logs = {}; s.clock = 0;
  return s;
}
function input(s: ReturnType<typeof seed>): StockInput {
  const med = s.courses[0].meds[0];
  return { name: med.name, strength: med.strength, form: med.form, unit: med.unit, qty: 5, pack: 20, expiry: addDays(s.day, 100) };
}

test("Manual stock creates a separate batch, persists and updates shortage without changing prescriptions", () => {
  const s = setup(); const before = JSON.stringify(s.courses); const values = input(s);
  const original = shopping(s).find((n) => medKey(n.med) === medKey(values))!.missing;
  assert.ok(addManualStock(s, values)); assert.ok(addManualStock(s, { ...values, qty: 2 }));
  assert.equal(s.stock.length, 2); assert.ok(s.stock.every((b) => !b.catalogId && !b.gtin));
  const restored = JSON.parse(JSON.stringify(s));
  const item = inventoryItems(restored).find((n) => n.key === medKey(values))!;
  assert.equal(item.qty, 7); assert.equal(item.batches.length, 2);
  assert.equal(item.need?.missing, original - 7); assert.equal(JSON.stringify(s.courses), before);
});

test("Manual entry rejects invalid dates, quantities and unauthorized actors", () => {
  const s = setup(); const values = input(s);
  for (const patch of [{ qty: 0 }, { qty: NaN }, { qty: 0.1 }, { pack: -1 }, { expiry: "2027-02-30" }, { name: " " }, { expiry: addDays(s.day, -1) }]) {
    assert.equal(addManualStock(s, { ...values, ...patch }), false);
  }
  for (const role of ["senior", "elena"]) { s.role = role; assert.equal(addManualStock(s, values), false); }
  assert.equal(s.stock.length, 0);
});

test("Manual correction updates one batch and all remaining-stock surfaces; zero and expired stock stay visible", () => {
  const s = setup(); const values = input(s); assert.ok(addManualStock(s, values));
  const id = s.stock[0].id; const before = JSON.stringify(s.courses);
  assert.ok(correctStock(s, id, { ...values, qty: 0 }));
  assert.equal(inventoryItems(s).find((item) => item.key === medKey(values))?.qty, 0);
  assert.ok(careNotifications(s).find((n) => n.id === `stock:${medKey(values)}`)?.text.includes("дома 0"));
  assert.ok(correctStock(s, id, { ...values, qty: 10, expiry: addDays(s.day, -1) }));
  const item = inventoryItems(s).find((item) => item.key === medKey(values))!;
  assert.equal(item.qty, 0); assert.equal(item.expired, 10);
  assert.equal(JSON.stringify(s.courses), before);
  s.role = "elena"; assert.equal(correctStock(s, id, { ...values, qty: 99 }), false); assert.equal(s.stock[0].qty, 10);
});

test("Shopping text contains the actual deficits, strengths and forms without patient or family data", () => {
  const s = setup(); const needs = shopping(s); const text = shoppingListText(s);
  assert.ok(needs.length);
  for (const n of needs) { assert.ok(text.includes(n.med.name)); assert.ok(text.includes(n.med.strength)); assert.ok(text.includes(n.med.form)); assert.ok(text.includes(`докупить ${n.missing} ${n.med.unit}`)); }
  assert.ok(!text.includes(s.patient.name)); assert.ok(!text.includes(s.patient.city));
  assert.ok(!text.includes(s.members[0].name));
  s.courses = []; assert.match(shoppingListText(s), /Покупки не требуются/);
});


test("Existing catalog batches without a specified strength can still be corrected", () => {
  const s = setup(); const values = { ...input(s), strength: "" };
  s.stock.push({ ...values, id: "unknown-strength", catalogId: "123" });
  assert.ok(correctStock(s, "unknown-strength", { ...values, qty: 2 }));
  assert.equal(s.stock[0].qty, 2);
  assert.equal(s.stock[0].catalogId, "123");
});
