import assert from "node:assert/strict";
import { test } from "node:test";
import { calendarTimelineGroup } from "../src/calendar-timeline";
import { addDays, events, seed } from "../src/model";
import type { PlanEvent } from "../src/types";

test("Medication timeline puts pending, marked and expired doses in order", () => {
  const state = seed();
  state.clock = 13 * 60;
  const dose = { ...events(state)[0], time: "13:00", log: undefined };
  assert.equal(calendarTimelineGroup(state, dose), 0);
  assert.equal(calendarTimelineGroup(state, { ...dose, time: "12:01" }), 0);
  assert.equal(calendarTimelineGroup(state, { ...dose, time: "12:00" }), 2);
  for (const status of ["taken", "skipped"] as const) {
    assert.equal(calendarTimelineGroup(state, {
      ...dose, time: "08:00", log: { status },
    }), 1);
  }
  assert.equal(calendarTimelineGroup(state, {
    ...dose, log: { status: "missed" },
  }), 2);
  assert.equal(calendarTimelineGroup(state, {
    ...dose, log: { status: "snoozed" },
  }), 0);
  assert.equal(calendarTimelineGroup(state, {
    ...dose, time: "12:00", log: { status: "snoozed", snoozedUntil: 900 },
  }), 2);
});

test("Procedures and appointments respect date, time and completion", () => {
  const state = seed();
  state.clock = 13 * 60;
  for (const kind of ["procedure", "appointment"] as const) {
    const event: PlanEvent = {
      id: kind, kind, title: "Событие", date: state.day,
      time: "13:01", note: "", method: "manual",
    };
    assert.equal(calendarTimelineGroup(state, event), 0);
    assert.equal(calendarTimelineGroup(state, { ...event, time: "12:59" }), 2);
    assert.equal(calendarTimelineGroup(state, {
      ...event, date: addDays(state.day, -1),
    }), 2);
    assert.equal(calendarTimelineGroup(state, {
      ...event, date: addDays(state.day, 1), time: "08:00",
    }), 0);
    assert.equal(calendarTimelineGroup(state, {
      ...event, date: addDays(state.day, -1), completedBy: "Анна",
    }), 1);
  }
});
