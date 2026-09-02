import { webConfig } from '../config';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: string[]
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const url = `${webConfig.apiUrl.replace(/\/$/, '')}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(
      data.error ?? res.statusText,
      res.status,
      data.details
    );
  }

  return data as T;
}
