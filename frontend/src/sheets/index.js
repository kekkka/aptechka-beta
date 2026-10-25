import {ImportSheet} from '../import/ImportSheet.jsx';
import {ConfirmSheet, EventSheet, SeniorTakeSheet, SkipSheet, SnoozeSheet} from './EventSheets.jsx';
import {ContactSheet, DemoCallSheet, InviteSheet, PatientSheet, PermissionsSheet, RolesSheet, SignalSettingsSheet} from './FamilySheets.jsx';
import {AboutSheet, ClockSheet, EndCourseSheet, LaunchedSheet, ResetSheet} from './MiscSheets.jsx';
import {BuySheet, StockSheet} from './StockSheets.jsx';

// Sheet type → component; opened with openSheet(type, props).
export const SHEETS = {
  event: EventSheet, confirm: ConfirmSheet, skip: SkipSheet, snooze: SnoozeSheet, seniorTake: SeniorTakeSheet,
  roles: RolesSheet, contact: ContactSheet, demoCall: DemoCallSheet, permissions: PermissionsSheet, invite: InviteSheet,
  signalSettings: SignalSettingsSheet, patient: PatientSheet,
  stock: StockSheet, buy: BuySheet,
  clock: ClockSheet, about: AboutSheet, reset: ResetSheet, endCourse: EndCourseSheet,
  import: ImportSheet, launched: LaunchedSheet
};
