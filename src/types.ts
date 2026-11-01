export type AccountId = "senior" | "elena" | "anna";
export type View =
  | "home"
  | "plan"
  | "stock"
  | "chat"
  | "courses"
  | "history"
  | "devices"
  | "doctor";
export interface Member {
  id: string;
  name: string;
  relation: string;
  role: string;
  view: boolean;
  mark: boolean;
  stock: boolean;
  alerts: boolean;
}
export interface Medication {
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
  version: number;
  day: string;
  clock: number;
  role: string;
  patient: { name: string; short: string; age: number; city: string };
  members: Member[];
  courses: Course[];
  stock: Stock[];
  logs: Record<string, DoseLog>;
  signalState: Record<string, SignalState>;
  settings: { grace: number; backup: string; notifications: boolean };
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
