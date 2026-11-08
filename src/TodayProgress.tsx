import { fmt } from "./model";
import { Icon } from "./components";
import { todayProgress } from "./today-progress";
import type { State } from "./types";

export function TodayProgress({
  state,
  onOpen,
}: {
  state: State;
  onOpen: () => void;
}) {
  const { total, completed, remaining, percent } = todayProgress(state);
  return (
    <button
      type="button"
      className="today-progress"
      onClick={onOpen}
      aria-label={`Открыть чеклист на сегодня. Выполнено ${completed} из ${total}`}
    >
      <span className="today-progress-heading">
        <span>
          <span className="today-progress-date">{fmt(state.day)}</span>
          <span className="today-progress-title">События на сегодня</span>
        </span>
        <strong className="today-progress-percent">{percent}%</strong>
      </span>
      <span className="today-progress-count">
        Выполнено {completed} из {total}
      </span>
      <span
        className="today-progress-track"
        role="progressbar"
        aria-label="Выполнение событий на сегодня"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={`Выполнено ${completed} из ${total}`}
      >
        <span style={{ width: `${total ? (completed / total) * 100 : 0}%` }} />
      </span>
      <span className="today-progress-caption">
        {!total
          ? "На сегодня событий нет."
          : !remaining
            ? "Все события на сегодня выполнены."
            : `Осталось выполнить: ${remaining}. Лекарства, процедуры, визиты и уход.`}
      </span>
      <span className="today-progress-link">
        Открыть чеклист на сегодня <Icon name="arrow" />
      </span>
    </button>
  );
}
