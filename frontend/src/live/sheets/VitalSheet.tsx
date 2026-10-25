import {useState, type FormEvent} from 'react';
import type {VitalType} from '../../api/index.ts';
import {Sheet} from '../../components/Sheet.tsx';
import {Field} from '../../components/ui.tsx';
import {useAction} from '../hooks.ts';
import {useLive} from '../LiveContext.ts';

export const VITALS: {type: VitalType; label: string; unit: string; two?: boolean; step?: string; hint?: string}[] = [
  {type: 'BLOOD_PRESSURE', label: 'Давление', unit: 'мм рт. ст.', two: true},
  {type: 'PULSE', label: 'Пульс', unit: 'уд/мин'},
  {type: 'GLUCOSE', label: 'Сахар', unit: 'ммоль/л', step: '0.1'},
  {type: 'TEMPERATURE', label: 'Температура', unit: '°C', step: '0.1'},
  {type: 'SPO2', label: 'Сатурация', unit: '%'},
  {type: 'WEIGHT', label: 'Вес', unit: 'кг', step: '0.1'},
  {type: 'WELLBEING', label: 'Самочувствие', unit: 'из 5', hint: '1 — очень плохо, 5 — хорошо'}
];

export function VitalSheet({fixed}: {fixed?: VitalType}) {
  const {api, patientId, closeSheet, refresh, toast} = useLive(), {busy, act} = useAction(toast);
  const [type, setType] = useState<VitalType>(fixed ?? 'BLOOD_PRESSURE');
  const meta = VITALS.find(v => v.type === type)!;
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget), n = (k: string) => Number(String(f.get(k)).replace(',', '.'));
    act(() => api.care.recordVital(patientId, {type, value1: n('value1'), value2: meta.two ? n('value2') : null, note: String(f.get('note') ?? '').trim() || undefined}))
      .then(r => {
        if (!r) return;
        toast(r.outOfRange ? `${r.label} вне нормы — семья увидит сигнал` : 'Записано в дневник');
        closeSheet();
        refresh();
      });
  };
  return (
    <Sheet title={fixed ? meta.label : 'Записать показатели'} subtitle={meta.hint ?? meta.unit} onClose={closeSheet}
      footer={<><button className="btn btn-white" onClick={closeSheet}>Отмена</button><button className="btn btn-primary" form="vitalForm" disabled={busy}>Записать</button></>}>
      <form id="vitalForm" onSubmit={submit} key={type}>
        {!fixed && (
          <label className="field"><span>Показатель</span>
            <select value={type} onChange={e => setType(e.target.value as VitalType)}>{VITALS.map(v => <option key={v.type} value={v.type}>{v.label}</option>)}</select>
          </label>
        )}
        <div className={meta.two ? 'field-grid' : ''}>
          <Field label={meta.two ? 'Верхнее' : `Значение, ${meta.unit}`} name="value1" type="number" step={meta.step ?? '1'} required autoFocus
            min={type === 'WELLBEING' ? 1 : undefined} max={type === 'WELLBEING' ? 5 : undefined} />
          {meta.two && <Field label="Нижнее" name="value2" type="number" step="1" required />}
        </div>
        <Field label="Комментарий" name="note" maxLength={200} placeholder="после сна, до еды…" />
      </form>
    </Sheet>
  );
}
