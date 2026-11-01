import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import type { CatalogProduct } from "./catalog";
import { normalizeGtin, normalizeRegistration, quantityToAdd } from "./catalog";
import { BarcodeScanner } from "./BarcodeScanner";
import { Button, Icon } from "./components";
export function AddMedication({
  day,
  initialQuery = "",
  onSave,
}: {
  day: string;
  initialQuery?: string;
  onSave: (product: CatalogProduct, qty: number, expiry: string) => boolean;
}) {
  const [mode, setMode] = useState<"name" | "code" | "scan">("name");
  const [query, setQuery] = useState(initialQuery);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [selected, setSelected] = useState<CatalogProduct | null>(null);
  const [amountMode, setAmountMode] = useState<"units" | "packs">("units");
  const [amount, setAmount] = useState("1");
  const [expiry, setExpiry] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [snapshot, setSnapshot] = useState("");
  const [saving, setSaving] = useState(false);
  const worker = useRef<Worker | null>(null);
  const request = useRef(0);
  const savingRef = useRef(false);
  useEffect(() => {
    const w = new Worker(new URL("./catalog.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.current = w;
    w.onmessage = (event) => {
      if (event.data.id !== request.current) return;
      setLoading(false);
      setError(event.data.error || "");
      setProducts(event.data.products || []);
    };
    w.onerror = () => {
      setLoading(false);
      setError("Не удалось запустить поиск. Повторите попытку.");
    };
    const abort = new AbortController();
    void fetch(
      new URL("catalog/metadata.json", new URL("./", document.baseURI)),
      { signal: abort.signal },
    )
      .then((r) => r.json())
      .then((data) => setSnapshot(data.snapshotDate))
      .catch(() => {});
    return () => {
      worker.current = null;
      w.terminate();
      abort.abort();
    };
  }, []);
  useEffect(() => {
    const id = ++request.current;
    if (mode === "scan") {
      setLoading(false);
      return;
    }
    if (
      mode === "code" &&
      query &&
      !normalizeGtin(query) &&
      !normalizeRegistration(query)
    ) {
      setProducts([]);
      setLoading(false);
      setError("Введите штрихкод или номер РУ из реестра, например ЛП-001234.");
      return;
    }
    setLoading(true);
    setError("");
    setProducts([]);
    const timer = setTimeout(
      () =>
        worker.current?.postMessage({
          id,
          query,
          byCode: mode === "code",
          url: new URL(
            "catalog/medications.json",
            new URL("./", document.baseURI),
          ).href,
        }),
      250,
    );
    return () => clearTimeout(timer);
  }, [query, mode, retry]);
  const codeFound = useCallback((code: string) => {
    setQuery(code);
    setMode("code");
  }, []);
  const switchMode = (next: typeof mode) => {
    setMode(next);
    setQuery("");
    setError("");
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!selected || savingRef.current) return;
    const qty = quantityToAdd(selected, Number(amount), amountMode);
    if (qty === null || !expiry || expiry < day) {
      setError("Проверьте количество и срок годности.");
      return;
    }
    savingRef.current = true;
    setSaving(true);
    if (!onSave(selected, qty, expiry)) {
      setError("Не удалось сохранить запас. Проверьте введённые данные.");
      savingRef.current = false;
      setSaving(false);
    }
  };
  if (selected)
    return (
      <form onSubmit={submit} className="catalog-selected">
        <button
          type="button"
          className="text-link"
          onClick={() => {
            setSelected(null);
            setError("");
          }}
        >
          ← Выбрать другое лекарство
        </button>
        <h3>{selected.name}</h3>
        <p>
          {selected.strength} · {selected.form}
        </p>
        <p>{selected.package}</p>
        <p>{selected.manufacturer}</p>
        <p className="catalog-meta">
          GTIN {selected.gtin} · РУ {selected.registration}
        </p>
        <div className="segmented space">
          <button
            type="button"
            className={amountMode === "units" ? "active" : ""}
            onClick={() => setAmountMode("units")}
          >
            Остаток, {selected.unit}
          </button>
          <button
            type="button"
            disabled={!selected.packSize}
            className={amountMode === "packs" ? "active" : ""}
            onClick={() => setAmountMode("packs")}
          >
            Упаковки
          </button>
        </div>
        {!selected.packSize && (
          <p className="catalog-meta">
            Количество в упаковке не определено. Укажите остаток в единицах:{" "}
            {selected.unit}
          </p>
        )}
        <label className="field">
          <span>
            {amountMode === "packs"
              ? "Количество упаковок"
              : `Количество, ${selected.unit}`}
          </span>
          <input
            required
            type="number"
            min={amountMode === "packs" ? 1 : 0.25}
            max={100000}
            step={amountMode === "packs" ? 1 : 0.25}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        {amountMode === "packs" && (
          <p>
            Будет добавлено:{" "}
            {quantityToAdd(selected, Number(amount), amountMode) ?? "—"}{" "}
            {selected.unit}
          </p>
        )}
        <label className="field">
          <span>Годен до</span>
          <input
            required
            type="date"
            min={day}
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
          />
        </label>
        <p className="catalog-meta">
          Добавим к запасу дома. Назначения и дозы пациента сохранятся.
        </p>
        {error && (
          <p role="alert" className="catalog-error">
            {error}
          </p>
        )}
        <Button type="submit" disabled={saving}>
          {saving ? "Сохраняем…" : "Добавить в аптечку"}
        </Button>
      </form>
    );
  return (
    <div className="catalog-search">
      <div className="catalog-methods" role="group" aria-label="Способ поиска">
        <button
          className={mode === "name" ? "active" : ""}
          onClick={() => switchMode("name")}
        >
          <Icon name="search" />
          По названию
        </button>
        <button
          className={mode === "scan" ? "active" : ""}
          onClick={() => switchMode("scan")}
        >
          <Icon name="camera" />
          Сканировать
        </button>
        <button
          className={mode === "code" ? "active" : ""}
          onClick={() => switchMode("code")}
        >
          <Icon name="edit" />
          Ввести код
        </button>
      </div>
      {mode === "scan" ? (
        <BarcodeScanner
          onCode={codeFound}
          onManual={() => switchMode("code")}
        />
      ) : (
        <>
          <label className="field space">
            <span>
              {mode === "code"
                ? "Штрихкод или номер РУ из реестра"
                : "Название или действующее вещество"}
            </span>
            <input
              autoFocus
              type="text"
              inputMode="text"
              value={query}
              placeholder={
                mode === "code"
                  ? "Например, 460… или ЛП-001234"
                  : "Начните вводить название"
              }
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          {mode === "code" && normalizeGtin(query) && (
            <p className="catalog-meta">GTIN {normalizeGtin(query)}</p>
          )}
          <div role="status" aria-live="polite">
            {loading ? (
              "Загружаем каталог и ищем…"
            ) : error ? (
              <p className="catalog-error">{error}</p>
            ) : query && !products.length ? (
              <p>
                Не найдено. Проверьте название или попробуйте другой способ
                поиска.
              </p>
            ) : !query ? (
              <p className="catalog-meta">
                Введите название или код, чтобы найти лекарство в каталоге.
              </p>
            ) : (
              <p className="catalog-meta">
                Найдено: {products.length}
                {products.length === 40 ? "+ · уточните поиск" : ""}
              </p>
            )}
          </div>
          {error && (
            <Button kind="white" onClick={() => setRetry((v) => v + 1)}>
              Повторить поиск
            </Button>
          )}
          <div className="catalog-results">
            {products.map((product) => (
              <button
                key={product.gtin}
                className="catalog-result"
                onClick={() => {
                  setSelected(product);
                  setAmountMode(product.packSize ? "packs" : "units");
                  setAmount("1");
                  setError("");
                }}
              >
                <strong>
                  {product.name} · {product.strength}
                </strong>
                <span>{product.form}</span>
                <span>{product.package}</span>
                <small>{product.manufacturer}</small>
                <small>
                  GTIN {product.gtin} · РУ {product.registration}
                </small>
                <span className="catalog-choose">Выбрать →</span>
              </button>
            ))}
          </div>
        </>
      )}
      <p className="catalog-meta">
        Каталог МДЛП · {snapshot ? `снимок ${snapshot}` : "открытые данные"} ·{" "}
        <a
          href="https://датамаркет.честныйзнак.рф/bi/opendata/7731376812-MDLPGtins"
          target="_blank"
          rel="noreferrer"
        >
          Источник
        </a>
      </p>
    </div>
  );
}
