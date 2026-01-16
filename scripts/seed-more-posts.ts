/**
 * Seed more posts for Discover and Following feeds
 * Creates posts from alice's friends and other users
 */

// Load from environment variables - NEVER commit secrets
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

// User IDs
const users = {
  alice_ufc: 'f64da1ed-138e-410b-8c2f-df0564ee2414',
  bob_fighter: '10421a84-a15e-4d53-b566-08519782f548',
  charlie_picks: 'd1ca48f8-3152-4d28-a781-9465b191e264',
  david_mma: '4489c91d-6170-4d0c-973b-e11da25ba93d',
  emma_octagon: 'e5e9a61d-d21f-4706-a9db-586428381db3',
  grace_grappling: '434f2965-e63d-40ae-825d-77d8b8fb0cbd',
  frank_knockout: 'a241a3c4-6653-400e-a0e9-56c0446cb295',
  henry_heavyweight: 'c06aeff7-84af-42e0-a885-0f33bd11751a',
  iris_insider: '8089b91b-91f8-417d-99fd-27d0e6cfb802',
  jack_judge: 'c85dbeb6-ddf3-4d76-8475-39ff11b80e3b',
};

// Posts to create - mix of alice's friends and other users
const postsToCreate = [
  // Posts from alice's friends (will show in Following feed)
  {
    user_id: users.charlie_picks,
    title: 'My UFC 310 Predictions Thread',
    body: 'Breaking down the entire card. Main event is going to be a war. Who else is watching live this weekend?',
  },
  {
    user_id: users.david_mma,
    title: 'Underrated fighters to watch in 2026',
    body: 'Been studying the regional scene and there are some absolute killers coming up. Here are my top 5 prospects that will make noise this year.',
  },
  {
    user_id: users.emma_octagon,
    title: 'Post-fight analysis: What went wrong?',
    body: 'Just rewatched the fight 3 times. The gameplan was there but the execution fell apart in round 2. Let me break down what I saw.',
  },
  {
    user_id: users.grace_grappling,
    title: 'Grappling breakdown: BJJ vs Wrestling',
    body: 'This matchup is a classic style clash. The wrestler needs to avoid the guard at all costs. Here is my technical analysis of how this fight plays out on the ground.',
  },
  {
    user_id: users.iris_insider,
    title: 'Training camp insider info',
    body: 'Just got back from watching sparring sessions. Without giving too much away... expect a different fighter than what we saw last time. The improvements are real.',
  },
  // Posts from other users (will show in Discover feed only for alice)
  {
    user_id: users.bob_fighter,
    title: 'Fight night watch party!',
    body: 'Hosting a watch party this Saturday. DM me if you want to join! Bringing the predictions and the snacks.',
  },
  {
    user_id: users.frank_knockout,
    title: 'Why knockouts are down in modern MMA',
    body: 'Everyone is talking about wrestling and grappling dominating, but I think the real reason is improved defense. Fighters are getting smarter.',
  },
  {
    user_id: users.henry_heavyweight,
    title: 'Heavyweight division is STACKED',
    body: 'We have never had this much talent at heavyweight. The top 5 could all be champion on any given night. This is the golden era.',
  },
  {
    user_id: users.jack_judge,
    title: 'Judging criteria needs reform',
    body: 'After another controversial decision, it is time to talk about scoring. Ground control without damage should not win rounds. Here is my proposal for better judging.',
  },
  // A post from alice herself
  {
    user_id: users.alice_ufc,
    title: 'My 2025 record: 78% accuracy!',
    body: 'Just calculated my prediction stats for last year. Really proud of this streak. Thanks everyone for the support! Let us keep it going in 2026.',
  },
];

async function insertPost(post: { user_id: string; title: string; body: string }) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/posts`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({
      user_id: post.user_id,
      post_type: 'user',
      title: post.title,
      body: post.body,
      is_public: true,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`Failed to create post: ${post.title}`, error);
    return null;
  }

  const data = await response.json();
  console.log(`Created post: ${post.title}`);
  return data[0];
}

async function addLikes(postId: string, userIds: string[]) {
  for (const userId of userIds) {
    await fetch(`${SUPABASE_URL}/rest/v1/post_likes`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        post_id: postId,
        user_id: userId,
      }),
    });
  }
}

async function main() {
  console.log('Seeding more posts...\n');

  const createdPosts: { id: string; title: string }[] = [];

  for (const post of postsToCreate) {
    const created = await insertPost(post);
    if (created) {
      createdPosts.push({ id: created.id, title: post.title });

      // Add some random likes to each post
      const likers = Object.values(users).filter(() => Math.random() > 0.5).slice(0, 4);
      if (likers.length > 0) {
        await addLikes(created.id, likers);
        console.log(`  Added ${likers.length} likes`);
      }
    }
    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 100));
  }

  console.log(`\nCreated ${createdPosts.length} posts successfully!`);
}

main().catch(console.error);
