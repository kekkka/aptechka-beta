import { useEffect, useRef, useState } from "react";
import type { Stock } from "./types";
import type { CatalogProduct } from "./catalog";
import { fmt } from "./model";
import { GrlsInfo } from "./GrlsInfo";
import type { GrlsLookup } from "./grls";
import { Button, Icon } from "./components";
import { findMedicationInstruction } from "./medication-instructions";
import { MedicationInstruction } from "./MedicationInstruction";

export function MedicationInfo({ stock, day }: { stock: Stock; day: string }) {
  const [product, setProduct] = useState<CatalogProduct | null>(null);
  const [grls, setGrls] = useState<GrlsLookup | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const workerRef = useRef<Worker | null>(null);
  const code = stock.gtin || stock.catalogId;
  const instruction = product ? findMedicationInstruction(product) : undefined;
  useEffect(() => {
    setProduct(null);
    setGrls(null);
    setError("");
    if (!code) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const worker = new Worker(new URL("./catalog.worker.ts", import.meta.url), {
      type: "module",
    });
    workerRef.current = worker;
    worker.onmessage = (event) => {
      setLoading(false);
      if (event.data.grls) setGrls(event.data.grls);
      if (event.data.error) setError(event.data.error);
      else if (event.data.products)
        setProduct(
          event.data.products?.find((p: CatalogProduct) => p.gtin === code) ||
            null,
        );
    };
    worker.onerror = () => {
      setLoading(false);
      setError("Не удалось загрузить информацию о препарате.");
    };
    worker.postMessage({
      id: 1,
      query: code,
      byCode: true,
      includeRegistration: true,
      url: new URL("catalog/medications.json", new URL("./", document.baseURI))
        .href,
    });
    return () => {
      workerRef.current = null;
      worker.terminate();
    };
  }, [code, retry]);
  const retryGrls = () => {
    if (!product || !workerRef.current) return;
    setGrls({ status: "loading" });
    workerRef.current.postMessage({
      id: 2,
      registrationOnly: product.registration,
      url: new URL("catalog/medications.json", new URL("./", document.baseURI))
        .href,
    });
  };
  const fields = product
    ? [
        ["Действующее вещество", product.inn],
        ["Производитель упаковки · МДЛП", product.manufacturer],
        ["Упаковка", product.package],
        ["Регистрационное удостоверение", product.registration],
        ["GTIN", product.gtin],
      ].filter(([, value]) => value)
    : [];
  return (
    <div className="medication-info">
      <div className="medication-info-intro">
        <span className="med-icon">
          <Icon name="pill" />
        </span>
        <p>
          {stock.strength}
          <span>{stock.form.toLocaleLowerCase("ru")}</span>
        </p>
      </div>
      <div className="medication-info-stock">
        <div>
          <small>Дома · эта партия</small>
          <strong>
            {stock.qty} {stock.unit}
          </strong>
        </div>
        <div>
          <small>Срок годности</small>
          <strong>{stock.expiry ? fmt(stock.expiry) : "Не указан"}</strong>
          {stock.expiry && stock.expiry < day && (
            <span className="catalog-error">Срок истёк</span>
          )}
        </div>
      </div>
      {loading && (
        <p role="status" className="catalog-meta">
          Загружаем информацию из каталога…
        </p>
      )}
      {error && (
        <div role="alert">
          <p className="catalog-error">{error}</p>
          <Button kind="white" onClick={() => setRetry((v) => v + 1)}>
            Повторить
          </Button>
        </div>
      )}
      {!loading && !error && !product && (
        <p className="catalog-meta">
          Для этого препарата нет связанной записи в каталоге. Показаны данные
          домашней аптечки.
        </p>
      )}
      {product && (
        <>
          {instruction ? (
            <MedicationInstruction instruction={instruction} />
          ) : (
            <p className="catalog-meta">
              Краткая инструкция для этой упаковки пока не добавлена.
            </p>
          )}
          <details className="medication-registry">
            <summary>Упаковка и данные реестров</summary>
            {!instruction && product.description && (
              <section className="medication-info-description">
                <h3>Описание из реестра</h3>
                <p>{product.description}</p>
              </section>
            )}
            {grls && <GrlsInfo lookup={grls} onRetry={retryGrls} />}
            <dl className="medication-info-fields">
              {fields.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <p className="catalog-meta">Источник: каталог МДЛП.</p>
          </details>
        </>
      )}
    </div>
  );
}
