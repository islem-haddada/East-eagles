-- East Eagles Sanda Club - Database Schema Update
-- Migration: 002_sanda_club_schema.sql
-- Created: 2025-12-05
-- Description: Transform from scientific club to Sanda sport club

BEGIN;

-- ============================================================================
-- STEP 1: Rename members table to athletes
-- ============================================================================

ALTER TABLE members RENAME TO athletes;

-- ============================================================================
-- STEP 2: Add athlete-specific columns
-- ============================================================================

ALTER TABLE athletes
-- Personal & Physical Info
ADD COLUMN birth_date DATE,
ADD COLUMN weight DECIMAL(5,2), -- in kg
ADD COLUMN height DECIMAL(5,2), -- in cm
ADD COLUMN gender VARCHAR(10),
ADD COLUMN address TEXT,

-- Sport-Specific Info
ADD COLUMN belt_level VARCHAR(50) DEFAULT 'beginner',
ADD COLUMN experience_years INTEGER DEFAULT 0,
ADD COLUMN previous_martial_arts TEXT,

-- Emergency Contact
ADD COLUMN emergency_contact_name VARCHAR(100),
ADD COLUMN emergency_contact_phone VARCHAR(20),
ADD COLUMN emergency_contact_relation VARCHAR(50),

-- Approval Workflow
ADD COLUMN approval_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
ADD COLUMN approved_by INTEGER,
ADD COLUMN approved_at TIMESTAMP,
ADD COLUMN rejection_reason TEXT,

-- Medical Info
ADD COLUMN medical_conditions TEXT,
ADD COLUMN allergies TEXT,
ADD COLUMN blood_type VARCHAR(5);

-- Update existing records to 'approved' status
UPDATE athletes SET approval_status = 'approved' WHERE approval_status IS NULL;

-- ============================================================================
-- STEP 3: Create users table for authentication
-- ============================================================================

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'athlete', -- 'athlete', 'coach', 'admin'
    athlete_id INTEGER REFERENCES athletes(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on email for faster login queries
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================================================
-- STEP 4: Create documents table
-- ============================================================================

CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    athlete_id INTEGER NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL, -- 'medical_certificate', 'photo', 'id_card', 'parental_consent', 'other'
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER, -- in bytes
    mime_type VARCHAR(100),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verified BOOLEAN DEFAULT false,
    verified_by INTEGER REFERENCES users(id),
    verified_at TIMESTAMP,
    notes TEXT
);

CREATE INDEX idx_documents_athlete_id ON documents(athlete_id);
CREATE INDEX idx_documents_type ON documents(document_type);

-- ============================================================================
-- STEP 5: Create training sessions table
-- ============================================================================

CREATE TABLE training_sessions (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    session_date TIMESTAMP NOT NULL,
    duration_minutes INTEGER DEFAULT 90,
    location VARCHAR(200),
    coach_id INTEGER REFERENCES users(id),
    max_participants INTEGER,
    level VARCHAR(50), -- 'beginner', 'intermediate', 'advanced', 'all'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_training_sessions_date ON training_sessions(session_date);

-- ============================================================================
-- STEP 6: Create attendance table
-- ============================================================================

CREATE TABLE attendance (
    id SERIAL PRIMARY KEY,
    training_session_id INTEGER NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
    athlete_id INTEGER NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
    attended BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(training_session_id, athlete_id)
);

CREATE INDEX idx_attendance_session ON attendance(training_session_id);
CREATE INDEX idx_attendance_athlete ON attendance(athlete_id);

-- ============================================================================
-- STEP 7: Update events table for competitions
-- ============================================================================

ALTER TABLE events
ADD COLUMN event_type VARCHAR(50) DEFAULT 'general', -- 'competition', 'seminar', 'general'
ADD COLUMN weight_category VARCHAR(50),
ADD COLUMN level_requirement VARCHAR(50);

-- ============================================================================
-- STEP 8: Add foreign key constraint for approval
-- ============================================================================

ALTER TABLE athletes
ADD CONSTRAINT fk_athletes_approved_by 
FOREIGN KEY (approved_by) REFERENCES users(id);

-- ============================================================================
-- STEP 9: Create admin user (default password: admin123 - CHANGE THIS!)
-- ============================================================================

-- Password hash for 'admin123' using bcrypt (this is just a placeholder)
-- You should change this immediately after first login
INSERT INTO users (email, password_hash, role) VALUES
('admin@easteagles.com', '$2a$10$rO7W8FZbGVTeFNQEQ0zRGu.FJYXbXk5J5fGk4CWfX4k4k4k4k4k4k', 'admin');

-- ============================================================================
-- STEP 10: Data Migration - Create user accounts for existing athletes
-- ============================================================================

-- Create user accounts for existing athletes with pending approval
INSERT INTO users (email, password_hash, role, athlete_id)
SELECT 
    email,
    '$2a$10$temp.temp.temp.temp.temp.temp.temp.temp.temp.temp', -- Temporary hash
    'athlete',
    id
FROM athletes
WHERE email IS NOT NULL;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify table structure
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'athletes';

-- Count pending athletes
-- SELECT COUNT(*) FROM athletes WHERE approval_status = 'pending';

-- List all users
-- SELECT id, email, role FROM users;
