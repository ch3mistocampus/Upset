# Manual Test Checklist

Pre-release testing checklist for UFC Picks Tracker.

## Critical User Journeys

### Authentication Flow
- [ ] **Fresh Install**
  - [ ] App launches to welcome screen
  - [ ] "Continue as Guest" works and navigates to home
  - [ ] "Sign Up" navigates to sign-up screen
  - [ ] "Sign In" navigates to sign-in screen

- [ ] **Sign Up (Email/Password)**
  - [ ] Valid email/password creates account
  - [ ] Weak password shows error
  - [ ] Duplicate email shows error
  - [ ] Successfully navigates to create-username screen
  - [ ] Username creation works with valid username
  - [ ] Invalid username (special chars, too short/long) shows error
  - [ ] Duplicate username shows error

- [ ] **Sign In (Email/Password)**
  - [ ] Valid credentials signs in
  - [ ] Invalid credentials shows error
  - [ ] Username login works (not just email)
  - [ ] "Forgot Password" sends reset email

- [ ] **Sign In (OTP)**
  - [ ] Sends code to valid email
  - [ ] Valid 6-digit code authenticates
  - [ ] Invalid code shows error
  - [ ] Expired code shows error

- [ ] **OAuth (Apple)**
  - [ ] Apple Sign-In button appears on iOS
  - [ ] Tapping opens native Apple auth
  - [ ] Successful auth creates account
  - [ ] Cancellation handles gracefully (no error shown)
  - [ ] Double-tap protection works

- [ ] **OAuth (Google)**
  - [ ] Google Sign-In button appears
  - [ ] Tapping opens native Google auth
  - [ ] Successful auth creates account
  - [ ] Cancellation handles gracefully
  - [ ] Double-tap protection works

- [ ] **Guest Mode**
  - [ ] Can browse events and fighters
  - [ ] Making picks prompts for account
  - [ ] Can view leaderboard
  - [ ] Cannot post to feed
  - [ ] Migration of picks on sign-up works

- [ ] **Sign Out**
  - [ ] Sign out clears session
  - [ ] Navigates back to auth screen
  - [ ] Cannot access protected screens after sign out

### Picks Flow
- [ ] **Event List**
  - [ ] Shows upcoming events
  - [ ] Shows past events (grayed out)
  - [ ] Pull-to-refresh works
  - [ ] Skeleton loading shows while fetching

- [ ] **Event Detail**
  - [ ] Shows all bouts for event
  - [ ] Fighter names display correctly
  - [ ] Weight class shows for each bout
  - [ ] Lock explainer shows on first visit

- [ ] **Making Picks**
  - [ ] Tapping fighter name selects them
  - [ ] Selection animation plays
  - [ ] Method picker modal opens
  - [ ] Can select KO/TKO, Submission, Decision
  - [ ] Can optionally select round
  - [ ] Toast confirms pick
  - [ ] Tapping selected fighter unselects

- [ ] **Pick Locking**
  - [ ] Cannot make picks after event starts
  - [ ] "Picks Locked" banner shows
  - [ ] Grace period timer shows before lock
  - [ ] Community percentages show after picking

- [ ] **Pick Submission**
  - [ ] "Submit Card" button appears with picks
  - [ ] Confirmation modal shows pick count
  - [ ] Submitted state shows with edit option
  - [ ] Can edit picks after submission (before lock)
  - [ ] Cannot submit in guest mode (prompts sign-up)

- [ ] **Results**
  - [ ] Results appear after fight ends
  - [ ] Correct/Missed badges show
  - [ ] Winner name and method display
  - [ ] Canceled fights show "Voided"

### Social Features
- [ ] **Feed**
  - [ ] Shows posts from followed users
  - [ ] Pull-to-refresh works
  - [ ] Infinite scroll pagination works
  - [ ] Empty state shows when no posts

- [ ] **Create Post**
  - [ ] Can write text post
  - [ ] Character limit enforced
  - [ ] Can add up to 4 images
  - [ ] Image upload progress shows
  - [ ] Discard confirmation on back
  - [ ] Toast confirms post creation

- [ ] **Post Interactions**
  - [ ] Like/unlike works with animation
  - [ ] Comment button navigates to detail
  - [ ] Can add comments
  - [ ] Can delete own comments
  - [ ] Can report posts
  - [ ] Can delete own posts

