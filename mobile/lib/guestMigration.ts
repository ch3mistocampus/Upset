/**
 * Guest to user data migration
 * Migrates local guest picks to the authenticated user's account
 */

import { supabase } from './supabase';
import { logger } from './logger';
import { GuestPick } from '../hooks/useGuestPicks';

export interface MigrationResult {
  success: boolean;
  migratedCount: number;
  skippedCount: number;
  failedCount: number;
  errors: string[];
}

/**
 * Migrate guest picks to an authenticated user's account
 * Idempotent - skips picks that already exist for the user
 */
export async function migrateGuestDataToUser(
  userId: string,
  guestPicks: GuestPick[]
): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: true,
    migratedCount: 0,
    skippedCount: 0,
    failedCount: 0,
    errors: [],
  };

  if (guestPicks.length === 0) {
    logger.info('No guest picks to migrate');
    return result;
  }

  logger.info('Starting guest pick migration', {
    userId,
    pickCount: guestPicks.length,
  });

  for (const guestPick of guestPicks) {
    try {
      // Check if pick already exists (idempotency check)
      const { data: existing, error: checkError } = await supabase
        .from('picks')
        .select('id')
        .eq('user_id', userId)
        .eq('bout_id', guestPick.bout_id)
        .maybeSingle();

      if (checkError) {
        throw checkError;
      }

      if (existing) {
        // Skip - pick already exists
        result.skippedCount++;
        logger.debug('Pick already exists, skipping', { boutId: guestPick.bout_id });
        continue;
      }

      // Insert pick with user_id
      const { error: insertError } = await supabase
        .from('picks')
        .insert({
          user_id: userId,
          event_id: guestPick.event_id,
          bout_id: guestPick.bout_id,
          picked_corner: guestPick.picked_corner,
          created_at: guestPick.created_at,
          status: 'active',
        });

      if (insertError) {
        // Handle duplicate key error gracefully - treat as already migrated
        // PostgreSQL error code 23505 = unique_violation
        if (insertError.code === '23505') {
          result.skippedCount++;
          logger.debug('Pick already exists (constraint), skipping', { boutId: guestPick.bout_id });
          continue;
        }
        throw insertError;
      }

      result.migratedCount++;
      logger.debug('Pick migrated successfully', { boutId: guestPick.bout_id });

    } catch (err) {
      result.failedCount++;
      const errMessage = err instanceof Error ? err.message : 'Unknown error';
      const errorMsg = `Failed to migrate pick ${guestPick.id}: ${errMessage}`;
      result.errors.push(errorMsg);
      logger.error('Pick migration failed', err instanceof Error ? err : new Error(errMessage), { boutId: guestPick.bout_id });
    }
  }

  result.success = result.failedCount === 0;

  logger.info('Guest pick migration completed', {
    userId,
    success: result.success,
    migrated: result.migratedCount,
    skipped: result.skippedCount,
    failed: result.failedCount,
  });

  return result;
}
