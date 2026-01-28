-- Purge 752 empty historical events that have no bouts
-- These were imported from completed?page=all but never had cards synced
-- They serve no purpose and bloat queries

DELETE FROM events e
WHERE NOT EXISTS (SELECT 1 FROM bouts b WHERE b.event_id = e.id)
  AND e.status = 'completed';
