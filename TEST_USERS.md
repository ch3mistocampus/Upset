# Test Users for Development

This document describes the test users available for development and testing.

## Test User Accounts

All test users share the same password for convenience: **Password123**

| Username | Email | Password | Description |
|----------|-------|----------|-------------|
| alice_ufc | alice@test.com | Password123 | Primary test user |
| bob_fighter | bob@test.com | Password123 | Secondary test user |
| charlie_picks | charlie@test.com | Password123 | Third test user |

---

## Creating Test Users

### Option 1: Automated Script (Recommended)

Use the provided Deno script to create all test users at once:

```bash
# From project root
deno run --allow-net --allow-env scripts/seed-test-users.ts
```

**Requirements:**
- Deno installed (`brew install deno` or see https://deno.land)
- Environment variables set:
  ```bash
  export SUPABASE_URL="https://your-project.supabase.co"
  export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
  ```

**Or pass credentials as arguments:**
```bash
deno run --allow-net scripts/seed-test-users.ts \
  "https://your-project.supabase.co" \
  "your-service-role-key"
```

The script will:
- ✅ Create auth users with confirmed emails
- ✅ Create profiles with usernames
- ⚠️ Skip users that already exist
- 📊 Show summary of results

---

### Option 2: Supabase Dashboard (Manual)

If you prefer to create users manually:

**For Each User:**

1. **Create Auth User**
   - Go to Supabase Dashboard → Authentication → Users
   - Click "Add user" → "Create new user"
   - Enter email (e.g., alice@test.com)
   - Enter password: Password123
   - Check "Auto Confirm User" (to skip email verification)
   - Click "Create user"
   - Copy the user ID (you'll need it for the profile)

2. **Create Profile**
   - Go to Table Editor → profiles table
   - Click "Insert" → "Insert row"
   - user_id: Paste the user ID from step 1
   - username: Enter username (e.g., alice_ufc)
   - created_at: Leave as default (now())
   - Click "Save"

**Repeat for all 3 users**

---

### Option 3: SQL Editor (Advanced)

You can also create users via SQL in the Supabase SQL Editor:

```sql
-- Note: This requires using the Supabase Admin API or dashboard
-- Regular SQL cannot create auth.users directly

-- After creating users via dashboard or script, verify with:
SELECT
  p.username,
  au.email,
  p.created_at
FROM profiles p
JOIN auth.users au ON au.id = p.user_id
ORDER BY p.created_at DESC;
```

---

## Signing In with Test Users

### Mobile App

1. Open the app
2. Click "Password" tab (default)
3. Enter username or email:
   - Option A: `alice_ufc` (username)
   - Option B: `alice@test.com` (email)
4. Enter password: `Password123`
5. Click "Sign In"

### Email OTP Alternative

If you want to test the OTP flow:
1. Click "Email Code" tab
2. Enter: `alice@test.com`
3. Click "Send Code"
4. Check Supabase Dashboard → Authentication → Logs for the OTP code
5. Enter the 6-digit code
6. Click "Verify"

---

## Testing Scenarios

### Scenario 1: Sign Up New User
```
1. Click "Sign up"
2. Enter: newtester@test.com / TestPass123
3. Confirm password: TestPass123
4. Click "Sign Up"
5. Create username: new_tester
6. Verify you're logged in
```

### Scenario 2: Sign In with Email
```
1. Enter: alice@test.com
2. Enter: Password123
3. Click "Sign In"
4. Verify you're logged in as alice_ufc
```

### Scenario 3: Sign In with Username
```
1. Enter: bob_fighter
2. Enter: Password123
3. Click "Sign In"
4. Verify you're logged in as bob_fighter
```

### Scenario 4: Password Reset
```
1. Click "Forgot password?"
2. Enter: alice@test.com
3. Click "Send Reset Link"
4. Check Supabase Auth logs for reset link
5. Click link (opens app)
6. Enter new password
7. Sign in with new password
```

### Scenario 5: Multiple Users for Social Testing
```
1. Sign in as alice_ufc
2. Make some picks
3. Sign out
4. Sign in as bob_fighter
5. Make some picks
6. Sign out
7. Sign in as charlie_picks
8. Make some picks

Later (Sprint 2):
- Add alice as friend
- View alice's picks
- Create a league
- Invite bob and charlie
```

---

## Verifying Test Users Exist

### Option 1: Supabase Dashboard
- Go to Authentication → Users
- Should see 3 users with confirmed emails
- Go to Table Editor → profiles
- Should see 3 profiles with usernames

### Option 2: SQL Query
```sql
SELECT
  p.username,
  au.email,
  au.email_confirmed_at IS NOT NULL as email_confirmed,
  p.created_at
FROM profiles p
JOIN auth.users au ON au.id = p.user_id
ORDER BY p.created_at DESC;
```

Expected output:
```
username       | email              | email_confirmed | created_at
---------------|--------------------|-----------------|-----------
charlie_picks  | charlie@test.com   | true           | ...
bob_fighter    | bob@test.com       | true           | ...
alice_ufc      | alice@test.com     | true           | ...
```

---

## Resetting Test Data

If you want to start fresh:

### Delete All Test Users
```sql
-- Delete profiles (cascades from auth.users)
DELETE FROM profiles WHERE username IN ('alice_ufc', 'bob_fighter', 'charlie_picks');
```

**Then in Supabase Dashboard:**
- Go to Authentication → Users
- Find and delete the test user accounts

**Or use the admin API:**
```typescript
const { error } = await supabase.auth.admin.deleteUser(userId);
```

---

## Security Notes

⚠️ **IMPORTANT FOR PRODUCTION:**

- These test users should **ONLY** exist in development/staging environments
- **NEVER** use these credentials in production
- Before launching:
  - Delete all test users
  - Use real email addresses
  - Enforce strong password requirements
  - Enable email confirmation (disable auto-confirm)

---

## Troubleshooting

### "User already exists"
- The user was already created
- Either delete and recreate, or just use the existing account

### "Username already taken"
- The profile already exists
- Check if you can sign in with the existing credentials

### "Cannot find RPC function get_email_by_username"
- The migration hasn't been applied yet
- Run: `supabase db push` or `supabase db reset` (local)

### Script fails with permission error
- Make sure you're using the SERVICE_ROLE_KEY, not the ANON_KEY
- The service role key has admin privileges to create users

### Email not confirmed
- Make sure "Auto Confirm User" is checked when creating manually
- Or use `email_confirm: true` in the script (already included)

---

## Next Steps

After creating test users:
1. ✅ Sign in with each user to verify they work
2. ✅ Test username login vs email login
3. ✅ Test password reset flow
4. ✅ Create some picks with each user
5. ✅ Run automated tests
6. ✅ Proceed to Sprint 2 (social features)

---

## Reference

- **Script:** `/scripts/seed-test-users.ts`
- **Migration:** `/supabase/migrations/20251230000005_add_get_email_by_username_function.sql`
- **Auth Hook:** `/mobile/hooks/useAuth.ts`
- **Sign-In Screen:** `/mobile/app/(auth)/sign-in.tsx`
