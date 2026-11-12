export interface AppUser {
  telegramId: number;
  username?: string;
  firstName?: string;
  credits: number;
  revoked: boolean;
  accessExpiresAt: string | null;
  vouched: boolean;
  redeemedKeyCode: string | null;
}

export interface AuthResponse {
  authenticated: boolean;
  user: AppUser;
  isAdmin: boolean;
}

export interface GenerateResponse {
  success: boolean;
  barcodeValue: string;
  creditsRemaining: number;
}

export interface RedeemResponse {
  success: boolean;
  alreadyRedeemed?: boolean;
  credits: number;
  keyCredits?: number;
  accessExpiresAt: string | null;
  firstRedemption?: boolean;
}

export interface KeyRecord {
  code: string;
  credits: number;
  expires_at: string | null;
  created_by: number;
  created_at: string;
  redeemed_by: number | null;
  redeemed_at: string | null;
}

export interface UserRecord {
  telegram_id: number;
  username: string | null;
  first_name: string | null;
  credits: number;
  revoked: boolean;
  access_expires_at: string | null;
  vouched: boolean;
  redeemed_key_code: string | null;
  created_at: string;
}

export interface LogRecord {
  id: string;
  telegram_id: number;
  ean: string;
  price_pence: number;
  barcode_value: string;
  created_at: string;
}

export interface StatsResponse {
  success: boolean;
  stats: {
    totalKeys: number;
    redeemedKeys: number;
    availableKeys: number;
    totalUsers: number;
    totalGenerations: number;
  };
}

export interface GeneratedKey {
  code: string;
  credits: number;
  expiresAt: string | null;
  expiresLabel: string;
}

export type Page = "home" | "generate" | "redeem" | "balance" | "admin";
