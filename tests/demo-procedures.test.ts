import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEMO_PROCEDURE_ID,
  upgradeDemoProcedures,
} from "../src/demo-procedures";
import { addDays, seed } from "../src/model";
import { RegularPlan } from "../src/RegularPlan";
import { planEventsForDate } from "../src/plan-events";
import {
  deleteRegularEvent,
  saveRegularEvent,
} from "../src/regular-event-editor";

test("Fresh demo includes a regular pressure-measurement procedure and an editable card", () => {
  const state = seed();
  const event = state.planEvents!.find(
    (entry) => entry.id === DEMO_PROCEDURE_ID,
  )!;
  assert.equal(event.kind, "procedure");
  assert.equal(event.demo, true);
  assert.equal(event.time, "09:00");
  assert.match(event.note, /Ежедневный контроль артериального давления и пульса/);
  assert.deepEqual(event.recurrence, { days: 14, intervalDays: 1 });
  assert.equal(planEventsForDate(state, state.day).length, 1);
  assert.equal(planEventsForDate(state, addDays(state.day, 13)).length, 1);
  assert.equal(planEventsForDate(state, addDays(state.day, 14)).length, 0);
  const html = renderToStaticMarkup(
    createElement(RegularPlan, { state, onEdit: () => {} }),
  );
  assert.match(html, /Регулярная процедура: Измерение давления/);
  assert.doesNotMatch(html, /Демо-процедура/);
  assert.match(html, /aria-label="Редактировать Измерение давления"/);
});

test("Upgrade adds the mock once without changing custom events", () => {
  const state = seed();
  state.planEvents = [
    { ...state.planEvents![0], id: "custom", title: "Массаж", demo: false },
  ];
  const custom = structuredClone(state.planEvents[0]);
  upgradeDemoProcedures(state);
  upgradeDemoProcedures(state);
  assert.equal(state.planEvents.length, 2);
  assert.deepEqual(state.planEvents[0], custom);
  assert.equal(
    state.planEvents.filter((event) => event.id === DEMO_PROCEDURE_ID).length,
    1,
  );
});

test("Edited or deleted demo procedures are not reset or resurrected on upgrade", () => {
  const state = seed();
  const target = { kind: "procedure" as const, id: DEMO_PROCEDURE_ID };
  assert.equal(
    saveRegularEvent(state, target, {
      weekdays: [1, 3],
      times: ["12:00"],
      dose: 1,
      mealTiming: "none",
      endDate: addDays(state.day, 10),
    }),
    true,
  );
  const edited = structuredClone(state.planEvents);
  upgradeDemoProcedures(state);
  assert.deepEqual(state.planEvents, edited);
  assert.equal(deleteRegularEvent(state, target), true);
  upgradeDemoProcedures(state);
  assert.equal(state.planEvents?.length, 1);
  assert.ok(state.planEvents?.[0].deletedOn);
  assert.equal(planEventsForDate(state, addDays(state.day, 1)).length, 0);
});

test("Upgrade refreshes the old demo description but preserves custom text", () => {
  const state = seed();
  const event = state.planEvents!.find((entry) => entry.id === DEMO_PROCEDURE_ID)!;
  event.note = "Демо-процедура для проверки расписания и редактирования.";
  upgradeDemoProcedures(state);
  assert.match(event.note, /Ежедневный контроль артериального давления и пульса/);
  event.note = "Мои заметки о процедуре";
  upgradeDemoProcedures(state);
  assert.equal(event.note, "Мои заметки о процедуре");
});
