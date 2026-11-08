import { Empty, Icon } from "./components";
import {
  canViewCourse,
  fmt,
  isOwner,
  medicationEnd,
  medicationForDate,
} from "./model";
import { procedureEnd } from "./plan-events";
import type { RegularEventTarget, State } from "./types";

export function RegularPlan({
  state,
  onEdit,
}: {
  state: State;
  onEdit: (target: RegularEventTarget) => void;
}) {
  const owner = isOwner(state);
  const courses = state.courses.filter((course) =>
    canViewCourse(state, course),
  );
  const medications = courses.flatMap((course) =>
    course.meds
      .filter((medication) => !medication.deletedOn)
      .map((medication) => ({
        course,
        medication: medicationForDate(course, medication, "9999-12-31"),
      })),
  );
  const canView =
    owner ||
    state.role === "senior" ||
    state.members.some((member) => member.id === state.role && member.view);
  const procedures = canView
    ? (state.planEvents || []).filter(
        (event) =>
          event.kind === "procedure" && event.recurrence && !event.deletedOn,
      )
    : [];
  return (
    <div className="regular-plan stack">
      <section aria-labelledby="regular-medications-title">
        <h2 id="regular-medications-title">
          <Icon name="pill" />
          Приёмы лекарств
        </h2>
        <div className="stack space regular-event-list">
          {medications.length ? (
            medications.map(({ course, medication }) => {
              const end = medicationEnd(course, medication);
              const Summary = owner ? "button" : "div";
              return (
                <section
                  className="card regular-event-card"
                  key={`${course.id}|${medication.id}`}
                  aria-label={`Регулярный приём: ${medication.name}`}
                >
                  <Summary
                    className="regular-event-summary"
                    type={owner ? "button" : undefined}
                    aria-label={
                      owner ? `Редактировать ${medication.name}` : undefined
                    }
                    onClick={
                      owner
                        ? () =>
                            onEdit({
                              kind: "medication",
                              courseId: course.id,
                              medicationId: medication.id,
                            })
                        : undefined
                    }
                  >
                    <strong>{medication.name}</strong>
                    <span>
                      {end < course.start
                        ? "Отменён до начала"
                        : `${fmt(course.start)} — ${fmt(end)}`}
                    </span>
                  </Summary>
                </section>
              );
            })
          ) : (
            <Empty title="Нет регулярных приёмов">
              Добавьте лекарство вручную или отсканируйте назначение.
            </Empty>
          )}
        </div>
      </section>
      <section aria-labelledby="regular-procedures-title">
        <h2 id="regular-procedures-title">
          <Icon name="activity" />
          Процедуры
        </h2>
        <div className="stack space regular-event-list">
          {procedures.length ? (
            procedures.map((event) => {
              const end = procedureEnd(event);
              const Summary = owner ? "button" : "div";
              return (
                <section
                  className="card regular-event-card"
                  key={event.id}
                  aria-label={`Регулярная процедура: ${event.title}`}
                >
                  <Summary
                    className="regular-event-summary"
                    type={owner ? "button" : undefined}
                    aria-label={
                      owner ? `Редактировать ${event.title}` : undefined
                    }
                    onClick={
                      owner
                        ? () => onEdit({ kind: "procedure", id: event.id })
                        : undefined
                    }
                  >
                    <strong>{event.title}</strong>
                    <span>
                      {end < event.date
                        ? "Отменена до начала"
                        : `${fmt(event.date)} — ${fmt(end)}`}
                    </span>
                  </Summary>
                </section>
              );
            })
          ) : (
            <Empty title="Нет регулярных процедур">
              При добавлении процедуры включите «Повторять процедуру».
            </Empty>
          )}
        </div>
      </section>
    </div>
  );
}
