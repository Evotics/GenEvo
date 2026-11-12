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
 * Validates Telegram Web App initData. Same algorithm as telegram-app function.
 */
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

/**
 * Builds the barcode value from EAN + price.
 * Reused from the original Discord bot's utils/barcode.js.
 */
function pad(n: string, l: number): string {
  return n.padStart(l, "0");
}

function checkDigit(s: string): number {
  let sum = 0;
  for (let i = 0; i < s.length; i++) {
    sum += parseInt(s[s.length - 1 - i], 10) * (i % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10;
}

function buildBarcodeValue(rawEan: string, pricePence: number): string {
  let digits = rawEan.replace(/\D/g, "");
  if (digits.length === 14) digits = digits.slice(0, -1);
  digits = pad(digits, 13);
  const base = "91" + digits + pad(String(pricePence), 6);
  return base + checkDigit(base);
}

const CREDIT_COST = 1;

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

    const { initData, ean, pricePence } = await req.json();

    const telegramId = await validateTelegramInitData(initData, botToken);
    if (!telegramId) {
      return new Response(JSON.stringify({ error: "Invalid authentication" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate input
    const cleanEan = (ean || "").replace(/\D/g, "");
    const price = parseInt(String(pricePence), 10);

    if (cleanEan.length < 8 || cleanEan.length > 13) {
      return new Response(JSON.stringify({ error: "Barcode must be 8-13 digits" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!price || price < 1 || price > 99999) {
      return new Response(JSON.stringify({ error: "Price must be between 1 and 99999 pence" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check access
    const { data: user } = await supabase
      .from("app_users")
      .select("*")
      .eq("telegram_id", telegramId)
      .maybeSingle();

    if (!user || user.revoked) {
      return new Response(JSON.stringify({ error: "You do not have access. Redeem a key first." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (user.access_expires_at && new Date(user.access_expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: "Your access has expired." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (user.credits < CREDIT_COST) {
      return new Response(JSON.stringify({ error: "You have no credits left." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build barcode value
    const barcodeValue = buildBarcodeValue(cleanEan, price);

    // Deduct credit
    const { error: deductError } = await supabase
      .from("app_users")
      .update({ credits: user.credits - CREDIT_COST })
      .eq("telegram_id", telegramId);

    if (deductError) {
      return new Response(JSON.stringify({ error: "Failed to deduct credit" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log generation
    await supabase.from("generation_logs").insert({
      telegram_id: telegramId,
      ean: cleanEan,
      price_pence: price,
      barcode_value: barcodeValue,
    });

    return new Response(JSON.stringify({
      success: true,
      barcodeValue,
      creditsRemaining: user.credits - CREDIT_COST,
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
