import { PatientCondition, PatientMonitoring } from "./PatientMonitoring";
import { saveCallSchedule } from "./monitoring";
import { MedicationInfo } from "./MedicationInfo";
import { VirtualPharmacy } from "./VirtualPharmacy";
import { AddMedication } from "./AddMedication";
import { StockSummary } from "./StockSummary";
import { ShareShoppingList } from "./ShareShoppingList";
import { PharmacyPurchase } from "./PharmacyPurchase";
import { addManualStock, correctStock, addCatalogStock } from "./inventory";
import { BrandLogo } from "./BrandLogo";
import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  accounts,
  actor,
  addDays,
  canViewCourse,
  dateObj,
  delayed,
  events,
  fmt,
  hm,
  isOwner,
  KEY,
  loadState,
  markDose,
  expireDoses,
  setDemoTime,
  resetDemoDose,
  mins,
  record,
  removeHelper,
  shopping,
  signals,
  completeCareTask,
  sendChat,
  uid,
  undoDose,
} from "./model";
import type {
  AccountId,
  DoseEvent,
  PlanEvent,
  RegularEventTarget,
  State,
  Stock,
  View,
} from "./types";
import { Button, Empty, Field, Heading, Icon, Modal } from "./components";
import { Login } from "./Login";
import { DoctorReport } from "./DoctorReport";
import { PatientDrum } from "./PatientDrum";
import { DemoClock } from "./DemoClock";
import { ImportPrescription } from "./ImportPrescription";
import { AddPlanEvent } from "./AddPlanEvent";
import { RegularPlan } from "./RegularPlan";
import { RegularEventEditor } from "./RegularEventEditor";
import {
  deleteRegularEvent,
  regularEventHash,
  regularEventTarget,
  saveRegularEvent,
} from "./regular-event-editor";
import { MEAL_LABELS } from "./schedule";
import { calendarTimelineGroup } from "./calendar-timeline";
import { SberAppointmentCard, SberAppointmentStub } from "./SberAppointment";
import { ProcedureEventCard, ProcedureEventDetails } from "./ProcedureEvent";
import { sberHealthAppointments } from "./sber-health";
import {
  addManualMedication,
  addPlanEvent,
  completePlanEvent,
  planEventsForDate,
} from "./plan-events";
import { CaregiverHome } from "./CaregiverHome";
import { Chat } from "./Chat";
import { UserProfile } from "./UserProfile";
import { NotificationCenter } from "./NotificationCenter";
import { markNotificationsRead } from "./notifications";
type Dialog =
  | { type: "event"; event: DoseEvent }
  | { type: "procedure-event"; event: PlanEvent }
  | { type: "sber-appointment"; event: PlanEvent }
  | { type: "stock"; stock?: Stock }
  | { type: "medication-info"; stock: Stock }
  | { type: "catalog"; query?: string }
  | { type: "caregiver"; id: string }
  | { type: "helper"; id: string }
  | { type: "delete-helper"; id: string }
  | { type: "purchase"; mode: "buy" | "nearby" }
  | {
      type:
        | "import"
        | "add-plan-event"
        | "patient"
        | "manager"
        | "contact"
        | "settings"
        | "clock"
        | "about"
        | "invite"
        | "share-stock";
    }
  | { type: "end"; id: string };
