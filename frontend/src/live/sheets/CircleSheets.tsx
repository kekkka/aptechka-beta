import {useState, type FormEvent} from 'react';
import type {CareMember, CareRole} from '../../api/index.ts';
import {Sheet} from '../../components/Sheet.tsx';
import {Field, Hint} from '../../components/ui.tsx';
import {ROLE_LABEL, ROLE_RIGHTS} from '../format.ts';
import {useAction} from '../hooks.ts';
import {useLive} from '../LiveContext.ts';

const ASSIGNABLE: CareRole[] = ['CAREGIVER', 'FAMILY', 'PATIENT'];

export function MemberSheet({member}: {member?: CareMember}) {
  const {api, patientId, closeSheet, refresh, toast} = useLive(), {busy, act} = useAction(toast);
  const [role, setRole] = useState<CareRole>(member?.role ?? 'CAREGIVER');
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget), relation = String(f.get('relation')).trim() || undefined;
    act(() => member ? api.care.updateMember(patientId, member.id, {role, relation}) : api.care.addMember(patientId, {email: String(f.get('email')).trim(), role, relation}),
      member ? 'Роль изменена' : 'Добавлен в круг заботы').then(r => { if (r) { closeSheet(); refresh(); } });
  };
  return (
    <Sheet title={member ? member.displayName : 'Добавить в круг заботы'} subtitle={member?.email} onClose={closeSheet}
      footer={<><button className="btn btn-white" onClick={closeSheet}>Отмена</button><button className="btn btn-primary" form="memberForm" disabled={busy}>Сохранить</button></>}>
      <form id="memberForm" onSubmit={submit}>
        {!member && <Field label="Почта, с которой человек зарегистрировался" name="email" type="email" required maxLength={254} />}
        <div className="card">
          {ASSIGNABLE.map(r => (
            <label key={r} className="check-row live-role">
              <input type="radio" name="role" checked={role === r} onChange={() => setRole(r)} />
              <span><strong>{ROLE_LABEL[r]}</strong><br /><small>{ROLE_RIGHTS[r]}</small></span>
            </label>
          ))}
        </div>
        <Field label="Кем приходится" name="relation" defaultValue={member?.relation ?? ''} maxLength={60} placeholder={role === 'CAREGIVER' ? 'Сиделка' : 'Внук'} />
      </form>
      {role === 'PATIENT' && <Hint icon="info">У подопечного будет облегчённый экран: только его приёмы, кнопка «Мне плохо», самочувствие и давление.</Hint>}
    </Sheet>
  );
}

export function ProfileSheet() {
  const {api, patientId, patient, closeSheet, refresh, reloadMe, toast} = useLive(), {busy, act} = useAction(toast);
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget), year = String(f.get('birthYear'));
    act(() => api.care.updatePatient(patientId, {
      name: String(f.get('name')).trim(), birthYear: year ? Number(year) : null, notes: String(f.get('notes')).trim() || null, graceMinutes: Number(f.get('graceMinutes'))
    }), 'Профиль сохранён').then(r => {
      if (!r) return;
      closeSheet();
      refresh();
      reloadMe();
    });
  };
  return (
    <Sheet title="Профиль близкого" onClose={closeSheet}
      footer={<><button className="btn btn-white" onClick={closeSheet}>Отмена</button><button className="btn btn-primary" form="profileForm" disabled={busy}>Сохранить</button></>}>
      <form id="profileForm" onSubmit={submit}>
        <Field label="Имя" name="name" defaultValue={patient.name} required maxLength={100} />
        <div className="field-grid">
          <Field label="Год рождения" name="birthYear" type="number" min={1900} max={2100} defaultValue={patient.birthYear ?? ''} />
          <Field label="Сигнал, если нет отметки, мин" name="graceMinutes" type="number" min={5} max={240} defaultValue={patient.graceMinutes} required />
        </div>
        <label className="field"><span>Важное для всех (аллергии, диагнозы, контакты врача)</span>
          <textarea name="notes" defaultValue={patient.notes ?? ''} maxLength={1000} rows={4} />
        </label>
      </form>
    </Sheet>
  );
}
