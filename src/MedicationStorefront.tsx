import type { State, Stock } from "./types";
import { medKey, shopping } from "./model";
import { inventoryItems } from "./inventory";

export function MedicationStorefront({ state, onInfo }: { state: State; onInfo: (stock: Stock) => void }) {
  const needs = shopping(state);
  const inventory = inventoryItems(state);
  return <ul className="medication-storefront" aria-label="Лекарства к покупке">
    {needs.map((need) => {
      const key = medKey(need.med);
      const qty = inventory.find((item) => item.key === key)?.qty ?? 0;
      const color = [...key].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 3;
      const image = /капс/i.test(need.med.form) ? "capsules-sand" : color === 1 ? "tablets-blue" : "tablets-mint";
      return <li key={key}>
        <button className="medication-product" aria-label={`О препарате ${need.med.name}, ${need.med.strength}, докупить ${need.missing} ${need.med.unit}`}
          onClick={() => onInfo({ ...need.med, id: `shopping:${key}`, qty })}>
          <span className="medication-product-image">
            <img src={`./medication-illustrations/${image}.jpg`} alt="" width={480} height={720} />
            <span className="medication-product-example">Иллюстрация</span>
          </span>
          <span className="medication-product-copy">
            <strong className="medication-product-need">Докупить {need.missing} {need.med.unit}</strong>
            {need.packs && <span className="medication-product-pack">{need.packs} уп. по {need.pack} шт.</span>}
            <strong className="medication-product-name">{need.med.name}</strong>
            <span className="medication-product-strength">{need.med.strength} · {need.med.form.toLocaleLowerCase("ru")}</span>
            <span className="medication-product-stock">Дома: {qty} {need.med.unit}</span>
          </span>
        </button>
      </li>;
    })}
  </ul>;
}
