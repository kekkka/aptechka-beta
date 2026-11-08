import {
  addDays,
  dateObj,
  diffDays,
  iso,
  isOwner,
  medicationEnd,
  record,
  uid,
} from "./model";
import type { Course, PlanEvent, State } from "./types";
import { scheduleForDate, weekdayMatches, WEEKDAYS } from "./schedule";
import { calendarTimelineGroup } from "./calendar-timeline";

function validDate(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && iso(dateObj(date)) === date;
}

export function addPlanEvent(
  state: State,
  draft: Omit<PlanEvent, "id" | "completedBy">,
) {
  if (
    !isOwner(state) ||
    !draft.title.trim() ||
    !validDate(draft.date) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.time) ||
    (draft.recurrence &&
      (draft.kind !== "procedure" ||
        !Number.isInteger(draft.recurrence.days) ||
        draft.recurrence.days < 1 ||
        draft.recurrence.days > 365 ||
        !Number.isInteger(draft.recurrence.intervalDays) ||
        draft.recurrence.intervalDays < 1 ||
        draft.recurrence.intervalDays > 365))
  )
    return false;
  const event: PlanEvent = { ...draft, title: draft.title.trim(), id: uid() };
  state.planEvents = [...(state.planEvents || []), event];
  record(
    state,
    "plan",
    "Добавлено событие",
    `${event.title} · ${event.date} ${event.time}`,
  );
  return true;
}

export function canCompletePlanEvent(state: State, event: PlanEvent) {
  const member = state.members.find((entry) => entry.id === state.role);
  const authorized =
    state.role === "senior" || isOwner(state) || (member?.view && member.mark);
  return (
    !!authorized &&
    !event.completedBy &&
    event.date <= state.day &&
    !(member?.role === "caregiver" && calendarTimelineGroup(state, event) === 2)
  );
}

export function completePlanEvent(state: State, id: string) {
  const member = state.members.find((entry) => entry.id === state.role);
  const [baseId, occurrenceDate, occurrenceTime] = id.split("|");
  const event = state.planEvents?.find((entry) => entry.id === baseId);
  const date = event?.recurrence ? occurrenceDate : event?.date;
  if (!event || !date || date > state.day) return false;
  const occurrence = planEventsForDate(state, date).find(
    (entry) => entry.id === id,
  );
  if (!occurrence || !canCompletePlanEvent(state, occurrence)) return false;
  const completedBy =
    state.role === "senior" ? state.patient.name : member?.name || state.role;
  if (event.recurrence) {
    event.completions = {
      ...event.completions,
      [occurrenceTime ? `${date}|${occurrenceTime}` : date]: completedBy,
    };
  } else event.completedBy = completedBy;
  record(
    state,
    "plan",
    "Событие выполнено",
    `${event.title} · ${date} · ${completedBy}`,
  );
  return true;
}

export function planEventsForDate(state: State, date: string, pending = false) {
  const member = state.members.find((entry) => entry.id === state.role);
  if (state.role !== "senior" && !isOwner(state) && !member?.view) return [];
  return (state.planEvents || [])
    .flatMap((event) => {
      if (!event.recurrence)
        return event.date === date && (!pending || !event.completedBy)
          ? [event]
          : [];
      const offset = diffDays(event.date, date);
      const settings = procedureSchedule(event, date);
      const revised = event.scheduleRevisions?.some(
        (revision) => revision.effectiveFrom <= date,
      );
      if (
        offset < 0 ||
        date > settings.endDate ||
        !weekdayMatches(settings, date) ||
        (!revised && offset % event.recurrence.intervalDays)
      )
        return [];
      return settings.times.flatMap((time) => {
        const key = revised ? `${date}|${time}` : date;
        const completedBy = event.completions?.[key];
        return pending && completedBy
          ? []
          : [
              {
                ...event,
                note: settings.note,
                id: `${event.id}|${key}`,
                date,
                time,
                completedBy,
              },
            ];
      });
    })
    .sort((first, second) => first.time.localeCompare(second.time));
}

export function procedureEnd(event: PlanEvent) {
  return procedureSchedule(event, "9999-12-31").endDate;
}

export function procedureSchedule(event: PlanEvent, date: string) {
  const end = addDays(event.date, (event.recurrence?.days || 1) - 1);
  const settings = scheduleForDate(
    {
      weekdays: WEEKDAYS.map((day) => day.value),
      times: [event.time],
      dose: 1,
      mealTiming: "none",
      endDate: end,
    },
    event.scheduleRevisions,
    date,
  );
  const cutoff = [
    event.recurrence?.until,
    event.deletedOn ? addDays(event.deletedOn, -1) : undefined,
  ]
    .filter((value): value is string => !!value)
    .sort()[0];
  const resolved = { ...settings, note: settings.note ?? event.note };
  return cutoff && cutoff < settings.endDate
    ? { ...resolved, endDate: cutoff }
    : resolved;
}

export function endRegularProcedure(state: State, id: string) {
  if (!isOwner(state)) return false;
  const event = state.planEvents?.find(
    (entry) =>
      entry.id === id && entry.kind === "procedure" && entry.recurrence,
  );
  if (
    !event?.recurrence ||
    event.recurrence.until ||
    procedureEnd(event) < state.day
  )
    return false;
  event.recurrence.until = state.day;
  record(state, "plan", "Завершено повторение процедуры", event.title);
  return true;
}

export function addManualMedication(state: State, course: Course) {
  const medication = course.meds[0];
  if (
    !isOwner(state) ||
    !medication?.name.trim() ||
    !medication.unit.trim() ||
    !Number.isFinite(medication.dose) ||
    medication.dose <= 0 ||
    !Number.isInteger(course.days) ||
    course.days < 1 ||
    course.days > 365 ||
    !validDate(course.start) ||
    !medication.times.length ||
    medication.times.some((time) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))
  )
    return false;
  state.courses.push(course);
  record(state, "course", "Добавлен приём лекарства", course.title);
  return true;
}

export function endRegularMedication(
  state: State,
  courseId: string,
  medicationId: string,
) {
  if (!isOwner(state)) return false;
  const course = state.courses.find((entry) => entry.id === courseId);
  const medication = course?.meds.find((entry) => entry.id === medicationId);
  if (
    !course?.active ||
    !medication ||
    medication.endedOn ||
    medicationEnd(course, medication) < state.day
  )
    return false;
  medication.endedOn = state.day;
  record(
    state,
    "course",
    "Завершён регулярный приём",
    `${medication.name} · ${course.title}`,
  );
  return true;
}
