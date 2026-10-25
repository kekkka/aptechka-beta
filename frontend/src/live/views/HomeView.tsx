import {Icon} from '../../components/Icon.tsx';
import {Empty, Hint} from '../../components/ui.tsx';
import {iso, plural} from '../../lib/utils.ts';
import {dateTime, value} from '../format.ts';
import {useLoad} from '../hooks.ts';
import {useLive} from '../LiveContext.ts';
import {DoseItem, SignalCard} from '../parts.tsx';
import {Head, Loading, Tile} from '../ui.tsx';
import {VitalSheet} from '../sheets/VitalSheet.tsx';

// The watcher's screen. Caregivers get their shift first: what to give now and
// what to measure; relatives and the organiser get the overall picture first.
export function HomeView() {
  const {api, patientId, patient, role, can, version, go, openSheet} = useLive();
  const summary = useLoad(() => api.care.summary(patientId), [patientId, version]);
  const doses = useLoad(() => api.care.schedule(patientId, iso()), [patientId, version]);
  const s = summary.data, caregiver = role === 'CAREGIVER';
  const open = doses.data?.filter(d => d.status !== 'TAKEN' && d.status !== 'SKIPPED') ?? [];

  const shift = (
    <>
      <div className="section-top between">
        <h2>{caregiver ? 'Смена: приёмы на сегодня' : 'Сегодня по плану'}</h2>
        <button className="text-link" onClick={() => go('plan')}>Весь план <Icon name="arrow" /></button>
      </div>
      <div className="card">
        {doses.data && (caregiver ? open : doses.data).length
          ? (caregiver ? open : doses.data.slice(0, 4)).map(d => <DoseItem key={d.courseMedId + d.time} d={d} />)
          : <Empty title={doses.data?.length ? 'Все приёмы отмечены' : 'На сегодня приёмов нет'}>{can('MANAGE') ? 'Добавьте назначение во вкладке «План».' : ''}</Empty>}
      </div>
    </>
  );

  return <>
    <Head title={caregiver ? 'Смена' : `Как дела: ${patient.name}`} subtitle={caregiver ? patient.name : 'Самое важное о близком — с первого взгляда.'} />
    <Loading error={summary.error || doses.error} loading={summary.loading && !s} onRetry={() => { summary.reload(); doses.reload(); }} />
    {s && (
      <section className="patient-card">
        <div className="patient-person">
          <span className="avatar live-avatar">{patient.name.slice(0, 1)}</span>
          <div>
            <h2>{patient.name}</h2>
            <p>{patient.birthYear ? `${new Date().getFullYear() - patient.birthYear} лет` : 'Профиль заботы'}</p>
          </div>
        </div>
        <div className="status-line"><span>Приёмы за сегодня</span><strong>{s.today.taken} из {s.today.total} отмечены</strong></div>
        <div className="mini-progress"><span style={{width: `${s.today.total ? s.today.taken / s.today.total * 100 : 0}%`}}></span></div>
      </section>
    )}
    {caregiver && shift}
    {s && (s.signals.length ? <>
      <div className="section-top"><h2>{s.signals.length} {plural(s.signals.length, ['сигнал', 'сигнала', 'сигналов'])}</h2></div>
      {s.signals.map((x, i) => <SignalCard key={x.kind + (x.refId ?? i) + x.title} s={x} />)}
    </> : (
      <div className="quiet-card row">
        <Icon name="check" />
        <div><h3>Сейчас нет открытых сигналов</h3><p>Отметки о приёмах на месте, показатели в норме.</p></div>
      </div>
    ))}
    {!caregiver && shift}
    {s && <>
      <div className="section-top between">
        <h2>Здоровье</h2>
        <button className="text-link" onClick={() => go('health')}>Дневник <Icon name="arrow" /></button>
      </div>
      {s.latestVitals.length ? (
        <div className="quick-grid">
          {s.latestVitals.map(r => (
            <Tile key={r.id} icon="heart" tone={r.outOfRange ? 'warn' : ''} title={`${r.label}: ${value(r)}`} detail={`${r.unit} · ${dateTime(r.measuredAt)}`} onClick={() => go('health')} />
          ))}
        </div>
      ) : <Hint tone="gray" icon="heart">За двое суток нет измерений.</Hint>}
      {can('RECORD_VITALS') && <button className="btn btn-white btn-full space" onClick={() => openSheet(<VitalSheet />)}><Icon name="plus" /> Записать показатели</button>}
      <div className="quick-grid">
        <Tile icon="bag" title="Нужно докупить" detail={s.shortages ? `${s.shortages} ${plural(s.shortages, ['препарат', 'препарата', 'препаратов'])}` : 'Запасов хватает'} onClick={() => go('stock')} tone={s.shortages ? 'warn' : ''} />
        <Tile icon="users" title="Круг заботы" detail="Роли и доступ" onClick={() => go('circle')} />
      </div>
    </>}
  </>;
}
