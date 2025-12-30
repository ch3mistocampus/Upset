/**
 * Tests for useQueries hooks
 */

import { isEventLocked, getTimeUntilEvent } from '../../hooks/useQueries';
import { Event } from '../../types/database';

describe('useQueries utility functions', () => {
  describe('isEventLocked', () => {
    it('should return true when event is null', () => {
      expect(isEventLocked(null)).toBe(true);
    });

    it('should return true when event date has passed', () => {
      const pastEvent: Event = {
        id: '1',
        name: 'UFC 300',
        event_date: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
        location: 'Las Vegas',
        status: 'upcoming',
        ufcstats_event_id: '123',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      expect(isEventLocked(pastEvent)).toBe(true);
    });

    it('should return false when event is in the future', () => {
      const futureEvent: Event = {
        id: '1',
        name: 'UFC 300',
        event_date: new Date(Date.now() + 1000 * 60 * 60).toISOString(), // 1 hour from now
        location: 'Las Vegas',
        status: 'upcoming',
        ufcstats_event_id: '123',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      expect(isEventLocked(futureEvent)).toBe(false);
    });
  });

  describe('getTimeUntilEvent', () => {
    it('should return 0 when event is null', () => {
      expect(getTimeUntilEvent(null)).toBe(0);
    });

    it('should return negative number when event has passed', () => {
      const pastEvent: Event = {
        id: '1',
        name: 'UFC 300',
        event_date: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
        location: 'Las Vegas',
        status: 'completed',
        ufcstats_event_id: '123',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      expect(getTimeUntilEvent(pastEvent)).toBeLessThan(0);
    });

    it('should return positive number when event is in the future', () => {
      const futureEvent: Event = {
        id: '1',
        name: 'UFC 300',
        event_date: new Date(Date.now() + 1000 * 60 * 60).toISOString(), // 1 hour from now
        location: 'Las Vegas',
        status: 'upcoming',
        ufcstats_event_id: '123',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const timeUntil = getTimeUntilEvent(futureEvent);
      expect(timeUntil).toBeGreaterThan(0);
      // Should be approximately 1 hour (with some tolerance for test execution time)
      expect(timeUntil).toBeGreaterThan(1000 * 60 * 59); // at least 59 minutes
      expect(timeUntil).toBeLessThan(1000 * 60 * 61); // at most 61 minutes
    });
  });
});
