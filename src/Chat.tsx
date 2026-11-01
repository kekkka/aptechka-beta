import { useState, type FormEvent } from "react";
import { events } from "./model";
import { Icon, Heading, Modal } from "./components";
import type { ChatAttachment, State } from "./types";

interface Props {
  state: State;
  onSend: (text: string, attachment?: ChatAttachment) => void;
}

interface MarkedEvent {
  id: string;
  kind: "dose" | "care";
  title: string;
  detail: string;
}

function markedEvents(state: State): MarkedEvent[] {
  const doses = events(state)
    .filter(
      (e) =>
        e.log?.actor === "elena" &&
        (e.log.status === "taken" || e.log.status === "skipped"),
    )
    .map((e) => ({
      id: `dose:${e.id}`,
      kind: "dose" as const,
      title: `Приём: ${e.med.name}`,
      detail: `${e.med.strength} · ${e.med.dose} ${e.med.unit} · ${e.time}${
        e.log!.status === "skipped" ? " · пропуск" : ""
      }`,
    }));
  const care = state.careTasks
    .filter((t) => state.careDone[t.id])
    .map((t) => ({
      id: `care:${t.id}`,
      kind: "care" as const,
      title: t.title,
      detail: t.note || t.time,
    }));
  return [...doses, ...care];
}

const senderInfo = (id: "elena" | "anna") =>
  id === "elena"
    ? { name: "Елена", role: "Сиделка" }
    : { name: "Анна", role: "Менеджер лечения" };

export function Chat({ state, onSend }: Props) {
  const [text, setText] = useState("");
  const [picker, setPicker] = useState(false);
  const canAttach = state.role === "elena";
  const list = markedEvents(state);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    onSend(value);
    setText("");
  };

  return (
    <div className="chat-page">
      <Heading
        title="Чат с менеджером лечения"
        subtitle={`${state.patient.short} · Анна на связи`}
      />

      <div className="chat-thread" aria-label="Переписка">
        {state.chat.map((msg) => {
          const own = msg.sender === state.role;
          const who = senderInfo(msg.sender);
          return (
            <div className={`chat-msg ${own ? "own" : ""}`} key={msg.id}>
              {!own && <span className="chat-avatar">{who.name[0]}</span>}
              <div className="chat-col">
                {!own && (
                  <span className="chat-sender">
                    {who.name} · {who.role}
                  </span>
                )}
                <div className="chat-bubble">
                  {msg.attachment && (
                    <div className="chat-attach">
                      <span className="chat-attach-icon">
                        <Icon name={msg.attachment.kind === "dose" ? "pill" : "check"} />
                      </span>
                      <span>
                        <strong>{msg.attachment.title}</strong>
                        <small>{msg.attachment.detail}</small>
                      </span>
                    </div>
                  )}
                  {msg.text && <p className="chat-text">{msg.text}</p>}
                  <time className="chat-time">{msg.time}</time>
                </div>
              </div>
            </div>
          );
        })}
        {!state.chat.length && (
          <p className="chat-empty">
            Напишите менеджеру лечения или приложите отмеченное событие.
          </p>
        )}
      </div>

      <form className="chat-composer" onSubmit={submit}>
        {canAttach && (
          <button
            type="button"
            className="chat-attach-btn"
            aria-label="Приложить событие"
            onClick={() => setPicker(true)}
          >
            <Icon name="paperclip" />
          </button>
        )}
        <input
          className="chat-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Сообщение…"
          aria-label="Сообщение"
        />
        <button
          type="submit"
          className="chat-send-btn"
          aria-label="Отправить"
          disabled={!text.trim()}
        >
          <Icon name="send" />
        </button>
      </form>

      {picker && (
        <Modal
          title="Приложить событие"
          subtitle="События, отмеченные сиделкой сегодня"
          onClose={() => setPicker(false)}
        >
          {list.length ? (
            <div className="attach-list">
              {list.map((item) => (
                <button
                  key={item.id}
                  className="attach-item"
                  onClick={() => {
                    onSend("", {
                      kind: item.kind,
                      title: item.title,
                      detail: item.detail,
                    });
                    setPicker(false);
                  }}
                >
                  <span className="todo-icon">
                    <Icon name={item.kind === "dose" ? "pill" : "check"} />
                  </span>
                  <span className="attach-copy">
                    <strong>{item.title}</strong>
                    <small>{item.detail}</small>
                  </span>
                  <Icon name="arrow" />
                </button>
              ))}
            </div>
          ) : (
            <p className="caption">
              Пока нет событий, отмеченных сиделкой. Отметьте приём или задачу —
              и их можно будет приложить сюда.
            </p>
          )}
        </Modal>
      )}
    </div>
  );
}
