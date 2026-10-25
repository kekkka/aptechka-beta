// Shapes of the persisted app state and the prescription import draft.

export type MedForm = 'Таблетки' | 'Капсулы';
export type MemberRole = 'owner' | 'caregiver' | 'family';
export type Permission = 'view' | 'mark' | 'stock' | 'alerts';
export type MarkSource = 'observed' | 'reported' | 'self';

export interface Patient {
  name: string;
  short: string;
  age: number;
  city: string;
}

export interface Member extends Record<Permission, boolean> {
  id: string;
  name: string;
  relation: string;
  role: MemberRole;
  basis?: string;
}

// The current demo role: a member of the care circle or the patient themself.
export interface Actor extends Record<Permission, boolean> {
  id: string;
  name: string;
  role: MemberRole | 'senior';
  relation?: string;
}

// Identity used to match a medication against stock: name, strength, form, unit.
export interface MedIdentity {
  name: string;
  strength: string;
  form: string;
  unit: string;
}

export interface Med extends MedIdentity {
  id: string;
  form: MedForm;
  dose: number;
  times: string[];
  note: string;
  pack: number | null;
  color: string;
  // Per-drug duration; falls back to the course length.
  days?: number;
}

export interface Course {
  id: string;
  title: string;
  start: string;
  days: number;
  active: boolean;
  demo?: boolean;
  source: string;
  meds: Med[];
  importMethod?: 'local-ocr' | 'text';
  verifiedBy?: string;
  helper?: string;
  excluded?: string[];
}

export interface StockItem extends MedIdentity {
  id: string;
  form: MedForm;
  qty: number;
  pack?: number | null;
  expiry?: string;
  verifiedAt?: string;
}

export interface DoseLog {
  status: 'taken' | 'skipped' | 'snoozed';
  actor?: string;
  actorName?: string;
  source?: MarkSource;
  note?: string;
  time?: string;
  consumed?: number;
  stockId?: string | null;
  snoozedUntil?: number;
}

export interface SignalState {
  resolved?: boolean;
  owner?: string;
  requested?: string;
  snoozedUntil?: number;
}

export interface Settings {
  grace: number;
  backup: string;
  notifications: boolean;
}

export interface AuditEntry {
  id: string;
  type: string;
  title: string;
  detail: string;
  dose?: string | null;
  courseId?: string;
  date: string;
  time: string;
}

export interface AppState {
  version: 1;
  day: string;
  // Minutes since midnight of the demo clock.
  clock: number;
  // A member id or 'senior'.
  role: string;
  patient: Patient;
  members: Member[];
  courses: Course[];
  stock: StockItem[];
  // Keyed by dose id: "courseId|medId|date|time".
  logs: Record<string, DoseLog>;
  signalState: Record<string, SignalState>;
  settings: Settings;
  audit: AuditEntry[];
}

export interface DoseEvent {
  id: string;
  course: Course;
  med: Med;
  date: string;
  time: string;
  log?: DoseLog;
}

// --- Prescription import ---

export interface ParsedMed {
  name: string;
  strength: string;
  form: MedForm | '';
  dose: number | '';
  days: number | '';
  times: string;
  frequency: number | null;
  note: string;
  sourceText: string;
  complex: boolean;
  warnings: string[];
  index: number;
}

// A medication row while the user reviews it; numbers stay strings while being edited.
export interface DraftMed {
  id: string;
  name: string;
  strength: string;
  form: MedForm | '';
  dose: number | string;
  days: number | string;
  times: string;
  note: string;
  pack: string;
  checked: boolean;
  sourceText: string;
  warnings: string[];
  complex: boolean;
  frequency?: number | null;
  unit?: string;
  index?: number;
}

export interface ReadPage {
  text: string;
  confidence: number | null;
  method: string;
  fileName: string;
  page: number;
  preview: string;
}

export interface StockReview {
  qty: number;
  pack: number | null;
  expiry: string;
  checked: boolean;
}

export interface Draft {
  title: string;
  start: string;
  source: string;
  demo: boolean;
  meds: DraftMed[];
  pages: ReadPage[];
  text: string;
  excluded: string[];
  helper: string;
  access: boolean;
  parseId: number;
  ocr?: boolean;
  parseWarnings?: string[];
  stockReview?: StockReview[] | null;
  reviewSignature?: string;
  complete?: boolean;
  simple?: boolean;
  days?: number;
}
