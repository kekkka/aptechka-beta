import {useRef, useState} from 'react';
import type {CourseMedInput} from '../../api/index.ts';
import {Icon} from '../../components/Icon.tsx';
import {Sheet} from '../../components/Sheet.tsx';
import {Field, Hint} from '../../components/ui.tsx';
import {parse} from '../../lib/prescriptionParser.ts';
import {readPrescription, type ReadProgress} from '../../lib/prescriptionReader.ts';
import {iso, unitFor} from '../../lib/utils.ts';
import type {MedForm} from '../../types.ts';
import {errorText, useAction} from '../hooks.ts';
import {useLive} from '../LiveContext.ts';

interface Row {
  name: string;
  strength: string;
  form: string;
  dose: string;
  times: string;
  days: string;
  note: string;
  warning: string;
}

const blank = (): Row => ({name: '', strength: '', form: 'Таблетки', dose: '1', times: '', days: '', note: '', warning: ''});
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

function toInput(r: Row): CourseMedInput | string {
  const times = r.times.split(/[,\s]+/).filter(Boolean).map(t => t.length === 4 ? '0' + t : t);
  if (!r.name.trim() || !r.strength.trim()) return 'Укажите название и дозировку каждого препарата';
  if (!times.length || times.some(t => !TIME.test(t))) return `${r.name}: время приёма в формате 08:00, 20:00`;
  const dose = Number(r.dose.replace(',', '.')), days = Number(r.days);
  if (!(dose > 0)) return `${r.name}: укажите, сколько ${unitFor(r.form as MedForm)} за приём`;
  if (!Number.isInteger(days) || days < 1 || days > 90) return `${r.name}: длительность от 1 до 90 дней`;
  return {name: r.name.trim(), strength: r.strength.trim(), form: r.form, unit: unitFor(r.form as MedForm), dose, times, days, note: r.note.trim() || undefined};
}

// New course: typed by hand or prefilled from a photo/PDF (OCR on the device,
// the document itself never leaves the browser). Every row is checked before saving.
export function CourseSheet() {
  const {api, patientId, closeSheet, refresh, toast} = useLive(), {busy, act} = useAction(toast);
  const [title, setTitle] = useState('Назначение врача');
  const [start, setStart] = useState(iso());
  const [rows, setRows] = useState<Row[]>([blank()]);
  const [text, setText] = useState('');
  const [progress, setProgress] = useState<ReadProgress | null>(null);
  const [error, setError] = useState('');
  const abort = useRef<AbortController | null>(null);

  const set = (i: number, patch: Partial<Row>) => setRows(rows.map((r, j) => j === i ? {...r, ...patch} : r));
  const fromText = (t: string) => {
    const parsed = parse(t);
    if (!parsed.meds.length) {
      setError('Не нашли препаратов в тексте. Заполните строки вручную.');
      return;
    }
    setError('');
    setRows(parsed.meds.map(m => ({
      name: m.name, strength: m.strength, form: m.form || 'Таблетки', dose: m.dose === '' ? '' : String(m.dose), times: m.times,
      days: m.days === '' ? '' : String(m.days), note: m.note,
      warning: [m.complex ? 'Сложная схема: проверьте и упростите вручную' : '', ...m.warnings].filter(Boolean).join('. ')
    })));
  };
  const readFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    abort.current = new AbortController();
    try {
      const r = await readPrescription([...files], {signal: abort.current.signal, onProgress: setProgress});
      setText(r.text);
      fromText(r.text);
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setError(errorText(e));
    } finally {
      setProgress(null);
    }
  };
  const save = () => {
    const meds = rows.map(toInput), bad = meds.find(m => typeof m === 'string');
    if (bad) {
      setError(bad as string);
      return;
    }
    act(() => api.care.createCourse(patientId, {title: title.trim() || 'Назначение врача', startDate: start, meds: meds as CourseMedInput[], source: text ? 'Распознано из документа' : 'Введено вручную'}),
      'План запущен: приёмы появились в расписании').then(r => {
      if (!r) return;
      closeSheet();
      refresh();
    });
  };

  return (
    <Sheet title="Новое назначение" subtitle="Проверьте каждую строку с оригиналом назначения." onClose={() => { abort.current?.abort(); closeSheet(); }}
      footer={<><button className="btn btn-white" onClick={closeSheet}>Отмена</button><button className="btn btn-primary" disabled={busy || !!progress} onClick={save}>Запустить план</button></>}>
      <div className="live-actions">
        <label className="btn btn-soft btn-small"><Icon name="camera" /> Фото или PDF
          <input className="hidden" type="file" accept="image/*,application/pdf" multiple onChange={e => readFiles(e.target.files)} />
        </label>
      </div>
      {progress && <Hint icon="clock">{progress.label}: {progress.detail} <button className="text-link" onClick={() => abort.current?.abort()}>Остановить</button></Hint>}
      <details className="space">
        <summary>Вставить текст назначения</summary>
        <label className="field"><span>Текст</span><textarea value={text} onChange={e => setText(e.target.value)} rows={5} placeholder="Эналаприл 10 мг по 1 таблетке 2 раза в день, 10 дней" /></label>
        <button className="btn btn-white btn-small" onClick={() => fromText(text)}>Разобрать текст</button>
      </details>
      <div className="field-grid space">
        <Field label="Название курса" value={title} onChange={e => setTitle(e.target.value)} maxLength={200} />
        <Field label="Начало" type="date" value={start} onChange={e => setStart(e.target.value)} />
      </div>
      {rows.map((r, i) => (
        <section className="review-med" key={i}>
          <div className="between"><h3>Препарат {i + 1}</h3>{rows.length > 1 && <button className="text-link" onClick={() => setRows(rows.filter((_, j) => j !== i))}>Убрать</button>}</div>
          {r.warning && <Hint tone="orange" icon="alert">{r.warning}</Hint>}
          <div className="field-grid">
            <Field label="Название" value={r.name} onChange={e => set(i, {name: e.target.value})} maxLength={100} />
            <Field label="Дозировка" value={r.strength} onChange={e => set(i, {strength: e.target.value})} maxLength={50} placeholder="10 мг" />
            <label className="field"><span>Форма</span>
              <select value={r.form} onChange={e => set(i, {form: e.target.value})}><option>Таблетки</option><option>Капсулы</option></select>
            </label>
            <Field label="За приём, шт." inputMode="decimal" value={r.dose} onChange={e => set(i, {dose: e.target.value})} />
            <Field label="Время приёма" value={r.times} onChange={e => set(i, {times: e.target.value})} placeholder="08:00, 20:00" />
            <Field label="Дней" type="number" min={1} max={90} value={r.days} onChange={e => set(i, {days: e.target.value})} />
          </div>
          <Field label="Как принимать" value={r.note} onChange={e => set(i, {note: e.target.value})} maxLength={200} placeholder="после еды" />
        </section>
      ))}
      <button className="btn btn-white btn-full" onClick={() => setRows([...rows, blank()])}><Icon name="plus" /> Ещё препарат</button>
      {error && <div className="error space" role="alert">{error}</div>}
      <p className="caption">Принимаются только постоянные ежедневные схемы до 90 дней. Распознавание может ошибаться — сверяйтесь с оригиналом.</p>
    </Sheet>
  );
}
