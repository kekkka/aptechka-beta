import {useApp} from '../AppContext.ts';
import {Footer, Hint, IconButton, PageHead} from '../components/ui.tsx';
import {visibleAudit} from '../lib/domain.ts';
import {exportHistory} from '../lib/exports.ts';
import {fmt} from '../lib/utils.ts';

export function HistoryView() {
  const {state} = useApp();
  return <>
    <PageHead
      title="Журнал заботы"
      subtitle="Кто, когда и на каком основании сделал отметку."
      back
      action={<IconButton icon="download" label="Скачать журнал" onClick={() => exportHistory(state)} />}
    />
    <Hint tone="gray" icon="users">«Наблюдала лично» — заявление автора отметки. Данных с устройств или видео в этом MVP нет.</Hint>
    <div className="history">
      {visibleAudit(state).map(a => (
        <div className="history-item" key={a.id}>
          <strong>{a.title}</strong>
          <p>{a.detail}</p>
          <p>{fmt(a.date)} · {a.time}</p>
        </div>
      ))}
    </div>
    <Footer />
  </>;
}
