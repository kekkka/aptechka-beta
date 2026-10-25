import type {FormEvent} from 'react';
import {useApp} from '../AppContext.ts';
import {Icon} from '../components/Icon.tsx';
import {Sheet} from '../components/Sheet.tsx';
import {CheckRow, Hint} from '../components/ui.tsx';
import {actor, canMark, delayed, eventById, isClosed, isOwner, isPast, memberName, sourceText} from '../lib/domain.ts';
import {claim, request, resolve, skip, snooze, take, undo} from '../lib/mutations.ts';
import {fmt, hm, mins} from '../lib/utils.ts';
import type {MarkSource} from '../types.ts';

// Shared result handling for marking a dose as taken.
function useTake() {
  const {commit, closeSheet, toast} = useApp();
  return (id: string, source: MarkSource, note: string) => {
    const r = commit(s => take(s, id, source, note));
    if (!r) return;
    closeSheet();
    toast(r.short ? 'Приём отмечен. В аптечке недостаточно учтённых остатков.' : 'Отметка сохранена. Семья видит автора и подтверждение.');
  };
}

export function EventSheet({id}: {id: string}) {
  const {state, commit, openSheet, closeSheet, toast} = useApp();
  const e = eventById(state, id);
  if (!e) return null;
  const l = e.log, s = state.signalState[id] || {}, past = isPast(state, e), resolved = isClosed(l), late = state.clock - mins(e.time);
  const mayMark = !resolved && canMark(state) && past;
  const done = (msg: string) => {
    closeSheet();
    toast(msg);
  };

  let status;
  if (l?.status === 'taken') status = <>
    <div className="source-box"><p><strong>Отметка о приёме</strong><br />{l.actorName} · {l.time}<br />Способ: {l.source && sourceText[l.source]}<br />{l.note || 'Без комментария'}</p></div>
    <Hint tone="gray" icon="eye">Это запись человека. Независимого подтверждения устройством или видео нет.</Hint>
  </>;
  else if (l?.status === 'skipped') status = <Hint tone="orange" icon="alert">Приём отмечен пропущенным.<br />{l.actorName} · {l.note || 'Причина не указана'}</Hint>;
  else if (delayed(state, e)) status = <Hint tone="orange" icon="alert">Нет отметки уже {late} минут. Сначала уточните у близкого или сиделки, состоялся ли приём.</Hint>;
  else status = <div className="hint gray">По подтверждённому назначению. Действия при пропуске уточняйте у врача; приложение не меняет дозу.</div>;

  return (
    <Sheet
      title={`${e.time} · ${e.med.name}`}
      subtitle={`${fmt(e.date)} · ${state.patient.name}`}
      footer={mayMark ? <>
        <button className="btn btn-white" onClick={() => openSheet('snooze', {id})}><Icon name="clock" /> Напомнить</button>
        <button className="btn btn-primary" onClick={() => openSheet('confirm', {id})}>Отметить приём</button>
      </> : <button className="btn btn-white" onClick={closeSheet}>Закрыть</button>}
    >
      <div className="event-hero">
        <div className={'med-icon ' + (e.med.color || '')}><Icon name="pill" /></div>
        <h2>{e.med.name} · {e.med.strength}</h2>
        <p>{e.med.dose} {e.med.unit} · {e.med.note}</p>
      </div>
      {status}
      <div className="responsible">
        <span className="avatar sand">Е</span>
        <div className="grow">
          <strong>{s.owner ? s.owner + ' проверяет' : 'Елена · сиделка'}</strong>
          <p>{s.owner ? 'Ответственный за этот сигнал' : 'Помогает с приёмом сегодня'}</p>
        </div>
        <button className="text-link" onClick={() => openSheet('contact')}>Связаться <Icon name="arrow" /></button>
      </div>
      {!resolved && past && (
        <div className="row wrap" style={{marginBottom: 16}}>
          <button className="btn btn-soft btn-small" disabled={!!s.owner} onClick={() => commit(st => claim(st, id))}><Icon name="users" /> {s.owner ? 'В работе' : 'Я проверю'}</button>
          <button className="btn btn-white btn-small" onClick={() => commit(st => request(st, id)) && toast('Демо-запрос сохранён. Реальное сообщение не отправлялось.')}><Icon name="send" /> Демо-запрос отметки</button>
        </div>
      )}
      {s.requested && <p className="caption">Демо-запрос создан в {s.requested}. Реальное сообщение не отправлено.</p>}
      {delayed(state, e) && late >= state.settings.grace + 30 && (
        <Hint tone="orange" icon="bell" className="space">Нужна реакция резервного ответственного: {memberName(state, state.settings.backup)}.</Hint>
      )}
      {canMark(state) && resolved && (isOwner(state) || l?.actor === actor(state).id) && (
        <button className="btn btn-white btn-full space" onClick={() => commit(st => undo(st, id)) && done('Отметка отменена. Списанный остаток восстановлен.')}><Icon name="undo" /> Исправить отметку</button>
      )}
      {mayMark && <button className="ghost space" style={{width: '100%'}} onClick={() => openSheet('skip', {id})}>Отметить пропуск</button>}
      {l?.status === 'skipped' && !s.resolved && actor(state).role !== 'senior' && (
        <button className="btn btn-soft btn-full space" onClick={() => commit(st => resolve(st, id)) && done('Сигнал обработан. Пропуск сохранён в журнале.')}>Ситуация проверена семьёй</button>
      )}
      <p className="caption">Источник схемы: {e.course.source}.</p>
    </Sheet>
  );
}

