
// Setup type definitions for Deno
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Declare Deno global to fix "Cannot find name 'Deno'" error
declare const Deno: any;

// Helpers for HMAC Verification
const textEncoder = new TextEncoder();

async function verifySignature(secret: string, signature: string, body: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  
  // Convert hex signature to Uint8Array
  const signatureBytes = new Uint8Array(
    signature.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
  );

  return crypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes,
    textEncoder.encode(body)
  );
}

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

Deno.serve(async (req: Request) => {
  try {
    const webhookSecret = Deno.env.get('PAYCHANGU_WEBHOOK_SECRET');
    if (!webhookSecret) {
      console.error("Missing PAYCHANGU_WEBHOOK_SECRET");
      return new Response('Server Configuration Error', { status: 500 });
    }

    const rawBody = await req.text();
    const signature = req.headers.get('x-webhook-signature') || req.headers.get('paychangu-signature');

    if (signature) {
      const isValid = await verifySignature(webhookSecret, signature, rawBody);
      if (!isValid) {
        console.error("Invalid Signature");
        return new Response('Invalid Signature', { status: 401 });
      }
    } else {
      console.warn("Missing Signature Header");
    }

    const payload = JSON.parse(rawBody);
    console.log('Webhook Payload:', JSON.stringify(payload));

    const isSuccess = payload.status === 'success' || payload.event === 'payment.success';
    
    if (isSuccess) {
      const txRef = payload.tx_ref || payload.data?.tx_ref;
      if (!txRef) return new Response('Missing tx_ref', { status: 400 });

      const parts = txRef.split('_');
      // Expected format: nook_txn_{bookingId}_{timestamp}
      const bookingId = parts[2];

      if (bookingId) {
        // 1. Mark Booking as Confirmed
        const { error: bookingError } = await supabase
          .from('bookings')
          .update({ status: 'confirmed' })
          .eq('id', bookingId);

        if (bookingError) {
          console.error('Booking Update Failed:', bookingError);
          return new Response('Database Error', { status: 500 });
        }

        // 2. Log Payment
        await supabase
          .from('payment_logs')
          .upsert({
            booking_id: bookingId,
            tx_ref: txRef,
            amount: payload.amount || payload.data?.amount || 0,
            status: 'success',
            gateway_response: payload
          }, { onConflict: 'tx_ref' });
      }
    } else if (payload.status === 'failed') {
       const txRef = payload.tx_ref || payload.data?.tx_ref;
       const bookingId = txRef?.split('_')[2];
       if (bookingId) {
         await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', bookingId);
       }
    }

    return new Response('OK', { status: 200 });

  } catch (err: any) {
    console.error('Webhook Error:', err.message);
    return new Response(`Error: ${err.message}`, { status: 400 });
  }
});
