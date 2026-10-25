import {useState} from 'react';
import {useApp} from '../AppContext.ts';
import {Icon} from '../components/Icon.tsx';
import {Empty, Footer, Hint, IconButton, PageHead} from '../components/ui.tsx';
import {canStock, shopping, type ShoppingItem} from '../lib/domain.ts';
import {exportShopping} from '../lib/exports.ts';
import {fmt, medKey, norm} from '../lib/utils.ts';

export function StockView() {
  const {state, openSheet, stockTab, setStockTab} = useApp(), list = shopping(state);
  return <>
    <PageHead
      title="Аптечка мамы"
      subtitle="Остатки дома и покупки на текущий курс."
      action={canStock(state) && <IconButton icon="plus" label="Добавить препарат" onClick={() => openSheet('stock')} />}
    />
    <div className="segmented">
      <button className={stockTab === 'stock' ? 'active' : ''} onClick={() => setStockTab('stock')}>Дома · {state.stock.length}</button>
      <button className={stockTab === 'buy' ? 'active' : ''} onClick={() => setStockTab('buy')}>Докупить · {list.length}</button>
    </div>
    {stockTab === 'stock' ? <StockList shortages={list} /> : <ShoppingList list={list} />}
    <Footer />
  </>;
}

function StockList({shortages}: {shortages: ShoppingItem[]}) {
  const {state, openSheet} = useApp(), [query, setQuery] = useState('');
  const rows = state.stock.filter(s => norm(s.name + s.strength).includes(norm(query)));
  return <>
    <label className="search"><Icon name="search" /><input aria-label="Найти препарат" placeholder="Название препарата" value={query} onChange={e => setQuery(e.target.value)} /></label>
    <div className="card">
      {rows.length ? rows.map(s => (
        <div className="list-item" key={s.id}>
          <span className="med-icon"><Icon name="pill" /></span>
          <div className="grow">
            <h3>{s.name}</h3>
            <p>{s.strength} · {s.form}</p>
            <p className="caption">{s.expiry ? 'Годен до ' + fmt(s.expiry) : 'Срок годности не проверен'}</p>
            {shortages.some(n => n.stock?.id === s.id) && <span className="label orange" style={{marginTop: 7}}>На курс не хватит</span>}
          </div>
          <div className="qty">{s.qty}<small>{s.unit}</small></div>
          {canStock(state) && <button className="ghost" onClick={() => openSheet('stock', {id: s.id})} aria-label={`Изменить ${s.name}`}><Icon name="edit" /></button>}
        </div>
      )) : <Empty title="Ничего не найдено">Добавьте препарат или измените поиск.</Empty>}
    </div>
    <p className="caption">При подтверждении приёма остаток уменьшается один раз. Отмена отметки возвращает списанное количество.</p>
  </>;
}

function ShoppingList({list}: {list: ShoppingItem[]}) {
  const {state, openSheet} = useApp();
  return <>
    <Hint icon="bag">Учитываем оставшиеся приёмы, точное название, форму и дозировку. Если размер упаковки известен, округляем до целых упаковок. Запас с истекающим до конца курса сроком не учитываем.</Hint>
    <div className="card space">
      {list.length ? list.map(n => (
        <div className="buy-card" key={medKey(n.med)}>
          <div className="row">
            <span className={'med-icon ' + (n.med.color || '')}><Icon name="pill" /></span>
            <div className="grow"><h3>{n.med.name}</h3><p>{n.med.strength} · {n.med.form}</p></div>
            <span className="label orange">{n.packs ? n.packs + ' уп.' : n.missing + ' ' + n.med.unit}</span>
          </div>
          <div className="formula">Нужно {n.needed} − дома {n.qty} = <strong>{n.missing} {n.med.unit}</strong></div>
          <div className="between">
            <span className="small muted">{n.pack ? `По ${n.pack} ${n.med.unit} в упаковке` : 'Размер упаковки не указан'}</span>
            {canStock(state) && <button className="btn btn-soft btn-small" onClick={() => openSheet('buy', {medKey: medKey(n.med)})}><Icon name="check" /> Куплено</button>}
          </div>
        </div>
      )) : <Empty title="Запасов хватает">По текущим данным покупать больше не нужно.</Empty>}
    </div>
    <button className="btn btn-white btn-full space" onClick={() => exportShopping(state)}><Icon name="download" /> Скачать список покупок</button>
  </>;
}
