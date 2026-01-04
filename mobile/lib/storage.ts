/**
 * AsyncStorage helpers for local state persistence
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const SUBMITTED_EVENTS_KEY = '@ufc_submitted_events';

interface SubmittedEvents {
  [eventId: string]: {
    submittedAt: string;
    pickCount: number;
  };
}

/**
 * Get all submitted events
 */
export async function getSubmittedEvents(): Promise<SubmittedEvents> {
  try {
    const data = await AsyncStorage.getItem(SUBMITTED_EVENTS_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

/**
 * Check if an event has been submitted
 */
export async function isEventSubmitted(eventId: string): Promise<boolean> {
  const events = await getSubmittedEvents();
  return !!events[eventId];
}

/**
 * Mark an event as submitted
 */
export async function submitEvent(eventId: string, pickCount: number): Promise<void> {
  const events = await getSubmittedEvents();
  events[eventId] = {
    submittedAt: new Date().toISOString(),
    pickCount,
  };
  await AsyncStorage.setItem(SUBMITTED_EVENTS_KEY, JSON.stringify(events));
}

/**
 * Unsubmit an event (allow editing again)
 */
export async function unsubmitEvent(eventId: string): Promise<void> {
  const events = await getSubmittedEvents();
  delete events[eventId];
  await AsyncStorage.setItem(SUBMITTED_EVENTS_KEY, JSON.stringify(events));
}

/**
 * Get submission info for an event
 */
export async function getEventSubmission(eventId: string): Promise<{
  submittedAt: string;
  pickCount: number;
} | null> {
  const events = await getSubmittedEvents();
  return events[eventId] || null;
}
