-- East Eagles Sanda Club Database Schema
-- Migration: 002_sanda_schema.sql
-- Created: 2025-12-05
-- Description: Complete schema for Sanda sport club management

BEGIN;

-- Drop existing tables if they exist
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS training_sessions CASCADE;
DROP TABLE IF EXISTS athletes CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS event_registrations CASCADE;
DROP TABLE IF EXISTS announcements CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS members CASCADE;

-- ============================================================================
-- Table: users
-- Description: System users (admin, coach, athlete accounts)
-- ============================================================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(120) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'coach', 'athlete')),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- Table: athletes
-- Description: Sanda athletes information and membership details
-- ============================================================================
CREATE TABLE athletes (
    id SERIAL PRIMARY KEY,
    
    -- Personal Information
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender VARCHAR(10) NOT NULL CHECK (gender IN ('male', 'female', 'other')),
    nationality VARCHAR(50),
    photo_url TEXT,
    
    -- Contact Information
    email VARCHAR(120) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    postal_code VARCHAR(10),
    
    -- Emergency Contact
    emergency_contact_name VARCHAR(150) NOT NULL,
    emergency_contact_phone VARCHAR(20) NOT NULL,
    emergency_contact_relation VARCHAR(50),
    
    -- Sanda Sport Specific
    weight_kg DECIMAL(5,2),
    weight_category VARCHAR(50), -- e.g., '48kg', '52kg', '56kg', etc.
    belt_level VARCHAR(50), -- e.g., 'white', 'yellow', 'green', 'blue', 'brown', 'black'
    skill_level VARCHAR(20) CHECK (skill_level IN ('beginner', 'intermediate', 'advanced', 'elite')),
    years_of_experience INTEGER DEFAULT 0,
    
    -- Membership
    registration_date DATE NOT NULL DEFAULT CURRENT_DATE,
    membership_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (
        membership_status IN ('pending', 'approved', 'rejected', 'suspended', 'expired')
    ),
    
    -- Approval Workflow
    approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    
    -- Medical
    medical_conditions TEXT,
    allergies TEXT,
    blood_type VARCHAR(5),
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- Table: documents
-- Description: Documents uploaded by athletes (medical certificates, licenses, etc.)
-- ============================================================================
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    athlete_id INTEGER NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
    
    document_type VARCHAR(50) NOT NULL CHECK (
        document_type IN ('medical_certificate', 'identity_card', 'photo', 'license', 'insurance', 'other')
    ),
    
    -- File Information
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL, -- Local file system path
    file_url TEXT, -- Public URL if using cloud storage
    file_size_bytes INTEGER,
    mime_type VARCHAR(100),
    
    -- Validation
    validation_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (
        validation_status IN ('pending', 'approved', 'rejected')
    ),
    validated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    validated_at TIMESTAMP,
    rejection_reason TEXT,
    
    -- Expiry (for medical certificates, licenses)
    expiry_date DATE,
    
    -- Timestamps
    uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Notes
    notes TEXT
);

