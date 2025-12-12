-- Fix schema mismatch between 002_sanda_schema.sql and backend code
-- Migration: 004_fix_schema_mismatch.sql

-- Rename columns to match struct safely
DO $$
BEGIN
    IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'athletes' AND column_name = 'date_of_birth') THEN
        ALTER TABLE athletes RENAME COLUMN date_of_birth TO birth_date;
    END IF;
    IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'athletes' AND column_name = 'weight_kg') THEN
        ALTER TABLE athletes RENAME COLUMN weight_kg TO weight;
    END IF;
    IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'athletes' AND column_name = 'membership_status') THEN
        ALTER TABLE athletes RENAME COLUMN membership_status TO approval_status;
    END IF;
    IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'athletes' AND column_name = 'years_of_experience') THEN
        ALTER TABLE athletes RENAME COLUMN years_of_experience TO experience_years;
    END IF;
END $$;

-- Add missing columns
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS height DECIMAL(5,2);
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS student_id VARCHAR(50);
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS field_of_study VARCHAR(100);
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS previous_martial_arts TEXT;
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
