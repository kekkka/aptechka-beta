import type { State } from "./types";

export interface PatientCallSchedule {
  mode: "interval" | "times";
  intervalHours: number;
  start: string;
  end: string;
  times: string[];
}
export const defaultCallSchedule: PatientCallSchedule = {
  mode: "interval", intervalHours: 3, start: "09:00", end: "21:00", times: ["09:00", "15:00", "20:00"],
};
export function callSchedule(state: State): PatientCallSchedule {
  return structuredClone(state.settings.patientCalls || defaultCallSchedule);
}
export function saveCallSchedule(state: State, schedule: PatientCallSchedule): boolean {
  const time = (v: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
  if (state.role !== "anna") return false;
  if (schedule.mode === "interval") {
    if (!Number.isInteger(schedule.intervalHours) || schedule.intervalHours < 1 || schedule.intervalHours > 24
      || !time(schedule.start) || !time(schedule.end) || schedule.end <= schedule.start) return false;
  } else if (schedule.mode === "times") {
    if (!schedule.times.length || !schedule.times.every(time) || new Set(schedule.times).size !== schedule.times.length) return false;
  } else return false;
  state.settings.patientCalls = structuredClone({ ...schedule, times: [...schedule.times].sort() });
  return true;
}
export function demoCalls(state: State) {
  const stamp = (minutes: number) => {
    const d = new Date(`${state.day}T00:00:00Z`);
    d.setUTCMinutes(state.clock - minutes);
    return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)}`;
  };
  return [
    { id: "call-missed", at: stamp(30), status: "missed" as const, title: "Пациент не ответил", summary: "Не удалось обновить сведения о самочувствии.", transcript: [] },
    { id: "call-symptoms", at: stamp(120), status: "completed" as const, title: "Нужно внимание", summary: "Жалуется на головную боль и головокружение, сообщает о повышении давления.", transcript: [
      { speaker: "Помощник", text: "Как вы себя сейчас чувствуете?" },
      { speaker: "Пациент", text: "Сегодня болит голова и кружится. Кажется, давление поднялось." },
      { speaker: "Помощник", text: "Вы измеряли давление?" },
      { speaker: "Пациент", text: "Нет, пока не измеряла. Когда встаю, чувствую слабость." },
    ] },
    { id: "call-well", at: stamp(360), status: "completed" as const, title: "Без жалоб", summary: "Сообщает о хорошем самочувствии, жалоб во время разговора нет.", transcript: [
      { speaker: "Помощник", text: "Как ваше самочувствие?" },
      { speaker: "Пациент", text: "Чувствую себя хорошо. Ничего не болит, позавтракала." },
    ] },
  ];
}
export function latestCondition(state: State) {
  return demoCalls(state).find(call => call.status === "completed")!;
}
