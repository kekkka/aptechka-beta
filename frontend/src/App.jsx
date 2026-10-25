import {useCallback, useEffect, useRef, useState} from 'react';
import {AppContext} from './AppContext.jsx';
import {Header} from './components/Header.jsx';
import {Nav} from './components/Nav.jsx';
import {SHEETS} from './sheets/index.js';
import {actor, isOwner, normalizeRole} from './lib/domain.js';
import {loadState, persist, seed} from './lib/store.js';
import {HomeView} from './views/HomeView.jsx';
import {PlanView} from './views/PlanView.jsx';
import {StockView} from './views/StockView.jsx';
import {SignalsView} from './views/SignalsView.jsx';
import {FamilyView} from './views/FamilyView.jsx';
import {CoursesView} from './views/CoursesView.jsx';
import {DevicesView} from './views/DevicesView.jsx';
import {HistoryView} from './views/HistoryView.jsx';
import {SeniorView} from './views/SeniorView.jsx';

const VIEWS = {home: HomeView, plan: PlanView, stock: StockView, signals: SignalsView, family: FamilyView, courses: CoursesView, devices: DevicesView, history: HistoryView};
const TITLES = {home: 'Забота о маме', plan: 'План лечения', stock: 'Аптечка', signals: 'Сигналы', family: 'Круг заботы', courses: 'Назначения', devices: 'Устройства', history: 'Журнал заботы'};
const hashView = () => location.hash.slice(1);

function initialState() {
  const s = loadState();
  normalizeRole(s);
  return s;
}

export function App() {
  const [state, setState] = useState(initialState);
  const stateRef = useRef(state);
  const [view, setView] = useState(() => VIEWS[hashView() || 'home'] ? hashView() || 'home' : 'home');
  const [selectedDate, setSelectedDate] = useState(state.day);
  const [planFilter, setPlanFilter] = useState('all');
  const [stockTab, setStockTab] = useState('stock');
  const [sheet, setSheet] = useState(null);
  const sheetCounter = useRef(0), lastFocus = useRef(null);
  const [toastMsg, setToastMsg] = useState('');
  const toastTimer = useRef(null);

  const toast = useCallback(msg => {
    clearTimeout(toastTimer.current);
    setToastMsg(msg);
    toastTimer.current = setTimeout(() => setToastMsg(''), 4500);
  }, []);

  const save = useCallback(next => {
    try {
      persist(next);
    } catch {
      toast('Не удалось сохранить данные в браузере. Скачайте журнал.');
    }
  }, [toast]);

  // Applies a mutation from lib/mutations.js to a copy of the state.
  // Returns the mutation's result; false or {error} leaves the state untouched.
  const commit = useCallback(mutator => {
    const next = structuredClone(stateRef.current), result = mutator(next);
    if (result === false || result?.error) return result;
    normalizeRole(next);
    stateRef.current = next;
    setState(next);
    save(next);
    return result ?? true;
  }, [save]);

  // For states that were already persisted by the caller (course launch) or a reset.
  const replaceState = useCallback(next => {
    stateRef.current = next;
    setState(next);
  }, []);

  const openSheet = useCallback((type, props = {}) => {
    setSheet(current => {
      if (!current) lastFocus.current = document.activeElement;
      return {type, props, key: ++sheetCounter.current};
    });
  }, []);
  const closeSheet = useCallback(() => setSheet(null), []);

  const navigate = useCallback(v => {
    if (!VIEWS[v]) return;
    setView(v);
    location.hash = v;
    window.scrollTo({top: 0, behavior: 'instant'});
  }, []);
  const go = useCallback(v => {
    closeSheet();
    navigate(v);
  }, [closeSheet, navigate]);

  const resetDemo = useCallback(() => {
    const next = seed();
    replaceState(next);
    save(next);
    closeSheet();
    setSelectedDate(next.day);
    setStockTab('stock');
    setPlanFilter('all');
    navigate('home');
    toast('Демо восстановлено.');
  }, [replaceState, save, closeSheet, navigate, toast]);

  useEffect(() => save(stateRef.current), [save]);

  useEffect(() => {
    const onHash = () => {
      if (VIEWS[hashView()]) setView(hashView());
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    document.title = 'Аптечка — ' + TITLES[view];
  }, [view]);

  useEffect(() => {
    if (sheet || !lastFocus.current) return;
    lastFocus.current.focus?.();
    lastFocus.current = null;
  }, [sheet]);

  const ctx = {
    state, commit, replaceState, save, resetDemo, toast,
    view, navigate, go, selectedDate, setSelectedDate, planFilter, setPlanFilter, stockTab, setStockTab,
    openSheet, closeSheet
  };
  const senior = state.role === 'senior', a = actor(state), View = VIEWS[view], CurrentSheet = sheet && SHEETS[sheet.type];

  return (
    <AppContext.Provider value={ctx}>
      <div className={'app' + (senior ? ' senior' : '')} id="app">
        <Header />
        <main id="main">
          {senior ? <SeniorView /> : <>
            {!isOwner(state) && <div className="mode-banner">Демо-роль: {a.relation} · {a.name}</div>}
            <View />
          </>}
        </main>
        <Nav />
      </div>
      <div id="modalRoot">{CurrentSheet && <CurrentSheet key={sheet.key} {...sheet.props} />}</div>
      <div id="toastRoot" aria-live="polite">{toastMsg && <div className="toast">{toastMsg}</div>}</div>
    </AppContext.Provider>
  );
}
