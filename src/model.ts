import { DEMO_MEDICATIONS, upgradeDemoMedications } from "./demo-medications";
import type { State, AccountId, DoseEvent, Medication } from "./types";
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
      source: "Учебная выписка · режим приёма демонстрационный",
      meds: [
        {
          id: "a",
          ...DEMO_MEDICATIONS[0],
          dose: 1,
          times: ["08:00", "20:00"],
          note: "После еды",
          color: "",
        },
        {
          id: "b",
          ...DEMO_MEDICATIONS[1],
          dose: 1,
          times: ["13:00"],
          note: "Во время еды",
          color: "sand",
        },
        {
          id: "c",
          ...DEMO_MEDICATIONS[2],
          dose: 1,
          times: ["08:30"],
          note: "По учебному назначению",
          color: "lilac",
        },
      ],
    },
  ],
  stock: [
    {
      id: "sa",
      ...DEMO_MEDICATIONS[0],
      qty: 8,
    },
    {
      id: "sb",
      ...DEMO_MEDICATIONS[1],
      qty: 5,
    },
    {
      id: "sc",
      ...DEMO_MEDICATIONS[2],
      qty: 16,
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
      detail: "Омепразол · со слов близкого",
      date: DAY,
      time: "08:35",
    },
    {
      id: "seed1",
      type: "taken",
      dose: `course1|a|${DAY}|08:00`,
      title: "Елена отметила приём",
      detail: "Эналаприл · наблюдала лично",
      date: DAY,
      time: "08:03",
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
      upgradeDemoMedications(s);
      expireDoses(s);
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
  for (const c of s.courses.filter(
    (c) => c.active && c.start <= s.day && canViewCourse(s, c),
  ))
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
      const batches = s.stock.filter((st) => medKey(st) === medKey(n.med));
      const stock = batches[0],
        qty = batches.reduce(
          (total, st) =>
            total + (!st.expiry || st.expiry >= n.end ? st.qty : 0),
          0,
        ),
        missing = Math.max(0, Math.round((n.needed - qty) * 100) / 100),
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
export function replenishShoppingStock(
  s: State,
  key: string,
  qty: number,
  expiry: string,
  mode: "purchased" | "existing",
): boolean {
  if (
    !actor(s).stock ||
    !Number.isFinite(qty) ||
    qty <= 0 ||
    qty > 100000 ||
    (qty * 4) % 1 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(expiry) ||
    Number.isNaN(+dateObj(expiry)) ||
    expiry < s.day
  )
    return false;
  const need = shopping(s).find((n) => medKey(n.med) === key);
  if (!need) return false;
  s.stock.push({
    id: uid(),
    name: need.med.name,
    strength: need.med.strength,
    form: need.med.form,
    unit: need.med.unit,
    qty,
    pack: need.pack || 0,
    expiry,
  });
  record(
    s,
    "stock",
    actor(s).name +
      (mode === "existing" ? " учла запас дома" : " пополнила аптечку"),
    `${need.med.name} · ${need.med.strength} · +${qty} ${need.med.unit}`,
  );
  return true;
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
  const allocations: { stockId: string; qty: number }[] = [];
  let remaining = status === "taken" ? e.med.dose : 0;
  const batches = s.stock
    .filter(
      (st) =>
        medKey(st) === medKey(e.med) &&
        st.qty > 0 &&
        (!st.expiry || st.expiry >= s.day),
    )
    .sort((a, b) => (a.expiry || "9999").localeCompare(b.expiry || "9999"));
  for (const stock of batches) {
    if (remaining <= 0) break;
    const qty = Math.min(stock.qty, remaining);
    stock.qty = Math.round((stock.qty - qty) * 100) / 100;
    remaining = Math.round((remaining - qty) * 100) / 100;
    allocations.push({ stockId: stock.id, qty });
  }
  const consumed = allocations.reduce((total, a) => total + a.qty, 0);
  s.logs[id] = {
    status,
    actor: actor(s).id,
    actorName: actor(s).name,
    source,
    time: hm(s.clock),
    consumed,
    stockId: allocations[0]?.stockId,
    allocations,
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
  restoreDoseStock(s, l);
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
  if (log.status === "taken") restoreDoseStock(s, log);
  delete s.logs[id];
  delete s.signalState[id];
  s.audit = s.audit.filter((entry) => entry.dose !== id);
  return true;
}

function restoreDoseStock(s: State, log: State["logs"][string]) {
  const allocations =
    log.allocations ??
    (log.stockId && log.consumed
      ? [{ stockId: log.stockId, qty: log.consumed }]
      : []);
  for (const allocation of allocations) {
    const stock = s.stock.find((st) => st.id === allocation.stockId);
    if (stock) stock.qty = Math.round((stock.qty + allocation.qty) * 100) / 100;
  }
}
