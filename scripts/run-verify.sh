#!/usr/bin/env bash

# Load environment variables from .env.local
if [ -f .env.local ]; then
  export $(cat .env.local | grep -v '^#' | xargs)
fi

# Run verification script
npx tsx scripts/verify-system.ts
