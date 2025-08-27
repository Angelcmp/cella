-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Set up database for DocAI
\c docai;

-- Ensure pgvector extension is available in the docai database
CREATE EXTENSION IF NOT EXISTS vector;