import {createContext} from 'react';

// Which app is shown: the sign-in screen, the offline demo or the account-backed app.
export type Mode = 'auth' | 'demo' | 'live';

export const ModeContext = createContext<{setMode: (m: Mode) => void} | null>(null);
