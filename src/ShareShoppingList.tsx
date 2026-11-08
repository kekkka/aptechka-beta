import { useRef, useState } from "react";
import type { State } from "./types";
import { shoppingListText } from "./shopping-list";
import { shopping } from "./model";
import { Button, Icon } from "./components";

const integrations = [
  { id: "sber-health", name: "СберЗдоровье", category: "ЗДОРОВЬЕ", description: "Забота о здоровье онлайн", image: "sber-health.jpg", preview: "Здесь появится переход к сервисам СберЗдоровья. Сейчас это демонстрационная карточка, запись на консультацию не выполняется." },
] as const;

export function ShareShoppingList({ state }: { state: State }) {
  const text = shoppingListText(state);
  const empty = !shopping(state).length;
  const preview = useRef<HTMLTextAreaElement>(null);
  const [status, setStatus] = useState("");
  const [integration, setIntegration] = useState<(typeof integrations)[number]["id"] | null>(null);
  async function copy() {
    try { await navigator.clipboard.writeText(text); setStatus("Список покупок скопирован. Можно вставить в сообщение."); }
    catch { preview.current?.focus(); preview.current?.select(); setStatus("Выделили список: скопируйте его сочетанием Ctrl+C или ⌘C."); }
  }
  async function share() {
    try { await navigator.share({ title: "Список покупок · Аптечка", text }); setStatus("Список передан в меню отправки."); }
    catch (error) { if ((error as Error).name !== "AbortError") setStatus("Не удалось открыть отправку. Скопируйте список текстом."); }
  }
  function download() {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = "Список покупок.txt"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div className="share-shopping">
    <p>Отправьте список покупок тому, кто поможет пополнить аптечку.</p>
    <label className="field space"><span>Список для отправки</span><textarea ref={preview} readOnly value={text} rows={7} /></label>
    <p className="share-check-note"><Icon name="check" /><span>Перед покупкой проверьте название, дозировку и форму на упаковке.</span></p>
    <div className="share-actions" role="group" aria-label="Действия со списком покупок">
      <Button onClick={copy} disabled={empty}><Icon name="copy" />Копировать</Button>
      {typeof navigator.share === "function" && <Button kind="soft" onClick={share} disabled={empty}><Icon name="send" />Отправить</Button>}
      <Button kind="white" onClick={download} disabled={empty}><Icon name="download" />Скачать</Button>
    </div>
    {status && <p className="share-status" role="status">{status}</p>}
    <section className="share-integrations" aria-label="Витрина сервисов">
      <div className="integration-section-heading"><div><span>ДЛЯ ВАШЕЙ АПТЕЧКИ</span><h3>Сервисы Сбера</h3></div><Icon name="bag" /></div>
      <div className="integration-storefront">
        {integrations.map((service) => <button key={service.id}
          className="integration-tile integration-tile-featured"
          aria-pressed={integration === service.id}
          aria-label={service.name}
          onClick={() => setIntegration(service.id)}>
          <img src={`./integrations/${service.image}`} alt="" width={900} height={600} loading="lazy" />
          <span className="integration-tile-copy"><span className="integration-category">{service.category}</span>
            <strong>{service.name}</strong><span className="integration-description">{service.description}</span>
            <span className="integration-tile-arrow"><Icon name="arrow" /></span>
          </span>
        </button>)}
      </div>
      {integration && <div className="hint space" role="status"><Icon name="info" /><span>{integrations.find((service) => service.id === integration)?.preview}</span></div>}
    </section>
  </div>;
}
