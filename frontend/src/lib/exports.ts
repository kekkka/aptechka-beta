import type {AppState} from '../types.ts';
import {shopping} from './domain.ts';
import {download, fmt} from './utils.ts';

export function exportShopping(s: AppState) {
  const items = shopping(s).map(n => `${n.med.name} ${n.med.strength}, ${n.med.form}\nНужно ${n.needed} ${n.med.unit}, дома ${n.qty}, не хватает ${n.missing}.\n${n.packs ? 'Докупить ' + n.packs + ' уп. по ' + n.pack + ' ' + n.med.unit : 'Докупить ' + n.missing + ' ' + n.med.unit + '. Размер упаковки уточните.'}`);
  download('aptechka-shopping.txt', 'АПТЕЧКА — СПИСОК ПОКУПОК\n' + s.patient.name + ' · ' + fmt(s.day) + '\n\n' + (items.join('\n\n') || 'Запасов хватает.') + '\n\nУчебные препараты вымышлены. Не является медицинским назначением.');
}

export function exportHistory(s: AppState) {
  download('aptechka-care-journal.json', JSON.stringify({demo: true, patient: s.patient, note: 'Записи людей, без независимого подтверждения приема', logs: s.logs, audit: s.audit}, null, 2), 'application/json;charset=utf-8');
}
