import assert from "node:assert/strict";
import { test } from "node:test";
import {
  seed,
  addDays,
  shopping,
  medKey,
  replenishShoppingStock,
} from "../src/model";

function setup() {
  const s = seed();
  s.role = "anna";
  s.logs = {};
  s.stock = [];
  s.courses = [
    {
      id: "current",
      title: "Текущий курс",
      active: true,
      start: s.day,
      days: 5,
      meds: [
        {
          id: "a",
          name: "Препарат",
          strength: "5 мг",
          form: "Таблетки",
          unit: "табл.",
          dose: 1,
          times: ["09:00"],
          pack: 10,
          note: "",
        },
      ],
    },
  ];
  return s;
}

test("Shopping includes only courses that have started and have remaining doses", () => {
  const s = setup();
  const future = structuredClone(s.courses[0]);
  future.id = "future";
  future.start = addDays(s.day, 1);
  future.meds[0].strength = "10 мг";
  s.courses.push(future);
  assert.equal(shopping(s).length, 1);
  assert.equal(shopping(s)[0].needed, 5);
  s.courses[0].active = false;
  assert.equal(shopping(s).length, 0);
});

test("Partial purchases reduce shortage; completing it removes the item and survives reload", () => {
  const s = setup();
  const key = medKey(s.courses[0].meds[0]);
  const expiry = addDays(s.day, 100);
  assert.equal(replenishShoppingStock(s, key, 2, expiry, "purchased"), true);
  assert.equal(shopping(s)[0].missing, 3);
  assert.equal(replenishShoppingStock(s, key, 3, expiry, "purchased"), true);
  assert.equal(shopping(JSON.parse(JSON.stringify(s))).length, 0);
  assert.equal(
    s.stock.reduce((sum, st) => sum + st.qty, 0),
    5,
  );
  assert.equal(replenishShoppingStock(s, key, 3, expiry, "purchased"), false);
  assert.equal(
    s.stock.reduce((sum, st) => sum + st.qty, 0),
    5,
  );
});

test("Already at home adds only the newly counted quantity and keeps other strengths separate", () => {
  const s = setup();
  const med = s.courses[0].meds[0];
  const expiry = addDays(s.day, 100);
  s.stock.push({ ...med, id: "other", strength: "10 мг", qty: 50, expiry });
  assert.equal(
    replenishShoppingStock(s, medKey(med), 5, expiry, "existing"),
    true,
  );
  assert.equal(s.stock[0].qty, 50);
  assert.equal(s.stock[1].qty, 5);
  assert.equal(shopping(s).length, 0);
  assert.match(s.audit[0].title, /учла запас дома/);
});

test("A fresh batch is not assigned the expired stock date", () => {
  const s = setup();
  const med = s.courses[0].meds[0];
  s.stock.push({ ...med, id: "old", qty: 50, expiry: addDays(s.day, -1) });
  assert.equal(shopping(s)[0].qty, 0);
  assert.equal(
    replenishShoppingStock(s, medKey(med), 5, addDays(s.day, 100), "purchased"),
    true,
  );
  assert.equal(shopping(s).length, 0);
  assert.equal(s.stock[0].qty, 50);
  assert.equal(s.stock[1].qty, 5);
});

test("Invalid quantities, expired supplies and unauthorized actors cannot change stock", () => {
  const s = setup();
  const key = medKey(s.courses[0].meds[0]);
  const expiry = addDays(s.day, 100);
  for (const qty of [0, -1, NaN, Infinity, 0.1, 100001]) {
    assert.equal(
      replenishShoppingStock(s, key, qty, expiry, "existing"),
      false,
    );
  }
  assert.equal(
    replenishShoppingStock(s, key, 5, addDays(s.day, -1), "purchased"),
    false,
  );
  assert.equal(
    replenishShoppingStock(s, "unknown", 5, expiry, "purchased"),
    false,
  );
  s.role = "senior";
  assert.equal(replenishShoppingStock(s, key, 5, expiry, "existing"), false);
  s.role = "elena";
  assert.equal(replenishShoppingStock(s, key, 5, expiry, "existing"), false);
  assert.equal(s.stock.length, 0);
});
