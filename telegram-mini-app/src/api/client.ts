import type {
  AuthResponse,
  GenerateResponse,
  RedeemResponse,
  KeyRecord,
  UserRecord,
  LogRecord,
  StatsResponse,
  GeneratedKey,
} from "../types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables");
}

function getHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  };
}

async function callFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const url = `${SUPABASE_URL}/functions/v1/${name}`;
  const response = await fetch(url, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }

  return data as T;
}

export function getInitData(): string {
  const tg = (window as any).Telegram?.WebApp;
  if (tg?.initData) return tg.initData;
  // Fallback for local dev: return empty string, which will fail validation
  return "";
}

export async function authenticate(initData: string): Promise<AuthResponse> {
  return callFunction<AuthResponse>("telegram-app", { initData });
}

export async function generateBarcode(
  initData: string,
  ean: string,
  pricePence: number,
): Promise<GenerateResponse> {
  return callFunction<GenerateResponse>("generate-barcode", { initData, ean, pricePence });
}

export async function redeemKey(initData: string, keyCode: string): Promise<RedeemResponse> {
  return callFunction<RedeemResponse>("redeem-key", { initData, keyCode });
}

export async function adminGenKey(
  initData: string,
  credits: number,
  expiresDays: number,
): Promise<{ success: boolean; key: GeneratedKey }> {
  return callFunction("admin-keys", { initData, action: "genkey", credits, expiresDays });
}

export async function adminMassKey(
  initData: string,
  amount: number,
  credits: number,
  expiresDays: number,
): Promise<{ success: boolean; amount: number; keys: GeneratedKey[]; expiresLabel: string }> {
  return callFunction("admin-keys", { initData, action: "masskey", amount, credits, expiresDays });
}

export async function adminRevoke(
  initData: string,
  targetTelegramId: number,
): Promise<{ success: boolean; message: string }> {
  return callFunction("admin-keys", { initData, action: "revoke", targetTelegramId });
}

export async function adminListKeys(
  initData: string,
  page: number,
): Promise<{ success: boolean; keys: KeyRecord[]; total: number; page: number; perPage: number }> {
  return callFunction("admin-keys", { initData, action: "list-keys", page });
}

export async function adminListUsers(
  initData: string,
  page: number,
): Promise<{ success: boolean; users: UserRecord[]; total: number; page: number; perPage: number }> {
  return callFunction("admin-keys", { initData, action: "list-users", page });
}

export async function adminListLogs(
  initData: string,
  page: number,
): Promise<{ success: boolean; logs: LogRecord[]; total: number; page: number; perPage: number }> {
  return callFunction("admin-keys", { initData, action: "list-logs", page });
}

export async function adminStats(initData: string): Promise<StatsResponse> {
  return callFunction("admin-keys", { initData, action: "stats" });
}

export async function adminAddAdmin(
  initData: string,
  targetTelegramId: number,
): Promise<{ success: boolean; message: string }> {
  return callFunction("admin-keys", { initData, action: "add-admin", targetTelegramId });
}
