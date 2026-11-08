import { useEffect, useRef, useState } from "react";
import { Button, Icon } from "./components";
import { parse } from "./parser";
import { addDays, iso, medKey, medicationEnd, uid } from "./model";
import type { Course, ParsedMed, State, Stock } from "./types";
import { read as readPrescription, type Page, type Progress } from "./reader";
const blank = (): ParsedMed => ({
  name: "",
  strength: "",
  form: "Таблетки",
  dose: "",
  days: "",
  times: "",
  frequency: null,
  note: "",
  sourceText: "Введено вручную",
  complex: false,
  warnings: [],
  index: 0,
});
export function ImportPrescription({
  state,
  initialDate = state.day,
  onSave,
}: {
  state: State;
  initialDate?: string;
  onSave: (course: Course, stock: Stock[]) => void;
}) {
  const [step, setStep] = useState(0),
    [text, setText] = useState(""),
    [pages, setPages] = useState<Page[]>([]),
    [meds, setMeds] = useState<ParsedMed[]>([]),
    [checked, setChecked] = useState<boolean[]>([]),
    [error, setError] = useState(""),
    [progress, setProgress] = useState<Progress | null>(null),
    [title, setTitle] = useState("Новое назначение"),
    [start, setStart] = useState(initialDate),
    [helper, setHelper] = useState("elena"),
    [consent, setConsent] = useState(false),
    [reviewStock, setReviewStock] = useState<Stock[]>(
      state.stock.map((s) => ({ ...s })),
    );
  const abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);
  const update = (i: number, key: keyof ParsedMed, value: string) => {
    setMeds((old) => old.map((m, j) => (j === i ? { ...m, [key]: value } : m)));
    setChecked((old) => old.map((v, j) => (i === j ? false : v)));
    setConsent(false);
  };
  async function read(files: File[]) {
    setError("");
    if (
      files.length > 6 ||
      files.some((f) => f.size > 10 * 1024 * 1024) ||
      files.reduce((n, f) => n + f.size, 0) > 30 * 1024 * 1024
    ) {
      setError("До 6 файлов: 10 МБ на файл, 30 МБ суммарно.");
      return;
    }
    if (
      files.some(
        (f) =>
          ![
            "image/jpeg",
            "image/png",
            "image/webp",
            "application/pdf",
          ].includes(f.type),
      )
    ) {
      setError("Выберите JPG, PNG, WebP или PDF.");
      return;
    }
    abort.current = new AbortController();
    setProgress({ label: "Открываем документ", detail: "", progress: 0 });
    try {
      const result = await readPrescription(files, {
        signal: abort.current.signal,
        onProgress: setProgress,
      });
      setPages(result.pages);
      setText(result.text);
      const parsed = parse(result.text);
      setMeds(parsed.meds.length ? parsed.meds : [blank()]);
      setChecked([]);
      setStep(1);
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError((e as Error).message);
    } finally {
      setProgress(null);
    }
  }
  async function demo() {
    const canvas = document.createElement("canvas");
    canvas.width = 1500;
    canvas.height = 900;
    const c = canvas.getContext("2d")!;
    c.fillStyle = "#fff";
    c.fillRect(0, 0, 1500, 900);
    c.fillStyle = "#111";
    c.font = "30px Arial";
    [
      "Учебное назначение",
      "Препарат Г 10 мг таблетки",
      "По 1 таблетке в 09:00, 7 дней, после еды",
    ].forEach((s, i) => c.fillText(s, 60, 120 + i * 100));
    const blob = await new Promise<Blob | null>((r) =>
      canvas.toBlob(r, "image/png"),
    );
    if (blob)
      await read([
        new File([blob], "учебное-назначение.png", { type: "image/png" }),
      ]);
  }
  function validate() {
    if (!meds.length || meds.length > 8) {
      setError("Укажите от 1 до 8 препаратов.");
      return;
    }
    for (let i = 0; i < meds.length; i++) {
      const m = meds[i],
        times = m.times.split(/[,;\s]+/).filter(Boolean);
      if (
        m.complex ||
        !m.name.trim() ||
        !m.strength.trim() ||
        !["Таблетки", "Капсулы"].includes(m.form) ||
        Number(m.dose) <= 0 ||
        Number(m.dose) > 20 ||
        (Number(m.dose) * 4) % 1 ||
        !Number.isInteger(Number(m.days)) ||
        Number(m.days) < 1 ||
        Number(m.days) > 90 ||
        !times.length ||
        times.length > 8 ||
        new Set(times).size !== times.length ||
        times.some((t) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(t)) ||
        !checked[i]
      ) {
        setError(
          "Проверьте и подтвердите каждый препарат: доза, форма, срок от 1 до 90 дней и точное время ЧЧ:ММ. Сложные схемы не запускаются автоматически.",
        );
        return;
      }
    }
    const keys = meds.map((m) =>
      medKey({ ...m, unit: m.form === "Капсулы" ? "капс." : "табл." }),
    );
    if (new Set(keys).size !== keys.length) {
      setError(
        "Один препарат указан несколько раз. Объедините времена приёма.",
      );
      return;
    }
    const overlap = meds.some((m) =>
      state.courses.some(
        (c) =>
          c.active &&
          c.start <= addDays(start, Number(m.days) - 1) &&
          addDays(c.start, c.days - 1) >= start &&
          c.meds.some(
            (old) =>
              medicationEnd(c, old) >= start &&
              medKey(old) ===
                medKey({
                  ...m,
                  unit: m.form === "Капсулы" ? "капс." : "табл.",
                }),
          ),
      ),
    );
    if (overlap) {
      setError(
        "Этот препарат уже есть в пересекающемся курсе. Проверьте назначения перед запуском.",
      );
      return;
    }
    setError("");
    setStep(2);
  }
  function launch() {
    if (
      !consent ||
      !title.trim() ||
      !start ||
      !state.members.some((m) => m.id === helper && m.view)
    )
      return;
    if (reviewStock.some((s) => s.qty > 0 && (!s.expiry || s.expiry < iso()))) {
      setError("Проверьте срок годности домашнего запаса.");
      return;
    }
    onSave(
      {
        id: uid(),
        title: title.trim(),
        start,
        days: Math.max(...meds.map((m) => Number(m.days))),
        active: true,
        source: pages.length ? "Фото / PDF" : "Введено вручную",
        importMethod: pages.length ? "OCR" : "manual",
        helper,
        meds: meds.map((m) => ({
          id: uid(),
          name: m.name.trim(),
          strength: m.strength.trim(),
          form: m.form,
          unit: m.form === "Капсулы" ? "капс." : "табл.",
          dose: Number(m.dose),
          days: Number(m.days),
          times: m.times
            .split(/[,;\s]+/)
            .filter(Boolean)
            .sort(),
          note: m.note,
          pack: 0,
        })),
      },
      reviewStock,
    );
  }
  return (
    <>
      <ol className="import-steps">
        {["Документ", "Проверка", "Запас", "Запуск"].map((s, i) => (
          <li
            key={s}
            className={i === step ? "current" : i < step ? "complete" : ""}
          >
            <span>{i + 1}</span>
            {s}
          </li>
        ))}
      </ol>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {progress ? (
        <div className="ocr-progress">
          <Icon name="file" />
          <h3>{progress.label}</h3>
          <p>{progress.detail}</p>
          <progress max={1} value={progress.progress} />
          <Button kind="white" onClick={() => abort.current?.abort()}>
            Отменить
          </Button>
        </div>
      ) : step === 0 ? (
        <>
          <div className="import-patient">
            <span className="avatar rose">Н</span>
            <div>
              <p>Назначение для</p>
              <h3>{state.patient.name}</h3>
            </div>
          </div>
          <label className="scan-zone">
            <Icon name="upload" />
            <strong>Загрузите назначение</strong>
            <span>Фото или PDF · до 6 файлов</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              multiple
              onChange={(e) => {
                if (e.target.files?.length) void read([...e.target.files]);
                e.target.value = "";
              }}
            />
          </label>
          <label className="camera-choice">
            <Icon name="camera" />
            Сфотографировать
            <input
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={(e) => {
                if (e.target.files?.length) void read([...e.target.files]);
              }}
            />
          </label>
          <p className="import-privacy">
            <Icon name="shield" />
            Распознавание на устройстве. Документы не отправляются на сервер.
          </p>
          <div className="stack">
            <Button kind="soft" onClick={() => void demo()}>
              Распознать пример
            </Button>
            <Button
              kind="white"
              onClick={() => {
                setMeds([blank()]);
                setStep(1);
              }}
            >
              Ввести вручную
            </Button>
          </div>
          <label className="field">
            <span>Или вставьте текст назначения</span>
            <textarea
              rows={5}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Название, дозировка, форма, время и длительность"
            />
          </label>
          <Button
            kind="soft"
            disabled={!text.trim()}
            onClick={() => {
              const p = parse(text);
              setMeds(p.meds.length ? p.meds : [blank()]);
              setStep(1);
            }}
          >
            Разобрать текст
          </Button>
        </>
      ) : step === 1 ? (
        <>
          <details className="document">
            <summary>Оригинал и распознанный текст</summary>
            <div className="source-pages">
              {pages.map((p, i) => (
                <img
                  key={i}
                  src={p.preview}
                  alt={`${p.fileName}, страница ${p.page}`}
                />
              ))}
            </div>
            <label className="field">
              <span>Текст назначения</span>
              <textarea
                rows={7}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </label>
            <Button
              kind="soft"
              onClick={() => {
                setMeds(parse(text).meds);
                setChecked([]);
              }}
            >
              Разобрать заново
            </Button>
          </details>
          {meds.map((m, i) => (
            <section className="review-med space" key={i}>
              <div className="between">
                <h3>Препарат {i + 1}</h3>
                <button
                  className="text-link"
                  onClick={() => {
                    setMeds(meds.filter((_, j) => j !== i));
                    setChecked(checked.filter((_, j) => j !== i));
                  }}
                >
                  Удалить
                </button>
              </div>
              {m.sourceText && (
                <p className="source-fragment">{m.sourceText}</p>
              )}
              {m.complex && (
                <p className="error">
                  Сложная схема. Уточните её у врача; автоматический запуск
                  недоступен.
                </p>
              )}
              {m.warnings.map((w) => (
                <p className="field-warning" key={w}>
                  {w}
                </p>
              ))}
              {(
                [
                  ["name", "Название"],
                  ["strength", "Дозировка"],
                  ["dose", "Количество за приём"],
                  ["days", "Длительность, дней"],
                  ["times", "Время: 08:00, 20:00"],
                  ["note", "Примечание"],
                ] as const
              ).map(([key, label]) => (
                <label className="field" key={key}>
                  <span>{label}</span>
                  <input
                    value={m[key]}
                    onChange={(e) => update(i, key, e.target.value)}
                  />
                </label>
              ))}
              <label className="field">
                <span>Форма</span>
                <select
                  value={m.form}
                  onChange={(e) => update(i, "form", e.target.value)}
                >
                  <option value="">Выберите</option>
                  <option>Таблетки</option>
                  <option>Капсулы</option>
                </select>
              </label>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={!!checked[i]}
                  onChange={(e) =>
                    setChecked((old) => {
                      const next = [...old];
                      next[i] = e.target.checked;
                      return next;
                    })
                  }
                />
                Сверила препарат и схему с оригиналом
              </label>
            </section>
          ))}
          <div className="stack space">
            <Button
              kind="white"
              disabled={meds.length >= 8}
              onClick={() => setMeds([...meds, blank()])}
            >
              Добавить препарат
            </Button>
            <Button onClick={validate}>Далее: домашний запас</Button>
            <Button kind="white" onClick={() => setStep(0)}>
              Назад
            </Button>
          </div>
        </>
      ) : step === 2 ? (
        <>
          <h3>Сверьте домашний запас</h3>
          <p className="caption">
            Точная форма, дозировка и срок годности важны для расчёта дефицита.
          </p>
          {reviewStock.map((s, i) => (
            <div key={s.id} className="review-med space">
              <h3>
                {s.name} · {s.strength}
              </h3>
              <label className="field">
                <span>Остаток, {s.unit}</span>
                <input
                  type="number"
                  min={0}
                  step={0.25}
                  value={s.qty}
                  onChange={(e) =>
                    setReviewStock((old) =>
                      old.map((st, j) =>
                        i === j ? { ...st, qty: Number(e.target.value) } : st,
                      ),
                    )
                  }
                />
              </label>
              <label className="field">
                <span>Годен до</span>
                <input
                  type="date"
                  value={s.expiry || ""}
                  onChange={(e) =>
                    setReviewStock((old) =>
                      old.map((st, j) =>
                        i === j ? { ...st, expiry: e.target.value } : st,
                      ),
                    )
                  }
                />
              </label>
            </div>
          ))}
          <div className="stack space">
            <Button
              onClick={() => {
                if (
                  reviewStock.some(
                    (s) =>
                      !Number.isFinite(s.qty) ||
                      s.qty < 0 ||
                      s.qty > 100000 ||
                      (s.qty * 4) % 1 ||
                      (s.qty > 0 && (!s.expiry || s.expiry < iso())),
                  )
                ) {
                  setError("Проверьте остатки и сроки годности.");
                  return;
                }
                setError("");
                setStep(3);
              }}
            >
              Далее: запуск плана
            </Button>
            <Button kind="white" onClick={() => setStep(1)}>
              Назад
            </Button>
          </div>
        </>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            launch();
          }}
        >
          <div className="launch-summary">
            <span className="scan-symbol">
              <Icon name="check" />
            </span>
            <h3>План готов к запуску</h3>
            <p>{meds.length} препаратов в проверенном плане</p>
          </div>
          <label className="field">
            <span>Название курса</span>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Дата начала</span>
            <input
              required
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Кто поможет с лечением</span>
            <select value={helper} onChange={(e) => setHelper(e.target.value)}>
              {state.members
                .filter((m) => m.view)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} · {m.relation}
                  </option>
                ))}
            </select>
          </label>
          {meds.map((m, i) => {
            const qty =
                reviewStock.find(
                  (s) =>
                    medKey(s) ===
                    medKey({
                      ...m,
                      unit: m.form === "Капсулы" ? "капс." : "табл.",
                    }),
                )?.qty || 0,
              needed =
                Number(m.dose) *
                Number(m.days) *
                m.times.split(/[,;\s]+/).filter(Boolean).length;
            return (
              <div className="import-shopping" key={i}>
                <strong>{m.name}</strong>
                <p>
                  На курс: {needed} шт. · Дома: {qty} шт.
                </p>
                <p>Докупить: {Math.max(0, needed - qty)} шт.</p>
              </div>
            );
          })}
          <label className="check-row">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              required
            />
            Подтверждаю схему, запас и доступ выбранному помощнику
          </label>
          <div className="stack space">
            <Button type="submit" disabled={!consent}>
              Запустить план
            </Button>
            <Button kind="white" onClick={() => setStep(2)}>
              Назад
            </Button>
          </div>
        </form>
      )}
    </>
  );
}
