import type { State } from "./types";
import { shopping } from "./model";
export function shoppingListText(state: State): string {
  const needs = shopping(state);
  if (!needs.length) return "Список покупок · Аптечка\nПокупки не требуются: лекарств хватает на текущие курсы.";
  return ["Список покупок · Аптечка", ...needs.map((n, i) =>
    `${i + 1}. ${n.med.name} · ${n.med.strength} · ${n.med.form}: докупить ${n.missing} ${n.med.unit}${n.packs ? ` (${n.packs} уп. по ${n.pack} шт.)` : ""}`
  )].join("\n");
}
