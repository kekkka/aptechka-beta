import assert from "node:assert/strict";
import { test } from "node:test";
import { parse } from "../src/parser";
test("Two drugs preserve independent durations and explicit times", () => {
  const r = parse(
    "1. Учебный Альфа 10 мг, таблетки.\nПо 1 таблетке в 09:00 и 19:00, после еды, 7 дней.\n2. Учебный Бета 5 мг, капсулы.\nПо 1 капсуле в 14:00, 5 дней.",
  );
  assert.equal(r.meds.length, 2);
  assert.deepEqual(
    r.meds.map((m) => m.days),
    [7, 5],
  );
  assert.equal(r.meds[0].times, "09:00, 19:00");
});
test("Missing medical fields are not invented", () => {
  const m = parse("Пример 10 мг").meds[0];
  assert.equal(m.dose, "");
  assert.equal(m.days, "");
  assert.equal(m.form, "");
  assert.equal(m.times, "");
});
test("Frequency is extracted without choosing clock times", () => {
  const m = parse(
    "Пример 10 мг, таблетки. По 1/2 таблетки 2 раза в день, 2 недели.",
  ).meds[0];
  assert.equal(m.dose, 0.5);
  assert.equal(m.days, 14);
  assert.equal(m.frequency, 2);
  assert.equal(m.times, "");
});
test("Changing doses and durations block the simple plan", () => {
  const m = parse(
    "Пример 5 мг, таблетки. По 1 таблетке 3 дня, затем по 2 таблетки 4 дня.",
  ).meds[0];
  assert.equal(m.complex, true);
  assert.equal(m.dose, "");
  assert.equal(m.days, "");
});
test("As needed and alternating schedules are flagged", () => {
  for (const term of ["по необходимости", "через день", "при боли"])
    assert.equal(
      parse(`Пример 5 мг, таблетки. По 1 таблетке ${term}.`).meds[0].complex,
      true,
    );
});
test("No drug is produced for an unrelated document", () =>
  assert.equal(
    parse("Встреча в 10:00. Подготовить отчёт за 7 дней.").meds.length,
    0,
  ));
test("Intervals are preserved as frequency, not guessed times", () => {
  const m = parse(
    "Пример 5 мг, таблетки. По 1 таблетке каждые 8 часов, 5 дней.",
  ).meds[0];
  assert.equal(m.frequency, 3);
  assert.equal(m.times, "");
});
test("Combination dosage is flagged", () =>
  assert.equal(
    parse("Пример 10/20 мг, таблетки. По 1 таблетке в 08:00, 5 дней.").meds[0]
      .complex,
    true,
  ));
test("OCR unit errors do not merge adjacent drugs or invent units", () => {
  const r = parse(
    "1. Гамма 20 мг, таблетки.\nПо 1 таблетке в 08:00, 3 дня.\n2. Дельта 5 Mr, капсулы.\nПо 1 капсуле в 21:00, 9 дней.",
  );
  assert.equal(r.meds.length, 2);
  assert.equal(r.meds[0].form, "Таблетки");
  assert.equal(r.meds[1].strength, "");
  assert.equal(r.meds[1].days, 9);
});
