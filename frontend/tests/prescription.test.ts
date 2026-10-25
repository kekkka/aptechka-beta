import assert from 'node:assert/strict';
import {parse} from '../src/lib/prescriptionParser.ts';
import {events, shopping} from '../src/lib/domain.ts';
import {blankMed, validateDraft, validateReconciliation} from '../src/lib/importDraft.ts';
import {seed} from '../src/lib/store.ts';
import {addDays} from '../src/lib/utils.ts';
import type {StockReview} from '../src/types.ts';

let checks = 0;
const test = (name: string, fn: () => void) => {
  fn();
  checks++;
  console.log('PASS ' + name);
};

test('Two drugs preserve independent durations and explicit times', () => {
  const r = parse('1. Учебный Альфа 10 мг, таблетки.\nПо 1 таблетке в 09:00 и 19:00, после еды, 7 дней.\n2. Учебный Бета 5 мг, капсулы.\nПо 1 капсуле в 14:00, 5 дней.');
  assert.equal(r.meds.length, 2);
  assert.deepEqual(r.meds.map(m => m.days), [7, 5]);
  assert.equal(r.meds[0].times, '09:00, 19:00');
});
test('Missing medical fields are not invented', () => {
  const m = parse('Пример 10 мг').meds[0];
  assert.equal(m.dose, '');
  assert.equal(m.days, '');
  assert.equal(m.form, '');
  assert.equal(m.times, '');
});
test('Frequency is extracted without choosing clock times', () => {
  const m = parse('Пример 10 мг, таблетки. По 1/2 таблетки 2 раза в день, 2 недели.').meds[0];
  assert.equal(m.dose, .5);
  assert.equal(m.days, 14);
  assert.equal(m.frequency, 2);
  assert.equal(m.times, '');
});
test('Changing doses and durations block the simple plan', () => {
  const m = parse('Пример 5 мг, таблетки. По 1 таблетке 3 дня, затем по 2 таблетки 4 дня.').meds[0];
  assert.equal(m.complex, true);
  assert.equal(m.dose, '');
  assert.equal(m.days, '');
});
test('As needed and alternating schedules are flagged', () => {
  for (const term of ['по необходимости', 'через день', 'при боли']) assert.equal(parse(`Пример 5 мг, таблетки. По 1 таблетке ${term}.`).meds[0].complex, true);
});
test('No drug is produced for an unrelated document', () => assert.equal(parse('Встреча в 10:00. Подготовить отчёт за 7 дней.').meds.length, 0));
test('Intervals are preserved as frequency, not guessed times', () => {
  const m = parse('Пример 5 мг, таблетки. По 1 таблетке каждые 8 часов, 5 дней.').meds[0];
  assert.equal(m.frequency, 3);
  assert.equal(m.times, '');
});
test('Combination dosage is flagged', () => assert.equal(parse('Пример 10/20 мг, таблетки. По 1 таблетке в 08:00, 5 дней.').meds[0].complex, true));
test('OCR unit errors do not merge adjacent drugs or invent units', () => {
  const r = parse('1. Гамма 20 мг, таблетки.\nПо 1 таблетке в 08:00, 3 дня.\n2. Дельта 5 Mr, капсулы.\nПо 1 капсуле в 21:00, 9 дней.');
  assert.equal(r.meds.length, 2);
  assert.equal(r.meds[0].form, 'Таблетки');
  assert.equal(r.meds[1].strength, '');
  assert.equal(r.meds[1].days, 9);
});

const state = seed();
state.courses = [{id: 't', title: 'Тест', active: true, start: state.day, days: 7, meds: [
  {id: 'a', name: 'A', strength: '5 мг', form: 'Таблетки', unit: 'табл.', dose: 1, days: 5, times: ['09:00'], pack: null, note: '', color: ''},
  {id: 'b', name: 'B', strength: '5 мг', form: 'Таблетки', unit: 'табл.', dose: 1, days: 7, times: ['19:00'], pack: 10, note: '', color: ''}
], source: 'Тест'}];
state.logs = {};
state.stock = [];
const need = (id: string) => shopping(state).find(n => n.med.id === id)!;

test('Calendar stops each drug at its own end date', () => {
  assert.equal(events(state, addDays(state.day, 4)).length, 2);
  assert.equal(events(state, addDays(state.day, 5)).length, 1);
  assert.equal(events(state, addDays(state.day, 7)).length, 0);
});
test('Shopping counts individual durations and unknown packs safely', () => {
  assert.equal(need('a').needed, 5);
  assert.equal(need('a').packs, null);
});
test('Stock expiring before course end is excluded', () => {
  state.stock = [{id: 's', name: 'A', strength: '5 мг', form: 'Таблетки', unit: 'табл.', qty: 10, pack: 10, expiry: addDays(state.day, 1)}];
  assert.equal(need('a').qty, 0);
  state.stock[0].expiry = addDays(state.day, 20);
  assert.equal(shopping(state).some(n => n.med.id === 'a'), false);
});
test('Same name with different strength cannot consume matching stock', () => {
  state.stock[0].strength = '10 мг';
  assert.equal(need('a').qty, 0);
});
test('Imported plan is visible only to selected helper in demo roles', () => {
  Object.assign(state.courses[0], {importMethod: 'local-ocr', helper: 'elena'});
  state.role = 'max';
  assert.equal(events(state, state.day).length, 0);
  state.role = 'elena';
  assert.equal(events(state, state.day).length, 2);
  state.role = 'anna';
});

const draft = {title: 'Test', start: state.day, complete: true, simple: true, stockReview: [] as StockReview[], meds: [{...blankMed(), name: 'A', strength: '5 мг', form: 'Таблетки' as const, unit: 'табл.', dose: 1, days: 3, times: '09:00', checked: true, complex: false}]};
test('Draft cannot bypass verification, complex schedule or overlap', () => {
  assert.match(validateDraft(draft, state), /пересекающемся/);
  Object.assign(draft.meds[0], {name: 'New', checked: false});
  assert.match(validateDraft(draft, state), /Проверьте/);
  Object.assign(draft.meds[0], {checked: true, complex: true});
  assert.match(validateDraft(draft, state), /сложная/);
});
test('Missing expiration blocks reconciliation when stock exists', () => {
  draft.stockReview = [{qty: 3, pack: null, expiry: '', checked: true}];
  assert.notEqual(validateReconciliation(draft), '');
});

console.log(`${checks} checks passed`);
