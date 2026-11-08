import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RegularPlan } from "../src/RegularPlan";
import {
  addDays,
  events,
  fmt,
  medKey,
  medicationEnd,
  seed,
  shopping,
} from "../src/model";
import { doctorRows } from "../src/doctor-report";
import { inventoryItems } from "../src/inventory";
import {
  addPlanEvent,
  completePlanEvent,
  endRegularProcedure,
  endRegularMedication,
  planEventsForDate,
  procedureEnd,
} from "../src/plan-events";

function fixture() {
  const state = seed();
  state.planEvents = [];
  addPlanEvent(state, {
    kind: "procedure",
    title: "Измерение давления",
    date: state.day,
    time: "10:00",
    method: "manual",
    note: "Записать результат",
    recurrence: { days: 7, intervalDays: 2 },
  });
  return state;
}

test("Recurring procedures populate only dates inside their period and interval", () => {
  const state = fixture();
  assert.equal(planEventsForDate(state, addDays(state.day, -1)).length, 0);
  assert.equal(planEventsForDate(state, state.day).length, 1);
  assert.equal(planEventsForDate(state, addDays(state.day, 1)).length, 0);
  assert.equal(planEventsForDate(state, addDays(state.day, 2)).length, 1);
  assert.equal(planEventsForDate(state, addDays(state.day, 6)).length, 1);
  assert.equal(planEventsForDate(state, addDays(state.day, 7)).length, 0);
});

test("Completing one occurrence does not complete another day or consume medication stock", () => {
  const state = fixture();
  const stock = structuredClone(state.stock);
  const first = planEventsForDate(state, state.day)[0];
  assert.equal(completePlanEvent(state, first.id), true);
  assert.equal(completePlanEvent(state, first.id), false);
  assert.equal(planEventsForDate(state, state.day, true).length, 0);
  state.day = addDays(state.day, 2);
  const next = planEventsForDate(state, state.day, true)[0];
  assert.notEqual(next.id, first.id);
  assert.equal(next.completedBy, undefined);
  state.role = "elena";
  state.clock = 599;
  assert.equal(completePlanEvent(state, next.id), true);
  assert.deepEqual(state.stock, stock);
  assert.equal(Object.keys(state.planEvents![0].completions!).length, 2);
});

test("Ending recurrence removes future occurrences but preserves past dates and completion history", () => {
  const state = fixture();
  const start = state.day;
  completePlanEvent(state, planEventsForDate(state, start)[0].id);
  state.day = addDays(start, 2);
  const id = state.planEvents![0].id;
  assert.equal(endRegularProcedure(state, id), true);
  assert.equal(endRegularProcedure(state, id), false);
  assert.equal(planEventsForDate(state, addDays(start, 4)).length, 0);
  assert.equal(
    planEventsForDate(state, start)[0].completedBy,
    state.members[0].name,
  );
  assert.equal(planEventsForDate(state, state.day).length, 1);
  const restored = JSON.parse(JSON.stringify(state));
  assert.equal(
    planEventsForDate(restored, start)[0].completedBy,
    state.members[0].name,
  );
});

test("Recurrence validation and permissions reject invalid changes", () => {
  const state = fixture();
  const base = state.planEvents![0];
  for (const recurrence of [
    { days: 0, intervalDays: 1 },
    { days: 366, intervalDays: 1 },
    { days: 7, intervalDays: 0 },
    { days: 7, intervalDays: 1.5 },
  ]) {
    assert.equal(addPlanEvent(state, { ...base, recurrence }), false);
  }
  assert.equal(
    completePlanEvent(state, `${base.id}|${addDays(state.day, 2)}`),
    false,
  );
  assert.equal(
    completePlanEvent(state, `${base.id}|${addDays(state.day, 1)}`),
    false,
  );
  state.role = "elena";
  assert.equal(endRegularProcedure(state, base.id), false);
  state.members.find((member) => member.id === "elena")!.view = false;
  assert.deepEqual(planEventsForDate(state, state.day), []);
});

