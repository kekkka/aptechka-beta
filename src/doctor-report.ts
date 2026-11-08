import {
  addDays,
  canViewCourse,
  diffDays,
  DOSE_WINDOW_MINUTES,
  medKey,
  medicationSchedule,
  medicationForDate,
  mins,
} from "./model";
import type { DoseLog, Medication, State } from "./types";
import { weekdayMatches } from "./schedule";
export type ReportStatus =
  "taken" | "missed" | "skipped" | "waiting" | "planned" | "unknown";
export interface ReportRow {
  id: string;
  date: string;
  time: string;
  course: string;
  med: Medication;
  log?: DoseLog;
  status: ReportStatus;
}
export const reportLabels: Record<ReportStatus, string> = {
  taken: "Принято",
  missed: "Нет отметки",
  skipped: "Пропущено",
  waiting: "Ожидает отметки",
  planned: "По плану",
  unknown: "Нет данных",
};
/** Historical gaps are unknown, never fabricated as confirmed skips. */
export function doctorRows(state: State, days: number): ReportRow[] {
  const start = addDays(state.day, -Math.max(0, days - 1));
  const rows: ReportRow[] = [];
  for (const course of state.courses.filter((c) => canViewCourse(state, c))) {
    for (let day = 0; day < days; day++) {
      const date = addDays(start, day),
        offset = diffDays(course.start, date);
      if (offset < 0) continue;
      for (const med of course.meds) {
        const settings = medicationSchedule(course, med, date);
        if (date > settings.endDate || !weekdayMatches(settings, date))
          continue;
        for (const time of settings.times) {
          const id = [course.id, med.id, date, time].join("|"),
            log = state.logs[id];
          if (!course.active && !log) continue;
          let status: ReportStatus = "unknown";
          if (
            log?.status === "taken" ||
            log?.status === "skipped" ||
            log?.status === "missed"
          )
            status = log.status;
          else if (date === state.day)
            status =
              mins(time) > state.clock
                ? "planned"
                : state.clock < mins(time) + DOSE_WINDOW_MINUTES
                  ? "waiting"
                  : "missed";
          rows.push({
            id,
            date,
            time,
            course: course.title,
            med: {
              ...medicationForDate(course, med, date),
              dose: settings.dose,
              times: settings.times,
              mealTiming: settings.mealTiming,
            },
            log,
            status,
          });
        }
      }
    }
  }
  return rows.sort(
    (a, b) =>
      b.date.localeCompare(a.date) ||
      a.time.localeCompare(b.time) ||
      a.med.name.localeCompare(b.med.name),
  );
}
export function reportTotals(rows: ReportRow[]) {
  return {
    taken: rows.filter((r) => r.status === "taken").length,
    missed: rows.filter((r) => r.status === "missed").length,
    skipped: rows.filter((r) => r.status === "skipped").length,
    unknown: rows.filter((r) => r.status === "unknown").length,
    waiting: rows.filter((r) => r.status === "waiting").length,
    planned: rows.filter((r) => r.status === "planned").length,
  };
}
export function reportMedications(rows: ReportRow[]) {
  const groups = new Map<
    string,
    { key: string; med: Medication; rows: ReportRow[] }
  >();
  for (const row of rows) {
    const key = medKey(row.med);
    const group = groups.get(key) || { key, med: row.med, rows: [] };
    group.rows.push(row);
    groups.set(key, group);
  }
  return [...groups.values()].map((g) => ({
    ...g,
    totals: reportTotals(g.rows),
  }));
}
export function reportSource(log?: DoseLog): string {
  if (!log) return "Записи о приёме нет";
  if (log.source === "timeout") return "Автоматически: нет отметки за час";
  const how =
    log.source === "observed"
      ? "наблюдала лично"
      : log.source === "reported"
        ? "со слов пациента"
        : log.source === "self"
          ? "самостоятельная отметка"
          : "";
  return [log.actorName, how, log.time ? `отмечено в ${log.time}` : ""]
    .filter(Boolean)
    .join(" · ");
}
