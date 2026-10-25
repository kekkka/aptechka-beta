import {useApp} from '../AppContext.jsx';
import {Icon} from '../components/Icon.jsx';
import {Sheet} from '../components/Sheet.jsx';
import {Avatar, CheckRow, Field, Hint} from '../components/ui.jsx';
import {actor, isOwner} from '../lib/domain.js';
import {invite, savePatient, saveSignalSettings, setPermission, setRole} from '../lib/mutations.js';

export function RolesSheet() {
  const {state, commit, closeSheet, navigate} = useApp();
  const choose = id => {
    if (!commit(s => setRole(s, id))) return;
    closeSheet();
    navigate('home');
  };
  return (
    <Sheet title="Посмотреть с другой стороны" subtitle="Демонстрация ролей в одном браузере.">
      {state.members.filter(m => m.view).map(m => (
        <button key={m.id} className={'role-choice ' + (state.role === m.id ? 'selected' : '')} onClick={() => choose(m.id)}>
          <Avatar member={m} />
          <div>
            <h3>{m.name}</h3>
            <p>{m.relation} · {m.role === 'owner' ? 'организует уход' : m.mark ? 'может отмечать приёмы' : 'смотрит план и журнал'}</p>
          </div>
        </button>
      ))}
      <button className="role-choice" onClick={() => choose('senior')}>
        <span className="avatar rose">Н</span>
        <div><h3>{state.patient.name}</h3><p>Крупный интерфейс для самого близкого</p></div>
      </button>
      <p className="caption">Это не авторизация. В реальном сервисе роли доступны только после входа и проверки доступа.</p>
    </Sheet>
  );
}

export function ContactSheet() {
  const {state, openSheet} = useApp(), me = actor(state).id;
  return (
    <Sheet title="Связаться с тем, кто рядом" subtitle="В демо используются вымышленные люди.">
      {state.members.filter(m => m.view && m.id !== me).map(m => (
        <div className="responsible" key={m.id}>
          <Avatar member={m} />
          <div className="grow"><strong>{m.name}</strong><p>{m.relation}</p></div>
          <button className="btn btn-soft btn-small" onClick={() => openSheet('demoCall', {name: m.name})}><Icon name="phone" /> Позвонить</button>
        </div>
      ))}
      <p className="caption">Демо-звонки показывают сценарий связи. Телефонные номера и отправка сообщений не подключены.</p>
    </Sheet>
  );
}

export function DemoCallSheet({name}) {
  const {closeSheet} = useApp();
  return (
    <Sheet title="Демо-звонок" subtitle={name} footer={<button className="btn btn-primary" onClick={closeSheet}>Понятно</button>}>
      <div className="empty">
        <div className="empty-illustration"><Icon name="phone" /></div>
        <h3>Связаться с близким</h3>
        <p>Здесь семья переходит к звонку ответственному. В прототипе звонок не совершается.</p>
      </div>
    </Sheet>
  );
}

const PERMISSIONS = [['view', 'Смотреть план и журнал'], ['mark', 'Отмечать приёмы'], ['stock', 'Менять остатки и покупки'], ['alerts', 'Получать сигналы']];

export function PermissionsSheet({id}) {
  const {state, commit, closeSheet} = useApp(), m = state.members.find(m => m.id === id);
  if (!isOwner(state) || !m || m.role === 'owner') return null;
  return (
    <Sheet title={'Доступ: ' + m.name} subtitle={m.relation} footer={<button className="btn btn-primary" onClick={closeSheet}>Готово</button>}>
      <div className="permissions">
        {PERMISSIONS.map(([key, label]) => (
          <label className="permission" key={key}>
            {label}
            <input type="checkbox" className="switch" checked={!!m[key]} disabled={key !== 'view' && !m.view} onChange={e => commit(s => setPermission(s, id, key, e.target.checked))} />
          </label>
        ))}
      </div>
      <p className="caption">Изменения применяются сразу к демонстрационной роли. Отзыв просмотра отключает остальные права.</p>
    </Sheet>
  );
}

