// Shapes of the backend's JSON (backend/src/main/java/ru/aptechka/backend). Dates are
// ISO strings: "YYYY-MM-DD" for days, full ISO instants for moments.

export type CareRole = 'OWNER' | 'CAREGIVER' | 'FAMILY' | 'PATIENT';
export type Permission = 'VIEW_PLAN' | 'VIEW_ALL' | 'MANAGE' | 'MARK_DOSE' | 'EDIT_STOCK' | 'RECORD_VITALS' | 'REQUEST_HELP' | 'RESOLVE_HELP';

export interface Membership {
  patientId: string;
  patientName: string;
  role: CareRole;
  relation: string | null;
  permissions: Permission[];
}

export interface Me {
  id: string;
  email: string;
  displayName: string;
  patients: Membership[];
}

export interface PatientProfile {
  id: string;
  name: string;
  birthYear: number | null;
  notes: string | null;
  graceMinutes: number;
  myRole: CareRole;
  permissions: Permission[];
}

export interface CareMember {
  id: string;
  userId: string;
  displayName: string;
  email: string;
  role: CareRole;
  relation: string | null;
}

export interface CourseMedInput {
  name: string;
  strength: string;
  form: string;
  unit: string;
  dose: number;
  times: string[];
  days: number;
  note?: string;
}

export interface CourseMed extends CourseMedInput {
  id: string;
  lastDay: string;
}

export interface Course {
  id: string;
  title: string;
  startDate: string;
  lastDay: string;
  source: string | null;
  active: boolean;
  endedOn: string | null;
  meds: CourseMed[];
}

export type DoseStatus = 'TAKEN' | 'SKIPPED' | 'PLANNED' | 'DUE' | 'OVERDUE';

export interface Dose {
  courseId: string;
  courseTitle: string;
  courseMedId: string;
  name: string;
  strength: string;
  form: string;
  unit: string;
  dose: number;
  medNote: string | null;
  date: string;
  time: string;
  status: DoseStatus;
  logId: string | null;
  markedByName: string | null;
  markedByRole: CareRole | null;
  markedAt: string | null;
  note: string | null;
  consumedFromStock: boolean;
}

export interface StockItem {
  id: string;
  name: string;
  strength: string;
  form: string;
  unit: string;
  qty: number;
  packSize: number | null;
  expiry: string | null;
  gtin: string | null;
  expired: boolean;
  expiresSoon: boolean;
}

export interface StockInput {
  name: string;
  strength: string;
  form: string;
  unit: string;
  qty: number;
  packSize?: number | null;
  expiry?: string | null;
  gtin?: string | null;
}

export interface ScanResult {
  gtin: string;
  serial: string | null;
  batch: string | null;
  expiry: string | null;
  source: 'STOCK' | 'CATALOG' | 'NONE';
  stockItemId: string | null;
  suggestion: {name: string; strength: string; form: string; unit: string; packSize: number | null; manufacturer: string | null} | null;
}

export interface ShoppingItem {
  name: string;
  strength: string;
  form: string;
  unit: string;
  needed: number;
  inStock: number;
  missing: number;
  packSize: number | null;
  packs: number | null;
}

export type VitalType = 'BLOOD_PRESSURE' | 'PULSE' | 'GLUCOSE' | 'TEMPERATURE' | 'SPO2' | 'WEIGHT' | 'WELLBEING';

export interface Reading {
  id: string;
  type: VitalType;
  label: string;
  unit: string;
  value1: number;
  value2: number | null;
  measuredAt: string;
  recordedByName: string | null;
  note: string | null;
  outOfRange: boolean;
}

export interface Threshold {
  type: VitalType;
  label: string;
  unit: string;
  twoValues: boolean;
  min1: number | null;
  max1: number | null;
  min2: number | null;
  max2: number | null;
  custom: boolean;
}

export interface HelpRequest {
  id: string;
  message: string | null;
  createdAt: string;
  createdByName: string | null;
  resolvedAt: string | null;
  resolvedByName: string | null;
}

export type SignalKind = 'HELP_REQUEST' | 'VITAL_OUT_OF_RANGE' | 'MISSED_DOSE' | 'SKIPPED_DOSE' | 'LOW_STOCK' | 'EXPIRING_STOCK';

export interface Signal {
  kind: SignalKind;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  detail: string;
  at: string | null;
  refId: string | null;
}

export interface Summary {
  patientId: string;
  patientName: string;
  date: string;
  today: {total: number; taken: number; skipped: number; overdue: number; open: number};
  nextDose: Dose | null;
  signals: Signal[];
  latestVitals: Reading[];
  shortages: number;
}
