import { useEffect, useRef, useState } from "react";
import { Button } from "./components";
export function BarcodeScanner({
  onCode,
  onManual,
}: {
  onCode: (code: string) => void;
  onManual: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let disposed = false;
    let controls: { stop: () => void } | undefined;
    let stream: MediaStream | undefined;
    const stop = () => {
      controls?.stop();
      stream?.getTracks().forEach((t) => t.stop());
    };
    const start = async () => {
      try {
        const [
          { BrowserMultiFormatReader },
          { BarcodeFormat, DecodeHintType },
        ] = await Promise.all([
          import("@zxing/browser"),
          import("@zxing/library"),
        ]);
        if (disposed) return;
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (disposed) {
          stop();
          return;
        }
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.ITF,
          BarcodeFormat.CODE_128,
          BarcodeFormat.DATA_MATRIX,
        ]);
        const reader = new BrowserMultiFormatReader(hints);
        controls = await reader.decodeFromStream(
          stream,
          video.current!,
          (result) => {
            if (result && !disposed) {
              disposed = true;
              stop();
              onCode(result.getText());
            }
          },
        );
        if (disposed) stop();
      } catch {
        stop();
        if (!disposed)
          setError(
            "Камера недоступна. Разрешите доступ в браузере или введите цифры с упаковки.",
          );
      }
    };
    if (!navigator.mediaDevices?.getUserMedia)
      setError(
        "Для камеры нужен HTTPS или localhost. Можно ввести код вручную.",
      );
    else void start();
    return () => {
      disposed = true;
      stop();
    };
  }, [onCode]);
  return (
    <div className="barcode-scanner">
      {!error && (
        <>
          <video ref={video} muted playsInline />
          <p>Наведите камеру на штрихкод или Data Matrix на упаковке.</p>
        </>
      )}
      {error && <p role="alert">{error}</p>}
      <Button kind="white" onClick={onManual}>
        Ввести код вручную
      </Button>
    </div>
  );
}
