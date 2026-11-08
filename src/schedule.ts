import type { ScheduleRevision, ScheduleSettings } from "./types";

export const WEEKDAYS = [
  { value: 1, label: "Пн", name: "Понедельник" },
  { value: 2, label: "Вт", name: "Вторник" },
  { value: 3, label: "Ср", name: "Среда" },
  { value: 4, label: "Чт", name: "Четверг" },
  { value: 5, label: "Пт", name: "Пятница" },
  { value: 6, label: "Сб", name: "Суббота" },
  { value: 0, label: "Вс", name: "Воскресенье" },
];
export const MEAL_LABELS = {
  none: "Не указано",
  before: "До еды",
  after: "После еды",
  with: "Во время еды",
} as const;

export function scheduleForDate(
  base: ScheduleSettings,
  revisions: ScheduleRevision[] | undefined,
  date: string,
): ScheduleSettings {
  return (revisions || []).reduce<
    ScheduleSettings & { effectiveFrom?: string }
  >(
    (selected, revision) =>
      revision.effectiveFrom <= date &&
      (!selected.effectiveFrom ||
        selected.effectiveFrom <= revision.effectiveFrom)
        ? revision
        : selected,
    base,
  );
}

export function weekdayMatches(settings: ScheduleSettings, date: string) {
  return settings.weekdays.includes(new Date(`${date}T12:00:00`).getDay());
}

export function weekdayLabel(weekdays: number[]) {
  return weekdays.length === 7
    ? "Ежедневно"
    : WEEKDAYS.filter((day) => weekdays.includes(day.value))
        .map((day) => day.label)
        .join(", ");
}
