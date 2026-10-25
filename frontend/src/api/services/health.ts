// Spring Boot Actuator health probe; public, needs no credentials.
import type {ApiClient, RequestOptions} from '../client.ts';

type Health = {status?: string} | null;

export const healthService = (client: ApiClient) => ({
  get: (opts?: RequestOptions) => client.get<Health>('/actuator/health', opts),
  async isUp(opts?: RequestOptions) {
    try {
      return (await client.get<Health>('/actuator/health', opts))?.status === 'UP';
    } catch {
      return false;
    }
  }
});
