import { Icon } from "./components";
import { SwipeToConfirm } from "./SwipeToConfirm";
import { mins, DOSE_WINDOW_MINUTES } from "./model";
import type { DoseEvent } from "./types";

interface Props {
  events: DoseEvent[];
  clock: number;
  completed: DoseEvent | null;
  onTake: (event: DoseEvent) => void;
}
function until(time: string, clock: number) {
  const remaining = Math.max(0, mins(time) - clock);
  const hours = Math.floor(remaining / 60),
    minutes = remaining % 60;
  return hours
    ? `через ${hours} ч${minutes ? ` ${minutes} мин` : ""}`
    : `через ${minutes} мин`;
}

export function PatientDrum({ events, clock, completed, onTake }: Props) {
  const pending = events.filter(
    (e) =>
      !["taken", "skipped", "missed"].includes(e.log?.status || "") &&
      clock < mins(e.time) + DOSE_WINDOW_MINUTES,
  );
  const current = completed || pending[0];
  const previous = events
    .filter(
      (e) =>
        ["taken", "missed", "skipped"].includes(e.log?.status || "") &&
        e.id !== current?.id,
    )
    .sort(
      (a, b) =>
        (b.log?.time || b.time).localeCompare(a.log?.time || a.time) ||
        b.time.localeCompare(a.time),
    )[0];
  const next = pending.find((e) => e.id !== current?.id);
  const slots = [
    { event: previous, slot: "previous" },
    { event: current, slot: "current" },
    { event: next, slot: "next" },
  ];
  return (
    <div className="patient-drum" aria-label="Лента приёмов на сегодня">
      {slots.map(({ event: e, slot }) => {
        if (!e)
          return slot === "current" ? (
            <section className="drum-finished" key="finished">
              <span className="drum-finished-icon">
                <Icon name="check" />
              </span>
              <h2>На сегодня всё!</h2>
            </section>
          ) : (
            <div
              key={slot}
              className={`drum-placeholder drum-placeholder-${slot}`}
            >
              <Icon name={slot === "previous" ? "sun" : "moon"} />
              <span>
                {slot === "previous"
                  ? "Начнём с первого приёма"
                  : "Других приёмов сегодня нет"}
              </span>
            </div>
          );
        const isCurrent = slot === "current",
          success = isCurrent && !!completed,
          future = mins(e.time) > clock,
          missed = e.log?.status === "missed" || e.log?.status === "skipped";
        return (
          <section
            key={e.id}
            className={`drum-item drum-${slot}${success ? " drum-success" : ""}${future ? " drum-future" : ""}${missed ? " drum-missed" : ""}`}
            aria-label={
              slot === "previous"
                ? missed
                  ? "Не принято"
                  : "Уже принято"
                : slot === "next"
                  ? "Затем по плану"
                  : undefined
            }
          >
            <div className="drum-summary" aria-hidden={isCurrent}>
              <span className="drum-summary-icon">
                <Icon
                  name={
                    slot === "previous" ? (missed ? "close" : "check") : "clock"
                  }
                />
              </span>
              <div className="drum-summary-copy">
                <span className="drum-summary-label">
                  {slot === "previous"
                    ? missed
                      ? "Не принято"
                      : "Уже принято"
                    : "Затем по плану"}
                </span>
                <strong>{e.med.name}</strong>
                <span>
                  {e.med.strength} · {e.med.dose} {e.med.unit}
                </span>
              </div>
              <time>{e.time}</time>
            </div>
            <div
              className="drum-detail senior-card"
              aria-hidden={!isCurrent}
              inert={!isCurrent}
            >
              <div
                className={`drum-status ${success ? "status-success" : future ? "status-upcoming" : "status-ready"}`}
              >
                <Icon name={success ? "check" : future ? "clock" : "pill"} />
                {success
                  ? "Приём отмечен"
                  : future
                    ? "Следующий приём"
                    : "Можно принять сейчас"}
              </div>
              <div className="time-big">{e.time}</div>
              <div className="med-icon">
                <Icon name={success ? "check" : "pill"} />
              </div>
              <h2>{e.med.name}</h2>
              <p className="drum-med-dose">
                {e.med.strength} · {e.med.dose} {e.med.unit}
              </p>
              <p className="drum-med-note">{e.med.note}</p>
              {future && !success ? (
                <div
                  className="drum-wait"
                  role={isCurrent ? "status" : undefined}
                >
                  <Icon name="clock" />
                  <div>
                    <strong>Пока не принимайте</strong>
                    <span>
                      Приём в {e.time} · {until(e.time, clock)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="drum-active-window">
                  <SwipeToConfirm
                    completed={success}
                    disabled={!isCurrent}
                    onComplete={() => onTake(e)}
                  />
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
