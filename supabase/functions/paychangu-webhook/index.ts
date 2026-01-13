// Deno script for Supabase Edge Functions Webhook
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Access Deno via globalThis to avoid "Cannot find name 'Deno'" error in environments where Deno types are not loaded.
const supabase = createClient(
  (globalThis as any).Deno.env.get('SUPABASE_URL') ?? '',
  (globalThis as any).Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

serve(async (req) => {
  const payload = await req.json()
  
  // Verify Paychangu signature here if necessary
  
  if (payload.status === 'success') {
    const txRef = payload.tx_ref // e.g., nook_book123_timestamp
    const bookingId = txRef.split('_')[1]

    const { error } = await supabase
      .from('bookings')
      .update({ status: 'confirmed' })
      .eq('id', bookingId)

    if (error) {
      console.error('Webhook Error:', error)
      return new Response('Error updating booking', { status: 500 })
    }
  }

  return new Response('Webhook processed', { status: 200 })
})