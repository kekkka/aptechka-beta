import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { UserProfile } from "../src/UserProfile";
import { Field } from "../src/components";
import { seed, upgradeDemoProfiles, removeHelper } from "../src/model";
import type { AccountId } from "../src/types";

function renderProfile(account: AccountId, state = seed()) {
  const noop = () => {};
  return renderToStaticMarkup(
    createElement(UserProfile, {
      state,
      account,
      onBack: noop,
      onEditPatient: noop,
      onEditManager: noop,
      onCallMember: noop,
      onCallPatient: noop,
      onEditCaregiver: noop,
      onEditHelper: noop,
      onDeleteHelper: noop,
      onEmergencyContact: noop,
      onInvite: noop,
      onLogout: noop,
    }),
  );
}

test("Profile fields display examples without saving them as values", () => {
  for (const field of [
    { label: "ФИО", name: "name", placeholder: "Иванов Иван Иванович" },
    {
      label: "Телефон",
      name: "contact",
      type: "tel",
      placeholder: "+7 (999) 123-45-67",
    },
  ]) {
    const html = renderToStaticMarkup(createElement(Field, field));
    assert.ok(html.includes(`placeholder="${field.placeholder}"`));
    assert.ok(html.includes('value=""'));
  }
});

test("Patient profile shows current patient data, care team and simple actions", () => {
  const state = seed();
  state.patient.name = "Мария Ивановна";
  state.patient.city = "Москва";
  const html = renderProfile("senior", state);
  for (const text of [
    "Мария Ивановна",
    "Пациент",
    "Близкие и помощники",
    "Елена",
    "Анна",
    "Позвонить:",
    "Выйти из аккаунта",
  ]) {
    assert.ok(html.includes(text), text);
  }
  assert.ok(!html.includes("Добавить помощника"));
  assert.ok(!html.includes("Настройки сигналов"));
  assert.ok(!html.includes("Москва"));
  assert.ok(!html.includes("Город"));
});

test("Caregiver profile shows caregiver identity without permissions or manager controls", () => {
  const state = seed();
  state.members.find((member) => member.id === "elena")!.name =
    "Елена Сергеевна";
  const html = renderProfile("elena", state);
  for (const text of [
    "Елена Сергеевна",
    "Сиделка",
    "Нина Петровна",
    "Позвонить пациенту",
  ]) {
    assert.ok(html.includes(text), text);
  }
  assert.ok(!html.includes("Добавить помощника"));
  assert.ok(!html.includes("Изменить данные пациента"));
  assert.ok(!html.includes("Настройки сигналов"));
  assert.ok(!html.includes("Права доступа"));
});

test("Patient and caregiver identities show avatars and contact data without editing", () => {
  const state = seed();
  for (const account of ["senior", "elena"] as const) {
    const profile =
      account === "senior"
        ? state.patient
        : state.members.find((member) => member.id === account)!;
    profile.contact = "+7 (999) 111-22-33";
    const html = renderProfile(account, state);
    const identity = html.match(
      /<section class="profile-card profile-identity".*?<\/section>/,
    )![0];
    assert.ok(identity.includes('class="profile-portrait" aria-hidden="true"'));
    assert.ok(
      identity.includes(account === "senior" ? ">ИН</span>" : ">СЕ</span>"),
    );
    assert.ok(identity.includes("<dt>ФИО</dt>"));
    assert.ok(identity.includes(profile.name));
    assert.ok(identity.includes("<dt>Телефон</dt>"));
    assert.ok(identity.includes(profile.contact));
    assert.equal(identity.includes("<dt>Возраст</dt>"), account === "senior");
    assert.ok(!html.includes("profile-edit-button"));
    assert.ok(!html.includes("Изменить профиль"));
    assert.ok(!html.includes("<input"));
    assert.ok(!html.includes("<select"));
  }
});

test("Manager profile includes profile management and emergency contact selection", () => {
  const html = renderProfile("anna");
  for (const text of [
    "Анна",
    "Менеджер лечения",
    "Добавить помощника",
    "Пациент",
    "Сиделка",
    "Изменить профиль",
    "Экстренный контакт",
  ]) {
    assert.ok(html.includes(text), text);
  }
  assert.ok(!html.includes("Нет доступа"));
  assert.ok(!html.includes("Права доступа"));
  assert.ok(!html.includes("План, чат и сигналы"));
  assert.ok(!html.includes("Настройки сигналов"));
});

test("Profile reflects revoked caregiver access and hides removed team members", () => {
  const state = seed();
  state.members.find((member) => member.id === "elena")!.view = false;
  const caregiver = renderProfile("elena", state);
  assert.ok(!caregiver.includes("Права доступа"));
  assert.ok(!renderProfile("senior", state).includes("Елена"));
});

