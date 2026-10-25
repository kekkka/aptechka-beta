import type {CareRole, Dose, DoseStatus, Reading} from '../api/index.ts';

export const ROLE_LABEL: Record<CareRole, string> = {
  OWNER: 'Организатор ухода',
  CAREGIVER: 'Сиделка',
  FAMILY: 'Родственник',
  PATIENT: 'Подопечный'
};

export const ROLE_RIGHTS: Record<CareRole, string> = {
  OWNER: 'Всё: назначения, аптечка, круг заботы, пороги показателей.',
  CAREGIVER: 'Отмечает приёмы, ведёт аптечку и дневник здоровья, реагирует на сигналы.',
  FAMILY: 'Видит план, здоровье и сигналы, может откликнуться на просьбу о помощи.',
  PATIENT: 'Облегчённый экран: свои приёмы, кнопка «Мне плохо», самочувствие и давление.'
};

export const STATUS_LABEL: Record<DoseStatus, string> = {TAKEN: 'Принято', SKIPPED: 'Пропуск', PLANNED: 'По плану', DUE: 'Пора принять', OVERDUE: 'Нет отметки'};
export const STATUS_CLASS: Record<DoseStatus, string> = {TAKEN: '', SKIPPED: 'red', PLANNED: 'gray', DUE: 'orange', OVERDUE: 'red'};

export const num = (n: number | null | undefined) => n == null ? '' : String(Number(n.toFixed(2)));
export const value = (r: Pick<Reading, 'value1' | 'value2'>) => r.value2 == null ? num(r.value1) : `${num(r.value1)}/${num(r.value2)}`;
export const doseText = (d: Pick<Dose, 'dose' | 'unit'>) => `${num(d.dose)} ${d.unit}`;

export const dateTime = (iso: string) => new Date(iso).toLocaleString('ru-RU', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'});
export const shortDate = (iso: string) => new Date(iso.length === 10 ? iso + 'T12:00:00' : iso).toLocaleDateString('ru-RU', {day: 'numeric', month: 'long'});
