import type {ComponentType} from 'react';
import {ImportSheet} from '../import/ImportSheet.tsx';
import {ConfirmSheet, EventSheet, SeniorTakeSheet, SkipSheet, SnoozeSheet} from './EventSheets.tsx';
import {ContactSheet, DemoCallSheet, InviteSheet, PatientSheet, PermissionsSheet, RolesSheet, SignalSettingsSheet} from './FamilySheets.tsx';
import {AboutSheet, ClockSheet, EndCourseSheet, LaunchedSheet, ResetSheet} from './MiscSheets.tsx';
import {BuySheet, StockSheet} from './StockSheets.tsx';

type NoProps = Record<never, never>;

// Props each sheet type is opened with.
export interface SheetProps {
  event: {id: string};
  confirm: {id: string};
  skip: {id: string};
  snooze: {id: string};
  seniorTake: {id: string};
  roles: NoProps;
  contact: NoProps;
  demoCall: {name: string};
  permissions: {id: string};
  invite: NoProps;
  signalSettings: NoProps;
  patient: NoProps;
  stock: {id?: string};
  buy: {medKey: string};
  clock: NoProps;
  about: NoProps;
  reset: NoProps;
  endCourse: {id: string};
  import: NoProps;
  launched: {courseId: string};
}
export type SheetType = keyof SheetProps;

// Sheet type → component; opened with openSheet(type, props).
export const SHEETS: {[K in SheetType]: ComponentType<SheetProps[K]>} = {
  event: EventSheet, confirm: ConfirmSheet, skip: SkipSheet, snooze: SnoozeSheet, seniorTake: SeniorTakeSheet,
  roles: RolesSheet, contact: ContactSheet, demoCall: DemoCallSheet, permissions: PermissionsSheet, invite: InviteSheet,
  signalSettings: SignalSettingsSheet, patient: PatientSheet,
  stock: StockSheet, buy: BuySheet,
  clock: ClockSheet, about: AboutSheet, reset: ResetSheet, endCourse: EndCourseSheet,
  import: ImportSheet, launched: LaunchedSheet
};
