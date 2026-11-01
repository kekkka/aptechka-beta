import type { GrlsLookup, GrlsRegistration } from "./grls";
const registryDate = (date: string) => date.split("-").reverse().join(".");
import { Button } from "./components";
function RegistrationFields({ record }: { record: GrlsRegistration }) {
  const fields = [
    ["Фармакотерапевтическая группа", record.group],
    ["Держатель регистрационного удостоверения", record.holder],
    ["Страна держателя РУ", record.country],
    ["Статус записи", record.status],
    [
      "Дата регистрации",
      record.registeredAt ? registryDate(record.registeredAt) : null,
    ],
    [
      "Действие РУ до",
      record.expiresAt ? registryDate(record.expiresAt) : null,
    ],
    [
      "В перечне ЖНВЛП",
      record.vital === null ? null : record.vital ? "Да" : "Нет",
    ],
  ].filter(([, value]) => value);
  return (
    <>
      <dl className="medication-info-fields">
        {fields.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {(record.manufacturing || record.documents) && (
        <details className="grls-documents">
          <summary>Производство и документы</summary>
          {record.manufacturing && (
            <section>
              <h4>Стадии производства</h4>
              <p>{record.manufacturing}</p>
            </section>
          )}
          {record.documents && (
            <section>
              <h4>Нормативная документация</h4>
              <p>{record.documents}</p>
            </section>
          )}
        </details>
      )}
    </>
  );
}
export function GrlsInfo({
  lookup,
  onRetry,
}: {
  lookup: GrlsLookup;
  onRetry: () => void;
}) {
  return (
    <section className="grls-info" aria-label="Сведения ГРЛС">
      <h3>Регистрационные сведения</h3>
      {lookup.status === "loading" && (
        <p className="catalog-meta" role="status">
          Загружаем ГРЛС…
        </p>
      )}
      {lookup.status === "error" && (
        <div role="alert">
          <p className="catalog-error">{lookup.message}</p>
          <Button kind="white" onClick={onRetry}>
            Повторить загрузку ГРЛС
          </Button>
        </div>
      )}
      {(lookup.status === "matched" || lookup.status === "not_found") && (
        <p className="catalog-meta">
          ГРЛС · снимок {registryDate(lookup.snapshotDate)}
        </p>
      )}
      {lookup.status === "not_found" && (
        <p className="catalog-meta">
          В подключённой выгрузке ГРЛС нет точного совпадения по номеру РУ.
        </p>
      )}
      {lookup.status === "matched" &&
        (lookup.variants.length === 1 ? (
          <RegistrationFields record={lookup.variants[0]} />
        ) : (
          <>
            <p className="catalog-meta">
              По этому РУ в выгрузке несколько вариантов сведений.
            </p>
            {lookup.variants.map((record, index) => (
              <details key={index} className="grls-variant">
                <summary>
                  Вариант {index + 1} · {record.status}
                </summary>
                <RegistrationFields record={record} />
              </details>
            ))}
          </>
        ))}
    </section>
  );
}
