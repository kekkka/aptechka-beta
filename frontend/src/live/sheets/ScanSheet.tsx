import {useEffect, useRef, useState, type FormEvent} from 'react';
import type {ScanResult} from '../../api/index.ts';
import {Icon} from '../../components/Icon.tsx';
import {Sheet} from '../../components/Sheet.tsx';
import {Field, Hint} from '../../components/ui.tsx';
import {shortDate} from '../format.ts';
import {errorText} from '../hooks.ts';
import {useLive} from '../LiveContext.ts';
import {StockSheet} from './StockSheet.tsx';

// Barcode Detection API (Chrome on Android, Safari 17+ behind support checks); not in TS's DOM lib yet.
interface DetectedBarcode {
  rawValue: string;
}
interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}
type BarcodeDetectorCtor = new (opts: {formats: string[]}) => BarcodeDetectorLike;
const Detector = (globalThis as {BarcodeDetector?: BarcodeDetectorCtor}).BarcodeDetector;

const SOURCE_TEXT: Record<ScanResult['source'], string> = {
  STOCK: 'Эта упаковка уже есть в аптечке — добавим к остатку.',
  CATALOG: 'Нашли препарат в справочнике.',
  NONE: 'Штрихкод пока неизвестен. Заполните данные один раз — дальше упаковка распознается сама.'
};

export function ScanSheet() {
  const {api, patientId, closeSheet, openSheet} = useLive();
  const video = useRef<HTMLVideoElement>(null);
  const [camera, setCamera] = useState<'off' | 'on' | 'unsupported' | 'denied'>(Detector ? 'off' : 'unsupported');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const found = useRef(false);

  const lookup = async (code: string) => {
    setBusy(true);
    setError('');
    try {
      const r = await api.care.scan(patientId, code);
      const s = r.suggestion;
      openSheet(<StockSheet prefill={{
        name: s?.name, strength: s?.strength, form: s?.form, unit: s?.unit, packSize: s?.packSize, qty: s?.packSize ?? undefined,
        expiry: r.expiry, gtin: r.gtin,
        note: SOURCE_TEXT[r.source] + (r.expiry ? ` Срок годности из кода: ${shortDate(r.expiry)}.` : '')
      }} />);
    } catch (e) {
      found.current = false;
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (camera !== 'on' || !Detector) return;
    let stream: MediaStream | null = null, timer = 0, stopped = false;
    const detector = new Detector({formats: ['ean_13', 'ean_8', 'upc_a', 'data_matrix', 'code_128', 'qr_code']});
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({video: {facingMode: 'environment'}});
        if (stopped || !video.current) return;
        video.current.srcObject = stream;
        await video.current.play();
        const tick = async () => {
          if (stopped || found.current || !video.current) return;
          const codes = await detector.detect(video.current).catch(() => []);
          if (codes[0]?.rawValue && !found.current) {
            found.current = true;
            lookup(codes[0].rawValue);
          }
          timer = window.setTimeout(tick, 250);
        };
        tick();
      } catch {
        setCamera('denied');
      }
    })();
    return () => {
      stopped = true;
      clearTimeout(timer);
      stream?.getTracks().forEach(t => t.stop());
    };
    // lookup only uses stable values from context.
  }, [camera]);

  const manual = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const code = String(new FormData(e.currentTarget).get('code')).trim();
    if (code) lookup(code);
  };

  return (
    <Sheet title="Сканировать упаковку" subtitle="Наведите камеру на штрихкод или квадратный код DataMatrix." onClose={closeSheet}>
      {camera === 'on' && <video ref={video} className="live-video" muted playsInline aria-label="Камера" />}
      {camera === 'off' && <button className="btn btn-primary btn-full" onClick={() => setCamera('on')}><Icon name="camera" /> Включить камеру</button>}
      {camera === 'unsupported' && <Hint tone="gray" icon="info">Этот браузер не умеет читать штрихкоды камерой. Введите цифры под штрихкодом.</Hint>}
      {camera === 'denied' && <Hint tone="orange" icon="alert">Нет доступа к камере. Разрешите его в настройках браузера или введите код вручную.</Hint>}
      {busy && <p className="caption">Ищем препарат…</p>}
      {error && <div className="error space" role="alert">{error}</div>}
      <form className="space" onSubmit={manual}>
        <Field label="Код вручную" name="code" inputMode="numeric" placeholder="4601234567893" maxLength={300} />
        <button className="btn btn-white btn-full" disabled={busy}>Найти</button>
      </form>
      <button className="text-link space" onClick={() => openSheet(<StockSheet />)}>Добавить без штрихкода</button>
    </Sheet>
  );
}
