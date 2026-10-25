import {useCallback, useEffect, useRef, useState, type ComponentType} from 'react';
import {AppContext, type AppContextValue, type OpenSheet, type PlanFilter, type StockTab, type ViewName} from './AppContext.ts';
import {Header} from './components/Header.tsx';
import {Nav} from './components/Nav.tsx';
import {SHEETS, type SheetProps, type SheetType} from './sheets/index.ts';
import {actor, isOwner, normalizeRole} from './lib/domain.ts';
import {loadState, persist, seed} from './lib/store.ts';
import type {AppState} from './types.ts';
import {HomeView} from './views/HomeView.tsx';
import {PlanView} from './views/PlanView.tsx';
import {StockView} from './views/StockView.tsx';
import {SignalsView} from './views/SignalsView.tsx';
import {FamilyView} from './views/FamilyView.tsx';
import {CoursesView} from './views/CoursesView.tsx';
import {DevicesView} from './views/DevicesView.tsx';
import {HistoryView} from './views/HistoryView.tsx';
import {SeniorView} from './views/SeniorView.tsx';

const VIEWS: Record<ViewName, ComponentType> = {home: HomeView, plan: PlanView, stock: StockView, signals: SignalsView, family: FamilyView, courses: CoursesView, devices: DevicesView, history: HistoryView};
const TITLES: Record<ViewName, string> = {home: 'Забота о маме', plan: 'План лечения', stock: 'Аптечка', signals: 'Сигналы', family: 'Круг заботы', courses: 'Назначения', devices: 'Устройства', history: 'Журнал заботы'};
const hashView = () => location.hash.slice(1);
const isView = (v: string): v is ViewName => Object.hasOwn(VIEWS, v);

type OpenedSheet = {[K in SheetType]: {type: K; props: SheetProps[K]; key: number}}[SheetType];

function renderSheet<K extends SheetType>(type: K, props: SheetProps[K], key: number) {
  const Component: ComponentType<SheetProps[K]> = SHEETS[type];
  return <Component key={key} {...props} />;
}

function initialState() {
  const s = loadState();
  normalizeRole(s);
  return s;
}

export function App() {
  const [state, setState] = useState(initialState);
  const stateRef = useRef(state);
  const [view, setView] = useState<ViewName>(() => {
    const v = hashView() || 'home';
    return isView(v) ? v : 'home';
  });
  const [selectedDate, setSelectedDate] = useState(state.day);
  const [planFilter, setPlanFilter] = useState<PlanFilter>('all');
  const [stockTab, setStockTab] = useState<StockTab>('stock');
  const [sheet, setSheet] = useState<OpenedSheet | null>(null);
  const sheetCounter = useRef(0), lastFocus = useRef<HTMLElement | null>(null);
  const [toastMsg, setToastMsg] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const toast = useCallback((msg: string) => {
    clearTimeout(toastTimer.current);
    setToastMsg(msg);
    toastTimer.current = setTimeout(() => setToastMsg(''), 4500);
  }, []);

  const save = useCallback((next: AppState) => {
    try {
      persist(next);
    } catch {
      toast('Не удалось сохранить данные в браузере. Скачайте журнал.');
    }
  }, [toast]);

  // Applies a mutation from lib/mutations.js to a copy of the state.
  // Returns the mutation's result; false or {error} leaves the state untouched.
  const commit = useCallback(<R,>(mutator: (s: AppState) => R) => {
    const next = structuredClone(stateRef.current), result = mutator(next);
    if (result === false || (result as {error?: string} | undefined)?.error) return result;
    normalizeRole(next);
    stateRef.current = next;
    setState(next);
    save(next);
    return result ?? true;
  }, [save]) as AppContextValue['commit'];

  // For states that were already persisted by the caller (course launch) or a reset.
  const replaceState = useCallback((next: AppState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const openSheet = useCallback((type: SheetType, props: object = {}) => {
    setSheet(current => {
      if (!current) lastFocus.current = document.activeElement as HTMLElement | null;
      return {type, props, key: ++sheetCounter.current} as OpenedSheet;
    });
  }, []) as OpenSheet;
  const closeSheet = useCallback(() => setSheet(null), []);

  const navigate = useCallback((v: ViewName) => {
    setView(v);
    location.hash = v;
    window.scrollTo({top: 0, behavior: 'instant'});
  }, []);
  const go = useCallback((v: ViewName) => {
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
      const v = hashView();
      if (isView(v)) setView(v);
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

  const ctx: AppContextValue = {
    state, commit, replaceState, save, resetDemo, toast,
    view, navigate, go, selectedDate, setSelectedDate, planFilter, setPlanFilter, stockTab, setStockTab,
    openSheet, closeSheet
  };
  const senior = state.role === 'senior', a = actor(state), View = VIEWS[view];

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
      <div id="modalRoot">{sheet && renderSheet(sheet.type, sheet.props, sheet.key)}</div>
      <div id="toastRoot" aria-live="polite">{toastMsg && <div className="toast">{toastMsg}</div>}</div>
    </AppContext.Provider>
  );
}