-- ============================================================================
-- Table: training_sessions
-- Description: Training sessions organized by the club
-- ============================================================================
CREATE TABLE training_sessions (
    id SERIAL PRIMARY KEY,
    
    title VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- Session Details
    session_date TIMESTAMP NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 90,
    location VARCHAR(200) NOT NULL,
    
    -- Coach
    coach_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    
    -- Capacity
    max_participants INTEGER DEFAULT 0, -- 0 = unlimited
    
    -- Level
    level VARCHAR(20) CHECK (level IN ('beginner', 'intermediate', 'advanced', 'all')),
    
    -- Session Type
    session_type VARCHAR(50), -- e.g., 'technique', 'sparring', 'conditioning', 'competition_prep'
    
    -- Status
    is_cancelled BOOLEAN NOT NULL DEFAULT false,
    cancellation_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- Table: attendance
-- Description: Track athlete attendance at training sessions
-- ============================================================================
CREATE TABLE attendance (
    id SERIAL PRIMARY KEY,
    
    training_session_id INTEGER NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
    athlete_id INTEGER NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
    
    -- Attendance
    attended BOOLEAN NOT NULL DEFAULT false,
    
    -- Optional notes from coach
    notes TEXT,
    
    -- Performance/Progress tracking (optional)
    performance_rating INTEGER CHECK (performance_rating >= 1 AND performance_rating <= 5),
    
    -- Timestamps
    marked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    marked_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    
    -- Ensure unique attendance per session per athlete
    UNIQUE(training_session_id, athlete_id)
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);

-- Athletes
CREATE INDEX idx_athletes_email ON athletes(email);
CREATE INDEX idx_athletes_membership_status ON athletes(membership_status);
CREATE INDEX idx_athletes_belt_level ON athletes(belt_level);
CREATE INDEX idx_athletes_weight_category ON athletes(weight_category);
CREATE INDEX idx_athletes_skill_level ON athletes(skill_level);
CREATE INDEX idx_athletes_approved_by ON athletes(approved_by);
CREATE INDEX idx_athletes_registration_date ON athletes(registration_date);

-- Documents
CREATE INDEX idx_documents_athlete_id ON documents(athlete_id);
CREATE INDEX idx_documents_document_type ON documents(document_type);
CREATE INDEX idx_documents_validation_status ON documents(validation_status);
CREATE INDEX idx_documents_expiry_date ON documents(expiry_date);
CREATE INDEX idx_documents_validated_by ON documents(validated_by);

-- Training Sessions
CREATE INDEX idx_training_sessions_session_date ON training_sessions(session_date);
CREATE INDEX idx_training_sessions_coach_id ON training_sessions(coach_id);
CREATE INDEX idx_training_sessions_level ON training_sessions(level);
CREATE INDEX idx_training_sessions_is_cancelled ON training_sessions(is_cancelled);

-- Attendance
CREATE INDEX idx_attendance_training_session_id ON attendance(training_session_id);
CREATE INDEX idx_attendance_athlete_id ON attendance(athlete_id);
CREATE INDEX idx_attendance_attended ON attendance(attended);
CREATE INDEX idx_attendance_marked_by ON attendance(marked_by);

-- ============================================================================
-- Default Data: Create initial admin user
-- ============================================================================

-- Password is 'admin123' (CHANGE THIS IN PRODUCTION!)
-- Hash generated with bcrypt cost 12
INSERT INTO users (email, password_hash, role, first_name, last_name) VALUES
('admin@easteagles.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LPEwMp4EKJvLx.EHi', 'admin', 'Admin', 'East Eagles');

-- ============================================================================
-- Sample Data (Optional - Uncomment to use)
-- ============================================================================

-- Sample Coach
-- INSERT INTO users (email, password_hash, role, first_name, last_name) VALUES
-- ('coach@easteagles.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LPEwMp4EKJvLx.EHi', 'coach', 'Mohamed', 'Benali');

-- Sample Athletes
-- INSERT INTO athletes (
--     first_name, last_name, date_of_birth, gender, email, phone,
--     emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
--     weight_kg, weight_category, belt_level, skill_level,
--     membership_status
-- ) VALUES
-- ('Ahmed', 'Kaddour', '2000-05-15', 'male', 'ahmed.kaddour@example.com', '+213 555 123 456',
--  'Fatima Kaddour', '+213 555 123 457', 'Mother',
--  65.5, '65kg', 'blue', 'intermediate', 'approved'),
--  
-- ('Yasmine', 'Messaoud', '2002-08-22', 'female', 'yasmine.messaoud@example.com', '+213 555 234 567',
--  'Ali Messaoud', '+213 555 234 568', 'Father',
--  52.0, '52kg', 'green', 'beginner', 'pending');

-- Sample Training Session
-- INSERT INTO training_sessions (
--     title, description, session_date, duration_minutes, location,
--     coach_id, max_participants, level, session_type
-- ) VALUES
-- ('Technique Training', 'Focus on basic strikes and footwork', 
--  '2025-12-10 18:00:00', 90, 'Main Dojo', 
--  2, 20, 'beginner', 'technique');

-- ============================================================================
-- Functions and Triggers
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_athletes_updated_at BEFORE UPDATE ON athletes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_training_sessions_updated_at BEFORE UPDATE ON training_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Cleanup: Grant permissions (adjust as needed for your setup)
-- ============================================================================

-- Example for a specific database user
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;

COMMIT;

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- This migration creates a complete schema for the East Eagles Sanda Club
-- 
-- Next steps:
-- 1. Run this migration: psql -U user -d dbname -f migrations/002_sanda_schema.sql
-- 2. Verify tables created: \dt in psql
-- 3. Check initial admin user created
-- 4. Change default admin password immediately!
-- ============================================================================
