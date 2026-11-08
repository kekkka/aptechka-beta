import { demoCalls } from "./monitoring";
import { fmt, medKey, shopping, signals } from "./model";
import { inventoryItems } from "./inventory";
import type { State } from "./types";

export type NotificationKind = "caregiver" | "patient" | "stock" | "health";
export interface CareNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  text: string;
  source: string;
  time?: string;
  demo?: boolean;
  detail?: string;
  action?: "plan" | "stock" | "devices";
  callId?: string;
}

// Store the version that was read: materially updated cards become unread again.
function notificationVersion(item: CareNotification): string {
  return JSON.stringify([item.title, item.text, item.source, item.time, item.detail]);
}

export function isNotificationRead(state: State, item: CareNotification): boolean {
  return state.notificationReads?.[state.role]?.[item.id] === notificationVersion(item);
}

export function unreadNotificationCount(state: State): number {
  return careNotifications(state).filter((item) => !item.demo && !isNotificationRead(state, item)).length;
}

export function markNotificationsRead(state: State, ids: string[]): void {
  const selected = new Set(ids);
  const visible = careNotifications(state).filter((item) => selected.has(item.id));
  if (!visible.length) return;
  state.notificationReads ??= {};
  const receipts = state.notificationReads[state.role] ??= {};
  for (const item of visible) receipts[item.id] = notificationVersion(item);
}

/** Derived from current care data; demo integrations never count as alerts. */
export function careNotifications(state: State): CareNotification[] {
  if (state.role === "senior") return [];
  const doses: CareNotification[] = signals(state).map((event) => {
    const explicitSkip = event.log?.status === "skipped";
    return {
      id: `dose:${event.id}`,
      kind: "caregiver",
      title: explicitSkip ? "Пациент пропустил приём" : "Приём не подтверждён вовремя",
      text: `${event.med.name} · ${event.med.strength} · приём в ${event.time}`,
      source: explicitSkip
        ? `${event.log?.actorName || "Участник заботы"} · отметка о пропуске`
        : "Автоматический сигнал · отметка о приёме не появилась",
      time: event.log?.time || event.time,
      detail: explicitSkip
        ? event.log?.note || "Причина пропуска не указана. Уточните ситуацию в плане лечения."
        : "Отсутствие отметки не подтверждает, что лекарство не принято. Сиделке нужно уточнить ситуацию у пациента.",
      action: "plan",
    };
  });
  const inventory = inventoryItems(state);
  const stock: CareNotification[] = shopping(state).map((need) => ({
    id: `stock:${medKey(need.med)}`,
    kind: "stock",
    title: `Нужно докупить: ${need.med.name}`,
    text: `${need.med.strength} · дома ${inventory.find((item) => item.key === medKey(need.med))?.qty ?? 0} ${need.med.unit} · докупить ${need.missing} ${need.med.unit}${need.packs ? ` (около ${need.packs} уп.)` : ""}`,
    source: "Домашняя аптечка · расчёт по плану лечения",
    detail: `На оставшийся курс до ${fmt(need.end)} нужно ${need.needed} ${need.med.unit} Учтено пригодного запаса: ${need.qty} ${need.med.unit} После пополнения потребность пересчитается.`,
    action: "stock",
  }));
  return [
    ...doses,
    ...(state.role === "anna" ? demoCalls(state).slice(0, 2).map(call => ({
      id: `demo:${call.id}`, kind: "patient" as const, title: call.status === "missed" ? "Пациент не ответил на звонок" : "Самочувствие после звонка",
      text: call.summary, source: "Мониторинг · пример звонка", time: call.at, demo: true,
      action: "devices" as const, callId: call.id,
    })) : []),
    ...stock,
    ...(state.role === "anna" ? [{
      id: "demo:health-monitoring",
      kind: "health" as const,
      title: "Сигнал мониторинга здоровья",
      text: "Пример: измеренный показатель вышел за настроенный диапазон.",
      source: "Мониторинг здоровья · пример уведомления",
      demo: true,
      detail: "Здесь появятся название показателя, измеренное значение, время и источник измерения. Мониторинг пока не подключён: эта карточка не отражает состояние пациента.",
    }] : []),
  ];
}
