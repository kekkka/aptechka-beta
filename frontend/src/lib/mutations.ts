// Write-side transitions. Each one mutates a cloned state passed in by `commit`
// and returns false (or {error}) when the change is not allowed.
import type {AppState, MarkSource, MedForm, Permission, StockItem} from '../types.ts';
import {actor, addAudit, canMark, canStock, eventById, isClosed, isOwner, isPast, shopping, sourceText, stockFor} from './domain.ts';
import {hm, isoDate, medKey, round2, uid, unitFor} from './utils.ts';

export function take(s: AppState, id: string, source: MarkSource, note = '') {
  const e = eventById(s, id);
  if (!e || !canMark(s) || !isPast(s, e) || isClosed(s.logs[id])) return false;
  const st = stockFor(s, e.med), consumed = st && (!st.expiry || st.expiry >= s.day) ? Math.min(st.qty, e.med.dose) : 0;
  if (st) st.qty = round2(st.qty - consumed);
  const a = actor(s);
  s.logs[id] = {status: 'taken', actor: a.id, actorName: a.name, source, note, time: hm(s.clock), consumed, stockId: st?.id || null};
  s.signalState[id] = {...(s.signalState[id] || {}), resolved: true};
  addAudit(s, 'taken', a.name + ' отметила приём', e.med.name + ' · ' + sourceText[source] + (note ? ' · ' + note : ''), id);
  return {short: consumed < e.med.dose};
}

export function undo(s: AppState, id: string) {
  const l = s.logs[id];
  if (!l || !canMark(s) || (!isOwner(s) && l.actor !== actor(s).id)) return false;
  const st = s.stock.find(x => x.id === l.stockId);
  if (st && l.status === 'taken') st.qty = round2(st.qty + (l.consumed || 0));
  delete s.logs[id];
  s.signalState[id] = {};
  addAudit(s, 'undo', actor(s).name + ' исправила отметку', eventById(s, id)?.med.name + ' · предыдущая отметка отменена', id);
}

export function skip(s: AppState, id: string, reason: string, note: string) {
  const e = eventById(s, id);
  if (!e || !canMark(s) || !isPast(s, e) || isClosed(e.log)) return false;
  const a = actor(s);
  s.logs[id] = {status: 'skipped', actor: a.id, actorName: a.name, time: hm(s.clock), note: reason + (note ? ' · ' + note : ''), consumed: 0};
  s.signalState[id] = {};
  addAudit(s, 'skipped', a.name + ' отметила пропуск', e.med.name + ' · ' + reason, id);
}

export function claim(s: AppState, id: string) {
  const e = eventById(s, id);
  if (actor(s).role === 'senior' || !e) return false;
  s.signalState[id] = {...(s.signalState[id] || {}), owner: actor(s).name};
  addAudit(s, 'claim', actor(s).name + ' проверяет приём', e.med.name + ' · ' + e.time, id);
}

export function request(s: AppState, id: string) {
  const e = eventById(s, id);
  if (!e) return false;
  s.signalState[id] = {...(s.signalState[id] || {}), requested: hm(s.clock)};
  addAudit(s, 'request', 'Создан демо-запрос для сиделки', e.med.name + ' · запросить уточнение приёма', id);
}

export function snooze(s: AppState, id: string, minutes: number) {
  const e = eventById(s, id);
  if (!e || !canMark(s) || isClosed(e.log) || ![15, 30].includes(minutes)) return false;
  const until = Math.min(1439, s.clock + minutes);
  s.logs[id] = {status: 'snoozed', snoozedUntil: until};
  s.signalState[id] = {...(s.signalState[id] || {}), snoozedUntil: until};
  addAudit(s, 'snooze', actor(s).name + ' отложила напоминание', e.med.name + ' · до ' + hm(until), id);
  return {until};
}

export function resolve(s: AppState, id: string) {
  if (actor(s).role === 'senior' || s.logs[id]?.status !== 'skipped') return false;
  s.signalState[id] = {...(s.signalState[id] || {}), resolved: true, owner: actor(s).name};
  addAudit(s, 'resolve', actor(s).name + ' проверила пропуск', eventById(s, id)?.med.name + ' · ситуация обработана, пропуск остаётся в журнале', id);
}

export function setRole(s: AppState, id: string) {
  if (id !== 'senior' && !s.members.some(m => m.id === id && m.view)) return false;
  s.role = id;
}

