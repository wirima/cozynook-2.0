import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests (Important for Browser -> Edge Function calls)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Extract data sent from BookingFlow.tsx
    const { amount, email, first_name, last_name, booking_id, currency = 'MWK' } = await req.json()
    
    // 2. Get Secret Key from your Supabase Dashboard Env Secrets
    // Fix: Access Deno via globalThis to bypass TypeScript 'Cannot find name' errors in non-Deno environments
    const PAYCHANGU_SECRET_KEY = (globalThis as any).Deno.env.get('PAYCHANGU_SECRET_KEY')

    if (!PAYCHANGU_SECRET_KEY) {
      console.error('PAYCHANGU_SECRET_KEY is missing in Supabase Settings');
      return new Response(JSON.stringify({ error: 'Gateway configuration error' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    // 3. Prepare PayChangu Payload
    // Note: tx_ref is a unique reference for this specific transaction attempt
    const payload = {
      amount: amount,
      currency: currency,
      email: email,
      first_name: first_name,
      last_name: last_name,
      callback_url: `https://thecozynook.vercel.app/payment-success?id=${booking_id}`,
      return_url: `https://thecozynook.vercel.app/payment-fail?id=${booking_id}`,
      tx_ref: `nook_txn_${booking_id}_${Date.now()}`,
      customization: {
        title: "The Cozy Nook Luxury Stay",
        description: `Booking Reference: ${booking_id}`
      }
    }

    // 4. Call PayChangu API
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

    // 5. Return response to Frontend
    if (data.status === 'success' || data.checkout_url || (data.data && data.data.checkout_url)) {
      // Standardize the response so the frontend always finds 'checkout_url'
      const checkoutUrl = data.checkout_url || data.data?.checkout_url;
      
      return new Response(JSON.stringify({ ...data, checkout_url: checkoutUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    } else {
      console.error('PayChangu API error details:', data)
      return new Response(JSON.stringify({ error: data.message || 'Payment initiation failed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }
  } catch (error) {
    console.error('Edge Function runtime error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})