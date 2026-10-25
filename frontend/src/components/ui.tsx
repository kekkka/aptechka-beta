import {useContext, type InputHTMLAttributes, type ReactNode} from 'react';
import {ModeContext} from '../ModeContext.ts';
import {useApp} from '../AppContext.ts';
import {delayed, signals, sourceText} from '../lib/domain.ts';
import {claim} from '../lib/mutations.ts';
import {fmt, hm, mins} from '../lib/utils.ts';
import type {AuditEntry, DoseEvent, Member} from '../types.ts';
import {Icon, type IconName} from './Icon.tsx';

export function PageHead({title, subtitle, back = false, action}: {title: ReactNode; subtitle?: ReactNode; back?: boolean; action?: ReactNode}) {
  const {go} = useApp();
  return (
    <div className="page-head">
      <div className="between">
        <div className={back ? 'back-title' : ''}>
          {back && <button className="icon-btn" onClick={() => go('home')} aria-label="Назад"><Icon name="back" /></button>}
          <h1>{title}</h1>
        </div>
        {action}
      </div>
      {subtitle && <p>{subtitle}</p>}
    </div>
  );
}

export function IconButton({icon, label, onClick}: {icon: IconName; label: string; onClick: () => void}) {
  return <button className="icon-btn" onClick={onClick} aria-label={label}><Icon name={icon} /></button>;
}

export function Footer() {
  const {openSheet} = useApp(), mode = useContext(ModeContext);
  return (
    <div className="footnote">
      Учебное демо · данные остаются в этом браузере<br />
      <button className="text-link" onClick={() => openSheet('about')}>О прототипе и его возможностях</button>
      {mode && <><br /><button className="text-link" onClick={() => mode.setMode('auth')}>Войти в аккаунт семьи</button></>}
    </div>
  );
}

