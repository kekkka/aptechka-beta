import { useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { Icon } from "./components";

interface Props {
  disabled?: boolean;
  completed: boolean;
  onComplete: () => void;
  label?: string;
  completedLabel?: string;
  hint?: string;
  completedHint?: string;
  disabledHint?: string;
  ariaLabel?: string;
}

/** A completed gesture confirms once; releasing early returns the handle home. */
export function SwipeToConfirm({
  disabled = false,
  completed,
  onComplete,
  label = "Я приняла лекарство",
  completedLabel = "Приём отмечен",
  hint = "Проведите вправо, если уже приняли",
  completedHint = "Готово! Вы позаботились о себе",
  disabledHint = "Отметка станет доступна ко времени приёма",
  ariaLabel = "Подтвердить приём лекарства свайпом вправо",
}: Props) {
  const track = useRef<HTMLDivElement>(null);
  const drag = useRef<{ pointer: number; start: number; width: number } | null>(
    null,
  );
  const value = useRef(0);
  const committed = useRef(false);
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);

  function update(next: number) {
    value.current = Math.max(0, Math.min(1, next));
    setProgress(value.current);
  }
  function finish() {
    if (disabled || completed || committed.current) return;
    committed.current = true;
    update(1);
    onComplete();
  }
  function start(event: PointerEvent<HTMLButtonElement>) {
    if (
      disabled ||
      completed ||
      committed.current ||
      !event.isPrimary ||
      event.button !== 0
    )
      return;
    const width =
      (track.current?.clientWidth || 0) - event.currentTarget.offsetWidth - 12;
    if (width <= 0) return;
    event.preventDefault();
    drag.current = {
      pointer: event.pointerId,
      start: event.clientX - value.current * width,
      width,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  }
  function move(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    if (current?.pointer === event.pointerId)
      update((event.clientX - current.start) / current.width);
  }
  function release(event: PointerEvent<HTMLButtonElement>, cancelled = false) {
    if (drag.current?.pointer !== event.pointerId) return;
    drag.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    if (!cancelled && value.current >= 0.92) finish();
    else update(0);
  }
  return (
    <div className="swipe-control">
      <div
        ref={track}
        className={`swipe-track${dragging ? " is-dragging" : ""}${completed ? " is-complete" : ""}${disabled ? " is-disabled" : ""}`}
        style={
          { "--swipe-progress": completed ? 1 : progress } as CSSProperties
        }
      >
        <span className="swipe-fill" aria-hidden="true" />
        <span className="swipe-label" aria-hidden="true">
          {completed ? completedLabel : label}
        </span>
        <button
          type="button"
          className="swipe-handle"
          role="slider"
          aria-label={ariaLabel}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={completed ? 100 : Math.round(progress * 100)}
          aria-valuetext={
            completed
              ? completedLabel
              : disabled
                ? disabledHint
                : "Проведите вправо до конца. С клавиатуры нажмите Enter."
          }
          disabled={disabled || completed}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={(event) => release(event)}
          onPointerCancel={(event) => release(event, true)}
          onLostPointerCapture={(event) => release(event, true)}
          onKeyDown={(event) => {
            if (
              ["Enter", " ", "End", "ArrowRight", "ArrowLeft", "Home"].includes(
                event.key,
              )
            )
              event.preventDefault();
            if (["Enter", " ", "End"].includes(event.key)) finish();
            else if (event.key === "ArrowRight") {
              const next = value.current + 0.1;
              if (next >= 0.99) finish();
              else update(next);
            } else if (event.key === "ArrowLeft") update(value.current - 0.1);
            else if (event.key === "Home") update(0);
          }}
        >
          <Icon name={completed ? "check" : "arrow"} />
        </button>
      </div>
      <p className="swipe-hint" role="status" aria-live="polite">
        {completed ? completedHint : disabled ? disabledHint : hint}
      </p>
    </div>
  );
}
