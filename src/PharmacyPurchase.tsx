import { useState } from "react";
import type { State } from "./types";
import { medKey, shopping } from "./model";
import { Button, Icon } from "./components";

export function PharmacyPurchase({ state, mode }: { state: State; mode: "buy" | "nearby" }) {
  const [preview, setPreview] = useState(false);
  const needs = shopping(state);
  const provider = "СберЗдоровье";
  return <div className="pharmacy-integration-preview">
    <div className="pharmacy-partner-card">
      <img src="./integrations/sber-health.jpg" alt="" width={900} height={600} />
      <div><span className="pharmacy-partner-eyebrow">ИНТЕГРАЦИЯ С СЕРВИСОМ</span><h3>{provider}</h3>
        <p>{mode === "nearby" ? "Подбор аптек по вашему списку лекарств" : "Покупка лекарств из списка"}</p></div>
    </div>
    <p className="pharmacy-integration-description">{mode === "nearby"
      ? "Выбор ближайшей аптеки, проверка наличия и заказ — во внешнем сервисе. Аптечка подготовит список нужных лекарств."
      : "Аптечка подготовит список лекарств для покупки во внешнем сервисе."}</p>
    <div className="pharmacy-transfer-heading"><h3>Список для передачи</h3><span>{needs.length} поз.</span></div>
    <ul className="pharmacy-shopping-list">{needs.map((need) => <li key={medKey(need.med)}>
      <span><strong>{need.med.name}</strong><small>{need.med.strength} · {need.med.form.toLocaleLowerCase("ru")}</small></span>
      <span className="pharmacy-shopping-amount"><strong>{need.packs ? `${need.packs} уп.` : `${need.missing} ${need.med.unit}`}</strong></span>
    </li>)}</ul>
    <Button disabled={!needs.length} onClick={() => setPreview(true)}><Icon name="arrow" />Перейти в {provider}</Button>
    {preview && <div className="hint space" role="status"><Icon name="info" /><span>Демо интеграции: здесь откроется {provider} с вашим списком. Подключение сервиса пока не выполнено, данные не отправлены.</span></div>}
    <p className="pharmacy-integration-demo">Демонстрация перехода во внешний сервис</p>
  </div>;
}
