import {
  addDays,
  dateObj,
  iso,
  isOwner,
  medicationSchedule,
  medicationForDate,
  record,
} from "./model";
import { procedureSchedule } from "./plan-events";
import { MEAL_LABELS } from "./schedule";
import type { RegularEventTarget, ScheduleSettings, State } from "./types";

export function regularEventHash(target: RegularEventTarget) {
  return target.kind === "medication"
    ? `edit-event/medication/${encodeURIComponent(target.courseId)}/${encodeURIComponent(target.medicationId)}`
    : `edit-event/procedure/${encodeURIComponent(target.id)}`;
}

export function regularEventTarget(hash: string): RegularEventTarget | null {
  try {
    const parts = hash.replace(/^#/, "").split("/").map(decodeURIComponent);
    if (parts[0] !== "edit-event" || parts.some((part) => !part)) return null;
    if (parts[1] === "medication" && parts.length === 4)
      return { kind: "medication", courseId: parts[2], medicationId: parts[3] };
    if (parts[1] === "procedure" && parts.length === 3)
      return { kind: "procedure", id: parts[2] };
  } catch {}
  return null;
}

export function regularEventDetails(state: State, target: RegularEventTarget) {
  if (!isOwner(state)) return null;
  if (target.kind === "medication") {
    const course = state.courses.find((entry) => entry.id === target.courseId);
    const medication = course?.meds.find(
      (entry) => entry.id === target.medicationId && !entry.deletedOn,
    );
    if (!course || !medication) return null;
    const selected = medicationForDate(course, medication, "9999-12-31");
    return {
      title: selected.name,
      unit: selected.unit,
      strength: selected.strength,
      settings: medicationSchedule(course, medication, "9999-12-31"),
      effectiveFrom: [addDays(state.day, 1), course.start].sort().at(-1)!,
      editable: course.active && !medication.endedOn,
      entry: medication,
    };
  }
  const procedure = state.planEvents?.find(
    (entry) =>
      entry.id === target.id &&
      entry.kind === "procedure" &&
      entry.recurrence &&
      !entry.deletedOn,
  );
  if (!procedure) return null;
  return {
    title: procedure.title,
    unit: "",
    strength: "",
    settings: procedureSchedule(procedure, "9999-12-31"),
    effectiveFrom: [addDays(state.day, 1), procedure.date].sort().at(-1)!,
    editable: !procedure.recurrence?.until,
    entry: procedure,
  };
}

export function saveRegularEvent(
  state: State,
  target: RegularEventTarget,
  settings: ScheduleSettings,
) {
  const details = regularEventDetails(state, target);
  const stock = settings.stockId
    ? state.stock.find(
        (entry) =>
          entry.id === settings.stockId &&
          entry.qty > 0 &&
          (!entry.expiry || entry.expiry >= state.day),
      )
    : undefined;
  if (
    !details?.editable ||
    (settings.stockId !== undefined &&
      (target.kind !== "medication" || !stock)) ||
    (settings.note !== undefined && typeof settings.note !== "string") ||
    !settings.weekdays.length ||
    settings.weekdays.some(
      (day) => !Number.isInteger(day) || day < 0 || day > 6,
    ) ||
    new Set(settings.weekdays).size !== settings.weekdays.length ||
    !settings.times.length ||
    settings.times.length > 8 ||
    settings.times.some((time) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) ||
    new Set(settings.times).size !== settings.times.length ||
    !Number.isFinite(settings.dose) ||
    settings.dose <= 0 ||
    !Object.hasOwn(MEAL_LABELS, settings.mealTiming) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(settings.endDate) ||
    iso(dateObj(settings.endDate)) !== settings.endDate ||
    settings.endDate < details.effectiveFrom ||
    settings.endDate > addDays(details.effectiveFrom, 365)
  )
    return false;
  const revision = {
    ...structuredClone(settings),
    stockId: stock?.id ?? details.settings.stockId,
    medication: stock
      ? {
          name: stock.name,
          strength: stock.strength,
          form: stock.form,
          unit: stock.unit,
          pack: stock.pack,
          catalogId: stock.catalogId,
          gtin: stock.gtin,
        }
      : details.settings.medication,
    times: [...settings.times].sort(),
    effectiveFrom: details.effectiveFrom,
    ...(target.kind === "procedure"
      ? {
          dose: 1,
          mealTiming: "none" as const,
          note: (
            settings.note ??
            details.settings.note ??
            details.entry.note
          ).trim(),
        }
      : {}),
  };
  details.entry.scheduleRevisions = [
    ...(details.entry.scheduleRevisions || []).filter(
      (entry) => entry.effectiveFrom < revision.effectiveFrom,
    ),
    revision,
  ];
  record(
    state,
    "plan",
    "Изменено регулярное событие",
    `${details.title} · с ${revision.effectiveFrom}`,
  );
  return true;
}

export function deleteRegularEvent(state: State, target: RegularEventTarget) {
  const details = regularEventDetails(state, target);
  if (!details) return false;
  details.entry.deletedOn = details.effectiveFrom;
  record(
    state,
    "plan",
    "Удалено регулярное событие",
    `${details.title} · будущие события с ${details.effectiveFrom}`,
  );
  return true;
}
