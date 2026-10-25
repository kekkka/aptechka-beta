import {useState} from 'react';
import type {Dose, Signal} from '../api/index.ts';
import {Icon, type IconName} from '../components/Icon.tsx';
import {Sheet} from '../components/Sheet.tsx';
import {iso} from '../lib/utils.ts';
import {ROLE_LABEL, STATUS_CLASS, STATUS_LABEL, dateTime, doseText} from './format.ts';
import {useAction} from './hooks.ts';
import {useLive} from './LiveContext.ts';

const closed = (d: Dose) => d.status === 'TAKEN' || d.status === 'SKIPPED';

export function DoseItem({d}: {d: Dose}) {
  const {api, patientId, can, refresh, toast, openSheet} = useLive(), {busy, act} = useAction(toast);
  const markable = can('MARK_DOSE') && !closed(d) && d.date <= iso();
  const take = () => act(() => api.care.mark(patientId, {courseMedId: d.courseMedId, date: d.date, time: d.time, status: 'TAKEN'})).then(r => {
    if (!r) return;
    toast(r.consumedFromStock ? 'Приём отмечен, остаток в аптечке списан' : 'Приём отмечен. Подходящей упаковки в аптечке нет, остаток не списан.');
    refresh();
  });
  const undo = () => act(() => api.care.unmark(patientId, d.logId!), 'Отметка отменена').then(refresh);
  const source = closed(d)
    ? `${d.markedByName ?? 'Кто-то'} · ${d.markedByRole ? ROLE_LABEL[d.markedByRole].toLowerCase() : ''}${d.markedAt ? ' · ' + dateTime(d.markedAt) : ''}${d.note ? ' · ' + d.note : ''}`
    : d.status === 'OVERDUE' ? 'Семье нужен ответ' : 'Ожидается отметка о приёме';
  return (
    <div className={'dose-row' + (d.status === 'OVERDUE' || d.status === 'SKIPPED' ? ' uncertain' : '')}>
      <span className="time">{d.time}</span>
      <div className="grow">
        <div className="med-name"><h3>{d.name}</h3><span className={'label ' + STATUS_CLASS[d.status]}>{STATUS_LABEL[d.status]}</span></div>
        <p>{d.strength} · {doseText(d)}{d.medNote ? ' · ' + d.medNote : ''}</p>
        <div className={'dose-source' + (d.status === 'OVERDUE' ? ' warn' : '')}><Icon name={closed(d) ? 'users' : d.status === 'OVERDUE' ? 'alert' : 'clock'} />{source}</div>
        {markable && (
          <div className="live-actions">
            <button className="btn btn-primary btn-small" disabled={busy} onClick={take}><Icon name="check" /> Принято</button>
            <button className="btn btn-white btn-small" disabled={busy} onClick={() => openSheet(<SkipSheet d={d} />)}>Пропуск</button>
          </div>
        )}
        {can('MARK_DOSE') && d.logId && <button className="text-link live-undo" disabled={busy} onClick={undo}><Icon name="undo" /> Отменить отметку</button>}
      </div>
    </div>
  );
}

const SKIP_REASONS = ['Отказалась принимать', 'Плохо себя чувствует', 'Нет лекарства дома', 'Врач отменил', 'Другое'];

function SkipSheet({d}: {d: Dose}) {
  const {api, patientId, closeSheet, refresh, toast} = useLive(), {busy, act} = useAction(toast);
  const [reason, setReason] = useState(SKIP_REASONS[0]);
  const save = () => act(() => api.care.mark(patientId, {courseMedId: d.courseMedId, date: d.date, time: d.time, status: 'SKIPPED', note: reason}),
    'Пропуск отмечен, семья увидит сигнал').then(r => {
    if (!r) return;
    closeSheet();
    refresh();
  });
  return (
    <Sheet title="Приём пропущен" subtitle={`${d.name} · ${d.time}`} onClose={closeSheet}
      footer={<><button className="btn btn-white" onClick={closeSheet}>Отмена</button><button className="btn btn-primary" disabled={busy} onClick={save}>Отметить пропуск</button></>}>
      <div className="card">
        {SKIP_REASONS.map(r => (
          <label key={r} className="check-row"><input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)} />{r}</label>
        ))}
      </div>
    </Sheet>
  );
}

const SIGNAL_ICON: Record<Signal['kind'], IconName> = {
  HELP_REQUEST: 'phone', VITAL_OUT_OF_RANGE: 'heart', MISSED_DOSE: 'alert', SKIPPED_DOSE: 'alert', LOW_STOCK: 'bag', EXPIRING_STOCK: 'clock'
};

export function SignalCard({s}: {s: Signal}) {
  const {api, patientId, can, go, refresh, toast} = useLive(), {busy, act} = useAction(toast);
  const target = s.kind === 'MISSED_DOSE' || s.kind === 'SKIPPED_DOSE' ? 'plan' : s.kind === 'VITAL_OUT_OF_RANGE' ? 'health' : s.kind === 'HELP_REQUEST' ? null : 'stock';
  return (
    <section className={'alert live-signal ' + s.severity.toLowerCase()}>
      <div className="row">
        <span className="alert-icon"><Icon name={SIGNAL_ICON[s.kind]} /></span>
        <div className="grow">
          <h3>{s.title}</h3>
          <p>{s.detail}</p>
        </div>
        {s.at && (s.kind === 'HELP_REQUEST' || s.kind === 'VITAL_OUT_OF_RANGE') && <span className="alert-time">{dateTime(s.at)}</span>}
      </div>
      <div className="alert-actions">
        {s.kind === 'HELP_REQUEST' && can('RESOLVE_HELP') && s.refId && (
          <button className="btn btn-primary btn-small" disabled={busy}
            onClick={() => act(() => api.care.resolveHelp(patientId, s.refId!), 'Отмечено: вы занялись ситуацией').then(refresh)}>
            Я на связи, занимаюсь
          </button>
        )}
        {target && <button className="btn btn-white btn-small" onClick={() => go(target)}>Открыть <Icon name="arrow" /></button>}
      </div>
    </section>
  );
}