const tabs: { id: View; icon: string; label: string }[] = [
  { id: "home", icon: "home", label: "Обзор" },
  { id: "plan", icon: "calendar", label: "План" },
  { id: "stock", icon: "box", label: "Аптечка" },
  { id: "chat", icon: "chat", label: "Чат" },
];
const allViews: View[] = [
  "home",
  "plan",
  "edit-event",
  "stock",
  "chat",
  "courses",
  "history",
  "devices",
  "doctor",
  "profile",
];
function getView(): View {
  if (location.hash.startsWith("#edit-event/")) return "edit-event";
  const v = location.hash.slice(1) as View;
  return allViews.includes(v) ? v : "home";
}
export default function App() {
  const [state, setState] = useState(loadState),
    [account, setAccount] = useState<AccountId | null>(null),
    [view, setView] = useState<View>(getView),
    [dialog, setDialog] = useState<Dialog | null>(null),
    [toast, setToast] = useState(""),
    [selectedDate, setSelectedDate] = useState(state.day);
  const [profileReturn, setProfileReturn] = useState<View>("home");
  const [planSection, setPlanSection] = useState<"calendar" | "regular">(
    "calendar",
  );
  const [editingTarget, setEditingTarget] = useState<RegularEventTarget | null>(
    () => regularEventTarget(location.hash),
  );
  const [completedDose, setCompletedDose] = useState<DoseEvent | null>(null);
  useEffect(() => {
    if (!completedDose) return;
    const timer = setTimeout(() => setCompletedDose(null), 1600);
    return () => clearTimeout(timer);
  }, [completedDose]);
  useEffect(() => {
    setCompletedDose(null);
  }, [account, view]);
  const close = useCallback(() => setDialog(null), []);
  const change = (fn: (next: State) => void) =>
    setState((prev) => {
      const next = structuredClone(prev);
      fn(next);
      expireDoses(next);
      return next;
    });
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      setToast("Не удалось сохранить данные в браузере.");
    }
  }, [state]);
  useEffect(() => {
    const onHash = () => {
      setDialog(null);
      setView(getView());
      if (getView() === "edit-event")
        setEditingTarget(regularEventTarget(location.hash));
      if (location.hash === "#login") {
        setAccount(null);
        setDialog(null);
      }
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  useEffect(() => {
    if (toast) {
      const id = setTimeout(() => setToast(""), 4500);
      return () => clearTimeout(id);
    }
  }, [toast]);
  useEffect(() => {
    document.title = account
      ? view === "doctor"
        ? "Аптечка — история для врача"
        : view === "profile"
          ? `Аптечка — профиль · ${accounts.find((a) => a.id === account)?.role}`
          : `Аптечка — ${accounts.find((a) => a.id === account)?.role}`
      : "Аптечка — выбор аккаунта";
  }, [account, view]);
  const navigate = (v: View) => {
    close();
    setView(v);
    location.hash =
      v === "edit-event" && editingTarget ? regularEventHash(editingTarget) : v;
    window.scrollTo(0, 0);
  };
  const login = (id: AccountId) => {
    change((s) => {
      s.role = id;
    });
    setAccount(id);
    setSelectedDate(state.day);
    navigate("home");
  };
  const logout = () => {
    close();
    setAccount(null);
    location.hash = "login";
    setView("home");
    window.scrollTo(0, 0);
  };
  const active = accounts.find((a) => a.id === account),
    owner = isOwner(state),
    caregiver = state.members.some(
      (member) => member.id === state.role && member.role === "caregiver",
    ),
    me = actor(state),
    ev = events(state),
    sg = signals(state),
    needs = shopping(state),
    done = ev.filter((e) => e.log?.status === "taken").length;
  const visibleAudit = state.audit.filter((a) => {
    const c = state.courses.find(
      (c) => c.id === (a.courseId || a.dose?.split("|")[0]),
    );
    return !c || canViewCourse(state, c);
  });
  const exportFile = (name: string, content: string, type = "text/plain") => {
    const url = URL.createObjectURL(new Blob([content], { type })),
      a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const dose = (e: DoseEvent) => {
    const taken = e.log?.status === "taken",
      skip = e.log?.status === "skipped" || e.log?.status === "missed";
    return (
      <button
        className={`dose-row dose-button ${delayed(state, e) || skip ? "uncertain" : ""}`}
        key={e.id}
        onClick={() => setDialog({ type: "event", event: e })}
      >
        <span className="time">{e.time}</span>
        <span className="grow">
          <span className="med-name">
            <strong>{e.med.name}</strong>
            <span className={`label ${skip ? "red" : taken ? "" : "gray"}`}>
              {taken
                ? "Отмечено"
                : e.log?.status === "missed"
                  ? "Не принято"
                  : skip
                    ? "Пропуск"
                    : delayed(state, e)
                      ? "Нет отметки"
                      : "По плану"}
            </span>
          </span>
          <span className="dose-meta">
            {e.med.strength} · {e.med.dose} {e.med.unit} · {e.med.note}
            {e.med.mealTiming && e.med.mealTiming !== "none"
              ? ` · ${MEAL_LABELS[e.med.mealTiming]}`
              : ""}
          </span>
          {taken && (e.log?.takenAt || e.log?.time) && (
            <span className="dose-source">
              Фактически принято:{" "}
              {e.log.takenAt
                ? `${fmt(e.log.takenAt.slice(0, 10))} в ${e.log.takenAt.slice(11, 16)}`
                : e.log.time}
            </span>
          )}
          {e.log?.actorName && (
            <span className="dose-source">
              {e.log.actorName} ·{" "}
              {e.log.source === "observed"
                ? "наблюдала лично"
                : e.log.source === "timeout"
                  ? "нет отметки за час"
                  : e.log.source === "self"
                    ? "отметила сама"
                    : "со слов близкого"}
            </span>
          )}
        </span>
        <Icon name="chevron" />
      </button>
    );
  };
  const alert = (e: DoseEvent) => (
    <section className="alert" key={e.id}>
      <div className="row">
        <span className="alert-icon">
          <Icon name="alert" />
        </span>
        <div className="grow">
          <h3>
            {e.log?.status === "missed"
              ? "Не принято за час"
              : e.log?.status === "skipped"
                ? "Приём пропущен"
                : "Нет подтверждения приёма"}
          </h3>
          <p>
            {e.med.name} · {e.time}
          </p>
        </div>
      </div>
      {state.signalState[e.id]?.owner && (
        <p className="caption space">
          Проверяет: {state.signalState[e.id].owner}
        </p>
      )}
      <div className="alert-actions">
        <Button onClick={() => setDialog({ type: "event", event: e })}>
          Проверить ситуацию
          <Icon name="arrow" />
        </Button>
      </div>
    </section>
  );
  let content: ReactNode;
  if (view === "profile" && account) {
    content = (
      <UserProfile
        state={state}
        account={account}
        onBack={() => navigate(profileReturn)}
        onEditPatient={() => setDialog({ type: "patient" })}
        onEditManager={() => setDialog({ type: "manager" })}
        onCallMember={(id) => {
          const member = state.members.find(
            (item) => item.id === id && item.view,
          );
          if (!member?.contact?.trim()) return;
          setToast(
            `Демо-звонок: ${member.name}, ${member.contact}. Телефония пока не подключена.`,
          );
        }}
        onCallPatient={() => {
          if (!state.patient.contact?.trim()) return;
          setToast(
            `Демо-звонок: ${state.patient.name}, ${state.patient.contact}. Телефония пока не подключена.`,
          );
        }}
        onEditCaregiver={(id) => setDialog({ type: "caregiver", id })}
        onEditHelper={(id) => setDialog({ type: "helper", id })}
        onDeleteHelper={(id) => setDialog({ type: "delete-helper", id })}
        onEmergencyContact={(id) => {
          if (!owner) return;
          change((next) => {
            next.settings.emergencyContact = id;
          });
        }}
        onInvite={() => setDialog({ type: "invite" })}
        onLogout={logout}
      />
    );
  } else if (view === "edit-event" && !caregiver) {
    const backToRegular = () => {
      setPlanSection("regular");
      navigate("plan");
    };
    content = editingTarget ? (
      <RegularEventEditor
        key={regularEventHash(editingTarget)}
        state={state}
        target={editingTarget}
        onBack={backToRegular}
        onSave={(settings) => {
          const next = structuredClone(state);
          if (!saveRegularEvent(next, editingTarget, settings)) return false;
          setState(next);
          backToRegular();
          setToast(
            "Расписание сохранено. Изменения вступят в силу с завтрашнего дня или даты начала события.",
          );
          return true;
        }}
        onDelete={() => {
          const next = structuredClone(state);
          if (!deleteRegularEvent(next, editingTarget)) return false;
          setState(next);
          backToRegular();
          setToast("Событие удалено. История и отметки сохранены.");
          return true;
        }}
      />
    ) : (
      <>
        <Empty title="Событие не найдено" />
        <Button kind="white" onClick={backToRegular}>
          К регулярным событиям
        </Button>
      </>
    );
  } else if (view === "devices") {
    content = owner ? <PatientMonitoring state={state} onBack={() => navigate("home")} onSave={schedule => { const next = structuredClone(state); if (!saveCallSchedule(next, schedule)) return false; setState(next); return true; }} /> : <Empty title="Мониторинг доступен менеджеру лечения">Вернитесь на главный экран.</Empty>;
  } else if (view === "doctor") {
    content = <DoctorReport state={state} onBack={() => navigate("home")} />;
  } else if (account === "senior") {
    content = (
      <>
        <PatientDrum
          events={ev}
          clock={state.clock}
          completed={completedDose}
          onTake={(event) => {
            const next = structuredClone(state);
            if (
              markDose(next, event.id, "taken", "self", "Отмечено пациентом")
            ) {
              setCompletedDose(event);
              setState(next);
            }
          }}
        />
        <div className="patient-call-action">
          <Button
            kind="soft"
            onClick={() => {
              const contact = state.members.find(
                (member) =>
                  member.id === (state.settings.emergencyContact || "anna") &&
                  member.view,
              );
              if (contact)
                setToast(
                  `Демо-звонок: ${contact.name}. Телефония пока не подключена.`,
                );
              else setDialog({ type: "contact" });
            }}
          >
            <Icon name="phone" />
            Позвонить:{" "}
            {state.members.find(
              (member) =>
                member.id === (state.settings.emergencyContact || "anna") &&
                member.view,
            )?.name || "близким"}
          </Button>
        </div>
        <div className="patient-doctor-action">
          <Button kind="white" onClick={() => navigate("doctor")}>
            <Icon name="clipboard" />
            Показать врачу
            <Icon name="arrow" />
          </Button>
        </div>
      </>
    );
  } else if (view === "home" && account === "elena")
    content = (
      <>
      <CaregiverHome
        state={state}
        events={ev}
        onOpenEvent={(e) => setDialog({ type: "event", event: e })}
        onCompleteCare={(id) =>
          change((s) => {
            completeCareTask(s, id);
          })
        }
      />
      <StockSummary state={state} onOpen={() => navigate("stock")} />
      </>
    );
  else if (view === "home")
    content = (
      <>
        <Heading
          title={owner ? "Как дела у мамы?" : "Забота о Нине Петровне"}
          subtitle={
            owner
              ? "Самое важное о близком — с первого взгляда."
              : "План на день и помощь с приёмом лекарств."
          }
        />
        <section className="patient-card">
          <div className="patient-person">
            <span className="patient-avatar">НП</span>
            <div>
              <h2>{state.patient.name}</h2>
              <p>
                {state.patient.age} года · {state.patient.city}
              </p>
            </div>
            <button
              className="icon-btn"
              aria-label="Профиль пациента"
              onClick={() => setDialog({ type: "patient" })}
            >
              <Icon name="more" />
            </button>
          </div>
          <div className="patient-status">
            <span>
              <i className="dot" />
              План на сегодня
            </span>
            <strong>
              {done} из {ev.length} приёмов отмечено
            </strong>
          </div>
          <div className="mini-progress">
            <span
              style={{ width: `${ev.length ? (done / ev.length) * 100 : 0}%` }}
            />
          </div>
        </section>
        <PatientCondition state={state} onOpen={() => { navigate("devices"); }} />
        {sg.length ? (
          alert(sg[0])
        ) : (
          <div className="quiet-card space">
            <Icon name="check" />
            <p>Все ситуации проверены</p>
          </div>
        )}
        {owner && (
          <button
            className="import-entry"
            onClick={() => setDialog({ type: "import" })}
          >
            <span className="scan-symbol">
              <Icon name="file" />
            </span>
            <span>
              <strong>Распознать назначение</strong>
              <small>Из фото или PDF — в понятный план</small>
            </span>
            <span className="import-entry-arrow">
              <Icon name="arrow" />
            </span>
          </button>
        )}
        {!owner && (
          <div className="quick-grid">
            {(
              [
                {
                  id: "plan",
                  icon: "calendar",
                  title: "План лечения",
                  desc: "Расписание и отметки",
                },
                {
                  id: "stock",
                  icon: "box",
                  title: "Виртуальная аптечка",
                  desc: `${needs.length} позиций к покупке`,
                },
                {
                  id: "history",
                  icon: "heart",
                  title: "Журнал действий",
                  desc: "Все события в одном месте",
                },
              ] as const
            ).map((c) => (
              <button
                className="quick-card"
                key={c.id}
                onClick={() => navigate(c.id)}
              >
                <span className="quick-icon">
                  <Icon name={c.icon} />
                  <span className="arrow">
                    <Icon name="arrow" />
                  </span>
                </span>
                <strong>{c.title}</strong>
                <small>{c.desc}</small>
              </button>
            ))}
          </div>
        )}
        <StockSummary state={state} onOpen={() => navigate("stock")} />
        <div className="section-title">
          <h2>Сегодня по плану</h2>
          <button className="text-link" onClick={() => navigate("plan")}>
            Все приёмы
          </button>
        </div>
        <div className="card">{ev.map(dose)}</div>
        <div className="section-title">
          <h2>Последние события</h2>
        </div>
        <div className="card">
          {visibleAudit.slice(0, 3).map((a) => (
            <div className="care-activity" key={a.id}>
              <span className="avatar">{a.title[0]}</span>
              <div>
                <h3>{a.title}</h3>
                <p>
                  {a.detail}
                  <br />
                  {a.time}
                </p>
              </div>
            </div>
          ))}
        </div>
        <button
          className="future-card space"
          onClick={() => navigate("devices")}
        >
          <span className="orb">
            <Icon name="watch" />
          </span>
          <span>
            <strong>Мониторинг состояния</strong>
            <p>Самочувствие, звонки и устройства</p>
          </span>
          <Icon name="arrow" />
        </button>
      </>
    );
  else if (view === "plan" || (view === "edit-event" && caregiver)) {
    const start = addDays(
        selectedDate,
        -((dateObj(selectedDate).getDay() + 6) % 7),
      ),
      list = events(state, selectedDate),
      scheduled = [
        ...planEventsForDate(state, selectedDate),
        ...sberHealthAppointments(state, selectedDate),
      ];
    content = (
      <>
        <Heading
          title="План лечения"
          action={
            owner ? (
              <button
                className="icon-btn"
                aria-label="Добавить событие"
                onClick={() => setDialog({ type: "add-plan-event" })}
              >
                <Icon name="plus" />
              </button>
            ) : undefined
          }
        />
        {!caregiver && (
          <div
            className="segmented plan-sections"
            role="tablist"
            aria-label="Раздел плана лечения"
            onKeyDown={(event) => {
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
                return;
              event.preventDefault();
              const section =
                event.key === "Home"
                  ? "calendar"
                  : event.key === "End"
                    ? "regular"
                    : planSection === "calendar"
                      ? "regular"
                      : "calendar";
              setPlanSection(section);
              document.getElementById(`plan-tab-${section}`)?.focus();
            }}
          >
            {(
              [
                ["calendar", "Календарь"],
                ["regular", "Регулярные события"],
              ] as const
            ).map(([section, label]) => (
              <button
                key={section}
                id={`plan-tab-${section}`}
                type="button"
                role="tab"
                tabIndex={planSection === section ? 0 : -1}
                aria-selected={planSection === section}
                aria-controls={`plan-panel-${section}`}
                className={planSection === section ? "active" : ""}
                onClick={() => setPlanSection(section)}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        {!caregiver && planSection === "regular" ? (
          <div
            id="plan-panel-regular"
            role="tabpanel"
            aria-labelledby="plan-tab-regular"
          >
            <RegularPlan
              state={state}
              onEdit={(target) => {
                if (!owner) return;
                setEditingTarget(target);
                close();
                setView("edit-event");
                location.hash = regularEventHash(target);
                window.scrollTo(0, 0);
              }}
            />
          </div>
        ) : (
          <div
            id="plan-panel-calendar"
            role={caregiver ? undefined : "tabpanel"}
            aria-labelledby={caregiver ? undefined : "plan-tab-calendar"}
          >
            <div className="day-wrap">
              <button
                className="day-nav"
                aria-label="Предыдущая неделя"
                onClick={() => setSelectedDate(addDays(selectedDate, -7))}
              >
                ‹
              </button>
              {Array.from({ length: 7 }, (_, i) => {
                const date = addDays(start, i);
                return (
                  <button
                    key={date}
                    className={`day ${date === selectedDate ? "active" : ""}`}
                    onClick={() => setSelectedDate(date)}
                  >
                    <span>
                      {dateObj(date).toLocaleDateString("ru", {
                        weekday: "short",
                      })}
                    </span>
                    <b>{dateObj(date).getDate()}</b>
                  </button>
                );
              })}
              <button
                className="day-nav"
                aria-label="Следующая неделя"
                onClick={() => setSelectedDate(addDays(selectedDate, 7))}
              >
                ›
              </button>
            </div>
            <div className="space">
              {list.length || scheduled.length ? (
                [
                  ...list.map((event) => ({
                    id: event.id,
                    time: event.time,
                    group: calendarTimelineGroup(state, event),
                    content: dose(event),
                  })),
                  ...scheduled.map((event) => ({
                    id: event.id,
                    time: event.time,
                    group: calendarTimelineGroup(state, event),
                    content:
                      event.kind === "appointment" ? (
                        <SberAppointmentCard
                          key={event.id}
                          event={event}
                          onOpen={() =>
                            setDialog({ type: "sber-appointment", event })
                          }
                        />
                      ) : (
                        <ProcedureEventCard
                          key={event.id}
                          event={event}
                          onOpen={() =>
                            setDialog({ type: "procedure-event", event })
                          }
                        />
                      ),
                  })),
                ]
                  .sort(
                    (first, second) =>
                      first.group - second.group ||
                      first.time.localeCompare(second.time) ||
                      first.id.localeCompare(second.id),
                  )
                  .reduce<ReactNode[][]>(
                    (groups, entry) => {
                      groups[entry.group].push(entry.content);
                      return groups;
                    },
                    [[], [], []],
                  )
                  .map((entries, group) => entries.length ? (
                    <section
                      key={group}
                      aria-labelledby={`calendar-group-${group}`}
                    >
                      <div className="section-title">
                        <h2 id={`calendar-group-${group}`}>
                          {
                            ["Предстоит выполнить", "Выполнено", "Просрочено"][
                              group
                            ]
                          }
                        </h2>
                        <span className="label gray">{entries.length}</span>
                      </div>
                      <div className="card">{entries}</div>
                    </section>
                  ) : null)
              ) : (
                <div className="card">
                  <Empty title="Событий нет">
                    На выбранную дату нет событий
                  </Empty>
                </div>
              )}
            </div>
          </div>
        )}
      </>
    );
  } else if (view === "stock")
    content = (
      <VirtualPharmacy
        state={state}
        canEdit={me.stock}
        onAdd={(query) => setDialog({ type: "catalog", query })}
        onEdit={(stock) => setDialog({ type: "stock", stock })}
        onInfo={(stock) => setDialog({ type: "medication-info", stock })}
        onShare={() => setDialog({ type: "share-stock" })}
        onNearby={() => setDialog({ type: "purchase", mode: "nearby" })}
      />
    );
  else if (view === "chat")
    content = (
      <Chat
        state={state}
        onSend={(text, attachment) =>
          change((s) => {
            sendChat(s, text, attachment);
          })
        }
      />
    );
  else if (view === "courses")
    content = (
      <>
        <Heading
          title="Назначения врача"
          subtitle="Из выписки — в понятный план для всей семьи."
        />
        {owner && (
          <Button onClick={() => setDialog({ type: "import" })}>
            <Icon name="upload" />
            Распознать назначение
          </Button>
        )}
        <div className="card space">
          {state.courses
            .filter((c) => canViewCourse(state, c))
            .map((c) => (
              <section className="course-card" key={c.id}>
                <div className="between">
                  <h3>{c.title}</h3>
                  <span className={`label ${c.active ? "" : "gray"}`}>
                    {c.active ? "Активен" : "Завершён"}
                  </span>
                </div>
                <p>
                  {fmt(c.start)} — {fmt(addDays(c.start, c.days - 1))}
                </p>
                <div className="course-meds">
                  {c.meds.map((m) => (
                    <div className="course-med" key={m.id}>
                      <strong>
                        {m.name} · {m.strength}
                      </strong>
                      <span>
                        {m.dose} {m.unit} · {m.times.join(", ")} ·{" "}
                        {m.days || c.days} дней
                      </span>
                    </div>
                  ))}
                </div>
                {owner && c.active && (
                  <button
                    className="text-link"
                    onClick={() => setDialog({ type: "end", id: c.id })}
                  >
                    Завершить курс
                  </button>
                )}
              </section>
            ))}
        </div>
      </>
    );
  else if (view === "history")
    content = (
      <>
        <Heading
          title="Журнал действий"
          subtitle="Кто, когда и на каком основании сделал отметку."
          action={
            <button
              className="icon-btn"
              aria-label="Скачать журнал"
              onClick={() =>
                exportFile(
                  "Журнал.json",
                  JSON.stringify(visibleAudit, null, 2),
                  "application/json",
                )
              }
            >
              <Icon name="download" />
            </button>
          }
        />
        <div className="hint gray">
          <Icon name="users" />
          <span>
            Отметка человека не является объективным подтверждением приёма.
          </span>
        </div>
        <div className="history space">
          {visibleAudit.map((a) => (
            <div className="history-item" key={a.id}>
              <strong>{a.title}</strong>
              <p>
                {a.detail}
                <br />
                {fmt(a.date)} · {a.time}
              </p>
            </div>
          ))}
        </div>
      </>
    );
  else
    content = (
      <>
        <Heading
          title="Устройства и наблюдение"
          subtitle="Следующий этап продукта — отдельный пилот."
        />
        <div className="hint orange">
          <Icon name="info" />
          <span>
            Интеграции пока не подключены. Здесь нет реальных измерений или
            видео.
          </span>
        </div>
        <div className="card space">
          {[
            ["watch", "Устройства здоровья"],
            ["speaker", "Голосовой помощник"],
            ["camera", "Наблюдение и связь"],
          ].map(([i, t]) => (
            <div className="device-card" key={i}>
              <span className="med-icon">
                <Icon name={i} />
              </span>
              <h3>{t}</h3>
              <p>Планируется в следующих версиях</p>
            </div>
          ))}
        </div>
      </>
    );
  if (!account) return <Login onSelect={login} />;
  const formData = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    return new FormData(e.currentTarget);
  };
  const saveStock = (e: FormEvent<HTMLFormElement>, old?: Stock) => {
    const d = formData(e),
      s: Stock = {
        ...old,
        id: old?.id || uid(),
        name: old?.name || String(d.get("name")).trim(),
        strength: old?.strength ?? String(d.get("strength")).trim(),
        form: old?.form || String(d.get("form")),
        unit: old?.unit || (d.get("form") === "Капсулы" ? "капс." : "табл."),
        qty: Number(d.get("qty")),
        pack: Number(d.get("pack")),
        expiry: String(d.get("expiry")),
      };
    if (!old) return;
    const next = structuredClone(state);
    if (!correctStock(next, old.id, s)) {
      setToast("Проверьте остаток, упаковку и срок годности.");
      return;
    }
    setState(next);
    close();
    setToast("Остаток сохранён.");
  };
  let modal: ReactNode;
  if (dialog?.type === "event") {
    const e = dialog.event,
      log = state.logs[e.id],
      resolved = ["taken", "skipped", "missed"].includes(log?.status || ""),
      past =
        e.date < state.day ||
        (e.date === state.day && mins(e.time) <= state.clock),
      canConfirmMissed = owner && past && log?.status === "missed";
    modal = (
      <>
        <div className="event-hero">
          <span className="med-icon">
            <Icon name="pill" />
          </span>
          <h2>
            {e.med.name} · {e.med.strength}
          </h2>
          <p>
            {e.med.dose} {e.med.unit} · {e.time}
          </p>
          <p>{e.med.note}</p>
        </div>
        {resolved && !canConfirmMissed ? (
          <>
            <div className="hint">
              {log.status === "taken"
                ? "Приём отмечен"
                : log.status === "missed"
                  ? "Не принято за час"
                  : "Приём пропущен"}{" "}
              · {log.actorName}
              <br />
              {log.note}
              {log.status === "taken" && (log.takenAt || log.time) && (
                <p>
                  Фактически принято:{" "}
                  {log.takenAt
                    ? `${fmt(log.takenAt.slice(0, 10))} в ${log.takenAt.slice(11, 16)}`
                    : log.time}
                </p>
              )}
            </div>
            {log.status !== "missed" &&
              me.mark &&
              (owner || log.actor === state.role) && (
                <div className="space">
                  <Button
                    kind="white"
                    onClick={() => {
                      change((s) => undoDose(s, e.id));
                      close();
                    }}
                  >
                    Отменить отметку
                  </Button>
                </div>
              )}
            {["skipped", "missed"].includes(log.status) &&
              account !== "senior" && !caregiver && (
                <div className="space">
                  <Button
                    onClick={() => {
                      change((s) => {
                        s.signalState[e.id] = {
                          ...s.signalState[e.id],
                          resolved: true,
                          owner: me.name,
                        };
                        record(
                          s,
                          "resolve",
                          me.name + " проверила пропуск",
                          e.med.name,
                          e.id,
                        );
                      });
                      close();
                    }}
                  >
                    Ситуация проверена
                  </Button>
                </div>
              )}
          </>
        ) : past && me.mark ? (
          <form
            onSubmit={(event) => {
              const d = formData(event);
              const next = structuredClone(state);
              const marked = markDose(
                next,
                e.id,
                "taken",
                account === "senior" ? "self" : String(d.get("source")),
                String(d.get("note") || ""),
                owner ? String(d.get("takenAt") || "") : undefined,
              );
              if (!marked) {
                setToast(
                  "Не удалось отметить приём. Проверьте время и текущую отметку.",
                );
                return;
              }
              setState(next);
              close();
              setToast("Приём отмечен.");
            }}
          >
            {canConfirmMissed && (
              <p className="hint">
                Приём просрочен и не был подтверждён. Укажите время уже
                состоявшегося приёма — это не рекомендация принять лекарство сейчас.
              </p>
            )}
            {owner && (
              <label className="field">
                <span>Фактические дата и время приёма</span>
                <input
                  name="takenAt"
                  type="datetime-local"
                  required
                  min={`${e.date}T${e.time}`}
                  max={`${state.day}T${hm(state.clock)}`}
                  defaultValue={`${state.day}T${hm(state.clock)}`}
                />
              </label>
            )}
            {account === "senior" ? (
              <p className="senior-confirm">
                Вы уже приняли лекарство? Подтвердите только состоявшийся приём.
              </p>
            ) : (
              <>
                <label className="field">
                  <span>Как вы узнали о приёме?</span>
                  <select name="source" required>
                    <option value="">Выберите</option>
                    <option value="observed">Наблюдала лично</option>
                    <option value="reported">Со слов близкого</option>
                  </select>
                </label>
                <Field label="Комментарий" name="note" required={false} />
              </>
            )}
            <label className="check-row">
              <input type="checkbox" required />
              Подтверждаю, что лекарство принято
            </label>
            <div className="stack space">
              <Button type="submit">
                {account === "senior" ? "Да, приняла" : "Подтвердить приём"}
              </Button>
              <Button
                kind="white"
                disabled={canConfirmMissed}
                onClick={() => {
                  const reason = prompt("Причина пропуска");
                  if (reason?.trim()) {
                    change((s) => {
                      markDose(s, e.id, "skipped", "", reason.trim());
                    });
                    close();
                  }
                }}
              >
                Отметить пропуск
              </Button>
              <Button
                kind="white"
                disabled={canConfirmMissed}
                onClick={() => {
                  change((s) => {
                    s.logs[e.id] = {
                      status: "snoozed",
                      snoozedUntil: Math.min(1439, s.clock + 15),
                    };
                    record(
                      s,
                      "snooze",
                      me.name + " отложила напоминание",
                      e.med.name,
                      e.id,
                    );
                  });
                  close();
                  setToast("Напоминание отложено на 15 минут.");
                }}
              >
                Напомнить через 15 минут
              </Button>
            </div>
          </form>
        ) : (
          <p className="caption">
            {past
              ? "В вашей роли отметки недоступны."
              : "Время приёма ещё не наступило."}
          </p>
        )}
        {!resolved && account !== "senior" && (
          <div className="stack space">
            <Button
              kind="soft"
              onClick={() => {
                change((s) => {
                  s.signalState[e.id] = {
                    ...s.signalState[e.id],
                    owner: me.name,
                  };
                  record(
                    s,
                    "claim",
                    me.name + " проверяет ситуацию",
                    e.med.name,
                    e.id,
                  );
                });
                close();
              }}
            >
              Я проверю ситуацию
            </Button>
            <Button
              kind="white"
              onClick={() => {
                change((s) => {
                  s.signalState[e.id] = {
                    ...s.signalState[e.id],
                    requested: hm(s.clock),
                  };
                  record(
                    s,
                    "request",
                    "Создан демо-запрос для сиделки",
                    e.med.name,
                    e.id,
                  );
                });
                close();
                setToast("Демо-запрос сохранён. Сообщение не отправлялось.");
              }}
            >
              Запросить уточнение
            </Button>
          </div>
        )}
      </>
    );
  } else if (dialog?.type === "stock")
    modal = (
      <form onSubmit={(e) => saveStock(e, dialog.stock)}>
        <h3>{dialog.stock?.name}</h3>
        <p>
          {dialog.stock?.strength} · {dialog.stock?.form}
        </p>
        <div className="field-grid">
          <Field
            label={`Остаток, ${dialog.stock?.unit || "шт."}`}
            name="qty"
            type="number"
            min={0}
            max={100000}
            step={0.25}
            defaultValue={dialog.stock?.qty || 0}
          />
          <Field
            label="Штук в упаковке"
            name="pack"
            type="number"
            min={0}
            max={100000}
            step={1}
            defaultValue={dialog.stock?.pack ?? 0}
          />
        </div>
        <Field
          label="Годен до"
          name="expiry"
          type="date"
          defaultValue={dialog.stock?.expiry}
        />
        <Button type="submit">Сохранить</Button>
      </form>
    );
  else if (dialog?.type === "share-stock") {
    modal = <ShareShoppingList state={state} />;
  }
  else if (dialog?.type === "purchase") {
    modal = <PharmacyPurchase state={state} mode={dialog.mode} />;
  }
  else if (dialog?.type === "medication-info") {
    modal = (
      <MedicationInfo
        aggregate={dialog.stock.id.startsWith("shopping:")}
        stock={
          state.stock.find((s) => s.id === dialog.stock.id) || dialog.stock
        }
        day={state.day}
      />
    );
  } else if (dialog?.type === "catalog") {
    modal = (
      <AddMedication
        day={state.day}
        initialQuery={dialog.query}
        onManualSave={(input) => {
          const next = structuredClone(state);
          if (!addManualStock(next, input)) return false;
          setState(next); close(); setToast("Лекарство добавлено вручную."); return true;
        }}
        onSave={(product, qty, expiry) => {
          const next = structuredClone(state);
          if (!addCatalogStock(next, product, qty, expiry)) return false;
          setState(next);
          close();
          setToast("Лекарство добавлено. Запас и список покупок обновлены.");
          return true;
        }}
      />
    );
  } else if (dialog?.type === "procedure-event")
    modal = (
      <ProcedureEventDetails
        state={state}
        event={dialog.event}
        onComplete={() => {
          const next = structuredClone(state);
          if (!completePlanEvent(next, dialog.event.id)) return;
          setState(next);
          close();
          setToast("Процедура отмечена как выполненная.");
        }}
      />
    );
  else if (dialog?.type === "sber-appointment")
    modal = <SberAppointmentStub event={dialog.event} onClose={close} />;
  else if (dialog?.type === "add-plan-event")
    modal = (
      <AddPlanEvent
        date={planSection === "regular" ? state.day : selectedDate}
        regular={planSection === "regular"}
        onImport={() => setDialog({ type: "import" })}
        onMedication={(course) => {
          const next = structuredClone(state);
          if (!addManualMedication(next, course)) return false;
          setState(next);
          close();
          setToast("Приём лекарства добавлен в план.");
          return true;
        }}
        onEvent={(event) => {
          const next = structuredClone(state);
          if (!addPlanEvent(next, event)) return false;
          setState(next);
          close();
          setToast("Событие добавлено в план.");
          return true;
        }}
      />
    );
  else if (dialog?.type === "import")
    modal = (
      <ImportPrescription
        state={state}
        initialDate={
          view === "plan" && planSection === "calendar"
            ? selectedDate
            : state.day
        }
        onSave={(course, stock) => {
          change((s) => {
            s.courses.push(course);
            s.stock = stock;
            record(s, "course", me.name + " запустила план", course.title);
          });
          close();
          navigate("plan");
          setToast("Проверенный план запущен.");
        }}
      />
    );
  else if (dialog?.type === "patient")
    modal = (
      <form
        onSubmit={(e) => {
          const d = formData(e);
          if (!owner) return;
          change((s) => {
            s.patient = {
              name: String(d.get("name")).trim(),
              contact: String(d.get("contact") || "").trim(),
              age: Number(d.get("age")),
              city: String(d.get("city")).trim(),
              short: String(d.get("short")).trim(),
            };
          });
          close();
        }}
      >
        <fieldset disabled={!owner}>
          <Field
            label="ФИО"
            name="name"
            defaultValue={state.patient.name}
            placeholder="Иванов Иван Иванович"
          />
          <Field
            label="Контакт"
            name="contact"
            type="tel"
            required={false}
            defaultValue={state.patient.contact || ""}
            placeholder="+7 (999) 123-45-67"
          />
          <Field
            label="Возраст"
            name="age"
            type="number"
            min={18}
            max={120}
            defaultValue={state.patient.age}
          />
          <Field label="Город" name="city" defaultValue={state.patient.city} />
          <Field
            label="Как называете близкого"
            name="short"
            defaultValue={state.patient.short}
          />
          {owner && <Button type="submit">Сохранить</Button>}
        </fieldset>
      </form>
    );
  else if (dialog?.type === "contact")
    modal = (
      <>
        {state.members
          .filter((m) => m.view && m.id !== state.role)
          .map((m) => (
            <div className="responsible" key={m.id}>
              <span className="avatar">{m.name[0]}</span>
              <div className="grow">
                <strong>{m.name}</strong>
                <p>{m.id === "anna" ? "Менеджер лечения" : m.relation}</p>
              </div>
              <Button
                kind="soft"
                onClick={() =>
                  setToast(
                    "Демо-звонок: " +
                      m.name +
                      ". Телефония пока не подключена.",
                  )
                }
              >
                <Icon name="phone" />
                Позвонить
              </Button>
            </div>
          ))}
        <p className="caption">
          В прототипе звонки демонстрируются без набора номера.
        </p>
      </>
    );
  else if (dialog?.type === "delete-helper") {
    const helper = state.members.find(
      (member) => member.id === dialog.id && member.role === "family",
    );
    modal =
      owner && helper ? (
        <>
          <p>
            Удалить помощника {helper.name}? Он исчезнет из всех профилей и
            списка контактов.
          </p>
          <div className="profile-actions">
            <Button
              kind="danger"
              onClick={() => {
                change((next) => {
                  removeHelper(next, helper.id);
                });
                close();
                setToast("Помощник удалён.");
              }}
            >
              Удалить помощника
            </Button>
            <Button kind="white" onClick={close}>
              Отмена
            </Button>
          </div>
        </>
      ) : null;
  } else if (
    dialog?.type === "caregiver" ||
    dialog?.type === "manager" ||
    dialog?.type === "helper"
  ) {
    const managerProfile = dialog.type === "manager";
    const profileMember = state.members.find((member) =>
      dialog.type === "manager"
        ? member.id === "anna"
        : (dialog.type === "caregiver" || dialog.type === "helper") &&
          member.id === dialog.id &&
          member.role === (dialog.type === "helper" ? "family" : "caregiver"),
    );
    modal =
      owner && profileMember ? (
        <form
          key={profileMember.id}
          onSubmit={(event) => {
            const data = formData(event);
            const name = String(data.get("name")).trim();
            if (!name) return;
            change((next) => {
              const member = next.members.find(
                (item) => item.id === profileMember.id,
              )!;
              member.name = name;
              member.contact = String(data.get("contact") || "").trim();
              record(
                next,
                "profile",
                managerProfile
                  ? "Обновлён профиль менеджера лечения"
                  : dialog.type === "helper"
                    ? "Обновлён профиль помощника"
                    : "Обновлён профиль сиделки",
                name,
              );
            });
            close();
          }}
        >
          <Field
            label="ФИО"
            name="name"
            defaultValue={profileMember.name}
            placeholder="Иванов Иван Иванович"
          />
          <Field
            label={managerProfile ? "Телефон" : "Контакт"}
            name="contact"
            type="tel"
            required={false}
            defaultValue={profileMember.contact || ""}
            placeholder="+7 (999) 123-45-67"
          />
          <p className="caption">
            Роль:{" "}
            {managerProfile
              ? "Менеджер лечения"
              : dialog.type === "helper"
                ? `Помощник · ${profileMember.relation}`
                : "Сиделка"}
          </p>
          <Button type="submit">Сохранить</Button>
        </form>
      ) : null;
  } else if (dialog?.type === "invite")
    modal = (
      <form
        onSubmit={(e) => {
          const d = formData(e);
          if (!owner) return;
          change((s) => {
            s.members.push({
              id: uid(),
              name: String(d.get("name")).trim(),
              relation: String(d.get("relation")),
              role: d.get("relation") === "Сиделка" ? "caregiver" : "family",
              view: true,
              mark: false,
              stock: false,
              alerts: true,
            });
            record(
              s,
              "invite",
              me.name + " добавила помощника",
              String(d.get("name")),
            );
          });
          close();
          setToast("Участник добавлен в этом браузере.");
        }}
      >
        <Field label="Имя" name="name" />
        <label className="field">
          <span>Роль</span>
          <select name="relation">
            <option>Сиделка</option>
            <option>Родственник</option>
          </select>
        </label>
        <label className="check-row">
          <input type="checkbox" required />
          Подтверждаю согласие близкого или полномочия законного представителя
        </label>
        <Button type="submit">Добавить</Button>
      </form>
    );
  else if (dialog?.type === "settings")
    modal = (
      <form
        onSubmit={(e) => {
          const d = formData(e);
          if (!owner) return;
          change((s) => {
            s.settings.grace = Number(d.get("grace"));
            s.settings.backup = String(d.get("backup"));
          });
          close();
        }}
      >
        <label className="field">
          <span>Сигнал через</span>
          <select name="grace" defaultValue={state.settings.grace}>
            {[15, 30, 60].map((n) => (
              <option key={n} value={n}>
                {n} минут без отметки
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Резервный ответственный</span>
          <select name="backup" defaultValue={state.settings.backup}>
            {state.members
              .filter((m) => m.view)
              .map((m) => (
                <option value={m.id} key={m.id}>
                  {m.name}
                </option>
              ))}
          </select>
        </label>
        <p className="caption">
          Сигналы отображаются в приложении. Push и SMS пока не подключены.
        </p>
        <Button type="submit">Сохранить</Button>
      </form>
    );
  else if (dialog?.type === "clock")
    modal = (
      <DemoClock
        onReset={(id) => {
          change((s) => {
            resetDemoDose(s, id);
          });
          setCompletedDose(null);
        }}
        events={ev}
        clock={state.clock}
        onSelect={(minute) => {
          if (!Number.isInteger(minute) || minute < 0 || minute > 1439) return;
          change((s) => {
            setDemoTime(s, minute);
          });
          setCompletedDose(null);
          close();
        }}
      />
    );
  else if (dialog?.type === "end")
    modal = (
      <>
        <p>
          Приёмы курса исчезнут из расписания. Журнал сохранится. Завершайте
          курс в соответствии с назначением врача.
        </p>
        <div className="stack space">
          <Button
            onClick={() => {
              if (!owner) return;
              change((s) => {
                const c = s.courses.find((c) => c.id === dialog.id);
                if (c) {
                  c.active = false;
                  record(s, "course", me.name + " завершила курс", c.title);
                }
              });
              close();
            }}
          >
            Завершить курс
          </Button>
          <Button kind="white" onClick={close}>
            Отмена
          </Button>
        </div>
      </>
    );
  else if (dialog?.type === "about")
    modal = (
      <div className="mini-article">
        <p>
          Контроль лечения: план приёмов, отметки, запасы лекарств, роли и
          журнал событий.
        </p>
        <p>
          Данные сохраняются в этом браузере. Фото и PDF распознаются на
          устройстве. Результат необходимо сверить с назначением врача.
        </p>
        <p>
          Выбор аккаунта — демонстрационный вход. Серверная авторизация,
          синхронизация, звонки и доставка push пока не подключены.
        </p>
        <a href="./analysis.html" target="_blank" rel="noreferrer">
          Материалы и состав MVP
        </a>
      </div>
    );
  const dialogTitles: Record<Dialog["type"], string> = {
    event: "Приём лекарства",
    "procedure-event": "Процедура",
    stock: "Домашний запас",
    "medication-info":
      dialog?.type === "medication-info" ? dialog.stock.name : "О препарате",
    catalog: "Добавить лекарство",
    "share-stock": "Поделиться списком покупок",
    purchase: dialog?.type === "purchase" && dialog.mode === "nearby" ? "Найти аптеку рядом" : "Купить лекарства",
    import: "Распознать назначение",
    "add-plan-event": "Добавить событие",
    "sber-appointment": "Переход в СберЗдоровье",
    patient: "Профиль пациента",
    contact: "Связаться с близкими",
    caregiver: "Профиль сиделки",
    helper: "Профиль помощника",
    "delete-helper": "Удалить помощника?",
    manager: "Профиль менеджера лечения",
    invite: "Добавить помощника",
    settings: "Настройки сигналов",
    clock: "Управление демо",
    about: "Об Аптечке",
    end: "Завершить курс?",
  };
  return (
    <>
      <div
        className={`app ${account === "senior" ? "senior" : ""}`}
        inert={!!dialog}
      >
        <header id="header">
          <div className="between">
            <a className="brand" href="#home" onClick={() => navigate("home")}>
              <BrandLogo />
            </a>
            <div className="header-account-actions">
            <button
              className="profile-btn"
              onClick={() => {
                if (view !== "profile") setProfileReturn(view);
                navigate("profile");
              }}
              aria-label={`Открыть профиль: ${me.name}`}
              title={`${me.name} · ${active?.role}`}
              aria-current={view === "profile" ? "page" : undefined}
            >
              <span
                className={`avatar ${account === "elena" ? "sand" : ""}`}
                aria-hidden="true"
              >
                {me.name
                  .trim()
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join("")
                  .toLocaleUpperCase("ru-RU")}
              </span>
            </button>
            <NotificationCenter state={state} onNavigate={navigate}
              onRead={(ids) => change((s) => markNotificationsRead(s, ids))} />
            </div>
          </div>
          <div className="header-note">
            <span>
              <i className="dot" />
              Рядом, даже на расстоянии
            </span>
            <button
              className="text-link demo-clock"
              onClick={() => setDialog({ type: "clock" })}
            >
              <Icon name="clock" /> Демо · {hm(state.clock)}{" "}
              <Icon name="chevron" />
            </button>
          </div>
        </header>
        <main id="main">
          {content}
          {view !== "chat" && (
            <div className="footnote">
              Учебное демо · данные остаются в этом браузере
              <br />
              <button
                className="text-link"
                onClick={() => setDialog({ type: "about" })}
              >
                О прототипе и его возможностях
              </button>
            </div>
          )}
        </main>
        {account !== "senior" && (
          <nav id="nav" aria-label="Основная навигация">
            {tabs.map((t) => (
              <button
                key={t.id}
                aria-label={t.label}
                aria-current={
                  view === t.id || (t.id === "plan" && view === "edit-event")
                    ? "page"
                    : undefined
                }
                className={
                  view === t.id || (t.id === "plan" && view === "edit-event")
                    ? "active"
                    : ""
                }
                onClick={() => navigate(t.id)}
              >
                <Icon name={t.icon} />
                <span>{t.label}</span>
              </button>
            ))}
          </nav>
        )}
      </div>
      {dialog && (
        <Modal
          title={dialogTitles[dialog.type]}
          onClose={close}
          bottomSheet={dialog.type === "medication-info"}
        >
          {modal}
        </Modal>
      )}
      {toast && (
        <div id="toastRoot" role="status">
          <div className="toast">{toast}</div>
        </div>
      )}
    </>
  );
}
