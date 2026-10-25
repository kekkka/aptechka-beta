import {useApp} from '../AppContext.ts';
import {Icon} from '../components/Icon.tsx';
import {ActivityRow, Avatar, Footer, Hint, IconButton, PageHead} from '../components/ui.tsx';
import {isOwner, visibleAudit} from '../lib/domain.ts';

export function FamilyView() {
  const {state, openSheet, go} = useApp(), owner = isOwner(state);
  return <>
    <PageHead
      title="Круг заботы"
      subtitle="У каждого своя роль. У семьи — общая картина."
      action={owner && <IconButton icon="plus" label="Добавить помощника" onClick={() => openSheet('invite')} />}
    />
    <Hint icon="shield">Доступ предоставляется с согласия близкого или на основании полномочий законного представителя.</Hint>
    <div className="card space">
      {state.members.map(m => (
        <section className="person-card" key={m.id}>
          <div className="row">
            <Avatar member={m} />
            <div className="grow">
              <h3>{m.name} {m.id === state.role && <span className="label gray">Вы</span>}</h3>
              <p>{m.relation} · {m.role === 'owner' ? 'организатор ухода' : m.view ? 'доступ разрешён' : 'доступ отозван'}</p>
            </div>
            {owner && m.role !== 'owner' && <button className="text-link" onClick={() => openSheet('permissions', {id: m.id})}>Права</button>}
          </div>
          {m.role === 'caregiver' && <p className="caption">Отмечает помощь и способ подтверждения. Все действия сохраняются в журнале.</p>}
        </section>
      ))}
    </div>
    <button className="btn btn-white btn-full space" onClick={() => openSheet('roles')}><Icon name="eye" /> Посмотреть глазами близкого или сиделки</button>
    <div className="section-top between"><h2>Последние действия</h2><button className="text-link" onClick={() => go('history')}>Все <Icon name="arrow" /></button></div>
    <div className="card">{visibleAudit(state).slice(0, 3).map(a => <ActivityRow key={a.id} a={a} />)}</div>
    <p className="caption">Роли переключаются в этом браузере для демонстрации. Реальные приглашения и синхронизация между людьми не подключены.</p>
    <Footer />
  </>;
}
