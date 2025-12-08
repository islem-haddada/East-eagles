-- Migration to add document versioning system
-- This migration adds support for document versions and revision history

-- Create document_versions table
CREATE TABLE document_versions (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500),
    file_url VARCHAR(500) NOT NULL,
    file_size_bytes BIGINT,
    mime_type VARCHAR(100),
    notes TEXT,
    uploaded_by INTEGER REFERENCES users(id),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(document_id, version_number)
);

-- Add indexes for better performance
CREATE INDEX idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX idx_document_versions_version_number ON document_versions(version_number);
CREATE INDEX idx_document_versions_uploaded_at ON document_versions(uploaded_at);

-- Add a trigger to automatically set version numbers
-- This will be handled in the application logic for simplicity