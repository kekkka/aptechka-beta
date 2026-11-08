import { Button } from "./components";
import { fmt } from "./model";
import { canCompletePlanEvent, planEventsForDate } from "./plan-events";
import { calendarTimelineGroup } from "./calendar-timeline";
import type { PlanEvent, State } from "./types";

export function ProcedureEventCard({
  event,
  onOpen,
}: {
  event: PlanEvent;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      className="dose-row dose-button"
      onClick={onOpen}
      aria-label={`${event.title}, ${event.time} — открыть процедуру`}
    >
      <span className="time">{event.time}</span>
      <span className="grow">
        <span className="med-name">
          <strong>{event.title}</strong>
          <span className={`label ${event.completedBy ? "" : "gray"}`}>
            {event.completedBy ? "Выполнено" : "По плану"}
          </span>
        </span>
        <span className="dose-meta">
          Процедура{event.note ? ` · ${event.note}` : ""}
        </span>
        {event.completedBy && (
          <span className="dose-source">{event.completedBy}</span>
        )}
      </span>
    </button>
  );
}

export function ProcedureEventDetails({
  state,
  event,
  onComplete,
}: {
  state: State;
  event: PlanEvent;
  onComplete: () => void;
}) {
  const occurrence = planEventsForDate(state, event.date).find(
    (entry) => entry.id === event.id && entry.kind === "procedure",
  );
  if (!occurrence) return <p>Процедура больше недоступна.</p>;
  const member = state.members.find((entry) => entry.id === state.role);
  const canMark = canCompletePlanEvent(state, occurrence);
  const caregiverOverdue =
    member?.role === "caregiver" &&
    calendarTimelineGroup(state, occurrence) === 2;
  return (
    <div className="stack">
      {occurrence.demo && <span className="label gray">Демо-процедура</span>}
      <h3>{occurrence.title}</h3>
      <p>
        {fmt(occurrence.date)} · {occurrence.time}
      </p>
      {occurrence.note && <p className="plan-event-note">{occurrence.note}</p>}
      {occurrence.sourceText && (
        <details>
          <summary>Текст назначения</summary>
          <p className="plan-event-note">{occurrence.sourceText}</p>
        </details>
      )}
      {occurrence.completedBy ? (
        <p>Выполнено · {occurrence.completedBy}</p>
      ) : occurrence.date > state.day ? (
        <p className="muted">
          Отметить выполнение можно в день процедуры или позже.
        </p>
      ) : caregiverOverdue ? (
        <p className="muted">
          Событие просрочено. Для изменения отметки обратитесь к менеджеру
          лечения.
        </p>
      ) : canMark ? (
        <Button onClick={onComplete}>Отметить выполнение</Button>
      ) : (
        <p className="muted">Нет права отмечать выполнение процедуры.</p>
      )}
    </div>
  );
}
