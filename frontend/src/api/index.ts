// Service layer entry point. Views import services from here, never the raw client.
import {createClient, type ApiClient} from './client.ts';
import {authService} from './services/auth.ts';
import {healthService} from './services/health.ts';

export {ApiError, createClient} from './client.ts';
export type {ApiClient, ClientOptions, Credentials, RequestOptions} from './client.ts';

export function createApi(client: ApiClient) {
  return {client, auth: authService(client), health: healthService(client)};
}

export const api = createApi(createClient({baseUrl: import.meta.env?.VITE_API_URL ?? 'http://localhost:8080'}));
