-- Fix attendance table schema mismatch
-- Migration: 006_fix_attendance_table.sql
-- Description: Add missing columns to attendance table

-- Check if columns exist and add them if they don't
DO $$
BEGIN
    -- Add marked_by column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendance' AND column_name = 'marked_by'
    ) THEN
        ALTER TABLE attendance ADD COLUMN marked_by INTEGER REFERENCES users(id);
    END IF;

    -- Add marked_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendance' AND column_name = 'marked_at'
    ) THEN
        ALTER TABLE attendance ADD COLUMN marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- Update existing records to set marked_at to created_at if created_at exists
-- This is for backward compatibility
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendance' AND column_name = 'created_at'
    ) THEN
        UPDATE attendance SET marked_at = created_at WHERE marked_at IS NULL;
    END IF;
END $$;