- [ ] **Follow/Unfollow**
  - [ ] Can follow from profile page
  - [ ] Can unfollow from following list
  - [ ] Follow count updates
  - [ ] Feed updates with new follows

- [ ] **Block/Mute**
  - [ ] Can block user from profile
  - [ ] Blocked user posts hidden
  - [ ] Can unblock from settings
  - [ ] Can mute user
  - [ ] Muted user posts hidden

### Fighter Information
- [ ] **Fighter Profile**
  - [ ] Stats load correctly (wins/losses/draws)
  - [ ] Career record displays
  - [ ] Stance, height, reach show
  - [ ] Image loads or placeholder shows
  - [ ] Fighter with null data shows N/A

- [ ] **Fighter Comparison**
  - [ ] Compare button opens modal
  - [ ] Tale of the tape displays
  - [ ] Stats comparison accurate
  - [ ] Close button works

- [ ] **Fighter Search**
  - [ ] Search by name works
  - [ ] Results paginate
  - [ ] No results shows empty state
  - [ ] Special characters handled safely

### Leaderboard
- [ ] **Global Leaderboard**
  - [ ] Shows top users by score
  - [ ] Current user highlighted
  - [ ] Pull-to-refresh works

- [ ] **Event Leaderboard**
  - [ ] Shows scores for specific event
  - [ ] Correct ranking order

- [ ] **Friends Leaderboard**
  - [ ] Only shows followed users
  - [ ] Empty state when no friends

### Notifications
- [ ] **Push Notifications**
  - [ ] Permission prompt appears
  - [ ] Token registered on grant
  - [ ] Can toggle notification types
  - [ ] Preferences persist

- [ ] **Notification History**
  - [ ] Shows past notifications
  - [ ] Mark as read works
  - [ ] Deep links navigate correctly

### Settings & Profile
- [ ] **Edit Profile**
  - [ ] Can change username
  - [ ] Can update bio
  - [ ] Can upload avatar
  - [ ] Can upload banner

- [ ] **Account Settings**
  - [ ] Password change works
  - [ ] Account deletion works (requires confirmation)
  - [ ] Privacy settings persist

- [ ] **Theme**
  - [ ] Light/Dark/System toggle works
  - [ ] Theme persists across sessions

## Edge Cases

### Network Conditions
- [ ] App launches offline (shows cached data)
- [ ] Making picks offline shows clear error
- [ ] Network recovery resumes operations
- [ ] Timeout errors show user-friendly message

### Race Conditions
- [ ] Rapid tapping sign-in buttons handled
- [ ] Multiple pick submissions debounced
- [ ] Parallel like taps handled

### Data Edge Cases
- [ ] Fighter with no image shows placeholder
- [ ] Fighter with null stats shows N/A
- [ ] Event with 0 bouts shows empty state
- [ ] Very long usernames truncate properly
- [ ] Emoji in bio/posts display correctly
- [ ] Special characters in search safe

### Error Recovery
- [ ] Error boundary catches crashes
- [ ] "Restart App" button works
- [ ] "Report Bug" opens email/GitHub
- [ ] Can recover from white screen

## Platform-Specific Tests

### iOS
- [ ] Apple Sign-In completes
- [ ] Push notification prompt appears
- [ ] Deep links from Safari work
- [ ] Haptic feedback on interactions
- [ ] Safe area insets correct (notch/Dynamic Island)
- [ ] Keyboard avoidance works

### Device Sizes
- [ ] iPhone SE (small screen)
- [ ] iPhone 15 Pro (standard)
- [ ] iPhone 15 Pro Max (large screen)
- [ ] iPad (if supported)

## Performance Checks
- [ ] App cold start under 3 seconds
- [ ] Scrolling is smooth (60fps)
- [ ] Images don't cause memory issues
- [ ] No visible jank on navigation

## Pre-Submission Checklist
- [ ] No console errors in production build
- [ ] All placeholder text removed
- [ ] Privacy policy URL accessible
- [ ] Terms of service URL accessible
- [ ] Support email reachable
- [ ] App Store screenshots match app
- [ ] Build number incremented
