import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { UserProfile } from "../src/UserProfile";
import { seed } from "../src/model";
import type { AccountId } from "../src/types";

function renderProfile(account: AccountId, state = seed()) {
  const noop = () => {};
  return renderToStaticMarkup(
    createElement(UserProfile, {
      state,
      account,
      onBack: noop,
      onNavigate: noop,
      onEditPatient: noop,
      onContacts: noop,
      onSettings: noop,
      onInvite: noop,
      onLogout: noop,
    }),
  );
}

test("Patient profile shows current patient data, care team and simple actions", () => {
  const state = seed();
  state.patient.name = "Мария Ивановна";
  state.patient.city = "Москва";
  const html = renderProfile("senior", state);
  for (const text of [
    "Мария Ивановна",
    "Москва",
    "Пациент",
    "Близкие и помощники",
    "Елена",
    "Анна",
    "История для врача",
    "Сменить аккаунт",
  ]) {
    assert.ok(html.includes(text), text);
  }
  assert.ok(!html.includes("Добавить помощника"));
  assert.ok(!html.includes("Настройки сигналов"));
});

test("Caregiver profile shows caregiver identity and actual permissions, not manager controls", () => {
  const state = seed();
  state.members.find((member) => member.id === "elena")!.name =
    "Елена Сергеевна";
  const html = renderProfile("elena", state);
  for (const text of [
    "Елена Сергеевна",
    "Сиделка",
    "Нина Петровна",
    "Права доступа",
    "Нет доступа",
    "Чат команды",
  ]) {
    assert.ok(html.includes(text), text);
  }
  assert.ok(!html.includes("Добавить помощника"));
  assert.ok(!html.includes("Изменить данные пациента"));
  assert.ok(!html.includes("Настройки сигналов"));
});

test("Manager profile includes coordination and settings actions", () => {
  const html = renderProfile("anna");
  for (const text of [
    "Анна",
    "Менеджер лечения",
    "Дочь",
    "Добавить помощника",
    "Изменить данные пациента",
    "Настройки сигналов",
    "План, чат и сигналы",
  ]) {
    assert.ok(html.includes(text), text);
  }
  assert.ok(!html.includes("Нет доступа"));
});

test("Profile reflects revoked caregiver access and hides removed team members", () => {
  const state = seed();
  state.members.find((member) => member.id === "elena")!.view = false;
  const caregiver = renderProfile("elena", state);
  assert.equal((caregiver.match(/Нет доступа/g) || []).length, 4);
  assert.ok(!renderProfile("senior", state).includes("Елена"));
});

test("Profile headings describe section contents for every role", () => {
  for (const account of ["senior", "elena", "anna"] as const) {
    const html = renderProfile(account);
    assert.ok(html.includes("Профиль пользователя"));
    assert.ok(
      html.includes(
        account === "senior"
          ? "Приёмы и история"
          : account === "anna"
            ? "План, чат и сигналы"
            : "План и чат",
      ),
    );
    for (const phrase of ["забот", "Моя работа", "Моё лечение"]) {
      assert.ok(!html.includes(phrase), phrase);
    }
  }
});
