import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RegularEventEditor } from "../src/RegularEventEditor";
import { RegularPlan } from "../src/RegularPlan";
import {
  events,
  markDose,
  medKey,
  seed,
  shopping,
  undoDose,
} from "../src/model";
import { doctorRows } from "../src/doctor-report";
import {
  addPlanEvent,
  completePlanEvent,
  planEventsForDate,
} from "../src/plan-events";
import {
  deleteRegularEvent,
  regularEventDetails,
  regularEventHash,
  regularEventTarget,
  saveRegularEvent,
} from "../src/regular-event-editor";
import type { RegularEventTarget, ScheduleSettings } from "../src/types";

function fixture() {
  const state = seed();
  state.planEvents = [];
  state.day = "2026-11-08";
  state.clock = 600;
  state.courses = [state.courses[0]];
  const course = state.courses[0];
  course.start = "2026-11-02";
  course.days = 14;
  for (const medication of course.meds) {
    medication.days = 14;
    medication.times = ["08:00"];
  }
  state.logs = {};
  state.stock = [];
  const target: RegularEventTarget = {
    kind: "medication",
    courseId: course.id,
    medicationId: course.meds[0].id,
  };
  const settings: ScheduleSettings = {
    weekdays: [1, 3, 5],
    times: ["09:00", "18:00"],
    dose: 0.5,
    mealTiming: "after",
    endDate: "2026-11-20",
  };
  return {
    state,
    target,
    settings,
    medication: course.meds[0],
    sibling: course.meds[1],
  };
}

test("Editor routes roundtrip event identities and reject malformed targets", () => {
  for (const target of [
    { kind: "medication", courseId: "course with spaces", medicationId: "a/b" },
    { kind: "procedure", id: "pressure" },
  ] as RegularEventTarget[]) {
    assert.deepEqual(
      regularEventTarget(`#${regularEventHash(target)}`),
      target,
    );
  }
  for (const hash of [
    "#plan",
    "#edit-event/procedure/",
    "#edit-event/medication/1",
    "#edit-event/procedure/%ZZ",
    "#edit-event/procedure/1/extra",
  ])
    assert.equal(regularEventTarget(hash), null);
});

test("Editing weekdays, multiple times, dose, meals and end date changes only future doses of one medication", () => {
  const { state, target, settings, medication, sibling } = fixture();
  const today = events(state).map((event) => ({
    id: event.id,
    dose: event.med.dose,
    time: event.time,
  }));
  const siblingBefore = structuredClone(sibling);
  const first = events(state)[0];
  state.logs[first.id] = { status: "taken", consumed: 1, actorName: "Тест" };
  const logs = structuredClone(state.logs);
  assert.equal(saveRegularEvent(state, target, settings), true);
  assert.deepEqual(
    events(state).map((event) => ({
      id: event.id,
      dose: event.med.dose,
      time: event.time,
    })),
    today,
  );
  assert.deepEqual(sibling, siblingBefore);
  assert.deepEqual(state.logs, logs);
  const monday = events(state, "2026-11-09").filter(
    (event) => event.med.id === medication.id,
  );
  assert.deepEqual(
    monday.map((event) => event.time),
    ["09:00", "18:00"],
  );
  assert.equal(monday[0].med.dose, 0.5);
  assert.equal(monday[0].med.mealTiming, "after");
  assert.equal(
    events(state, "2026-11-10").filter(
      (event) => event.med.id === medication.id,
    ).length,
    0,
  );
  assert.equal(
    events(state, "2026-11-20").filter(
      (event) => event.med.id === medication.id,
    ).length,
    2,
  );
  assert.equal(
    events(state, "2026-11-21").filter(
      (event) => event.med.id === medication.id,
    ).length,
    0,
  );
  state.day = "2026-11-09";
  assert.equal(
    shopping(state).find((need) => medKey(need.med) === medKey(medication))
      ?.needed,
    6,
  );
  const rows = doctorRows(state, 2).filter(
    (row) => row.med.id === medication.id,
  );
  assert.equal(rows.find((row) => row.date === "2026-11-08")?.med.dose, 1);
  assert.equal(rows.find((row) => row.date === "2026-11-09")?.med.dose, 0.5);
});

