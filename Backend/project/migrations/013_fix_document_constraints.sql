-- Migration: 013_fix_document_constraints.sql
-- Description: Drop restrictive check constraint on document_type to allow frontend values

ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_document_type_check;