export function setPermission(s: AppState, memberId: string, key: Permission, checked: boolean) {
  const m = s.members.find(m => m.id === memberId);
  if (!isOwner(s) || !m || m.role === 'owner') return false;
  m[key] = checked;
  if (!m.view) Object.assign(m, {mark: false, stock: false, alerts: false});
  addAudit(s, 'permission', actor(s).name + ' изменила доступ', m.name + ' · ' + (m.view ? 'права обновлены' : 'доступ отозван'));
}

export function invite(s: AppState, {name, role, basis, consent}: {name: string; role: string; basis: string; consent: boolean}) {
  if (!isOwner(s) || !name || !consent || !basis || (role !== 'family' && role !== 'caregiver')) return false;
  s.members.push({id: uid(), name, relation: role === 'caregiver' ? 'Сиделка' : 'Родственник', role, view: true, mark: false, stock: false, alerts: true, basis});
  addAudit(s, 'invite', actor(s).name + ' добавила участника', name + ' · демо-доступ только для просмотра');
}

export function saveSignalSettings(s: AppState, {grace, backup}: {grace: number; backup: string}) {
  if (!isOwner(s) || ![15, 30, 60].includes(grace) || !s.members.some(m => m.id === backup && m.view)) return false;
  s.settings.grace = grace;
  s.settings.backup = backup;
}

export function savePatient(s: AppState, {name, city, short, age}: {name: string; city: string; short: string; age: number}) {
  if (!isOwner(s) || !name || !city || !short || !Number.isInteger(age) || age < 18 || age > 120) return false;
  s.patient = {name, city, short, age};
}

export interface StockValues {
  name: string;
  strength: string;
  form: MedForm;
  qty: number;
  pack: number;
  expiry: string;
}

export function saveStock(s: AppState, id: string | undefined, values: StockValues) {
  if (!canStock(s)) return false;
  const old = s.stock.find(x => x.id === id), form = old?.form || values.form;
  const item: StockItem = {
    id: old?.id || uid(), name: old?.name || values.name, strength: old?.strength || values.strength, form,
    qty: values.qty, pack: values.pack, expiry: values.expiry, unit: unitFor(form)
  };
  if (!item.name || !item.strength || !Number.isFinite(item.qty) || item.qty < 0 || item.qty > 100000 || item.qty * 4 % 1 || !Number.isInteger(item.pack) || values.pack < 1 || values.pack > 1000) return {error: 'Проверьте остаток и упаковку.'};
  if (item.qty > 0 && !isoDate(item.expiry)) return {error: 'Укажите срок годности запаса.'};
  if (s.stock.some(x => x.id !== item.id && medKey(item) === medKey(x))) return {error: 'Этот препарат уже есть в аптечке. Измените его остаток.'};
  if (old) Object.assign(old, item);
  else s.stock.push(item);
  addAudit(s, 'stock', actor(s).name + ' обновила аптечку', item.name + ' · остаток ' + item.qty + ' ' + item.unit);
}

export function buy(s: AppState, key: string, {packs, pack, expiry}: {packs: number; pack: number; expiry: string}) {
  if (!canStock(s)) return false;
  const n = shopping(s).find(n => medKey(n.med) === key);
  if (!n || !Number.isInteger(packs) || packs < 1 || packs > 1000 || !Number.isInteger(pack) || pack < 1 || pack > 1000 || !isoDate(expiry) || expiry < s.day) return {error: 'Проверьте количество, упаковку и срок годности.'};
  if (n.stock && n.stock.qty > 0 && n.stock.expiry && expiry > n.stock.expiry) return {error: 'У остатка дома более ранний срок. Укажите минимальный срок либо сначала скорректируйте остаток в аптечке.'};
  let st = n.stock;
  if (!st) {
    st = {id: uid(), name: n.med.name, strength: n.med.strength, form: n.med.form, unit: n.med.unit, qty: 0};
    s.stock.push(st);
  }
  st.qty += packs * pack;
  st.pack = pack;
  st.expiry = expiry;
  addAudit(s, 'stock', actor(s).name + ' пополнила запас', st.name + ' · ' + packs + ' уп.');
}

export function endCourse(s: AppState, id: string) {
  const c = s.courses.find(c => c.id === id);
  if (!isOwner(s) || !c) return false;
  c.active = false;
  addAudit(s, 'course', actor(s).name + ' завершила курс', c.title);
}

export function advanceClock(s: AppState, minutes: number) {
  if (![30, 60].includes(minutes)) return false;
  s.clock = Math.min(1439, s.clock + minutes);
}
