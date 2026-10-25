import type {CareMember} from '../../api/index.ts';
import {Icon} from '../../components/Icon.tsx';
import {Hint, IconButton} from '../../components/ui.tsx';
import {ROLE_LABEL, ROLE_RIGHTS} from '../format.ts';
import {useAction, useLoad} from '../hooks.ts';
import {useLive} from '../LiveContext.ts';
import {MemberSheet, ProfileSheet} from '../sheets/CircleSheets.tsx';
import {Head, Loading} from '../ui.tsx';

export function CircleView() {
  const {api, me, patientId, patient, can, version, refresh, toast, openSheet, logout} = useLive(), {busy, act} = useAction(toast);
  const members = useLoad(() => api.care.members(patientId), [patientId, version]);
  const remove = (m: CareMember) => confirm(`Убрать ${m.displayName} из круга заботы? Доступ к профилю пропадёт сразу.`)
    && act(() => api.care.removeMember(patientId, m.id), 'Доступ отозван').then(refresh);

  return <>
    <Head title="Круг заботы" subtitle="У каждого своя роль. У семьи — общая картина."
      action={can('MANAGE') && <IconButton icon="plus" label="Добавить в круг заботы" onClick={() => openSheet(<MemberSheet />)} />} />
    <section className="card padded">
      <div className="between">
        <div><h2>{patient.name}</h2><p className="caption">{patient.birthYear ? `${patient.birthYear} г. р. · ` : ''}сигнал, если нет отметки {patient.graceMinutes} мин</p></div>
        {can('MANAGE') && <button className="text-link" onClick={() => openSheet(<ProfileSheet />)}>Изменить</button>}
      </div>
      {patient.notes && <p className="caption">{patient.notes}</p>}
    </section>
    <Hint icon="shield" className="space">Доступ предоставляется с согласия близкого или на основании полномочий законного представителя.</Hint>
    <Loading error={members.error} loading={members.loading && !members.data} onRetry={members.reload} />
    <div className="card space">
      {members.data?.map(m => (
        <section className="person-card" key={m.id}>
          <div className="row">
            <span className={'avatar' + (m.role === 'CAREGIVER' ? ' sand' : '')}>{m.displayName.slice(0, 1)}</span>
            <div className="grow">
              <h3>{m.displayName} {m.userId === me.id && <span className="label gray">Вы</span>}</h3>
              <p>{ROLE_LABEL[m.role]}{m.relation ? ' · ' + m.relation : ''}</p>
            </div>
            {can('MANAGE') && m.role !== 'OWNER' && <button className="text-link" onClick={() => openSheet(<MemberSheet member={m} />)}>Роль</button>}
            {can('MANAGE') && m.role !== 'OWNER' && <button className="ghost" disabled={busy} onClick={() => remove(m)} aria-label={`Убрать ${m.displayName}`}><Icon name="trash" /></button>}
          </div>
          <p className="caption">{ROLE_RIGHTS[m.role]}</p>
        </section>
      ))}
    </div>
    <p className="caption">Чтобы добавить человека, он сначала создаёт аккаунт, затем организатор добавляет его по почте. Ваша почта: {me.email}</p>
    <button className="btn btn-white btn-full space" onClick={logout}>Выйти из аккаунта</button>
  </>;
}
