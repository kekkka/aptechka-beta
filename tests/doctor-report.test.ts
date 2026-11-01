import assert from "node:assert/strict";
import { test } from "node:test";
import { seed, addDays, events, markDose } from "../src/model";
import {
  doctorRows,
  reportTotals,
  reportMedications,
} from "../src/doctor-report";
test("Today reports actual taken doses separately from awaiting and future doses", () => {
  const s = seed();
  const before = JSON.stringify(s);
  const rows = doctorRows(s, 1),
    totals = reportTotals(rows);
  assert.equal(rows.length, 4);
  assert.equal(totals.taken, 2);
  assert.equal(totals.waiting, 1);
  assert.equal(totals.planned, 1);
  assert.equal(totals.missed, 0);
  assert.equal(JSON.stringify(s), before);
});
test("Historical gaps are unknown, not invented as missed doses", () => {
  const s = seed();
  const rows = doctorRows(s, 7);
  assert.equal(
    rows.filter((r) => r.date < s.day && r.status === "unknown").length,
    12,
  );
  assert.equal(
    rows.some((r) => r.date < addDays(s.day, -6)),
    false,
  );
  assert.equal(reportTotals(rows).missed, 0);
});
test("Missed, skipped and taken outcomes keep their original timestamps and source", () => {
  const s = seed();
  s.clock = 780;
  const e = events(s).find((e) => e.time === "13:00")!;
  markDose(s, e.id, "taken", "self");
  const row = doctorRows(s, 1).find((row) => row.id === e.id)!;
  assert.equal(row.status, "taken");
  assert.equal(row.log?.time, "13:00");
  assert.equal(row.log?.source, "self");
  s.logs[e.id] = { status: "skipped", note: "Отказ пациента" };
  assert.equal(
    doctorRows(s, 1).find((row) => row.id === e.id)?.status,
    "skipped",
  );
});
test("Ended courses retain recorded history without fabricating additional appointments", () => {
  const s = seed();
  s.courses[0].active = false;
  const rows = doctorRows(s, 7);
  assert.equal(rows.length, 2);
  assert.ok(rows.every((row) => row.log));
});
test("Medication groups distinguish strengths and reconcile totals", () => {
  const s = seed();
  const rows = doctorRows(s, 7);
  const groups = reportMedications(rows);
  assert.equal(groups.length, 3);
  assert.equal(
    groups.reduce((sum, g) => sum + g.rows.length, 0),
    rows.length,
  );
  assert.equal(
    groups.reduce((sum, g) => sum + g.totals.taken, 0),
    reportTotals(rows).taken,
  );
});
test("Reports respect course visibility", () => {
  const s = seed();
  s.role = "max";
  s.courses[0].importMethod = "OCR";
  s.courses[0].helper = "elena";
  assert.equal(doctorRows(s, 7).length, 0);
});
