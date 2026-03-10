-- supabase/005_pdf_presentations_migration.sql

-- 1. Add pdf_url column to presentations table
ALTER TABLE public.presentations
ADD COLUMN IF NOT EXISTS pdf_url TEXT;

-- 2. Create the presentations_pdf bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('presentations_pdf', 'presentations_pdf', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Set up RLS for the presentations_pdf bucket

-- Allow public read access (so anyone with the link can view the PDF)
CREATE POLICY "Public Read Access for presentations_pdf bucket" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'presentations_pdf');

-- Allow authenticated users to upload PDFs
CREATE POLICY "Authenticated Insert Access for presentations_pdf bucket" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'presentations_pdf');

-- Allow authenticated users to update their own PDFs
CREATE POLICY "Authenticated Update Access for presentations_pdf bucket" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (bucket_id = 'presentations_pdf' AND owner_id::text = auth.uid()::text);

-- Allow authenticated users to delete their own PDFs
CREATE POLICY "Authenticated Delete Access for presentations_pdf bucket" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id = 'presentations_pdf' AND owner_id::text = auth.uid()::text);
