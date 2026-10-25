import {useApp} from '../AppContext.jsx';
import {signals} from '../lib/domain.js';
import {Icon} from './Icon.jsx';

const ITEMS = [['home', 'home', 'Обзор'], ['plan', 'calendar', 'План'], ['stock', 'box', 'Аптечка'], ['signals', 'bell', 'Сигналы'], ['family', 'users', 'Семья']];

export function Nav() {
  const {state, view, go} = useApp(), hasSignals = signals(state).length > 0;
  return (
    <nav id="nav" aria-label="Основная навигация">
      {ITEMS.map(([v, icon, label]) => (
        <button key={v} onClick={() => go(v)} aria-label={label} className={view === v ? 'active' : ''} aria-current={view === v ? 'page' : 'false'}>
          <Icon name={icon} /><span>{label}</span>{v === 'signals' && hasSignals && <i className="nav-dot"></i>}
        </button>
      ))}
    </nav>
  );
}
