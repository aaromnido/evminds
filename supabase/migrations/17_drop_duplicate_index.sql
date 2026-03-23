-- Drop duplicate index on article_url (the UNIQUE constraint already creates one)
DROP INDEX IF EXISTS idx_articles_url;
