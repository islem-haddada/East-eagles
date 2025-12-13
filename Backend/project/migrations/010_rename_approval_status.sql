-- Fix membership_status column naming
-- Migration: 010_rename_approval_status.sql
-- Description: Rename approval_status to membership_status to match Go models

-- Rename approval_status to membership_status
DO $$
BEGIN
    IF EXISTS(SELECT * FROM information_schema.columns 
              WHERE table_name = 'athletes' AND column_name = 'approval_status') THEN
        ALTER TABLE athletes RENAME COLUMN approval_status TO membership_status;
        RAISE NOTICE 'Column approval_status renamed to membership_status';
    ELSIF EXISTS(SELECT * FROM information_schema.columns 
                 WHERE table_name = 'athletes' AND column_name = 'membership_status') THEN
        RAISE NOTICE 'Column membership_status already exists, no change needed';
    ELSE
        RAISE EXCEPTION 'Neither approval_status nor membership_status column exists!';
    END IF;
END $$;
