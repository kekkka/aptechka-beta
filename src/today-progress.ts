import { events } from "./model";
import { planEventsForDate } from "./plan-events";
import { sberHealthAppointments } from "./sber-health";
import type { State } from "./types";

export function todayProgress(state: State) {
  const doses = events(state);
  const scheduled = [
    ...planEventsForDate(state, state.day),
    ...sberHealthAppointments(state, state.day),
  ].filter((event) => !event.demo);
  const total = doses.length + scheduled.length + state.careTasks.length;
  const completed =
    doses.filter((event) => event.log?.status === "taken").length +
    scheduled.filter((event) => !!event.completedBy).length +
    state.careTasks.filter((task) => state.careDone[task.id] === state.day)
      .length;
  return {
    total,
    completed,
    remaining: total - completed,
    percent: total ? Math.round((completed / total) * 100) : 0,
  };
}
