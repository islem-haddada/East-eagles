-- Migration to add document sharing functionality
-- This migration adds support for sharing documents between coaches

-- Create document_shares table
CREATE TABLE document_shares (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    shared_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shared_with INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission_level VARCHAR(20) NOT NULL DEFAULT 'view', -- 'view', 'edit', 'manage'
    notes TEXT,
    shared_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    UNIQUE(document_id, shared_with)
);

-- Add indexes for better performance
CREATE INDEX idx_document_shares_document_id ON document_shares(document_id);
CREATE INDEX idx_document_shares_shared_by ON document_shares(shared_by);
CREATE INDEX idx_document_shares_shared_with ON document_shares(shared_with);
CREATE INDEX idx_document_shares_permission_level ON document_shares(permission_level);