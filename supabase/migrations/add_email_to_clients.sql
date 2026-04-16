-- ============================================
-- Migration: Add email column to clients table
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS email text;

-- 確認
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'clients' AND column_name = 'email';
