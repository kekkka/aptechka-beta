import assert from 'node:assert/strict';
import {ApiError, createApi, createClient} from '../src/api/index.ts';

let checks = 0;
const test = async (name: string, fn: () => Promise<void>) => {
  await fn();
  checks++;
  console.log('PASS ' + name);
};
const reply = (status: number, body?: unknown) => new Response(body === undefined ? null : JSON.stringify(body), {status, headers: {'content-type': 'application/json'}});
type Call = RequestInit & {url: string; headers: Record<string, string>};
const mock = (handler: (url: URL | RequestInfo, init?: RequestInit) => Response) => {
  const calls: Call[] = [];
  const fetch: typeof globalThis.fetch = async (url, init) => { calls.push({url: String(url), ...init} as Call); return handler(url, init); };
  return {calls, fetch};
};
const hang: typeof globalThis.fetch = (_url, init) => new Promise((_, rej) => init!.signal!.addEventListener('abort', () => rej(init!.signal!.reason)));
const isApiError = (e: unknown): e is ApiError => e instanceof ApiError;

await test('Client joins base URL, query and sends JSON body', async () => {
  const m = mock(() => reply(200, {ok: true}));
  const c = createClient({baseUrl: 'http://api.test/', fetch: m.fetch});
  assert.deepEqual(await c.post('/x', {a: 1}, {query: {q: 'й', skip: null}}), {ok: true});
  assert.equal(m.calls[0].url, 'http://api.test/x?q=%D0%B9');
  assert.equal(m.calls[0].body, '{"a":1}');
  assert.equal(m.calls[0].headers['Content-Type'], 'application/json');
  assert.equal(m.calls[0].headers['X-Requested-With'], 'XMLHttpRequest');
});
await test('Basic credentials are sent once set and handle non-ASCII', async () => {
  const m = mock(() => reply(204));
  const c = createClient({fetch: m.fetch});
  await c.get('/a');
  assert.equal(m.calls[0].headers.Authorization, undefined);
  c.setCredentials({username: 'анна', password: 'p'});
  assert.equal(await c.get('/a'), null);
  assert.equal(Buffer.from(m.calls[1].headers.Authorization.slice(6), 'base64').toString(), 'анна:p');
});
await test('HTTP errors become ApiError with status and server message', async () => {
  const c = createClient({fetch: async () => reply(400, {detail: 'Плохой запрос'})});
  await assert.rejects(c.get('/a'), e => isApiError(e) && e.status === 400 && e.message === 'Плохой запрос');
});
await test('Network failure and timeout map to status 0', async () => {
  const c = createClient({fetch: async () => { throw new TypeError('fail'); }});
  await assert.rejects(c.get('/a'), e => isApiError(e) && e.network && e.message === 'Нет связи с сервером');
  await assert.rejects(createClient({timeout: 10, fetch: hang}).get('/a'), e => isApiError(e) && e.network && e.message === 'Сервер не ответил вовремя');
});
await test('Caller abort propagates as-is', async () => {
  const ctrl = new AbortController(), p = createClient({fetch: hang}).get('/a', {signal: ctrl.signal});
  ctrl.abort(new Error('stop'));
  await assert.rejects(p, {message: 'stop'});
});
await test('Health service reports UP and swallows failures', async () => {
  assert.equal(await createApi(createClient({fetch: async () => reply(200, {status: 'UP'})})).health.isUp(), true);
  assert.equal(await createApi(createClient({fetch: async () => reply(503, {status: 'DOWN'})})).health.isUp(), false);
});
await test('Auth login loads the account and clears credentials on 401', async () => {
  const me = {id: 'u1', email: 'a@b.ru', displayName: 'Анна', patients: []};
  const m = mock(() => reply(200, me));
  const ok = createApi(createClient({fetch: m.fetch}));
  assert.deepEqual(await ok.auth.login('a@b.ru', 'secret'), me);
  assert.equal(m.calls[0].url.endsWith('/api/me'), true);
  assert.equal(ok.auth.authenticated, true);
  const bad = createApi(createClient({fetch: async () => reply(401)}));
  await assert.rejects(bad.auth.login('admin', 'x'), e => isApiError(e) && e.unauthorized);
  assert.equal(bad.auth.authenticated, false);
});
await test('Care service builds patient-scoped URLs and skips empty query params', async () => {
  const m = mock(() => reply(200, []));
  const care = createApi(createClient({baseUrl: 'http://api.test', fetch: m.fetch})).care;
  await care.schedule('p 1');
  await care.schedule('p1', '2026-10-25');
  await care.mark('p1', {courseMedId: 'm1', date: '2026-10-25', time: '08:00', status: 'TAKEN'});
  assert.equal(m.calls[0].url, 'http://api.test/api/patients/p%201/schedule');
  assert.equal(m.calls[1].url, 'http://api.test/api/patients/p1/schedule?date=2026-10-25');
  assert.equal(m.calls[2].method, 'POST');
  assert.equal(JSON.parse(String(m.calls[2].body)).status, 'TAKEN');
});

console.log(`\n${checks} API checks passed`);
