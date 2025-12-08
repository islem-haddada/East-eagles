-- Migration to add document tagging system
-- This migration adds support for document categories and tags

-- Create document_categories table
CREATE TABLE document_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7), -- HEX color code for UI
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create document_tags table
CREATE TABLE document_tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    color VARCHAR(7), -- HEX color code for UI
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create junction table for document-tag relationships
CREATE TABLE document_tag_relations (
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES document_tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (document_id, tag_id)
);

-- Add category_id to documents table
ALTER TABLE documents 
ADD COLUMN category_id INTEGER REFERENCES document_categories(id) ON DELETE SET NULL;

-- Add indexes for better performance
CREATE INDEX idx_document_categories_name ON document_categories(name);
CREATE INDEX idx_document_tags_name ON document_tags(name);
CREATE INDEX idx_document_tag_relations_document_id ON document_tag_relations(document_id);
CREATE INDEX idx_document_tag_relations_tag_id ON document_tag_relations(tag_id);
CREATE INDEX idx_documents_category_id ON documents(category_id);

-- Insert default categories
INSERT INTO document_categories (name, description, color) VALUES
('Médical', 'Documents médicaux et certificats', '#FF6B6B'),
('Administratif', 'Documents administratifs et légaux', '#4ECDC4'),
('Personnel', 'Documents personnels et photos', '#45B7D1'),
('Financier', 'Documents liés aux paiements', '#96CEB4'),
('Formation', 'Documents de formation et certificats', '#FFEAA7'),
('Autre', 'Autres documents', '#DDA0DD');

-- Insert default tags
INSERT INTO document_tags (name, color) VALUES
('Urgent', '#FF0000'),
('À archiver', '#FFA500'),
('Confidentiel', '#800080'),
('À vérifier', '#FFD700'),
('Complet', '#008000'),
('Incomplet', '#FF0000');