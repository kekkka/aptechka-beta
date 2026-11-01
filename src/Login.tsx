import { accounts } from "./model";
import { Icon } from "./components";
import type { AccountId } from "./types";
export function Login({ onSelect }: { onSelect: (id: AccountId) => void }) {
  return (
    <main className="login-page">
      <div className="login-brand">
        <span className="brand-mark">
          <Icon name="cross" />
        </span>
        <span>аптечка</span>
      </div>
      <div className="login-illustration" aria-hidden="true">
        <div className="login-orbit orbit-one" />
        <div className="login-orbit orbit-two" />
        <span className="login-heart">
          <Icon name="heart" />
        </span>
        <span className="orbit-pill">
          <Icon name="pill" />
        </span>
        <span className="orbit-shield">
          <Icon name="shield" />
        </span>
      </div>
      <div className="login-intro">
        <p className="eyebrow">РЯДОМ, ДАЖЕ НА РАССТОЯНИИ</p>
        <h1>
          Забота начинается
          <br />с простого входа
        </h1>
        <p>Выберите, под каким аккаунтом войти</p>
      </div>
      <div className="account-list" aria-label="Выбор аккаунта">
        {accounts.map((a) => (
          <button
            key={a.id}
            className={`account-card ${a.color}`}
            onClick={() => onSelect(a.id)}
          >
            <span className="account-avatar">
              <Icon name={a.icon} />
            </span>
            <span className="account-copy">
              <strong>{a.role}</strong>
              <span className="account-name">{a.name}</span>
              <span className="account-description">{a.description}</span>
            </span>
            <span className="account-arrow">
              <Icon name="arrow" />
            </span>
          </button>
        ))}
      </div>
      <p className="login-note">
        <Icon name="shield" />
        Вход в один клик, без логина и пароля
      </p>
      <p className="login-footer">Одна семья. Общая забота.</p>
    </main>
  );
}
