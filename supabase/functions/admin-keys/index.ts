import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function validateTelegramInitData(initData: string, botToken: string): Promise<number | null> {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return null;
    params.delete("hash");

    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("\n");

    const encoder = new TextEncoder();

    const secretKeyBuffer = await crypto.subtle.importKey(
      "raw",
      encoder.encode("WebAppData"),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const secretKey = await crypto.subtle.sign("HMAC", secretKeyBuffer, encoder.encode(botToken));

    const hmacKey = await crypto.subtle.importKey(
      "raw",
      secretKey,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const computedHashBuffer = await crypto.subtle.sign("HMAC", hmacKey, encoder.encode(dataCheckString));
    const computedHash = Array.from(new Uint8Array(computedHashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (computedHash !== hash) return null;

    const authDate = parseInt(params.get("auth_date") || "0", 10);
    if (authDate && Date.now() / 1000 - authDate > 86400) return null;

    const user = JSON.parse(params.get("user") || "{}");
    return user.id ?? null;
  } catch {
    return null;
  }
}

async function checkAdmin(telegramId: number): Promise<boolean> {
  const { data } = await supabase
    .from("admins")
    .select("telegram_id")
    .eq("telegram_id", telegramId)
    .maybeSingle();
  return !!data;
}

/**
 * Generates a key code in XXXX-XXXX-XXXX-XXXX format.
 * Reused from the original Discord bot's utils/database.js.
 */
function generateKeyCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 16; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
    if (i === 3 || i === 7 || i === 11) code += "-";
  }
  return code;
}

/**
 * Parses expiry days into an ISO timestamp.
 * Reused from the original Discord bot's utils/database.js.
 */
function parseExpiryDays(days: number): string | null {
  if (days === 0) return null;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!botToken) {
      return new Response(JSON.stringify({ error: "Server not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { initData, action } = body;

    const telegramId = await validateTelegramInitData(initData, botToken);
    if (!telegramId) {
      return new Response(JSON.stringify({ error: "Invalid authentication" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = await checkAdmin(telegramId);
    if (!admin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Generate single key ---
    if (action === "genkey") {
      const { credits, expiresDays } = body;
      const cred = parseInt(String(credits), 10);
      const days = parseInt(String(expiresDays), 10);

      if (!cred || cred < 1 || cred > 10000) {
        return new Response(JSON.stringify({ error: "Credits must be 1-10000" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const expiresAt = parseExpiryDays(days);
      const code = generateKeyCode();

      const { error } = await supabase.from("keys").insert({
        code,
        credits: cred,
        expires_at: expiresAt,
        created_by: telegramId,
      });

      if (error) {
        return new Response(JSON.stringify({ error: "Failed to create key: " + error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        key: {
          code,
          credits: cred,
          expiresAt,
          expiresLabel: days === 0 ? "Never" : `${days} days`,
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Generate mass keys ---
    if (action === "masskey") {
      const { amount, credits, expiresDays } = body;
      const amt = Math.min(parseInt(String(amount), 10), 500);
      const cred = parseInt(String(credits), 10);
      const days = parseInt(String(expiresDays), 10);

      if (!amt || amt < 1) {
        return new Response(JSON.stringify({ error: "Amount must be at least 1" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!cred || cred < 1 || cred > 10000) {
        return new Response(JSON.stringify({ error: "Credits must be 1-10000" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const expiresAt = parseExpiryDays(days);
      const keys: { code: string; credits: number; expiresAt: string | null }[] = [];

      // Generate unique codes
      const codes: string[] = [];
      for (let i = 0; i < amt; i++) {
        codes.push(generateKeyCode());
      }

      const rows = codes.map((code) => ({
        code,
        credits: cred,
        expires_at: expiresAt,
        created_by: telegramId,
      }));

      const { error } = await supabase.from("keys").insert(rows);

      if (error) {
        return new Response(JSON.stringify({ error: "Failed to create keys: " + error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      for (const code of codes) {
        keys.push({ code, credits: cred, expiresAt });
      }

      return new Response(JSON.stringify({
        success: true,
        amount: amt,
        keys,
        expiresLabel: days === 0 ? "Never" : `${days} days`,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Revoke user ---
    if (action === "revoke") {
      const { targetTelegramId } = body;
      const targetId = parseInt(String(targetTelegramId), 10);

      if (!targetId) {
        return new Response(JSON.stringify({ error: "Valid Telegram ID required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: targetUser } = await supabase
        .from("app_users")
        .select("*")
        .eq("telegram_id", targetId)
        .maybeSingle();

      if (targetUser) {
        await supabase
          .from("app_users")
          .update({
            revoked: true,
            credits: 0,
            access_expires_at: null,
          })
          .eq("telegram_id", targetId);
      } else {
        await supabase.from("app_users").insert({
          telegram_id: targetId,
          credits: 0,
          revoked: true,
        });
      }

      return new Response(JSON.stringify({
        success: true,
        message: `Access revoked for user ${targetId}`,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- List keys ---
    if (action === "list-keys") {
      const page = parseInt(String(body.page || "1"), 10);
      const perPage = 50;
      const offset = (page - 1) * perPage;

      const { data, count } = await supabase
        .from("keys")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(offset, offset + perPage - 1);

      return new Response(JSON.stringify({
        success: true,
        keys: data || [],
        total: count || 0,
        page,
        perPage,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- List users ---
    if (action === "list-users") {
      const page = parseInt(String(body.page || "1"), 10);
      const perPage = 50;
      const offset = (page - 1) * perPage;

      const { data, count } = await supabase
        .from("app_users")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(offset, offset + perPage - 1);

      return new Response(JSON.stringify({
        success: true,
        users: data || [],
        total: count || 0,
        page,
        perPage,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- List logs ---
    if (action === "list-logs") {
      const page = parseInt(String(body.page || "1"), 10);
      const perPage = 50;
      const offset = (page - 1) * perPage;

      const { data, count } = await supabase
        .from("generation_logs")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(offset, offset + perPage - 1);

      return new Response(JSON.stringify({
        success: true,
        logs: data || [],
        total: count || 0,
        page,
        perPage,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Stats ---
    if (action === "stats") {
      const { count: totalKeys } = await supabase
        .from("keys")
        .select("*", { count: "exact", head: true });

      const { count: redeemedKeys } = await supabase
        .from("keys")
        .select("*", { count: "exact", head: true })
        .not("redeemed_by", "is", null);

      const { count: totalUsers } = await supabase
        .from("app_users")
        .select("*", { count: "exact", head: true });

      const { count: totalGens } = await supabase
        .from("generation_logs")
        .select("*", { count: "exact", head: true });

      return new Response(JSON.stringify({
        success: true,
        stats: {
          totalKeys: totalKeys || 0,
          redeemedKeys: redeemedKeys || 0,
          availableKeys: (totalKeys || 0) - (redeemedKeys || 0),
          totalUsers: totalUsers || 0,
          totalGenerations: totalGens || 0,
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Add admin ---
    if (action === "add-admin") {
      const { targetTelegramId } = body;
      const targetId = parseInt(String(targetTelegramId), 10);
      if (!targetId) {
        return new Response(JSON.stringify({ error: "Valid Telegram ID required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabase.from("admins").insert({ telegram_id: targetId }).upsert({ telegram_id: targetId });

      return new Response(JSON.stringify({ success: true, message: `Admin added: ${targetId}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
