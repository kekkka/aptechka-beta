export type AccountId = "senior" | "elena" | "anna";
export type View =
  | "home"
  | "plan"
  | "edit-event"
  | "stock"
  | "chat"
  | "courses"
  | "history"
  | "devices"
  | "profile"
  | "doctor";
export interface Member {
  id: string;
  name: string;
  contact?: string;
  relation: string;
  role: string;
  view: boolean;
  mark: boolean;
  stock: boolean;
  alerts: boolean;
}
export interface Medication {
  mealTiming?: MealTiming;
  scheduleRevisions?: ScheduleRevision[];
  deletedOn?: string;
  catalogId?: string;
  gtin?: string;
  id: string;
  name: string;
  strength: string;
  form: string;
  unit: string;
  dose: number;
  times: string[];
  note: string;
  pack: number;
  color?: string;
  days?: number;
  endedOn?: string;
}
export interface Course {
  id: string;
  title: string;
  start: string;
  days: number;
  active: boolean;
  demo?: boolean;
  source?: string;
  meds: Medication[];
  importMethod?: string;
  helper?: string;
}
export interface Stock {
  catalogId?: string;
  gtin?: string;
  id: string;
  name: string;
  strength: string;
  form: string;
  unit: string;
  qty: number;
  pack: number;
  expiry?: string;
}
export interface CareTask {
  id: string;
  title: string;
  time: string;
  icon: string;
  note?: string;
}
export interface PlanEvent {
  scheduleRevisions?: ScheduleRevision[];
  deletedOn?: string;
  id: string;
  kind: "procedure" | "appointment";
  title: string;
  date: string;
  time: string;
  note: string;
  method: "manual" | "scan" | "sber";
  demo?: boolean;
  sourceText?: string;
  doctor?: string;
  clinic?: string;
  appointmentId?: string;
  completedBy?: string;
  recurrence?: {
    days: number;
    intervalDays: number;
    until?: string;
  };
  completions?: Record<string, string>;
}
export type MealTiming = "none" | "before" | "after" | "with";
export interface ScheduleSettings {
  stockId?: string;
  medication?: Pick<
    Medication,
    "name" | "strength" | "form" | "unit" | "pack" | "catalogId" | "gtin"
  >;
  note?: string;
  weekdays: number[];
  times: string[];
  dose: number;
  mealTiming: MealTiming;
  endDate: string;
}
export interface ScheduleRevision extends ScheduleSettings {
  effectiveFrom: string;
}
export type RegularEventTarget =
  | { kind: "medication"; courseId: string; medicationId: string }
  | { kind: "procedure"; id: string };
export interface ChatAttachment {
  kind: "dose" | "care";
  title: string;
  detail: string;
}
export interface ChatMessage {
  id: string;
  sender: "elena" | "anna";
  text: string;
  date: string;
  time: string;
  attachment?: ChatAttachment;
}
export interface DoseLog {
  takenAt?: string;
  allocations?: { stockId: string; qty: number }[];
  status: "taken" | "skipped" | "missed" | "snoozed";
  actor?: string;
  actorName?: string;
  source?: string;
  time?: string;
  consumed?: number;
  stockId?: string;
  note?: string;
  snoozedUntil?: number;
}
export interface SignalState {
  owner?: string;
  resolved?: boolean;
  requested?: string;
  snoozedUntil?: number;
}
export interface Audit {
  id: string;
  type: string;
  dose?: string | null;
  courseId?: string;
  title: string;
  detail: string;
  date: string;
  time: string;
}
export interface State {
  planEvents?: PlanEvent[];
  notificationReads?: Record<string, Record<string, string>>;
  version: number;
  day: string;
  clock: number;
  role: string;
  patient: {
    name: string;
    short: string;
    age: number;
    city: string;
    contact?: string;
  };
  members: Member[];
  courses: Course[];
  stock: Stock[];
  logs: Record<string, DoseLog>;
  signalState: Record<string, SignalState>;
  settings: {
    grace: number;
    backup: string;
    notifications: boolean;
    emergencyContact?: string;
  };
  audit: Audit[];
  careTasks: CareTask[];
  careDone: Record<string, string>;
  chat: ChatMessage[];
}
export interface DoseEvent {
  id: string;
  course: Course;
  med: Medication;
  date: string;
  time: string;
  log?: DoseLog;
}
export interface ParsedMed {
  name: string;
  strength: string;
  form: string;
  dose: number | "";
  days: number | "";
  times: string;
  frequency: number | null;
  note: string;
  sourceText: string;
  complex: boolean;
  warnings: string[];
  index: number;
}
