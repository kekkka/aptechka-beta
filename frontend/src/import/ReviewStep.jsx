import {useEffect, useRef, useState} from 'react';
import {useApp} from '../AppContext.jsx';
import {Icon} from '../components/Icon.jsx';
import {Sheet} from '../components/Sheet.jsx';
import {CheckRow, Field} from '../components/ui.jsx';
import {plural} from '../lib/utils.js';
import {FlowSteps} from './DocumentSteps.jsx';

// Shows a validation message and brings it into view.
export function FlowError({id, message}) {
  const ref = useRef(null);
  useEffect(() => {
    if (message) ref.current?.scrollIntoView({block: 'nearest'});
  }, [message]);
  return <div className="error" id={id} role="alert" ref={ref}>{message}</div>;
}

function DocumentPreview({draft, onReparse}) {
  const {toast} = useApp(), [text, setText] = useState(draft.text);
  const reparse = () => {
    const t = text.trim();
    if (!t) return toast('Добавьте текст назначения.');
    onReparse(t);
  };
  return (
    <details className="document space">
      <summary><Icon name="file" /> Оригинал и распознанный текст</summary>
      <div className="source-pages">
        {draft.pages.map((p, i) => (
          <details key={i} open={i === 0}>
            <summary>Страница {i + 1} · {p.method}{p.confidence !== null && ` · ${Math.round(p.confidence)}% OCR`}</summary>
            <img src={p.preview} alt={`Страница ${i + 1} исходного назначения`} />
          </details>
        ))}
      </div>
      <label className="field">
        <span>Извлечённый текст · можно исправить</span>
        <textarea id="ocrText" rows={9} maxLength={30000} value={text} onChange={e => setText(e.target.value)}></textarea>
      </label>
      <button className="btn btn-soft btn-full" type="button" onClick={reparse}>Разобрать исправленный текст</button>
      <p className="caption">Повторный разбор заменит поля ниже. Процент OCR относится к чтению символов, а не к правильности схемы.</p>
    </details>
  );
}

function ReviewMed({m, i, onField, onChecked, onRemove}) {
  const bind = key => ({name: `${key}_${i}`, value: m[key] ?? '', onChange: e => onField(i, key, e.target.value)});
  return (
    <section className="review-med">
      <div className="between">
        <span className="label gray">Препарат {i + 1}</span>
        <button className="ghost" type="button" onClick={() => onRemove(i)} aria-label={`Исключить препарат ${i + 1}`}><Icon name="trash" /></button>
      </div>
      {m.sourceText && <blockquote className="source-fragment">{m.sourceText}</blockquote>}
      {m.complex && <div className="hint orange">В строке сложная или неоднозначная схема. Она не поддерживается автоматическим планом. Уточните назначение у врача; эту строку можно исключить из плана.</div>}
      {m.warnings?.length > 0 && <p className="field-warning">{m.warnings.join(' · ')}</p>}
      <Field label="Точное название" {...bind('name')} required maxLength={100} />
      <div className="field-grid">
        <Field label="Дозировка препарата" {...bind('strength')} required maxLength={50} placeholder="Не определена" />
        <label className="field">
          <span>Форма</span>
          <select {...bind('form')} required>
            <option value="">Проверьте</option><option>Таблетки</option><option>Капсулы</option>
          </select>
        </label>
        <Field label="Штук за приём" type="number" {...bind('dose')} required min={0.25} max={100} step={0.25} placeholder="Не определено" />
        <Field label="Длительность, дней" type="number" {...bind('days')} required min={1} max={90} step={1} placeholder="Не определена" />
      </div>
      <Field label="Время через запятую" {...bind('times')} required placeholder="Например: 09:00, 19:00" />
      {m.frequency && <p className="caption">В тексте: {m.frequency} приёма в день. Проверьте соответствие времени.</p>}
      <Field label="Указания из документа" {...bind('note')} maxLength={160} placeholder="Если указаны в назначении" />
      <CheckRow name={`checked_${i}`} checked={m.checked} onChange={e => onChecked(i, e.target.checked)} required>Сверено с назначением</CheckRow>
    </section>
  );
}

export function ReviewStep({draft: d, onChange, onAddMed, onRemoveMed, onReparse, onBack, onSubmit}) {
  const [error, setError] = useState('');
  const found = d.meds.filter(m => m.name).length, low = d.pages.some(p => p.confidence !== null && p.confidence < 75);
  // Any edit to the content invalidates that drug's check and the final confirmation.
  const setField = (i, key, value) => onChange({complete: false, meds: d.meds.map((m, j) => j === i ? {...m, [key]: value, checked: false} : m)});
  const setChecked = (i, checked) => onChange({meds: d.meds.map((m, j) => j === i ? {...m, checked} : m)});
  const submit = e => {
    e.preventDefault();
    setError(onSubmit());
  };
  return (
    <Sheet
      title="Проверьте назначение"
      subtitle="Сверьте каждое поле с документом врача."
      footer={<>
        <button className="btn btn-white" onClick={onBack}>Назад</button>
        <button className="btn btn-primary" type="submit" form="reviewForm">Сверить аптечку <Icon name="arrow" /></button>
      </>}
    >
      <FlowSteps active={3} />
      <div className="recognition-result">
        <span className="med-icon"><Icon name="check" /></span>
        <div>
          <h3>{d.ocr ? 'Текст распознан' : 'Текст разобран'}</h3>
          <p>{d.pages.length ? `${d.pages.length} стр. · ` : ''}{found} {plural(found, ['препарат найден', 'препарата найдено', 'препаратов найдено'])}</p>
        </div>
        <span className="label orange">Нужна сверка</span>
      </div>
      {low && <div className="hint orange space">Качество текста невысокое. Сравните оригинал и результат; при необходимости загрузите более чёткое фото.</div>}
      {d.parseWarnings?.length > 0 && <div className="hint orange space">{d.parseWarnings.join(' ')}</div>}
      <DocumentPreview draft={d} onReparse={onReparse} />
      <form id="reviewForm" onSubmit={submit}>
        <Field label="Название курса" name="title" value={d.title} onChange={e => onChange({title: e.target.value, complete: false})} required maxLength={80} />
        <Field label="Дата начала по назначению" name="start" type="date" value={d.start} onChange={e => onChange({start: e.target.value, complete: false})} required />
        <p className="caption">Для каждого препарата своя длительность. Если время не указано, согласуйте расписание; приложение его не подбирает.</p>
        {d.meds.map((m, i) => <ReviewMed key={m.id} m={m} i={i} onField={setField} onChecked={setChecked} onRemove={onRemoveMed} />)}
        <button className="text-link" type="button" onClick={onAddMed}><Icon name="plus" /> Добавить препарат</button>
        {d.excluded?.length > 0 && <div className="hint orange space">Исключены из плана: {d.excluded.join(', ')}. Они не появятся в расписании.</div>}
        <CheckRow id="schemeSimple" checked={!!d.simple} onChange={e => onChange({simple: e.target.checked})} required>У включённых препаратов постоянная ежедневная схема, без изменения дозы и перерывов.</CheckRow>
        <CheckRow id="finalConsent" checked={!!d.complete} onChange={e => onChange({complete: e.target.checked})} required>Проверены все строки документа: название, форма, дозы, время и сроки. Исключения учтены отдельно.</CheckRow>
        <FlowError id="reviewError" message={error} />
      </form>
    </Sheet>
  );
}
