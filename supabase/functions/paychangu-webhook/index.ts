export const config = {
  auth: false,
};

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// @ts-ignore: Supabase Edge supports URL imports at runtime
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: any;

const textEncoder = new TextEncoder();

async function verifySignature(
  secret: string,
  signature: string,
  body: string,
) {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );

  const hexPairs = signature.match(/.{1,2}/g) || [];
  const signatureBytes = new Uint8Array(
    hexPairs.map((byte) => parseInt(byte, 16)),
  );

  return crypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes,
    textEncoder.encode(body),
  );
}

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const webhookSecret = Deno.env.get("PAYCHANGU_WEBHOOK_SECRET");
const CLIENT_URL =
  Deno.env.get("CLIENT_URL") || "https://thecozynook.vercel.app";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

Deno.serve(async (req: Request) => {
  try {
    if (req.method === "GET") {
      const url = new URL(req.url);
      const txRef = url.searchParams.get("tx_ref");
      const origin = url.searchParams.get("return_origin") || CLIENT_URL;

      if (txRef) {
        const parts = txRef.split("_");
        const bookingId = parts[2];

        if (bookingId) {
          await supabase
            .from("bookings")
            .update({ status: "confirmed" })
            .eq("id", bookingId);

          return Response.redirect(
            `${origin}/?payment_verifying=true&booking_id=${bookingId}`,
            302,
          );
        }
      }

      return Response.redirect(`${origin}/?payment_verifying=true`, 302);
    }

    if (!webhookSecret) {
      return new Response("Server Missing Webhook Secret", { status: 500 });
    }

    const rawBody = await req.text();
    const signature =
      req.headers.get("x-webhook-signature") ||
      req.headers.get("paychangu-signature");

    if (signature) {
      const valid = await verifySignature(webhookSecret, signature, rawBody);
      if (!valid) {
        return new Response("Invalid Signature", { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody);
    const success =
      payload.status === "success" || payload.event === "payment.success";

    if (success) {
      const txRef = payload.tx_ref || payload.data?.tx_ref;
      if (!txRef) return new Response("Missing tx_ref", { status: 400 });

      const parts = txRef.split("_");
      const bookingId = parts[2];

      if (bookingId) {
        await supabase
          .from("bookings")
          .update({ status: "confirmed" })
          .eq("id", bookingId);

        await supabase.from("payment_logs").upsert(
          {
            booking_id: bookingId,
            tx_ref: txRef,
            amount: payload.amount || payload.data?.amount || 0,
            status: "success",
            gateway_response: payload,
          },
          { onConflict: "tx_ref" },
        );
      }
    } else if (payload.status === "failed") {
      const txRef = payload.tx_ref || payload.data?.tx_ref;
      const bookingId = txRef?.split("_")[2];

      if (bookingId) {
        await supabase
          .from("bookings")
          .update({ status: "cancelled" })
          .eq("id", bookingId);
      }
    }

    return new Response("OK", { status: 200 });
  } catch (err: any) {
    return new Response(`Error: ${err?.message || String(err)}`, {
      status: 400,
    });
  }
});
