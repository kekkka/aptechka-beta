import type { PlanEvent, State } from "./types";

export const DEMO_PROCEDURE_ID = "demo-regular-pressure";
const PRESSURE_DESCRIPTION =
  "Ежедневный контроль артериального давления и пульса. Запишите результаты измерения, чтобы отслеживать изменения и обсудить их с врачом.";

export function demoProcedure(date: string): PlanEvent {
  return {
    id: DEMO_PROCEDURE_ID,
    kind: "procedure",
    title: "Измерение давления",
    date,
    time: "09:00",
    note: PRESSURE_DESCRIPTION,
    method: "manual",
    demo: true,
    recurrence: { days: 14, intervalDays: 1 },
  };
}

export function upgradeDemoProcedures(state: State) {
  state.planEvents ||= [];
  const existing = state.planEvents.find((event) => event.id === DEMO_PROCEDURE_ID);
  if (!existing) {
    state.planEvents.push(demoProcedure(state.day));
  } else if (
    existing.note === "Демо-процедура для проверки расписания и редактирования."
  ) {
    existing.note = PRESSURE_DESCRIPTION;
  }
}
