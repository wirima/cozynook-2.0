export const config = {
  auth: false,
};

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

declare const Deno: any;

Deno.serve(async (req: Request) => {
  console.log("🔥 Incoming request to paychangu-checkout");

  // Allow all origins
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  // Preflight
  if (req.method === "OPTIONS") {
    console.log("🔧 CORS preflight");
    return new Response("ok", { headers: corsHeaders, status: 200 });
  }

  try {
    const body = await req.json();
    console.log("📦 Request JSON Body:", body);

    const {
      amount,
      email,
      phone,
      first_name,
      last_name,
      booking_id,
      currency = "MWK",
      return_origin,
    } = body;

    // Load secrets from Supabase ENV
    const PAYCHANGU_SECRET_KEY = Deno.env.get("PAYCHANGU_SECRET_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

    if (!PAYCHANGU_SECRET_KEY) {
      throw new Error("Missing PAYCHANGU_SECRET_KEY in Supabase secrets");
    }

    // Convert URL → project ref
    const PROJECT_REF = SUPABASE_URL.replace("https://", "").replace(
      ".supabase.co",
      "",
    );

    console.log("🟦 Dynamic Project Ref:", PROJECT_REF);

    // Choose redirect origin automatically
    const originForReturn =
      typeof return_origin === "string" && return_origin.trim() !== ""
        ? return_origin
        : req.headers.get("origin") || "https://thecozynook.vercel.app";

    console.log("🌍 Return Origin:", originForReturn);

    // Build webhook URL
    const WEBHOOK_URL = `https://${PROJECT_REF}.supabase.co/functions/v1/paychangu-webhook?return_origin=${encodeURIComponent(originForReturn)}`;

    console.log("🔗 Callback URL:", WEBHOOK_URL);

    const payload = {
      amount: Math.floor(amount),
      currency,
      email,
      phone: phone || "",
      first_name,
      last_name,
      callback_url: WEBHOOK_URL,
      return_url: `${originForReturn}/?payment_verifying=true&booking_id=${booking_id}`,
      tx_ref: `nook_txn_${booking_id}_${Date.now()}`,
      customization: {
        title: "The Cozy Nook Stay",
        description: `Booking ID: ${booking_id}`,
      },
    };

    console.log("🚀 Sending payload to PayChangu", payload);

    const response = await fetch("https://api.paychangu.com/payment", {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${PAYCHANGU_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const raw = await response.text();
    console.log("📥 PayChangu Raw Response:", raw);

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error("Invalid JSON from PayChangu");
    }

    const checkoutUrl = data.checkout_url || data?.data?.checkout_url || null;

    if (checkoutUrl) {
      return new Response(
        JSON.stringify({ ...data, checkout_url: checkoutUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ error: data.message, debug: data }), {
      headers: corsHeaders,
      status: 400,
    });
  } catch (error: any) {
    console.error("💥 Fatal Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal Error" }),
      { headers: corsHeaders, status: 400 },
    );
  }
});
