-- Migration: Add product_id to payments table to track product sales
-- Created At: 2026-06-09

ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.teacher_products(id) ON DELETE SET NULL;
