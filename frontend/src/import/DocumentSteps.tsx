import {useState, type ChangeEvent, type FormEvent, type KeyboardEvent} from 'react';
import {useApp} from '../AppContext.ts';
import {Icon} from '../components/Icon.tsx';
import {Sheet} from '../components/Sheet.tsx';
import {Hint, Portrait} from '../components/ui.tsx';
import type {ReadProgress} from '../lib/prescriptionReader.ts';

const STEPS = ['Документ', 'Текст', 'Проверка', 'Аптечка', 'План'];

export function FlowSteps({active}: {active: number}) {
  return (
    <ol className="import-steps" aria-label="Этапы назначения">
      {STEPS.map((s, i) => (
        <li key={s} className={i + 1 === active ? 'current' : i + 1 < active ? 'complete' : ''}><span>{i + 1 < active ? '✓' : i + 1}</span>{s}</li>
      ))}
    </ol>
  );
}

// Keyboard activation for the label-wrapped file inputs.
function pressInput(e: KeyboardEvent<HTMLLabelElement>) {
  if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) {
    e.preventDefault();
    e.currentTarget.querySelector('input')!.click();
  }
}

export function StartStep({onFiles, onDemo, onPaste}: {onFiles: (files: File[]) => void; onDemo: () => void; onPaste: () => void}) {
  const {state} = useApp(), pick = (e: ChangeEvent<HTMLInputElement>) => onFiles([...e.target.files ?? []]);
  return (
    <Sheet title="Из назначения — в план" subtitle="Загрузите документ. Мы поможем разобрать его по шагам.">
      <FlowSteps active={1} />
      <div className="import-patient">
        <Portrait />
        <div>
          <span className="caption">Назначение для</span>
          <h3>{state.patient.name}</h3>
          <p>{state.patient.short} · {state.patient.age} года</p>
        </div>
      </div>
      <label className="scan-zone" tabIndex={0} role="button" aria-label="Выбрать фото или PDF" onKeyDown={pressInput}>
        <span className="scan-symbol"><Icon name="file" /><Icon name="search" /></span>
        <strong>Добавьте назначение врача</strong>
        <span>Фото, скан или PDF</span>
        <input className="hidden" id="prescriptionFiles" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple onChange={pick} />
        <span className="btn btn-primary"><Icon name="upload" /> Выбрать документ</span>
      </label>
      <label className="camera-choice" tabIndex={0} role="button" aria-label="Сфотографировать назначение" onKeyDown={pressInput}>
        <Icon name="camera" /> Сфотографировать назначение
        <input className="hidden" id="prescriptionCamera" type="file" accept="image/*" capture="environment" onChange={pick} />
      </label>
      <div className="import-privacy"><Icon name="shield" /><span>Распознавание на вашем устройстве.<br />Документ не отправляется на сервер.</span></div>
      <p className="caption">Печатный текст на русском и английском. До 6 файлов по 10 МБ, суммарно до 10 страниц. Рукописный текст может не распознаться.</p>
      <div className="demo-choice">
        <span className="label">Попробовать</span>
        <h3>Нет документа под рукой?</h3>
        <p>Распознайте учебное фото с двумя вымышленными препаратами.</p>
        <button className="btn btn-soft btn-full" onClick={onDemo}>Распознать пример <Icon name="arrow" /></button>
      </div>
      <button className="text-link space" onClick={onPaste}><Icon name="edit" /> Вставить текст назначения</button>
    </Sheet>
  );
}

export function ReadingStep({progress, onCancel}: {progress: ReadProgress; onCancel: () => void}) {
  return (
    <Sheet
      title="Читаем назначение"
      subtitle="Обычно это занимает несколько секунд. Большие сканы обрабатываются дольше."
      footer={<button className="btn btn-white" onClick={onCancel}>Отменить</button>}
    >
      <FlowSteps active={2} />
      <div className="ocr-progress">
        <span className="scan-symbol scanning"><Icon name="file" /></span>
        <h3>{progress.label}</h3>
        <p>{progress.detail}</p>
        <progress max="1" value={progress.progress} aria-label="Ход распознавания"></progress>
        <span aria-live="polite">{progress.progress ? Math.round(progress.progress * 100) + '%' : 'Подготовка'}</span>
      </div>
      <div className="import-privacy"><Icon name="shield" /><span>Обработка происходит в этой вкладке.<br />Дождитесь результата, прежде чем закрывать её.</span></div>
    </Sheet>
  );
}

export function ErrorStep({message, onPaste, onRetry}: {message: string; onPaste: () => void; onRetry: () => void}) {
  return (
    <Sheet
      title="Не удалось прочитать документ"
      subtitle="Назначение пока не добавлено."
      footer={<>
        <button className="btn btn-white" onClick={onPaste}>Вставить текст</button>
        <button className="btn btn-primary" onClick={onRetry}>Повторить</button>
      </>}
    >
      <FlowSteps active={2} />
      <Hint tone="orange" icon="info">{message}</Hint>
      <p className="caption">Можно повторить загрузку или вставить текст вручную. Курс создаётся только после вашей проверки.</p>
    </Sheet>
  );
}

export function PasteStep({text, onBack, onSubmit}: {text: string; onBack: () => void; onSubmit: (text: string) => void}) {
  const [value, setValue] = useState(text);
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(value.trim());
  };
  return (
    <Sheet
      title="Текст назначения"
      subtitle="Вставьте текст из документа врача."
      footer={<>
        <button className="btn btn-white" onClick={onBack}>Назад</button>
        <button className="btn btn-primary" form="pasteForm" type="submit">Разобрать текст <Icon name="arrow" /></button>
      </>}
    >
      <FlowSteps active={2} />
      <form id="pasteForm" onSubmit={submit}>
        <label className="field">
          <span>Назначение целиком</span>
          <textarea name="text" required minLength={10} maxLength={30000} rows={12} placeholder="Название, дозировка, форма. По …, в …, … дней." value={value} onChange={e => setValue(e.target.value)}></textarea>
        </label>
        <p className="caption">Текст будет разобран на поля. Пропуски нужно заполнить по оригиналу.</p>
      </form>
    </Sheet>
  );
}
