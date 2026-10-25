import {useApp} from '../AppContext.jsx';
import {Icon} from '../components/Icon.jsx';
import {DoseRow, Empty, Footer, IconButton, PageHead} from '../components/ui.jsx';
import {events, isClosed, isOwner} from '../lib/domain.js';
import {addDays, dateObj, fmt} from '../lib/utils.js';

export function PlanView() {
  const {state, openSheet, go, selectedDate, setSelectedDate, planFilter, setPlanFilter} = useApp();
  const weekStart = addDays(selectedDate, -((dateObj(selectedDate).getDay() + 6) % 7)), ev = events(state, selectedDate);
  const visible = planFilter === 'all' ? ev : ev.filter(e => !isClosed(e.log));
  return <>
    <PageHead
      title="План лечения"
      subtitle={`${state.patient.name} · ${fmt(selectedDate)}`}
      action={isOwner(state) && <IconButton icon="plus" label="Добавить назначение" onClick={() => openSheet('import')} />}
    />
    <div className="day-wrap">
      <button className="day-nav" onClick={() => setSelectedDate(addDays(selectedDate, -7))} aria-label="Предыдущая неделя"><Icon name="back" /></button>
      <div className="week">
        {Array.from({length: 7}, (_, i) => {
          const d = addDays(weekStart, i);
          return (
            <button key={d} className={'day ' + (d === selectedDate ? 'active' : '')} onClick={() => setSelectedDate(d)} aria-label={fmt(d)}>
              <span>{fmt(d, {weekday: 'short'})}</span><b>{dateObj(d).getDate()}</b>
            </button>
          );
        })}
      </div>
      <button className="day-nav" onClick={() => setSelectedDate(addDays(selectedDate, 7))} aria-label="Следующая неделя"><Icon name="arrow" /></button>
    </div>
    <div className="segmented">
      <button className={planFilter === 'all' ? 'active' : ''} onClick={() => setPlanFilter('all')}>Все приёмы</button>
      <button className={planFilter === 'pending' ? 'active' : ''} onClick={() => setPlanFilter('pending')}>Без отметки</button>
    </div>
    <div className="card">
      {visible.length ? visible.map(e => <DoseRow key={e.id} e={e} />) : <Empty title="На этот день всё">Нет приёмов, которые соответствуют выбранному фильтру.</Empty>}
    </div>
    <p className="caption">У каждой отметки есть автор и способ подтверждения. Отметка человека не является независимой проверкой приёма.</p>
    <button className="btn btn-white btn-full space" onClick={() => go('courses')}><Icon name="file" /> Назначения и курсы</button>
    <Footer />
  </>;
}
