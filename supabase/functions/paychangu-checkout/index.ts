
// Setup type definitions for Deno
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

// Declare Deno global to fix "Cannot find name 'Deno'" error
declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { amount, email, phone, first_name, last_name, booking_id, currency = 'MWK' } = await req.json()
    
    const PAYCHANGU_SECRET_KEY = Deno.env.get('PAYCHANGU_SECRET_KEY');
    const origin = req.headers.get('origin') || 'https://thecozynook.vercel.app';

    if (!PAYCHANGU_SECRET_KEY) {
      console.error("Missing PAYCHANGU_SECRET_KEY");
      throw new Error('Server configuration error: Missing Payment Key');
    }

    const payload = {
      amount: Math.floor(amount),
      currency: currency,
      email: email,
      phone: phone || "",
      first_name: first_name,
      last_name: last_name,
      callback_url: `${origin}/payment-success?id=${booking_id}`,
      return_url: `${origin}/payment-fail?id=${booking_id}`,
      tx_ref: `nook_txn_${booking_id}_${Date.now()}`,
      customization: {
        title: "The Cozy Nook Stay",
        description: `Booking ID: ${booking_id}`
      }
    };

    console.log("Initiating PayChangu Payment:", { booking_id, amount, currency });

    const response = await fetch('https://api.paychangu.com/payment', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${PAYCHANGU_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    // Handle non-JSON responses from gateway
    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error("Invalid JSON from PayChangu:", responseText);
      throw new Error("Invalid response from payment gateway");
    }

    if (data.status === 'success' || data.checkout_url || (data.data && data.data.checkout_url)) {
      const checkoutUrl = data.checkout_url || data.data?.checkout_url;
      return new Response(JSON.stringify({ ...data, checkout_url: checkoutUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    } else {
      console.error("PayChangu Error:", data);
      return new Response(JSON.stringify({ error: data.message || 'Payment Gateway Error' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

  } catch (error: any) {
    console.error("Edge Function Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400, // Return 400 instead of 500 to pass error message to client cleanly
    });
  }
});
