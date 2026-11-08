import { DOSE_WINDOW_MINUTES, mins } from "./model";
import type { DoseEvent, PlanEvent, State } from "./types";

export function calendarTimelineGroup(
  state: Pick<State, "day" | "clock">,
  event: DoseEvent | PlanEvent,
): number {
  const medication = "course" in event;
  const marked = medication
    ? event.log?.status === "taken" || event.log?.status === "skipped"
    : !!event.completedBy;
  if (marked) return 1;
  if (medication && event.log?.status === "missed") return 2;
  const deadline = mins(event.time) + (medication ? DOSE_WINDOW_MINUTES : 0);
  return event.date < state.day ||
    (event.date === state.day && state.clock >= deadline)
    ? 2
    : 0;
}
