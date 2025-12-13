-- Relax athlete table constraints to allow progressive profile creation
-- Migration: 011_relax_athlete_constraints.sql

ALTER TABLE athletes ALTER COLUMN birth_date DROP NOT NULL;
ALTER TABLE athletes ALTER COLUMN gender DROP NOT NULL;
ALTER TABLE athletes ALTER COLUMN emergency_contact_name DROP NOT NULL;
ALTER TABLE athletes ALTER COLUMN emergency_contact_phone DROP NOT NULL;