test("Subsequent edits retain historical versions while replacing not-yet-effective edits", () => {
  const { state, target, settings, medication } = fixture();
  saveRegularEvent(state, target, settings);
  saveRegularEvent(state, target, { ...settings, dose: 0.75 });
  assert.equal(medication.scheduleRevisions?.length, 1);
  state.day = "2026-11-10";
  saveRegularEvent(state, target, { ...settings, dose: 2 });
  assert.equal(medication.scheduleRevisions?.length, 2);
  assert.equal(
    events(state, "2026-11-09").find((event) => event.med.id === medication.id)
      ?.med.dose,
    0.75,
  );
  assert.equal(
    events(state, "2026-11-11").find((event) => event.med.id === medication.id)
      ?.med.dose,
    2,
  );
});

test("Dose confirmation consumes the edited amount and undo restores that exact stock", () => {
  const { state, target, settings, medication } = fixture();
  saveRegularEvent(state, target, settings);
  state.stock = [
    {
      id: "edited-stock",
      name: medication.name,
      strength: medication.strength,
      form: medication.form,
      unit: medication.unit,
      qty: 10,
      pack: 20,
    },
  ];
  state.day = "2026-11-09";
  state.clock = 540;
  const event = events(state).find(
    (entry) => entry.med.id === medication.id && entry.time === "09:00",
  )!;
  assert.equal(markDose(state, event.id, "taken", "observed"), true);
  assert.equal(state.stock[0].qty, 9.5);
  assert.equal(state.logs[event.id].consumed, 0.5);
  undoDose(state, event.id);
  assert.equal(state.stock[0].qty, 10);
});

test("Medication replacement uses pharmacy stock only for future doses and inventory consumption", () => {
  const { state, target, settings, medication } = fixture();
  const originalName = medication.name;
  state.stock = [
    {
      id: "replacement",
      name: "Новое лекарство",
      strength: "10 мг",
      form: "таблетки",
      unit: "таб.",
      pack: 30,
      qty: 1,
      expiry: "2027-01-01",
    },
  ];
  const stockBefore = structuredClone(state.stock);
  const renderEditor = () =>
    renderToStaticMarkup(
      createElement(RegularEventEditor, {
        state,
        target,
        onBack: () => {},
        onSave: () => true,
        onDelete: () => true,
      }),
    );
  assert.match(renderEditor(), /Лекарство из аптечки/);
  assert.match(renderEditor(), /Новое лекарство/);
  assert.equal(
    saveRegularEvent(state, target, { ...settings, stockId: "replacement" }),
    true,
  );
  assert.deepEqual(state.stock, stockBefore);
  assert.equal(
    events(state).find((entry) => entry.med.id === medication.id)!.med.name,
    originalName,
  );
  assert.equal(regularEventDetails(state, target)!.title, "Новое лекарство");
  assert.equal(saveRegularEvent(state, target, settings), true);
  state.day = "2026-11-09";
  state.clock = 540;
  const event = events(state).find((entry) => entry.med.id === medication.id)!;
  assert.equal(event.med.name, "Новое лекарство");
  assert.equal(event.med.strength, "10 мг");
  assert.ok(
    shopping(state).some((entry) => entry.med.name === "Новое лекарство"),
  );
  assert.equal(markDose(state, event.id, "taken"), true);
  assert.equal(state.stock[0].qty, 0.5);
  assert.equal(
    doctorRows(state, 2).find((entry) => entry.id === event.id)!.med.name,
    "Новое лекарство",
  );
  assert.equal(
    doctorRows(state, 2).find(
      (entry) => entry.date === "2026-11-08" && entry.med.id === medication.id,
    )!.med.name,
    originalName,
  );
  undoDose(state, event.id);
  assert.equal(state.stock[0].qty, 1);
});

test("Unavailable pharmacy replacements do not change the event", () => {
  const { state, target, settings } = fixture();
  state.stock = [
    {
      id: "expired",
      name: "Старое",
      strength: "10 мг",
      form: "таблетки",
      unit: "таб.",
      pack: 30,
      qty: 30,
      expiry: "2026-11-01",
    },
  ];
  const before = structuredClone(state);
  for (const stockId of ["missing", "expired"])
    assert.equal(
      saveRegularEvent(state, target, { ...settings, stockId }),
      false,
    );
  assert.deepEqual(state, before);
});

