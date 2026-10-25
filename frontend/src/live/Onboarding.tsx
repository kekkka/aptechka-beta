import {useState, type FormEvent} from 'react';
import type {Api, Me} from '../api/index.ts';
import {Icon} from '../components/Icon.tsx';
import {Field, Hint} from '../components/ui.tsx';
import {errorText} from './hooks.ts';

// First run without any care profile: either start one as the organiser,
// or wait until the organiser adds this account by e-mail.
export function Onboarding({api, me, onCreated, onRefresh, onLogout}: {api: Api; me: Me; onCreated: (id: string) => void; onRefresh: () => void; onLogout: () => void}) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget), year = String(f.get('birthYear'));
    setBusy(true);
    try {
      const p = await api.care.createPatient({name: String(f.get('name')).trim(), birthYear: year ? Number(year) : null, relation: String(f.get('relation')).trim() || undefined});
      onCreated(p.id);
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };
  return (
    <>
      <div className="page-head">
        <h1>Здравствуйте, {me.displayName}!</h1>
        <p>Создайте профиль близкого, о ком заботитесь, или дождитесь приглашения.</p>
      </div>
      <form className="card padded" onSubmit={submit}>
        <h2>Я организую уход</h2>
        <p className="caption">Вы станете организатором: добавите назначения, аптечку и пригласите сиделку и родных.</p>
        <Field label="Имя близкого" name="name" required maxLength={100} placeholder="Нина Петровна" />
        <div className="field-grid">
          <Field label="Год рождения" name="birthYear" type="number" min={1900} max={2100} />
          <Field label="Кем вы приходитесь" name="relation" maxLength={60} placeholder="Дочь" />
        </div>
        {error && <div className="error" role="alert">{error}</div>}
        <button className="btn btn-primary btn-full" disabled={busy}><Icon name="plus" /> Создать профиль</button>
      </form>
      <Hint icon="users" className="space">
        Если вы сиделка, родственник или сам подопечный, попросите организатора добавить вас по почте <strong>{me.email}</strong>.
      </Hint>
      <button className="btn btn-white btn-full space" onClick={onRefresh}>Меня уже добавили, обновить</button>
      <button className="text-link space" onClick={onLogout}>Выйти</button>
    </>
  );
}
