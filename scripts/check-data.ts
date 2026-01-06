import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const { data: events } = await supabase
  .from('events')
  .select('id, name, event_date, status')
  .order('event_date', { ascending: false })
  .limit(15);

const { data: boutsCount } = await supabase
  .from('bouts')
  .select('event_id');

const boutsByEvent = new Map<string, number>();
boutsCount?.forEach(b => {
  boutsByEvent.set(b.event_id, (boutsByEvent.get(b.event_id) || 0) + 1);
});

console.log('Recent Events:');
events?.forEach(e => {
  const count = boutsByEvent.get(e.id) || 0;
  const date = new Date(e.event_date).toLocaleDateString();
  console.log('  [' + e.status + '] ' + e.name + ' (' + date + '): ' + count + ' bouts');
});

// Check results
const { count: resultsCount } = await supabase
  .from('results')
  .select('*', { count: 'exact', head: true });

console.log('\nTotal results in DB: ' + (resultsCount || 0));
