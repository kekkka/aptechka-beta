import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ProcedureEventCard,
  ProcedureEventDetails,
} from "../src/ProcedureEvent";
import { addDays, seed } from "../src/model";
import { completePlanEvent, planEventsForDate } from "../src/plan-events";

test("The whole procedure card opens details without marking completion", () => {
  const state = seed();
  const event = planEventsForDate(state, state.day)[0];
  let opened = false;
  const before = structuredClone(state);
  const card = ProcedureEventCard({
    event,
    onOpen: () => {
      opened = true;
    },
  });
  assert.equal(card.type, "button");
  assert.equal(card.props.type, "button");
  card.props.onClick();
  assert.equal(opened, true);
  assert.deepEqual(state, before);
  const html = renderToStaticMarkup(card);
  assert.equal((html.match(/<button/g) || []).length, 1);
  assert.match(html, /открыть процедуру/);
  assert.doesNotMatch(html, /Отметить выполнение|<details/);
});

test("Calendar procedures share medication row styles and secondary text layout", () => {
  const state = seed();
  const event = {
    ...planEventsForDate(state, state.day)[0],
    note: "Записать результат",
  };
  const card = ProcedureEventCard({ event, onOpen: () => {} });
  assert.equal(card.props.className, "dose-row dose-button");
  const html = renderToStaticMarkup(card);
  assert.match(html, /class="time">09:00/);
  assert.match(html, /class="med-name"><strong>Измерение давления/);
  assert.match(
    html,
    /class="dose-meta">Процедура · Записать результат<\/span>/,
  );
  assert.doesNotMatch(html, /<svg|plan-event-note|plan-event-row/);
  const completed = renderToStaticMarkup(
    ProcedureEventCard({
      event: { ...event, completedBy: "Анна" },
      onOpen: () => {},
    }),
  );
  assert.match(completed, /Выполнено/);
  assert.match(completed, /class="dose-source">Анна/);
});

test("Procedure details show instructions and the current occurrence status", () => {
  const state = seed();
  state.planEvents![0].sourceText = "Измерять давление утром";
  const event = planEventsForDate(state, state.day)[0];
  const markup = () =>
    renderToStaticMarkup(
      createElement(ProcedureEventDetails, {
        state,
        event,
        onComplete: () => {},
      }),
    );
  assert.match(markup(), /Отметить выполнение/);
  assert.match(markup(), /Измерять давление утром/);
  assert.match(markup(), /09:00/);
  assert.equal(completePlanEvent(state, event.id), true);
  assert.match(markup(), /Выполнено/);
  assert.doesNotMatch(markup(), /Отметить выполнение/);
  assert.equal(
    planEventsForDate(state, addDays(state.day, 1))[0].completedBy,
    undefined,
  );
});

test("Future procedures and view-only members cannot mark completion in details", () => {
  const state = seed();
  const render = (date: string) =>
    renderToStaticMarkup(
      createElement(ProcedureEventDetails, {
        state,
        event: planEventsForDate(state, date)[0],
        onComplete: () => {},
      }),
    );
  assert.doesNotMatch(render(addDays(state.day, 1)), /<button/);
  state.role = "elena";
  state.clock = 539;
  const member = state.members.find((entry) => entry.id === state.role)!;
  member.view = true;
  member.mark = false;
  assert.match(render(state.day), /Нет права/);
  assert.doesNotMatch(render(state.day), /<button/);
});

test("Caregiver can open overdue procedures but cannot complete them at or after the deadline", () => {
  const state = seed();
  state.role = "elena";
  const event = planEventsForDate(state, state.day)[0];
  for (const clock of [540, 541, 900]) {
    state.clock = clock;
    const before = structuredClone(state);
    const html = renderToStaticMarkup(
      createElement(ProcedureEventDetails, {
        state,
        event,
        onComplete: () => {},
      }),
    );
    assert.match(html, /Измерение давления/);
    assert.match(html, /Событие просрочено/);
    assert.doesNotMatch(html, /Отметить выполнение|<button/);
    assert.equal(completePlanEvent(state, event.id), false);
    assert.deepEqual(state, before);
  }
  state.day = addDays(state.day, 1);
  state.clock = 0;
  assert.equal(completePlanEvent(state, event.id), false);
  state.day = event.date;
  state.clock = 539;
  assert.equal(completePlanEvent(state, event.id), true);
});

test("Manager retains permission to complete overdue procedures", () => {
  const state = seed();
  state.role = "anna";
  state.clock = 900;
  const event = planEventsForDate(state, state.day)[0];
  assert.equal(completePlanEvent(state, event.id), true);
});
