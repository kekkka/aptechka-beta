import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import {
  MEDICATION_INSTRUCTIONS,
  findMedicationInstruction,
} from "../src/medication-instructions";
import { MedicationInstruction } from "../src/MedicationInstruction";
import {
  DEMO_MEDICATIONS,
  upgradeDemoMedications,
} from "../src/demo-medications";
import { productFromRow, type CatalogRow } from "../src/catalog";
import { seed } from "../src/model";
import { lookupRegistration, type GrlsSnapshot } from "../src/grls";

const rows = JSON.parse(
  readFileSync(
    new URL("../public/catalog/medications.json", import.meta.url),
    "utf8",
  ),
) as CatalogRow[];
const grls = JSON.parse(
  readFileSync(new URL("../public/catalog/grls.json", import.meta.url), "utf8"),
) as GrlsSnapshot;

test("All three demo packages have exact GRLS identities and complete instruction summaries", () => {
  for (const demo of DEMO_MEDICATIONS) {
    const product = productFromRow(rows.find((r) => r[0] === demo.gtin)!);
    const instruction = findMedicationInstruction(product)!;
    assert.ok(instruction);
    const registration = lookupRegistration(grls, instruction.registration);
    assert.equal(registration.status, "matched");
    if (registration.status === "matched")
      assert.ok(registration.variants.some((r) => r.name === demo.name));
    for (const key of [
      "indications",
      "contraindications",
      "administration",
      "sideEffects",
      "sourceUrl",
    ] as const)
      assert.ok(instruction[key]);
    const html = renderToStaticMarkup(
      createElement(MedicationInstruction, { instruction }),
    );
    for (const heading of [
      "Показания",
      "Противопоказания",
      "Способ применения",
      "Побочные эффекты",
      "Полная инструкция",
    ])
      assert.ok(html.includes(heading));
    assert.ok(html.includes(instruction.sourceUrl));
  }
  assert.equal(MEDICATION_INSTRUCTIONS.length, 3);
});
test("No instructions are attributed to another registration, dosage, form or manufacturer", () => {
  const product = productFromRow(
    rows.find((r) => r[0] === DEMO_MEDICATIONS[0].gtin)!,
  );
  for (const change of [
    { registration: "ЛП-000803" },
    { strength: "5 мг" },
    { form: "КАПСУЛЫ" },
    { name: "Эналаприл" },
  ])
    assert.equal(
      findMedicationInstruction({ ...product, ...change }),
      undefined,
    );
  const other = productFromRow(rows.find((r) => r[0] === "04602424003030")!);
  assert.equal(findMedicationInstruction(other), undefined);
});
test("Switching existing demo packages preserves outcomes, allocations, times, stock and custom batches", () => {
  const s = seed();
  const previous = ["04602424003030", "04607143562394"];
  previous.forEach((gtin, i) => {
    const p = productFromRow(rows.find((r) => r[0] === gtin)!);
    const old = {
      name: p.name,
      gtin,
      catalogId: gtin,
      strength: p.strength,
      form: p.form,
      unit: p.unit,
      pack: p.packSize!,
    };
    Object.assign(s.courses[0].meds[i], old);
    Object.assign(s.stock[i], old, { qty: 3, expiry: "2027-01-01" });
  });
  const custom = { ...s.stock[0], id: "custom-batch", qty: 12 };
  s.stock.push(custom);
  s.logs["course1|a|2026-11-01|08:00"] = {
    status: "taken",
    allocations: [{ stockId: "sa", qty: 1 }],
  };
  const logs = JSON.stringify(s.logs),
    times = JSON.stringify(s.courses[0].meds.map((m) => m.times));
  const customBefore = JSON.stringify(custom);
  upgradeDemoMedications(s);
  assert.equal(s.courses[0].meds[0].gtin, DEMO_MEDICATIONS[0].gtin);
  assert.equal(s.stock[0].gtin, DEMO_MEDICATIONS[0].gtin);
  assert.equal(s.stock[0].qty, 3);
  assert.equal(s.stock[0].expiry, "2027-01-01");
  assert.equal(JSON.stringify(custom), customBefore);
  assert.equal(JSON.stringify(s.logs), logs);
  assert.equal(JSON.stringify(s.courses[0].meds.map((m) => m.times)), times);
  const once = JSON.stringify(s);
  upgradeDemoMedications(s);
  assert.equal(JSON.stringify(s), once);
});
