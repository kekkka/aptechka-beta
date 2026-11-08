import { useState } from "react";
import type { State } from "./types";
import { Button, Heading, Icon, Modal } from "./components";
import { HealthMetrics } from "./HealthMetrics";
import { ConnectedDevices } from "./ConnectedDevices";
import { callSchedule, latestCondition, type PatientCallSchedule } from "./monitoring";

export function PatientCondition({ state, onOpen }: { state: State; onOpen: () => void }) {
  if (state.role !== "anna") return null;
  const condition = latestCondition(state);
  return <button className="condition-card" onClick={onOpen}>
    <span className="monitor-eyebrow">АКТУАЛЬНОЕ СОСТОЯНИЕ <span className="monitor-demo">Демо</span></span>
    <span className="condition-title"><Icon name="activity" /><strong>{condition.title}</strong><Icon name="arrow" /></span>
    <span className="condition-summary">{condition.summary}</span>
    <span className="condition-source">По словам пациента · звонок {condition.at}</span>
    <span className="condition-missed"><Icon name="phone" />Последний звонок — без ответа. Резюме сохранено.</span>
  </button>;
}

export function PatientMonitoring({ state, onBack, onSave }: {
  state: State; onBack: () => void; onSave: (schedule: PatientCallSchedule) => boolean;
}) {
  const [schedule, setSchedule] = useState(() => callSchedule(state));
  const [editingSchedule, setEditingSchedule] = useState(false);
  const [message, setMessage] = useState("");
  const [days, setDays] = useState(1);
  const [connecting, setConnecting] = useState(false);
  const [device, setDevice] = useState("");
  if (state.role !== "anna") return null;
  const savedSchedule = callSchedule(state);
  const condition = latestCondition(state);
  const update = (patch: Partial<PatientCallSchedule>) => { setSchedule(s => ({ ...s, ...patch })); setMessage(""); };
  return <div className="patient-monitoring">
    <button className="text-link" onClick={onBack}><Icon name="back" />На главную</button>
    <Heading title="Мониторинг состояния" subtitle="Самочувствие, звонки и показатели здоровья." />
    <section className="monitor-condition">
      <div className="monitor-section-heading"><h2>Актуальное состояние</h2><span className="monitor-demo">Демо</span></div>
      <h3>{condition.title}</h3><p>{condition.summary}</p>
      <small>По словам пациента · {condition.at}</small>
      <div className="condition-missed"><Icon name="phone" />Последний звонок без ответа — новых сведений нет.</div>
    </section>
    <section className="monitor-section monitor-schedule">
      <div className="monitor-schedule-summary"><div><h2>Расписание звонков</h2>
        <p className="monitor-caption">{savedSchedule.mode === "interval" ? `Каждые ${savedSchedule.intervalHours} ч · ${savedSchedule.start}–${savedSchedule.end}` : `Ежедневно · ${savedSchedule.times.join(", ")}`}</p>
      </div><Button kind="white" onClick={() => { setSchedule(callSchedule(state)); setMessage(""); setEditingSchedule(true); }}><Icon name="edit" />Настроить</Button></div>
      {!editingSchedule && message && <p className="monitor-save-message" role="status">{message}</p>}
    </section>
    <ConnectedDevices clock={state.clock} onAdd={() => { setDevice(""); setConnecting(true); }} />
    <section className="monitor-section"><div className="segmented"><button className={days === 1 ? "active" : ""} onClick={() => setDays(1)}>День</button><button className={days === 7 ? "active" : ""} onClick={() => setDays(7)}>Неделя</button></div><HealthMetrics day={state.day} clock={state.clock} days={days} iot /></section>
    {editingSchedule && <Modal title="Расписание звонков" onClose={() => { setEditingSchedule(false); setMessage(""); }}><div className="monitor-schedule-editor">      <form onSubmit={event => { event.preventDefault(); if (onSave(schedule)) { setEditingSchedule(false); setMessage("Расписание сохранено."); } else setMessage("Проверьте интервал, временное окно и повторяющиеся времена."); }}>
        <div className="segmented space"><button type="button" className={schedule.mode === "interval" ? "active" : ""} onClick={() => update({ mode: "interval" })}>По интервалу</button><button type="button" className={schedule.mode === "times" ? "active" : ""} onClick={() => update({ mode: "times" })}>В определённое время</button></div>
        {schedule.mode === "interval" ? <>
          <label className="field"><span>Звонить каждые, часов</span><input type="number" min="1" max="24" step="1" required value={schedule.intervalHours} onChange={e => update({ intervalHours: Number(e.target.value) })} /></label>
          <div className="field-grid"><label className="field"><span>Начиная с</span><input type="time" required value={schedule.start} onChange={e => update({ start: e.target.value })} /></label><label className="field"><span>До</span><input type="time" required value={schedule.end} onChange={e => update({ end: e.target.value })} /></label></div>
        </> : <div className="monitor-times">{schedule.times.map((time, i) => <div key={i}><label className="field"><span>Звонок {i + 1}</span><input type="time" required value={time} onChange={e => update({ times: schedule.times.map((t, j) => j === i ? e.target.value : t) })} /></label><button type="button" className="icon-btn" aria-label={`Удалить время звонка ${i + 1}`} disabled={schedule.times.length === 1} onClick={() => update({ times: schedule.times.filter((_, j) => j !== i) })}><Icon name="close" /></button></div>)}<button type="button" className="text-link" onClick={() => update({ times: [...schedule.times, ""] })}><Icon name="plus" />Добавить время</button></div>}
        <p className="monitor-caption space">Настройка демонстрационная: телефония пока не подключена.</p>
        <Button type="submit">Сохранить расписание</Button>{message && <p className="monitor-save-message" role="status">{message}</p>}
      </form></div></Modal>}
    {connecting && <Modal title="Подключить устройство" onClose={() => setConnecting(false)}><p className="monitor-caption">Выберите тип устройства</p><div className="monitor-device-choices">{["Тонометр", "Смарт-часы", "Пульсоксиметр", "Камера"].map(title => <Button key={title} kind={device === title ? "primary" : "white"} onClick={() => setDevice(title)}>{title}</Button>)}</div>{device && <div className="hint space" role="status"><Icon name="info" /><span>{device === "Камера" ? "Здесь появится подключение камеры. Видеопоток и разбор видео по таймкодам пока не подключены." : `${device}: здесь появится подключение устройства. Сейчас это заглушка, устройство не подключено и данные не поступают.`}</span></div>}</Modal>}
  </div>;
}
