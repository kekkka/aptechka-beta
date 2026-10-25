import {useApp} from '../AppContext.ts';
import {Icon} from '../components/Icon.tsx';
import {AlertCard, Empty, Footer, Hint, IconButton, PageHead} from '../components/ui.tsx';
import {isOwner, memberName, signals} from '../lib/domain.ts';
import {plural} from '../lib/utils.ts';

export function SignalsView() {
  const {state, openSheet, go} = useApp(), sg = signals(state), backup = memberName(state, state.settings.backup);
  return <>
    <PageHead
      title="Сигналы семье"
      subtitle={`${sg.length ? `${sg.length} ${plural(sg.length, ['ситуация требует', 'ситуации требуют', 'ситуаций требуют'])} внимания` : 'Все ситуации проверены'}.`}
      action={isOwner(state) && <IconButton icon="bell" label="Настроить сигналы" onClick={() => openSheet('signalSettings')} />}
    />
    <Hint tone="orange" icon="info">Если отметки нет спустя {state.settings.grace} минут, появляется сигнал. Свяжитесь с близким или тем, кто рядом.</Hint>
    {sg.length ? sg.map(e => <AlertCard key={e.id} e={e} />) : (
      <div className="card space"><Empty title="Сейчас спокойно">Открытых сигналов нет. История действий семьи сохранена в журнале.</Empty></div>
    )}
    <div className="section-top between"><h2>Кто подстрахует</h2><button className="text-link" onClick={() => openSheet('signalSettings')}>Настроить</button></div>
    <div className="card padded">
      <div className="row">
        <span className="avatar">{backup.slice(0, 1)}</span>
        <div><h3>{backup}</h3><p className="small muted" style={{marginTop: 4}}>Резервный ответственный</p></div>
      </div>
      <p className="caption">При отсутствии реакции в течение ещё 30 минут сигнал помечается для резервного ответственного. В демо внешняя отправка отключена.</p>
    </div>
    <button className="btn btn-white btn-full space" onClick={() => go('history')}><Icon name="clock" /> Журнал заботы</button>
    <Footer />
  </>;
}