export function Empty({title, children}: {title: ReactNode; children?: ReactNode}) {
  return (
    <div className="empty">
      <div className="empty-illustration"><Icon name="leaf" /></div>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}

export function Hint({tone = '', icon, className = '', children}: {tone?: '' | 'orange' | 'gray'; icon?: IconName; className?: string; children?: ReactNode}) {
  return <div className={['hint', tone, className].filter(Boolean).join(' ')}>{icon && <Icon name={icon} />}<span>{children}</span></div>;
}

export function Field({label, type = 'text', ...input}: {label: ReactNode} & InputHTMLAttributes<HTMLInputElement>) {
  return <label className="field"><span>{label}</span><input type={type} {...input} /></label>;
}

export function CheckRow({children, ...input}: InputHTMLAttributes<HTMLInputElement>) {
  return <label className="check-row"><input type="checkbox" {...input} />{children}</label>;
}

export function ErrorText({id, children}: {id: string; children?: ReactNode}) {
  return <div id={id} className="error" role="alert">{children}</div>;
}

export const Avatar = ({member, children}: {member: Member; children?: ReactNode}) => (
  <span className={'avatar ' + (member.role === 'caregiver' ? 'sand' : '')}>{children ?? member.name.slice(0, 1)}</span>
);

export function Portrait() {
  return (
    <div className="portrait" aria-hidden="true">
      <svg viewBox="0 0 68 74">
        <path d="M11 75c1-18 10-27 23-27s22 9 24 27" fill="#668ca5" />
        <path d="M28 43h12v12c-4 6-8 6-12 0" fill="#dfba98" />
        <ellipse cx="34" cy="30" rx="18" ry="22" fill="#e8c7a7" />
        <path d="M15 29C10 2 47-1 53 18l-1 13-5-13c-7 6-15 6-23 3l-7 12" fill="#dde5eb" />
        <path d="M17 22c-2-15 8-22 18-20 14-2 21 11 18 24-3-12-5-12-10-15-6 8-13 10-26 11" fill="#f7f9fb" />
        <g stroke="#7c806d" fill="none" strokeWidth="1.1">
          <rect x="21" y="28" width="11" height="8" rx="3" />
          <rect x="37" y="28" width="11" height="8" rx="3" />
          <path d="M32 30h5m-7 12q5 4 10 0" />
        </g>
        <circle cx="27" cy="32" r="1" fill="#777466" />
        <circle cx="42" cy="32" r="1" fill="#777466" />
        <path d="m24 53 10 10 10-10" fill="#e9f0f5" />
      </svg>
    </div>
  );
}

export function DoseRow({e}: {e: DoseEvent}) {
  const {state, openSheet} = useApp();
  const l = e.log, taken = l?.status === 'taken', skip = l?.status === 'skipped', unknown = delayed(state, e);
  const status = taken ? 'Отмечено' : skip ? 'Пропуск' : unknown ? 'Нет отметки' : 'По плану', cls = skip || unknown ? 'red' : taken ? '' : 'gray';
  const source = taken ? `${l.actorName} · ${(l.source && sourceText[l.source]) || 'отметка'} · ${l.time}`
    : skip ? `${l.actorName} · ${l.note || 'причина не указана'}`
    : unknown ? 'Семье нужен ответ'
    : l?.snoozedUntil ? `Напомнить в ${hm(l.snoozedUntil)}` : 'Ожидается отметка о приёме';
  return (
    <div className={'dose-row ' + (unknown || skip ? 'uncertain' : '')}>
      <span className="time">{e.time}</span>
      <div className="grow">
        <div className="med-name"><h3>{e.med.name}</h3><span className={'label ' + cls}>{status}</span></div>
        <p>{e.med.strength} · {e.med.dose} {e.med.unit} · {e.med.note}</p>
        <div className={'dose-source ' + (unknown || skip ? 'warn' : '')}><Icon name={taken ? 'users' : unknown ? 'alert' : 'clock'} />{source}</div>
      </div>
      <button className="detail-link" onClick={() => openSheet('event', {id: e.id})} aria-label={`Открыть приём ${e.med.name} в ${e.time}`}></button>
    </div>
  );
}

export function AlertCard({e, compact = false}: {e: DoseEvent; compact?: boolean}) {
  const {state, openSheet, commit, go} = useApp();
  const s = state.signalState[e.id] || {}, elapsed = Math.max(0, state.clock - mins(e.time)), total = signals(state).length;
  return (
    <section className="alert">
      <div className="row">
        <span className="alert-icon"><Icon name="alert" /></span>
        <div className="grow">
          <h3>{e.log?.status === 'skipped' ? 'Приём отмечен пропущенным' : 'Нет подтверждения приёма'}</h3>
          <p>{e.med.name} · {e.time}</p>
        </div>
        <span className="alert-time">{e.log?.status === 'skipped' ? 'пропуск' : elapsed + ' мин'}</span>
      </div>
      <p style={{marginTop: 12}}>
        {s.owner ? `${s.owner} проверяет ситуацию.` : 'Отметки пока нет. Это не значит, что лекарство точно пропущено.'}
        {s.snoozedUntil !== undefined && s.snoozedUntil > state.clock && ` Повторный сигнал в ${hm(s.snoozedUntil)}.`}
      </p>
      <div className="alert-actions">
        <button className="btn btn-primary btn-small" onClick={() => openSheet('event', {id: e.id})}>Проверить приём <Icon name="arrow" /></button>
        {!compact && <button className="btn btn-white btn-small" disabled={!!s.owner} onClick={() => commit(st => claim(st, e.id)) && openSheet('event', {id: e.id})}>Я проверю</button>}
      </div>
      {compact && total > 1 && <button className="text-link" style={{marginTop: 13}} onClick={() => go('signals')}>Ещё сигналов: {total - 1}</button>}
    </section>
  );
}

export function ActivityRow({a}: {a: AuditEntry}) {
  const {state} = useApp(), who = a.title.startsWith('Елена') ? 'Е' : 'А';
  return (
    <div className="care-activity">
      <span className={'avatar ' + (who === 'Е' ? 'sand' : '')}>{who}</span>
      <div>
        <h3>{a.title}</h3>
        <p>{a.detail}<br />{a.date === state.day ? 'Сегодня' : fmt(a.date)} в {a.time}</p>
      </div>
    </div>
  );
}
