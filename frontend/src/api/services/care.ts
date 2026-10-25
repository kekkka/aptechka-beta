// Everything scoped to one care profile: /api/patients/{id}/...
import type {ApiClient} from '../client.ts';
import type {
  CareMember, CareRole, Course, CourseMedInput, Dose, HelpRequest, PatientProfile, Reading, ScanResult, ShoppingItem,
  Signal, StockInput, StockItem, Summary, Threshold, VitalType
} from '../types.ts';

export interface PatientInput {
  name: string;
  birthYear?: number | null;
  notes?: string | null;
  graceMinutes?: number;
}

export const careService = (client: ApiClient) => {
  const p = (id: string, path = '') => `/api/patients/${encodeURIComponent(id)}${path}`;
  return {
    createPatient: (body: PatientInput & {relation?: string}) => client.post<PatientProfile>('/api/patients', body),
    patient: (id: string) => client.get<PatientProfile>(p(id)),
    updatePatient: (id: string, body: PatientInput & {graceMinutes: number}) => client.put<PatientProfile>(p(id), body),

    members: (id: string) => client.get<CareMember[]>(p(id, '/members')),
    addMember: (id: string, body: {email: string; role: CareRole; relation?: string}) => client.post<CareMember>(p(id, '/members'), body),
    updateMember: (id: string, memberId: string, body: {role: CareRole; relation?: string | null}) => client.put<CareMember>(p(id, `/members/${memberId}`), body),
    removeMember: (id: string, memberId: string) => client.delete<null>(p(id, `/members/${memberId}`)),

    courses: (id: string) => client.get<Course[]>(p(id, '/courses')),
    createCourse: (id: string, body: {title: string; startDate: string; source?: string; meds: CourseMedInput[]}) => client.post<Course>(p(id, '/courses'), body),
    endCourse: (id: string, courseId: string) => client.post<Course>(p(id, `/courses/${courseId}/end`)),

    schedule: (id: string, date?: string) => client.get<Dose[]>(p(id, '/schedule'), {query: {date}}),
    mark: (id: string, body: {courseMedId: string; date: string; time: string; status: 'TAKEN' | 'SKIPPED'; note?: string}) => client.post<Dose>(p(id, '/doses'), body),
    unmark: (id: string, logId: string) => client.delete<null>(p(id, `/doses/${logId}`)),

    stock: (id: string) => client.get<StockItem[]>(p(id, '/stock')),
    addStock: (id: string, body: StockInput) => client.post<StockItem>(p(id, '/stock'), body),
    updateStock: (id: string, itemId: string, body: StockInput) => client.put<StockItem>(p(id, `/stock/${itemId}`), body),
    removeStock: (id: string, itemId: string) => client.delete<null>(p(id, `/stock/${itemId}`)),
    scan: (id: string, code: string) => client.post<ScanResult>(p(id, '/stock/scan'), {code}),
    shopping: (id: string) => client.get<ShoppingItem[]>(p(id, '/shopping')),

    vitals: (id: string, type?: VitalType, days = 30) => client.get<Reading[]>(p(id, '/vitals'), {query: {type, days}}),
    recordVital: (id: string, body: {type: VitalType; value1: number; value2?: number | null; note?: string}) => client.post<Reading>(p(id, '/vitals'), body),
    thresholds: (id: string) => client.get<Threshold[]>(p(id, '/vital-thresholds')),
    setThreshold: (id: string, type: VitalType, body: {min1: number | null; max1: number | null; min2: number | null; max2: number | null}) =>
      client.put<Threshold>(p(id, `/vital-thresholds/${type}`), body),
    resetThreshold: (id: string, type: VitalType) => client.delete<null>(p(id, `/vital-thresholds/${type}`)),

    requestHelp: (id: string, message?: string) => client.post<HelpRequest>(p(id, '/help-requests'), {message}),
    resolveHelp: (id: string, requestId: string) => client.post<HelpRequest>(p(id, `/help-requests/${requestId}/resolve`)),

    signals: (id: string) => client.get<Signal[]>(p(id, '/signals')),
    summary: (id: string) => client.get<Summary>(p(id, '/summary'))
  };
};

export type CareService = ReturnType<typeof careService>;
