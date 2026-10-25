// On-device reading of prescription photos and PDFs (PDF.js text layer, Tesseract OCR fallback).
// Vendor bundles are served as static files from public/vendor.
import type {ReadPage} from '../types.ts';

// Minimal typings for the parts of the vendored Tesseract.js and PDF.js builds we use.
interface TesseractWorker {
  setParameters(params: Record<string, string>): Promise<unknown>;
  recognize(image: HTMLCanvasElement): Promise<{data: {text: string; confidence: number}}>;
  terminate(): Promise<unknown>;
}
declare global {
  interface Window {
    Tesseract: {
      createWorker(langs: string[], oem: number, options: Record<string, unknown> & {logger: (m: {status: string; progress: number}) => void}): Promise<TesseractWorker>;
    };
  }
}
interface PdfViewport {
  width: number;
  height: number;
}
interface PdfPage {
  getTextContent(): Promise<{items: ({str: string; transform: number[]; hasEOL: boolean} | object)[]}>;
  getViewport(opts: {scale: number}): PdfViewport;
  render(opts: {canvasContext: CanvasRenderingContext2D; viewport: PdfViewport}): {promise: Promise<void>};
  cleanup(): void;
}
interface PdfDocument {
  numPages: number;
  getPage(n: number): Promise<PdfPage>;
  destroy(): Promise<void>;
}
interface PdfJs {
  GlobalWorkerOptions: {workerSrc: string};
  getDocument(opts: Record<string, unknown>): {promise: Promise<PdfDocument>; onPassword: () => void; destroy(): Promise<void>};
}

export interface ReadProgress {
  label: string;
  detail: string;
  progress: number;
}
const base = new URL(import.meta.env.BASE_URL, document.baseURI);
const asset = (path: string) => new URL(path, base).href;

let loader: Promise<void> | null = null;
function loadOCR() {
  return loader ||= new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = asset('vendor/tesseract/tesseract.min.js');
    s.onload = () => resolve();
    s.onerror = () => {
      loader = null;
      reject(new Error('Не удалось загрузить модуль распознавания. Проверьте соединение и повторите.'));
    };
    document.head.append(s);
  });
}

function check(signal: AbortSignal) {
  if (signal.aborted) throw new DOMException('Остановлено', 'AbortError');
}

function thumbnail(canvas: HTMLCanvasElement) {
  const small = document.createElement('canvas'), scale = Math.min(1, 1000 / canvas.width);
  small.width = Math.round(canvas.width * scale);
  small.height = Math.round(canvas.height * scale);
  small.getContext('2d')!.drawImage(canvas, 0, 0, small.width, small.height);
  return small.toDataURL('image/jpeg', .82);
}

