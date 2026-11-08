import { useEffect, useRef, useState } from "react";
import { Icon } from "./components";
import { careNotifications, isNotificationRead, type NotificationKind } from "./notifications";
import type { State } from "./types";

const categories: { kind: NotificationKind; label: string; icon: string; empty: string }[] = [
  { kind: "caregiver", label: "От сиделки", icon: "pill", empty: "Нет непроверенных пропусков или задержек приёма." },
  { kind: "patient", label: "От пациента", icon: "phone", empty: "Сообщений о самочувствии пока нет." },
  { kind: "stock", label: "Пополнение аптечки", icon: "bag", empty: "На текущие курсы лекарств хватает." },
  { kind: "health", label: "Мониторинг здоровья", icon: "activity", empty: "Сигналов мониторинга пока нет." },
];

export function NotificationCenter({ state, onNavigate, onRead }: {
  state: State;
  onNavigate: (view: "plan" | "stock" | "devices", callId?: string) => void;
  onRead: (ids: string[]) => void;
}) {
  const items = careNotifications(state);
  const unread = items.filter((item) => !isNotificationRead(state, item));
  const alertCount = unread.filter((item) => !item.demo).length;
  const pendingAction = useRef<(() => void) | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [phase, setPhase] = useState<"closed" | "opening" | "closing">("closed");
  const open = phase !== "closed";

  useEffect(() => {
    if (!open) {
      const action = pendingAction.current;
      pendingAction.current = null;
      action?.();
      return;
    }
    const panel = dialog.current;
    const header = trigger.current?.closest("header");
    const positionPanel = () => {
      const top = Math.max(0, header?.getBoundingClientRect().bottom ?? 0);
      panel?.style.setProperty("--notification-top", `${top}px`);
    };
    positionPanel();
    const resize = new ResizeObserver(positionPanel);
    if (header) resize.observe(header);
    window.addEventListener("resize", positionPanel);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel?.showModal();
    return () => {
      resize.disconnect();
      window.removeEventListener("resize", positionPanel);
      panel?.close();
      document.body.style.overflow = overflow;
      trigger.current?.focus();
    };
  }, [open]);

  const close = () => setPhase("closing");
  return (
    <>
      <button ref={trigger} className="notification-trigger"
        aria-label="Уведомления" title="Уведомления"
        aria-haspopup="dialog" aria-expanded={open} aria-controls="notification-center"
        onClick={() => setPhase("opening")}>
        <Icon name="bell" />
        {alertCount > 0 && <span className="notification-count" aria-label={`Непрочитанных: ${alertCount}`}>{alertCount}</span>}
      </button>
      <dialog ref={dialog} id="notification-center"
        className={`notification-center notification-${phase}`}
        aria-labelledby="notification-title"
        onCancel={(event) => { event.preventDefault(); close(); }}
        onAnimationEnd={(event) => {
          if (event.target === event.currentTarget && phase === "closing") setPhase("closed");
        }}>
        <div className="notification-shell">
          <div className="notification-header">
            <div className="notification-heading">
              <div><p>КРУГ ЗАБОТЫ</p><h1 id="notification-title">Уведомления</h1></div>
            </div>
            <button autoFocus className="notification-close" aria-label="Закрыть уведомления" onClick={close}><Icon name="close" /></button>
          </div>
          <div className="notification-feed">
            {state.role === "senior" ? (
              <div className="notification-empty">
                <Icon name="bell" /><h3>Уведомлений нет</h3>
                <p>Все напоминания о приёме — на главном экране.</p>
              </div>
            ) : <>
              <div className="notification-summary">
                <Icon name={alertCount ? "bell" : "check"} />
                <div role="status"><strong>{alertCount ? `Непрочитанных: ${alertCount}` : "Непрочитанных уведомлений нет"}</strong>
                  <p>Прочитанные остаются в списке. Демо не учитываются в счётчике.</p></div>
              </div>
              <button className="notification-read-all" disabled={!unread.length}
                onClick={() => onRead(unread.map((item) => item.id))}>
                <Icon name="check" />Прочитать все
              </button>
              {categories.map((category) => {
                const entries = items.filter((item) => item.kind === category.kind);
                return <section className="notification-section" aria-label={category.label} key={category.kind}>
                  <h2><Icon name={category.icon} />{category.label}</h2>
                  {entries.length ? entries.map((item) => <article
                    className={`notification-card${item.demo ? " notification-demo" : " notification-important"}${isNotificationRead(state, item) ? " notification-read" : ""}`} key={item.id}>
                    <span className="notification-card-icon"><Icon name={category.icon} /></span>
                    <div>
                      <div className="notification-card-top"><h3>{item.title}</h3>
                        {item.demo ? <span className="notification-demo-label">Демо</span> : item.time && <time>{item.time}</time>}
                      </div>
                      <p>{item.text}</p>
                      <small>{item.source}</small>
                      {isNotificationRead(state, item)
                        ? <span className="notification-read-label"><Icon name="check" />Прочитано</span>
                        : <button className="notification-mark-read" onClick={() => onRead([item.id])}
                            aria-label={`Отметить прочитанным: ${item.title}`}><Icon name="check" />Отметить прочитанным</button>}
                      {item.detail && <details className="notification-details">
                        <summary>{item.demo ? "Посмотреть пример" : "Подробнее"}</summary><p>{item.detail}</p>
                      </details>}
                      {item.action && <button className="notification-action" onClick={() => {
                        const target = item.action!;
                        pendingAction.current = () => onNavigate(target, item.callId);
                        close();
                      }}>{item.action === "plan" ? "Открыть план" : item.action === "devices" ? "Открыть мониторинг" : "Открыть аптечку"}<Icon name="arrow" /></button>}
                    </div>
                  </article>) : <p className="notification-category-empty">{category.empty}</p>}
                </section>;
              })}
            </>}
          </div>
        </div>
      </dialog>
    </>
  );
}
