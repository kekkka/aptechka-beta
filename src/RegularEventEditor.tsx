import { useState, type FormEvent } from "react";
import { Button, Empty, Heading, Icon } from "./components";
import { addDays, fmt } from "./model";
import { regularEventDetails } from "./regular-event-editor";
import { MEAL_LABELS, WEEKDAYS } from "./schedule";
import type {
  MealTiming,
  RegularEventTarget,
  ScheduleSettings,
  State,
} from "./types";

export function RegularEventEditor({
  state,
  target,
  onBack,
  onSave,
  onDelete,
}: {
  state: State;
  target: RegularEventTarget;
  onBack: () => void;
  onSave: (settings: ScheduleSettings) => boolean;
  onDelete: () => boolean;
}) {
  const details = regularEventDetails(state, target);
  const [weekdays, setWeekdays] = useState(details?.settings.weekdays || []);
  const [times, setTimes] = useState(details?.settings.times || ["08:00"]);
  const [dose, setDose] = useState(String(details?.settings.dose || 1));
  const [mealTiming, setMealTiming] = useState<MealTiming>(
    details?.settings.mealTiming || "none",
  );
  const [endDate, setEndDate] = useState(
    details
      ? [details.settings.endDate, details.effectiveFrom].sort().at(-1)!
      : "",
  );
  const [error, setError] = useState("");
  const [note, setNote] = useState(details?.settings.note ?? "");
  const [stockId, setStockId] = useState("");
  const stockOptions = state.stock.filter(
    (entry) => entry.qty > 0 && (!entry.expiry || entry.expiry >= state.day),
  );
  const selectedStock = stockOptions.find((entry) => entry.id === stockId);
  const [deleting, setDeleting] = useState(false);
  if (!details)
    return (
      <>
        <Heading title="Событие недоступно" />
        <Empty title="Событие удалено или нет доступа" />
        <Button kind="white" onClick={onBack}>
          К регулярным событиям
        </Button>
      </>
    );

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!weekdays.length) {
      setError("Выберите хотя бы один день недели.");
      return;
    }
    if (
      !onSave({
        weekdays,
        times,
        dose: Number(dose),
        mealTiming,
        endDate,
        ...(target.kind === "procedure" ? { note } : {}),
        ...(target.kind === "medication" && stockId ? { stockId } : {}),
      })
    )
      setError(
        "Проверьте время, дозировку и дату окончания. Времена не должны повторяться.",
      );
  }

  return (
    <div className="event-editor stack">
      <button
        type="button"
        className="text-link event-editor-back"
        onClick={onBack}
      >
        <Icon name="back" />
        Регулярные события
      </button>
      <Heading
        title="Редактирование события"
        subtitle={target.kind === "procedure" ? details.title : undefined}
      />
      {!details.editable && (
        <p className="field-warning">
          Событие завершено. Его можно удалить; для нового курса добавьте новое
          событие.
        </p>
      )}
      <form className="stack" onSubmit={save}>
        <fieldset
          className="event-editor-fields stack"
          disabled={!details.editable || deleting}
        >
          {target.kind === "medication" && (
            <label className="field">
              <span>Лекарство из аптечки</span>
              <select
                value={stockId}
                onChange={(event) => setStockId(event.target.value)}
              >
                <option value="">
                  {details.title} · {details.strength} (текущее)
                </option>
                {stockOptions.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name} · {entry.strength} · {entry.form} ·{" "}
                    {entry.qty} {entry.unit}
                  </option>
                ))}
              </select>
              {!stockOptions.length && (
                <small>В аптечке нет доступных лекарств для замены.</small>
              )}
            </label>
          )}
          {target.kind === "procedure" && (
            <label className="field">
              <span>Описание процедуры</span>
              <textarea
                rows={4}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Инструкции и заметки о процедуре"
              />
            </label>
          )}
          <fieldset className="event-editor-weekdays">
            <legend>Дни недели</legend>
            <div className="weekday-picker">
              {WEEKDAYS.map((day) => (
                <label key={day.value}>
                  <input
                    type="checkbox"
                    aria-label={day.name}
                    checked={weekdays.includes(day.value)}
                    onChange={(event) =>
                      setWeekdays(
                        event.target.checked
                          ? [...weekdays, day.value]
                          : weekdays.filter((value) => value !== day.value),
                      )
                    }
                  />
                  <span>{day.label}</span>
                </label>
              ))}
            </div>
            <p className="muted">
              Выберите дни, в которые событие должно появляться в календаре.
            </p>
          </fieldset>
          <fieldset className="event-editor-times stack">
            <legend>Время</legend>
            {times.map((time, index) => (
              <div className="row" key={index}>
                <label className="field grow">
                  <span>Время {index + 1}</span>
                  <input
                    type="time"
                    required
                    value={time}
                    onChange={(event) =>
                      setTimes(
                        times.map((value, position) =>
                          position === index ? event.target.value : value,
                        ),
                      )
                    }
                  />
                </label>
                {times.length > 1 && (
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`Удалить время ${index + 1}`}
                    onClick={() =>
                      setTimes(
                        times.filter((_, position) => position !== index),
                      )
                    }
                  >
                    <Icon name="close" />
                  </button>
                )}
              </div>
            ))}
            <Button
              kind="white"
              disabled={times.length >= 8}
              onClick={() => setTimes([...times, ""])}
            >
              <Icon name="plus" />
              Добавить время
            </Button>
          </fieldset>
          {target.kind === "medication" ? (
            <>
              <label className="field">
                <span>
                  Дозировка за один приём, {selectedStock?.unit ?? details.unit}
                </span>
                <input
                  type="number"
                  required
                  min={0.001}
                  step="any"
                  value={dose}
                  onChange={(event) => setDose(event.target.value)}
                />
                <small>
                  {selectedStock?.strength ?? details.strength} · количество в
                  единицах препарата
                </small>
              </label>
              <label className="field">
                <span>Приём относительно еды</span>
                <select
                  value={mealTiming}
                  onChange={(event) =>
                    setMealTiming(event.target.value as MealTiming)
                  }
                >
                  {Object.entries(MEAL_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : (
            <p className="muted">
              Для процедуры дозировка лекарства и приём относительно еды не
              применяются.
            </p>
          )}
          <label className="field">
            <span>Дата конца курса</span>
            <input
              type="date"
              required
              min={details.effectiveFrom}
              max={addDays(details.effectiveFrom, 365)}
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </label>
        </fieldset>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" disabled={!details.editable || deleting}>
          Сохранить изменения
        </Button>
        <Button kind="white" onClick={onBack}>
          Отмена
        </Button>
      </form>
      {deleting ? (
        <section
          className="card event-delete-confirm stack"
          role="alert"
          aria-label="Подтверждение удаления"
        >
          <h3>Удалить «{details.title}»?</h3>
          <p>
            Карточка и будущие события с {fmt(details.effectiveFrom)} будут
            удалены. Остальные лекарства и процедуры, сегодняшние и прошлые
            отметки сохранятся.
          </p>
          <Button
            kind="danger"
            onClick={() => {
              if (!onDelete())
                setError(
                  "Не удалось удалить событие. Вернитесь к списку и повторите.",
                );
            }}
          >
            Да, удалить событие
          </Button>
          <Button kind="white" onClick={() => setDeleting(false)}>
            Не удалять
          </Button>
        </section>
      ) : (
        <Button kind="danger" onClick={() => setDeleting(true)}>
          <Icon name="trash" />
          Удалить событие
        </Button>
      )}
    </div>
  );
}
