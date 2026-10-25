import {createContext, useContext, type ReactNode} from 'react';
import type {Api, CareRole, Me, Membership, PatientProfile, Permission} from '../api/index.ts';

export type LiveView = 'home' | 'plan' | 'stock' | 'health' | 'circle';

export interface LiveContextValue {
  api: Api;
  me: Me;
  membership: Membership;
  patient: PatientProfile;
  patientId: string;
  role: CareRole;
  can: (p: Permission) => boolean;
  view: LiveView;
  go: (v: LiveView) => void;
  // Bumped after every change and on a timer; views reload when it changes.
  version: number;
  refresh: () => void;
  // Reloads the account (memberships) and the current profile.
  reloadMe: () => Promise<void>;
  openSheet: (node: ReactNode) => void;
  closeSheet: () => void;
  toast: (msg: string) => void;
  switchPatient: (id: string) => void;
  logout: () => void;
}

export const LiveContext = createContext<LiveContextValue | null>(null);

export function useLive() {
  const ctx = useContext(LiveContext);
  if (!ctx) throw new Error('useLive() must be used inside <LiveContext.Provider>');
  return ctx;
}
