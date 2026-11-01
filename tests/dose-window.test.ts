import assert from "node:assert/strict";
import { test } from "node:test";
import { seed, events, expireDoses, markDose, signals } from "../src/model";
function fixture() {
  const s = seed();
  s.clock = 780;
  s.role = "senior";
  return { s, id: events(s).find((e) => e.time === "13:00")!.id };
}
test("Window remains open through minute 59 and expires exactly at minute 60", () => {
  const { s, id } = fixture();
  s.clock = 839;
  expireDoses(s);
  assert.equal(s.logs[id], undefined);
  s.clock = 840;
  expireDoses(s);
  assert.equal(s.logs[id].status, "missed");
  assert.equal(s.logs[id].time, "14:00");
  assert.equal(s.logs[id].source, "timeout");
});
test("Confirming in the final minute works, then expiry preserves the confirmed dose", () => {
  const { s, id } = fixture();
  s.clock = 839;
  assert.equal(markDose(s, id, "taken", "self"), true);
  s.clock = 900;
  expireDoses(s);
  assert.equal(s.logs[id].status, "taken");
});
test("Late confirmation cannot consume stock or override automatic expiry", () => {
  const { s, id } = fixture();
  const before = JSON.stringify(s.stock);
  s.clock = 840;
  assert.equal(markDose(s, id, "taken", "self"), false);
  assert.equal(s.logs[id].status, "missed");
  assert.equal(JSON.stringify(s.stock), before);
  assert.ok(signals(s).some((e) => e.id === id));
});
test("Expiry is idempotent and persists when demo time is rewound", () => {
  const { s, id } = fixture();
  s.clock = 900;
  expireDoses(s);
  const count = s.audit.length;
  expireDoses(s);
  assert.equal(s.audit.length, count);
  s.clock = 780;
  expireDoses(s);
  assert.equal(s.logs[id].status, "missed");
});
test("Snoozing does not extend the one-hour confirmation window", () => {
  const { s, id } = fixture();
  s.logs[id] = { status: "snoozed", snoozedUntil: 850 };
  s.clock = 840;
  expireDoses(s);
  assert.equal(s.logs[id].status, "missed");
});
test("Automatic expiry also handles plans hidden from the current role", () => {
  const { s, id } = fixture();
  s.role = "max";
  s.courses[0].importMethod = "OCR";
  s.courses[0].helper = "elena";
  s.clock = 840;
  assert.equal(events(s).length, 0);
  expireDoses(s);
  assert.equal(s.logs[id].status, "missed");
});
test("Explicit skips remain unchanged and unconfirmed future doses do not expire", () => {
  const { s, id } = fixture();
  s.logs[id] = { status: "skipped", actor: "elena" };
  s.clock = 840;
  expireDoses(s);
  assert.equal(s.logs[id].status, "skipped");
  const future = events(s).find((e) => e.time === "20:00")!;
  assert.equal(s.logs[future.id], undefined);
});
