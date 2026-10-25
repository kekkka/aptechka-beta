// All people, medications and events in the seed are fictional.
import {addDays, iso} from './utils.js';

export const KEY = 'aptechka_family_mobile_v1';

export function seed(day = iso()) {
  return {
    version: 1, day, clock: 825, role: 'anna',
    patient: {name: 'Нина Петровна', short: 'Мама', age: 74, city: 'Тверь'},
    members: [
      {id: 'anna', name: 'Анна', relation: 'Дочь', role: 'owner', view: true, mark: true, stock: true, alerts: true},
      {id: 'elena', name: 'Елена', relation: 'Сиделка', role: 'caregiver', view: true, mark: true, stock: false, alerts: true},
      {id: 'max', name: 'Максим', relation: 'Внук', role: 'family', view: true, mark: false, stock: false, alerts: true}
    ],
    courses: [{
      id: 'course1', title: 'После выписки', start: addDays(day, -3), days: 14, active: true, demo: true, source: 'Учебная выписка',
      meds: [
        {id: 'a', name: 'Препарат А', strength: '10 мг', form: 'Таблетки', unit: 'табл.', dose: 1, times: ['08:00', '20:00'], note: 'После еды', pack: 20, color: ''},
        {id: 'b', name: 'Препарат Б', strength: '5 мг', form: 'Таблетки', unit: 'табл.', dose: 1, times: ['13:00'], note: 'Во время еды', pack: 14, color: 'sand'},
        {id: 'c', name: 'Препарат В', strength: '20 мг', form: 'Капсулы', unit: 'капс.', dose: 1, times: ['08:30'], note: 'По учебному назначению', pack: 30, color: 'lilac'}
      ]
    }],
    stock: [
      {id: 'sa', name: 'Препарат А', strength: '10 мг', form: 'Таблетки', unit: 'табл.', qty: 8, pack: 20},
      {id: 'sb', name: 'Препарат Б', strength: '5 мг', form: 'Таблетки', unit: 'табл.', qty: 5, pack: 14},
      {id: 'sc', name: 'Препарат В', strength: '20 мг', form: 'Капсулы', unit: 'капс.', qty: 16, pack: 30}
    ],
    logs: {
      [`course1|a|${day}|08:00`]: {status: 'taken', actor: 'elena', actorName: 'Елена', source: 'observed', time: '08:03', consumed: 1, stockId: 'sa', note: 'Помогла с утренним приёмом.'},
      [`course1|c|${day}|08:30`]: {status: 'taken', actor: 'elena', actorName: 'Елена', source: 'reported', time: '08:35', consumed: 1, stockId: 'sc', note: 'Нина Петровна сообщила о приёме.'}
    },
    signalState: {},
    settings: {grace: 30, backup: 'anna', notifications: true},
    audit: [
      {id: 'seed2', type: 'taken', dose: `course1|c|${day}|08:30`, title: 'Елена отметила приём', detail: 'Препарат В · со слов близкого', date: day, time: '08:35'},
      {id: 'seed1', type: 'taken', dose: `course1|a|${day}|08:00`, title: 'Елена отметила приём', detail: 'Препарат А · наблюдала лично', date: day, time: '08:03'}
    ]
  };
}

export function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s?.version === 1) return s;
  } catch {}
  return seed();
}

// Throws when storage is unavailable or full; callers decide how to report it.
export function persist(s) {
  localStorage.setItem(KEY, JSON.stringify(s));
}
