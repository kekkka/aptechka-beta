import assert from "node:assert/strict";
import { test } from "node:test";
import {
  events,
  expireDoses,
  markDose,
  resetDemoDose,
  setDemoTime,
  seed,
} from "../src/model";
function fixture() {
  const s = seed();
  s.role = "senior";
  s.clock = 780;
  const e = events(s).find((e) => e.time === "13:00")!;
  return {
    s,
    id: e.id,
    stockId: s.stock.find((st) => st.name === e.med.name)!.id,
  };
}
test("Time travel preserves accepted doses and stock in both directions", () => {
  const { s, id } = fixture();
  markDose(s, id, "taken", "self");
  const stock = JSON.stringify(s.stock),
    log = JSON.stringify(s.logs[id]);
  for (const time of [900, 760, 780, 780]) {
    setDemoTime(s, time);
    assert.equal(JSON.stringify(s.logs[id]), log);
    assert.equal(JSON.stringify(s.stock), stock);
  }
});
test("Automatic misses persist on rewind until the user explicitly resets that dose", () => {
  const { s, id } = fixture();
  setDemoTime(s, 840);
  assert.equal(s.logs[id].status, "missed");
  setDemoTime(s, 780);
  assert.equal(s.logs[id].status, "missed");
  assert.equal(resetDemoDose(s, id), true);
  assert.equal(s.logs[id], undefined);
  assert.equal(markDose(s, id, "taken", "self"), true);
});
test("Explicit reset restores consumed stock exactly once and leaves other outcomes intact", () => {
  const { s, id, stockId } = fixture();
  const qty = s.stock.find((st) => st.id === stockId)!.qty;
  markDose(s, id, "taken", "self");
  const other = events(s).find((e) => e.time === "08:00")!;
  const otherLog = JSON.stringify(s.logs[other.id]);
  assert.equal(resetDemoDose(s, id), true);
  assert.equal(s.stock.find((st) => st.id === stockId)!.qty, qty);
  assert.equal(resetDemoDose(s, id), false);
  assert.equal(s.stock.find((st) => st.id === stockId)!.qty, qty);
  assert.equal(JSON.stringify(s.logs[other.id]), otherLog);
});
test("Reset is blocked outside the active hour, including the exact cutoff", () => {
  const { s, id } = fixture();
  markDose(s, id, "taken", "self");
  for (const time of [779, 840, 900]) {
    s.clock = time;
    const before = JSON.stringify(s);
    assert.equal(resetDemoDose(s, id), false);
    assert.equal(JSON.stringify(s), before);
  }
  s.clock = 839;
  assert.equal(resetDemoDose(s, id), true);
});
test("Reset clears only the chosen dose signals and journal, not courses or other history", () => {
  const { s, id } = fixture();
  markDose(s, id, "taken", "self");
  s.signalState[id] = { resolved: true };
  const courses = JSON.stringify(s.courses),
    other = s.audit.filter((a) => a.dose !== id);
  resetDemoDose(s, id);
  assert.equal(s.signalState[id], undefined);
  assert.deepEqual(s.audit, other);
  assert.equal(JSON.stringify(s.courses), courses);
});
test("Invalid times and unknown reset targets leave state unchanged", () => {
  const { s } = fixture();
  const before = JSON.stringify(s);
  for (const time of [-1, 1440, NaN, 1.5]) setDemoTime(s, time);
  assert.equal(resetDemoDose(s, "unknown"), false);
  assert.equal(JSON.stringify(s), before);
});
