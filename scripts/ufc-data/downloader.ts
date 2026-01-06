/**
 * UFC Data Downloader
 *
 * Downloads CSV files from Greco1899/scrape_ufc_stats repository
 * and saves them as a timestamped snapshot.
 */

import {
  CSV_FILES,
  CsvFileKey,
  SNAPSHOTS_DIR,
  buildCsvUrl,
  generateSnapshotId,
  LOG,
  DEFAULT_BRANCH,
} from './config.ts';

export interface DownloadResult {
  snapshotId: string;
  snapshotPath: string;
  files: Record<string, { success: boolean; path?: string; error?: string; rowCount?: number }>;
  fetchedAt: Date;
  branch: string;
}

/**
 * Ensure directory exists
 */
async function ensureDir(path: string): Promise<void> {
  try {
    await Deno.mkdir(path, { recursive: true });
  } catch (error) {
    if (!(error instanceof Deno.errors.AlreadyExists)) {
      throw error;
    }
  }
}

/**
 * Count rows in CSV content (excluding header)
 */
function countCsvRows(content: string): number {
  const lines = content.split('\n').filter(line => line.trim());
  return Math.max(0, lines.length - 1); // Subtract header row
}

/**
 * Download a single CSV file
 */
async function downloadFile(
  filename: string,
  branch: string,
  destPath: string
): Promise<{ success: boolean; rowCount?: number; error?: string }> {
  const url = buildCsvUrl(filename, branch);
  LOG.debug(`Downloading ${filename}...`);

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const content = await response.text();
    const rowCount = countCsvRows(content);

    await Deno.writeTextFile(destPath, content);

    LOG.success(`Downloaded ${filename} (${rowCount.toLocaleString()} rows)`);
    return { success: true, rowCount };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    LOG.error(`Failed to download ${filename}: ${errorMsg}`);
    return { success: false, error: errorMsg };
  }
}

/**
 * Download all CSV files and create a snapshot
 */
export async function downloadSnapshot(
  branch: string = DEFAULT_BRANCH
): Promise<DownloadResult> {
  const snapshotId = generateSnapshotId();
  const snapshotPath = `${SNAPSHOTS_DIR}/${snapshotId}`;
  const rawPath = `${snapshotPath}/raw`;

  LOG.step(1, `Creating snapshot: ${snapshotId}`);
  LOG.info(`Branch: ${branch}`);

  await ensureDir(rawPath);

  const files: DownloadResult['files'] = {};
  const fileKeys = Object.keys(CSV_FILES) as CsvFileKey[];

  LOG.step(2, `Downloading ${fileKeys.length} CSV files...`);

  for (const key of fileKeys) {
    const config = CSV_FILES[key];
    const destPath = `${rawPath}/${config.filename}`;

    const result = await downloadFile(config.filename, branch, destPath);
    files[key] = {
      ...result,
      path: result.success ? destPath : undefined,
    };
  }

  // Check if all critical files were downloaded
  const criticalFiles = ['fighter_details', 'fighter_tott', 'event_details', 'fight_results'];
  const failedCritical = criticalFiles.filter(f => !files[f]?.success);

  if (failedCritical.length > 0) {
    LOG.error(`Critical files failed: ${failedCritical.join(', ')}`);
  }

  // Save metadata
  const metadata = {
    snapshotId,
    branch,
    fetchedAt: new Date().toISOString(),
    files: Object.fromEntries(
      Object.entries(files).map(([k, v]) => [k, { rowCount: v.rowCount, success: v.success }])
    ),
  };

  await Deno.writeTextFile(
    `${snapshotPath}/metadata.json`,
    JSON.stringify(metadata, null, 2)
  );

  const successCount = Object.values(files).filter(f => f.success).length;
  LOG.step(3, `Snapshot complete: ${successCount}/${fileKeys.length} files downloaded`);

  return {
    snapshotId,
    snapshotPath,
    files,
    fetchedAt: new Date(),
    branch,
  };
}

/**
 * List available snapshots
 */
export async function listSnapshots(): Promise<string[]> {
  const snapshots: string[] = [];

  try {
    for await (const entry of Deno.readDir(SNAPSHOTS_DIR)) {
      if (entry.isDirectory) {
        snapshots.push(entry.name);
      }
    }
  } catch {
    // Directory doesn't exist yet
  }

  return snapshots.sort().reverse(); // Most recent first
}

/**
 * Get snapshot metadata
 */
export async function getSnapshotMetadata(snapshotId: string): Promise<Record<string, unknown> | null> {
  const metadataPath = `${SNAPSHOTS_DIR}/${snapshotId}/metadata.json`;

  try {
    const content = await Deno.readTextFile(metadataPath);
    return JSON.parse(content);
  } catch {
    return null;
  }
}

// CLI entry point
if (import.meta.main) {
  const args = Deno.args;
  const command = args[0] || 'download';
  const branch = args[1] || DEFAULT_BRANCH;

  if (command === 'download') {
    LOG.info('🚀 UFC Data Downloader');
    LOG.info('='.repeat(50));

    const result = await downloadSnapshot(branch);

    LOG.info('\n' + '='.repeat(50));
    LOG.info('Summary:');
    LOG.info(`  Snapshot ID: ${result.snapshotId}`);
    LOG.info(`  Location: ${result.snapshotPath}`);
    LOG.info(`  Branch: ${result.branch}`);

    const totalRows = Object.values(result.files)
      .filter(f => f.success)
      .reduce((sum, f) => sum + (f.rowCount || 0), 0);
    LOG.info(`  Total rows: ${totalRows.toLocaleString()}`);

    // Output snapshot ID for piping to importer
    console.log(`\nSNAPSHOT_ID=${result.snapshotId}`);
  } else if (command === 'list') {
    const snapshots = await listSnapshots();
    console.log('Available snapshots:');
    for (const s of snapshots) {
      const meta = await getSnapshotMetadata(s);
      console.log(`  ${s} - ${meta?.fetchedAt || 'unknown'}`);
    }
  } else {
    console.log('Usage:');
    console.log('  deno run --allow-net --allow-read --allow-write downloader.ts download [branch]');
    console.log('  deno run --allow-read downloader.ts list');
  }
}
