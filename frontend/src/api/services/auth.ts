// The backend uses stateless HTTP Basic, so "login" means: store credentials in
// the client and confirm them against any protected endpoint.
import {ApiError, type ApiClient, type RequestOptions} from '../client.ts';

export const authService = (client: ApiClient) => ({
  async login(username: string, password: string, opts?: RequestOptions) {
    client.setCredentials({username, password});
    try {
      await client.get('/', opts);
    } catch (e) {
      // 404 on "/" still proves the credentials passed the security filter.
      if (!(e instanceof ApiError) || e.status !== 404) {
        client.setCredentials(null);
        throw e;
      }
    }
  },
  logout: () => client.setCredentials(null),
  get authenticated() { return client.authenticated; }
});
