-- Add is_active column to athletes table
-- Migration: 005_add_is_active.sql

ALTER TABLE athletes ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