test("Procedure editing supports weekday selection and independent confirmations at each time", () => {
  const { state, settings } = fixture();
  addPlanEvent(state, {
    kind: "procedure",
    title: "Измерение давления",
    date: state.day,
    time: "10:00",
    note: "",
    method: "manual",
    recurrence: { days: 7, intervalDays: 2 },
  });
  const procedure = state.planEvents![0];
  const target: RegularEventTarget = { kind: "procedure", id: procedure.id };
  const oldOccurrence = planEventsForDate(state, state.day)[0];
  completePlanEvent(state, oldOccurrence.id);
  assert.equal(saveRegularEvent(state, target, settings), true);
  assert.equal(
    planEventsForDate(state, state.day)[0].completedBy,
    state.members[0].name,
  );
  state.day = "2026-11-09";
  const occurrences = planEventsForDate(state, state.day);
  assert.equal(occurrences.length, 2);
  assert.equal(completePlanEvent(state, occurrences[0].id), true);
  assert.equal(completePlanEvent(state, occurrences[0].id), false);
  assert.equal(planEventsForDate(state, state.day, true).length, 1);
  assert.notEqual(occurrences[0].id, occurrences[1].id);
  assert.equal(completePlanEvent(state, occurrences[1].id), true);
  assert.equal(planEventsForDate(state, "2026-11-10").length, 0);
});

test("Procedure description is editable, versioned, preserved and can be cleared", () => {
  const { state, settings } = fixture();
  addPlanEvent(state, {
    kind: "procedure",
    title: "Массаж",
    date: state.day,
    time: "10:00",
    note: "Исходное описание",
    method: "manual",
    recurrence: { days: 14, intervalDays: 1 },
  });
  const target: RegularEventTarget = {
    kind: "procedure",
    id: state.planEvents![0].id,
  };
  const renderEditor = () =>
    renderToStaticMarkup(
      createElement(RegularEventEditor, {
        state,
        target,
        onBack: () => {},
        onSave: () => true,
        onDelete: () => true,
      }),
    );
  assert.match(renderEditor(), /Описание процедуры/);
  assert.match(renderEditor(), /<textarea[^>]*>Исходное описание<\/textarea>/);
  assert.equal(
    saveRegularEvent(state, target, {
      ...settings,
      note: "  Новое описание  ",
    }),
    true,
  );
  assert.equal(
    planEventsForDate(state, state.day)[0].note,
    "Исходное описание",
  );
  assert.equal(
    planEventsForDate(state, "2026-11-09")[0].note,
    "Новое описание",
  );
  assert.match(renderEditor(), /Новое описание/);
  const list = renderToStaticMarkup(
    createElement(RegularPlan, { state, onEdit: () => {} }),
  );
  assert.doesNotMatch(list, /Новое описание/);
  assert.equal(saveRegularEvent(state, target, settings), true);
  assert.equal(
    regularEventDetails(state, target)!.settings.note,
    "Новое описание",
  );
  state.day = "2026-11-09";
  assert.equal(
    saveRegularEvent(state, target, {
      ...settings,
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      note: "",
    }),
    true,
  );
  assert.equal(
    planEventsForDate(state, "2026-11-09")[0].note,
    "Новое описание",
  );
  assert.equal(planEventsForDate(state, "2026-11-10")[0].note, "");
  assert.doesNotMatch(renderEditor(), /Новое описание/);
});

test("Deleting a medication hides only its tile and future schedule but preserves today, stock and logs", () => {
  const { state, target, medication, sibling } = fixture();
  const todayIds = events(state).map((event) => event.id);
  const stock = structuredClone(state.stock);
  const logs = structuredClone(state.logs);
  assert.equal(deleteRegularEvent(state, target), true);
  assert.equal(deleteRegularEvent(state, target), false);
  assert.deepEqual(
    events(state).map((event) => event.id),
    todayIds,
  );
  assert.equal(
    events(state, "2026-11-09").some((event) => event.med.id === medication.id),
    false,
  );
  assert.equal(
    events(state, "2026-11-09").some((event) => event.med.id === sibling.id),
    true,
  );
  assert.deepEqual(state.stock, stock);
  assert.deepEqual(state.logs, logs);
  const html = renderToStaticMarkup(
    createElement(RegularPlan, {
      state,
      onEdit: () => {},
    }),
  );
  assert.ok(!html.includes(`Регулярный приём: ${medication.name}`));
  assert.ok(html.includes(`Регулярный приём: ${sibling.name}`));
  const restored = JSON.parse(JSON.stringify(state));
  assert.equal(
    events(restored, "2026-11-09").some(
      (event) => event.med.id === medication.id,
    ),
    false,
  );
});

