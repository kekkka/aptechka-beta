import { Button, Heading, Icon } from "./components";
import { accounts, actor } from "./model";
import type { AccountId, State } from "./types";

function EditProfileButton({
  name,
  onClick,
}: {
  name: string;
  onClick: () => void;
}) {
  const label = `Изменить профиль: ${name}`;
  return (
    <button
      type="button"
      className="profile-edit-button"
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <Icon name="edit" />
    </button>
  );
}

function PersonProfileCard({
  title,
  name,
  contact,
  age,
  onEdit,
  onCall,
  onDelete,
  callLabel = "Позвонить пациенту",
}: {
  title: string;
  name: string;
  contact?: string;
  age?: number;
  onEdit?: () => void;
  onCall?: () => void;
  onDelete?: () => void;
  callLabel?: string;
}) {
  return (
    <section className="profile-card" aria-label={title}>
      <div className="profile-person-heading">
        <span className="avatar" aria-hidden="true">
          {name
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => part[0])
            .join("")
            .toLocaleUpperCase("ru-RU")}
        </span>
        <h2>{title}</h2>
        {onEdit && <EditProfileButton name={name} onClick={onEdit} />}
        {onDelete && (
          <button
            type="button"
            className="profile-delete-button"
            onClick={onDelete}
            aria-label={`Удалить помощника: ${name}`}
            title={`Удалить помощника: ${name}`}
          >
            <Icon name="trash" />
          </button>
        )}
      </div>
      <dl className="profile-details">
        <div>
          <dt>ФИО</dt>
          <dd>{name}</dd>
        </div>
        <div>
          <dt>Контакт</dt>
          <dd>{contact || "Не указан"}</dd>
        </div>
        {age !== undefined && (
          <div>
            <dt>Возраст</dt>
            <dd>{age}</dd>
          </div>
        )}
      </dl>
      {onCall && (
        <div className="profile-actions">
          <Button kind="soft" onClick={onCall} disabled={!contact?.trim()}>
            <Icon name="phone" />
            {callLabel}
          </Button>
        </div>
      )}
    </section>
  );
}

export function UserProfile({
  state,
  account,
  onBack,
  onEditPatient,
  onEditManager,
  onCallMember,
  onCallPatient,
  onEditCaregiver,
  onEditHelper,
  onDeleteHelper,
  onEmergencyContact,
  onInvite,
  onLogout,
}: {
  state: State;
  account: AccountId;
  onBack: () => void;
  onEditPatient: () => void;
  onEditManager: () => void;
  onCallMember: (id: string) => void;
  onCallPatient: () => void;
  onEditCaregiver: (id: string) => void;
  onEditHelper: (id: string) => void;
  onDeleteHelper: (id: string) => void;
  onEmergencyContact: (id: string) => void;
  onInvite: () => void;
  onLogout: () => void;
}) {
  const active = accounts.find((item) => item.id === account)!;
  const member = actor({ ...state, role: account });
  const patient = account === "senior";
  const manager = account === "anna";
  const contact = patient
    ? state.patient.contact
    : state.members.find((item) => item.id === account)?.contact;

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
        {manager && (
          <EditProfileButton name={member.name} onClick={onEditManager} />
        )}
        <span className="profile-portrait" aria-hidden="true">
          {member.name
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => part[0])
            .join("")
            .toLocaleUpperCase("ru-RU")}
        </span>
        <h2>{member.name}</h2>
        <span className="profile-role">{active.role}</span>
        <dl className="profile-details">
          <div>
            <dt>ФИО</dt>
            <dd>{member.name}</dd>
          </div>
          <div>
            <dt>Телефон</dt>
            <dd>{contact || "Не указан"}</dd>
          </div>
          {patient && (
            <div>
              <dt>Возраст</dt>
              <dd>{state.patient.age}</dd>
            </div>
          )}
        </dl>
      </section>

      {!manager && (
        <section
          className={patient ? "profile-team-section" : "profile-card"}
          aria-labelledby="profile-care-title"
        >
          <h2 id="profile-care-title">
            {patient ? "Близкие и помощники" : "Данные пациента"}
          </h2>
          {patient ? (
            <>
              {state.members
                .filter((item) => item.view)
                .map((item) => (
                  <PersonProfileCard
                    key={item.id}
                    title={
                      item.id === "anna"
                        ? "Менеджер лечения"
                        : item.role === "family"
                          ? `Помощник · ${item.relation}`
                          : item.relation
                    }
                    name={item.name}
                    contact={item.contact}
                    onCall={() => onCallMember(item.id)}
                    callLabel={`Позвонить: ${item.name}`}
                  />
                ))}
            </>
          ) : (
            <div className="profile-patient">
              <Icon name="heart" />
              <span>
                <strong>{state.patient.name}</strong>
                <small>Возраст: {state.patient.age}</small>
              </span>
            </div>
          )}
          {!patient && (
            <div className="profile-actions">
              <Button
                kind="soft"
                onClick={onCallPatient}
                disabled={!state.patient.contact?.trim()}
              >
                <Icon name="phone" />
                Позвонить пациенту
              </Button>
            </div>
          )}
        </section>
      )}

      {manager && (
        <>
          <PersonProfileCard
            title="Пациент"
            name={state.patient.name}
            contact={state.patient.contact}
            age={state.patient.age}
            onEdit={onEditPatient}
            onCall={onCallPatient}
          />
          {state.members
            .filter((item) => item.role === "caregiver")
            .map((item) => (
              <PersonProfileCard
                key={item.id}
                title="Сиделка"
                name={item.name}
                contact={item.contact}
                onEdit={() => onEditCaregiver(item.id)}
              />
            ))}
          {!state.members.some((item) => item.role === "caregiver") && (
            <section className="profile-card" aria-label="Сиделка">
              <h2>Сиделка</h2>
              <p>Сиделки пока не добавлены.</p>
            </section>
          )}
          <div className="profile-actions">
            <Button kind="white" onClick={onInvite}>
              <Icon name="plus" />
              Добавить помощника
            </Button>
          </div>
        </>
      )}

      {!patient &&
        state.members
          .filter((item) => item.role === "family" && item.view)
          .map((item) => (
            <PersonProfileCard
              key={item.id}
              title={`Помощник · ${item.relation}`}
              name={item.name}
              contact={item.contact}
              onCall={manager ? undefined : () => onCallMember(item.id)}
              onEdit={manager ? () => onEditHelper(item.id) : undefined}
              onDelete={manager ? () => onDeleteHelper(item.id) : undefined}
              callLabel={`Позвонить: ${item.name}`}
            />
          ))}

      {manager && (
        <section
          className="profile-card"
          aria-labelledby="profile-emergency-title"
        >
          <h2 id="profile-emergency-title">Экстренный контакт</h2>
          <p className="profile-description">
            Кнопка звонка этому человеку будет на главном экране пациента.
            Звонки в прототипе демонстрационные.
          </p>
          <label className="field">
            <span>Кому позвонить</span>
            <select
              value={state.settings.emergencyContact || "anna"}
              onChange={(event) => onEmergencyContact(event.target.value)}
            >
              {state.members
                .filter((item) => item.view)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ·{" "}
                    {item.id === "anna" ? "Менеджер лечения" : item.relation}
                  </option>
                ))}
            </select>
          </label>
        </section>
      )}

      <Button kind="danger" onClick={onLogout}>
        <Icon name="users" />
        Выйти из аккаунта
      </Button>
    </div>
  );
}
