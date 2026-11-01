import { useState } from "react";
import type { State, Stock } from "./types";
import { fmt, medKey, shopping } from "./model";
import { normalizeSearch } from "./catalog";
import { Button, Empty, Heading, Icon } from "./components";
function exportFile(name: string, text: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: "text/plain;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function VirtualPharmacy({
  state,
  canEdit,
  onAdd,
  onEdit,
  onInfo,
}: {
  state: State;
  canEdit: boolean;
  onAdd: (query?: string) => void;
  onEdit: (stock: Stock) => void;
  onInfo: (stock: Stock) => void;
}) {
  const [stockTab, setStockTab] = useState("stock");
  const [query, setQuery] = useState("");
  const needs = shopping(state);
  return (
    <>
      <Heading
        title="Домашняя аптечка"
        subtitle="Остатки дома и покупки на текущий курс."
        action={
          canEdit ? (
            <button
              className="icon-btn"
              aria-label="Добавить лекарство"
              onClick={() => onAdd()}
            >
              <Icon name="plus" />
            </button>
          ) : undefined
        }
      />
      <div className="segmented">
        <button
          className={stockTab === "stock" ? "active" : ""}
          onClick={() => setStockTab("stock")}
        >
          Дома · {state.stock.length}
        </button>
        <button
          className={stockTab === "buy" ? "active" : ""}
          onClick={() => setStockTab("buy")}
        >
          Купить · {needs.length}
        </button>
      </div>
      {stockTab === "stock" ? (
        <>
          <label className="search space">
            <Icon name="search" />
            <input
              placeholder="Найти препарат"
              aria-label="Поиск в аптечке"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <div className="card space">
            {state.stock
              .filter((s) =>
                (s.name + s.strength)
                  .toLowerCase()
                  .includes(query.toLowerCase()),
              )
              .map((s) => (
                <div className="stock-row" key={s.id}>
                  <button
                    type="button"
                    className="list-item stock-open"
                    aria-label={`Информация о препарате ${s.name}, ${s.strength}`}
                    aria-haspopup="dialog"
                    onClick={() => onInfo(s)}
                  >
                    <span className="med-icon">
                      <Icon name="pill" />
                    </span>
                    <span className="grow">
                      <strong className="stock-summary-name">{s.name}</strong>
                      <span className="stock-summary-meta">
                        {s.strength} · {s.form}
                      </span>
                      <span className="stock-summary-meta">
                        {s.expiry
                          ? "Годен до " + fmt(s.expiry)
                          : "Срок годности не указан"}
                      </span>
                    </span>
                    <span className="qty">
                      {s.qty}
                      <small>{s.unit}</small>
                    </span>
                  </button>
                  {canEdit && (
                    <button
                      className="icon-btn"
                      aria-label={`Изменить ${s.name}`}
                      onClick={() => onEdit(s)}
                    >
                      <Icon name="edit" />
                    </button>
                  )}
                </div>
              ))}
          </div>
        </>
      ) : (
        <>
          <div className="hint space">
            <Icon name="bag" />
            <span>
              Учитываем точную форму, дозировку, оставшийся курс и срок годности
              запаса.
            </span>
          </div>
          <div className="card space">
            {needs.length ? (
              needs.map((n) => (
                <div className="buy-card" key={medKey(n.med)}>
                  <h3>
                    {n.med.name} · {n.med.strength}
                  </h3>
                  <p>{n.med.form}</p>
                  <div className="formula">
                    На курс {n.needed} − дома {n.qty} ={" "}
                    <strong>
                      докупить {n.missing} {n.med.unit}
                    </strong>
                  </div>
                  {n.packs && (
                    <p>
                      {n.packs} уп. по {n.pack} шт.
                    </p>
                  )}
                  {canEdit && (
                    <Button
                      kind="soft"
                      onClick={() => onAdd(`${n.med.name} ${n.med.strength}`)}
                    >
                      Пополнить аптечку
                    </Button>
                  )}
                </div>
              ))
            ) : (
              <Empty title="Всего хватает">
                Запаса достаточно на оставшийся курс
              </Empty>
            )}
          </div>
          <div className="space">
            <Button
              kind="white"
              onClick={() =>
                exportFile(
                  "Покупки.txt",
                  needs
                    .map(
                      (n) =>
                        `${n.med.name} ${n.med.strength} ${n.med.form}: ${n.missing} ${n.med.unit}`,
                    )
                    .join("\n"),
                )
              }
            >
              Скачать список покупок
            </Button>
          </div>
        </>
      )}
    </>
  );
}
