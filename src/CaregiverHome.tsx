import { useState } from "react";
import { fmt, hm, careTaskWindow } from "./model";
import { Icon, Heading, Modal } from "./components";
import { SwipeToConfirm } from "./SwipeToConfirm";
import type { CareTask, DoseEvent, PlanEvent, State } from "./types";

interface Props {
  state: State;
  events: DoseEvent[];
  onOpenEvent: (e: DoseEvent) => void;
  scheduledEvents?: PlanEvent[];
  onOpenPlanEvent?: (event: PlanEvent) => void;
  onCompleteCare: (id: string) => void;
}

type TodoItem =
  | { kind: "dose"; time: string; event: DoseEvent }
  | { kind: "care"; time: string; task: CareTask }
  | { kind: "scheduled"; time: string; event: PlanEvent };

export function CaregiverHome({
  state,
  events,
  onOpenEvent,
  scheduledEvents = [],
  onOpenPlanEvent,
  onCompleteCare,
}: Props) {
  const [confirmTask, setConfirmTask] = useState<CareTask | null>(null);

  const items: TodoItem[] = [
    ...events.map((event) => ({
      kind: "dose" as const,
      time: event.time,
      event,
    })),
    ...scheduledEvents.map((event) => ({
      kind: "scheduled" as const,
      time: event.time,
      event,
    })),
    ...state.careTasks.map((task) => ({
      kind: "care" as const,
      time: task.time || "23:59",
      task,
    })),
  ].sort((a, b) => a.time.localeCompare(b.time));

  const isDone = (item: TodoItem) =>
    item.kind === "dose"
      ? item.event.log?.status === "taken"
      : item.kind === "scheduled"
        ? !!item.event.completedBy
        : state.careDone[item.task.id] === state.day;

  const doneCount = items.filter(isDone).length;
  const total = items.length;
  const progress = total ? Math.round((doneCount / total) * 100) : 0;

  const upcoming = items.find((item) => !isDone(item));

  return (
    <>
      <Heading
        title="Задачи на сегодня"
        subtitle={`${state.patient.short} · ${fmt(state.day)}`}
      />

      <section className="todo-hero">
        <div className="todo-hero-copy">
          <span className="todo-hero-count">
            {doneCount} из {total} выполнено
          </span>
          <p>
            {doneCount === total
              ? "Все приёмы и задачи на сегодня отмечены."
              : upcoming
                ? `Ближайшее — ${upcoming.time}. Осталось ${total - doneCount} ${
                    total - doneCount === 1 ? "задача" : "задачи"
                  }.`
                : "Проверьте оставшиеся задачи дня."}
          </p>
        </div>
        <div
          className="todo-ring"
          style={{
            background: `conic-gradient(#4c8b74 ${progress}%, #dbe6ec 0)`,
          }}
          aria-hidden="true"
        >
          <strong>{progress}%</strong>
        </div>
      </section>

      <div className="todo-list" aria-label="Список задач на сегодня">
        {items.map((item) => {
          const done = isDone(item);
          const missed =
            item.kind === "dose" &&
            (item.event.log?.status === "missed" ||
              item.event.log?.status === "skipped");
          if (item.kind === "dose") {
            const e = item.event;
            return (
              <button
                key={e.id}
                className={`todo-item ${done ? "done" : ""} ${missed ? "missed" : ""}`}
                onClick={() => onOpenEvent(e)}
              >
                <time className="todo-time">{e.time}</time>
                <span className="todo-icon">
                  <Icon name="pill" />
                </span>
                <span className="todo-copy">
                  <strong>Принять {e.med.name}</strong>
                  <small>
                    {e.med.strength} · {e.med.dose} {e.med.unit}
                    {e.med.note ? ` · ${e.med.note}` : ""}
                  </small>
                </span>
                <span className="todo-status">
                  {done ? (
                    <span className="todo-check on">
                      <Icon name="check" />
                    </span>
                  ) : missed ? (
                    <span className="todo-flag">
                      {e.log?.status === "missed" ? "Не принято" : "Пропуск"}
                    </span>
                  ) : (
                    <Icon name="chevron" />
                  )}
                </span>
              </button>
            );
          }
          if (item.kind === "scheduled") {
            const event = item.event;
            return (
              <button
                key={event.id}
                className={`todo-item ${done ? "done" : ""}`}
                onClick={() => onOpenPlanEvent?.(event)}
              >
                <time className="todo-time">{event.time}</time>
                <span className="todo-icon">
                  <Icon
                    name={event.kind === "procedure" ? "heart" : "calendar"}
                  />
                </span>
                <span className="todo-copy">
                  <strong>{event.title}</strong>
                  {event.note && <small>{event.note}</small>}
                </span>
                <span className="todo-status">
                  {done ? (
                    <span className="todo-check on">
                      <Icon name="check" />
                    </span>
                  ) : (
                    <Icon name="chevron" />
                  )}
                </span>
              </button>
            );
          }
          const t = item.task;
          const window = careTaskWindow(t, state.clock);
          return (
            <button
              key={t.id}
              className={`todo-item ${done ? "done" : ""} ${!done && !window.open ? "locked" : ""}`}
              onClick={() => {
                if (!done && window.open) setConfirmTask(t);
              }}
            >
              <time className="todo-time">{t.time}</time>
              <span className="todo-icon">
                <Icon name={t.icon} />
              </span>
              <span className="todo-copy">
                <strong>{t.title}</strong>
                {t.note && <small>{t.note}</small>}
              </span>
              <span className="todo-status">
                {done ? (
                  <span className="todo-check on">
                    <Icon name="check" />
                  </span>
                ) : window.before ? (
                  <span className="todo-window">
                    Можно с {hm(window.start)}
                  </span>
                ) : window.after ? (
                  <span className="todo-flag">Поздно</span>
                ) : (
                  <span className="todo-check" />
                )}
              </span>
            </button>
          );
        })}
      </div>

      {confirmTask && (
        <Modal
          title={confirmTask.title}
          subtitle={`${state.patient.short} · ${confirmTask.time}`}
          onClose={() => setConfirmTask(null)}
        >
          <div className="care-confirm">
            <span className="care-confirm-icon">
              <Icon name={confirmTask.icon} />
            </span>
            {confirmTask.note && (
              <p className="care-confirm-note">{confirmTask.note}</p>
            )}
            <p className="care-confirm-window">
              Окно выполнения: до{" "}
              {hm(careTaskWindow(confirmTask, state.clock).end)}
            </p>
            <SwipeToConfirm
              label="Процедура выполнена"
              completedLabel="Процедура выполнена"
              hint="Проведите вправо, чтобы подтвердить"
              completedHint="Готово! Забота рядом"
              ariaLabel={`Подтвердить выполнение: ${confirmTask.title}`}
              completed={false}
              onComplete={() => {
                onCompleteCare(confirmTask.id);
                setConfirmTask(null);
              }}
            />
          </div>
        </Modal>
      )}
    </>
  );
}
