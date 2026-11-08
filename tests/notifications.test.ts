import assert from "node:assert/strict";
import { test } from "node:test";
import { careNotifications, isNotificationRead, markNotificationsRead, unreadNotificationCount } from "../src/notifications";
import { addDays, events, expireDoses, markDose, seed, shopping, replenishShoppingStock, medKey } from "../src/model";

function setup() {
  const state = seed();
  state.logs = {};
  state.signalState = {};
  state.clock = 8 * 60;
  return state;
}

test("Patient has neither notifications nor demo cards, even with missed doses and shortages", () => {
  const s = setup();
  s.clock = 21 * 60;
  s.stock = [];
  expireDoses(s);
  s.role = "senior";
  assert.deepEqual(careNotifications(s), []);
});

test("Only the manager gets call examples and monitoring previews", () => {
  const s = setup(); s.role = "anna";
  const demos = careNotifications(s).filter(item => item.demo);
  assert.deepEqual(demos.map(item => item.kind), ["patient", "patient", "health"]);
  assert.ok(demos.slice(0, 2).every(item => item.action === "devices" && item.callId));
  s.role = "elena";
  assert.ok(!careNotifications(s).some(item => item.kind === "patient" || item.kind === "health"));
});

test("Caregiver's reported skip keeps its author and reason and vanishes after resolution", () => {
  const s = setup();
  s.role = "elena";
  const dose = events(s).find((e) => e.time === "08:00")!;
  assert.equal(markDose(s, dose.id, "skipped", "observed", "Пациент отказался"), true);
  s.role = "anna";
  const item = careNotifications(s).find((n) => n.id === `dose:${dose.id}`)!;
  assert.match(item.source, /Елена/);
  assert.equal(item.detail, "Пациент отказался");
  assert.equal(item.action, "plan");
  s.signalState[dose.id] = { resolved: true };
  assert.ok(!careNotifications(s).some((n) => n.id === item.id));
});

test("Expired doses are automatic signals, not fabricated messages from the caregiver", () => {
  const s = setup();
  s.clock = 9 * 60;
  expireDoses(s);
  const items = careNotifications(s).filter((n) => n.kind === "caregiver");
  assert.ok(items.length > 0);
  assert.ok(items.every((n) => n.source.startsWith("Автоматический сигнал")));
  assert.ok(items.every((n) => n.title === "Приём не подтверждён вовремя"));
});

test("Stock alerts match shortages and disappear after sufficient replenishment", () => {
  const s = setup();
  s.stock = [];
  const needs = shopping(s);
  assert.equal(careNotifications(s).filter((n) => n.kind === "stock").length, needs.length);
  for (const need of needs) {
    assert.ok(replenishShoppingStock(s, medKey(need.med), need.missing, addDays(s.day, 100), "purchased"));
  }
  assert.equal(careNotifications(s).filter((n) => n.kind === "stock").length, 0);
});

test("Imported courses hidden from a helper cannot leak through dose or stock alerts", () => {
  const s = setup();
  s.role = "elena";
  s.courses.forEach((course) => { course.importMethod = "manual"; course.helper = "max"; });
  s.stock = [];
  s.clock = 21 * 60;
  expireDoses(s);
  assert.ok(careNotifications(s).every((n) => n.demo));
});


test("Reading one notification reduces count without resolving a care issue", () => {
  const s = setup();
  s.clock = 9 * 60;
  expireDoses(s);
  const item = careNotifications(s).find((n) => n.kind === "caregiver")!;
  const count = unreadNotificationCount(s);
  const before = JSON.stringify({ logs: s.logs, signals: s.signalState, stock: s.stock });
  markNotificationsRead(s, [item.id]);
  assert.equal(unreadNotificationCount(s), count - 1);
  assert.ok(isNotificationRead(s, item));
  assert.ok(careNotifications(s).some((n) => n.id === item.id));
  assert.equal(JSON.stringify({ logs: s.logs, signals: s.signalState, stock: s.stock }), before);
  markNotificationsRead(s, [item.id]);
  assert.equal(unreadNotificationCount(s), count - 1);
});

test("Read all persists through JSON storage and is scoped to the current account", () => {
  const s = setup();
  s.stock = [];
  const count = unreadNotificationCount(s);
  assert.ok(count > 0);
  markNotificationsRead(s, careNotifications(s).map((n) => n.id));
  const restored = JSON.parse(JSON.stringify(s));
  assert.equal(unreadNotificationCount(restored), 0);
  assert.ok(careNotifications(restored).every((n) => isNotificationRead(restored, n)));
  restored.role = "elena";
  assert.equal(unreadNotificationCount(restored), count);
  restored.role = "anna";
  assert.equal(unreadNotificationCount(restored), 0);
});

test("A changed shortage becomes unread again, while unchanged cards remain read", () => {
  const s = setup();
  s.stock = [];
  const need = shopping(s)[0];
  markNotificationsRead(s, careNotifications(s).map((n) => n.id));
  assert.ok(replenishShoppingStock(s, medKey(need.med), 1, addDays(s.day, 100), "purchased"));
  assert.equal(unreadNotificationCount(s), 1);
});

test("Demo reads never affect the badge; patient and unknown IDs cannot create receipts", () => {
  const s = setup();
  const count = unreadNotificationCount(s);
  markNotificationsRead(s, careNotifications(s).filter((n) => n.demo).map((n) => n.id));
  assert.equal(unreadNotificationCount(s), count);
  const before = JSON.stringify(s.notificationReads);
  markNotificationsRead(s, ["not-visible"]);
  s.role = "senior";
  markNotificationsRead(s, ["demo:call-symptoms"]);
  assert.equal(JSON.stringify(s.notificationReads), before);
  assert.equal(unreadNotificationCount(s), 0);
});
