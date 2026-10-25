import type {FormEvent} from 'react';
import type {Threshold} from '../../api/index.ts';
import {Sheet} from '../../components/Sheet.tsx';
import {Field, Hint} from '../../components/ui.tsx';
import {useAction} from '../hooks.ts';
import {useLive} from '../LiveContext.ts';

export function ThresholdSheet({t}: {t: Threshold}) {
  const {api, patientId, closeSheet, refresh, toast} = useLive(), {busy, act} = useAction(toast);
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget), n = (k: string) => {
      const v = String(f.get(k) ?? '').replace(',', '.');
      return v ? Number(v) : null;
    };
    act(() => api.care.setThreshold(patientId, t.type, {min1: n('min1'), max1: n('max1'), min2: n('min2'), max2: n('max2')}), 'Пороги сохранены')
      .then(r => { if (r) { closeSheet(); refresh(); } });
  };
  const reset = () => act(() => api.care.resetThreshold(patientId, t.type), 'Вернули пороги по умолчанию').then(() => { closeSheet(); refresh(); });
  return (
    <Sheet title={`Пороги: ${t.label}`} subtitle={t.unit} onClose={closeSheet}
      footer={<><button className="btn btn-white" onClick={closeSheet}>Отмена</button><button className="btn btn-primary" form="thresholdForm" disabled={busy}>Сохранить</button></>}>
      <Hint icon="info">Установите значения, которые назвал врач. Выход за них даёт сигнал семье. Пустое поле — без ограничения.</Hint>
      <form id="thresholdForm" className="space" onSubmit={submit}>
        <div className="field-grid">
          <Field label={t.twoValues ? 'Верхнее: от' : 'От'} name="min1" type="number" step="0.1" defaultValue={t.min1 ?? ''} />
          <Field label="до" name="max1" type="number" step="0.1" defaultValue={t.max1 ?? ''} />
          {t.twoValues && <>
            <Field label="Нижнее: от" name="min2" type="number" step="0.1" defaultValue={t.min2 ?? ''} />
            <Field label="до" name="max2" type="number" step="0.1" defaultValue={t.max2 ?? ''} />
          </>}
        </div>
      </form>
      {t.custom && <button className="text-link" disabled={busy} onClick={reset}>Вернуть значения по умолчанию</button>}
    </Sheet>
  );
}
