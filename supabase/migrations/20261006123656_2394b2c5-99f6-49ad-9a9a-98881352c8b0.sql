ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'master';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'client';
ALTER TABLE public.profiles ADD COLUMN approved boolean NOT NULL DEFAULT false, ADD COLUMN email text;