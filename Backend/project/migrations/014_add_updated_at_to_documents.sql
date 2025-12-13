-- Migration: 014_add_updated_at_to_documents.sql
-- Description: Add updated_at column to documents table to satisfy update trigger

ALTER TABLE documents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Backfill existing rows
UPDATE documents SET updated_at = uploaded_at WHERE updated_at IS NULL;
