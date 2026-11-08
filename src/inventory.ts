import type { State, Stock, Medication } from "./types";
import type { CatalogProduct } from "./catalog";
import {
  actor,
  addDays,
  canViewCourse,
  medKey,
  record,
  shopping,
  uid,
} from "./model";
export function inventoryItems(s: State) {
  const items = new Map<
    string,
    {
      key: string;
      med: Pick<Medication, "name" | "strength" | "form" | "unit">;
      batches: Stock[];
    }
  >();
  for (const stock of s.stock) {
    const key = medKey(stock);
    const item = items.get(key) || { key, med: stock, batches: [] };
    item.batches.push(stock);
    items.set(key, item);
  }
  for (const course of s.courses.filter(
    (c) => c.active && c.start <= s.day && canViewCourse(s, c),
  )) {
    for (const med of course.meds) {
      if (addDays(course.start, (med.days || course.days) - 1) < s.day)
        continue;
      const key = medKey(med);
      if (!items.has(key)) items.set(key, { key, med, batches: [] });
    }
  }
  const needs = shopping(s);
  return [...items.values()]
    .map((item) => ({
      ...item,
      need: needs.find((n) => medKey(n.med) === item.key),
      qty: item.batches.reduce(
        (sum, b) => sum + (!b.expiry || b.expiry >= s.day ? b.qty : 0),
        0,
      ),
      expired: item.batches.reduce(
        (sum, b) => sum + (b.expiry && b.expiry < s.day ? b.qty : 0),
        0,
      ),
    }))
    .sort(
      (a, b) =>
        Number(!!b.need) - Number(!!a.need) ||
        a.med.name.localeCompare(b.med.name, "ru") ||
        a.med.strength.localeCompare(b.med.strength, "ru"),
    );
}
export function addCatalogStock(
  s: State,
  product: CatalogProduct,
  qty: number,
  expiry: string,
) {
  if (
    !actor(s).stock ||
    !/^\d{14}$/.test(product.gtin) ||
    !product.name ||
    !product.form ||
    !product.unit ||
    !Number.isFinite(qty) ||
    qty <= 0 ||
    qty > 100000 ||
    (qty * 4) % 1 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(expiry) ||
    Number.isNaN(Date.parse(expiry)) ||
    expiry < s.day
  )
    return false;
  s.stock.push({
    id: uid(),
    catalogId: product.gtin,
    gtin: product.gtin,
    name: product.name,
    strength: product.strength,
    form: product.form,
    unit: product.unit,
    qty,
    pack: product.packSize || 0,
    expiry,
  });
  record(
    s,
    "stock",
    actor(s).name + " добавила лекарство",
    `${product.name} · ${product.strength} · +${qty} ${product.unit} · годен до ${expiry}`,
  );
  return true;
}

export type StockInput = Pick<Stock, "name" | "strength" | "form" | "unit" | "qty" | "pack" | "expiry">;
export function validStockInput(input: StockInput, allowZero = false): boolean {
  return !!input.name.trim() && (allowZero || !!input.strength.trim()) && !!input.form.trim() && !!input.unit.trim()
    && Number.isFinite(input.qty) && input.qty >= (allowZero ? 0 : 0.25) && input.qty <= 100000 && Number.isInteger(input.qty * 4)
    && Number.isInteger(input.pack) && input.pack >= 0 && input.pack <= 100000
    && !!input.expiry && /^\d{4}-\d{2}-\d{2}$/.test(input.expiry)
    && !Number.isNaN(Date.parse(input.expiry)) && new Date(input.expiry).toISOString().slice(0, 10) === input.expiry;
}
export function addManualStock(s: State, input: StockInput): boolean {
  if (!actor(s).stock || !validStockInput(input) || input.expiry! < s.day) return false;
  s.stock.push({ ...input, name: input.name.trim(), strength: input.strength.trim(), id: uid() });
  record(s, "stock", actor(s).name + " добавила лекарство вручную", `${input.name} · ${input.strength} · +${input.qty} ${input.unit}`);
  return true;
}
export function correctStock(s: State, id: string, input: StockInput): boolean {
  const stock = s.stock.find((item) => item.id === id);
  if (!actor(s).stock || !stock || !validStockInput(input, true)) return false;
  // Catalog identity stays immutable: editing quantity/expiry must not relabel a GTIN.
  Object.assign(stock, { qty: input.qty, pack: input.pack, expiry: input.expiry });
  record(s, "stock", actor(s).name + " скорректировала остаток", `${stock.name} · ${stock.strength} · остаток ${stock.qty} ${stock.unit}`);
  return true;
}
