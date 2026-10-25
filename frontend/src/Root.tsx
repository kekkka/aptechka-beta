import {useState} from 'react';
import {App} from './App.tsx';
import type {Me} from './api/index.ts';
import {ModeContext, type Mode} from './ModeContext.ts';
import {AuthScreen} from './live/AuthScreen.tsx';
import {LiveApp} from './live/LiveApp.tsx';

const MODE_KEY = 'aptechka_mode';

function storedDemo() {
  try {
    return localStorage.getItem(MODE_KEY) === 'demo';
  } catch {
    return false;
  }
}

function remember(mode: Mode) {
  try {
    if (mode === 'demo') localStorage.setItem(MODE_KEY, 'demo');
    else localStorage.removeItem(MODE_KEY);
  } catch {
    // Private mode: the choice is simply not remembered.
  }
}

// The offline demo keeps working without a server; signing in switches to the
// shared, account-backed app. Credentials stay in memory, so a reload asks again.
export function Root() {
  const [mode, setModeState] = useState<Mode>(() => storedDemo() ? 'demo' : 'auth');
  const [me, setMe] = useState<Me | null>(null);
  const setMode = (m: Mode) => {
    remember(m);
    setModeState(m);
  };
  return (
    <ModeContext.Provider value={{setMode}}>
      {mode === 'demo' ? <App />
        : mode === 'live' && me ? <LiveApp initialMe={me} onLogout={() => { setMe(null); setMode('auth'); }} />
        : <AuthScreen onSignedIn={m => { setMe(m); setMode('live'); }} onDemo={() => setMode('demo')} />}
    </ModeContext.Provider>
  );
}
