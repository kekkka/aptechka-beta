import assert from "node:assert/strict";
import { test } from "node:test";
import { addDays, events, expireDoses, markDose, seed, undoDose } from "../src/model";
import { calendarTimelineGroup } from "../src/calendar-timeline";

function fixture() {
  const state = seed();
  state.clock = 15 * 60;
  const dose = events(state).find((event) => event.time === "13:00")!;
  expireDoses(state);
  return { state, dose };
}

test("Manager confirms a missed dose with actual time separately from recording time", () => {
  const { state, dose } = fixture();
  const stock = state.stock.find((item) => item.name === dose.med.name)!;
  const quantity = stock.qty;
  assert.equal(state.logs[dose.id].status, "missed");
  assert.equal(markDose(state, dose.id, "taken", "reported", "Забыли отметить", `${state.day}T13:20`), true);
  assert.equal(state.logs[dose.id].status, "taken");
  assert.equal(state.logs[dose.id].actor, "anna");
  assert.equal(state.logs[dose.id].takenAt, `${state.day}T13:20`);
  assert.equal(state.logs[dose.id].time, "15:00");
  assert.equal(stock.qty, quantity - dose.med.dose);
  assert.equal(calendarTimelineGroup(state, { ...dose, log: state.logs[dose.id] }), 1);
  assert.match(state.audit[0].detail, /фактический приём/);
  assert.equal(markDose(state, dose.id, "taken", "reported", "", `${state.day}T13:30`), false);
  assert.equal(stock.qty, quantity - dose.med.dose);
  undoDose(state, dose.id);
  assert.equal(stock.qty, quantity);
});

test("Caregiver, patient and viewer cannot override automatic expiry", () => {
  for (const role of ["elena", "senior", "max"] as const) {
    const { state, dose } = fixture();
    state.role = role;
    const stock = JSON.stringify(state.stock);
    assert.equal(markDose(state, dose.id, "taken", "reported", "", `${state.day}T13:20`), false);
    assert.equal(state.logs[dose.id].status, "missed");
    assert.equal(JSON.stringify(state.stock), stock);
  }
});

test("Actual time must be valid, not before the scheduled dose or in the future", () => {
  for (const time of ["", "invalid", "2026-02-30T13:00", "2026-11-08T25:00", "2026-11-08T13:60"]) {
    const { state, dose } = fixture();
    assert.equal(markDose(state, dose.id, "taken", "reported", "", time), false);
    assert.equal(state.logs[dose.id].status, "missed");
  }
  const { state, dose } = fixture();
  for (const time of [`${state.day}T12:59`, `${state.day}T15:01`, `${addDays(state.day, 1)}T13:00`]) {
    assert.equal(markDose(state, dose.id, "taken", "reported", "", time), false);
  }
});

test("Previously taken and explicitly skipped doses cannot be overwritten", () => {
  for (const status of ["taken", "skipped"] as const) {
    const { state, dose } = fixture();
    state.logs[dose.id] = { status, actor: "elena", time: "13:05" };
    const original = structuredClone(state.logs[dose.id]);
    const stock = JSON.stringify(state.stock);
    assert.equal(markDose(state, dose.id, "taken", "reported", "", `${state.day}T13:20`), false);
    assert.deepEqual(state.logs[dose.id], original);
    assert.equal(JSON.stringify(state.stock), stock);
  }
});

test("Manager can record an unconfirmed historical dose without changing its scheduled day", () => {
  const { state } = fixture();
  const date = addDays(state.day, -1);
  const dose = events(state, date).find((event) => event.time === "13:00")!;
  assert.equal(markDose(state, dose.id, "taken", "reported", "", `${date}T13:10`), true);
  assert.equal(state.logs[dose.id].takenAt, `${date}T13:10`);
  assert.equal(state.logs[dose.id].time, "15:00");
});

test("On-time confirmations also store actual intake time", () => {
  const state = seed();
  state.role = "elena";
  state.clock = 13 * 60 + 10;
  const dose = events(state).find((event) => event.time === "13:00")!;
  assert.equal(markDose(state, dose.id, "taken", "observed"), true);
  assert.equal(state.logs[dose.id].takenAt, `${state.day}T13:10`);
});
