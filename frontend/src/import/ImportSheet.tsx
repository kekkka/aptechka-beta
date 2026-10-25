import {useCallback, useEffect, useRef, useState} from 'react';
import {useApp} from '../AppContext.ts';
import {actor, isOwner} from '../lib/domain.ts';
import {blankMed, initialStockReview, launchState, newDraft, parseDraft, validateDraft, validateReconciliation} from '../lib/importDraft.ts';
import {demoPrescriptionFile, readPrescription, type ReadProgress} from '../lib/prescriptionReader.ts';
import {persist} from '../lib/store.ts';
import {unitFor} from '../lib/utils.ts';
import type {Draft, StockReview} from '../types.ts';
import {ErrorStep, PasteStep, ReadingStep, StartStep} from './DocumentSteps.tsx';
import {ReconcileStep, SummaryStep} from './StockSteps.tsx';
import {ReviewStep} from './ReviewStep.tsx';

type Step = 'start' | 'reading' | 'error' | 'paste' | 'review' | 'stock' | 'summary';

const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'], MB = 1024 * 1024;

// Prescription → plan wizard: document, text, review, stock, launch.
// Closing the sheet unmounts it and aborts any OCR still running.
export function ImportSheet() {
  const app = useApp(), {state, toast} = app;
  const [step, setStep] = useState<Step>('start');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [progress, setProgress] = useState<ReadProgress | null>(null);
  const [failure, setFailure] = useState('');
  const job = useRef<AbortController | null>(null), launching = useRef(false);

  const stop = useCallback(() => {
    job.current?.abort();
    job.current = null;
  }, []);
  useEffect(() => stop, [stop]);

  if (!isOwner(state)) return null;

  const restart = () => {
    stop();
    setDraft(null);
    setStep('start');
  };

  const readFiles = async (selected: File[], demo = false) => {
    if (!selected.length) return;
    if (selected.length > 6 || selected.some(f => f.size > 10 * MB || !TYPES.includes(f.type)) || selected.reduce((n, f) => n + f.size, 0) > 30 * MB) {
      toast('Выберите до 6 JPG, PNG, WebP или PDF: до 10 МБ на файл и до 30 МБ всего.');
      return;
    }
    stop();
    const controller = new AbortController();
    job.current = controller;
    const helper = state.members.find(m => m.id !== actor(state).id && m.view)?.id || '';
    setDraft(newDraft(state, {demo, source: selected.map(f => f.name).join(', '), helper}));
    setProgress({label: 'Открываем документ', detail: selected[0].name, progress: 0});
    setStep('reading');
    try {
      const result = await readPrescription(selected, {signal: controller.signal, onProgress: p => job.current === controller && setProgress(p)});
      if (job.current !== controller) return;
      job.current = null;
      setDraft(d => parseDraft({...d!, pages: result.pages, text: result.text, ocr: true}));
      setStep('review');
    } catch (e) {
      if (job.current !== controller || (e as Error).name === 'AbortError') return;
      job.current = null;
      setFailure((e as Error).message || 'Попробуйте более чёткое фото или PDF.');
      setStep('error');
    }
  };

  const startPaste = () => {
    stop();
    setDraft(d => d || newDraft(state, {source: 'Текст, введённый пользователем'}));
    setStep('paste');
  };

  const parseText = (text: string) => {
    setDraft(d => parseDraft({...d!, text}));
    setStep('review');
  };

  const editDraft = (patch: Partial<Draft>) => setDraft(d => ({...d!, ...patch}));

  const addMed = () => {
    if (!draft) return;
    if (draft.meds.length >= 8) return toast('В одном курсе до 8 препаратов.');
    editDraft({meds: [...draft.meds, blankMed()], complete: false, stockReview: null});
  };

  const removeMed = (i: number) => {
    if (!draft) return;
    const removed = draft.meds[i], name = removed?.name.trim();
    editDraft({meds: draft.meds.filter((_, j) => j !== i), excluded: name ? [...draft.excluded, name] : draft.excluded, complete: false, stockReview: null});
  };

  // Returns an error message, or moves on to the stock step.
  const submitReview = () => {
    if (!draft) return '';
    const meds = draft.meds.map(m => ({
      ...m, name: m.name.trim(), strength: m.strength.trim(), times: String(m.times).trim(), note: m.note.trim(),
      dose: m.dose === '' ? '' : Number(m.dose), days: m.days === '' ? '' : Number(m.days), unit: unitFor(m.form)
    }));
    const d = {...draft, title: draft.title.trim(), meds}, error = validateDraft(d, state);
    if (error) return error;
    const signature = JSON.stringify([d.start, d.meds]);
    const next: Draft = {...d, reviewSignature: signature, stockReview: draft.reviewSignature === signature ? draft.stockReview : null, days: Math.max(...meds.map(m => Number(m.days)))};
    if (!next.stockReview) next.stockReview = initialStockReview(next, state);
    setDraft(next);
    setStep('stock');
    return '';
  };

  const submitStock = (stockReview: StockReview[]) => {
    const next = {...draft!, stockReview}, error = validateReconciliation(next);
    setDraft(next);
    if (!error) setStep('summary');
    return error;
  };

  const launch = ({helper, access}: {helper: string; access: boolean}) => {
    if (!draft || !access || launching.current) return '';
    const error = validateDraft(draft, state) || validateReconciliation(draft);
    if (error) return error;
    launching.current = true;
    const {next, course} = launchState(state, draft, helper);
    try {
      persist(next);
    } catch {
      launching.current = false;
      return 'Не удалось сохранить план. Освободите место в браузере и повторите. Назначение пока не добавлено.';
    }
    app.replaceState(next);
    app.setSelectedDate(course.start);
    app.navigate('plan');
    app.openSheet('launched', {courseId: course.id});
    return '';
  };

  switch (step) {
    case 'reading':
      return <ReadingStep progress={progress!} onCancel={restart} />;
    case 'error':
      return <ErrorStep message={failure} onPaste={startPaste} onRetry={restart} />;
    case 'paste':
      return <PasteStep text={draft!.text} onBack={restart} onSubmit={parseText} />;
    case 'review':
      return <ReviewStep key={draft!.parseId} draft={draft!} onChange={editDraft} onAddMed={addMed} onRemoveMed={removeMed} onReparse={parseText} onBack={restart} onSubmit={submitReview} />;
    case 'stock':
      return <ReconcileStep draft={draft!} onBack={stockReview => {
        editDraft({stockReview});
        setStep('review');
      }} onSubmit={submitStock} />;
    case 'summary':
      return <SummaryStep draft={draft!} onBack={choice => {
        editDraft(choice);
        setStep('stock');
      }} onLaunch={launch} />;
    default:
      return <StartStep onFiles={readFiles} onDemo={async () => readFiles([await demoPrescriptionFile()], true)} onPaste={startPaste} />;
  }
}
