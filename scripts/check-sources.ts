/**
 * Check configured sources
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

async function checkSources() {
  console.log('📡 Checking configured sources\n');

  const { data: sources, error } = await supabase
    .from('sources')
    .select('*')
    .eq('active', true)
    .order('name');

  if (error) {
    console.error('❌ Error fetching sources:', error);
    return;
  }

  if (!sources || sources.length === 0) {
    console.log('⚠️  No active sources found');
    return;
  }

  sources.forEach((source) => {
    console.log(`${source.active ? '✅' : '❌'} ${source.name}`);
    console.log(`   URL: ${source.feed_url}`);
    console.log(`   Type: ${source.feed_type}`);
    console.log(`   Lang: ${source.lang}\n`);
  });
}

checkSources().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
