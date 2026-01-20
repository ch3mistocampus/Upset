/**
 * Seed Forum Posts Script
 *
 * Creates mock posts, comments, and likes for testing the forum feature.
 * - System post for main event fight discussion
 * - Multiple comments with nested replies
 * - Likes on posts and comments
 *
 * Run with:
 * SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=xxx deno run --allow-net --allow-env scripts/seed-forum-posts.ts
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TEST_USERNAMES = [
  'alicechen',
  'bsantos',
  'charliej',
  'dkim23',
  'emmarod',
  'bigfrank',
  'gracet',
  'henryjack',
];

interface Profile {
  id: string;
  user_id: string;
  username: string;
}

async function main() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing environment variables:');
    console.error('   export SUPABASE_URL="https://your-project.supabase.co"');
    console.error('   export SUPABASE_SERVICE_ROLE_KEY="your-service-key"');
    Deno.exit(1);
  }

  console.log('Seeding forum posts and comments...\n');
  console.log('='.repeat(60));

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Step 1: Get test user profiles
  console.log('\nFinding test users...');
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('user_id, username')
    .in('username', TEST_USERNAMES);

  if (profilesError || !profiles || profiles.length === 0) {
    console.error('Test users not found. Run seed-test-users.ts first.');
    console.error('Error:', profilesError?.message);
    Deno.exit(1);
  }

  // Map profiles by username for easy lookup
  const usersByUsername = new Map<string, Profile>();
  for (const p of profiles) {
    usersByUsername.set(p.username, { id: p.user_id, user_id: p.user_id, username: p.username });
  }

  console.log(`   Found ${profiles.length} test users`);

  // Step 2: Find an upcoming event with a main event bout
  console.log('\nFinding an upcoming event with a main event...');
  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('id, name, event_date')
    .in('status', ['upcoming', 'live'])
    .order('event_date', { ascending: true })
    .limit(1);

  if (eventsError || !events || events.length === 0) {
    console.error('No upcoming events found.');
    Deno.exit(1);
  }

  const event = events[0];
  console.log(`   Event: ${event.name}`);

  // Get first bout (main event is usually order_index 0)
  const { data: bouts, error: boutsError } = await supabase
    .from('bouts')
    .select('id, red_name, blue_name, order_index')
    .eq('event_id', event.id)
    .order('order_index', { ascending: true })
    .limit(1);

  if (boutsError || !bouts || bouts.length === 0) {
    console.error('No bouts found for this event.');
    console.error('Error:', boutsError?.message);
    Deno.exit(1);
  }

  const bout = bouts[0];
  const fighterA = bout.red_name || 'Fighter A';
  const fighterB = bout.blue_name || 'Fighter B';
  console.log(`   Main event: ${fighterA} vs ${fighterB}`);

  // Step 3: Create system post for the fight
  console.log('\nCreating system post for fight discussion...');

  // Check if post already exists for this bout
  const { data: existingPost } = await supabase
    .from('posts')
    .select('id')
    .eq('bout_id', bout.id)
    .eq('post_type', 'system')
    .maybeSingle();

  let postId: string;

  if (existingPost) {
    postId = existingPost.id;
    console.log('   System post already exists, using existing post');
  } else {
    const { data: newPost, error: postError } = await supabase
      .from('posts')
      .insert({
        user_id: null, // System post
        post_type: 'system',
        event_id: event.id,
        bout_id: bout.id,
        title: `${fighterA} vs ${fighterB}`,
        body: `Who takes it? Share your predictions and analysis for this ${event.name} main event!`,
        is_public: true,
      })
      .select('id')
      .single();

    if (postError || !newPost) {
      console.error('Failed to create system post:', postError?.message);
      Deno.exit(1);
    }

    postId = newPost.id;
    console.log(`   Created system post: ${postId}`);
  }

  // Step 4: Create comments and replies
  console.log('\nCreating comments and replies...');

  // Delete existing comments for this post (to avoid duplicates on re-run)
  await supabase.from('post_comments').delete().eq('post_id', postId);
  await supabase.from('post_likes').delete().eq('post_id', postId);

  // Mock conversation
  const comments = [
    {
      username: 'alicechen',
      body: `I'm going with ${fighterA} here. The reach advantage is going to be huge in this matchup. I think we see a dominant performance on the feet.`,
    },
    {
      username: 'bsantos',
      body: `Disagree! ${fighterB} has been on a tear lately. That wrestling is going to be the X-factor. Expecting a decision win.`,
    },
    {
      username: 'charliej',
      body: `This is the fight I've been waiting for all year. Going to be a war! I think ${fighterA} by TKO in the 3rd.`,
    },
    {
      username: 'dkim23',
      body: `Both fighters are coming off great performances. Hard to pick, but I'm leaning ${fighterB} by submission.`,
    },
    {
      username: 'emmarod',
      body: `The cardio advantage goes to ${fighterA} if this goes to the championship rounds. That's where the fight is won or lost.`,
    },
    {
      username: 'bigfrank',
      body: `I got ${fighterB} all day. The power difference is real. This one doesn't go the distance.`,
    },
  ];

  const commentIds: Map<string, string> = new Map();

  for (const comment of comments) {
    const profile = usersByUsername.get(comment.username);
    if (!profile) continue;

    const { data: newComment, error: commentError } = await supabase
      .from('post_comments')
      .insert({
        post_id: postId,
        user_id: profile.id,
        body: comment.body,
        depth: 0,
      })
      .select('id')
      .single();

    if (commentError) {
      console.error(`   Failed to create comment from ${comment.username}:`, commentError.message);
      continue;
    }

    commentIds.set(comment.username, newComment.id);
    console.log(`   Comment from @${comment.username}`);
  }

  // Create replies to some comments
  const replies = [
    {
      parentUsername: 'alicechen',
      username: 'bsantos',
      body: `The reach advantage doesn't mean much when ${fighterB} can close the distance with wrestling. We've seen this before.`,
    },
    {
      parentUsername: 'bsantos',
      username: 'alicechen',
      body: `Fair point, but ${fighterA}'s takedown defense has been insane lately. 90%+ in the last 3 fights!`,
    },
    {
      parentUsername: 'charliej',
      username: 'dkim23',
      body: `TKO in the 3rd is a bold call! I like the confidence. What makes you think it won't go to decision?`,
    },
    {
      parentUsername: 'charliej',
      username: 'emmarod',
      body: `I could see that happening. ${fighterA} tends to break opponents down over time.`,
    },
    {
      parentUsername: 'bigfrank',
      username: 'gracet',
      body: `The power difference is real, but so is the chin on ${fighterA}. I don't think we've seen them hurt badly.`,
    },
    {
      parentUsername: 'alicechen',
      username: 'henryjack',
      body: `Great analysis! I'm leaning the same way. ${fighterA}'s jab is going to be the key to victory.`,
    },
  ];

  for (const reply of replies) {
    const profile = usersByUsername.get(reply.username);
    const parentId = commentIds.get(reply.parentUsername);

    if (!profile || !parentId) continue;

    const { error: replyError } = await supabase
      .from('post_comments')
      .insert({
        post_id: postId,
        user_id: profile.id,
        parent_id: parentId,
        body: reply.body,
        depth: 1,
      });

    if (replyError) {
      console.error(`   Failed to create reply from ${reply.username}:`, replyError.message);
      continue;
    }

    console.log(`   Reply from @${reply.username} to @${reply.parentUsername}`);
  }

  // Step 5: Create likes on the post
  console.log('\nCreating likes on post...');

  const likingUsers = ['alicechen', 'bsantos', 'charliej', 'dkim23', 'emmarod'];
  for (const username of likingUsers) {
    const profile = usersByUsername.get(username);
    if (!profile) continue;

    await supabase.from('post_likes').insert({
      post_id: postId,
      user_id: profile.id,
    });
  }
  console.log(`   Added ${likingUsers.length} likes to post`);

  // Step 6: Create likes on comments
  console.log('\nCreating likes on comments...');

  const commentLikes = [
    { username: 'bsantos', likeComment: 'alicechen' },
    { username: 'charliej', likeComment: 'alicechen' },
    { username: 'alicechen', likeComment: 'bsantos' },
    { username: 'emmarod', likeComment: 'charliej' },
    { username: 'bigfrank', likeComment: 'dkim23' },
    { username: 'dkim23', likeComment: 'bigfrank' },
  ];

  let commentLikesCreated = 0;
  for (const like of commentLikes) {
    const profile = usersByUsername.get(like.username);
    const commentId = commentIds.get(like.likeComment);

    if (!profile || !commentId) continue;

    const { error: likeError } = await supabase.from('comment_likes').insert({
      comment_id: commentId,
      user_id: profile.id,
    });

    if (!likeError) commentLikesCreated++;
  }
  console.log(`   Added ${commentLikesCreated} likes to comments`);

  // Step 7: Create a user-generated post
  console.log('\nCreating user-generated post...');

  const userPostProfile = usersByUsername.get('alicechen');
  if (userPostProfile) {
    // Check if this user already has a post
    const { data: existingUserPost } = await supabase
      .from('posts')
      .select('id')
      .eq('user_id', userPostProfile.id)
      .eq('post_type', 'user')
      .maybeSingle();

    if (!existingUserPost) {
      const { data: userPost, error: userPostError } = await supabase
        .from('posts')
        .insert({
          user_id: userPostProfile.id,
          post_type: 'user',
          title: 'My bold prediction for this weekend',
          body: `I've been studying the tape for hours and I'm convinced we're going to see some upsets this card. ${fighterB} is going to shock the world! What do you all think? Anyone else see value in the underdog?`,
          is_public: true,
        })
        .select('id')
        .single();

      if (!userPostError && userPost) {
        console.log(`   Created user post from @alicechen`);

        // Add some comments to the user post
        const userPostComments = [
          { username: 'bsantos', body: "Bold take! I've got the opposite read but I respect the conviction." },
          { username: 'charliej', body: 'The tape never lies! What specifically stood out to you?' },
        ];

        for (const c of userPostComments) {
          const profile = usersByUsername.get(c.username);
          if (!profile) continue;

          await supabase.from('post_comments').insert({
            post_id: userPost.id,
            user_id: profile.id,
            body: c.body,
            depth: 0,
          });
        }

        // Add likes
        for (const username of ['bsantos', 'charliej', 'dkim23']) {
          const profile = usersByUsername.get(username);
          if (!profile) continue;

          await supabase.from('post_likes').insert({
            post_id: userPost.id,
            user_id: profile.id,
          });
        }
      }
    } else {
      console.log('   User post already exists');
    }
  }

  // Verify final state
  console.log('\nVerifying forum data...');

  const { count: postCount } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true });

  const { count: commentCount } = await supabase
    .from('post_comments')
    .select('*', { count: 'exact', head: true });

  const { count: postLikeCount } = await supabase
    .from('post_likes')
    .select('*', { count: 'exact', head: true });

  console.log(`   Total posts: ${postCount}`);
  console.log(`   Total comments: ${commentCount}`);
  console.log(`   Total post likes: ${postLikeCount}`);

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('FORUM POSTS SEEDED!');
  console.log('='.repeat(60));
  console.log('\nThe forum now has:');
  console.log(`  - System post for ${fighterA} vs ${fighterB}`);
  console.log('  - User post from @alicechen');
  console.log('  - Threaded comments with replies');
  console.log('  - Likes on posts and comments');
  console.log('\nUsers can now view and interact with posts in the Posts tab!');
}

if (import.meta.main) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    Deno.exit(1);
  });
}
