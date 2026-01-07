-- Archive test seed data so real UFCStats events take precedence
-- Test events are identified by their ufcstats_event_id prefix 'test-event-'

-- Mark test events as completed with past dates
UPDATE public.events
SET
  status = 'completed',
  event_date = NOW() - INTERVAL '1 year'
WHERE ufcstats_event_id LIKE 'test-event-%';

-- Also mark any bouts from test events as completed
UPDATE public.bouts
SET status = 'completed'
WHERE event_id IN (
  SELECT id FROM public.events WHERE ufcstats_event_id LIKE 'test-event-%'
);
