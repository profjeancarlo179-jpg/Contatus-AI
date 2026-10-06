ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS user_ids uuid[] NOT NULL DEFAULT '{}';
UPDATE public.clients SET user_ids = ARRAY[user_id] WHERE user_id IS NOT NULL AND user_ids = '{}';
COMMENT ON COLUMN public.clients.user_ids IS 'Usuários vinculados ao cliente (múltiplos logins).';