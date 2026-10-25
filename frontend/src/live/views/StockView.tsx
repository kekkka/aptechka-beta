import {useState} from 'react';
import type {ShoppingItem, StockItem} from '../../api/index.ts';
import {Icon} from '../../components/Icon.tsx';
import {Empty, Hint, IconButton} from '../../components/ui.tsx';
import {download, norm} from '../../lib/utils.ts';
import {num, shortDate} from '../format.ts';
import {useLoad} from '../hooks.ts';
import {useLive} from '../LiveContext.ts';
import {ScanSheet} from '../sheets/ScanSheet.tsx';
import {StockSheet} from '../sheets/StockSheet.tsx';
import {Head, Loading} from '../ui.tsx';

export function StockView() {
  const {api, patientId, patient, can, version, openSheet} = useLive();
  const [tab, setTab] = useState<'stock' | 'buy'>('stock');
  const stock = useLoad(() => api.care.stock(patientId), [patientId, version]);
  const buy = useLoad(() => api.care.shopping(patientId), [patientId, version]);
  return <>
    <Head title={`Аптечка: ${patient.name}`} subtitle="Остатки дома и покупки на текущие курсы."
      action={can('EDIT_STOCK') && <IconButton icon="plus" label="Добавить вручную" onClick={() => openSheet(<StockSheet />)} />} />
    {can('EDIT_STOCK') && (
      <button className="import-entry" onClick={() => openSheet(<ScanSheet />)}>
        <span className="scan-symbol"><Icon name="camera" /></span>
        <span><strong>Сканировать упаковку</strong><small>Штрихкод или DataMatrix → в аптечку</small></span>
        <span className="import-entry-arrow"><Icon name="arrow" /></span>
      </button>
    )}
    <div className="segmented">
      <button className={tab === 'stock' ? 'active' : ''} onClick={() => setTab('stock')}>Дома · {stock.data?.length ?? '…'}</button>
      <button className={tab === 'buy' ? 'active' : ''} onClick={() => setTab('buy')}>Докупить · {buy.data?.length ?? '…'}</button>
    </div>
    {tab === 'stock' ? <>
      <Loading error={stock.error} loading={stock.loading && !stock.data} onRetry={stock.reload} />
      {stock.data && <StockList items={stock.data} />}
    </> : <>
      <Loading error={buy.error} loading={buy.loading && !buy.data} onRetry={buy.reload} />
      {buy.data && <ShoppingList list={buy.data} />}
    </>}
  </>;
}

function StockList({items}: {items: StockItem[]}) {
  const {can, openSheet} = useLive();
  const [query, setQuery] = useState('');
  const rows = items.filter(s => norm(s.name + ' ' + s.strength).includes(norm(query)));
  return <>
    <label className="search"><Icon name="search" /><input aria-label="Найти препарат" placeholder="Название препарата" value={query} onChange={e => setQuery(e.target.value)} /></label>
    <div className="card">
      {rows.length ? rows.map(s => (
        <div className="list-item" key={s.id}>
          <span className="med-icon"><Icon name="pill" /></span>
          <div className="grow">
            <h3>{s.name}</h3>
            <p>{s.strength} · {s.form}{s.packSize ? ` · по ${s.packSize} в уп.` : ''}</p>
            <p className="caption">{s.expiry ? 'Годен до ' + shortDate(s.expiry) : 'Срок годности не указан'}</p>
            {(s.expired || s.expiresSoon) && <span className={'label ' + (s.expired ? 'red' : 'orange')} style={{marginTop: 7}}>{s.expired ? 'Срок истёк' : 'Скоро истекает'}</span>}
          </div>
          <div className="qty">{num(s.qty)}<small>{s.unit}</small></div>
          {can('EDIT_STOCK') && <button className="ghost" onClick={() => openSheet(<StockSheet item={s} />)} aria-label={`Изменить ${s.name}`}><Icon name="edit" /></button>}
        </div>
      )) : <Empty title={query ? 'Ничего не найдено' : 'Аптечка пока пуста'}>{can('EDIT_STOCK') ? 'Отсканируйте упаковку или добавьте препарат вручную.' : ''}</Empty>}
    </div>
    <p className="caption">При отметке «Принято» остаток уменьшается автоматически, отмена отметки возвращает его.</p>
  </>;
}

function shoppingText(name: string, list: ShoppingItem[]) {
  const lines = list.map(n => `• ${n.name} ${n.strength}, ${n.form}: ${n.packs ? `${n.packs} уп. по ${n.packSize}` : `${num(n.missing)} ${n.unit}`}`);
  return `Купить для: ${name}\n${lines.join('\n')}`;
}

function ShoppingList({list}: {list: ShoppingItem[]}) {
  const {patient, toast} = useLive(), text = shoppingText(patient.name, list);
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({title: 'Список покупок', text});
      else {
        await navigator.clipboard.writeText(text);
        toast('Список скопирован: вставьте его в мессенджер');
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') toast('Не удалось поделиться. Скачайте список файлом.');
    }
  };
  return <>
    <Hint icon="bag">Считаем оставшиеся приёмы активных курсов и вычитаем то, что есть дома. Просроченные упаковки не учитываются.</Hint>
    <div className="card space">
      {list.length ? list.map(n => (
        <div className="buy-card" key={n.name + n.strength + n.form}>
          <div className="row">
            <span className="med-icon"><Icon name="pill" /></span>
            <div className="grow"><h3>{n.name}</h3><p>{n.strength} · {n.form}</p></div>
            <span className="label orange">{n.packs ? n.packs + ' уп.' : num(n.missing) + ' ' + n.unit}</span>
          </div>
          <div className="formula">Нужно {num(n.needed)} − дома {num(n.inStock)} = <strong>{num(n.missing)} {n.unit}</strong></div>
        </div>
      )) : <Empty title="Запасов хватает">По текущим курсам покупать ничего не нужно.</Empty>}
    </div>
    {list.length > 0 && <>
      <button className="btn btn-primary btn-full space" onClick={share}><Icon name="send" /> Поделиться списком</button>
      <button className="btn btn-white btn-full space" onClick={() => download('aptechka-shopping.txt', text)}><Icon name="download" /> Скачать файлом</button>
      <p className="caption">Заказ в аптеке или в Купере появится после интеграции с агрегатором; пока список можно отправить в мессенджер.</p>
    </>}
  </>;
}
