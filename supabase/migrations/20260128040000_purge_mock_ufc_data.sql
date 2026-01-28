-- Purge all mock/test UFC event data from production
-- CASCADE deletes associated bouts, results, and picks automatically

DELETE FROM events
WHERE ufcstats_event_id LIKE 'test-event-%';

-- Add a CHECK constraint to prevent test event IDs from being re-inserted
-- This guards against seed migrations being accidentally re-applied
ALTER TABLE events
ADD CONSTRAINT no_test_event_ids
CHECK (ufcstats_event_id NOT LIKE 'test-event-%');
