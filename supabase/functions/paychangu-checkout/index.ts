export const config = {
  auth: false,
};

// Setup type definitions for Deno
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Declare Deno global
declare const Deno: any;

Deno.serve(async (req: Request) => {
  console.log("🔥 Incoming request to paychangu-checkout");

  // Allowed frontend domains
  const allowedOrigins = [
    "http://localhost:5173",
    "https://thecozynook.vercel.app",
    "https://cozynook-2-0.vercel.app",
    "https://www.cozynookbnb.com",
  ];

  const requestOrigin = req.headers.get("origin") || "";
  console.log("🌐 Request Origin:", requestOrigin);

  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": allowedOrigins.includes(requestOrigin)
      ? requestOrigin
      : "https://thecozynook.vercel.app",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };

  // Preflight handler
  if (req.method === "OPTIONS") {
    console.log("🔧 Preflight OPTIONS received");
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

    console.log("💰 Amount received:", amount);
    console.log("👤 Customer:", first_name, last_name);
    console.log("☎️ Phone:", phone);
    console.log("💱 Currency:", currency);

    const PAYCHANGU_SECRET_KEY = Deno.env.get("PAYCHANGU_SECRET_KEY");

    if (!PAYCHANGU_SECRET_KEY) {
      console.error("❌ Missing PAYCHANGU_SECRET_KEY");
      throw new Error("Server configuration error: Missing Payment Key");
    }

    const requestedReturnOrigin =
      typeof return_origin === "string" ? return_origin : "";

    const originForReturn = allowedOrigins.includes(requestedReturnOrigin)
      ? requestedReturnOrigin
      : allowedOrigins.includes(requestOrigin)
        ? requestOrigin
        : "https://thecozynook.vercel.app";

    const PROJECT_REF = Deno.env.get("PROJECT_REF");

    // Include return_origin in webhook URL so it knows where to redirect
    const WEBHOOK_URL = `https://${PROJECT_REF}.supabase.co/functions/v1/paychangu-webhook?return_origin=${encodeURIComponent(
      originForReturn,
    )}`;

    console.log("🔗 Callback URL:", WEBHOOK_URL);
    console.log(
      "🔗 Return URL:",
      `${originForReturn}/?payment_verifying=true&booking_id=${booking_id}`,
    );

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

    console.log("🚀 Sending payload to PayChangu:", payload);

    const response = await fetch("https://api.paychangu.com/payment", {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${PAYCHANGU_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    console.log("📥 PayChangu HTTP Status:", response.status);

    const rawText = await response.text();
    console.log("📄 Raw PayChangu Response:", rawText);

    let data;
    try {
      data = JSON.parse(rawText);
      console.log("📘 Parsed PayChangu Response:", data);
    } catch (e) {
      console.error("❌ Error parsing PayChangu JSON:", rawText);
      throw new Error("Invalid JSON from payment gateway");
    }

    const checkoutUrl = data.checkout_url || data?.data?.checkout_url || null;

    console.log("🧭 Checkout URL extracted:", checkoutUrl);

    if (checkoutUrl) {
      console.log("✅ Returning checkout URL to client");
      return new Response(
        JSON.stringify({ ...data, checkout_url: checkoutUrl }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    // If PayChangu returned an error
    console.error("❌ PayChangu Error Object:", data);
    return new Response(
      JSON.stringify({
        error: data.message || "Payment Gateway Error",
        debug_full_response: data,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      },
    );
  } catch (error: any) {
    console.error("💥 Edge Function Fatal Error:", error.message);
    return new Response(
      JSON.stringify({
        error: error.message,
        debug_error: String(error),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      },
    );
  }
});
