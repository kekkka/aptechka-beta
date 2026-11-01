import assert from "node:assert/strict";
import { test } from "node:test";
import {
  normalizeGtin,
  searchCatalog,
  quantityToAdd,
  type CatalogRow,
  type CatalogProduct,
} from "../src/catalog";
import { addCatalogStock, inventoryItems } from "../src/inventory";
import {
  seed,
  addDays,
  events,
  markDose,
  medKey,
  resetDemoDose,
  shopping,
  undoDose,
} from "../src/model";
const row: CatalogRow = [
  "04601234567893",
  "Лекарство Ёж",
  "Действующее вещество",
  "5 мг",
  "Таблетки",
  "Производитель",
  "2 блистера по 10 шт",
  20,
  "табл.",
  "Описание",
  "РУ",
];
const product: CatalogProduct = {
  gtin: row[0],
  name: row[1],
  inn: row[2],
  strength: row[3],
  form: row[4],
  manufacturer: row[5],
  package: row[6],
  packSize: row[7],
  unit: row[8],
  description: row[9],
  registration: row[10],
};
function setup() {
  const s = seed();
  s.role = "anna";
  s.stock = [];
  s.logs = {};
  s.courses = [
    {
      id: "c",
      title: "Курс",
      start: s.day,
      days: 5,
      active: true,
      meds: [
        {
          id: "m",
          name: product.name,
          strength: product.strength,
          form: product.form,
          unit: product.unit,
          dose: 1,
          times: ["13:00"],
          pack: 20,
          note: "",
        },
      ],
    },
  ];
  s.clock = 13 * 60;
  return s;
}
test("Catalog search handles case, е/ё, INN, strengths and exact GTIN", () => {
  assert.equal(searchCatalog([row], "ЛЕКАРСТВО еж", false).length, 1);
  assert.equal(searchCatalog([row], "действующее 5 мг", false).length, 1);
  assert.equal(searchCatalog([row], "10 мг", false).length, 0);
  assert.equal(searchCatalog([row], "unknown", false).length, 0);
  assert.equal(searchCatalog([row], "", false).length, 0);
  assert.equal(searchCatalog([row], "4601234567893", true)[0].gtin, row[0]);
});
test("Codes preserve leading zeros, validate checksums and extract GS1 Data Matrix GTIN", () => {
  assert.equal(normalizeGtin("4601234567893"), row[0]);
  assert.equal(normalizeGtin(row[0]), row[0]);
  assert.equal(
    normalizeGtin("]d2010460123456789321serial\u001d91test"),
    row[0],
  );
  assert.equal(normalizeGtin("(01)04601234567893(21)serial"), row[0]);
  assert.equal(normalizeGtin("4601234567891"), null);
  assert.equal(normalizeGtin("abc"), null);
});
test("Pack conversion requires known pack size and whole packages", () => {
  assert.equal(quantityToAdd(product, 2, "packs"), 40);
  assert.equal(quantityToAdd(product, 2.5, "packs"), null);
  assert.equal(quantityToAdd({ ...product, packSize: null }, 1, "packs"), null);
  assert.equal(quantityToAdd(product, 0.5, "units"), 0.5);
  assert.equal(quantityToAdd(product, 0, "units"), null);
});
test("Catalog supplies append batches, reduce shortage and persist without changing prescriptions", () => {
  const s = setup();
  const courses = JSON.stringify(s.courses);
  assert.equal(addCatalogStock(s, product, 2, addDays(s.day, 100)), true);
  assert.equal(shopping(s)[0].missing, 3);
  assert.equal(addCatalogStock(s, product, 3, addDays(s.day, 200)), true);
  assert.equal(s.stock.length, 2);
  assert.equal(s.stock[0].qty, 2);
  assert.equal(shopping(s).length, 0);
  const restored = JSON.parse(JSON.stringify(s));
  assert.equal(inventoryItems(restored)[0].qty, 5);
  assert.equal(JSON.stringify(s.courses), courses);
});
test("Needed items sort first, strength and form stay separate, ended/future prescriptions are excluded", () => {
  const s = setup();
  addCatalogStock(
    s,
    { ...product, name: "А запас", strength: "10 мг" },
    10,
    addDays(s.day, 100),
  );
  const items = inventoryItems(s);
  assert.equal(items[0].med.name, product.name);
  assert.ok(items[0].need);
  assert.equal(items[1].med.name, "А запас");
  assert.equal(items[1].need, undefined);
  s.courses[0].start = addDays(s.day, 1);
  assert.equal(inventoryItems(s).length, 1);
  s.courses[0].start = addDays(s.day, -10);
  assert.equal(inventoryItems(s).length, 1);
});
test("A dose consumes earliest expiry across batches and undo restores the exact allocations", () => {
  const s = setup();
  s.courses[0].meds[0].dose = 2;
  addCatalogStock(s, product, 2, addDays(s.day, 100));
  addCatalogStock(s, product, 1, addDays(s.day, 10));
  const event = events(s)[0];
  assert.equal(markDose(s, event.id, "taken", "self"), true);
  assert.deepEqual(
    s.stock.map((st) => st.qty),
    [1, 0],
  );
  assert.deepEqual(
    s.logs[event.id].allocations?.map((a) => a.stockId),
    [s.stock[1].id, s.stock[0].id],
  );
  undoDose(s, event.id);
  assert.deepEqual(
    s.stock.map((st) => st.qty),
    [2, 1],
  );
});
test("Demo reset restores each batch once; expired stock is never consumed", () => {
  const s = setup();
  s.courses[0].meds[0].dose = 2;
  addCatalogStock(s, product, 1, addDays(s.day, 10));
  addCatalogStock(s, product, 1, addDays(s.day, 100));
  s.stock.push({
    ...s.stock[0],
    id: "expired",
    qty: 50,
    expiry: addDays(s.day, -1),
  });
  const id = events(s)[0].id;
  markDose(s, id, "taken", "self");
  assert.deepEqual(
    s.stock.map((st) => st.qty),
    [0, 0, 50],
  );
  assert.equal(resetDemoDose(s, id), true);
  assert.deepEqual(
    s.stock.map((st) => st.qty),
    [1, 1, 50],
  );
  assert.equal(resetDemoDose(s, id), false);
});
test("Legacy single-stock logs can still be undone", () => {
  const s = setup();
  addCatalogStock(s, product, 3, addDays(s.day, 100));
  const id = events(s)[0].id;
  s.logs[id] = {
    status: "taken",
    actor: "anna",
    stockId: s.stock[0].id,
    consumed: 1,
  };
  undoDose(s, id);
  assert.equal(s.stock[0].qty, 4);
});
test("Inventory mutation is unavailable to patient and caregiver and rejects expired/invalid amounts", () => {
  const s = setup();
  for (const role of ["senior", "elena"]) {
    s.role = role;
    assert.equal(addCatalogStock(s, product, 2, addDays(s.day, 100)), false);
  }
  s.role = "anna";
  assert.equal(addCatalogStock(s, product, 2, addDays(s.day, -1)), false);
  assert.equal(addCatalogStock(s, product, NaN, addDays(s.day, 100)), false);
  assert.equal(s.stock.length, 0);
});