export function InviteSheet() {
  const {state, commit, closeSheet, toast} = useApp();
  if (!isOwner(state)) return null;
  const submit = ev => {
    ev.preventDefault();
    const d = new FormData(ev.currentTarget);
    const ok = commit(s => invite(s, {name: String(d.get('name') || '').trim(), role: String(d.get('role')), basis: String(d.get('basis') || ''), consent: d.has('consent')}));
    if (!ok) return;
    closeSheet();
    toast('Участник добавлен локально. Приглашение не отправлялось.');
  };
  return (
    <Sheet
      title="Добавить в круг заботы"
      subtitle="Выберите роль и основание доступа."
      footer={<>
        <button className="btn btn-white" onClick={closeSheet}>Отмена</button>
        <button className="btn btn-primary" form="inviteForm" type="submit">Добавить</button>
      </>}
    >
      <form id="inviteForm" onSubmit={submit}>
        <Field label="Имя" name="name" required maxLength={40} />
        <label className="field"><span>Роль</span><select name="role"><option value="family">Родственник</option><option value="caregiver">Сиделка</option></select></label>
        <label className="field">
          <span>Основание доступа</span>
          <select name="basis" required defaultValue=""><option value="">Выберите</option><option>Есть согласие близкого</option><option>Есть полномочия законного представителя</option></select>
        </label>
        <CheckRow name="consent" required>Подтверждаю основание. Разрешаю просмотр плана и журнала; дополнительные права настрою отдельно.</CheckRow>
        <p className="caption">Будет добавлен локальный демо-участник. Приглашение не отправляется.</p>
      </form>
    </Sheet>
  );
}

export function SignalSettingsSheet() {
  const {state, commit, closeSheet, toast} = useApp(), owner = isOwner(state);
  const submit = ev => {
    ev.preventDefault();
    const d = new FormData(ev.currentTarget);
    if (!commit(s => saveSignalSettings(s, {grace: Number(d.get('grace')), backup: String(d.get('backup'))}))) return;
    closeSheet();
    toast('Настройки сигналов сохранены.');
  };
  return (
    <Sheet
      title="Настройки сигналов"
      subtitle="Кому сообщить, если приём не отмечен."
      footer={owner ? <button className="btn btn-primary" type="submit" form="signalSettings">Сохранить</button> : <button className="btn btn-white" onClick={closeSheet}>Закрыть</button>}
    >
      <form id="signalSettings" onSubmit={submit}>
        <label className="field">
          <span>Сигнал через</span>
          <select name="grace" disabled={!owner} defaultValue={state.settings.grace}>
            {[15, 30, 60].map(n => <option key={n} value={n}>{n} минут без отметки</option>)}
          </select>
        </label>
        <label className="field">
          <span>Резервный ответственный</span>
          <select name="backup" disabled={!owner} defaultValue={state.settings.backup}>
            {state.members.filter(m => m.view && m.role !== 'caregiver').map(m => <option key={m.id} value={m.id}>{m.name} · {m.relation}</option>)}
          </select>
        </label>
        <Hint tone="gray" icon="bell">Сигнал виден в приложении. Если ещё 30 минут нет отметки и никто не взял ситуацию в работу — добавляется резервный ответственный.</Hint>
        <p className="caption">В демо нет отправки push, SMS и звонков. Реальная доставка — часть серверного MVP.</p>
      </form>
    </Sheet>
  );
}

export function PatientSheet() {
  const {state, commit, closeSheet, toast} = useApp(), owner = isOwner(state), p = state.patient;
  const submit = ev => {
    ev.preventDefault();
    const d = new FormData(ev.currentTarget), text = k => String(d.get(k) || '').trim();
    if (!commit(s => savePatient(s, {name: text('name'), city: text('city'), short: text('short'), age: Number(d.get('age'))}))) return;
    closeSheet();
    toast('Профиль близкого обновлён.');
  };
  return (
    <Sheet
      title="Профиль близкого"
      subtitle="Один родственник в этом прототипе."
      footer={owner ? <button className="btn btn-primary" type="submit" form="patientForm">Сохранить</button> : <button className="btn btn-white" onClick={closeSheet}>Закрыть</button>}
    >
      <form id="patientForm" onSubmit={submit}>
        <Field label="Имя" name="name" defaultValue={p.name} required maxLength={60} disabled={!owner} />
        <div className="field-grid">
          <Field label="Возраст" name="age" type="number" defaultValue={p.age} required min={18} max={120} disabled={!owner} />
          <Field label="Город" name="city" defaultValue={p.city} required maxLength={50} disabled={!owner} />
        </div>
        <Field label="Как вы называете близкого" name="short" defaultValue={p.short} required maxLength={25} disabled={!owner} />
        <Hint tone="gray" icon="heart">План доступен участникам круга заботы с разрешённым доступом.</Hint>
      </form>
    </Sheet>
  );
}
