import { ApiError } from '../client';
import type { ApiRequest } from '../client';

/** Keep v1 authentication and guardian requests on the host's real/mock transport. */
export function createV1Fetch(api: ApiRequest, baseUrl: string): typeof fetch {
  return async (input, init) => {
    const url = String(input);
    if (!url.startsWith(`${baseUrl}/`)) throw new Error('Unexpected v1 API URL');
    try {
      const value = await api<unknown>(`api/v1/${url.slice(baseUrl.length + 1)}`, {
        ...init,
        credentials: 'include',
      });
      if (value === undefined) return new Response(null, { status: 204 });
      if (value instanceof Blob) return new Response(value);
      return Response.json(value);
    } catch (error) {
      if (error instanceof ApiError) return new Response(error.body, { status: error.status });
      throw error;
    }
  };
}
