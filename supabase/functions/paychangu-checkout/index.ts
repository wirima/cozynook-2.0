// Deno script for Supabase Edge Functions
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// Access Deno via globalThis to avoid "Cannot find name 'Deno'" error in environments where Deno types are not loaded.
const PAYCHANGU_SECRET_KEY = (globalThis as any).Deno.env.get('PAYCHANGU_SECRET_KEY')

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } })
  }

  const { amount, email, first_name, last_name, booking_id } = await req.json()

  try {
    const response = await fetch('https://api.paychangu.com/payment', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${PAYCHANGU_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: amount,
        currency: 'MWK', // Or USD
        email: email,
        first_name: first_name,
        last_name: last_name,
        callback_url: `https://thecozynook.vercel.app/payment-success?id=${booking_id}`,
        return_url: `https://thecozynook.vercel.app/payment-fail?id=${booking_id}`,
        tx_ref: `nook_${booking_id}_${Date.now()}`,
        customization: {
          title: "The Cozy Nook Stay",
          description: `Booking for ${booking_id}`
        }
      })
    })

    const data = await response.json()
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 })
  }
})