export async function readPrescription(files: File[], {signal, onProgress}: {signal: AbortSignal; onProgress: (p: ReadProgress) => void}) {
  let worker: TesseractWorker | undefined, pdf: PdfDocument | null = null, currentLabel = '', pageCount = 0;
  const pages: ReadPage[] = [];
  const cancel = () => {
    worker?.terminate();
    pdf?.destroy();
  };
  signal.addEventListener('abort', cancel, {once: true});

  async function recognize(canvas: HTMLCanvasElement, label: string) {
    check(signal);
    currentLabel = label;
    if (!worker) {
      onProgress({label: 'Подготавливаем распознавание', detail: 'Русский и английский текст · первый запуск может занять больше времени', progress: 0});
      await loadOCR();
      check(signal);
      worker = await window.Tesseract.createWorker(['rus', 'eng'], 1, {
        workerPath: asset('vendor/tesseract/worker.min.js'), corePath: asset('vendor/tesseract/core/'), langPath: asset('vendor/tesseract/lang'), workerBlobURL: false,
        logger: m => {
          if (!signal.aborted) onProgress({label: m.status === 'recognizing text' ? 'Распознаём текст' : 'Подготавливаем распознавание', detail: currentLabel, progress: m.status === 'recognizing text' ? m.progress : 0});
        }
      });
      check(signal);
      await worker.setParameters({tessedit_pageseg_mode: '3', preserve_interword_spaces: '1'});
    }
    onProgress({label: 'Распознаём текст', detail: label, progress: 0});
    const {data} = await worker!.recognize(canvas);
    check(signal);
    return {text: data.text, confidence: data.confidence, method: 'OCR'};
  }

  try {
    for (const file of files) {
      check(signal);
      onProgress({label: 'Открываем документ', detail: file.name, progress: 0});
      if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
        const lib: PdfJs = await import(/* @vite-ignore */ asset('vendor/pdfjs/build/pdf.mjs'));
        lib.GlobalWorkerOptions.workerSrc = asset('vendor/pdfjs/build/pdf.worker.mjs');
        const task = lib.getDocument({data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false, cMapUrl: asset('vendor/pdfjs/cmaps/'), cMapPacked: true, standardFontDataUrl: asset('vendor/pdfjs/standard_fonts/')});
        task.onPassword = () => task.destroy();
        const doc = pdf = await task.promise;
        check(signal);
        if (pageCount + doc.numPages > 10) throw new Error('В одном назначении можно обработать до 10 страниц. Разделите документ.');
        for (let p = 1; p <= doc.numPages; p++) {
          check(signal);
          const page = await pdf.getPage(p), content = await page.getTextContent();
          let text = '', y: number | null = null;
          for (const item of content.items) {
            if (!('str' in item)) continue;
            const nextY = item.transform[5];
            if (y !== null && Math.abs(y - nextY) > 3) text += '\n';
            else if (text && !text.endsWith('\n')) text += ' ';
            text += item.str;
            if (item.hasEOL) text += '\n';
            y = nextY;
          }
          const viewport0 = page.getViewport({scale: 1}), scale = Math.min(2.5, 2200 / Math.max(viewport0.width, viewport0.height));
          const viewport = page.getViewport({scale}), canvas = document.createElement('canvas');
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          await page.render({canvasContext: canvas.getContext('2d')!, viewport}).promise;
          check(signal);
          const result = text.replace(/\s/g, '').length >= 25 ? {text, confidence: null, method: 'Текст PDF'} : await recognize(canvas, `${file.name} · страница ${p} из ${doc.numPages}`);
          pages.push({...result, fileName: file.name, page: p, preview: thumbnail(canvas)});
          pageCount++;
          canvas.width = canvas.height = 1;
          page.cleanup();
        }
        await doc.destroy();
        pdf = null;
      } else {
        if (++pageCount > 10) throw new Error('Можно обработать до 10 страниц за один раз.');
        let bitmap;
        try {
          bitmap = await createImageBitmap(file);
        } catch {
          throw new Error('Не удалось прочитать изображение. Сохраните фото в JPG, PNG или WebP.');
        }
        const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height)), canvas = document.createElement('canvas');
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close();
        const result = await recognize(canvas, `${file.name} · страница ${pageCount}`);
        pages.push({...result, fileName: file.name, page: 1, preview: thumbnail(canvas)});
        canvas.width = canvas.height = 1;
      }
    }
    check(signal);
    return {pages, text: pages.map(p => p.text.trim()).join('\n\n')};
  } catch (e) {
    if (signal.aborted) throw new DOMException('Остановлено', 'AbortError');
    if (e instanceof Error && /password|passwordexception/i.test(e.name + ' ' + e.message)) throw new Error('PDF защищён паролем. Загрузите копию без пароля или фотографию страниц.');
    throw e;
  } finally {
    signal.removeEventListener('abort', cancel);
    await worker?.terminate();
    await pdf?.destroy();
  }
}

// Renders a fictional printed prescription so the demo runs through real OCR.
export async function demoPrescriptionFile() {
  const c = document.createElement('canvas');
  c.width = 1500;
  c.height = 1100;
  const x = c.getContext('2d')!;
  x.fillStyle = '#fff';
  x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = '#182b3a';
  x.font = 'bold 42px Arial';
  x.fillText('УЧЕБНОЕ НАЗНАЧЕНИЕ', 90, 100);
  x.font = '28px Arial';
  x.fillText('Вымышленные препараты. Не является назначением врача.', 90, 160);
  const lines = ['1. Учебный Альфа 10 мг, таблетки.', 'По 1 таблетке в 09:00 и 19:00, после еды, 7 дней.', '', '2. Учебный Бета 5 мг, капсулы.', 'По 1 капсуле в 14:00, во время еды, 5 дней.'];
  x.font = '34px Arial';
  lines.forEach((l, i) => x.fillText(l, 90, 300 + i * 78));
  const blob = await new Promise<Blob>(r => c.toBlob(b => r(b!), 'image/png'));
  return new File([blob], 'Учебное назначение.png', {type: 'image/png'});
}
