# EVMinds Scraper — Edge Function

Modular scraper that fetches articles from RSS feeds, translates English content to Spanish, categorizes articles, and caches images to Supabase Storage.

## Architecture

```
scrape/
├── index.ts                 # Main handler (orchestrator)
├── types.ts                 # TypeScript interfaces
├── parsers/
│   ├── rss-parser.ts       # Generic RSS parser
│   └── motor-filter.ts     # EV content filter for motor.es
└── services/
    ├── translator.ts       # OpenAI GPT-4o mini translation
    ├── categorizer.ts      # Keyword-based categorization
    └── image-cache.ts      # Image storage service
```

## Flow

1. **Authentication** — Validates `SCRAPE_SECRET` token
2. **Fetch Sources** — Retrieves active sources from `sources` table
3. **Parse Feeds** — Uses RSS parser for each source
4. **Filter** — Applies EV filter to motor.es articles
5. **Translate** — Converts English articles to Spanish (GPT-4o mini)
6. **Categorize** — Assigns category based on keywords
7. **Cache Images** — Downloads OG images to Supabase Storage
8. **Insert** — Stores articles in database (skips duplicates)

## Environment Variables Required

```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
SCRAPE_SECRET=your_random_secret_token_here
OPENAI_API_KEY=sk-xxx...
```

## Local Testing

```bash
# Start Supabase functions locally
supabase functions serve scrape

# Invoke the function
curl -X POST http://localhost:54321/functions/v1/scrape \
  -H "Authorization: Bearer your-scrape-secret" \
  -H "Content-Type: application/json"

# Check database
psql $DATABASE_URL -c "SELECT COUNT(*) FROM articles;"
psql $DATABASE_URL -c "SELECT title, category, source_id FROM articles LIMIT 5;"
```

## Deployment

```bash
# Deploy to Supabase Edge Functions
supabase functions deploy scrape

# Set environment variables in Supabase dashboard
# Project Settings > Edge Functions > scrape > Environment Variables

# Test production endpoint
curl -X POST https://your-project-ref.supabase.co/functions/v1/scrape \
  -H "Authorization: Bearer your-scrape-secret"
```

## Cron Schedule

Configured in Supabase SQL Editor with `pg_cron`:

- **07:00 UTC** — Morning scrape
- **11:00 UTC** — Midday scrape
- **15:00 UTC** — Afternoon scrape
- **17:00 UTC** — Evening scrape

## Response Format

```json
{
  "success": true,
  "results": [
    { "source": "electrek.co", "count": 12 },
    { "source": "cnevpost.com", "count": 8 }
  ],
  "timestamp": "2025-03-15T10:30:00.000Z"
}
```

## Error Handling

- **Duplicate articles** — Skipped (unique constraint on `article_url`)
- **Translation failures** — Falls back to original text
- **Image cache failures** — Uses original remote URL
- **RSS parsing errors** — Logged, returns empty array
- **Per-source errors** — Logged, continues with next source

## Current Sources (Active)

- **electrek.co** — EN → ES translation enabled
- **cnevpost.com** — EN → ES translation enabled

## Future Enhancements

- HTML parser for hibridosyelectricos.com
- Retry logic for failed translations
- Rate limiting for OpenAI API
- Metrics and monitoring
