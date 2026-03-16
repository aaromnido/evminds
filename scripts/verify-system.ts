/**
 * System Verification Script
 *
 * Checks:
 * 1. Database connection
 * 2. Recent articles in database
 * 3. Edge Function availability
 * 4. Cron job configuration
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/lib/database.types';

// Load environment variables
const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const scrapeSecret = process.env.SCRAPE_SECRET!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

async function verifySystem() {
  console.log('🔍 EVMinds System Verification\n');
  console.log('━'.repeat(60));

  // 1. Check database connection
  console.log('\n1️⃣  Checking database connection...');
  try {
    const { data, error } = await supabase
      .from('articles')
      .select('id')
      .limit(1);

    if (error) {
      console.error('   ❌ Database connection failed:', error.message);
      return;
    }
    console.log('   ✅ Database connection successful');
  } catch (err) {
    console.error('   ❌ Database connection error:', err);
    return;
  }

  // 2. Check recent articles
  console.log('\n2️⃣  Checking recent articles...');
  try {
    const { data: articles, error } = await supabase
      .from('articles')
      .select('id, title, scraped_at, published_at, category')
      .order('scraped_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('   ❌ Failed to fetch articles:', error.message);
      return;
    }

    if (!articles || articles.length === 0) {
      console.log('   ⚠️  No articles found in database');
    } else {
      console.log(`   ✅ Found ${articles.length} recent articles:\n`);
      articles.forEach((article, i) => {
        const scrapedDate = new Date(article.scraped_at);
        const now = new Date();
        const hoursAgo = Math.floor((now.getTime() - scrapedDate.getTime()) / (1000 * 60 * 60));

        console.log(`   ${i + 1}. ${article.title.substring(0, 60)}...`);
        console.log(`      Scraped: ${scrapedDate.toISOString()} (${hoursAgo}h ago)`);
        console.log(`      Category: ${article.category}`);
        console.log('');
      });

      // Check if most recent article is older than 24h
      const mostRecent = new Date(articles[0].scraped_at);
      const hoursSinceLastScrape = Math.floor((Date.now() - mostRecent.getTime()) / (1000 * 60 * 60));

      if (hoursSinceLastScrape > 24) {
        console.log(`   ⚠️  Warning: Last article scraped ${hoursSinceLastScrape}h ago (>24h)`);
        console.log('   → Cronjob may not be working\n');
      } else {
        console.log(`   ✅ Articles are fresh (last scraped ${hoursSinceLastScrape}h ago)\n`);
      }
    }
  } catch (err) {
    console.error('   ❌ Error checking articles:', err);
  }

  // 3. Test Edge Function
  console.log('\n3️⃣  Testing Edge Function...');
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/scrape`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${scrapeSecret}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 401) {
      console.log('   ❌ Edge Function returned 401 Unauthorized');
      console.log('   → SCRAPE_SECRET is not configured correctly in Supabase');
      console.log('   → Go to: Supabase Dashboard → Edge Functions → scrape → Secrets');
      console.log(`   → Set SCRAPE_SECRET = ${scrapeSecret}`);
    } else if (response.status === 404) {
      console.log('   ❌ Edge Function not found (404)');
      console.log('   → Deploy the function: supabase functions deploy scrape');
    } else if (response.ok) {
      const result = await response.json();
      console.log('   ✅ Edge Function is working!');
      console.log('   Response:', JSON.stringify(result, null, 2));
    } else {
      console.log(`   ❌ Edge Function returned status ${response.status}`);
      const text = await response.text();
      console.log('   Response:', text);
    }
  } catch (err) {
    console.error('   ❌ Error testing Edge Function:', err);
  }

  // 4. Check cron jobs (requires admin privileges)
  console.log('\n4️⃣  Checking cron jobs configuration...');
  try {
    const { data: cronJobs, error } = await supabase.rpc('sql', {
      query: 'SELECT * FROM cron.job;'
    });

    if (error) {
      // Try alternative method
      console.log('   ⚠️  Cannot query cron jobs via RPC');
      console.log('   → Manual verification needed in Supabase SQL Editor:');
      console.log('   → Run: SELECT * FROM cron.job;');
    } else {
      console.log('   ✅ Cron jobs found:', cronJobs);
    }
  } catch (err) {
    console.log('   ⚠️  Cannot query cron jobs programmatically');
    console.log('   → Manual verification needed in Supabase SQL Editor:');
    console.log('   → Run: SELECT * FROM cron.job;');
  }

  console.log('\n━'.repeat(60));
  console.log('✅ Verification complete\n');
}

verifySystem().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
