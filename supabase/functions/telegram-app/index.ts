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

/**
 * Validates Telegram Web App initData against the bot token using HMAC-SHA256.
 * Returns the authenticated user object or null if validation fails.
 *
 * Telegram's validation algorithm:
 * 1. Create a secret_key = HMAC-SHA256("WebAppData", bot_token)
 * 2. Create data_check_string = sorted query params (excluding hash) joined by \n
 * 3. Compute hash = HMAC-SHA256(data_check_string, secret_key)
 * 4. Compare with the provided hash
 */
async function validateTelegramInitData(initData: string, botToken: string): Promise<Record<string, string> | null> {
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

    // secret_key = HMAC-SHA256("WebAppData", botToken)
    const secretKeyBuffer = await crypto.subtle.importKey(
      "raw",
      encoder.encode("WebAppData"),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const secretKey = await crypto.subtle.sign("HMAC", secretKeyBuffer, encoder.encode(botToken));

    // hash = HMAC-SHA256(dataCheckString, secret_key)
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

    // Check auth_date isn't too old (24 hours)
    const authDate = parseInt(params.get("auth_date") || "0", 10);
    if (authDate && Date.now() / 1000 - authDate > 86400) return null;

    const result: Record<string, string> = {};
    for (const [k, v] of params.entries()) result[k] = v;
    return result;
  } catch {
    return null;
  }
}

function parseTelegramUser(userJson: string): { id: number; username?: string; first_name?: string } | null {
  try {
    const u = JSON.parse(userJson);
    if (!u.id) return null;
    return { id: u.id, username: u.username, first_name: u.first_name };
  } catch {
    return null;
  }
}

async function getOrCreateUser(telegramId: number, username?: string, firstName?: string) {
  const { data } = await supabase
    .from("app_users")
    .select("*")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (data) return data;

  const { data: newUser } = await supabase
    .from("app_users")
    .insert({
      telegram_id: telegramId,
      username,
      first_name: firstName,
      credits: 0,
      revoked: false,
    })
    .select()
    .single();

  return newUser;
}

async function isAdmin(telegramId: number): Promise<boolean> {
  const { data } = await supabase
    .from("admins")
    .select("telegram_id")
    .eq("telegram_id", telegramId)
    .maybeSingle();
  return !!data;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { initData } = body;

    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!botToken) {
      return new Response(JSON.stringify({ error: "Server not configured: missing bot token" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!initData) {
      return new Response(JSON.stringify({ error: "Missing initData" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validated = await validateTelegramInitData(initData, botToken);
    if (!validated) {
      return new Response(JSON.stringify({ error: "Invalid authentication" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tgUser = parseTelegramUser(validated.user || "{}");
    if (!tgUser) {
      return new Response(JSON.stringify({ error: "Could not parse user data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const user = await getOrCreateUser(tgUser.id, tgUser.username, tgUser.first_name);
    const admin = await isAdmin(tgUser.id);

    const responseData = {
      authenticated: true,
      user: {
        telegramId: tgUser.id,
        username: tgUser.username,
        firstName: tgUser.first_name,
        credits: user?.credits ?? 0,
        revoked: user?.revoked ?? false,
        accessExpiresAt: user?.access_expires_at ?? null,
        vouched: user?.vouched ?? false,
        redeemedKeyCode: user?.redeemed_key_code ?? null,
      },
      isAdmin: admin,
    };

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
