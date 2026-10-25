import {useApp} from '../AppContext.ts';
import {Icon} from '../components/Icon.tsx';
import {Empty, Footer, PageHead} from '../components/ui.tsx';
import {canViewCourse, isOwner} from '../lib/domain.ts';
import {addDays, fmt} from '../lib/utils.ts';

export function CoursesView() {
  const {state, openSheet, go} = useApp(), owner = isOwner(state), courses = state.courses.filter(c => canViewCourse(state, c));
  return <>
    <PageHead title="Назначения врача" subtitle="Из выписки — в понятный план для всей семьи." back />
    {owner && <button className="btn btn-primary btn-full" onClick={() => openSheet('import')}><Icon name="upload" /> Распознать назначение</button>}
    <div className="card space">
      {courses.length ? courses.map(c => (
        <section className="course-card" key={c.id}>
          <div className="between">
            <span className={'label ' + (c.active ? '' : 'gray')}>{c.active ? 'Активный курс' : 'Завершён'}</span>
            {c.demo && <span className="label gray">Учебный пример</span>}
          </div>
          <h3>{c.title}</h3>
          <p>{fmt(c.start)} — {fmt(addDays(c.start, c.days - 1))} · {c.days} дней</p>
          <div className="course-meds">
            {c.meds.map(m => (
              <div className="course-med" key={m.id}>
                <strong>{m.name} · {m.strength}</strong><br />
                <span>{m.dose} {m.unit} · {m.times.join(', ')} · {m.days || c.days} дней · {m.note}</span>
              </div>
            ))}
          </div>
          <div className="between">
            <button className="text-link" onClick={() => go('plan')}>К расписанию <Icon name="arrow" /></button>
            {owner && c.active && <button className="ghost" onClick={() => openSheet('endCourse', {id: c.id})}>Завершить курс</button>}
          </div>
          <p className="caption">Источник: {c.source}. {c.demo ? 'Схема вымышлена.' : 'Оригинал доступен только во время импорта.'}</p>
        </section>
      )) : <Empty title="Пока нет назначений">Добавьте выписку или назначение врача.</Empty>}
    </div>
    <p className="caption">Новая схема требует проверки каждого препарата. Приложение не выбирает лечение и не возобновляет старые назначения.</p>
    <Footer />
  </>;
}