test("Catalog retries after network failures and shares successful downloads", async () => {
  const { createCatalogLoader } = await import("../src/catalog");
  let requests = 0;
  const load = createCatalogLoader((async () => {
    requests++;
    if (requests === 1) throw new Error("offline");
    return new Response(JSON.stringify([row]), { status: 200 });
  }) as typeof fetch);
  await assert.rejects(load("catalog.json"), /offline/);
  const [a, b] = await Promise.all([
    load("catalog.json"),
    load("catalog.json"),
  ]);
  assert.equal(requests, 2);
  assert.equal(a, b);
  assert.deepEqual(a, [row]);
});
test("Malformed catalog snapshots produce a recoverable error", async () => {
  const { createCatalogLoader } = await import("../src/catalog");
  const load = createCatalogLoader(
    (async () =>
      new Response(JSON.stringify([{}]), { status: 200 })) as typeof fetch,
  );
  await assert.rejects(load("catalog.json"), /Некорректный каталог/);
});

test("Registry lookup finds exact registration numbers and lets the user choose a package", () => {
  const a = [...row] as CatalogRow;
  a[10] = "ЛП-№(010175)-(РГ-RU)";
  const b = [...a] as CatalogRow;
  b[0] = "04607143562394";
  b[3] = "10 мг";
  assert.equal(searchCatalog([a, b], "лп № (010175) (рг-ru)", true).length, 2);
  assert.equal(searchCatalog([a, b], "ЛП-01017", true).length, 0);
  assert.equal(searchCatalog([a, b], "4601234567893", true)[0].gtin, row[0]);
});
