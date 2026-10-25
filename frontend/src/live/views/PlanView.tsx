import {useState} from 'react';
import {Icon} from '../../components/Icon.tsx';
import {Empty, IconButton} from '../../components/ui.tsx';
import {addDays, fmt, iso} from '../../lib/utils.ts';
import {doseText, shortDate} from '../format.ts';
import {useAction, useLoad} from '../hooks.ts';
import {useLive} from '../LiveContext.ts';
import {DoseItem} from '../parts.tsx';
import {CourseSheet} from '../sheets/CourseSheet.tsx';
import {Head, Loading} from '../ui.tsx';

export function PlanView() {
  const {api, patientId, patient, can, version, refresh, toast, openSheet} = useLive(), {busy, act} = useAction(toast);
  const [date, setDate] = useState(iso());
  const doses = useLoad(() => api.care.schedule(patientId, date), [patientId, date, version]);
  const courses = useLoad(() => api.care.courses(patientId), [patientId, version]);
  const today = iso();

  return <>
    <Head title="План лечения" subtitle={`${patient.name} · ${fmt(date, {weekday: 'long', day: 'numeric', month: 'long'})}`}
      action={can('MANAGE') && <IconButton icon="plus" label="Добавить назначение" onClick={() => openSheet(<CourseSheet />)} />} />
    <div className="day-wrap live-day">
      <button className="day-nav" onClick={() => setDate(addDays(date, -1))} aria-label="Предыдущий день"><Icon name="back" /></button>
      <button className={'btn btn-small ' + (date === today ? 'btn-primary' : 'btn-white')} onClick={() => setDate(today)}>Сегодня</button>
      <button className="day-nav" onClick={() => setDate(addDays(date, 1))} aria-label="Следующий день"><Icon name="arrow" /></button>
    </div>
    <Loading error={doses.error} loading={doses.loading && !doses.data} onRetry={doses.reload} />
    <div className="card">
      {doses.data?.length ? doses.data.map(d => <DoseItem key={d.courseMedId + d.time} d={d} />)
        : doses.data && <Empty title="На этот день приёмов нет">{can('MANAGE') ? 'Добавьте назначение кнопкой «+».' : 'Организатор ещё не добавил назначения на этот день.'}</Empty>}
    </div>
    <p className="caption">У каждой отметки есть автор и роль. Отметка человека — это его слова, а не независимая проверка приёма.</p>

    <div className="section-top between"><h2>Назначения</h2>{can('MANAGE') && <button className="text-link" onClick={() => openSheet(<CourseSheet />)}>Добавить</button>}</div>
    <Loading error={courses.error} loading={courses.loading && !courses.data} onRetry={courses.reload} />
    <div className="card space">
      {courses.data?.length ? courses.data.map(c => (
        <section className="course-card" key={c.id}>
          <div className="between"><span className={'label ' + (c.active ? '' : 'gray')}>{c.active ? 'Активный курс' : 'Завершён'}</span></div>
          <h3>{c.title}</h3>
          <p>{shortDate(c.startDate)} — {shortDate(c.endedOn ?? c.lastDay)}{c.source ? ' · ' + c.source : ''}</p>
          <div className="course-meds">
            {c.meds.map(m => (
              <div className="course-med" key={m.id}>
                <strong>{m.name} · {m.strength}</strong><br />
                <span>{doseText(m)} · {m.times.join(', ')} · {m.days} дн.{m.note ? ' · ' + m.note : ''}</span>
              </div>
            ))}
          </div>
          {can('MANAGE') && c.active && (
            <button className="ghost" disabled={busy} onClick={() => confirm(`Завершить курс «${c.title}»? Будущие приёмы исчезнут из плана.`)
              && act(() => api.care.endCourse(patientId, c.id), 'Курс завершён').then(refresh)}>Завершить курс</button>
          )}
        </section>
      )) : courses.data && <Empty title="Назначений пока нет">{can('MANAGE') ? 'Сфотографируйте назначение врача или введите его вручную.' : ''}</Empty>}
    </div>
  </>;
}
