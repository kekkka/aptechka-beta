// Exact package identities from the bundled MDLP snapshot, 2026-10-29.
// These are demonstration fixtures, not a treatment recommendation.
import type { State } from "./types";
export const DEMO_MEDICATIONS = [
  {
    catalogId: "04602424003030",
    gtin: "04602424003030",
    name: "Эналаприл",
    strength: "10 мг",
    form: "ТАБЛЕТКИ",
    unit: "табл.",
    pack: 20,
  },
  {
    catalogId: "04607143562394",
    gtin: "04607143562394",
    name: "Амлодипин",
    strength: "5 мг",
    form: "ТАБЛЕТКИ",
    unit: "табл.",
    pack: 30,
  },
  {
    catalogId: "04606486004202",
    gtin: "04606486004202",
    name: "Омепразол",
    strength: "20 мг",
    form: "КАПСУЛЫ КИШЕЧНОРАСТВОРИМЫЕ",
    unit: "капс.",
    pack: 30,
  },
] as const;
const LEGACY = [
  { name: "Препарат А", strength: "10 мг", form: "Таблетки", unit: "табл." },
  { name: "Препарат Б", strength: "5 мг", form: "Таблетки", unit: "табл." },
  { name: "Препарат В", strength: "20 мг", form: "Капсулы", unit: "капс." },
];
const identity = (m: (typeof LEGACY)[number]) =>
  [m.name, m.strength, m.form, m.unit]
    .map((v) => v.trim().toLowerCase())
    .join("|");
/** Upgrade only the built-in demo fixtures; all event IDs and outcomes survive. */
export function upgradeDemoMedications(s: State): State {
  const course = s.courses.find((c) => c.id === "course1" && c.demo === true);
  if (!course) return s;
  for (let index = 0; index < LEGACY.length; index++) {
    const legacy = LEGACY[index];
    const med = course.meds.find(
      (m) =>
        m.id === ["a", "b", "c"][index] && identity(m) === identity(legacy),
    );
    if (!med) continue;
    const product = DEMO_MEDICATIONS[index];
    Object.assign(med, product);
    for (const stock of s.stock)
      if (identity(stock) === identity(legacy)) Object.assign(stock, product);
    for (const audit of s.audit) {
      if (audit.dose?.startsWith(`${course.id}|${med.id}|`))
        audit.detail = audit.detail.replaceAll(legacy.name, product.name);
    }
  }
  return s;
}
