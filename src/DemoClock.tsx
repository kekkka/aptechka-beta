import { useState } from "react";
import type { DoseEvent } from "./types";
import { DOSE_WINDOW_MINUTES, hm, mins } from "./model";
import { demoMoments } from "./demo-clock";
import { Icon } from "./components";
export function DemoClock({
  events,
  clock,
  onSelect,
  onReset,
}: {
  events: DoseEvent[];
  clock: number;
  onSelect: (minute: number) => void;
  onReset: (id: string) => void;
}) {
  const [preview, setPreview] = useState(clock);
  const moments = demoMoments(events);
  const active = events.filter(
    (e) => mins(e.time) <= clock && clock < mins(e.time) + DOSE_WINDOW_MINUTES,
  );
  return (
    <div className="demo-time-panel">
      <div className="demo-time-readout">
        <span>{preview === clock ? "Сейчас в демо" : "Выбранное время"}</span>
        <time aria-live="polite">{hm(preview)}</time>
        <span>
          {preview === clock
            ? "Передвиньте шкалу, затем нажмите «Перейти»"
            : `Сейчас в демо ${hm(clock)} · изменения ещё не применены`}
        </span>
      </div>
      <div className="demo-day-scale demo-simple-scale">
        <input
          type="range"
          aria-label="Время на шкале дня"
          min={0}
          max={1439}
          step={1}
          value={preview}
          onChange={(e) => setPreview(Number(e.target.value))}
          style={{
            background: `linear-gradient(to right,#356d87 ${(preview / 1439) * 100}%,#e1eaf0 ${(preview / 1439) * 100}%)`,
          }}
        />
        <div className="demo-day-markers" aria-hidden="true">
          {moments.map((m) => (
            <i key={m.time} style={{ left: `${(m.minute / 1439) * 100}%` }} />
          ))}
        </div>
        <div className="demo-day-labels">
          <span>00:00</span>
          <span>06:00</span>
          <span>12:00</span>
          <span>18:00</span>
          <span>23:59</span>
        </div>
      </div>
      <button
        className="btn btn-primary demo-time-apply"
        disabled={preview === clock}
        onClick={() => onSelect(preview)}
      >
        Перейти к {hm(preview)}
        <Icon name="arrow" />
      </button>
      <p className="demo-time-note">
        <Icon name="info" />
        <span>
          Перемотка сохраняет отметки и запас. Без отметки через час после
          назначенного времени приём становится «Не принято».
        </span>
      </p>
      <section className="demo-reset-section">
        <h3>Отметки в {hm(clock)}</h3>
        <p className="caption">
          Сброс доступен только в часовом окне приёма и только по этой кнопке.
        </p>
        {active.length ? (
          active.map((e) => (
            <div key={e.id} className="demo-reset-card">
              <div className="demo-reset-copy">
                <strong>{e.med.name}</strong>
                <span>
                  {e.time}–{hm(mins(e.time) + DOSE_WINDOW_MINUTES)} ·{" "}
                  {e.med.strength}
                </span>
                <span
                  className={`demo-dose-status status-${e.log?.status || "pending"}`}
                  role="status"
                >
                  {e.log?.status === "taken"
                    ? "Принято"
                    : e.log?.status === "missed" || e.log?.status === "skipped"
                      ? "Не принято"
                      : e.log?.status === "snoozed"
                        ? "Напоминание отложено"
                        : "Без отметки"}
                </span>
              </div>
              <button
                className="btn btn-white"
                disabled={!e.log}
                onClick={() => onReset(e.id)}
                aria-label={`Сбросить отметку: ${e.med.name}`}
              >
                <Icon name="undo" />
                Сбросить
              </button>
            </div>
          ))
        ) : (
          <div className="demo-reset-empty">
            <Icon name="clock" />В это время нет активного приёма. Перейдите к
            его часовому окну, чтобы сбросить отметку.
          </div>
        )}
      </section>
    </div>
  );
}