test("Profile identity omits patient relationship rows and manager description", () => {
  for (const account of ["anna", "elena"] as const) {
    const html = renderProfile(account);
    assert.ok(!html.includes("<dt>Пациент</dt>"));
    assert.ok(!html.includes("Отношение к пациенту"));
    assert.ok(!html.includes("Управление профилями пациента и сиделок"));
    assert.ok(
      html.includes(account === "anna" ? "Пациент" : "Данные пациента"),
    );
    assert.ok(html.includes("Нина Петровна"));
  }
});

test("Profile headings describe section contents for every role", () => {
  for (const account of ["senior", "elena", "anna"] as const) {
    const html = renderProfile(account);
    assert.ok(html.includes("Профиль пользователя"));
    assert.equal(
      html.includes(
        account === "senior"
          ? "Приёмы и история"
          : account === "anna"
            ? "План, чат и сигналы"
            : "План и чат",
      ),
      false,
    );
    for (const phrase of ["забот", "Моя работа", "Моё лечение"]) {
      assert.ok(!html.includes(phrase), phrase);
    }
  }
});

test("Profiles omit team contacts and caregiver navigation and offer calls to the patient", () => {
  for (const account of ["anna", "elena", "senior"] as const) {
    const html = renderProfile(account);
    assert.ok(!html.includes("Контакты команды"));
    assert.ok(!html.includes("План и чат"));
    assert.equal(html.includes("Позвонить пациенту"), account !== "senior");
    if (account === "elena") {
      assert.ok(!html.includes("План приёмов"));
      assert.ok(!html.includes("Чат команды"));
    }
  }
  const state = seed();
  state.patient.contact = "";
  for (const account of ["anna", "elena"] as const) {
    const html = renderProfile(account, state);
    assert.match(
      html,
      /<button[^>]*disabled=""[^>]*>.*?Позвонить пациенту<\/button>/,
    );
  }
});

test("Manager can select an active emergency contact and sees a red logout button", () => {
  const state = seed();
  state.settings.emergencyContact = "elena";
  state.members.find((member) => member.id === "max")!.view = false;
  const html = renderProfile("anna", state);
  assert.ok(html.includes('value="elena" selected=""'));
  assert.ok(!html.includes('value="max"'));
  assert.ok(html.includes('class="btn btn-danger"'));
  assert.ok(html.includes("Выйти из аккаунта"));
});

test("Manager uses matching patient and caregiver cards with contact details", () => {
  const state = seed();
  state.patient.contact = "+7 900 111-22-33";
  state.members.find((member) => member.id === "elena")!.contact =
    "+7 900 444-55-66";
  const html = renderProfile("anna", state);
  const cards = html.match(
    /<section class="profile-card" aria-label="(?:Пациент|Сиделка)">.*?<\/section>/g,
  )!;
  assert.equal(cards.length, 2);
  for (const card of cards) {
    assert.ok(card.includes('class="profile-person-heading"'));
    assert.ok(card.includes('class="avatar" aria-hidden="true"'));
    assert.ok(card.includes("<dt>ФИО</dt>"));
    assert.ok(card.includes("<dt>Контакт</dt>"));
    assert.ok(card.includes("Изменить профиль"));
    assert.ok(card.includes('class="profile-edit-button"'));
    assert.ok(card.includes('aria-label="Изменить профиль:'));
    assert.ok(!card.includes(">Изменить профиль</button>"));
  }
  assert.ok(cards[0].includes(">ИН</span>"));
  assert.ok(cards[1].includes(">СЕ</span>"));
  assert.ok(cards[0].includes(state.patient.contact));
  assert.ok(cards[0].includes("<dt>Возраст</dt>"));
  assert.ok(cards[1].includes("+7 900 444-55-66"));
  assert.ok(!cards[1].includes("<dt>Возраст</dt>"));
});

test("Manager cards support saved profiles without contacts", () => {
  const state = seed();
  delete state.patient.contact;
  for (const member of state.members) delete member.contact;
  const html = renderProfile("anna", state);
  assert.equal((html.match(/<dd>Не указан<\/dd>/g) || []).length, 4);
});

test("Demo profiles contain full names and phone numbers", () => {
  const state = seed();
  for (const profile of [
    state.patient,
    ...state.members.filter((member) =>
      ["anna", "elena", "max"].includes(member.id),
    ),
  ]) {
    assert.equal(profile.name.split(" ").length, 3);
    assert.match(profile.contact!, /^\+7 \(999\) \d{3}-\d{2}-\d{2}$/);
  }
});

