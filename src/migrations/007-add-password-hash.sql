-- Migration: Add password_hash field to users table
-- This migration adds secure password hashing for admin authentication

ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);

-- Create index for faster authentication queries
CREATE INDEX idx_users_username_status ON users(username, status);

-- Create index for password authentication
CREATE INDEX idx_users_password_hash ON users(password_hash) WHERE password_hash IS NOT NULL; 