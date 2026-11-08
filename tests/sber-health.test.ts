import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AddPlanEvent, MANUAL_EVENT_TYPES } from "../src/AddPlanEvent";
import {
  SberAppointmentCard,
  SberAppointmentStub,
} from "../src/SberAppointment";
import { addDays, seed } from "../src/model";
import { sberHealthAppointments } from "../src/sber-health";

test("Manual event choices exclude appointments; scanning remains a separate action", () => {
  assert.deepEqual(
    MANUAL_EVENT_TYPES.map(([kind]) => kind),
    ["medication", "procedure"],
  );
  const html = renderToStaticMarkup(
    createElement(AddPlanEvent, {
      date: seed().day,
      onImport: () => {},
      onMedication: () => true,
      onEvent: () => true,
    }),
  );
  assert.match(html, /Вручную/);
  assert.match(html, /Отсканировать назначение/);
  assert.doesNotMatch(html, /Запись к врачу|Выберите тип события/);
});

test("Mock appointment arrives automatically for the demo day without changing stored state", () => {
  const state = seed();
  const before = structuredClone(state);
  const appointments = sberHealthAppointments(state, state.day);
  assert.equal(appointments.length, 1);
  assert.equal(appointments[0].method, "sber");
  assert.equal(appointments[0].kind, "appointment");
  assert.equal(appointments[0].demo, true);
  assert.equal(appointments[0].time, "16:30");
  assert.deepEqual(sberHealthAppointments(state, state.day), appointments);
  assert.deepEqual(sberHealthAppointments(state, addDays(state.day, 1)), []);
  assert.deepEqual(state, before);
});

test("Appointment visibility follows patient and care-team access", () => {
  const state = seed();
  for (const role of ["anna", "elena", "senior"]) {
    state.role = role;
    assert.equal(sberHealthAppointments(state, state.day).length, 1);
  }
  state.role = "elena";
  state.members.find((member) => member.id === "elena")!.view = false;
  assert.deepEqual(sberHealthAppointments(state, state.day), []);
  state.role = "unknown";
  assert.deepEqual(sberHealthAppointments(state, state.day), []);
});

test("Tapping the full appointment card opens the stub, not a completion action", () => {
  const state = seed();
  const event = sberHealthAppointments(state, state.day)[0];
  let opened = false;
  const card = SberAppointmentCard({
    event,
    onOpen: () => {
      opened = true;
    },
  });
  assert.equal(card.type, "button");
  assert.equal(card.props.type, "button");
  card.props.onClick();
  assert.equal(opened, true);
  const html = renderToStaticMarkup(card);
  assert.match(html, /Демо/);
  assert.match(html, /мок автозагрузки/);
  assert.match(html, /Открыть в СберЗдоровье/);
  assert.match(html, /Соколова Мария Андреевна/);
  assert.doesNotMatch(html, /Отметить выполнение|href=/);
  assert.equal(event.completedBy, undefined);
});

test("Transition stub explains app-first and browser fallback without pretending to launch", () => {
  const state = seed();
  const event = sberHealthAppointments(state, state.day)[0];
  const html = renderToStaticMarkup(
    createElement(SberAppointmentStub, { event, onClose: () => {} }),
  );
  assert.match(html, /приложении СберЗдоровье/);
  assert.match(html, /Если приложение не установлено/);
  assert.match(html, /в браузере/);
  assert.match(html, /Сейчас это заглушка/);
  assert.doesNotMatch(html, /href=/);
});
