import { mins } from "./model";
import type { DoseEvent } from "./types";
export interface DemoMoment {
  time: string;
  minute: number;
  names: string;
  pending: boolean;
}
export function demoMoments(events: DoseEvent[]): DemoMoment[] {
  const groups = new Map<string, DoseEvent[]>();
  for (const e of events)
    groups.set(e.time, [...(groups.get(e.time) || []), e]);
  return [...groups]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([time, items]) => ({
      time,
      minute: mins(time),
      names: items.map((e) => e.med.name).join(", "),
      pending: items.some(
        (e) => !["taken", "skipped", "missed"].includes(e.log?.status || ""),
      ),
    }));
}
export function suggestedMoment(
  moments: DemoMoment[],
  clock: number,
): DemoMoment | undefined {
  return (
    moments.find((m) => m.minute >= clock && m.pending) ||
    moments.find((m) => m.minute >= clock) ||
    moments.find((m) => m.pending) ||
    moments[0]
  );
}
export function demoScenarios(minute: number, grace: number) {
  return [
    {
      id: "before",
      icon: "clock",
      title: "До приёма",
      detail: "За 5 минут · лекарство ещё рано",
      minute: Math.max(0, minute - 5),
      available: minute > 0,
    },
    {
      id: "ready",
      icon: "pill",
      title: "Пора принять",
      detail: "Время приёма · свайп доступен",
      minute,
      available: true,
    },
    {
      id: "late",
      icon: "bell",
      title: "Нет отметки",
      detail: `Через ${grace} мин · появится сигнал`,
      minute: minute + grace,
      available: minute + grace <= 1439,
    },
    {
      id: "expired",
      icon: "close",
      title: "Час прошёл",
      detail: "Без отметки · красный блок и следующий приём",
      minute: minute + 60,
      available: minute + 60 <= 1439,
    },
  ];
}
