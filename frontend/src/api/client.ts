export interface PublicUser {
  id: string;
  fullName: string;
  email: string;
  createdAt: string;
}

export interface StoredUser {
  id: string;
  emailHash: string;
  emailEncrypted: string;
  fullNameEncrypted: string;
  passwordHash: string;
  createdAt: string;
}

export interface LoginResponse {
  accessToken: string;
  user: PublicUser;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

async function request<T>(path: string, init: RequestInit = {}, token?: string | null): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el servidor');
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body?.message;
    throw new ApiError(
      response.status,
      Array.isArray(message) ? message.join('. ') : (message ?? 'Error inesperado'),
    );
  }
  return body as T;
}

export const api = {
  register: (payload: RegisterPayload) =>
    request<PublicUser>('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),

  login: (email: string, password: string) =>
    request<LoginResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  me: (token: string) => request<PublicUser>('/auth/me', {}, token),

  stored: (token: string) => request<StoredUser>('/auth/me/stored', {}, token),
};
