import {useApp} from '../AppContext.jsx';
import {Icon} from '../components/Icon.jsx';
import {Sheet} from '../components/Sheet.jsx';
import {Hint} from '../components/ui.jsx';
import {isOwner, memberName} from '../lib/domain.js';
import {exportHistory} from '../lib/exports.js';
import {advanceClock, endCourse} from '../lib/mutations.js';
import {fmt, hm} from '../lib/utils.js';

export function ClockSheet() {
  const {state, commit, closeSheet, toast} = useApp();
  const advance = minutes => {
    const r = commit(s => advanceClock(s, minutes));
    if (!r) return;
    closeSheet();
    toast('Демо-время: ' + hm(Math.min(1439, state.clock + minutes)) + '. Сигналы пересчитаны.');
  };
  return (
    <Sheet title="Демонстрационное время" subtitle={`${fmt(state.day)} · ${hm(state.clock)}`}>
      <p className="small muted">Время фиксировано для понятного показа сценария. Можно продвинуть его и увидеть новые сигналы и напоминания.</p>
      <div className="stack space">
        <button className="btn btn-soft" onClick={() => advance(30)}>Продвинуть на 30 минут</button>
        <button className="btn btn-white" onClick={() => advance(60)}>Продвинуть на час</button>
      </div>
      <p className="caption">Демонстрация не отправляет уведомления за пределы приложения.</p>
    </Sheet>
  );
}

export function AboutSheet() {
  const {openSheet, closeSheet} = useApp();
  return (
    <Sheet
      title="Аптечка для семьи"
      subtitle="Рядом с близким, даже если вы в другом городе."
      footer={<>
        <button className="btn btn-white" onClick={() => openSheet('reset')}>Сбросить демо</button>
        <button className="btn btn-primary" onClick={closeSheet}>Понятно</button>
      </>}
    >
      <div className="mini-article">
        <p><strong>Что работает:</strong> мобильный план родственника, распознавание печатных фото и PDF на устройстве, извлечение полей, проверка каждого препарата, отметки с автором и источником, сигналы, ответственный за проверку, журнал, остатки, докупка и права ролей.</p>
        <p><strong>Что демонстрируется:</strong> роли в одном браузере, запросы сиделке и звонки, время для сигналов. Реальные аккаунты, push и семейная синхронизация не подключены.</p>
        <p><strong>Что дальше:</strong> интеграции устройств, голосовых колонок и работа с видео. Отметка человека сейчас не представляется объективным подтверждением приёма.</p>
        <p><strong>Хранение:</strong> локально в браузере. Исходные файлы и текст обрабатываются в этой вкладке и не отправляются на сервер. После импорта сохраняется только проверенный план. OCR может ошибаться; сложные схемы требуют уточнения. Поддерживается ежедневная схема постоянной дозы таблеток/капсул до 90 дней.</p>
        <a className="text-link" href="analysis.html" target="_blank">Сводка материалов и состав MVP <Icon name="arrow" /></a>
      </div>
    </Sheet>
  );
}

export function ResetSheet() {
  const {state, closeSheet, resetDemo} = useApp();
  return (
    <Sheet
      title="Начать демо заново?"
      subtitle="Все изменения этого прототипа в браузере будут сброшены."
      footer={<>
        <button className="btn btn-white" onClick={closeSheet}>Отмена</button>
        <button className="btn btn-danger" onClick={resetDemo}>Сбросить</button>
      </>}
    >
      <p className="small muted">Перед сбросом можно скачать журнал заботы.</p>
      <button className="text-link space" onClick={() => exportHistory(state)}><Icon name="download" /> Скачать журнал</button>
    </Sheet>
  );
}

export function EndCourseSheet({id}) {
  const {state, commit, closeSheet, toast} = useApp(), c = state.courses.find(c => c.id === id);
  if (!isOwner(state) || !c) return null;
  const confirm = () => {
    if (!commit(s => endCourse(s, id))) return;
    closeSheet();
    toast('Курс завершён, журнал сохранён.');
  };
  return (
    <Sheet
      title="Завершить курс?"
      subtitle={c.title}
      footer={<>
        <button className="btn btn-white" onClick={closeSheet}>Отмена</button>
        <button className="btn btn-primary" onClick={confirm}>Завершить</button>
      </>}
    >
      <p className="small muted">Приёмы исчезнут из расписания. История семьи сохранится. Завершайте курс в соответствии с назначением врача.</p>
    </Sheet>
  );
}

export function LaunchedSheet({courseId}) {
  const {state, closeSheet, go, setStockTab} = useApp(), c = state.courses.find(c => c.id === courseId);
  if (!c) return null;
  return (
    <Sheet
      title="План запущен"
      subtitle="От назначения до ежедневной заботы."
      footer={<>
        <button className="btn btn-white" onClick={() => {
          setStockTab('buy');
          go('stock');
        }}>Что докупить</button>
        <button className="btn btn-primary" onClick={closeSheet}>Открыть план</button>
      </>}
    >
      <div className="launch-summary">
        <span className="scan-symbol"><Icon name="check" /></span>
        <h3>{c.title}</h3>
        <p>Расписание и покупки сохранены.<br />Приёмы доступны для отметок и контроля.</p>
      </div>
      <Hint icon="users">{c.helper ? `${memberName(state, c.helper, 'Помощник')} может посмотреть план в своей демо-роли.` : 'План доступен организатору ухода.'}</Hint>
    </Sheet>
  );
}
