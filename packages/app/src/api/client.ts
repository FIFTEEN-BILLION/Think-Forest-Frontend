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

// createApiClient 가 돌려주는 요청 함수의 타입. 도메인 함수·훅이 인자로 받는다.
export type ApiRequest = ReturnType<typeof createApiClient>;

// JSON 본문 POST 요청 옵션을 만든다. 204 가 아닌 JSON 응답 전용.
export function jsonBody(body: unknown, signal?: AbortSignal): RequestInit {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  };
}
