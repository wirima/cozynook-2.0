// Fix: Declare Deno for the compiler as it is a global in Supabase Edge Functions
declare const Deno: any;

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { amount, email, phone, first_name, last_name, booking_id, currency = 'MWK' } = await req.json()
    
    // Access Deno env vars - Ensure these are set in Supabase Dashboard
    const PAYCHANGU_SECRET_KEY = Deno.env.get('PAYCHANGU_SECRET_KEY');
    
    const origin = req.headers.get('origin') || 'https://thecozynook.vercel.app'

    if (!PAYCHANGU_SECRET_KEY) {
      return new Response(JSON.stringify({ error: 'PAYCHANGU_SECRET_KEY is not configured in Supabase' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
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
    }

    const response = await fetch('https://api.paychangu.com/payment', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${PAYCHANGU_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    const data = await response.json()

    if (data.status === 'success' || data.checkout_url || (data.data && data.data.checkout_url)) {
      const checkoutUrl = data.checkout_url || data.data?.checkout_url;
      return new Response(JSON.stringify({ ...data, checkout_url: checkoutUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    } else {
      return new Response(JSON.stringify({ error: data.message || 'PayChangu Gateway Error' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})