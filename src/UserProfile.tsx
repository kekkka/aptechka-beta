import { Button, Heading, Icon } from "./components";
import { accounts, actor } from "./model";
import type { AccountId, State, View } from "./types";

export function UserProfile({
  state,
  account,
  onBack,
  onNavigate,
  onEditPatient,
  onContacts,
  onSettings,
  onInvite,
  onLogout,
}: {
  state: State;
  account: AccountId;
  onBack: () => void;
  onNavigate: (view: View) => void;
  onEditPatient: () => void;
  onContacts: () => void;
  onSettings: () => void;
  onInvite: () => void;
  onLogout: () => void;
}) {
  const active = accounts.find((item) => item.id === account)!;
  const member = actor({ ...state, role: account });
  const patient = account === "senior";
  const manager = account === "anna";
  const permissions = [
    { label: "Просмотр плана и журнала", enabled: member.view },
    { label: "Отметки о приёме лекарств", enabled: member.view && member.mark },
    { label: "Управление запасами", enabled: member.view && member.stock },
    { label: "Сигналы о пропусках", enabled: member.view && member.alerts },
  ];

  return (
    <div className={`user-profile user-profile-${active.color}`}>
      <button className="text-link profile-back" onClick={onBack}>
        <Icon name="back" /> Назад
      </button>
      <Heading title="Профиль пользователя" />

      <section
        className="profile-card profile-identity"
        aria-label="Данные пользователя"
      >
        <span className="profile-portrait">
          <Icon name={active.icon} />
        </span>
        <h2>{member.name}</h2>
        <span className="profile-role">{active.role}</span>
        <p>{active.description}</p>
        <dl className="profile-details">
          {patient ? (
            <>
              <div>
                <dt>Возраст</dt>
                <dd>{state.patient.age}</dd>
              </div>
              <div>
                <dt>Город</dt>
                <dd>{state.patient.city || "Не указан"}</dd>
              </div>
            </>
          ) : (
            <>
              <div>
                <dt>Пациент</dt>
                <dd>{state.patient.name}</dd>
              </div>
              <div>
                <dt>Отношение к пациенту</dt>
                <dd>{member.relation}</dd>
              </div>
            </>
          )}
        </dl>
      </section>

      <section className="profile-card" aria-labelledby="profile-care-title">
        <h2 id="profile-care-title">
          {patient ? "Близкие и помощники" : "Данные пациента"}
        </h2>
        {patient ? (
          <ul className="profile-team">
            {state.members
              .filter((item) => item.view)
              .map((item) => (
                <li key={item.id}>
                  <span className="avatar">{item.name[0]}</span>
                  <span>
                    <strong>{item.name}</strong>
                    <small>
                      {item.id === "anna" ? "Менеджер лечения" : item.relation}
                    </small>
                  </span>
                </li>
              ))}
          </ul>
        ) : (
          <div className="profile-patient">
            <Icon name="heart" />
            <span>
              <strong>{state.patient.name}</strong>
              <small>
                Возраст: {state.patient.age} ·{" "}
                {state.patient.city || "Город не указан"}
              </small>
            </span>
          </div>
        )}
        <div className="profile-actions">
          <Button kind="soft" onClick={onContacts}>
            <Icon name="phone" />
            {patient ? "Связаться с близкими" : "Контакты команды"}
          </Button>
          {manager && (
            <Button kind="white" onClick={onEditPatient}>
              <Icon name="edit" />
              Изменить данные пациента
            </Button>
          )}
          {manager && (
            <Button kind="white" onClick={onInvite}>
              <Icon name="plus" />
              Добавить помощника
            </Button>
          )}
        </div>
      </section>

      {!patient && (
        <section
          className="profile-card"
          aria-labelledby="profile-access-title"
        >
          <h2 id="profile-access-title">Права доступа</h2>
          <ul className="profile-permissions">
            {permissions.map((permission) => (
              <li key={permission.label}>
                <span>{permission.label}</span>
                <span
                  className={
                    permission.enabled
                      ? "profile-access-on"
                      : "profile-access-off"
                  }
                >
                  <Icon name={permission.enabled ? "check" : "stop"} />
                  {permission.enabled ? "Доступно" : "Нет доступа"}
                </span>
              </li>
            ))}
          </ul>
          <p className="profile-description">
            {manager
              ? "Вы управляете доступом участников команды."
              : "Права доступа настраивает менеджер лечения."}
          </p>
        </section>
      )}

      <section className="profile-card" aria-labelledby="profile-actions-title">
        <h2 id="profile-actions-title">
          {manager
            ? "План, чат и сигналы"
            : patient
              ? "Приёмы и история"
              : "План и чат"}
        </h2>
        <div className="profile-actions">
          <Button kind="white" onClick={() => onNavigate("home")}>
            <Icon name="home" />
            {patient ? "К приёму лекарств" : "К обзору дня"}
          </Button>
          {patient ? (
            <Button kind="white" onClick={() => onNavigate("doctor")}>
              <Icon name="clipboard" />
              История для врача
            </Button>
          ) : (
            <>
              <Button kind="white" onClick={() => onNavigate("plan")}>
                <Icon name="calendar" />
                План приёмов
              </Button>
              <Button kind="white" onClick={() => onNavigate("chat")}>
                <Icon name="chat" />
                Чат команды
              </Button>
            </>
          )}
          {manager && (
            <Button kind="white" onClick={onSettings}>
              <Icon name="bell" />
              Настройки сигналов
            </Button>
          )}
        </div>
      </section>

      <Button kind="soft" onClick={onLogout}>
        <Icon name="users" />
        Сменить аккаунт
      </Button>
    </div>
  );
}
