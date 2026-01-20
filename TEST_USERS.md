# Test Users for Development

This document describes the test users available for development and testing.

## Test User Accounts

All test users share the same password for convenience: **Password123**

### Original Users
| Username | Email | Password | Pick Style |
|----------|-------|----------|------------|
| alicechen | alice@test.com | Password123 | Tends toward favorites (~65%) |
| bsantos | bob@test.com | Password123 | Tends toward underdogs (~40%) |
| charliej | charlie@test.com | Password123 | Random/balanced (~50%) |

### Extended Test Users (10 Additional)
| Username | Email | Password | Pick Style | Description |
|----------|-------|----------|------------|-------------|
| dkim23 | david@test.com | Password123 | Heavy chalk (~80%) | Almost always picks favorites |
| emmarod | emma@test.com | Password123 | Slight favorite (~55%) | Technical analyst |
| bigfrank | frank@test.com | Password123 | Power picker (~60%) | Likes KO artists |
| gracet | grace@test.com | Password123 | Slight underdog (~45%) | Favors grapplers |
| henryjack | henry@test.com | Password123 | Power picker (~70%) | Picks bigger fighters |
| irismtz | iris@test.com | Password123 | Contrarian (~30%) | Heavy underdog picker |
| jmorrison | jack@test.com | Password123 | Balanced analyst (~55%) | Very analytical |
| kateo | kate@test.com | Password123 | Random striker (~50%) | Striker focused |
| leonak | leo@test.com | Password123 | Experience picker (~60%) | Picks veterans |
| miadavis | mia@test.com | Password123 | Momentum picker (~65%) | Picks hot fighters |

### Leaderboard Preview (by accuracy)
| Rank | Username | Accuracy | Correct/Total | Style |
|------|----------|----------|---------------|-------|
| 🥇 1 | dkim23 | 73.3% | 22/30 | Chalk |
| 🥈 2 | miadavis | 70.4% | 19/27 | Momentum |
| 🥉 3 | alicechen | 67.9% | 19/28 | Favorite |
| 4 | jmorrison | 66.7% | 20/30 | Analyst |
| 5 | emmarod | 65.4% | 17/26 | Technical |
| 6 | leonak | 64.3% | 18/28 | Experience |
| 7 | charliej | 60.7% | 17/28 | Random |
| 8 | gracet | 59.3% | 16/27 | Grappling |
| 9 | kateo | 57.7% | 15/26 | Striker |
| 10 | bigfrank | 56.0% | 14/25 | Finishes |
| 11 | henryjack | 54.2% | 13/24 | Power |
| 12 | bsantos | 53.6% | 15/28 | Underdog |
| 13 | irismtz | 44.8% | 13/29 | Contrarian |

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
   - username: Enter username (e.g., alicechen)
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
   - Option A: `alicechen` (username)
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
4. Verify you're logged in as alicechen
```

### Scenario 3: Sign In with Username
```
1. Enter: bsantos
2. Enter: Password123
3. Click "Sign In"
4. Verify you're logged in as bsantos
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
With 13 test users available, you can test rich social interactions:

1. Sign in as alicechen (favorites picker)
2. Check leaderboard - see dkim23 at top (73.3%)
3. View friend list - see connections to bob, charlie, emma, leo
4. Sign out

5. Sign in as irismtz (contrarian/underdog picker)
6. Check leaderboard - lowest accuracy (44.8%)
7. Make some underdog picks
8. Sign out

9. Sign in as miadavis (streak picker - 7 streak!)
10. View stats - highest current streak
11. Check friend connections

Social Features:
- View friends' picks and stats
- Compare accuracy across different picking styles
- See how chalk pickers vs underdog pickers perform
- Create a league and invite multiple users
```

---

## Verifying Test Users Exist

### Option 1: Supabase Dashboard
- Go to Authentication → Users
- Should see 13 users with confirmed emails
- Go to Table Editor → profiles
- Should see 13 profiles with usernames

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

Expected output (showing 13 test users):
```
username          | email              | email_confirmed | created_at
------------------|--------------------|-----------------|-----------
miadavis      | mia@test.com       | true           | ...
leonak        | leo@test.com       | true           | ...
kateo        | kate@test.com      | true           | ...
jmorrison        | jack@test.com      | true           | ...
irismtz      | iris@test.com      | true           | ...
henryjack | henry@test.com     | true           | ...
gracet   | grace@test.com     | true           | ...
bigfrank    | frank@test.com     | true           | ...
emmarod      | emma@test.com      | true           | ...
dkim23         | david@test.com     | true           | ...
charliej     | charlie@test.com   | true           | ...
bsantos       | bob@test.com       | true           | ...
alicechen         | alice@test.com     | true           | ...
```

---

## Resetting Test Data

If you want to start fresh:

### Delete All Test Users
```sql
-- Delete profiles (cascades from auth.users)
DELETE FROM profiles WHERE username IN (
  'alicechen', 'bsantos', 'charliej',
  'dkim23', 'emmarod', 'bigfrank',
  'gracet', 'henryjack', 'irismtz',
  'jmorrison', 'kateo', 'leonak', 'miadavis'
);
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
