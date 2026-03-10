-- =============================================
-- Feature: White-Label Presentation Export
-- Run this script in the Supabase SQL Editor
-- =============================================

-- 1. Updates to Profiles Table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS agency_name TEXT,
  ADD COLUMN IF NOT EXISTS agency_logo TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT;

-- 2. Presentations Table
CREATE TABLE IF NOT EXISTS presentations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT,
  description TEXT,
  views INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Presentation Images Table (Many-to-Many)
CREATE TABLE IF NOT EXISTS presentation_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  presentation_id UUID NOT NULL REFERENCES presentations(id) ON DELETE CASCADE,
  property_image_id UUID NOT NULL REFERENCES property_images(id) ON DELETE CASCADE,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(presentation_id, property_image_id)
);

-- 4. Storage Bucket
-- Must be executed manually in Supabase Dashboard or via API, but we provide the SQL
INSERT INTO storage.buckets (id, name, public) 
VALUES ('brand_assets', 'brand_assets', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Row Level Security (RLS)
ALTER TABLE presentations ENABLE ROW LEVEL SECURITY;
ALTER TABLE presentation_images ENABLE ROW LEVEL SECURITY;

-- Presentations RLS
CREATE POLICY "Presentations are viewable by everyone" 
  ON presentations FOR SELECT USING (true);

CREATE POLICY "Users can insert own presentations" 
  ON presentations FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own presentations" 
  ON presentations FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own presentations" 
  ON presentations FOR DELETE USING (auth.uid() = user_id);

-- Presentation Images RLS
CREATE POLICY "Presentation images are viewable by everyone" 
  ON presentation_images FOR SELECT USING (true);

-- To insert, the user must own the presentation
CREATE POLICY "Users can insert presentation images" 
  ON presentation_images FOR INSERT 
  WITH CHECK (
    EXISTS (SELECT 1 FROM presentations WHERE id = presentation_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can update presentation images" 
  ON presentation_images FOR UPDATE 
  USING (
    EXISTS (SELECT 1 FROM presentations WHERE id = presentation_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can delete presentation images" 
  ON presentation_images FOR DELETE 
  USING (
    EXISTS (SELECT 1 FROM presentations WHERE id = presentation_id AND user_id = auth.uid())
  );

-- Brand Assets Bucket RLS
CREATE POLICY "Brand assets are viewable by everyone"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'brand_assets');

CREATE POLICY "Users can upload brand assets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'brand_assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own brand assets"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'brand_assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own brand assets"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'brand_assets' AND auth.uid()::text = (storage.foldername(name))[1]);
