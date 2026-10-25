import {useCallback, useEffect, useRef, useState} from 'react';
import {ApiError} from '../api/index.ts';

export const errorText = (e: unknown) => e instanceof ApiError || e instanceof Error ? e.message : 'Что-то пошло не так';

// Loads data for a view and reloads it when deps change. Keeps the previous data
// while reloading so periodic refreshes do not flash an empty screen.
export function useLoad<T>(load: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const loader = useRef(load);
  loader.current = load;
  const run = useCallback(() => {
    let live = true;
    setLoading(true);
    loader.current().then(d => {
      if (!live) return;
      setData(d);
      setError('');
    }, e => live && setError(errorText(e))).finally(() => live && setLoading(false));
    return () => { live = false; };
  }, []);
  useEffect(run, deps);
  return {data, error, loading, reload: run};
}

// Wraps an async action: tracks "busy", reports errors and success through toast.
export function useAction(toast: (msg: string) => void) {
  const [busy, setBusy] = useState(false);
  const act = useCallback(async <T,>(fn: () => Promise<T>, done?: string): Promise<T | undefined> => {
    setBusy(true);
    try {
      const r = await fn();
      if (done) toast(done);
      return r;
    } catch (e) {
      toast(errorText(e));
      return undefined;
    } finally {
      setBusy(false);
    }
  }, [toast]);
  return {busy, act};
}
