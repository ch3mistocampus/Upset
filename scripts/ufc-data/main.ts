/**
 * UFC Data Pipeline - Main CLI
 *
 * Unified command interface for the UFC data import pipeline.
 * Downloads, validates, transforms, and imports UFC fighter data from
 * Greco1899/scrape_ufc_stats into Supabase.
 */

import { LOG, DEFAULT_BRANCH, SNAPSHOTS_DIR } from './config.ts';
import { downloadSnapshot, listSnapshots, getSnapshotMetadata } from './downloader.ts';
import { validateSnapshot } from './validator.ts';
import { importSnapshot } from './importer.ts';

// ============================================================================
// Command Handlers
// ============================================================================

/**
 * Pull command - Download CSVs and create a snapshot
 */
async function commandPull(branch: string): Promise<string | null> {
  LOG.info('UFC Data Pipeline - Pull');
  LOG.info('='.repeat(50));

  const result = await downloadSnapshot(branch);

  if (Object.values(result.files).every(f => !f.success)) {
    LOG.error('All downloads failed. Check network connectivity.');
    return null;
  }

  // Validate the snapshot
  LOG.info('\n');
  const validation = await validateSnapshot(result.snapshotId);

  if (!validation.valid) {
    LOG.error('Validation failed. Fix issues before importing.');
    return null;
  }

  LOG.success(`Snapshot ready: ${result.snapshotId}`);
  return result.snapshotId;
}

/**
 * Import command - Import a validated snapshot into Supabase
 */
async function commandImport(snapshotId: string): Promise<boolean> {
  LOG.info('UFC Data Pipeline - Import');
  LOG.info('='.repeat(50));

  // Check environment variables
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!url || !key) {
    LOG.error('Missing environment variables:');
    if (!url) LOG.error('  - SUPABASE_URL');
    if (!key) LOG.error('  - SUPABASE_SERVICE_ROLE_KEY');
    LOG.info('\nSet these variables before running import.');
    return false;
  }

  // Check snapshot exists
  const metadata = await getSnapshotMetadata(snapshotId);
  if (!metadata) {
    LOG.error(`Snapshot not found: ${snapshotId}`);
    LOG.info('Run `ufc:data:list` to see available snapshots.');
    return false;
  }

  // Run import
  const result = await importSnapshot(snapshotId);

  return result.success;
}

/**
 * Pull and Import - Full pipeline execution
 */
async function commandPullAndImport(branch: string): Promise<boolean> {
  LOG.info('UFC Data Pipeline - Pull & Import');
  LOG.info('='.repeat(50));

  // Pull
  const snapshotId = await commandPull(branch);
  if (!snapshotId) {
    return false;
  }

  LOG.info('\n');

  // Import
  const success = await commandImport(snapshotId);

  if (success) {
    LOG.success('\nPipeline completed successfully!');
  } else {
    LOG.error('\nPipeline completed with errors. Check logs above.');
  }

  return success;
}

/**
 * List snapshots command
 */
async function commandList(): Promise<void> {
  const snapshots = await listSnapshots();

  if (snapshots.length === 0) {
    LOG.info('No snapshots found.');
    LOG.info(`Run 'ufc:data:pull' to create one.`);
    return;
  }

  console.log('\nAvailable snapshots:\n');
  console.log('  ID                      Created              Files');
  console.log('  ' + '-'.repeat(60));

  for (const snapshotId of snapshots.slice(0, 10)) {
    const meta = await getSnapshotMetadata(snapshotId);
    const files = meta?.files as Record<string, { success: boolean }> | undefined;
    const successCount = files ? Object.values(files).filter(f => f.success).length : 0;
    const date = meta?.fetchedAt ? new Date(meta.fetchedAt as string).toLocaleString() : 'unknown';

    console.log(`  ${snapshotId}  ${date.padEnd(20)}  ${successCount}/6`);
  }

  if (snapshots.length > 10) {
    console.log(`\n  ... and ${snapshots.length - 10} more`);
  }

  console.log(`\nSnapshot directory: ${SNAPSHOTS_DIR}`);
}

/**
 * Show help
 */
function showHelp(): void {
  console.log(`
UFC Data Pipeline
=================

Downloads and imports UFC fighter data from Greco1899/scrape_ufc_stats
GitHub repository into Supabase.

COMMANDS:
  pull              Download CSVs from GitHub and create a snapshot
  import <id>       Import a snapshot into Supabase
  pull-and-import   Download and import in one step
  list              List available snapshots
  help              Show this help message

OPTIONS:
  --branch, -b      Git branch to download from (default: main)

EXAMPLES:
  # Download latest data
  deno task ufc:data:pull

  # Import a specific snapshot
  deno task ufc:data:import 20260108143022_a1b2

  # Full pipeline
  deno task ufc:data:pull-and-import

ENVIRONMENT VARIABLES:
  SUPABASE_URL               Your Supabase project URL
  SUPABASE_SERVICE_ROLE_KEY  Service role key (for bypassing RLS)

NOTES:
  - Snapshots are stored in: ${SNAPSHOTS_DIR}
  - Each snapshot contains raw CSV files and metadata
  - Imports are idempotent - safe to re-run
  - Fighter IDs are extracted from UFCStats URLs for stability
`);
}

// ============================================================================
// CLI Entry Point
// ============================================================================

if (import.meta.main) {
  const args = Deno.args;
  const command = args[0] || 'help';

  // Parse options
  let branch = DEFAULT_BRANCH;
  for (let i = 0; i < args.length; i++) {
    if ((args[i] === '--branch' || args[i] === '-b') && args[i + 1]) {
      branch = args[i + 1];
    }
  }

  let exitCode = 0;

  try {
    switch (command) {
      case 'pull':
        const snapshotId = await commandPull(branch);
        if (!snapshotId) exitCode = 1;
        break;

      case 'import':
        const importId = args[1];
        if (!importId) {
          LOG.error('Usage: import <snapshot_id>');
          LOG.info('Run `list` to see available snapshots.');
          exitCode = 1;
        } else {
          const success = await commandImport(importId);
          if (!success) exitCode = 1;
        }
        break;

      case 'pull-and-import':
        const pipelineSuccess = await commandPullAndImport(branch);
        if (!pipelineSuccess) exitCode = 1;
        break;

      case 'list':
        await commandList();
        break;

      case 'help':
      case '--help':
      case '-h':
        showHelp();
        break;

      default:
        LOG.error(`Unknown command: ${command}`);
        showHelp();
        exitCode = 1;
    }
  } catch (error) {
    LOG.error(`Fatal error: ${error}`);
    exitCode = 1;
  }

  Deno.exit(exitCode);
}
