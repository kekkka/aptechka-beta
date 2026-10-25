import {useState, type FormEvent} from 'react';
import type {StockInput, StockItem} from '../../api/index.ts';
import {Sheet} from '../../components/Sheet.tsx';
import {Field} from '../../components/ui.tsx';
import {unitFor} from '../../lib/utils.ts';
import type {MedForm} from '../../types.ts';
import {useAction} from '../hooks.ts';
import {useLive} from '../LiveContext.ts';

export type StockPrefill = Partial<StockInput> & {note?: string};

// Add or edit a cabinet entry. Adding a medicine that is already there (same barcode
// or same name, strength and form) tops up that entry on the server.
export function StockSheet({item, prefill}: {item?: StockItem; prefill?: StockPrefill}) {
  const {api, patientId, closeSheet, refresh, toast} = useLive(), {busy, act} = useAction(toast);
  const init = item ?? prefill ?? {};
  const [form, setForm] = useState<MedForm>(init.form === 'Капсулы' ? 'Капсулы' : 'Таблетки');

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget), pack = String(f.get('packSize'));
    const body: StockInput = {
      name: String(f.get('name')).trim(), strength: String(f.get('strength')).trim(), form, unit: unitFor(form),
      qty: Number(String(f.get('qty')).replace(',', '.')), packSize: pack ? Number(pack) : null,
      expiry: String(f.get('expiry')) || null, gtin: init.gtin ?? null
    };
    act(() => item ? api.care.updateStock(patientId, item.id, body) : api.care.addStock(patientId, body), item ? 'Сохранено' : 'Добавлено в аптечку').then(r => {
      if (!r) return;
      closeSheet();
      refresh();
    });
  };
  const remove = () => item && confirm(`Удалить «${item.name}» из аптечки?`) && act(() => api.care.removeStock(patientId, item.id), 'Удалено').then(() => {
    closeSheet();
    refresh();
  });

  return (
    <Sheet title={item ? 'Изменить остаток' : 'Добавить препарат'} subtitle={prefill?.note} onClose={closeSheet}
      footer={<><button className="btn btn-white" onClick={closeSheet}>Отмена</button><button className="btn btn-primary" form="liveStockForm" disabled={busy}>Сохранить</button></>}>
      <form id="liveStockForm" onSubmit={submit}>
        <Field label="Название" name="name" defaultValue={init.name} required maxLength={100} />
        <div className="field-grid">
          <Field label="Дозировка" name="strength" defaultValue={init.strength} required maxLength={50} placeholder="10 мг" />
          <label className="field"><span>Форма</span>
            <select value={form} onChange={e => setForm(e.target.value as MedForm)}><option>Таблетки</option><option>Капсулы</option></select>
          </label>
          <Field label={item ? 'Остаток, шт.' : 'Добавить, шт.'} name="qty" inputMode="decimal" defaultValue={item ? item.qty : init.qty ?? init.packSize ?? ''} required />
          <Field label="Штук в упаковке" name="packSize" type="number" min={1} max={1000} defaultValue={init.packSize ?? ''} />
        </div>
        <Field label="Годен до" name="expiry" type="date" defaultValue={init.expiry ?? ''} />
        {init.gtin && <p className="caption">Штрихкод {init.gtin} запомнится: в следующий раз упаковка распознается сразу.</p>}
      </form>
      {item && <button className="text-link space" disabled={busy} onClick={remove}>Удалить из аптечки</button>}
    </Sheet>
  );
}
