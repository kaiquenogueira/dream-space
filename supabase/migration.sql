-- =============================================
-- DreamSpace SaaS — Database Migration
-- Execute this in Supabase Dashboard → SQL Editor
-- =============================================

-- 1. Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  credits_remaining INT NOT NULL DEFAULT 8,
  credits_reset_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  plan TEXT NOT NULL DEFAULT 'free',
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Properties (imóveis/projetos)
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Generations (histórico de imagens geradas)
CREATE TABLE generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  original_image_url TEXT NOT NULL,
  generated_image_url TEXT NOT NULL,
  prompt_used TEXT NOT NULL,
  style TEXT,
  generation_mode TEXT,
  is_compressed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Property Images (originais + geradas por projeto)
CREATE TABLE property_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  original_image_path TEXT NOT NULL,
  generated_image_path TEXT,
  video_operation_name TEXT,
  video_url TEXT,
  style TEXT,
  generation_mode TEXT,
  is_compressed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Generation Metrics
CREATE TABLE generation_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  model TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  latency_ms INT,
  input_bytes BIGINT,
  output_bytes BIGINT,
  credits_used INT NOT NULL DEFAULT 0,
  estimated_cost_usd NUMERIC(10,4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX generation_metrics_user_created_idx ON generation_metrics(user_id, created_at DESC);

-- =============================================
-- Row Level Security (RLS)
-- =============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_metrics ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Properties
CREATE POLICY "Users can read own properties"
  ON properties FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own properties"
  ON properties FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own properties"
  ON properties FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own properties"
  ON properties FOR DELETE
  USING (auth.uid() = user_id);

-- Generations
CREATE POLICY "Users can read own generations"
  ON generations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own generations"
  ON generations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Property Images
CREATE POLICY "Users can read own property images"
  ON property_images FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own property images"
  ON property_images FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own property images"
  ON property_images FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own property images"
  ON property_images FOR DELETE
  USING (auth.uid() = user_id);

-- Generation Metrics
CREATE POLICY "Users can read own generation metrics"
  ON generation_metrics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own generation metrics"
  ON generation_metrics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- Trigger: Auto-create profile on signup
-- =============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================
-- Function: Reset monthly credits (call via cron or Edge Function)
-- =============================================
CREATE OR REPLACE FUNCTION reset_monthly_credits()
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET
    credits_remaining = CASE
      WHEN plan = 'free' THEN 8
      WHEN plan = 'starter' THEN 50
      WHEN plan = 'pro' THEN 200
      ELSE credits_remaining
    END,
    credits_reset_at = NOW() + INTERVAL '30 days',
    updated_at = NOW()
  WHERE credits_reset_at <= NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_credits(p_user_id UUID, p_amount INT)
RETURNS INT AS $$
DECLARE
  new_credits INT;
BEGIN
  UPDATE profiles
  SET credits_remaining = credits_remaining - p_amount,
      updated_at = NOW()
  WHERE id = p_user_id
    AND credits_remaining >= p_amount
  RETURNING credits_remaining INTO new_credits;

  IF new_credits IS NULL THEN
    RAISE EXCEPTION 'insufficient_credits';
  END IF;

  RETURN new_credits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_credits(p_user_id UUID, p_amount INT)
RETURNS INT AS $$
DECLARE
  new_credits INT;
BEGIN
  UPDATE profiles
  SET credits_remaining = credits_remaining + p_amount,
      updated_at = NOW()
  WHERE id = p_user_id
  RETURNING credits_remaining INTO new_credits;

  RETURN new_credits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Storage Buckets
-- =============================================
-- Create via Supabase Dashboard → Storage → New Bucket:
--   1. "originals" (private) — fotos originais uploadadas
--   2. "generations" (private) — fotos geradas pela IA

-- Storage RLS policies (execute after creating buckets):
 INSERT INTO storage.buckets (id, name, public) VALUES ('originals', 'originals', false);
 INSERT INTO storage.buckets (id, name, public) VALUES ('generations', 'generations', false);

 CREATE POLICY "Users can upload originals"
   ON storage.objects FOR INSERT
   WITH CHECK (bucket_id = 'originals' AND auth.uid()::text = (storage.foldername(name))[1]);

 CREATE POLICY "Users can read own originals"
   ON storage.objects FOR SELECT
   USING (bucket_id = 'originals' AND auth.uid()::text = (storage.foldername(name))[1]);

 CREATE POLICY "Users can upload generations"
   ON storage.objects FOR INSERT
   WITH CHECK (bucket_id = 'generations' AND auth.uid()::text = (storage.foldername(name))[1]);

 CREATE POLICY "Users can read own generations"
   ON storage.objects FOR SELECT
   USING (bucket_id = 'generations' AND auth.uid()::text = (storage.foldername(name))[1]);
