// Fix: Declare Deno for the compiler as it is a global in Supabase Edge Functions
declare const Deno: any;

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey)

serve(async (req) => {
  try {
    const payload = await req.json()
    console.log('Webhook Received:', JSON.stringify(payload))

    // Handle PayChangu success logic
    const isSuccess = payload.status === 'success' || payload.event === 'payment.success';
    
    if (isSuccess) {
      const txRef = payload.tx_ref || payload.data?.tx_ref
      
      if (!txRef) return new Response('Missing tx_ref', { status: 400 })

      // Format: nook_txn_{booking_id}_{timestamp}
      const parts = txRef.split('_')
      const bookingId = parts[2]

      if (bookingId) {
        console.log(`Webhook: Confirming Booking ${bookingId}`);
        const { error } = await supabase
          .from('bookings')
          .update({ status: 'confirmed' })
          .eq('id', bookingId)

        if (error) {
          console.error('DB Update Error:', error)
          return new Response('Database Update Failed', { status: 500 })
        }
      }
    } else if (payload.status === 'failed') {
       // Optional: Mark as cancelled if payment fails
       const txRef = payload.tx_ref || payload.data?.tx_ref
       const bookingId = txRef?.split('_')[2]
       if (bookingId) {
         await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', bookingId)
       }
    }

    return new Response('OK', { status: 200 })
  } catch (err: any) {
    console.error('Webhook Error:', err.message)
    return new Response('Internal Error', { status: 400 })
  }
})