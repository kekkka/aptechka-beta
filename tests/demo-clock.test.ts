import assert from "node:assert/strict";
import { test } from "node:test";
import { demoMoments, demoScenarios, suggestedMoment } from "../src/demo-clock";
import { events, seed } from "../src/model";
test("Moments group simultaneous medications and preserve whether confirmation is pending", () => {
  const s = seed();
  s.courses[0].meds[2].times = ["08:00"];
  const result = demoMoments(events(s));
  assert.equal(result[0].time, "08:00");
  assert.match(result[0].names, /Препарат А/);
  assert.match(result[0].names, /Препарат В/);
  assert.equal(result[0].pending, true);
  assert.deepEqual(
    result.map((m) => m.time),
    ["08:00", "13:00", "20:00"],
  );
});
test("Suggest the next unconfirmed dose and support rewinding from the end of the day", () => {
  const moments = demoMoments(events(seed()));
  assert.equal(suggestedMoment(moments, 825)?.time, "20:00");
  assert.equal(suggestedMoment(moments, 1439)?.time, "13:00");
  assert.equal(suggestedMoment([], 800), undefined);
});
test("Scenario times match waiting, eligibility and the configured alert threshold", () => {
  const result = demoScenarios(780, 30);
  assert.deepEqual(
    result.map((s) => s.minute),
    [775, 780, 810, 840],
  );
  assert.ok(result.every((s) => s.available));
});
test("Do not offer scenarios outside the current day", () => {
  assert.equal(demoScenarios(0, 30)[0].available, false);
  assert.equal(demoScenarios(1430, 30)[2].available, false);
});
