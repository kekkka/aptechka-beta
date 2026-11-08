import type { State } from "./types";
import { inventoryItems } from "./inventory";
import { Icon } from "./components";

export function StockSummary({ state, onOpen }: { state: State; onOpen: () => void }) {
  const items = inventoryItems(state);
  const needs = items.filter((item) => item.need).length;
  return <section className="stock-overview space" aria-label="Остатки лекарств дома">
    <div className="stock-overview-head"><div><span className="stock-eyebrow">ЗАПАС ЛЕКАРСТВ</span><h2>Аптечка дома</h2></div>
      <button className="icon-btn" aria-label="Открыть остатки в аптечке" onClick={onOpen}><Icon name="arrow" /></button></div>
    {items.length ? <div className="stock-overview-list">{items.slice(0, 3).map((item) => <div className="stock-overview-row" key={item.key}>
      <div><strong>{item.med.name}</strong><small>{item.med.strength} · {item.med.form}</small></div>
      <div className="stock-overview-qty"><strong>{item.qty} {item.med.unit}</strong><small>{item.need ? `Докупить ${item.need.missing} ${item.med.unit}` : "В наличии"}</small></div>
    </div>)}</div> : <p>Лекарств пока нет. Добавьте домашний запас.</p>}
    <button className="stock-overview-footer" onClick={onOpen}>{needs ? `Нужно докупить: ${needs}` : "Открыть аптечку"}{items.length > 3 && ` · Все позиции (${items.length})`}<Icon name="chevron" /></button>
  </section>;
}
