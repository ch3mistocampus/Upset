/**
 * UFC Data Pipeline Configuration
 *
 * Source: Greco1899/scrape_ufc_stats GitHub repository
 * Data is scraped from UFCStats.com
 */

// GitHub raw file base URL
export const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/Greco1899/scrape_ufc_stats';
export const DEFAULT_BRANCH = 'main';

// CSV file definitions with required and optional columns
export const CSV_FILES = {
  fighter_details: {
    filename: 'ufc_fighter_details.csv',
    requiredColumns: ['FIRST', 'LAST', 'URL'],
    optionalColumns: ['NICKNAME'],
    description: 'Fighter names and profile URLs',
  },
  fighter_tott: {
    filename: 'ufc_fighter_tott.csv',
    requiredColumns: ['FIGHTER', 'URL'],
    optionalColumns: ['HEIGHT', 'WEIGHT', 'REACH', 'STANCE', 'DOB'],
    description: 'Fighter "tale of the tape" - physical stats',
  },
  event_details: {
    filename: 'ufc_event_details.csv',
    requiredColumns: ['EVENT', 'URL'],
    optionalColumns: ['DATE', 'LOCATION'],
    description: 'UFC event information',
  },
  fight_details: {
    filename: 'ufc_fight_details.csv',
    requiredColumns: ['EVENT', 'BOUT', 'URL'],
    optionalColumns: [],
    description: 'Fight cards - links events to bouts',
  },
  fight_results: {
    filename: 'ufc_fight_results.csv',
    requiredColumns: ['EVENT', 'BOUT', 'URL'],
    optionalColumns: ['OUTCOME', 'WEIGHTCLASS', 'METHOD', 'ROUND', 'TIME', 'TIME FORMAT', 'REFEREE', 'DETAILS'],
    description: 'Fight results and outcomes',
  },
  fight_stats: {
    filename: 'ufc_fight_stats.csv',
    requiredColumns: ['EVENT', 'BOUT', 'ROUND', 'FIGHTER'],
    optionalColumns: [
      'KD', 'SIG.STR.', 'SIG.STR. %', 'TOTAL STR.', 'TD', 'TD %',
      'SUB.ATT', 'REV.', 'CTRL', 'HEAD', 'BODY', 'LEG', 'DISTANCE', 'CLINCH', 'GROUND'
    ],
    description: 'Per-round fight statistics',
  },
} as const;

export type CsvFileKey = keyof typeof CSV_FILES;

// URL patterns for ID extraction
export const URL_PATTERNS = {
  fighter: /fighter-details\/([a-f0-9]+)$/,
  event: /event-details\/([a-f0-9]+)$/,
  fight: /fight-details\/([a-f0-9]+)$/,
};

// Data directory paths
export const DATA_DIR = './data/ufc';
export const SNAPSHOTS_DIR = `${DATA_DIR}/snapshots`;

// Import configuration
export const BATCH_SIZE = 500;
export const MAX_RETRIES = 3;
export const RETRY_DELAY_MS = 1000;

// Logging helpers
export const LOG = {
  info: (msg: string) => console.log(`📋 ${msg}`),
  success: (msg: string) => console.log(`✅ ${msg}`),
  error: (msg: string) => console.error(`❌ ${msg}`),
  warn: (msg: string) => console.warn(`⚠️  ${msg}`),
  debug: (msg: string) => console.log(`🔍 ${msg}`),
  step: (step: number, msg: string) => console.log(`\n[${step}] ${msg}`),
};

/**
 * Build raw GitHub URL for a CSV file
 */
export function buildCsvUrl(filename: string, branch: string = DEFAULT_BRANCH): string {
  return `${GITHUB_RAW_BASE}/${branch}/${filename}`;
}

/**
 * Extract ID from UFCStats URL
 */
export function extractIdFromUrl(url: string, type: 'fighter' | 'event' | 'fight'): string | null {
  const pattern = URL_PATTERNS[type];
  const match = url.match(pattern);
  return match ? match[1] : null;
}

/**
 * Generate snapshot ID from timestamp
 */
export function generateSnapshotId(): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const random = Math.random().toString(36).substring(2, 6);
  return `${timestamp}_${random}`;
}

/**
 * Parse height string (e.g., "5' 11\"" or "6' 2\"") to inches
 */
export function parseHeightToInches(height: string): number | null {
  if (!height || height === '--') return null;
  const match = height.match(/(\d+)'\s*(\d+)?/);
  if (!match) return null;
  const feet = parseInt(match[1], 10);
  const inches = parseInt(match[2] || '0', 10);
  return feet * 12 + inches;
}

/**
 * Parse weight string (e.g., "155 lbs.") to number
 */
export function parseWeight(weight: string): number | null {
  if (!weight || weight === '--') return null;
  const match = weight.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Parse reach string (e.g., "72\"" or "72") to inches
 */
export function parseReach(reach: string): number | null {
  if (!reach || reach === '--') return null;
  const match = reach.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Parse date string (e.g., "Jul 13, 1978" or "December 13, 2025") to Date
 */
export function parseDate(dateStr: string): Date | null {
  if (!dateStr || dateStr === '--') return null;
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Parse time string (e.g., "3:18") to seconds
 */
export function parseTimeToSeconds(time: string): number | null {
  if (!time || time === '--') return null;
  const match = time.match(/(\d+):(\d+)/);
  if (!match) return null;
  const minutes = parseInt(match[1], 10);
  const seconds = parseInt(match[2], 10);
  return minutes * 60 + seconds;
}

/**
 * Parse control time (e.g., "2:15" or "0:00") to seconds
 */
export function parseCtrlTime(ctrl: string): number {
  if (!ctrl || ctrl === '--' || ctrl === '0:00') return 0;
  const match = ctrl.match(/(\d+):(\d+)/);
  if (!match) return 0;
  const minutes = parseInt(match[1], 10);
  const seconds = parseInt(match[2], 10);
  return minutes * 60 + seconds;
}

/**
 * Parse "X of Y" format (e.g., "17 of 26") to { landed, attempted }
 */
export function parseOfFormat(str: string): { landed: number; attempted: number } {
  if (!str || str === '---') return { landed: 0, attempted: 0 };
  const match = str.match(/(\d+)\s*of\s*(\d+)/);
  if (!match) return { landed: 0, attempted: 0 };
  return {
    landed: parseInt(match[1], 10),
    attempted: parseInt(match[2], 10),
  };
}

/**
 * Parse percentage string (e.g., "65%") to number
 */
export function parsePercentage(pct: string): number | null {
  if (!pct || pct === '---' || pct === '--') return null;
  const match = pct.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Parse scheduled rounds from time format (e.g., "5 Rnd (5-5-5-5-5)" or "3 Rnd (5-5-5)")
 */
export function parseScheduledRounds(timeFormat: string): number {
  if (!timeFormat) return 3;
  const match = timeFormat.match(/(\d+)\s*Rnd/i);
  return match ? parseInt(match[1], 10) : 3;
}

/**
 * Check if fight is a title fight based on weight class string
 */
export function isTitleFight(weightClass: string): boolean {
  if (!weightClass) return false;
  return weightClass.toLowerCase().includes('title') ||
         weightClass.toLowerCase().includes('championship');
}

/**
 * Parse weight class to clean name
 */
export function parseWeightClass(weightClass: string): string {
  if (!weightClass) return 'Unknown';
  // Remove "Bout" suffix and title indicators
  return weightClass
    .replace(/\s*bout\s*/gi, '')
    .replace(/\s*title\s*/gi, '')
    .replace(/\s*championship\s*/gi, '')
    .replace(/ufc\s*/gi, '')
    .trim();
}
