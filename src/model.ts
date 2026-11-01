import type {
  State,
  AccountId,
  DoseEvent,
  Medication,
  CareTask,
  ChatAttachment,
} from "./types";
export const KEY = "aptechka_family_mobile_v1";
export const uid = () => crypto.randomUUID();
export function iso(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export const dateObj = (s: string) => new Date(s + "T12:00:00");
export function addDays(s: string, n: number) {
  const d = dateObj(s);
  d.setDate(d.getDate() + n);
  return iso(d);
}
export const diffDays = (a: string, b: string) =>
  Math.round((+dateObj(b) - +dateObj(a)) / 86400000);
export const fmt = (s: string) =>
  dateObj(s).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
export const hm = (n: number) =>
  `${String(Math.floor(n / 60) % 24).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
export const mins = (s: string) =>
  Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
const DAY = iso();
const CARE_TASKS: CareTask[] = [
  {
    id: "ct-feed",
    title: "Покормить",
    time: "12:00",
    icon: "utensils",
    note: "Обед · помочь с едой",
  },
  {
    id: "ct-pressure",
    title: "Замерить давление",
    time: "13:00",
    icon: "activity",
    note: "Записать показатели в журнал",
  },
  {
    id: "ct-walk",
    title: "Прогулка",
    time: "17:00",
    icon: "sun",
    note: "На свежем воздухе, если позволяет погода",
  },
];
export const seed = (): State => ({
  version: 1,
  day: DAY,
  clock: 825,
  role: "anna",
  patient: { name: "Нина Петровна", short: "Мама", age: 74, city: "Тверь" },
  members: [
    {
      id: "anna",
      name: "Анна",
      relation: "Дочь",
      role: "owner",
      view: true,
      mark: true,
      stock: true,
      alerts: true,
    },
    {
      id: "elena",
      name: "Елена",
      relation: "Сиделка",
      role: "caregiver",
      view: true,
      mark: true,
      stock: false,
      alerts: true,
    },
    {
      id: "max",
      name: "Максим",
      relation: "Внук",
      role: "family",
      view: true,
      mark: false,
      stock: false,
      alerts: true,
    },
  ],
  courses: [
    {
      id: "course1",
      title: "После выписки",
      start: addDays(DAY, -3),
      days: 14,
      active: true,
      demo: true,
      source: "Учебная выписка",
      meds: [
        {
          id: "a",
          name: "Препарат А",
          strength: "10 мг",
          form: "Таблетки",
          unit: "табл.",
          dose: 1,
          times: ["08:00", "20:00"],
          note: "После еды",
          pack: 20,
          color: "",
        },
        {
          id: "b",
          name: "Препарат Б",
          strength: "5 мг",
          form: "Таблетки",
          unit: "табл.",
          dose: 1,
          times: ["13:00"],
          note: "Во время еды",
          pack: 14,
          color: "sand",
        },
        {
          id: "c",
          name: "Препарат В",
          strength: "20 мг",
          form: "Капсулы",
          unit: "капс.",
          dose: 1,
          times: ["08:30"],
          note: "По учебному назначению",
          pack: 30,
          color: "lilac",
        },
      ],
    },
  ],
  stock: [
    {
      id: "sa",
      name: "Препарат А",
      strength: "10 мг",
      form: "Таблетки",
      unit: "табл.",
      qty: 8,
      pack: 20,
    },
    {
      id: "sb",
      name: "Препарат Б",
      strength: "5 мг",
      form: "Таблетки",
      unit: "табл.",
      qty: 5,
      pack: 14,
    },
    {
      id: "sc",
      name: "Препарат В",
      strength: "20 мг",
      form: "Капсулы",
      unit: "капс.",
      qty: 16,
      pack: 30,
    },
  ],
  logs: {
    [`course1|a|${DAY}|08:00`]: {
      status: "taken",
      actor: "elena",
      actorName: "Елена",
      source: "observed",
      time: "08:03",
      consumed: 1,
      stockId: "sa",
      note: "Помогла с утренним приёмом.",
    },
    [`course1|c|${DAY}|08:30`]: {
      status: "taken",
      actor: "elena",
      actorName: "Елена",
      source: "reported",
      time: "08:35",
      consumed: 1,
      stockId: "sc",
      note: "Нина Петровна сообщила о приёме.",
    },
  },
  signalState: {},
  settings: { grace: 30, backup: "anna", notifications: true },
  audit: [
    {
      id: "seed2",
      type: "taken",
      dose: `course1|c|${DAY}|08:30`,
      title: "Елена отметила приём",
      detail: "Препарат В · со слов близкого",
      date: DAY,
      time: "08:35",
    },
    {
      id: "seed1",
      type: "taken",
      dose: `course1|a|${DAY}|08:00`,
      title: "Елена отметила приём",
      detail: "Препарат А · наблюдала лично",
      date: DAY,
      time: "08:03",
    },
  ],
  careTasks: CARE_TASKS,
  careDone: {},
  chat: [
    {
      id: "chat-seed",
      sender: "anna",
      text: "Здравствуйте, Елена! Если по плану что-то идёт не так — напишите мне сюда.",
      date: DAY,
      time: "09:00",
    },
  ],
});
export const accounts: {
  id: AccountId;
  role: string;
  name: string;
  description: string;
  color: string;
  icon: string;
}[] = [
  {
    id: "senior",
    role: "Пациент",
    name: "Нина Петровна",
    description: "Мой план лечения и напоминания",
    color: "patient",
    icon: "heart",
  },
  {
    id: "elena",
    role: "Сиделка",
    name: "Елена",
    description: "Помощь с приёмом и забота рядом",
    color: "caregiver",
    icon: "users",
  },
  {
    id: "anna",
    role: "Менеджер лечения",
    name: "Анна",
    description: "Назначения, запасы и координация заботы",
    color: "manager",
    icon: "clipboard",
  },
];
export function loadState(): State {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || "null");
    if (
      s?.version === 1 &&
      Array.isArray(s.courses) &&
      Array.isArray(s.members)
    ) {
      expireDoses(s);
      if (!Array.isArray(s.careTasks)) s.careTasks = CARE_TASKS;
      if (!s.careDone || typeof s.careDone !== "object") s.careDone = {};
      if (!Array.isArray(s.chat)) s.chat = [];
      return s;
    }
  } catch {}
  return seed();
}
export function actor(s: State) {
  return s.role === "senior"
    ? {
        id: "senior",
        name: s.patient.name,
        role: "senior",
        relation: "Пациент",
        view: true,
        mark: true,
        stock: false,
        alerts: false,
      }
    : s.members.find((m) => m.id === s.role) || s.members[0];
}
export const isOwner = (s: State) => s.role === "anna";
export const canViewCourse = (s: State, c: State["courses"][number]) =>
  isOwner(s) || s.role === "senior" || !c.importMethod || c.helper === s.role;
export function events(s: State, date = s.day): DoseEvent[] {
  return s.courses
    .flatMap((c) =>
      canViewCourse(s, c) &&
      c.active &&
      diffDays(c.start, date) >= 0 &&
      diffDays(c.start, date) < c.days
        ? c.meds
            .filter((m) => diffDays(c.start, date) < (m.days || c.days))
            .flatMap((m) =>
              m.times.map((time) => {
                const id = [c.id, m.id, date, time].join("|");
                return { id, course: c, med: m, date, time, log: s.logs[id] };
              }),
            )
        : [],
    )
    .sort((a, b) => a.time.localeCompare(b.time));
}
export const delayed = (s: State, e: DoseEvent) =>
  !["taken", "skipped", "missed"].includes(e.log?.status || "") &&
  e.date === s.day &&
  s.clock - mins(e.time) >= s.settings.grace;
export const signals = (s: State) =>
  events(s).filter(
    (e) =>
      (delayed(s, e) ||
        e.log?.status === "skipped" ||
        e.log?.status === "missed") &&
      !s.signalState[e.id]?.resolved,
  );
const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
export const medKey = (
  m: Pick<Medication, "name" | "strength" | "form" | "unit">,
) => [m.name, m.strength, m.form, m.unit].map(norm).join("|");
export function shopping(s: State) {
  const needs = new Map<
    string,
    { med: Medication; needed: number; end: string }
  >();
  for (const c of s.courses.filter((c) => c.active && canViewCourse(s, c)))
    for (let d = 0; d < c.days; d++) {
      const date = addDays(c.start, d);
      if (date < s.day) continue;
      for (const m of c.meds) {
        if (d >= (m.days || c.days)) continue;
        for (const time of m.times) {
          if (
            ["taken", "skipped", "missed"].includes(
              s.logs[[c.id, m.id, date, time].join("|")]?.status,
            )
          )
            continue;
          const key = medKey(m),
            n = needs.get(key) || { med: m, needed: 0, end: date };
          n.needed += m.dose;
          n.end = date > n.end ? date : n.end;
          needs.set(key, n);
        }
      }
    }
  return [...needs.values()]
    .map((n) => {
      const stock = s.stock.find((st) => medKey(st) === medKey(n.med)),
        qty = stock?.expiry && stock.expiry < n.end ? 0 : stock?.qty || 0,
        missing = Math.max(0, n.needed - qty),
        pack = stock?.pack || n.med.pack;
      return {
        ...n,
        stock,
        qty,
        missing,
        pack,
        packs: pack ? Math.ceil(missing / pack) : null,
      };
    })
    .filter((n) => n.missing > 0);
}
export function record(
  s: State,
  type: string,
  title: string,
  detail = "",
  dose?: string,
) {
  s.audit.unshift({
    id: uid(),
    type,
    title,
    detail,
    dose,
    date: s.day,
    time: hm(s.clock),
  });
  s.audit = s.audit.slice(0, 250);
}
export function markDose(
  s: State,
  id: string,
  status: "taken" | "skipped",
  source: string,
  note = "",
): boolean {
  expireDoses(s);
  const e = events(s).find((e) => e.id === id);
  if (
    !e ||
    !actor(s).mark ||
    e.date > s.day ||
    (e.date === s.day &&
      (mins(e.time) > s.clock ||
        s.clock >= mins(e.time) + DOSE_WINDOW_MINUTES)) ||
    ["taken", "skipped", "missed"].includes(e.log?.status || "")
  )
    return false;
  const st = s.stock.find((st) => medKey(st) === medKey(e.med)),
    consumed =
      status === "taken" && st && (!st.expiry || st.expiry >= s.day)
        ? Math.min(st.qty, e.med.dose)
        : 0;
  if (st) st.qty = Math.round((st.qty - consumed) * 100) / 100;
  s.logs[id] = {
    status,
    actor: actor(s).id,
    actorName: actor(s).name,
    source,
    time: hm(s.clock),
    consumed,
    stockId: st?.id,
    note,
  };
  s.signalState[id] = {};
  record(
    s,
    status,
    actor(s).name +
      (status === "taken" ? " отметила приём" : " отметила пропуск"),
    e.med.name + " · " + note,
    id,
  );
  return true;
}
export function undoDose(s: State, id: string) {
  const l = s.logs[id];
  if (!l || !actor(s).mark || (!isOwner(s) && l.actor !== s.role)) return;
  const st = s.stock.find((st) => st.id === l.stockId);
  if (st) st.qty += l.consumed || 0;
  delete s.logs[id];
  s.signalState[id] = {};
  record(
    s,
    "undo",
    actor(s).name + " исправила отметку",
    "Предыдущая отметка отменена",
    id,
  );
}

/** A care task can be completed within [time − 1 h, time + 1 h). */
export const CARE_WINDOW_MINUTES = 60;
export function careTaskWindow(task: CareTask, clock: number) {
  const t = mins(task.time || "");
  const valid = Number.isFinite(t);
  const start = valid ? t - CARE_WINDOW_MINUTES : 0;
  const end = valid ? t + CARE_WINDOW_MINUTES : 0;
  return {
    start,
    end,
    open: valid && clock >= start && clock < end,
    before: valid && clock < start,
    after: valid && clock >= end,
  };
}

/** Mark a care task done for the current demo day (one-way, idempotent). */
export function completeCareTask(s: State, id: string): boolean {
  const task = s.careTasks.find((t) => t.id === id);
  if (!task) return false;
  if (!careTaskWindow(task, s.clock).open) return false;
  if (s.careDone[id] === s.day) return false;
  s.careDone[id] = s.day;
  record(s, "care", actor(s).name + " выполнила задачу", task.title);
  return true;
}

/** Append a message to the caregiver ↔ manager chat thread. */
export function sendChat(
  s: State,
  text: string,
  attachment?: ChatAttachment,
): void {
  const clean = text.trim();
  if (!clean && !attachment) return;
  s.chat.push({
    id: uid(),
    sender: s.role === "elena" ? "elena" : "anna",
    text: clean,
    date: s.day,
    time: hm(s.clock),
    attachment,
  });
  s.chat = s.chat.slice(-200);
}

/** A dose can be confirmed during [scheduled time, scheduled time + 60 min). */
export const DOSE_WINDOW_MINUTES = 60;
export function expireDoses(s: State): void {
  // Expiry is shared by every role, including courses hidden from that role.
  for (const e of events({ ...s, role: "anna" })) {
    if (
      s.clock < mins(e.time) + DOSE_WINDOW_MINUTES ||
      ["taken", "skipped", "missed"].includes(e.log?.status || "")
    )
      continue;
    const deadline = mins(e.time) + DOSE_WINDOW_MINUTES;
    s.logs[e.id] = {
      status: "missed",
      source: "timeout",
      actor: "system",
      actorName: "Автоматически",
      time: hm(deadline),
      consumed: 0,
      note: "Не отмечено в течение часа после времени приёма",
    };
    s.signalState[e.id] = { ...s.signalState[e.id], resolved: false };
    record(
      s,
      "missed",
      "Приём не отмечен за час",
      e.med.name + " · " + e.time,
      e.id,
    );
    s.audit[0].time = hm(deadline);
  }
}

/** Move the demo clock without clearing recorded dose outcomes. */
export function setDemoTime(s: State, minute: number): void {
  if (!Number.isInteger(minute) || minute < 0 || minute > 1439) return;
  s.clock = minute;
  expireDoses(s);
}

/** Explicitly replay one dose, and only while its scheduled window is active. */
export function resetDemoDose(s: State, id: string): boolean {
  const e = events(s).find((e) => e.id === id);
  if (
    !e ||
    s.clock < mins(e.time) ||
    s.clock >= mins(e.time) + DOSE_WINDOW_MINUTES ||
    !s.logs[id]
  )
    return false;
  const log = s.logs[id];
  if (log.status === "taken" && log.consumed && log.consumed > 0) {
    const stock = s.stock.find((item) => item.id === log.stockId);
    if (stock) stock.qty = Math.round((stock.qty + log.consumed) * 100) / 100;
  }
  delete s.logs[id];
  delete s.signalState[id];
  s.audit = s.audit.filter((entry) => entry.dose !== id);
  return true;
}
