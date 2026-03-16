/**
 * Check image URLs for featured articles
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/lib/database.types';

// Load environment variables
const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

async function checkImages() {
  console.log('🖼️  Checking image URLs for top 3 articles\n');

  const { data: articles, error } = await supabase
    .from('articles')
    .select('id, title, image_url, scraped_at')
    .order('scraped_at', { ascending: false })
    .limit(3);

  if (error) {
    console.error('❌ Error fetching articles:', error);
    return;
  }

  if (!articles || articles.length === 0) {
    console.log('⚠️  No articles found');
    return;
  }

  articles.forEach((article, i) => {
    console.log(`${i + 1}. ${article.title.substring(0, 60)}...`);
    console.log(`   Image URL: ${article.image_url || '(null)'}`);
    console.log(`   Scraped: ${article.scraped_at}\n`);
  });
}

checkImages().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
