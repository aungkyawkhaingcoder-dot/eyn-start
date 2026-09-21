export interface ApiData {
  message?: string;
  error?: string;
  id?: number;
  userId?: number;
  currentUserId?: number;
  token?: string;
  verifyToken?: string;
  email?: string;
  phone?: string;
  clientId?: string;
  nonce?: string;
  challengeId?: string;
  expiresIn?: number;
}
export interface RequestLog {
  id: string;
  path: string;
  method: string;
  status: number | string;
  time: string;
  ms: number;
  data: unknown;
}

export type Provider = "email" | "phone" | "google";
export type Mode = "login" | "register";
export type Notice = { error?: boolean; text: string } | null;
export type Session = { id: number | undefined; at: string } | null;
export type ApiError = Error & { status?: number | string; data?: ApiData };
export type ApiCall = (
  path: string,
  body?: Record<string, string>,
  method?: string,
) => Promise<ApiData>;
