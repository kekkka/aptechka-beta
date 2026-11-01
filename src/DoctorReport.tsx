import { HealthMetrics } from "./HealthMetrics";
import { useMemo, useState } from "react";
import { addDays, fmt, hm } from "./model";
import {
  doctorRows,
  reportLabels,
  reportMedications,
  reportSource,
  reportTotals,
  type ReportRow,
} from "./doctor-report";
import { Icon } from "./components";
import type { State } from "./types";

export function DoctorReport({
  state,
  onBack,
}: {
  state: State;
  onBack: () => void;
}) {
  const [days, setDays] = useState(7),
    [mode, setMode] = useState<"days" | "meds">("days"),
    [filter, setFilter] = useState("all");
  const rows = useMemo(() => doctorRows(state, days), [state, days]),
    totals = reportTotals(rows),
    meds = reportMedications(rows);
  const filtered = rows.filter(
    (row) =>
      filter === "all" ||
      (filter === "taken" && row.status === "taken") ||
      (filter === "attention" && ["missed", "skipped"].includes(row.status)),
  );
  const dates = [...new Set(filtered.map((row) => row.date))];
  const rowView = (row: ReportRow) => (
    <div className={`doctor-dose doctor-dose-${row.status}`} key={row.id}>
      <time>{row.time}</time>
      <span className="doctor-dose-dot">
        <Icon
          name={
            row.status === "taken"
              ? "check"
              : row.status === "missed" || row.status === "skipped"
                ? "close"
                : "clock"
          }
        />
      </span>
      <div className="doctor-dose-copy">
        <div className="doctor-dose-title">
          <strong>{row.med.name}</strong>
          <span className={`doctor-status doctor-status-${row.status}`}>
            {reportLabels[row.status]}
          </span>
        </div>
        <p>
          {row.med.strength} · {row.med.dose} {row.med.unit} · {row.med.form}
        </p>
        <p className="doctor-dose-source">{reportSource(row.log)}</p>
        {row.log?.note && <p className="doctor-dose-note">{row.log.note}</p>}
      </div>
    </div>
  );
  return (
    <div className="doctor-report">
      <button className="doctor-back" onClick={onBack}>
        <Icon name="back" />
        Назад к приёмам
      </button>
      <div className="doctor-heading">
        <span className="doctor-kicker">ИНФОРМАЦИЯ ДЛЯ ВРАЧА</span>
        <h1>История приёмов</h1>
        <p>Назначения и отметки за выбранный период</p>
      </div>
      <section className="doctor-patient">
        <span className="doctor-patient-avatar">
          <Icon name="users" />
        </span>
        <div>
          <h2>{state.patient.name}</h2>
          <p>
            {state.patient.age} года · {state.patient.city}
          </p>
        </div>
        <span className="doctor-read-only">
          <Icon name="eye" />
          Просмотр
        </span>
      </section>
      <div className="doctor-period" aria-label="Период отчёта">
        {[
          { days: 1, label: "Сегодня" },
          { days: 7, label: "7 дней" },
          { days: 30, label: "30 дней" },
        ].map((p) => (
          <button
            key={p.days}
            aria-pressed={days === p.days}
            className={days === p.days ? "active" : ""}
            onClick={() => setDays(p.days)}
          >
            {p.label}
          </button>
        ))}
      </div>
      <p className="doctor-period-caption">
        {days === 1
          ? fmt(state.day)
          : `${fmt(addDays(state.day, -days + 1))} — ${fmt(state.day)}`}{" "}
        · демо-время {hm(state.clock)}
      </p>
      <div className="doctor-stats">
        <div className="stat-taken">
          <strong>{totals.taken}</strong>
          <span>Принято</span>
        </div>
        <div className="stat-missed">
          <strong>{totals.missed + totals.skipped}</strong>
          <span>Нет приёма*</span>
        </div>
        <div className="stat-unknown">
          <strong>{totals.unknown}</strong>
          <span>Нет данных</span>
        </div>
      </div>
      <p className="doctor-stats-note">
        * Пропуски и приёмы без отметки в течение часа. Отсутствие отметки не
        подтверждает, что лекарство не принято.
      </p>
      <HealthMetrics day={state.day} days={days} clock={state.clock} />
      <section className="doctor-medication-section">
        <div className="doctor-section-heading">
          <h2>Лекарства и приёмы</h2>
          <span>{meds.length} препаратов</span>
        </div>
        <div className="segmented doctor-view-switch">
          <button
            className={mode === "days" ? "active" : ""}
            aria-pressed={mode === "days"}
            onClick={() => setMode("days")}
          >
            По дням
          </button>
          <button
            className={mode === "meds" ? "active" : ""}
            aria-pressed={mode === "meds"}
            onClick={() => setMode("meds")}
          >
            По препаратам
          </button>
        </div>
        {mode === "days" ? (
          <>
            <div className="doctor-filters" aria-label="Фильтр отметок">
              {[
                { value: "all", label: "Все" },
                { value: "taken", label: "Принято" },
                { value: "attention", label: "Пропуски / нет отметки" },
              ].map((f) => (
                <button
                  key={f.value}
                  className={filter === f.value ? "active" : ""}
                  aria-pressed={filter === f.value}
                  onClick={() => setFilter(f.value)}
                >
                  {f.label}
                </button>
              ))}
            </div>
            {dates.length ? (
              dates.map((date) => (
                <section className="doctor-day" key={date}>
                  <div className="doctor-day-heading">
                    <h3>{date === state.day ? "Сегодня" : fmt(date)}</h3>
                    <time>{date === state.day ? fmt(date) : ""}</time>
                  </div>
                  <div className="doctor-day-card">
                    {filtered.filter((row) => row.date === date).map(rowView)}
                  </div>
                </section>
              ))
            ) : (
              <div className="doctor-empty">
                <Icon name="clipboard" />
                <h3>Записей по этому фильтру нет</h3>
                <p>Выберите другой период или покажите все приёмы</p>
              </div>
            )}
          </>
        ) : (
          <div className="doctor-med-groups">
            {meds.length ? (
              meds.map((group) => (
                <details className="doctor-med-group" key={group.key}>
                  <summary>
                    <span className="med-icon">
                      <Icon name="pill" />
                    </span>
                    <span>
                      <strong>{group.med.name}</strong>
                      <small>
                        {group.med.strength} · {group.med.form}
                      </small>
                      <span className="doctor-med-counts">
                        <b>{group.totals.taken} принято</b>
                        <span>
                          {group.totals.missed + group.totals.skipped} без
                          приёма
                        </span>
                      </span>
                    </span>
                    <Icon name="chevron" />
                  </summary>
                  <div className="doctor-med-log">
                    {group.rows.map((row) => (
                      <div key={row.id} className="doctor-med-log-row">
                        <span>
                          {fmt(row.date)} · {row.time}
                        </span>
                        <span
                          className={`doctor-status doctor-status-${row.status}`}
                        >
                          {reportLabels[row.status]}
                        </span>
                      </div>
                    ))}
                  </div>
                </details>
              ))
            ) : (
              <div className="doctor-empty">
                <h3>Назначений за этот период нет</h3>
              </div>
            )}
          </div>
        )}
      </section>
      <p className="doctor-report-note">
        <Icon name="info" />
        История основана на отметках пациента и помощников. За прошлые дни без
        записей показано «Нет данных».
      </p>
    </div>
  );
}
