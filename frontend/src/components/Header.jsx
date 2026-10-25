import {useApp} from '../AppContext.jsx';
import {actor} from '../lib/domain.js';
import {hm} from '../lib/utils.js';
import {Icon} from './Icon.jsx';

export function Header() {
  const {state, openSheet} = useApp(), a = actor(state);
  return (
    <header id="header">
      <div className="between">
        <a className="brand" href="#home"><span className="brand-mark"><Icon name="cross" /></span>аптечка</a>
        <button className="profile-btn" onClick={() => openSheet('roles')} aria-label="Переключить демо-роль">
          <span className={'avatar ' + (a.role === 'caregiver' ? 'sand' : '')}>{a.name.slice(0, 1)}</span>{a.name.split(' ')[0]}<Icon name="chevron" />
        </button>
      </div>
      <div className="header-note">
        <span><i className="dot"></i>Рядом, даже на расстоянии</span>
        <button className="text-link demo-clock" onClick={() => openSheet('clock')}>Демо · {hm(state.clock)}</button>
      </div>
    </header>
  );
}
