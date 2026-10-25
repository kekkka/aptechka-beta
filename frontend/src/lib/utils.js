export const uid = () => globalThis.crypto?.randomUUID?.() || 'id' + Date.now() + Math.random().toString(36).slice(2);

export function iso(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export const dateObj = s => new Date(s + 'T12:00:00');
export function addDays(s, n) {
  const d = dateObj(s);
  d.setDate(d.getDate() + n);
  return iso(d);
}
export const diffDays = (a, b) => Math.round((dateObj(b) - dateObj(a)) / 86400000);
export const fmt = (s, opts = {day: 'numeric', month: 'long'}) => dateObj(s).toLocaleDateString('ru-RU', opts);
export const hm = n => String(Math.floor(n / 60) % 24).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0');
export const mins = s => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
export const plural = (n, forms) => forms[n % 100 >= 11 && n % 100 <= 14 ? 2 : n % 10 === 1 ? 0 : n % 10 >= 2 && n % 10 <= 4 ? 1 : 2];
export const round2 = n => Math.round(n * 100) / 100;
export const isoDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s);
export const norm = s => String(s).trim().toLowerCase().replace(/\s+/g, ' ');
export const medKey = m => [m.name, m.strength, m.form, m.unit].map(norm).join('|');
export const unitFor = form => form === 'Капсулы' ? 'капс.' : 'табл.';

export function download(name, text, type = 'text/plain;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], {type})), a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
