import {useEffect, useState, type FormEvent} from 'react';
import {api, type Me} from '../api/index.ts';
import {Icon} from '../components/Icon.tsx';
import {Field, Hint} from '../components/ui.tsx';
import {errorText} from './hooks.ts';

export function AuthScreen({onSignedIn, onDemo}: {onSignedIn: (me: Me) => void; onDemo: () => void}) {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [serverUp, setServerUp] = useState<boolean | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    api.health.isUp({signal: ctrl.signal}).then(setServerUp);
    return () => ctrl.abort();
  }, []);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget), email = String(f.get('email')).trim(), password = String(f.get('password'));
    setBusy(true);
    setError('');
    try {
      if (tab === 'register') await api.auth.register(email, password, String(f.get('displayName')).trim());
      onSignedIn(await api.auth.login(email, password));
    } catch (err) {
      setError((err as {unauthorized?: boolean}).unauthorized ? 'Неверная почта или пароль' : errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="app" id="app">
      <header id="header">
        <div className="between"><span className="brand"><span className="brand-mark"><Icon name="cross" /></span>аптечка</span></div>
        <div className="header-note"><span><i className="dot"></i>Рядом, даже на расстоянии</span></div>
      </header>
      <main id="main">
        <div className="page-head">
          <h1>{tab === 'login' ? 'Вход для семьи' : 'Новый аккаунт'}</h1>
          <p>Один аккаунт на человека: организатор ухода, сиделка, родственник или сам подопечный.</p>
        </div>
        <div className="segmented">
          <button className={tab === 'login' ? 'active' : ''} onClick={() => { setTab('login'); setError(''); }}>Вход</button>
          <button className={tab === 'register' ? 'active' : ''} onClick={() => { setTab('register'); setError(''); }}>Регистрация</button>
        </div>
        {serverUp === false && <Hint tone="orange" icon="alert">Сервер сейчас недоступен. Можно открыть демо без входа.</Hint>}
        <form className="card padded space" onSubmit={submit}>
          {tab === 'register' && <Field label="Как к вам обращаться" name="displayName" required maxLength={100} autoComplete="name" />}
          <Field label="Почта" name="email" type="email" required maxLength={254} autoComplete="email" />
          <Field label="Пароль" name="password" type="password" required minLength={tab === 'register' ? 8 : 1} maxLength={72}
            autoComplete={tab === 'register' ? 'new-password' : 'current-password'} />
          {error && <div className="error" role="alert">{error}</div>}
          <button className="btn btn-primary btn-full" disabled={busy}>{busy ? 'Подождите…' : tab === 'login' ? 'Войти' : 'Создать аккаунт'}</button>
        </form>
        <button className="btn btn-white btn-full space" onClick={onDemo}><Icon name="eye" /> Открыть демо без входа</button>
        <p className="caption">Демо работает в этом браузере и не требует сервера. В аккаунте данные общие для всего круга заботы.</p>
      </main>
    </div>
  );
}
