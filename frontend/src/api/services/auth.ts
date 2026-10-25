// The backend uses stateless HTTP Basic, so "login" means: store credentials in
// the client and confirm them by loading the current account.
import type {ApiClient, RequestOptions} from '../client.ts';
import type {Me} from '../types.ts';

export const authService = (client: ApiClient) => ({
  async login(username: string, password: string, opts?: RequestOptions) {
    client.setCredentials({username, password});
    try {
      return await client.get<Me>('/api/me', opts);
    } catch (e) {
      client.setCredentials(null);
      throw e;
    }
  },
  register: (email: string, password: string, displayName: string, opts?: RequestOptions) =>
    client.post<{id: string; email: string; displayName: string}>('/api/auth/register', {email, password, displayName}, opts),
  me: (opts?: RequestOptions) => client.get<Me>('/api/me', opts),
  logout: () => client.setCredentials(null),
  get authenticated() { return client.authenticated; }
});