export function ConfirmSheet({id}: {id: string}) {
  const {state, openSheet} = useApp(), takeDose = useTake();
  const e = eventById(state, id);
  if (!e || !canMark(state) || !isPast(state, e)) return null;
  const submit = (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    const d = new FormData(ev.currentTarget), source = d.get('source');
    if (!d.has('confirmed') || (source !== 'observed' && source !== 'reported')) return;
    takeDose(id, source, String(d.get('note') || '').trim());
  };
  return (
    <Sheet
      title="Подтвердить приём"
      subtitle={`${e.med.name} · ${e.time}`}
      footer={<>
        <button className="btn btn-white" onClick={() => openSheet('event', {id})}>Назад</button>
        <button className="btn btn-primary" form="confirmForm" type="submit"><Icon name="check" /> Подтвердить</button>
      </>}
    >
      <form id="confirmForm" onSubmit={submit}>
        <p className="small muted">Как вы узнали, что близкий принял препарат?</p>
        <div className="source-select">
          <label className="radio-card"><input type="radio" name="source" value="observed" required />Наблюдала лично</label>
          <label className="radio-card"><input type="radio" name="source" value="reported" required />Со слов близкого или сиделки</label>
        </div>
        <label className="field"><span>Комментарий для семьи</span><textarea name="note" maxLength={250} placeholder="Что важно знать близким"></textarea></label>
        <Hint tone="gray" icon="users">Автор отметки: {actor(state).name}. Семья увидит способ подтверждения и время.</Hint>
        <CheckRow name="confirmed" required>Отмечаю состоявшийся приём, а не намерение принять.</CheckRow>
      </form>
    </Sheet>
  );
}

const SKIP_REASONS = ['Близкий отказался', 'Забыли о приёме', 'Препарата нет дома', 'Уточняем схему у врача', 'Другое'];

export function SkipSheet({id}: {id: string}) {
  const {state, commit, openSheet, closeSheet, toast} = useApp();
  const e = eventById(state, id);
  if (!e || !canMark(state) || !isPast(state, e)) return null;
  const submit = (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    const d = new FormData(ev.currentTarget), reason = String(d.get('reason') || '');
    if (!reason || !commit(s => skip(s, id, reason, String(d.get('note') || '').trim()))) return;
    closeSheet();
    toast('Пропуск сохранён. В сигналах семье появилась запись.');
  };
  return (
    <Sheet
      title="Отметить пропуск"
      subtitle={`${e.med.name} · ${e.time}`}
      footer={<>
        <button className="btn btn-white" onClick={() => openSheet('event', {id})}>Назад</button>
        <button className="btn btn-primary" type="submit" form="skipForm">Сохранить пропуск</button>
      </>}
    >
      <form id="skipForm" onSubmit={submit}>
        <label className="field">
          <span>Причина или комментарий</span>
          <select name="reason" required defaultValue="">
            <option value="">Выберите причину</option>
            {SKIP_REASONS.map(r => <option key={r}>{r}</option>)}
          </select>
        </label>
        <label className="field"><span>Дополнение</span><textarea name="note" maxLength={200}></textarea></label>
        <Hint tone="orange" icon="info">Пропуск появится в журнале и сигналах семье. Приложение не рекомендует переносить или удваивать дозу.</Hint>
      </form>
    </Sheet>
  );
}

export function SnoozeSheet({id}: {id: string}) {
  const {state, commit, closeSheet, toast} = useApp();
  if (!eventById(state, id) || !canMark(state)) return null;
  const set = (minutes: number) => {
    const r = commit(s => snooze(s, id, minutes));
    if (!r) return;
    closeSheet();
    toast('Повторное напоминание в ' + hm(r.until) + '. Дозировка не менялась.');
  };
  return (
    <Sheet title="Повторить напоминание" subtitle="Переносится только напоминание, схема лечения остаётся прежней.">
      <div className="stack">
        <button className="btn btn-soft btn-full" onClick={() => set(15)}>Через 15 минут · {hm(state.clock + 15)}</button>
        <button className="btn btn-white btn-full" onClick={() => set(30)}>Через 30 минут · {hm(state.clock + 30)}</button>
        <p className="caption">В демо время можно изменить нажатием на часы в шапке. Фоновая доставка уведомлений не подключена.</p>
      </div>
    </Sheet>
  );
}

export function SeniorTakeSheet({id}: {id: string}) {
  const {state, closeSheet} = useApp(), takeDose = useTake();
  const e = eventById(state, id);
  if (state.role !== 'senior' || !e || !isPast(state, e)) return null;
  return (
    <Sheet
      title="Вы уже приняли лекарство?"
      subtitle={`${e.med.name} · ${e.med.dose} ${e.med.unit}`}
      footer={<>
        <button className="btn btn-white" onClick={closeSheet}>Ещё нет</button>
        <button className="btn btn-primary" onClick={() => takeDose(id, 'self', 'Отмечено самим родственником')}>Да, приняла</button>
      </>}
    >
      <p style={{fontSize: 17, lineHeight: 1.8}}>Подтвердите только состоявшийся приём. Семья увидит вашу отметку.</p>
    </Sheet>
  );
}
