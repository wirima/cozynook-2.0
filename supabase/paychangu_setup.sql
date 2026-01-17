-- 1. PAYMENT LOGS TABLE
-- Tracks every attempt made through PayChangu for audit and security.
CREATE TABLE IF NOT EXISTS public.payment_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  tx_ref TEXT UNIQUE NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'MWK',
  status TEXT DEFAULT 'initiated' CHECK (status IN ('initiated', 'success', 'failed')),
  gateway_response JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ENABLE RLS
ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;

-- 3. RLS POLICIES
-- Admins can see all logs
CREATE POLICY "admin_all_payment_logs" ON public.payment_logs
FOR ALL TO authenticated
USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Guests can see only their own payment logs
CREATE POLICY "guest_read_own_payment_logs" ON public.payment_logs
FOR SELECT TO authenticated
USING (
  booking_id IN (
    SELECT id FROM public.bookings WHERE user_id = auth.uid()
  )
);

-- 4. AUTOMATED STATUS TRIGGER
-- This function runs every time a payment_log is updated to 'success'
CREATE OR REPLACE FUNCTION public.handle_successful_payment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'success' AND OLD.status != 'success' THEN
    UPDATE public.bookings
    SET status = 'confirmed'
    WHERE id = NEW.booking_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_payment_success
  AFTER UPDATE ON public.payment_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_successful_payment();

-- 5. WEBHOOK PERMISSIONS
-- Ensure the service role can manage these tables (Standard for Edge Functions)
GRANT ALL ON public.payment_logs TO service_role;
GRANT ALL ON public.bookings TO service_role;
