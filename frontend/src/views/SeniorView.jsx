import {useApp} from '../AppContext.jsx';
import {Icon} from '../components/Icon.jsx';
import {events, isClosed, isPast} from '../lib/domain.js';
import {setRole} from '../lib/mutations.js';

// Large-type view for the person receiving care.
export function SeniorView() {
  const {state, openSheet, commit, go} = useApp();
  const e = events(state, state.day).find(e => !isClosed(e.log));
  return <>
    <h1 className="senior-title">Здравствуйте,<br />{state.patient.name}!</h1>
    <p className="senior-sub">Ваш план на сегодня</p>
    {e ? (
      <section className="senior-card">
        <div className="time-big">{e.time}</div>
        <div className={'med-icon ' + (e.med.color || '')}><Icon name="pill" /></div>
        <h2>{e.med.name}</h2>
        <p>{e.med.strength}<br />{e.med.dose} {e.med.unit} · {e.med.note}</p>
        {isPast(state, e)
          ? <button className="btn btn-primary btn-full" onClick={() => openSheet('seniorTake', {id: e.id})}><Icon name="check" /> Я приняла</button>
          : <p>Время приёма ещё не наступило.</p>}
        <p className="caption">Отмечайте только после приёма.</p>
      </section>
    ) : (
      <section className="senior-card">
        <div className="empty-illustration"><Icon name="check" /></div>
        <h2>Всё отмечено</h2>
        <p>На сегодня больше нет ожидающих приёмов.</p>
      </section>
    )}
    <button className="btn btn-white senior-call" onClick={() => openSheet('contact')}><Icon name="phone" /> Связаться с семьёй</button>
    <p className="caption">Семья увидит вашу отметку.<br />Демо: данные обновляются в этом браузере.</p>
    <button className="btn btn-soft btn-full space" onClick={() => {
      commit(s => setRole(s, 'anna'));
      go('home');
    }}>Вернуться к экрану семьи</button>
  </>;
}
