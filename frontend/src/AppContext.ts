import {createContext, useContext} from 'react';
import type {SheetProps, SheetType} from './sheets/index.ts';
import type {AppState} from './types.ts';

export type ViewName = 'home' | 'plan' | 'stock' | 'signals' | 'family' | 'courses' | 'devices' | 'history';
export type PlanFilter = 'all' | 'pending';
export type StockTab = 'stock' | 'buy';

// Mutations return false or {error} to reject a change, nothing (or a value) to accept it.
export type CommitResult<R> = R extends void | undefined ? true : R;

// Sheets without required props can be opened with just their type.
export type OpenSheet = <K extends SheetType>(type: K, ...props: {} extends SheetProps[K] ? [props?: SheetProps[K]] : [props: SheetProps[K]]) => void;

export interface AppContextValue {
  state: AppState;
  commit: <R>(mutator: (s: AppState) => R) => CommitResult<R>;
  replaceState: (next: AppState) => void;
  save: (next: AppState) => void;
  resetDemo: () => void;
  toast: (msg: string) => void;
  view: ViewName;
  navigate: (v: ViewName) => void;
  go: (v: ViewName) => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  planFilter: PlanFilter;
  setPlanFilter: (f: PlanFilter) => void;
  stockTab: StockTab;
  setStockTab: (t: StockTab) => void;
  openSheet: OpenSheet;
  closeSheet: () => void;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp() must be used inside <AppContext.Provider>');
  return ctx;
}
