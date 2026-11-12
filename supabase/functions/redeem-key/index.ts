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

async function validateTelegramInitData(initData: string, botToken: string): Promise<{ id: number; username?: string; first_name?: string } | null> {
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
    return { id: user.id, username: user.username, first_name: user.first_name };
  } catch {
    return null;
  }
}

/**
 * Normalizes a key code to XXXX-XXXX-XXXX-XXXX format.
 * Reused from the original Discord bot's utils/database.js.
 */
function normalizeKeyCode(code: string): string {
  const trimmed = code.trim().toUpperCase();
  const dashed = trimmed.match(/[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}/);
  if (dashed) return dashed[0];

  const raw = trimmed.replace(/[^A-Z0-9]/g, "");
  if (raw.length >= 16) {
    const k = raw.slice(0, 16);
    return `${k.slice(0, 4)}-${k.slice(4, 8)}-${k.slice(8, 12)}-${k.slice(12, 16)}`;
  }
  return trimmed;
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

    const { initData, keyCode } = await req.json();

    const tgUser = await validateTelegramInitData(initData, botToken);
    if (!tgUser) {
      return new Response(JSON.stringify({ error: "Invalid authentication" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!keyCode || !keyCode.trim()) {
      return new Response(JSON.stringify({ error: "Please enter a key code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedCode = normalizeKeyCode(keyCode);

    // Look up the key
    const { data: key } = await supabase
      .from("keys")
      .select("*")
      .eq("code", normalizedCode)
      .maybeSingle();

    // Try unnormalized lookup if not found
    let keyRecord = key;
    if (!keyRecord) {
      const { data: allKeys } = await supabase
        .from("keys")
        .select("code, credits, expires_at, created_by, redeemed_by, redeemed_at")
        .is("redeemed_by", null);
      for (const k of allKeys || []) {
        if (k.code.replace(/-/g, "") === normalizedCode.replace(/-/g, "")) {
          keyRecord = k;
          break;
        }
      }
    }

    if (!keyRecord) {
      return new Response(JSON.stringify({ error: "Invalid key. Check the format: XXXX-XXXX-XXXX-XXXX" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Already redeemed by this user — allow (idempotent)
    if (keyRecord.redeemed_by === tgUser.id) {
      const { data: user } = await supabase
        .from("app_users")
        .select("*")
        .eq("telegram_id", tgUser.id)
        .maybeSingle();

      return new Response(JSON.stringify({
        success: true,
        alreadyRedeemed: true,
        credits: user?.credits ?? 0,
        accessExpiresAt: user?.access_expires_at ?? null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (keyRecord.redeemed_by) {
      return new Response(JSON.stringify({ error: "Key already redeemed." }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (keyRecord.expires_at && new Date(keyRecord.expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: "Key has expired." }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get or create user
    const { data: existingUser } = await supabase
      .from("app_users")
      .select("*")
      .eq("telegram_id", tgUser.id)
      .maybeSingle();

    const isFirstRedemption = !existingUser?.vouched && !existingUser?.redeemed_key_code;
    const currentCredits = existingUser?.credits ?? 0;

    // Mark key as redeemed
    await supabase
      .from("keys")
      .update({
        redeemed_by: tgUser.id,
        redeemed_at: new Date().toISOString(),
      })
      .eq("code", keyRecord.code);

    // Update or create user
    if (existingUser) {
      await supabase
        .from("app_users")
        .update({
          credits: currentCredits + keyRecord.credits,
          revoked: false,
          access_expires_at: keyRecord.expires_at,
          redeemed_key_code: keyRecord.code,
          vouched: isFirstRedemption ? true : existingUser.vouched,
          username: tgUser.username,
          first_name: tgUser.first_name,
        })
        .eq("telegram_id", tgUser.id);
    } else {
      await supabase.from("app_users").insert({
        telegram_id: tgUser.id,
        username: tgUser.username,
        first_name: tgUser.first_name,
        credits: keyRecord.credits,
        revoked: false,
        access_expires_at: keyRecord.expires_at,
        redeemed_key_code: keyRecord.code,
        vouched: true,
      });
    }

    const newCredits = currentCredits + keyRecord.credits;

    return new Response(JSON.stringify({
      success: true,
      credits: newCredits,
      keyCredits: keyRecord.credits,
      accessExpiresAt: keyRecord.expires_at,
      firstRedemption: isFirstRedemption,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
