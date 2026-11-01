import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import {
  DEMO_MEDICATIONS,
  upgradeDemoMedications,
} from "../src/demo-medications";
import { seed, medKey } from "../src/model";
import type { CatalogRow } from "../src/catalog";

test("All built-in medications and stocks match exact real catalog packages", () => {
  const rows = JSON.parse(
    readFileSync(
      new URL("../public/catalog/medications.json", import.meta.url),
      "utf8",
    ),
  ) as CatalogRow[];
  const s = seed();
  s.courses[0].meds.forEach((med, index) => {
    const row = rows.find((r) => r[0] === med.gtin)!;
    assert.ok(row);
    assert.deepEqual(
      [med.name, med.strength, med.form, med.unit, med.pack],
      [row[1], row[3], row[4], row[8], row[7]],
    );
    assert.equal(medKey(med), medKey(s.stock[index]));
    assert.equal(s.stock[index].gtin, med.gtin);
  });
});
test("Upgrading saved demo preserves stock, schedule, outcomes and is idempotent", () => {
  const s = seed();
  const letters = ["А", "Б", "В"];
  for (let i = 0; i < 3; i++) {
    const old = {
      name: `Препарат ${letters[i]}`,
      strength: ["10 мг", "5 мг", "20 мг"][i],
      form: i === 2 ? "Капсулы" : "Таблетки",
      unit: i === 2 ? "капс." : "табл.",
      pack: [20, 14, 30][i],
    };
    Object.assign(s.courses[0].meds[i], old);
    Object.assign(s.stock[i], old);
    delete s.stock[i].gtin;
    delete s.stock[i].catalogId;
  }
  s.stock[0].qty = 3.5;
  s.clock = 1300;
  const logs = JSON.stringify(s.logs),
    times = s.courses[0].meds.map((m) => m.times);
  const extra = {
    ...structuredClone(s.courses[0]),
    id: "user",
    demo: undefined,
  };
  s.courses.push(extra);
  const user = JSON.stringify(extra);
  upgradeDemoMedications(s);
  assert.deepEqual(
    s.courses[0].meds.map((m) => m.name),
    DEMO_MEDICATIONS.map((m) => m.name),
  );
  assert.equal(s.stock[0].qty, 3.5);
  assert.equal(s.clock, 1300);
  assert.equal(JSON.stringify(s.logs), logs);
  assert.deepEqual(
    s.courses[0].meds.map((m) => m.times),
    times,
  );
  assert.equal(JSON.stringify(s.courses[1]), user);
  const once = JSON.stringify(s);
  upgradeDemoMedications(s);
  assert.equal(JSON.stringify(s), once);
});
test("Custom edits to demo medicines are not silently overwritten", () => {
  const s = seed();
  s.courses[0].meds[0].name = "Мой препарат";
  const before = JSON.stringify(s);
  upgradeDemoMedications(s);
  assert.equal(JSON.stringify(s), before);
});
