# Issues & Solutions

This directory contains documentation of problems encountered during development and their solutions.

## Index

### 001 - Cronjob JWT Authentication Error (2026-03-16)

**Problem**: Cronjobs were failing to execute the scraper Edge Function due to JWT validation errors.

**Files**:
- [001-cronjob-jwt-authentication-error.md](./001-cronjob-jwt-authentication-error.md) - Diagnostic steps
- [001-cronjob-jwt-authentication-solution.md](./001-cronjob-jwt-authentication-solution.md) - Complete solution

**Root Cause**: Supabase Gateway was validating the `Authorization` header as a JWT token before the request reached the Edge Function.

**Solution**: Created `supabase/config.toml` with `verify_jwt = false` to disable automatic JWT verification for the scraper function.

**Status**: ✅ Resolved

---

## How to use this directory

When you encounter a new issue:

1. Create diagnostic and solution files with the format: `XXX-issue-name-error.md` and `XXX-issue-name-solution.md`
2. Update this README with a new entry in the Index
3. Include: problem description, root cause, solution, and status

---

**Last updated**: 2026-03-16
