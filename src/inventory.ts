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
