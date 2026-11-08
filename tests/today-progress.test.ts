import assert from "node:assert/strict";
import { test } from "node:test";
import { addDays, events, seed } from "../src/model";
import { todayProgress } from "../src/today-progress";

test("Today's progress combines doses, scheduled events and care completed today", () => {
  const state = seed();
  state.role = "anna";
  state.planEvents = [
    {
      id: "procedure",
      kind: "procedure",
      title: "Процедура",
      date: state.day,
      time: "10:00",
      note: "",
      method: "manual",
      completedBy: "Анна",
    },
    {
      id: "visit",
      kind: "appointment",
      title: "Визит",
      date: state.day,
      time: "11:00",
      note: "",
      method: "manual",
    },
    {
      id: "tomorrow",
      kind: "appointment",
      title: "Завтра",
      date: addDays(state.day, 1),
      time: "11:00",
      note: "",
      method: "manual",
      completedBy: "Анна",
    },
  ];
  state.logs = {};
  const doses = events(state);
  for (const [index, status] of (
    ["taken", "skipped", "missed", "snoozed"] as const
  ).entries()) {
    state.logs[doses[index].id] = { status };
  }
  state.careDone = {
    [state.careTasks[0].id]: state.day,
    [state.careTasks[1].id]: addDays(state.day, -1),
  };
  const result = todayProgress(state);
  assert.equal(result.total, doses.length + state.careTasks.length + 2);
  assert.equal(result.completed, 3);
  assert.equal(result.remaining, result.total - 3);
  assert.equal(result.percent, Math.round(300 / result.total));
});

test("Empty day has zero progress; a fully completed day has 100 percent", () => {
  const state = seed();
  state.role = "anna";
  state.courses = [];
  state.planEvents = [];
  state.careTasks = [];
  assert.deepEqual(todayProgress(state), {
    total: 0,
    completed: 0,
    remaining: 0,
    percent: 0,
  });
  state.careTasks = [
    { id: "care", title: "Уход", icon: "heart", time: "09:00", note: "" },
  ];
  state.careDone = { care: state.day };
  assert.deepEqual(todayProgress(state), {
    total: 1,
    completed: 1,
    remaining: 0,
    percent: 100,
  });
  state.day = addDays(state.day, 1);
  assert.equal(todayProgress(state).completed, 0);
});

test("Manager checklist uses caregiver rows and matches the home progress", async () => {
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { CaregiverHome } = await import("../src/CaregiverHome");
  const { planEventsForDate } = await import("../src/plan-events");
  const state = seed();
  state.role = "anna";
  const scheduledEvents = planEventsForDate(state, state.day).filter(
    (event) => !event.demo,
  );
  const progress = todayProgress(state);
  const html = renderToStaticMarkup(
    createElement(CaregiverHome, {
      state,
      events: events(state),
      scheduledEvents,
      onOpenEvent: () => {},
      onOpenPlanEvent: () => {},
      onCompleteCare: () => {},
    }),
  );
  assert.ok(
    html.includes(`${progress.completed} из ${progress.total} выполнено`),
  );
  assert.equal((html.match(/class="todo-item /g) || []).length, progress.total);
  for (const event of scheduledEvents) assert.ok(html.includes(event.title));
});
