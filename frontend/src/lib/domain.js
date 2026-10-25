// Pure read-side rules over the app state: roles, schedule, signals and stock.
import {addDays, diffDays, hm, medKey, mins, uid} from './utils.js';

export const sourceText = {observed: 'наблюдала лично', reported: 'со слов близкого', self: 'отметка родственника'};
export const isClosed = log => ['taken', 'skipped'].includes(log?.status);

export function actor(s) {
  if (s.role === 'senior') return {id: 'senior', name: s.patient.name, role: 'senior', view: true, mark: true, stock: false, alerts: false};
  return s.members.find(m => m.id === s.role) || s.members[0];
}
export const isOwner = s => actor(s).role === 'owner';
export const canMark = s => !!actor(s).mark;
export const canStock = s => !!actor(s).stock;

export function canViewCourse(s, c) {
  const a = actor(s);
  return a.role === 'owner' || a.id === 'senior' || !c.importMethod || c.helper === a.id;
}

// A role that has lost view access falls back to the organiser.
export function normalizeRole(s) {
  if (s.role !== 'senior' && !s.members.some(m => m.id === s.role && m.view)) s.role = 'anna';
}

export const memberName = (s, id, fallback = 'Анна') => s.members.find(m => m.id === id)?.name || fallback;

export function visibleAudit(s) {
  return s.audit.filter(a => {
    const id = a.courseId || a.dose?.split('|')[0];
    const c = s.courses.find(c => c.id === id);
    return !c || canViewCourse(s, c);
  });
}

export function addAudit(s, type, title, detail = '', dose = null) {
  s.audit.unshift({id: uid(), type, title, detail, dose, date: s.day, time: hm(s.clock)});
  s.audit = s.audit.slice(0, 250);
}

export const stockFor = (s, m) => s.stock.find(x => medKey(x) === medKey(m));

export function events(s, date) {
  return s.courses.flatMap(c => {
    const day = diffDays(c.start, date);
    if (!canViewCourse(s, c) || !c.active || day < 0 || day >= c.days) return [];
    return c.meds.filter(m => day < (m.days || c.days)).flatMap(m => m.times.map(t => {
      const id = [c.id, m.id, date, t].join('|');
      return {id, course: c, med: m, date, time: t, log: s.logs[id]};
    }));
  }).sort((a, b) => a.time.localeCompare(b.time));
}

export function eventById(s, id) {
  const [cid, mid, date, time] = (id || '').split('|');
  const c = s.courses.find(c => c.id === cid), m = c?.meds.find(m => m.id === mid);
  return c && canViewCourse(s, c) && m && date && time ? {id, course: c, med: m, date, time, log: s.logs[id]} : null;
}

export const isPast = (s, e) => e.date < s.day || (e.date === s.day && mins(e.time) <= s.clock);
export const delayed = (s, e) => !isClosed(e.log) && e.date === s.day && s.clock - mins(e.time) >= s.settings.grace;

export function signals(s) {
  return events(s, s.day)
    .filter(e => (delayed(s, e) || e.log?.status === 'skipped') && !s.signalState[e.id]?.resolved)
    .map(e => ({...e, signal: s.signalState[e.id] || {}}));
}

export function shopping(s) {
  const needs = new Map();
  for (const c of s.courses.filter(c => c.active)) {
    for (let d = 0; d < c.days; d++) {
      const date = addDays(c.start, d);
      if (date < s.day) continue;
      for (const m of c.meds) {
        if (d >= (m.days || c.days)) continue;
        const end = addDays(c.start, (m.days || c.days) - 1);
        for (const t of m.times) {
          if (isClosed(s.logs[[c.id, m.id, date, t].join('|')])) continue;
          const key = medKey(m);
          if (!needs.has(key)) needs.set(key, {med: m, needed: 0, stock: stockFor(s, m), end});
          const n = needs.get(key);
          n.end = [n.end, end].sort().at(-1);
          n.needed += m.dose;
        }
      }
    }
  }
  return [...needs.values()].map(n => {
    const qty = n.stock?.expiry && n.stock.expiry < n.end ? 0 : n.stock?.qty || 0;
    const missing = Math.max(0, Math.round((n.needed - qty) * 100) / 100), pack = n.stock?.pack || n.med.pack;
    return {...n, qty, missing, pack, packs: pack ? Math.ceil(missing / pack) : null};
  }).filter(n => n.missing > 0);
}
