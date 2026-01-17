-- THE COZY NOOK - PRODUCTION DATABASE SCHEMA (v3.7)

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  role TEXT DEFAULT 'guest' CHECK (role IN ('admin', 'guest', 'delegate')),
  has_logged_in_before BOOLEAN DEFAULT FALSE,
  is_suspended BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. LISTINGS TABLE
CREATE TABLE IF NOT EXISTS public.listings (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  price NUMERIC NOT NULL,
  description TEXT,
  short_summary TEXT,
  amenities JSONB DEFAULT '[]'::jsonb,
  images JSONB DEFAULT '[]'::jsonb,
  max_guests INTEGER DEFAULT 2,
  bedrooms INTEGER DEFAULT 1,
  bathrooms INTEGER DEFAULT 1,
  address TEXT,
  check_in_method TEXT,
  check_in_time TEXT,
  check_out_time TEXT,
  cleaning_fee NUMERIC DEFAULT 0,
  security_deposit NUMERIC DEFAULT 0,
  min_stay INTEGER DEFAULT 1,
  max_stay INTEGER DEFAULT 30,
  house_rules JSONB DEFAULT '{}'::jsonb,
  host_info JSONB DEFAULT '{}'::jsonb,
  guest_experience JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. BOOKINGS TABLE
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  listing_id TEXT REFERENCES public.listings(id) ON DELETE CASCADE,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  total_amount NUMERIC NOT NULL,
  guest_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. SITE CONFIGURATION
CREATE TABLE IF NOT EXISTS public.site_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_config ENABLE ROW LEVEL SECURITY;

-- 7. CLEANUP & CONSOLIDATED POLICIES
DO $$ 
BEGIN
    -- [A] LISTINGS CLEANUP
    DROP POLICY IF EXISTS "Admins can manage listings" ON public.listings;
    DROP POLICY IF EXISTS "Admins can manage listings." ON public.listings;
    DROP POLICY IF EXISTS "Allow admin to modify listings" ON public.listings;
    DROP POLICY IF EXISTS "Allow public read access to listings" ON public.listings;
    DROP POLICY IF EXISTS "Enable delete for admins" ON public.listings;
    DROP POLICY IF EXISTS "Public: View Listings" ON public.listings;
    DROP POLICY IF EXISTS "Admin: All Listings" ON public.listings;
    DROP POLICY IF EXISTS "listings_read_all" ON public.listings;
    DROP POLICY IF EXISTS "listings_admin_manage" ON public.listings;

    -- Create Clean Listings Policies
    CREATE POLICY "listings_read_all" ON public.listings FOR SELECT USING (true);
    CREATE POLICY "listings_admin_manage" ON public.listings FOR ALL TO authenticated 
    USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

    -- [B] SITE CONFIG CLEANUP
    DROP POLICY IF EXISTS "Config: Public Read" ON public.site_config;
    DROP POLICY IF EXISTS "Config: Admin Manage" ON public.site_config;
    DROP POLICY IF EXISTS "config_read_all" ON public.site_config;
    DROP POLICY IF EXISTS "config_admin_manage" ON public.site_config;

    CREATE POLICY "config_read_all" ON public.site_config FOR SELECT USING (true);
    CREATE POLICY "config_admin_manage" ON public.site_config FOR ALL TO authenticated 
    USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
END $$;

-- 8. STORAGE SETUP
INSERT INTO storage.buckets (id, name, public) 
VALUES ('listing-images', 'listing-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DO $$
BEGIN
    -- [C] STORAGE CLEANUP
    DROP POLICY IF EXISTS "Public Access" ON storage.objects;
    DROP POLICY IF EXISTS "Public Image Access" ON storage.objects;
    DROP POLICY IF EXISTS "storage_read_all" ON storage.objects;
    CREATE POLICY "storage_read_all" ON storage.objects FOR SELECT USING ( bucket_id = 'listing-images' );

    DROP POLICY IF EXISTS "Admin Management" ON storage.objects;
    DROP POLICY IF EXISTS "Admin Image Management" ON storage.objects;
    DROP POLICY IF EXISTS "Admin Upload" ON storage.objects;
    DROP POLICY IF EXISTS "Admin Update/Delete" ON storage.objects;
    DROP POLICY IF EXISTS "storage_admin_manage" ON storage.objects;
    CREATE POLICY "storage_admin_manage" ON storage.objects FOR ALL TO authenticated
    USING ( 
        bucket_id = 'listing-images' AND 
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    );
END $$;