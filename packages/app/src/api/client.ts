export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
  ) {
    super(`API request failed (${status})`);
    this.name = 'ApiError';
  }
}

// Pass the deployment's API base URL when creating a client.
export function createApiClient(baseUrl: string) {
  return async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers);
    if (!headers.has('Accept')) headers.set('Accept', 'application/json');

    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`, {
      ...options,
      headers,
    });

    if (!response.ok) throw new ApiError(response.status, await response.text());
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  };
}
