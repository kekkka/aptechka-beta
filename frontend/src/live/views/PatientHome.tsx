import {useState} from 'react';
import type {Dose} from '../../api/index.ts';
import {Icon} from '../../components/Icon.tsx';
import {Sheet} from '../../components/Sheet.tsx';
import {iso} from '../../lib/utils.ts';
import {doseText} from '../format.ts';
import {useAction, useLoad} from '../hooks.ts';
import {useLive} from '../LiveContext.ts';
import {VitalSheet} from '../sheets/VitalSheet.tsx';

const done = (d: Dose) => d.status === 'TAKEN' || d.status === 'SKIPPED';

// Lightweight profile for the person receiving care: large type, one thing at a
// time, and only what matters — the next pill, "I feel bad", how I feel today.
export function PatientHome() {
  const {api, me, patientId, version, refresh, toast, openSheet, logout} = useLive(), {busy, act} = useAction(toast);
  const doses = useLoad(() => api.care.schedule(patientId, iso()), [patientId, version]);
  const list = doses.data ?? [];
  const next = list.find(d => !done(d) && d.status !== 'PLANNED') ?? list.find(d => !done(d));
  const take = (d: Dose) => act(() => api.care.mark(patientId, {courseMedId: d.courseMedId, date: d.date, time: d.time, status: 'TAKEN'}), 'Отлично! Семья увидит отметку').then(refresh);
  const feel = (v: number) => act(() => api.care.recordVital(patientId, {type: 'WELLBEING', value1: v}), v <= 2 ? 'Записали. Семья увидит, что вам нехорошо' : 'Спасибо, записали');

  return <>
    <h1 className="senior-title">Здравствуйте,<br />{me.displayName}!</h1>
    <p className="senior-sub">{list.length ? `Сегодня ${list.filter(done).length} из ${list.length} приёмов отмечено` : 'Ваш план на сегодня'}</p>
    {doses.error && <p className="caption" role="alert">{doses.error}</p>}
    {next ? (
      <section className="senior-card">
        <div className="time-big">{next.time}</div>
        <div className="med-icon"><Icon name="pill" /></div>
        <h2>{next.name}</h2>
        <p>{next.strength}<br />{doseText(next)}{next.medNote ? ' · ' + next.medNote : ''}</p>
        {next.status === 'PLANNED'
          ? <p>Время приёма ещё не наступило.</p>
          : <button className="btn btn-primary btn-full" disabled={busy} onClick={() => take(next)}><Icon name="check" /> Я принял(а)</button>}
        <p className="caption">Отмечайте только после приёма.</p>
      </section>
    ) : doses.data && (
      <section className="senior-card">
        <div className="empty-illustration"><Icon name="check" /></div>
        <h2>{list.length ? 'Всё отмечено' : 'Приёмов нет'}</h2>
        <p>{list.length ? 'На сегодня больше нет лекарств.' : 'На сегодня лекарств не назначено.'}</p>
      </section>
    )}

    <button className="btn senior-help" onClick={() => openSheet(<HelpSheet />)}><Icon name="phone" /> Мне плохо</button>

    <section className="senior-card live-feel">
      <h2>Как вы себя чувствуете?</h2>
      <div className="live-feel-row">
        {[[1, 'Очень плохо'], [2, 'Плохо'], [3, 'Так себе'], [4, 'Хорошо'], [5, 'Отлично']].map(([v, label]) => (
          <button key={v} className="btn btn-white" disabled={busy} onClick={() => feel(Number(v))}><strong>{v}</strong><small>{label}</small></button>
        ))}
      </div>
    </section>
    <button className="btn btn-white senior-call" onClick={() => openSheet(<VitalSheet fixed="BLOOD_PRESSURE" />)}><Icon name="heart" /> Записать давление</button>

    {list.length > 1 && (
      <section className="space">
        <p className="senior-sub">Все приёмы сегодня</p>
        <div className="card">
          {list.map(d => (
            <div className="list-item" key={d.courseMedId + d.time}>
              <span className="time">{d.time}</span>
              <div className="grow"><h3>{d.name}</h3><p>{doseText(d)}</p></div>
              <span className={'label ' + (done(d) ? (d.status === 'TAKEN' ? '' : 'red') : 'gray')}>{d.status === 'TAKEN' ? 'Принято' : d.status === 'SKIPPED' ? 'Пропуск' : 'Ждёт'}</span>
            </div>
          ))}
        </div>
      </section>
    )}
    <button className="text-link space" onClick={logout}>Выйти</button>
  </>;
}

const REASONS = ['Кружится голова', 'Болит сердце или грудь', 'Высокое давление', 'Упал(а)', 'Просто позвоните мне'];

function HelpSheet() {
  const {api, patientId, closeSheet, toast} = useLive(), {busy, act} = useAction(toast);
  const [sent, setSent] = useState(false);
  const send = (message?: string) => act(() => api.care.requestHelp(patientId, message)).then(r => { if (r) setSent(true); });
  return (
    <Sheet title={sent ? 'Семья получила сигнал' : 'Мне плохо'} onClose={closeSheet}>
      {sent ? <>
        <p className="senior-sub">Родные увидят просьбу о помощи. Если вам очень плохо — звоните 103 или 112.</p>
        <a className="btn btn-primary btn-full senior-call" href="tel:112"><Icon name="phone" /> Позвонить 112</a>
        <button className="btn btn-white btn-full senior-call" onClick={closeSheet}>Закрыть</button>
      </> : <>
        <p className="senior-sub">Нажмите, что случилось. Можно и без причины.</p>
        {REASONS.map(r => <button key={r} className="btn btn-white btn-full senior-call" disabled={busy} onClick={() => send(r)}>{r}</button>)}
        <button className="btn senior-help" disabled={busy} onClick={() => send()}>Отправить без причины</button>
        <a className="btn btn-white btn-full senior-call" href="tel:112"><Icon name="phone" /> Экстренный вызов 112</a>
      </>}
    </Sheet>
  );
}
