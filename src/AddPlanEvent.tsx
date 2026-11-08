import { useState, type FormEvent } from "react";
import { Button, Field, Icon } from "./components";
import { uid } from "./model";
import type { Course, PlanEvent } from "./types";

export const MANUAL_EVENT_TYPES = [
  ["medication", "pill", "Приём лекарства", "Препарат, дозировка и расписание"],
  ["procedure", "activity", "Процедура", "Измерение давления, массаж и другое"],
] as const;
type EventKind = (typeof MANUAL_EVENT_TYPES)[number][0];
export function AddPlanEvent({
  date,
  onImport,
  onMedication,
  onEvent,
  regular = false,
}: {
  date: string;
  onImport: () => void;
  onMedication: (course: Course) => boolean;
  onEvent: (event: Omit<PlanEvent, "id" | "completedBy">) => boolean;
  regular?: boolean;
}) {
  const [manual, setManual] = useState(false);
  const [kind, setKind] = useState<EventKind | null>(null);
  const [error, setError] = useState("");
  const [repeat, setRepeat] = useState(regular);

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const value = (name: string) => String(data.get(name) || "").trim();
    const title = value("title");
    const note = value("note");
    const start = value("date");
    const time = value("time");
    let saved = false;
    if (kind === "medication") {
      const days = Number(value("days"));
      saved = onMedication({
        id: uid(),
        title,
        start,
        days,
        active: true,
        source: "Введено вручную",
        meds: [
          {
            id: uid(),
            name: title,
            strength: value("strength"),
            form: value("form"),
            dose: Number(value("dose")),
            unit: value("unit"),
            times: [
              ...new Set(
                value("times")
                  .split(/[,;\s]+/)
                  .filter(Boolean),
              ),
            ].sort(),
            days,
            note,
            pack: 0,
          },
        ],
      });
    } else if (kind) {
      saved = onEvent({
        kind,
        title,
        date: start,
        time,
        note,
        method: "manual",
        ...(repeat
          ? {
              recurrence: {
                days: Number(value("days")),
                intervalDays: Number(value("intervalDays")),
              },
            }
          : {}),
      });
    }
    if (!saved)
      setError(
        "Проверьте поля. Время укажите в формате 08:00, 20:00, а длительность — от 1 до 365 дней.",
      );
  }

  if (!manual)
    return (
      <div className="stack event-options">
        <p>Как добавить событие в план лечения?</p>
        <Button kind="white" onClick={() => setManual(true)}>
          <Icon name="edit" />
          Вручную
        </Button>
        <Button kind="white" onClick={onImport}>
          <Icon name="camera" />
          Отсканировать назначение
        </Button>
      </div>
    );

  if (!kind)
    return (
      <div className="stack event-options">
        <Button kind="soft" onClick={() => setManual(false)}>
          Назад
        </Button>
        <p>Выберите тип события</p>
        {MANUAL_EVENT_TYPES.map(([type, icon, title, description]) => (
          <button
            className="event-option"
            key={type}
            onClick={() => setKind(type)}
          >
            <Icon name={icon} />
            <span>
              <strong>{title}</strong>
              <small>{description}</small>
            </span>
            <Icon name="arrow" />
          </button>
        ))}
      </div>
    );

  return (
    <form onSubmit={save} className="stack event-form">
      <Button
        kind="soft"
        onClick={() => {
          setKind(null);
          setError("");
        }}
      >
        Назад к типам событий
      </Button>
      <h3>{kind === "medication" ? "Приём лекарства" : "Процедура"}</h3>
      <Field
        label={
          kind === "medication" ? "Название лекарства" : "Название процедуры"
        }
        name="title"
        placeholder={
          kind === "procedure" ? "Например, измерение давления" : undefined
        }
      />
      <Field
        label={kind === "medication" || repeat ? "Дата начала" : "Дата"}
        name="date"
        type="date"
        defaultValue={date}
      />
      {kind === "medication" ? (
        <>
          <Field
            label="Дозировка препарата"
            name="strength"
            placeholder="Как в назначении"
          />
          <Field
            label="Форма препарата"
            name="form"
            placeholder="Таблетки, капли и т. п."
          />
          <div className="field-grid">
            <Field
              label="Количество за приём"
              name="dose"
              type="number"
              min={0.001}
              step={0.001}
            />
            <Field
              label="Единица"
              name="unit"
              placeholder="табл., мл, капель"
            />
          </div>
          <Field label="Время приёма" name="times" placeholder="08:00, 20:00" />
          <Field
            label="Длительность, дней"
            name="days"
            type="number"
            min={1}
            max={365}
            defaultValue={1}
          />
        </>
      ) : (
        <>
          <Field label="Время" name="time" type="time" />
          <label className="check-row">
            <input
              type="checkbox"
              checked={repeat}
              onChange={(event) => setRepeat(event.target.checked)}
            />
            Повторять процедуру
          </label>
          {repeat && (
            <>
              <Field
                label="Повторять каждые, дней"
                name="intervalDays"
                type="number"
                min={1}
                max={365}
                defaultValue={1}
              />
              <Field
                label="Длительность расписания, дней"
                name="days"
                type="number"
                min={1}
                max={365}
                defaultValue={7}
              />
            </>
          )}
        </>
      )}
      <label className="field">
        <span>Примечание</span>
        <textarea name="note" rows={3} />
      </label>
      <label className="check-row">
        <input type="checkbox" required />
        Сверил(а) данные с назначением
      </label>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <Button type="submit">Добавить событие</Button>
    </form>
  );
}
