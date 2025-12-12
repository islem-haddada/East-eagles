-- Migration: 003b_create_documents_tables.sql
-- Description: Create complete documents schema with all tables

-- ============================================================================
-- Create documents table from scratch
-- ============================================================================

CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  athlete_id INTEGER NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500),
  file_url TEXT,
  file_size INTEGER,
  file_size_bytes BIGINT,
  mime_type VARCHAR(100),
  category_id INTEGER REFERENCES document_categories(id) ON DELETE SET NULL,
  validation_status VARCHAR(20) DEFAULT 'pending',
  validated_by INTEGER REFERENCES users(id),
  validated_at TIMESTAMP,
  rejection_reason TEXT,
  expiry_date DATE,
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_verified BOOLEAN DEFAULT false,
  legacy_verified_by INTEGER REFERENCES users(id),
  legacy_verified_at TIMESTAMP
);

CREATE INDEX idx_documents_athlete_id ON documents(athlete_id);
CREATE INDEX idx_documents_type ON documents(document_type);
CREATE INDEX idx_documents_validation_status ON documents(validation_status);
CREATE INDEX idx_documents_expiry_date ON documents(expiry_date);
CREATE INDEX idx_documents_category ON documents(category_id);
CREATE INDEX idx_documents_created_by ON documents(created_by);

-- ============================================================================
-- Create document_tag_relations table
-- ============================================================================

CREATE TABLE IF NOT EXISTS document_tag_relations (
  document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES document_tags(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (document_id, tag_id)
);

CREATE INDEX idx_document_tag_relations_document ON document_tag_relations(document_id);
CREATE INDEX idx_document_tag_relations_tag ON document_tag_relations(tag_id);

-- ============================================================================
-- Create document_versions table
-- ============================================================================

CREATE TABLE IF NOT EXISTS document_versions (
  id SERIAL PRIMARY KEY,
  document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500),
  file_url TEXT,
  file_size_bytes BIGINT,
  mime_type VARCHAR(100),
  notes TEXT,
  uploaded_by INTEGER REFERENCES users(id),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (document_id, version_number)
);

CREATE INDEX idx_document_versions_document ON document_versions(document_id);

-- ============================================================================
-- Create document_shares table
-- ============================================================================

CREATE TABLE IF NOT EXISTS document_shares (
  id SERIAL PRIMARY KEY,
  document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  shared_by INTEGER NOT NULL REFERENCES users(id),
  shared_with INTEGER NOT NULL REFERENCES users(id),
  permission_level VARCHAR(20) DEFAULT 'view',
  notes TEXT,
  shared_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  UNIQUE (document_id, shared_with)
);

CREATE INDEX idx_document_shares_document ON document_shares(document_id);
CREATE INDEX idx_document_shares_shared_with ON document_shares(shared_with);

-- ============================================================================
-- Create trigger for updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_categories_updated_at BEFORE UPDATE ON document_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
