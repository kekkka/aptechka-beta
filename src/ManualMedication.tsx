import { useState, type FormEvent } from "react";
import { Button, Field } from "./components";
import type { StockInput } from "./inventory";

export function ManualMedication({ day, onSave }: { day: string; onSave: (input: StockInput) => boolean }) {
  const [error, setError] = useState("");
  const [form, setForm] = useState("Таблетки");
  const units: Record<string, string> = { "Таблетки": "табл.", "Капсулы": "капс.", "Раствор": "мл", "Капли": "мл", "Мазь / крем": "г", "Другая форма": "шт." };
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    const input: StockInput = { name: String(data.get("name")).trim(), strength: String(data.get("strength")).trim(), form,
      unit: String(data.get("unit")).trim(), qty: Number(data.get("qty")), pack: Number(data.get("pack")), expiry: String(data.get("expiry")) };
    if (!onSave(input)) setError("Проверьте поля: положительный остаток, количество в упаковке и срок годности не раньше даты демо.");
  }
  return <form onSubmit={submit} className="manual-medication">
    <p className="catalog-meta">Перепишите данные с упаковки. Карточка будет добавлена в домашний запас без связи с каталогом.</p>
    <Field label="Название лекарства" name="name" />
    <Field label="Дозировка или концентрация" name="strength" />
    <label className="field"><span>Форма выпуска</span><select value={form} onChange={(event) => setForm(event.target.value)}>{Object.keys(units).map((f) => <option key={f}>{f}</option>)}</select></label>
    <div className="field-grid"><Field label="Остаток" name="qty" type="number" min={0.25} max={100000} step={0.25} defaultValue={1} />
      <label className="field"><span>Единица учёта</span><select key={form} name="unit" defaultValue={units[form]}>{["табл.", "капс.", "мл", "г", "шт.", "доз"].map((unit) => <option key={unit}>{unit}</option>)}</select></label></div>
    <Field label="Единиц в упаковке (0, если неизвестно)" name="pack" type="number" min={0} max={100000} step={1} defaultValue={0} />
    <Field label="Годен до" name="expiry" type="date" min={day} />
    {error && <p role="alert" className="catalog-error">{error}</p>}
    <Button type="submit">Добавить в аптечку</Button>
  </form>;
}
