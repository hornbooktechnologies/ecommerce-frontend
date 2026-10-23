const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== 'false';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';
type RequestOptions = RequestInit & {
  query?: Record<string, string | number | boolean | undefined>;
};

export const apiConfig = { useMock: USE_MOCK, baseUrl: API_BASE_URL };
export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  if (USE_MOCK) throw new Error(`Mock service missing for ${path}`);
  const url = new URL(
    `${API_BASE_URL}${path}`,
    typeof window === 'undefined' ? 'http://localhost' : window.location.origin,
  );
  Object.entries(options.query || {}).forEach(([key, value]) => {
    if (value !== undefined) url.searchParams.set(key, String(value));
  });
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (!response.ok)
    throw new Error(
      (await response.text()) ||
        `Request failed with status ${response.status}`,
    );
  return response.json() as Promise<T>;
}
