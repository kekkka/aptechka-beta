import assert from "node:assert/strict";
import { test } from "node:test";
import {
  accounts,
  actor,
  addDays,
  events,
  markDose,
  seed,
  shopping,
  undoDose,
} from "../src/model";
test("Exactly three account choices map to the expected roles", () => {
  assert.deepEqual(
    accounts.map((a) => a.id),
    ["senior", "elena", "anna"],
  );
  const s = seed();
  for (const a of accounts) {
    s.role = a.id;
    const me = actor(s);
    assert.equal(me.mark, true);
    assert.equal(me.stock, a.id === "anna");
  }
});
test("Individual drug durations and expiry affect schedule and shopping", () => {
  const s = seed();
  s.courses = [
    {
      id: "t",
      title: "Test",
      active: true,
      start: s.day,
      days: 7,
      meds: [
        {
          id: "a",
          name: "A",
          strength: "5 мг",
          form: "Таблетки",
          unit: "табл.",
          dose: 1,
          days: 5,
          times: ["09:00"],
          pack: 0,
          note: "",
        },
        {
          id: "b",
          name: "B",
          strength: "5 мг",
          form: "Таблетки",
          unit: "табл.",
          dose: 1,
          days: 7,
          times: ["19:00"],
          pack: 10,
          note: "",
        },
      ],
    },
  ];
  s.logs = {};
  s.stock = [];
  assert.equal(events(s, addDays(s.day, 4)).length, 2);
  assert.equal(events(s, addDays(s.day, 5)).length, 1);
  assert.equal(events(s, addDays(s.day, 7)).length, 0);
  assert.equal(shopping(s).find((n) => n.med.id === "a")?.needed, 5);
  assert.equal(shopping(s).find((n) => n.med.id === "a")?.packs, null);
  s.stock = [
    {
      id: "st",
      name: "A",
      strength: "5 мг",
      form: "Таблетки",
      unit: "табл.",
      qty: 10,
      pack: 10,
      expiry: addDays(s.day, 1),
    },
  ];
  assert.equal(shopping(s).find((n) => n.med.id === "a")?.qty, 0);
  s.stock[0].expiry = addDays(s.day, 20);
  assert.equal(
    shopping(s).some((n) => n.med.id === "a"),
    false,
  );
  s.stock[0].strength = "10 мг";
  assert.equal(shopping(s).find((n) => n.med.id === "a")?.qty, 0);
});
test("Marking a dose consumes stock once; undo restores stock and keeps history", () => {
  const s = seed();
  s.role = "senior";
  const e = events(s).find((e) => e.time === "13:00")!;
  const st = s.stock.find((st) => st.name === e.med.name)!;
  const qty = st.qty;
  assert.equal(markDose(s, e.id, "taken", "self"), true);
  assert.equal(st.qty, qty - 1);
  assert.equal(markDose(s, e.id, "taken", "self"), false);
  assert.equal(st.qty, qty - 1);
  undoDose(s, e.id);
  assert.equal(st.qty, qty);
  assert.equal(s.logs[e.id], undefined);
  assert.equal(s.audit[0].type, "undo");
});
test("A future dose cannot be marked; a viewer cannot change a dose", () => {
  const s = seed();
  const e = events(s).find((e) => e.time === "20:00")!;
  assert.equal(markDose(s, e.id, "taken", "observed"), false);
  s.role = "max";
  assert.equal(
    markDose(
      s,
      events(s).find((e) => e.time === "13:00")!.id,
      "taken",
      "reported",
    ),
    false,
  );
});
test("Switching accounts keeps medication data and restricts imported courses to the helper", () => {
  const s = seed();
  s.courses[0].importMethod = "OCR";
  s.courses[0].helper = "elena";
  const before = JSON.stringify(s.stock);
  s.role = "max";
  assert.equal(events(s).length, 0);
  assert.equal(shopping(s).length, 0);
  s.role = "elena";
  assert.ok(events(s).length);
  s.role = "senior";
  assert.ok(events(s).length);
  s.role = "anna";
  assert.ok(events(s).length);
  assert.equal(JSON.stringify(s.stock), before);
});