test("Regular management lists medication schedules and repeating procedures, not one-off events or Sber appointments", () => {
  const state = fixture();
  addPlanEvent(state, {
    kind: "procedure",
    title: "Разовая процедура",
    date: state.day,
    time: "11:00",
    note: "",
    method: "manual",
  });
  addPlanEvent(state, {
    kind: "appointment",
    title: "Приём кардиолога",
    date: state.day,
    time: "16:30",
    note: "",
    method: "sber",
  });
  const props = {
    state,
    onEdit: () => {},
  };
  const html = renderToStaticMarkup(createElement(RegularPlan, props));
  assert.match(html, /Приёмы лекарств/);
  assert.match(html, /Измерение давления/);
  assert.doesNotMatch(html, /Каждые 2 дн./);
  assert.doesNotMatch(html, /Завершить приём|Завершить повторение/);
  assert.equal(
    (html.match(/aria-label="Регулярный приём:/g) || []).length,
    state.courses.reduce((total, course) => total + course.meds.length, 0),
  );
  assert.equal(
    (html.match(/aria-label="Регулярная процедура:/g) || []).length,
    1,
  );
  assert.equal(
    (html.match(/aria-label="Редактировать /g) || []).length,
    state.courses.reduce((total, course) => total + course.meds.length, 0) + 1,
  );
  assert.doesNotMatch(html, />Редактировать</);
  assert.doesNotMatch(html, /Разовая процедура|Приём кардиолога/);
  state.role = "senior";
  const patientHtml = renderToStaticMarkup(createElement(RegularPlan, props));
  assert.doesNotMatch(
    patientHtml,
    /Завершить приём|Завершить повторение|aria-label="Редактировать /,
  );
});

test("Medication cards show only the name and course period while preserving edit access", () => {
  const state = fixture();
  const course = state.courses[0];
  const medication = course.meds[0];
  const html = renderToStaticMarkup(
    createElement(RegularPlan, { state, onEdit: () => {} }),
  );
  const card = html.match(
    /<section[^>]*aria-label="Регулярный приём:[\s\S]*?<\/section>/,
  )![0];
  assert.ok(card.includes(medication.name));
  assert.ok(card.includes(fmt(course.start)));
  assert.ok(card.includes(fmt(medicationEnd(course, medication))));
  assert.match(card, /<button[^>]*aria-label="Редактировать /);
  assert.doesNotMatch(
    card,
    /<svg|за приём|Активен|Завершён|Запланирован|course-med|regular-event-source/,
  );
  assert.doesNotMatch(card, /Демо-процедура|До еды|После еды|Ежедневно/);
  assert.equal((card.match(/<strong>/g) || []).length, 1);
  assert.equal((card.match(/<span>/g) || []).length, 1);
});

test("Procedure cards show only the name and period and allow editing only for the manager", () => {
  const state = fixture();
  const procedure = state.planEvents![0];
  procedure.demo = true;
  const renderCard = () => {
    const html = renderToStaticMarkup(
      createElement(RegularPlan, { state, onEdit: () => {} }),
    );
    return html.match(
      /<section[^>]*aria-label="Регулярная процедура:[\s\S]*?<\/section>/,
    )![0];
  };
  const card = renderCard();
  assert.ok(card.includes(procedure.title));
  assert.ok(card.includes(fmt(procedure.date)));
  assert.ok(card.includes(fmt(procedureEnd(procedure))));
  assert.match(card, /<button[^>]*aria-label="Редактировать /);
  assert.doesNotMatch(
    card,
    /<svg|Демо-процедура|Активна|Завершена|Запланирована|Каждые|10:00|Записать результат/,
  );
  assert.equal((card.match(/<strong>/g) || []).length, 1);
  assert.equal((card.match(/<span>/g) || []).length, 1);
  state.role = "senior";
  assert.doesNotMatch(renderCard(), /<button|Редактировать/);
});

test("Ending one medication leaves its siblings, prior calendar entries, dose logs and stock intact", () => {
  const state = seed();
  state.courses = [state.courses[0]];
  const course = state.courses[0];
  const [medication, sibling] = course.meds;
  const siblingBefore = structuredClone(sibling);
  const logs = structuredClone(state.logs);
  const stock = structuredClone(state.stock);
  const history = events(state, addDays(state.day, -1)).map((event) => ({
    id: event.id,
    time: event.time,
    dose: event.med.dose,
    log: event.log,
  }));
  assert.equal(endRegularMedication(state, course.id, medication.id), true);
  assert.equal(endRegularMedication(state, course.id, medication.id), false);
  assert.equal(course.active, true);
  assert.deepEqual(sibling, siblingBefore);
  assert.deepEqual(
    events(state, addDays(state.day, -1)).map((event) => ({
      id: event.id,
      time: event.time,
      dose: event.med.dose,
      log: event.log,
    })),
    history,
  );
  assert.deepEqual(state.logs, logs);
  assert.deepEqual(state.stock, stock);
  const tomorrow = events(state, addDays(state.day, 1));
  assert.equal(
    tomorrow.filter((event) => event.med.id === medication.id).length,
    0,
  );
  assert.equal(
    tomorrow.filter((event) => event.med.id === sibling.id).length,
    sibling.times.length,
  );
  state.day = addDays(state.day, 1);
  state.stock = [];
  assert.equal(
    shopping(state).some((need) => medKey(need.med) === medKey(medication)),
    false,
  );
  assert.equal(
    inventoryItems(state).some((item) => item.key === medKey(medication)),
    false,
  );
  assert.equal(
    doctorRows(state, 2).some(
      (row) => row.med.id === medication.id && row.date === state.day,
    ),
    false,
  );
  assert.equal(
    doctorRows(state, 2).some(
      (row) => row.med.id === medication.id && row.date < state.day,
    ),
    true,
  );
});

test("Only the manager can stop one medication, including cancelling it before its start", () => {
  const state = seed();
  const course = state.courses[0];
  const medication = course.meds[0];
  state.role = "elena";
  assert.equal(endRegularMedication(state, course.id, medication.id), false);
  state.role = "anna";
  assert.equal(endRegularMedication(state, "missing", medication.id), false);
  assert.equal(endRegularMedication(state, course.id, "missing"), false);
  course.start = addDays(state.day, 1);
  assert.equal(endRegularMedication(state, course.id, medication.id), true);
  assert.equal(
    events(state, course.start).some(
      (event) =>
        event.med.id === medication.id && event.course.id === course.id,
    ),
    false,
  );
  const restored = JSON.parse(JSON.stringify(state));
  assert.equal(
    events(restored, course.start).some(
      (event) =>
        event.med.id === medication.id && event.course.id === course.id,
    ),
    false,
  );
});
