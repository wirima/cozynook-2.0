-- THE COZY NOOK - MAINTENANCE & RECOVERY SCRIPT
-- Run this if you encounter "policy already exists" or "cannot be cast automatically" errors.

-- 1. SECURITY AUDIT & POLICY CONSOLIDATION
DO $$ 
BEGIN
    -- [A] CLEANUP LISTINGS POLICIES
    -- Drop all legacy/messy names from the public.listings table
    DROP POLICY IF EXISTS "Admins can manage listings" ON public.listings;
    DROP POLICY IF EXISTS "Admins can manage listings." ON public.listings;
    DROP POLICY IF EXISTS "Allow admin to modify listings" ON public.listings;
    DROP POLICY IF EXISTS "Allow public read access to listings" ON public.listings;
    DROP POLICY IF EXISTS "Enable delete for admins" ON public.listings;
    DROP POLICY IF EXISTS "Public: View Listings" ON public.listings;
    DROP POLICY IF EXISTS "Admin: All Listings" ON public.listings;
    
    -- Drop standardized names to prevent "already exists" errors during re-creation
    DROP POLICY IF EXISTS "listings_read_all" ON public.listings;
    DROP POLICY IF EXISTS "listings_admin_manage" ON public.listings;
    
    -- Re-establish standard Listing policies
    CREATE POLICY "listings_read_all" ON public.listings FOR SELECT USING (true);
    CREATE POLICY "listings_admin_manage" ON public.listings FOR ALL TO authenticated 
    USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

    -- [B] CLEANUP STORAGE POLICIES
    -- Drop legacy/messy names from the storage.objects table
    DROP POLICY IF EXISTS "Public Access" ON storage.objects;
    DROP POLICY IF EXISTS "Admin Management" ON storage.objects;
    DROP POLICY IF EXISTS "Public Image Access" ON storage.objects;
    DROP POLICY IF EXISTS "Admin Image Management" ON storage.objects;
    DROP POLICY IF EXISTS "Admin Upload" ON storage.objects;
    DROP POLICY IF EXISTS "Admin Update/Delete" ON storage.objects;

    -- Drop standardized names to prevent "already exists" errors during re-creation
    DROP POLICY IF EXISTS "storage_read_all" ON storage.objects;
    DROP POLICY IF EXISTS "storage_admin_manage" ON storage.objects;

    -- Re-establish standard Storage policies
    CREATE POLICY "storage_read_all" ON storage.objects FOR SELECT USING ( bucket_id = 'listing-images' );
    CREATE POLICY "storage_admin_manage" ON storage.objects FOR ALL TO authenticated 
    USING (
        bucket_id = 'listing-images' AND 
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    );
END $$;

-- 2. DATA INTEGRITY & TYPE CONVERSION
-- Fix for Error 42804: Handles default constraint during column type alteration
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'listings' AND column_name = 'images' AND data_type = 'ARRAY'
    ) THEN
        -- Step 1: Remove old default to allow type alteration
        ALTER TABLE public.listings ALTER COLUMN images DROP DEFAULT;
        
        -- Step 2: Perform the conversion
        ALTER TABLE public.listings ALTER COLUMN images TYPE JSONB USING to_jsonb(images);
        
        -- Step 3: Re-apply the modern JSONB default
        ALTER TABLE public.listings ALTER COLUMN images SET DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- 3. GLOBAL CONFIGURATION
-- Ensure the hero_image_url key exists in site_config
INSERT INTO public.site_config (key, value)
VALUES ('hero_image_url', 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=2070')
ON CONFLICT (key) DO NOTHING;

-- Prevent UI crashes by ensuring images are never NULL
UPDATE public.listings SET images = '[]'::jsonb WHERE images IS NULL;