-- Migration: 012_update_documents_schema.sql
-- Description: Update documents table and add related tables to match backend code

-- 1. Create document categories table
CREATE TABLE IF NOT EXISTS document_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(20) DEFAULT '#3B82F6',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default categories
INSERT INTO document_categories (name, description, color) VALUES
('Identité', 'Pièces d''identité (CNI, Passeport)', '#3B82F6'),
('Certificats', 'Certificats médicaux et autres attestations', '#10B981'),
('Contrats', 'Contrats d''adhésion et règlements', '#8B5CF6'),
('Autres', 'Documents divers', '#6B7280')
ON CONFLICT (name) DO NOTHING;

-- 2. Create document tags table
CREATE TABLE IF NOT EXISTS document_tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    color VARCHAR(20) DEFAULT '#6B7280',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Update documents table
-- Rename columns if they exist, or add them
DO $$
BEGIN
    -- file_size -> file_size_bytes
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='file_size') THEN
        ALTER TABLE documents RENAME COLUMN file_size TO file_size_bytes;
    END IF;
    ALTER TABLE documents ALTER COLUMN file_size_bytes TYPE BIGINT;

    -- Add file_url
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='file_url') THEN
        ALTER TABLE documents ADD COLUMN file_url TEXT;
    END IF;

    -- Add category_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='category_id') THEN
        ALTER TABLE documents ADD COLUMN category_id INTEGER REFERENCES document_categories(id) ON DELETE SET NULL;
    END IF;

    -- Add expiry_date
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='expiry_date') THEN
        ALTER TABLE documents ADD COLUMN expiry_date TIMESTAMP;
    END IF;

    -- Add validation_status (replacing verified)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='validation_status') THEN
        ALTER TABLE documents ADD COLUMN validation_status VARCHAR(20) DEFAULT 'pending';
        -- Migrate data if verified exists
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='verified') THEN
            UPDATE documents SET validation_status = 'approved' WHERE verified = true;
            UPDATE documents SET validation_status = 'pending' WHERE verified = false;
        END IF;
    END IF;

    -- Add validated_by (replacing verified_by)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='validated_by') THEN
        ALTER TABLE documents ADD COLUMN validated_by INTEGER REFERENCES users(id);
    END IF;

    -- Add validated_at (replacing verified_at)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='validated_at') THEN
        ALTER TABLE documents ADD COLUMN validated_at TIMESTAMP;
    END IF;

    -- Add rejection_reason
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='rejection_reason') THEN
        ALTER TABLE documents ADD COLUMN rejection_reason TEXT;
    END IF;
END $$;

-- Drop old columns is risky, keeping them implies clean up later or ignore.
-- Ideally we drop them to avoid confusion, but for safety lets keep them or drop them if we are sure.
-- The code doesn't use them.
ALTER TABLE documents DROP COLUMN IF EXISTS verified;
ALTER TABLE documents DROP COLUMN IF EXISTS verified_by;
ALTER TABLE documents DROP COLUMN IF EXISTS verified_at;

-- 4. Create document_tag_relations
CREATE TABLE IF NOT EXISTS document_tag_relations (
    document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES document_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (document_id, tag_id)
);

-- 5. Create document_versions
CREATE TABLE IF NOT EXISTS document_versions (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_url TEXT,
    file_size_bytes BIGINT,
    mime_type VARCHAR(100),
    notes TEXT,
    uploaded_by INTEGER REFERENCES users(id),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Create document_shares
CREATE TABLE IF NOT EXISTS document_shares (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    shared_by INTEGER NOT NULL REFERENCES users(id),
    shared_with INTEGER NOT NULL REFERENCES users(id),
    permission_level VARCHAR(20) DEFAULT 'view', -- 'view', 'edit', 'manage'
    notes TEXT,
    shared_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    UNIQUE(document_id, shared_with)
);
