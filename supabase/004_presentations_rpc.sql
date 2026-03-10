-- supabase/004_presentations_rpc.sql
-- Adiciona a função para incrementar as visualizações de uma apresentação

CREATE OR REPLACE FUNCTION public.increment_presentation_views(presentation_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Permite que a função rode com privilégios do criador, bypassando RLS
AS $$
BEGIN
  UPDATE public.presentations
  SET views = views + 1
  WHERE id = presentation_id;
END;
$$;
