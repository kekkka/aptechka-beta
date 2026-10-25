// Thin fetch wrapper for the Spring backend. Speaks JSON, authenticates with
// HTTP Basic (see backend SecurityConfig) and normalises every failure into ApiError.

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, {status = 0, body = null, cause}: {status?: number; body?: unknown; cause?: unknown} = {}) {
    super(message, {cause});
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
  get unauthorized() { return this.status === 401; }
  get network() { return this.status === 0; }
}

export interface Credentials {
  username: string;
  password: string;
}

export interface RequestOptions {
  body?: unknown;
  query?: Record<string, string | number | boolean | null | undefined>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export interface ClientOptions {
  baseUrl?: string;
  timeout?: number;
  fetch?: typeof globalThis.fetch;
}

type ErrorBody = {detail?: string; message?: string; error?: string} | null;

const basic = ({username, password}: Credentials) => 'Basic ' + btoa(String.fromCodePoint(...new TextEncoder().encode(username + ':' + password)));

async function readBody(res: Response): Promise<unknown> {
  if (res.status === 204) return null;
  const text = await res.text();
  if (!text) return null;
  return (res.headers.get('content-type') || '').includes('json') ? JSON.parse(text) : text;
}

export function createClient({baseUrl = '', timeout = 15000, fetch: fetchImpl = globalThis.fetch}: ClientOptions = {}) {
  let credentials: Credentials | null = null;
  const root = baseUrl.replace(/\/+$/, '');

  async function request<T = unknown>(method: string, path: string, {body, query, headers = {}, signal}: RequestOptions = {}): Promise<T> {
    const url = new URL(root + path, globalThis.location?.href || 'http://localhost');
    for (const [k, v] of Object.entries(query || {})) if (v != null) url.searchParams.set(k, String(v));

    // X-Requested-With makes Spring reply 401 without WWW-Authenticate, so the
    // browser does not pop up its native Basic auth dialog.
    const h: Record<string, string> = {Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest', ...headers};
    if (credentials) h.Authorization = basic(credentials);
    const json = body !== undefined && !(body instanceof FormData) && !(body instanceof Blob);
    if (json) h['Content-Type'] = 'application/json';

    const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(new DOMException('Timeout', 'TimeoutError')), timeout);
    const abort = () => ctrl.abort(signal!.reason);
    signal?.addEventListener('abort', abort, {once: true});
    let res: Response;
    try {
      res = await fetchImpl(url, {method, headers: h, body: json ? JSON.stringify(body) : body as BodyInit | undefined, signal: ctrl.signal});
    } catch (e) {
      if (signal?.aborted) throw e;
      throw new ApiError(ctrl.signal.aborted ? 'Сервер не ответил вовремя' : 'Нет связи с сервером', {cause: e});
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
    }

    let data: unknown;
    try {
      data = await readBody(res);
    } catch (e) {
      throw new ApiError('Некорректный ответ сервера', {status: res.status, cause: e});
    }
    if (!res.ok) {
      const err = typeof data === 'object' ? data as ErrorBody : null;
      throw new ApiError(err?.detail || err?.message || err?.error || `Ошибка сервера (${res.status})`, {status: res.status, body: data});
    }
    return data as T;
  }

  return {
    request,
    get: <T = unknown>(path: string, opts?: RequestOptions) => request<T>('GET', path, opts),
    post: <T = unknown>(path: string, body?: unknown, opts?: RequestOptions) => request<T>('POST', path, {...opts, body}),
    put: <T = unknown>(path: string, body?: unknown, opts?: RequestOptions) => request<T>('PUT', path, {...opts, body}),
    patch: <T = unknown>(path: string, body?: unknown, opts?: RequestOptions) => request<T>('PATCH', path, {...opts, body}),
    delete: <T = unknown>(path: string, opts?: RequestOptions) => request<T>('DELETE', path, opts),
    // Credentials live in memory only; nothing is written to localStorage.
    setCredentials: (c: Partial<Credentials> | null) => { credentials = c?.username ? {username: c.username, password: c.password ?? ''} : null; },
    get authenticated() { return !!credentials; }
  };
}

export type ApiClient = ReturnType<typeof createClient>;
