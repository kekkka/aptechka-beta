import type { PlanEvent, State } from "./types";

export function sberHealthAppointments(
  state: State,
  date: string,
): PlanEvent[] {
  const canView =
    state.role === "anna" ||
    state.role === "senior" ||
    state.members.some((member) => member.id === state.role && member.view);
  if (!canView || date !== state.day) return [];
  return [
    {
      id: "demo-sber-appointment",
      kind: "appointment",
      title: "Приём кардиолога",
      date: state.day,
      time: "16:30",
      note: "Очный приём · возьмите результаты обследований",
      method: "sber",
      demo: true,
      doctor: "Соколова Мария Андреевна",
      clinic: "Демо-клиника · Тверь, ул. Советская, 12",
      appointmentId: "DEMO-1042",
    },
  ];
}
