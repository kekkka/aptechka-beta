import {useApp} from '../AppContext.ts';
import {Icon} from '../components/Icon.tsx';
import {ActivityRow, AlertCard, DoseRow, Empty, Footer, PageHead, Portrait} from '../components/ui.tsx';
import {canViewCourse, events, isOwner, shopping, signals, visibleAudit} from '../lib/domain.ts';
import {plural} from '../lib/utils.ts';

export function HomeView() {
  const {state, openSheet, go, setStockTab} = useApp();
  const ev = events(state, state.day), done = ev.filter(e => e.log?.status === 'taken').length, sg = signals(state), need = shopping(state);
  const active = state.courses.filter(c => c.active && canViewCourse(state, c)).length;
  return <>
    <PageHead title="Как дела у мамы?" subtitle="Самое важное о близком — с первого взгляда." />
    <section className="patient-card">
      <div className="patient-person">
        <Portrait />
        <div>
          <h2>{state.patient.name}</h2>
          <p>{state.patient.age} года · {state.patient.city}</p>
          <span className="label patient-relation">{state.patient.short}</span>
        </div>
        <button className="chevron" onClick={() => openSheet('patient')} aria-label="Профиль родственника"><Icon name="chevron" /></button>
      </div>
      <div className="status-line"><span>Приёмы за сегодня</span><strong>{done} из {ev.length} отмечены</strong></div>
      <div className="mini-progress"><span style={{width: `${ev.length ? done / ev.length * 100 : 0}%`}}></span></div>
    </section>
    {sg.length ? <AlertCard e={sg[0]} compact /> : (
      <div className="quiet-card row">
        <Icon name="check" />
        <div><h3>Сейчас нет открытых сигналов</h3><p>Это статус отметок, а не оценка самочувствия.</p></div>
      </div>
    )}
    {isOwner(state) && (
      <button className="import-entry" onClick={() => openSheet('import')}>
        <span className="scan-symbol"><Icon name="file" /></span>
        <span><strong>Распознать назначение</strong><small>Фото или PDF → готовый план</small></span>
        <span className="import-entry-arrow"><Icon name="arrow" /></span>
      </button>
    )}
    <div className="quick-grid">
      <button className="quick-card" onClick={() => go('courses')}>
        <span className="quick-icon"><Icon name="file" /><span className="arrow"><Icon name="arrow" /></span></span>
        <strong>Назначения врача</strong>
        <small>{active} {plural(active, ['активный курс', 'активных курса', 'активных курсов'])}</small>
      </button>
      <button className="quick-card" onClick={() => {
        setStockTab('buy');
        go('stock');
      }}>
        <span className="quick-icon"><Icon name="bag" /><span className="arrow"><Icon name="arrow" /></span></span>
        <strong>Нужно докупить</strong>
        <small>{need.length ? `${need.length} ${plural(need.length, ['препарат', 'препарата', 'препаратов'])} на курс` : 'Запасов хватает'}</small>
      </button>
    </div>
    <div className="section-top between"><h2>Сегодня по плану</h2><button className="text-link" onClick={() => go('plan')}>Весь день <Icon name="arrow" /></button></div>
    <div className="card">
      {ev.length ? ev.slice(0, 3).map(e => <DoseRow key={e.id} e={e} />) : <Empty title="Пока нет плана">Добавьте назначение, чтобы создать расписание.</Empty>}
    </div>
    <div className="section-top between"><h2>Вы заботитесь вместе</h2><button className="text-link" onClick={() => go('family')}>Круг заботы <Icon name="arrow" /></button></div>
    <div className="card">{visibleAudit(state).slice(0, 2).map(a => <ActivityRow key={a.id} a={a} />)}</div>
    <div className="future-card">
      <span className="orb"><Icon name="watch" /></span>
      <div>
        <h3>Больше уверенности в будущем</h3>
        <p>Датчики, голосовые напоминания и события с камер — следующий этап.</p>
        <button className="text-link" onClick={() => go('devices')}>Посмотреть возможности <Icon name="arrow" /></button>
      </div>
    </div>
    <Footer />
  </>;
}
