/**
 * Delete articles from InsideEVs without images
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

async function deleteArticlesWithoutImages() {
  console.log('🗑️  Deleting InsideEVs articles without images\n');

  // Get source ID for InsideEVs
  const { data: source } = await supabase
    .from('sources')
    .select('id')
    .eq('name', 'insideevs.com')
    .single();

  if (!source) {
    console.log('⚠️  InsideEVs source not found');
    return;
  }

  // Delete articles without images from InsideEVs
  const { data: deleted, error } = await supabase
    .from('articles')
    .delete()
    .eq('source_id', source.id)
    .is('image_url', null)
    .select('id, title');

  if (error) {
    console.error('❌ Error deleting articles:', error);
    return;
  }

  console.log(`✅ Deleted ${deleted?.length || 0} articles without images\n`);

  if (deleted && deleted.length > 0) {
    deleted.forEach((article, i) => {
      console.log(`${i + 1}. ${article.title.substring(0, 60)}...`);
    });
  }
}

deleteArticlesWithoutImages().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
