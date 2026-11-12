import {
  readDb,
  writeDb,
  initStorage,
  createGithubGist,
} from './storage.js';

export { initStorage, createGithubGist };

export function normalizeKeyCode(code) {
  const trimmed = code.trim().toUpperCase();

  const dashed = trimmed.match(/[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}/);
  if (dashed) return dashed[0];

  const raw = trimmed.replace(/[^A-Z0-9]/g, '');
  if (raw.length >= 16) {
    const k = raw.slice(0, 16);
    return `${k.slice(0, 4)}-${k.slice(4, 8)}-${k.slice(8, 12)}-${k.slice(12, 16)}`;
  }

  return trimmed;
}

function findKeyEntry(db, code) {
  const normalized = normalizeKeyCode(code);
  if (db.keys[normalized]) return { code: normalized, key: db.keys[normalized] };

  const raw = normalized.replace(/-/g, '');
  for (const [storedCode, key] of Object.entries(db.keys)) {
    if (storedCode.replace(/-/g, '') === raw) {
      return { code: storedCode, key };
    }
  }

  return null;
}

export function generateKeyCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 16; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
    if (i === 3 || i === 7 || i === 11) code += '-';
  }
  return code;
}

export function createKey({ credits, expiresAt, createdBy }) {
  const db = readDb();
  let code;
  do {
    code = generateKeyCode();
  } while (db.keys[code]);

  db.keys[code] = {
    credits,
    expiresAt,
    createdBy,
    createdAt: Date.now(),
    redeemedBy: null,
    redeemedAt: null,
  };
  writeDb(db);
  return code;
}

export function getKey(code) {
  const db = readDb();
  return findKeyEntry(db, code)?.key ?? null;
}

export function redeemKey(code, userId) {
  const db = readDb();
  const found = findKeyEntry(db, code);
  if (!found) {
    return {
      ok: false,
      error: 'Invalid key. Paste the key from `/genkey` or `/masskey` (e.g. XXXX-XXXX-XXXX-XXXX).',
    };
  }

  const { code: normalized, key } = found;
  if (key.redeemedBy) return { ok: false, error: 'Key already redeemed.' };
  if (key.expiresAt && Date.now() > key.expiresAt) {
    return { ok: false, error: 'Key has expired.' };
  }

  key.redeemedBy = userId;
  key.redeemedAt = Date.now();

  if (!db.users[userId]) {
    db.users[userId] = { credits: 0, revoked: false, accessExpiresAt: null, vouched: false };
  }

  const user = db.users[userId];
  const isFirstRedemption = !user.vouched && !user.redeemedKey;
  user.credits += key.credits;
  user.revoked = false;
  user.accessExpiresAt = key.expiresAt;
  user.redeemedKey = normalized;
  if (isFirstRedemption) user.vouched = true;

  writeDb(db);
  return { ok: true, key, user, code: normalized, isFirstRedemption };
}

export function getUser(userId) {
  const db = readDb();
  return db.users[userId] ?? null;
}

export function canUserGen(userId) {
  const user = getUser(userId);
  if (!user || user.revoked) return { ok: false, error: 'You do not have access. Redeem a key first.' };
  if (user.accessExpiresAt && Date.now() > user.accessExpiresAt) {
    return { ok: false, error: 'Your access has expired.' };
  }
  if (user.credits < 1) return { ok: false, error: 'You have no credits left.' };
  return { ok: true, user };
}

export function deductCredit(userId, amount = 1) {
  const db = readDb();
  const user = db.users[userId];
  if (!user || user.credits < amount) return false;
  user.credits -= amount;
  writeDb(db);
  return true;
}

export function revokeUser(userId) {
  const db = readDb();
  if (!db.users[userId]) {
    db.users[userId] = { credits: 0, revoked: true, accessExpiresAt: null };
  } else {
    db.users[userId].revoked = true;
    db.users[userId].credits = 0;
    db.users[userId].accessExpiresAt = null;
  }
  writeDb(db);
  return db.users[userId];
}

export function parseExpiryDays(days) {
  if (days === 0 || days === null) return null;
  return Date.now() + days * 24 * 60 * 60 * 1000;
}

export function formatExpiry(expiresAt) {
  if (!expiresAt) return 'Never';
  const d = new Date(expiresAt);
  if (d.getTime() < Date.now()) return 'Expired';
  return `<t:${Math.floor(d.getTime() / 1000)}:R>`;
}
