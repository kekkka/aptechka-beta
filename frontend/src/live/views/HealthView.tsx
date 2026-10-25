import {useState} from 'react';
import type {Reading, Threshold, VitalType} from '../../api/index.ts';
import {Icon} from '../../components/Icon.tsx';
import {Empty, Hint} from '../../components/ui.tsx';
import {dateTime, num, value} from '../format.ts';
import {useLoad} from '../hooks.ts';
import {useLive} from '../LiveContext.ts';
import {ThresholdSheet} from '../sheets/ThresholdSheet.tsx';
import {VITALS, VitalSheet} from '../sheets/VitalSheet.tsx';
import {Head, Loading} from '../ui.tsx';

// Health diary: manual readings now; connected devices will write into the same diary later.
export function HealthView() {
  const {api, patientId, patient, can, version, openSheet} = useLive();
  const [type, setType] = useState<VitalType>('BLOOD_PRESSURE');
  const readings = useLoad(() => api.care.vitals(patientId, undefined, 30), [patientId, version]);
  const thresholds = useLoad(() => api.care.thresholds(patientId), [patientId, version]);
  const all = readings.data ?? [], ofType = all.filter(r => r.type === type), t = thresholds.data?.find(x => x.type === type);
  const latest = (v: VitalType) => all.find(r => r.type === v);

  return <>
    <Head title="Здоровье" subtitle={`Дневник показателей · ${patient.name} · 30 дней`}
      action={can('RECORD_VITALS') && <button className="icon-btn" onClick={() => openSheet(<VitalSheet />)} aria-label="Записать показатели"><Icon name="plus" /></button>} />
    <Loading error={readings.error || thresholds.error} loading={readings.loading && !readings.data} onRetry={() => { readings.reload(); thresholds.reload(); }} />
    <div className="live-chips" role="tablist">
      {VITALS.map(v => {
        const r = latest(v.type);
        return (
          <button key={v.type} role="tab" aria-selected={type === v.type} className={'live-chip' + (type === v.type ? ' active' : '') + (r?.outOfRange ? ' warn' : '')} onClick={() => setType(v.type)}>
            <span>{v.label}</span><strong>{r ? value(r) : '—'}</strong>
          </button>
        );
      })}
    </div>
    <section className="card padded space">
      <div className="between">
        <h2>{VITALS.find(v => v.type === type)!.label}</h2>
        {t && can('MANAGE') && <button className="text-link" onClick={() => openSheet(<ThresholdSheet t={t} />)}>Пороги</button>}
      </div>
      {t && <p className="caption">{limitsText(t)}{t.custom ? ' · заданы вручную' : ' · по умолчанию, уточните у врача'}</p>}
      {ofType.length ? <Chart readings={ofType} t={t} /> : <Empty title="Измерений пока нет">{can('RECORD_VITALS') ? 'Запишите первое измерение кнопкой «+».' : ''}</Empty>}
    </section>
    {ofType.length > 0 && (
      <div className="card space">
        {ofType.map(r => (
          <div className="list-item" key={r.id}>
            <div className="grow">
              <h3>{value(r)} <small>{r.unit}</small></h3>
              <p>{dateTime(r.measuredAt)}{r.recordedByName ? ' · ' + r.recordedByName : ''}{r.note ? ' · ' + r.note : ''}</p>
            </div>
            {r.outOfRange && <span className="label red">Вне нормы</span>}
          </div>
        ))}
      </div>
    )}
    {can('RECORD_VITALS') && <button className="btn btn-primary btn-full space" onClick={() => openSheet(<VitalSheet fixed={type} />)}><Icon name="plus" /> Записать: {VITALS.find(v => v.type === type)!.label.toLowerCase()}</button>}
    <Hint tone="gray" icon="watch" className="space">Тонометры, глюкометры и браслеты подключим следующим этапом: они будут писать в этот же дневник.</Hint>
  </>;
}

function limitsText(t: Threshold) {
  const range = (a: number | null, b: number | null) => a != null && b != null ? `${num(a)}–${num(b)}` : a != null ? `от ${num(a)}` : b != null ? `до ${num(b)}` : 'без ограничений';
  return t.twoValues ? `Норма: ${range(t.min1, t.max1)} / ${range(t.min2, t.max2)} ${t.unit}` : `Норма: ${range(t.min1, t.max1)} ${t.unit}`;
}

// Small dependency-free line chart: oldest on the left, dashed lines for the limits.
function Chart({readings, t}: {readings: Reading[]; t?: Threshold}) {
  const pts = [...readings].reverse(), W = 320, H = 140, P = 18;
  const values = pts.flatMap(r => r.value2 == null ? [r.value1] : [r.value1, r.value2]);
  const limits = t ? [t.min1, t.max1, ...(t.twoValues ? [t.min2, t.max2] : [])].filter((x): x is number => x != null) : [];
  const lo = Math.min(...values, ...limits), hi = Math.max(...values, ...limits), span = hi - lo || 1;
  const x = (i: number) => pts.length === 1 ? W / 2 : P + i * (W - 2 * P) / (pts.length - 1);
  const y = (v: number) => H - P - (v - lo) / span * (H - 2 * P);
  const line = (get: (r: Reading) => number | null) => pts.map((r, i) => get(r) == null ? '' : `${x(i)},${y(get(r)!)}`).filter(Boolean).join(' ');
  return (
    <svg className="live-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`График: ${pts.length} измерений`}>
      {limits.map((l, i) => (
        <g key={i}>
          <line x1={P} x2={W - P} y1={y(l)} y2={y(l)} className="limit" />
          {/* Skip a label that would sit on top of a previous one. */}
          {!limits.slice(0, i).some(o => Math.abs(y(o) - y(l)) < 10) && <text x={W - P} y={y(l) - 3} textAnchor="end">{num(l)}</text>}
        </g>
      ))}
      <polyline points={line(r => r.value1)} className="series" />
      {pts.some(r => r.value2 != null) && <polyline points={line(r => r.value2)} className="series second" />}
      {pts.map((r, i) => <circle key={r.id} cx={x(i)} cy={y(r.value1)} r={3.5} className={r.outOfRange ? 'out' : ''} />)}
    </svg>
  );
}