test("Grandson is shown as a callable helper in every profile", () => {
  const state = seed();
  const grandson = state.members.find((member) => member.id === "max")!;
  for (const account of ["anna", "elena", "senior"] as const) {
    const html = renderProfile(account, state);
    const card = html.match(
      /<section class="profile-card" aria-label="Помощник · Внук">.*?<\/section>/,
    )![0];
    assert.ok(card.includes(grandson.name));
    assert.ok(card.includes(grandson.contact!));
    assert.ok(card.includes('class="avatar"'));
    assert.equal(
      card.includes(`Позвонить: ${grandson.name}`),
      account !== "anna",
    );
    assert.equal(card.includes("profile-edit-button"), account === "anna");
    assert.equal(card.includes("Удалить помощника"), account === "anna");
    assert.equal(
      card.includes('class="profile-delete-button"'),
      account === "anna",
    );
    assert.ok(!card.includes(">Удалить помощника</button>"));
    assert.ok(!card.includes('disabled=""'));
  }
  grandson.view = false;
  for (const account of ["anna", "elena", "senior"] as const) {
    assert.ok(!renderProfile(account, state).includes("Помощник · Внук"));
  }
});

test("Saved grandson demo data is upgraded without changing permissions or custom contacts", () => {
  const state = seed();
  const grandson = state.members.find((member) => member.id === "max")!;
  grandson.name = "Максим";
  delete grandson.contact;
  grandson.view = false;
  upgradeDemoProfiles(state);
  assert.equal(grandson.name, "Иванов Максим Андреевич");
  assert.equal(grandson.contact, "+7 (999) 456-78-90");
  assert.equal(grandson.view, false);
  grandson.name = "Максим";
  grandson.contact = "+7 900 111-22-33";
  upgradeDemoProfiles(state);
  assert.equal(grandson.name, "Максим");
  assert.equal(grandson.contact, "+7 900 111-22-33");
});

test("Only the manager can remove a helper and related contact settings are reset", () => {
  for (const role of ["senior", "elena"] as const) {
    const state = seed();
    state.role = role;
    const before = JSON.stringify(state);
    assert.equal(removeHelper(state, "max"), false);
    assert.equal(JSON.stringify(state), before);
  }
  const state = seed();
  for (const id of ["anna", "elena", "unknown"]) {
    assert.equal(removeHelper(state, id), false);
  }
  state.settings.emergencyContact = "max";
  state.settings.backup = "max";
  const courses = JSON.stringify(state.courses);
  assert.equal(removeHelper(state, "max"), true);
  assert.equal(state.settings.emergencyContact, "anna");
  assert.equal(state.settings.backup, "anna");
  assert.equal(JSON.stringify(state.courses), courses);
  assert.equal(removeHelper(state, "max"), false);
  const saved = JSON.parse(JSON.stringify(state));
  upgradeDemoProfiles(saved);
  assert.ok(
    !saved.members.some((member: { id: string }) => member.id === "max"),
  );
  for (const account of ["anna", "elena", "senior"] as const) {
    assert.ok(!renderProfile(account, saved).includes("Помощник · Внук"));
  }
});

test("Saved default profiles are prefilled once without overwriting custom data", () => {
  const state = seed();
  state.patient.name = "Нина Петровна";
  delete state.patient.contact;
  const manager = state.members.find((member) => member.id === "anna")!;
  manager.name = "Анна";
  delete manager.contact;
  const caregiver = state.members.find((member) => member.id === "elena")!;
  caregiver.name = "Елена";
  delete caregiver.contact;
  upgradeDemoProfiles(state);
  assert.deepEqual(state.patient, seed().patient);
  assert.deepEqual(state.members, seed().members);
  const once = JSON.stringify(state);
  upgradeDemoProfiles(state);
  assert.equal(JSON.stringify(state), once);
  state.patient.name = "Мой пациент";
  delete state.patient.contact;
  manager.name = "Анна";
  manager.contact = "";
  caregiver.name = "Елена";
  caregiver.contact = "+7 900 000-00-00";
  const custom = JSON.stringify(state);
  upgradeDemoProfiles(state);
  assert.equal(JSON.stringify(state), custom);
});

test("Manager identity shows editable full name and phone", () => {
  const state = seed();
  const manager = state.members.find((member) => member.id === "anna")!;
  manager.name = "Анна Ивановна Петрова";
  manager.contact = "+7 900 123-45-67";
  const html = renderProfile("anna", state);
  const identity = html.match(
    /<section class="profile-card profile-identity".*?<\/section>/,
  )![0];
  assert.ok(identity.includes("<dt>ФИО</dt>"));
  assert.ok(identity.includes(manager.name));
  assert.ok(identity.includes("<dt>Телефон</dt>"));
  assert.ok(identity.includes(manager.contact));
  assert.ok(identity.includes("Изменить профиль"));
  assert.ok(identity.includes('class="profile-edit-button"'));
  assert.ok(
    identity.includes(`aria-label="Изменить профиль: ${manager.name}"`),
  );
  for (const account of ["senior", "elena"] as const) {
    assert.ok(!renderProfile(account, state).includes("Изменить профиль"));
  }
});
