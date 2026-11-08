import { Button, Icon } from "./components";
import { fmt } from "./model";
import type { PlanEvent } from "./types";

export function SberAppointmentCard({
  event,
  onOpen,
}: {
  event: PlanEvent;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      className="dose-row dose-button plan-event-row sber-appointment"
      onClick={onOpen}
      aria-label={`${event.title}, ${event.time} — открыть в СберЗдоровье`}
    >
      <span className="time">{event.time}</span>
      <span className="grow">
        <span className="med-name">
          <strong>{event.title}</strong>
          <span className="label gray">
            {event.demo ? "Демо" : "Запись к врачу"}
          </span>
        </span>
        <span className="dose-meta">
          <Icon name="calendar" />
          СберЗдоровье · {event.demo ? "мок автозагрузки" : "запись из сервиса"}
        </span>
        {event.doctor && <span className="dose-meta">{event.doctor}</span>}
        {event.clinic && <span className="dose-meta">{event.clinic}</span>}
        <span className="sber-appointment-link">
          Открыть в СберЗдоровье
          <Icon name="arrow" />
        </span>
      </span>
    </button>
  );
}

export function SberAppointmentStub({
  event,
  onClose,
}: {
  event: PlanEvent;
  onClose: () => void;
}) {
  return (
    <div className="stack">
      <span className="label gray">Демонстрация перехода</span>
      <h3>{event.title}</h3>
      <p>
        {fmt(event.date)} · {event.time}
      </p>
      {event.doctor && <p>{event.doctor}</p>}
      {event.clinic && <p>{event.clinic}</p>}
      {event.note && <p>{event.note}</p>}
      <p>
        Здесь откроется запись в приложении СберЗдоровье. Если приложение не
        установлено, запись откроется в браузере.
      </p>
      <p className="muted">
        Сейчас это заглушка: внешний переход и синхронизация не подключены.
        Реальная запись к врачу не создаётся.
      </p>
      <Button onClick={onClose}>Понятно</Button>
    </div>
  );
}
