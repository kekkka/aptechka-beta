import {useState, type FormEvent} from 'react';
import {useApp} from '../AppContext.ts';
import {Sheet} from '../components/Sheet.tsx';
import {ErrorText, Field, Hint} from '../components/ui.tsx';
import {canStock, shopping} from '../lib/domain.ts';
import {buy, saveStock} from '../lib/mutations.ts';
import type {MedForm, StockItem} from '../types.ts';
import {medKey} from '../lib/utils.ts';

export function StockSheet({id}: {id?: string}) {
  const {state, commit, closeSheet, toast} = useApp(), [error, setError] = useState('');
  if (!canStock(state)) return null;
  const s: Omit<StockItem, 'id' | 'unit'> = state.stock.find(s => s.id === id) || {name: '', strength: '', form: 'Таблетки', qty: 0, pack: 20}, editing = !!id;
  const submit = (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    const d = new FormData(ev.currentTarget);
    const r = commit(st => saveStock(st, id, {
      name: String(d.get('name') || '').trim(), strength: String(d.get('strength') || '').trim(), form: String(d.get('form')) as MedForm,
      qty: Number(d.get('qty')), pack: Number(d.get('pack')), expiry: String(d.get('expiry') || '')
    }));
    if (typeof r === 'object') return setError(r.error);
    if (!r) return;
    closeSheet();
    toast('Остаток сохранён, список покупок пересчитан.');
  };
  return (
    <Sheet
      title={editing ? 'Изменить остаток' : 'Добавить препарат'}
      subtitle="Точное название, форма и дозировка нужны для сверки."
      footer={<>
        <button className="btn btn-white" onClick={closeSheet}>Отмена</button>
        <button className="btn btn-primary" form="stockForm" type="submit">Сохранить</button>
      </>}
    >
      <form id="stockForm" onSubmit={submit}>
        <Field label="Название" name="name" defaultValue={s.name} required maxLength={100} readOnly={editing} />
        <div className="field-grid">
          <Field label="Дозировка" name="strength" defaultValue={s.strength} required maxLength={50} readOnly={editing} />
          <label className="field">
            <span>Форма</span>
            <select name="form" disabled={editing} defaultValue={s.form}><option>Таблетки</option><option>Капсулы</option></select>
          </label>
          <Field label="Остаток, штук" name="qty" type="number" defaultValue={s.qty} required min={0} max={100000} step={0.25} />
          <Field label="Штук в упаковке" name="pack" type="number" defaultValue={s.pack ?? ''} required min={1} max={1000} step={1} />
        </div>
        <Field label="Годен до" name="expiry" type="date" defaultValue={s.expiry || ''} />
        <ErrorText id="stockError">{error}</ErrorText>
        <p className="caption">Для другого препарата добавьте отдельную позицию. Это сохраняет правильную связь с журналом.</p>
      </form>
    </Sheet>
  );
}

export function BuySheet({medKey: key}: {medKey: string}) {
  const {state, commit, closeSheet, toast} = useApp(), [error, setError] = useState('');
  const n = shopping(state).find(n => medKey(n.med) === key);
  if (!canStock(state) || !n) return null;
  const submit = (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    const d = new FormData(ev.currentTarget);
    const r = commit(s => buy(s, key, {packs: Number(d.get('packs')), pack: Number(d.get('pack')), expiry: String(d.get('expiry') || '')}));
    if (typeof r === 'object') return setError(r.error);
    if (!r) return;
    closeSheet();
    toast('Запас пополнен. Семья видит обновление.');
  };
  return (
    <Sheet
      title="Пополнить аптечку"
      subtitle={`${n.med.name} · ${n.med.strength}`}
      footer={<>
        <button className="btn btn-white" onClick={closeSheet}>Отмена</button>
        <button className="btn btn-primary" form="buyForm" type="submit">Добавить в запас</button>
      </>}
    >
      <form id="buyForm" onSubmit={submit}>
        <Hint icon="box">На остаток курса не хватает {n.missing} {n.med.unit}.</Hint>
        <div className="space">
          <Field label="Сколько упаковок куплено" name="packs" type="number" defaultValue={n.packs || 1} required min={1} max={1000} step={1} />
          <Field label="Штук в купленной упаковке" name="pack" type="number" defaultValue={n.pack || ''} required min={1} max={1000} step={1} />
          <Field label="Минимальный срок годности всего учитываемого запаса" name="expiry" type="date" defaultValue={n.stock?.expiry || ''} required />
        </div>
        <p className="caption">Покупка не оформляется. Укажите минимальный срок старых и новых упаковок; просроченный запас сначала исключите в аптечке.</p>
        <ErrorText id="buyError">{error}</ErrorText>
      </form>
    </Sheet>
  );
}
