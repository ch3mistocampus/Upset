/**
 * UFC Data Validator
 *
 * Validates downloaded CSV files for required columns and data integrity.
 */

import { CSV_FILES, CsvFileKey, SNAPSHOTS_DIR, LOG } from './config.ts';
import { parse } from 'https://deno.land/std@0.208.0/csv/mod.ts';

export interface ValidationResult {
  valid: boolean;
  files: Record<string, FileValidation>;
  errors: string[];
  warnings: string[];
}

export interface FileValidation {
  exists: boolean;
  rowCount: number;
  hasRequiredColumns: boolean;
  missingColumns: string[];
  extraColumns: string[];
  sampleRow?: Record<string, string>;
}

/**
 * Read and parse a CSV file
 */
async function readCsv(path: string): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  const content = await Deno.readTextFile(path);
  const parsed = parse(content, { skipFirstRow: false });

  if (parsed.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = parsed[0] as string[];
  const rows = parsed.slice(1).map(row => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = (row as string[])[i] || '';
    });
    return obj;
  });

  return { headers, rows };
}

/**
 * Validate a single CSV file
 */
async function validateFile(
  key: CsvFileKey,
  snapshotPath: string
): Promise<{ validation: FileValidation; errors: string[]; warnings: string[] }> {
  const config = CSV_FILES[key];
  const filePath = `${snapshotPath}/raw/${config.filename}`;
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if file exists
  let exists = false;
  try {
    await Deno.stat(filePath);
    exists = true;
  } catch {
    errors.push(`${key}: File not found at ${filePath}`);
    return {
      validation: {
        exists: false,
        rowCount: 0,
        hasRequiredColumns: false,
        missingColumns: config.requiredColumns,
        extraColumns: [],
      },
      errors,
      warnings,
    };
  }

  // Parse CSV
  let headers: string[] = [];
  let rows: Record<string, string>[] = [];

  try {
    const result = await readCsv(filePath);
    headers = result.headers;
    rows = result.rows;
  } catch (error) {
    errors.push(`${key}: Failed to parse CSV - ${error}`);
    return {
      validation: {
        exists: true,
        rowCount: 0,
        hasRequiredColumns: false,
        missingColumns: config.requiredColumns,
        extraColumns: [],
      },
      errors,
      warnings,
    };
  }

  // Check row count
  if (rows.length === 0) {
    errors.push(`${key}: File is empty (no data rows)`);
  }

  // Check required columns
  const missingColumns = config.requiredColumns.filter(col => !headers.includes(col));
  const knownColumns = [...config.requiredColumns, ...config.optionalColumns];
  const extraColumns = headers.filter(col => !knownColumns.includes(col));

  if (missingColumns.length > 0) {
    errors.push(`${key}: Missing required columns: ${missingColumns.join(', ')}`);
  }

  if (extraColumns.length > 0) {
    warnings.push(`${key}: Unknown columns (will be ignored): ${extraColumns.join(', ')}`);
  }

  // Get sample row
  const sampleRow = rows.length > 0 ? rows[0] : undefined;

  return {
    validation: {
      exists,
      rowCount: rows.length,
      hasRequiredColumns: missingColumns.length === 0,
      missingColumns,
      extraColumns,
      sampleRow,
    },
    errors,
    warnings,
  };
}

/**
 * Validate all files in a snapshot
 */
export async function validateSnapshot(snapshotId: string): Promise<ValidationResult> {
  const snapshotPath = `${SNAPSHOTS_DIR}/${snapshotId}`;
  const fileKeys = Object.keys(CSV_FILES) as CsvFileKey[];

  LOG.step(1, `Validating snapshot: ${snapshotId}`);

  const files: Record<string, FileValidation> = {};
  const allErrors: string[] = [];
  const allWarnings: string[] = [];

  for (const key of fileKeys) {
    LOG.debug(`Validating ${key}...`);
    const { validation, errors, warnings } = await validateFile(key, snapshotPath);
    files[key] = validation;
    allErrors.push(...errors);
    allWarnings.push(...warnings);
  }

  // Cross-file validation
  LOG.step(2, 'Cross-file validation...');

  // Check URL consistency between fighter_details and fighter_tott
  if (files.fighter_details?.exists && files.fighter_tott?.exists) {
    // Both files should have matching URLs for the same fighters
    // This is a soft warning, not an error
    LOG.debug('Fighter files both present - URL matching will be done during transform');
  }

  // Summary
  const valid = allErrors.length === 0;
  const validCount = Object.values(files).filter(f => f.hasRequiredColumns).length;

  LOG.step(3, `Validation ${valid ? 'PASSED' : 'FAILED'}`);
  LOG.info(`  Valid files: ${validCount}/${fileKeys.length}`);
  LOG.info(`  Total rows: ${Object.values(files).reduce((sum, f) => sum + f.rowCount, 0).toLocaleString()}`);

  if (allErrors.length > 0) {
    LOG.error('Errors:');
    allErrors.forEach(e => LOG.error(`  - ${e}`));
  }

  if (allWarnings.length > 0) {
    LOG.warn('Warnings:');
    allWarnings.forEach(w => LOG.warn(`  - ${w}`));
  }

  return {
    valid,
    files,
    errors: allErrors,
    warnings: allWarnings,
  };
}

/**
 * Get parsed data from a validated snapshot
 */
export async function getSnapshotData(
  snapshotId: string
): Promise<Record<CsvFileKey, Record<string, string>[]>> {
  const snapshotPath = `${SNAPSHOTS_DIR}/${snapshotId}`;
  const data: Record<string, Record<string, string>[]> = {};

  for (const key of Object.keys(CSV_FILES) as CsvFileKey[]) {
    const config = CSV_FILES[key];
    const filePath = `${snapshotPath}/raw/${config.filename}`;

    try {
      const { rows } = await readCsv(filePath);
      data[key] = rows;
    } catch {
      data[key] = [];
    }
  }

  return data as Record<CsvFileKey, Record<string, string>[]>;
}

// CLI entry point
if (import.meta.main) {
  const snapshotId = Deno.args[0];

  if (!snapshotId) {
    console.log('Usage: deno run --allow-read validator.ts <snapshot_id>');
    Deno.exit(1);
  }

  LOG.info('🔍 UFC Data Validator');
  LOG.info('='.repeat(50));

  const result = await validateSnapshot(snapshotId);

  // Output validation result
  console.log('\n' + JSON.stringify({
    valid: result.valid,
    errorCount: result.errors.length,
    warningCount: result.warnings.length,
  }));

  Deno.exit(result.valid ? 0 : 1);
}
