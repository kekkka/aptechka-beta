import assert from "node:assert/strict";
import { test } from "node:test";
import { addDays, events, KEY, loadState, seed } from "../src/model";
import {
  addManualMedication,
  addPlanEvent,
  completePlanEvent,
  planEventsForDate,
} from "../src/plan-events";
import type { Course, PlanEvent } from "../src/types";

function fixture() {
  const state = seed();
  state.planEvents = [];
  return state;
}

const draft = (date: string): Omit<PlanEvent, "id" | "completedBy"> => ({
  kind: "procedure",
  title: "Измерение давления",
  date,
  time: "10:00",
  note: "Записать результат",
  method: "manual",
});

test("Procedures and appointments retain their type, date and source", () => {
  const state = fixture();
  assert.equal(addPlanEvent(state, draft(state.day)), true);
  assert.equal(
    addPlanEvent(state, {
      ...draft(addDays(state.day, 1)),
      kind: "appointment",
      title: "Кардиолог",
      method: "scan",
      doctor: "Иванова",
      appointmentId: "123",
      sourceText: "Текст назначения",
    }),
    true,
  );
  assert.equal(planEventsForDate(state, state.day).length, 1);
  assert.equal(
    planEventsForDate(state, addDays(state.day, 1))[0].appointmentId,
    "123",
  );
  assert.equal(state.planEvents?.[1].sourceText, "Текст назначения");
  assert.equal(state.audit[0].type, "plan");
});

test("Completion is permission checked, does not consume stock, and is idempotent", () => {
  const state = fixture();
  state.clock = 599;
  addPlanEvent(state, draft(state.day));
  const id = state.planEvents![0].id;
  const stock = structuredClone(state.stock);
  state.role = "max";
  assert.equal(completePlanEvent(state, id), false);
  state.role = "elena";
  assert.equal(completePlanEvent(state, id), true);
  assert.equal(completePlanEvent(state, id), false);
  assert.equal(planEventsForDate(state, state.day, true).length, 0);
  assert.equal(planEventsForDate(state, state.day).length, 1);
  assert.deepEqual(state.stock, stock);
});

test("Invalid dates, times, future completion and unauthorized additions are rejected", () => {
  const state = fixture();
  assert.equal(
    addPlanEvent(state, { ...draft(state.day), date: "2026-02-30" }),
    false,
  );
  assert.equal(
    addPlanEvent(state, { ...draft(state.day), time: "25:00" }),
    false,
  );
  assert.equal(
    addPlanEvent(state, { ...draft(state.day), title: "   " }),
    false,
  );
  addPlanEvent(state, draft(addDays(state.day, 1)));
  assert.equal(completePlanEvent(state, state.planEvents![0].id), false);
  state.role = "senior";
  assert.equal(addPlanEvent(state, draft(state.day)), false);
  state.role = "elena";
  state.members.find((member) => member.id === "elena")!.view = false;
  assert.equal(planEventsForDate(state, addDays(state.day, 1)).length, 0);
});

test("Manual medication uses the existing course schedule and validates input", () => {
  const state = seed();
  state.courses = [];
  const course: Course = {
    id: "manual",
    title: "По назначению",
    start: state.day,
    days: 3,
    active: true,
    meds: [
      {
        id: "med",
        name: "Препарат из назначения",
        strength: "По назначению",
        form: "Таблетки",
        dose: 0.5,
        unit: "табл.",
        times: ["08:00", "20:00"],
        days: 3,
        note: "",
        pack: 0,
      },
    ],
  };
  assert.equal(addManualMedication(state, course), true);
  assert.equal(events(state, addDays(state.day, 2)).length, 2);
  assert.equal(events(state, addDays(state.day, 3)).length, 0);
  assert.equal(addManualMedication(state, { ...course, days: 0 }), false);
  assert.equal(
    addManualMedication(state, {
      ...course,
      meds: [{ ...course.meds[0], times: ["8:00"] }],
    }),
    false,
  );
  state.role = "elena";
  assert.equal(addManualMedication(state, course), false);
});

test("Legacy saved state gains a demo procedure and new events survive reload", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const state = seed();
  delete state.planEvents;
  let saved = JSON.stringify(state);
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: { getItem: (key: string) => (key === KEY ? saved : null) },
  });
  try {
    const loaded = loadState();
    assert.equal(loaded.planEvents?.length, 1);
    assert.equal(loaded.planEvents?.[0].demo, true);
    addPlanEvent(loaded, draft(loaded.day));
    saved = JSON.stringify(loaded);
    assert.equal(loadState().planEvents?.length, 2);
  } finally {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});
