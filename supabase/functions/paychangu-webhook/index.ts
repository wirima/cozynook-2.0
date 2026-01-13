import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = (globalThis as any).Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = (globalThis as any).Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

// Fix: Access Deno via globalThis to bypass TypeScript 'Cannot find name' errors in non-Deno environments
const supabase = createClient(supabaseUrl, supabaseServiceKey)

serve(async (req) => {
  try {
    const payload = await req.json()
    console.log('Webhook payload received:', JSON.stringify(payload))

    // PayChangu webhooks typically send a POST with payment data
    // We check the status field
    if (payload.status === 'success' || payload.event === 'payment.success') {
      const txRef = payload.tx_ref || payload.data?.tx_ref
      
      if (!txRef) {
        console.warn('No tx_ref found in webhook payload');
        return new Response('No tx_ref', { status: 400 })
      }

      // Extract bookingId from tx_ref (Format: nook_txn_{booking_id}_{timestamp})
      const parts = txRef.split('_')
      const bookingId = parts[2]

      if (bookingId) {
        console.log(`Confirming booking: ${bookingId}`);
        const { error } = await supabase
          .from('bookings')
          .update({ status: 'confirmed' })
          .eq('id', bookingId)

        if (error) {
          console.error('Database update error:', error)
          return new Response('Database error', { status: 500 })
        }
        
        console.log(`Booking ${bookingId} successfully confirmed via PayChangu Webhook.`);
      }
    }

    return new Response('Webhook Accepted', { status: 200 })
  } catch (err) {
    console.error('Webhook processing error:', err.message)
    return new Response('Processing Error', { status: 400 })
  }
})