// Prescription import draft: parsing, validation, stock reconciliation and launch.
import type {AppState, Course, Draft, DraftMed, MedForm, StockReview} from '../types.ts';
import {parse} from './prescriptionParser.ts';
import {actor, isClosed, stockFor} from './domain.ts';
import {addDays, dateObj, hm, isoDate, medKey, uid, unitFor} from './utils.ts';

export const blankMed = (): DraftMed => ({id: uid(), name: '', strength: '', form: '', dose: '', times: '', days: '', note: '', pack: '', checked: false, sourceText: '', warnings: [], complex: false});

export function newDraft(s: AppState, {demo = false, source, helper = ''}: {demo?: boolean; source: string; helper?: string}): Draft {
  return {title: demo ? 'Учебный курс' : 'Новое назначение', start: s.day, source, demo, meds: [], pages: [], text: '', excluded: [], helper, access: false, parseId: 0};
}

export function parseDraft(draft: Draft): Draft {
  const parsed = parse(draft.text), meds = parsed.meds.map(m => ({...blankMed(), ...m}));
  return {
    ...draft, meds: meds.length ? meds : [blankMed()], parseWarnings: parsed.warnings, parseId: (draft.parseId || 0) + 1,
    excluded: [], stockReview: null, complete: false, simple: false, access: false
  };
}

export const splitTimes = (times: string) => times.split(',').map(t => t.trim());

type ReviewedMed = Pick<DraftMed, 'name' | 'strength' | 'form' | 'dose' | 'days' | 'times' | 'checked' | 'complex' | 'frequency' | 'unit'>;

export function validateDraft(d: {title: string; start: string; meds: ReviewedMed[]; complete?: boolean; simple?: boolean} | null, s: AppState) {
  if (!d || !d.meds.length) return 'Добавьте хотя бы один препарат.';
  if (!d.title || !isoDate(d.start) || Number.isNaN(dateObj(d.start).getTime()) || d.start < s.day) return 'Проверьте название и дату начала: сегодня или позже.';
  const keys = new Set<string>();
  for (const [i, m] of d.meds.entries()) {
    if (m.complex) return `Препарат ${i + 1}: сложная схема не поддерживается. Уточните её и исключите эту строку из автоматического плана.`;
    const times = splitTimes(m.times);
    if (!m.name || !m.strength || !['Таблетки', 'Капсулы'].includes(m.form) || !m.checked || typeof m.dose !== 'number' || !Number.isFinite(m.dose) || m.dose < .25 || m.dose > 100 || m.dose * 4 % 1 || typeof m.days !== 'number' || !Number.isInteger(m.days) || m.days < 1 || m.days > 90 || times.length > 8 || times.some(t => !/^([01]\d|2[0-3]):[0-5]\d$/.test(t)) || new Set(times).size !== times.length) return `Проверьте препарат ${i + 1}: все обязательные поля, 1–90 дней и до 8 разных времён в формате 09:00.`;
    if (m.frequency && m.frequency !== times.length) return `${m.name}: в тексте ${m.frequency} приёма в день, а времён указано ${times.length}. Исправьте время или ошибку в исходном распознанном тексте.`;
    const key = medKey({...m, unit: unitFor(m.form)}), days = m.days;
    if (keys.has(key)) return `${m.name} повторяется. Объедините время приёма в одной строке.`;
    keys.add(key);
    if (s.courses.some(c => c.active && c.meds.some(x => medKey(x) === key && c.start <= addDays(d.start, days - 1) && addDays(c.start, (x.days || c.days) - 1) >= d.start))) return `${m.name} уже есть в пересекающемся курсе. Проверьте актуальное назначение, чтобы не дублировать приёмы.`;
  }
  if (!d.complete || !d.simple) return 'Подтвердите сверку всех строк и поддерживаемый тип схемы.';
  return '';
}

export const initialStockReview = (d: Draft, s: AppState): StockReview[] => d.meds.map(m => {
  const st = stockFor(s, {...m, unit: m.unit ?? ''});
  return {qty: st?.qty || 0, pack: st?.pack || null, expiry: st?.expiry || '', checked: false};
});

export function validateReconciliation(d: {stockReview?: StockReview[] | null}) {
  for (const [i, st] of d.stockReview!.entries()) {
    if (!st.checked || !Number.isFinite(st.qty) || st.qty < 0 || st.qty > 100000 || st.qty * 4 % 1 || (st.pack !== null && (!Number.isInteger(st.pack) || st.pack < 1 || st.pack > 1000)) || (st.qty > 0 && (!isoDate(st.expiry) || Number.isNaN(dateObj(st.expiry).getTime())))) return `Проверьте остаток, упаковку и срок у препарата ${i + 1}.`;
  }
  return '';
}

// Only called on a validated draft, where dose and days are numbers.
export const courseNeed = (m: DraftMed) => Number(m.dose) * splitTimes(m.times).length * Number(m.days);

export function draftNeeds(d: Draft, s: AppState) {
  return d.meds.map((m, i) => {
    const st = d.stockReview![i], end = addDays(d.start, Number(m.days) - 1), usable = st.expiry && st.expiry >= end ? st.qty : 0, needed = courseNeed(m);
    const key = medKey({...m, unit: m.unit ?? ''});
    let reserved = 0;
    for (const c of s.courses.filter(c => c.active)) {
      for (let day = 0; day < c.days; day++) {
        const date = addDays(c.start, day);
        if (date < s.day) continue;
        for (const other of c.meds) {
          if (day >= (other.days || c.days) || medKey(other) !== key) continue;
          for (const t of other.times) if (!isClosed(s.logs[[c.id, other.id, date, t].join('|')])) reserved += other.dose;
        }
      }
    }
    const missing = Math.max(0, needed + reserved - usable);
    return {med: m, stock: st, needed, reserved, usable, missing, packs: st.pack ? Math.ceil(missing / st.pack) : null};
  });
}

// Returns the next app state with the verified course and reconciled stock.
export function launchState(s: AppState, d: Draft, helper: string) {
  const review = d.stockReview!;
  const c: Course = {
    id: uid(), title: d.title, start: d.start, days: d.days!, active: true, demo: d.demo, source: d.source,
    importMethod: d.ocr ? 'local-ocr' : 'text', verifiedBy: actor(s).name, helper, excluded: [...d.excluded],
    meds: d.meds.map((m, i) => ({id: m.id, name: m.name, strength: m.strength, form: m.form as MedForm, unit: m.unit!, dose: Number(m.dose), days: Number(m.days), times: splitTimes(m.times).sort(), note: m.note, pack: review[i].pack, color: ['', 'sand', 'lilac'][i % 3]}))
  };
  const next = structuredClone(s);
  c.meds.forEach((m, i) => {
    const existing = next.stock.find(x => medKey(x) === medKey(m));
    const {checked, ...stock} = review[i];
    const value = {name: m.name, strength: m.strength, form: m.form, unit: m.unit, ...stock, verifiedAt: s.day};
    if (existing) Object.assign(existing, value);
    else next.stock.push({id: uid(), ...value});
  });
  next.courses.push(c);
  next.audit.unshift({id: uid(), type: 'course', courseId: c.id, title: actor(s).name + ' проверила назначение и запустила план', detail: c.title + ' · ' + c.meds.length + ' препарата · аптечка сверена', date: s.day, time: hm(s.clock)});
  return {next, course: c};
}
