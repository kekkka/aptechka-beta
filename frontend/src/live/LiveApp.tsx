import {useCallback, useEffect, useRef, useState, type ReactNode} from 'react';
import {api, type Me, type PatientProfile, type Permission} from '../api/index.ts';
import {Icon, type IconName} from '../components/Icon.tsx';
import {Sheet} from '../components/Sheet.tsx';
import {ROLE_LABEL} from './format.ts';
import {errorText} from './hooks.ts';
import {LiveContext, useLive, type LiveContextValue, type LiveView} from './LiveContext.ts';
import {Onboarding} from './Onboarding.tsx';
import {CircleView} from './views/CircleView.tsx';
import {HealthView} from './views/HealthView.tsx';
import {HomeView} from './views/HomeView.tsx';
import {PatientHome} from './views/PatientHome.tsx';
import {PlanView} from './views/PlanView.tsx';
import {StockView} from './views/StockView.tsx';

// Other people in the care circle change data too; poll so the screen stays current.
const REFRESH_MS = 30_000;

const VIEWS: Record<LiveView, () => ReactNode> = {home: HomeView, plan: PlanView, stock: StockView, health: HealthView, circle: CircleView};
const NAV: [LiveView, IconName, string][] = [['home', 'home', 'Обзор'], ['plan', 'calendar', 'План'], ['stock', 'box', 'Аптечка'], ['health', 'heart', 'Здоровье'], ['circle', 'users', 'Семья']];

export function LiveApp({initialMe, onLogout}: {initialMe: Me; onLogout: () => void}) {
  const [me, setMe] = useState(initialMe);
  const [patientId, setPatientId] = useState(initialMe.patients[0]?.patientId ?? '');
  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [loadError, setLoadError] = useState('');
  const [view, setView] = useState<LiveView>('home');
  const [version, setVersion] = useState(0);
  const [sheet, setSheet] = useState<ReactNode>(null);
  const [toastMsg, setToastMsg] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const toast = useCallback((msg: string) => {
    clearTimeout(toastTimer.current);
    setToastMsg(msg);
    toastTimer.current = setTimeout(() => setToastMsg(''), 4500);
  }, []);
  const refresh = useCallback(() => setVersion(v => v + 1), []);
  const closeSheet = useCallback(() => setSheet(null), []);
  const logout = useCallback(() => {
    api.auth.logout();
    onLogout();
  }, [onLogout]);

  const reloadMe = useCallback(async () => {
    const next = await api.auth.me();
    setMe(next);
    setPatientId(id => next.patients.some(p => p.patientId === id) ? id : next.patients[0]?.patientId ?? '');
    setVersion(v => v + 1);
  }, []);

  useEffect(() => {
    if (!patientId) return;
    let live = true;
    api.care.patient(patientId).then(p => {
      if (!live) return;
      setPatient(p);
      setLoadError('');
    }, e => live && setLoadError(errorText(e)));
    return () => { live = false; };
  }, [patientId, version]);

  useEffect(() => {
    const t = setInterval(() => { if (!document.hidden) setVersion(v => v + 1); }, REFRESH_MS);
    return () => clearInterval(t);
  }, []);

  const membership = me.patients.find(p => p.patientId === patientId);
  const toastNode = <div id="toastRoot" aria-live="polite">{toastMsg && <div className="toast">{toastMsg}</div>}</div>;

  if (!membership) {
    return (
      <div className="app" id="app">
        <LiveHeader title="аптечка" onOpen={null} />
        <main id="main">
          <Onboarding api={api} me={me} onLogout={logout}
            onRefresh={() => reloadMe().then(() => toast('Список профилей обновлён'), e => toast(errorText(e)))}
            onCreated={id => reloadMe().then(() => setPatientId(id))} />
        </main>
        {toastNode}
      </div>
    );
  }
  if (!patient || patient.id !== patientId) {
    return (
      <div className="app" id="app">
        <LiveHeader title="аптечка" onOpen={null} />
        <main id="main">
          {loadError ? <div className="hint orange" role="alert"><Icon name="alert" /><span>{loadError} <button className="text-link" onClick={refresh}>Повторить</button></span></div>
            : <p className="caption">Загружаем профиль…</p>}
        </main>
      </div>
    );
  }

  const ctx: LiveContextValue = {
    api, me, membership, patient, patientId, role: patient.myRole,
    can: (p: Permission) => patient.permissions.includes(p),
    view, go: v => { setSheet(null); setView(v); window.scrollTo({top: 0, behavior: 'instant'}); },
    version, refresh, reloadMe, openSheet: setSheet, closeSheet, toast,
    switchPatient: id => { setSheet(null); setView('home'); setPatient(null); setPatientId(id); },
    logout
  };
  const senior = patient.myRole === 'PATIENT', View = VIEWS[view];

  return (
    <LiveContext.Provider value={ctx}>
      <div className={'app' + (senior ? ' senior' : '')} id="app">
        <LiveHeader title={patient.name} subtitle={ROLE_LABEL[patient.myRole]} onOpen={() => setSheet(<AccountSheet />)} />
        <main id="main">{senior ? <PatientHome /> : <View />}</main>
        {!senior && (
          <nav id="nav" aria-label="Основная навигация">
            {NAV.map(([v, icon, label]) => (
              <button key={v} onClick={() => ctx.go(v)} aria-label={label} className={view === v ? 'active' : ''} aria-current={view === v ? 'page' : 'false'}>
                <Icon name={icon} /><span>{label}</span>
              </button>
            ))}
          </nav>
        )}
      </div>
      <div id="modalRoot">{sheet}</div>
      {toastNode}
    </LiveContext.Provider>
  );
}

function LiveHeader({title, subtitle, onOpen}: {title: string; subtitle?: string; onOpen: (() => void) | null}) {
  return (
    <header id="header">
      <div className="between">
        <span className="brand"><span className="brand-mark"><Icon name="cross" /></span>аптечка</span>
        {onOpen && (
          <button className="profile-btn" onClick={onOpen} aria-label="Профиль и аккаунт">
            <span className="avatar">{title.slice(0, 1)}</span>{title.split(' ')[0]}<Icon name="chevron" />
          </button>
        )}
      </div>
      <div className="header-note"><span><i className="dot"></i>{subtitle ?? 'Рядом, даже на расстоянии'}</span></div>
    </header>
  );
}

function AccountSheet() {
  const {me, patientId, switchPatient, closeSheet, logout} = useLive();
  return (
    <Sheet title={me.displayName} subtitle={me.email} onClose={closeSheet}>
      <h3>Профили, к которым у вас есть доступ</h3>
      <div className="card space">
        {me.patients.map(p => (
          <button key={p.patientId} className="list-item live-row" onClick={() => switchPatient(p.patientId)} aria-current={p.patientId === patientId}>
            <span className="avatar">{p.patientName.slice(0, 1)}</span>
            <div className="grow"><h3>{p.patientName}</h3><p>{ROLE_LABEL[p.role]}{p.relation ? ' · ' + p.relation : ''}</p></div>
            {p.patientId === patientId && <span className="label">Открыт</span>}
          </button>
        ))}
      </div>
      <button className="btn btn-white btn-full space" onClick={logout}>Выйти из аккаунта</button>
    </Sheet>
  );
}
