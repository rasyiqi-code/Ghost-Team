-- Migration: Add rag_sources column to messages table
-- Stores referenced Knowledge Vault file names used as RAG context for AI responses

ALTER TABLE "messages" ADD COLUMN "rag_sources" JSONB DEFAULT '[]'::jsonb;
