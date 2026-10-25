import {useState, type FormEvent} from 'react';
import {useApp} from '../AppContext.ts';
import {Icon} from '../components/Icon.tsx';
import {Sheet} from '../components/Sheet.tsx';
import {CheckRow, Field, Hint} from '../components/ui.tsx';
import {actor, stockFor} from '../lib/domain.ts';
import {courseNeed, draftNeeds, splitTimes} from '../lib/importDraft.ts';
import {fmt} from '../lib/utils.ts';
import type {Draft, StockReview} from '../types.ts';
import {FlowSteps} from './DocumentSteps.tsx';
import {FlowError} from './ReviewStep.tsx';

// Form values for one stock row; inputs hold strings until submitted.
interface StockInputs {
  qty: string;
  pack: number | string;
  expiry: string;
  checked: boolean;
}

const toInputs = (r: StockReview): StockInputs => ({qty: Number.isFinite(r.qty) ? String(r.qty) : '', pack: r.pack ?? '', expiry: r.expiry, checked: r.checked});
const fromInputs = (r: StockInputs): StockReview => ({qty: r.qty === '' ? NaN : Number(r.qty), pack: r.pack !== '' ? Number(r.pack) : null, expiry: r.expiry, checked: r.checked});

export function ReconcileStep({draft, onBack, onSubmit}: {draft: Draft; onBack: (review: StockReview[]) => void; onSubmit: (review: StockReview[]) => string}) {
  const {state} = useApp(), [rows, setRows] = useState(() => draft.stockReview!.map(toInputs)), [error, setError] = useState('');
  const set = (i: number, patch: Partial<StockInputs>) => setRows(rows.map((r, j) => j === i ? {...r, ...patch} : r));
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(onSubmit(rows.map(fromInputs)));
  };
  return (
    <Sheet
      title="Что уже есть дома"
      subtitle="Сравниваем точное название, дозировку и форму."
      footer={<>
        <button className="btn btn-white" onClick={() => onBack(rows.map(fromInputs))}>Назад</button>
        <button className="btn btn-primary" form="reconcileForm" type="submit">Список покупок <Icon name="arrow" /></button>
      </>}
    >
      <FlowSteps active={4} />
      <Hint icon="box">Проверьте количество и срок годности на упаковках. До запуска плана изменения остаются черновиком.</Hint>
      <form id="reconcileForm" onSubmit={submit}>
        {draft.meds.map((m, i) => {
          const r = rows[i], existing = stockFor(state, {...m, unit: m.unit ?? ''});
          return (
            <section className="review-med" key={m.id}>
              <div className="between"><h3>{m.name}</h3><span className={'label ' + (existing ? '' : 'gray')}>{existing ? 'Есть в аптечке' : 'Нет записи'}</span></div>
              <p className="small muted">{m.strength} · {m.form}</p>
              <div className="need-summary"><span>На этот курс</span><strong>{courseNeed(m)} {m.unit}</strong></div>
              <div className="field-grid">
                <Field label="Есть дома, штук" name={`qty_${i}`} type="number" value={r.qty} onChange={e => set(i, {qty: e.target.value})} required min={0} max={100000} step={0.25} />
                <Field label="Штук в упаковке" name={`pack_${i}`} type="number" value={r.pack} onChange={e => set(i, {pack: e.target.value})} min={1} max={1000} step={1} placeholder="Если известно" />
              </div>
              <Field label="Годен до" name={`expiry_${i}`} type="date" value={r.expiry} onChange={e => set(i, {expiry: e.target.value})} />
              <p className="caption">Срок обязателен при наличии запаса. Если он истекает до конца курса, этот запас не учитываем. Для партий с разными сроками укажите только подходящую партию.</p>
              <CheckRow name={`stockChecked_${i}`} checked={r.checked} onChange={e => set(i, {checked: e.target.checked})} required>Форма, дозировка, количество и срок проверены</CheckRow>
            </section>
          );
        })}
        <FlowError id="reconcileError" message={error} />
      </form>
    </Sheet>
  );
}

type LaunchChoice = {helper: string; access: boolean};

export function SummaryStep({draft, onBack, onLaunch}: {draft: Draft; onBack: (choice: LaunchChoice) => void; onLaunch: (choice: LaunchChoice) => string}) {
  const {state} = useApp(), [helper, setHelper] = useState(draft.helper), [access, setAccess] = useState(!!draft.access), [error, setError] = useState('');
  const needs = draftNeeds(draft, state), missing = needs.filter(n => n.missing > 0);
  const doses = draft.meds.reduce((sum, m) => sum + splitTimes(m.times).length * Number(m.days), 0);
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(onLaunch({helper, access}));
  };
  return (
    <Sheet
      title="Всё готово к запуску"
      subtitle="Проверьте покупки и доступ помощника."
      footer={<>
        <button className="btn btn-white" onClick={() => onBack({helper, access})}>Назад</button>
        <button className="btn btn-primary" form="launchForm" type="submit">Запустить план <Icon name="check" /></button>
      </>}
    >
      <FlowSteps active={5} />
      <div className="launch-summary">
        <span className="scan-symbol"><Icon name="calendar" /></span>
        <h3>{draft.title}</h3>
        <p>{draft.meds.length} препарата · с {fmt(draft.start)}</p>
        <strong>{doses} приёмов в расписании</strong>
      </div>
      <h3 className="space">{missing.length ? 'Нужно докупить' : 'Запасов хватает'}</h3>
      <p className="caption">Только подтверждённый дефицит. Покупки не оформляются автоматически.</p>
      {needs.map(n => (
        <div className="import-shopping" key={n.med.id}>
          <div className="between"><strong>{n.med.name}</strong><span className={'label ' + (n.missing ? 'orange' : '')}>{n.missing ? `Не хватает ${n.missing}` : 'Хватает'}</span></div>
          <p>{n.med.strength} · {n.med.form}</p>
          <div className="formula">Курс {n.needed}{n.reserved ? ` + другие курсы ${n.reserved}` : ''} − годных дома {n.usable} = <strong>{n.missing} {n.med.unit}</strong></div>
          {n.stock.qty > n.usable && <p className="field-warning">Запас с истекающим сроком не включён в расчёт.</p>}
          {n.missing > 0 && <p className="small">{n.packs ? `Докупить ${n.packs} уп. по ${n.stock.pack} шт.` : 'Размер упаковки не указан — список в штуках.'}</p>}
        </div>
      ))}
      <form id="launchForm" onSubmit={submit}>
        <label className="field">
          <span>Помощник, который видит план</span>
          <select name="helper" value={helper} onChange={e => setHelper(e.target.value)}>
            <option value="">Без помощника</option>
            {state.members.filter(m => m.id !== actor(state).id && m.view).map(m => <option key={m.id} value={m.id}>{m.name} · {m.relation}</option>)}
          </select>
        </label>
        <CheckRow name="access" checked={access} onChange={e => setAccess(e.target.checked)} required>Есть согласие близкого или полномочия законного представителя на ведение плана и выбранный доступ.</CheckRow>
        <Hint tone="gray" icon="bell">После запуска появятся расписание, отметки и сигналы семье. В прототипе уведомления и семейные роли работают внутри этого браузера.</Hint>
        {draft.excluded.length > 0 && <p className="field-warning">Не включены: {draft.excluded.join(', ')}.</p>}
        <FlowError id="launchError" message={error} />
      </form>
    </Sheet>
  );
}