test("Deletion of one procedure preserves previous completions without touching siblings", () => {
  const { state } = fixture();
  for (const title of ["Давление", "Массаж"])
    addPlanEvent(state, {
      kind: "procedure",
      title,
      date: state.day,
      time: "10:00",
      note: "",
      method: "manual",
      recurrence: { days: 7, intervalDays: 1 },
    });
  const first = state.planEvents![0];
  completePlanEvent(state, planEventsForDate(state, state.day)[0].id);
  assert.equal(
    deleteRegularEvent(state, { kind: "procedure", id: first.id }),
    true,
  );
  assert.equal(
    planEventsForDate(state, state.day)[0].completedBy,
    state.members[0].name,
  );
  assert.deepEqual(
    planEventsForDate(state, "2026-11-09").map((event) => event.title),
    ["Массаж"],
  );
});

test("Invalid edits, unknown targets and unauthorized changes leave state untouched", () => {
  const { state, target, settings } = fixture();
  const invalid = [
    { ...settings, weekdays: [] },
    { ...settings, weekdays: [7] },
    { ...settings, weekdays: [1, 1] },
    { ...settings, times: [] },
    { ...settings, times: ["8:00"] },
    { ...settings, times: ["08:00", "08:00"] },
    { ...settings, dose: 0 },
    { ...settings, endDate: "2026-02-30" },
    { ...settings, endDate: "2026-11-08" },
    { ...settings, endDate: "2030-01-01" },
  ];
  const before = structuredClone(state);
  for (const draft of invalid)
    assert.equal(saveRegularEvent(state, target, draft), false);
  assert.deepEqual(state, before);
  for (const role of ["elena", "senior", "unknown"]) {
    state.role = role;
    assert.equal(regularEventDetails(state, target), null);
    assert.equal(saveRegularEvent(state, target, settings), false);
    assert.equal(deleteRegularEvent(state, target), false);
  }
});

test("Caregiver can view calendar events but cannot edit medication or procedure schedules", () => {
  const { state, target, settings } = fixture();
  addPlanEvent(state, {
    kind: "procedure",
    title: "Массаж",
    date: state.day,
    time: "10:00",
    note: "Описание",
    method: "manual",
    recurrence: { days: 7, intervalDays: 1 },
  });
  state.role = "elena";
  const procedureTarget: RegularEventTarget = {
    kind: "procedure",
    id: state.planEvents![0].id,
  };
  const before = structuredClone(state);
  for (const entry of [target, procedureTarget]) {
    assert.equal(regularEventDetails(state, entry), null);
    assert.equal(saveRegularEvent(state, entry, settings), false);
    assert.equal(deleteRegularEvent(state, entry), false);
    const html = renderToStaticMarkup(
      createElement(RegularEventEditor, {
        state,
        target: entry,
        onBack: () => {},
        onSave: () => true,
        onDelete: () => true,
      }),
    );
    assert.doesNotMatch(html, /Сохранить изменения|Удалить событие/);
  }
  assert.ok(events(state).length > 0);
  assert.equal(planEventsForDate(state, state.day).length, 1);
  assert.deepEqual(state, before);
});

test("Dedicated editor displays all required medication controls and a delete action", () => {
  const { state, target } = fixture();
  const html = renderToStaticMarkup(
    createElement(RegularEventEditor, {
      state,
      target,
      onBack: () => {},
      onSave: () => true,
      onDelete: () => true,
    }),
  );
  for (const label of [
    "Редактирование события",
    "Лекарство из аптечки",
    "Дни недели",
    "Понедельник",
    "Воскресенье",
    "Время 1",
    "Добавить время",
    "Дозировка за один приём",
    "Приём относительно еды",
    "До еды",
    "После еды",
    "Дата конца курса",
    "Сохранить изменения",
    "Удалить событие",
  ])
    assert.ok(html.includes(label), label);
  assert.ok(
    html.indexOf("Лекарство из аптечки") < html.indexOf("Дни недели"),
  );
  assert.doesNotMatch(html.split("<form")[0], /<p>/);
  assert.match(html, /min="2026-11-09"/);
  const list = renderToStaticMarkup(
    createElement(RegularPlan, {
      state,
      onEdit: () => {},
    }),
  );
  assert.equal(
    (list.match(/aria-label="Редактировать /g) || []).length,
    state.courses[0].meds.length,
  );
});
