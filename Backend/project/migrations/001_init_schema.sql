-- East Eagles Club Database Schema
-- Migration: 001_init_schema.sql
-- Created: 2025-12-05

-- Drop tables if they exist (for clean re-run)
DROP TABLE IF EXISTS event_registrations CASCADE;
DROP TABLE IF EXISTS announcements CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS members CASCADE;

-- Create Members Table
CREATE TABLE members (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    phone VARCHAR(20),
    student_id VARCHAR(50),
    field_of_study VARCHAR(100),
    registration_date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create Events Table
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    date TIMESTAMP NOT NULL,
    location VARCHAR(200),
    image_url TEXT,
    max_participants INTEGER DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create Announcements Table
CREATE TABLE announcements (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    published_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create Event Registrations Table (Junction table for many-to-many)
CREATE TABLE event_registrations (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    registered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, member_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_members_email ON members(email);
CREATE INDEX idx_members_is_active ON members(is_active);
CREATE INDEX idx_events_date ON events(date);
CREATE INDEX idx_announcements_is_pinned ON announcements(is_pinned);
CREATE INDEX idx_announcements_published_date ON announcements(published_date);
CREATE INDEX idx_event_registrations_event_id ON event_registrations(event_id);
CREATE INDEX idx_event_registrations_member_id ON event_registrations(member_id);

-- Insert some sample data (optional)
-- You can uncomment these lines if you want to start with sample data

-- Sample Members
-- INSERT INTO members (first_name, last_name, email, phone, student_id, field_of_study) VALUES
-- ('Ahmed', 'Benali', 'ahmed.benali@example.com', '+213 555 123 456', 'ST123456', 'Informatique'),
-- ('Fatima', 'Kaddour', 'fatima.kaddour@example.com', '+213 555 234 567', 'ST234567', 'Mathématiques'),
-- ('Youcef', 'Messaoud', 'youcef.messaoud@example.com', '+213 555 345 678', 'ST345678', 'Physique');

-- Sample Events
-- INSERT INTO events (title, description, date, location, max_participants) VALUES
-- ('Journée Portes Ouvertes', 'Découvrez nos activités scientifiques', '2025-12-15 09:00:00', 'Amphithéâtre A', 100),
-- ('Workshop IA', 'Introduction à l''Intelligence Artificielle', '2025-12-20 14:00:00', 'Salle de Conférence', 50);

-- Sample Announcements
-- INSERT INTO announcements (title, content, is_pinned) VALUES
-- ('Bienvenue au Club East Eagles!', 'Nous sommes heureux de vous accueillir dans notre nouveau système de gestion.', true),
-- ('Réunion Mensuelle', 'La prochaine réunion aura lieu le 10 décembre à 18h00.', false);

COMMIT;
