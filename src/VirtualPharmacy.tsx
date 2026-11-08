import { useState } from "react";
import { MedicationStorefront } from "./MedicationStorefront";
import type { State, Stock } from "./types";
import { fmt, medKey, shopping } from "./model";
import { normalizeSearch } from "./catalog";
import { inventoryItems } from "./inventory";
import { Button, Empty, Heading, Icon } from "./components";

export function VirtualPharmacy({ state, canEdit, onAdd, onEdit, onInfo, onShare, onNearby }: {
  state: State; canEdit: boolean; onAdd: (query?: string) => void;
  onEdit: (stock: Stock) => void; onInfo: (stock: Stock) => void; onShare: () => void;
  onNearby: () => void;
}) {
  const [stockTab, setStockTab] = useState("stock");
  const [query, setQuery] = useState("");
  const needs = shopping(state);
  const items = inventoryItems(state);
  const filtered = items.filter((item) => normalizeSearch(`${item.med.name} ${item.med.strength} ${item.med.form}`).includes(normalizeSearch(query)));
  return <>
    <Heading title="Домашняя аптечка" subtitle="Остатки дома и покупки на текущий курс."
      action={canEdit ? <button className="icon-btn" aria-label="Добавить лекарство" onClick={() => onAdd()}><Icon name="plus" /></button> : undefined} />
    <section className="pharmacy-shopping-highlight" aria-label="Что нужно докупить">
      <div className="pharmacy-shopping-heading"><span className="pharmacy-shopping-icon"><Icon name={needs.length ? "bag" : "check"} /></span>
        <div><h2>{needs.length ? "Нужно докупить" : "Лекарств хватает"}</h2><p>На оставшийся курс лечения</p></div>
        {needs.length > 0 && <span className="pharmacy-shopping-count">{needs.length}</span>}
      </div>
      {needs.length ? <MedicationStorefront state={state} onInfo={onInfo} /> : <p className="pharmacy-shopping-empty">Всё необходимое уже есть в домашней аптечке.</p>}
      <div className="pharmacy-shopping-actions" role="group" aria-label="Действия со списком покупок">
        <button disabled={!needs.length} onClick={onShare}><Icon name="send" /><span>Поделиться списком</span></button>
        <button disabled={!needs.length} onClick={onNearby}><Icon name="search" /><span>Найти аптеку рядом</span></button>
      </div>
    </section>
    <div className="segmented space">
      <button className={stockTab === "stock" ? "active" : ""} onClick={() => setStockTab("stock")}>Дома · {items.length}</button>
      <button className={stockTab === "buy" ? "active" : ""} onClick={() => setStockTab("buy")}>К покупке · {needs.length}</button>
    </div>
    {stockTab === "stock" ? <>
      <label className="search space"><Icon name="search" /><input placeholder="Найти препарат" aria-label="Поиск в аптечке" value={query} onChange={(e) => setQuery(e.target.value)} /></label>
      <div className="pharmacy-inventory space">
        {filtered.length ? filtered.map((item) => <section className="pharmacy-item" key={item.key}>
          <div className="pharmacy-item-header"><span className="med-icon"><Icon name="pill" /></span>
            <div className="grow"><h3>{item.med.name}</h3><p>{item.med.strength} · {item.med.form}</p></div>
            <div className="pharmacy-total"><strong>{item.qty}</strong><small>{item.med.unit} дома</small></div></div>
          {item.need && <p className="pharmacy-shortage">Докупить {item.need.missing} {item.med.unit} на оставшийся курс</p>}
          {item.expired > 0 && <p className="pharmacy-expired">Просрочено: {item.expired} {item.med.unit} — не входит в доступный остаток</p>}
          {item.batches.map((batch, index) => <div className="pharmacy-batch" key={batch.id}>
            <button className="pharmacy-batch-info" aria-label={`Информация о препарате ${batch.name}, ${batch.strength}, партия ${index + 1}`} onClick={() => onInfo(batch)}>
              <span>Партия {index + 1} · {batch.qty} {batch.unit}</span>
              <small>{batch.expiry ? `Годен до ${fmt(batch.expiry)}` : "Срок годности не указан"}</small>
              {!batch.catalogId && <small>Введено вручную</small>}
            </button>
            {canEdit && <button className="icon-btn" aria-label={`Изменить ${batch.name}, партия ${index + 1}`} onClick={() => onEdit(batch)}><Icon name="edit" /></button>}
          </div>)}
          {!item.batches.length && <p className="catalog-meta">Запас пока не добавлен.</p>}
          {canEdit && <button className="text-link pharmacy-add-batch" onClick={() => onAdd(`${item.med.name} ${item.med.strength}`)}><Icon name="plus" />Пополнить запас</button>}
        </section>) : <Empty title={query ? "Не найдено" : "Аптечка пока пустая"}>{query ? "Попробуйте другое название или дозировку." : "Добавьте лекарство из каталога или вручную."}</Empty>}
      </div>
      {canEdit && <div className="space"><Button kind="soft" onClick={() => onAdd()}><Icon name="plus" />Добавить лекарство</Button></div>}
    </> : <>
      <div className="hint space"><Icon name="bag" /><span>Покупки рассчитаны по оставшемуся курсу с учётом дозировки, формы и срока годности партий.</span></div>
      <div className="card space">{needs.length ? needs.map((n) => <div className="buy-card" key={medKey(n.med)}>
        <h3>{n.med.name} · {n.med.strength}</h3><p>{n.med.form}</p>
        <p>Дома сейчас: {items.find((item) => item.key === medKey(n.med))?.qty ?? 0} {n.med.unit}</p>
        <div className="formula">На курс {n.needed} − пригодно на курс {n.qty} = <strong>докупить {n.missing} {n.med.unit}</strong></div>
        {n.packs && <p>{n.packs} уп. по {n.pack} шт.</p>}
        {canEdit && <Button kind="soft" onClick={() => onAdd(`${n.med.name} ${n.med.strength}`)}>Пополнить аптечку</Button>}
      </div>) : <Empty title="Всего хватает">Запаса достаточно на оставшийся курс</Empty>}</div>
      <div className="space"><Button kind="white" onClick={onShare}><Icon name="send" />Отправить список покупок</Button></div>
    </>}
  </>;
}
