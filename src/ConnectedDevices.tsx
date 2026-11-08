import { Button, Icon } from "./components";
import { hm } from "./model";

const devices = [
  {
    icon: "heart",
    title: "Тонометр",
    metric: "Артериальное давление",
    reading: "128 / 82",
    unit: "мм рт. ст.",
    battery: 84,
    minutesAgo: 5,
  },
  {
    icon: "watch",
    title: "Смарт-часы",
    metric: "Пульс",
    reading: "72",
    unit: "уд/мин",
    battery: 62,
    minutesAgo: 1,
  },
  {
    icon: "activity",
    title: "Пульсоксиметр",
    metric: "Сатурация",
    reading: "97",
    unit: "%",
    battery: 91,
    minutesAgo: 3,
  },
];

export function ConnectedDevices({
  clock,
  onAdd,
}: {
  clock: number;
  onAdd: () => void;
}) {
  return (
    <section
      className="monitor-section connected-devices"
      aria-labelledby="connected-devices-title"
    >
      <div className="monitor-section-heading">
        <h2 id="connected-devices-title">Подключённые устройства</h2>
        <span className="monitor-demo">Демо</span>
      </div>
      <p className="monitor-caption">
        3 устройства · примеры подключения и измерений
      </p>
      <div className="connected-device-list">
        {devices.map((device) => (
          <article className="connected-device" key={device.title}>
            <div className="connected-device-heading">
              <span className="med-icon">
                <Icon name={device.icon} />
              </span>
              <div>
                <h3>{device.title}</h3>
                <p>{device.metric}</p>
              </div>
              <span className="connected-device-status">
                <i />
                На связи
              </span>
            </div>
            <div className="connected-device-reading">
              <strong>{device.reading}</strong>
              <span>{device.unit}</span>
            </div>
            <div className="connected-device-meta">
              <span>Сегодня, {hm(Math.max(0, clock - device.minutesAgo))}</span>
              <span>Заряд {device.battery}%</span>
            </div>
          </article>
        ))}
      </div>
      <p className="connected-devices-note">Показания и статусы вымышлены.</p>
      <Button kind="white" onClick={onAdd}>
        <Icon name="plus" />
        Добавить устройство
      </Button>
    </section>
  );
}
