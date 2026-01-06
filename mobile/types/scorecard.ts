/**
 * Global Scorecard Types
 *
 * Types for the round-by-round scoring feature
 */

// =============================================================================
// ENUMS
// =============================================================================

export type RoundPhase =
  | 'PRE_FIGHT'     // Fight hasn't started
  | 'ROUND_LIVE'    // Round is currently in progress
  | 'ROUND_BREAK'   // Between rounds, scoring is OPEN
  | 'ROUND_CLOSED'  // Round scoring period ended
  | 'FIGHT_ENDED';  // Fight is over

export type RoundStateSource =
  | 'MANUAL'        // Admin-controlled (MVP)
  | 'PROVIDER'      // External data provider
  | 'HYBRID';       // Provider with manual override

// =============================================================================
// ROUND STATE
// =============================================================================

export interface RoundState {
  current_round: number;
  phase: RoundPhase;
  scheduled_rounds: number;       // 3 for regular, 5 for main/title
  round_started_at: string | null;
  round_ends_at: string | null;
  scoring_grace_seconds: number;
  source: RoundStateSource;
  updated_at: string | null;
  is_scoring_open: boolean;
}

// =============================================================================
// SCORE SUBMISSION
// =============================================================================

export interface RoundScore {
  round_number: number;
  score_red: number;              // Points for red corner (7-10)
  score_blue: number;             // Points for blue corner (7-10)
  submitted_at: string;
}

export interface ScoreSubmission {
  submission_id: string;          // Client-generated UUID for idempotency
  bout_id: string;
  round_number: number;
  score_red: number;
  score_blue: number;
}

// =============================================================================
// AGGREGATES
// =============================================================================

// Score bucket keys
export type ScoreBucket =
  | 'red_10_9'
  | 'red_10_8'
  | 'red_10_7'
  | 'blue_10_9'
  | 'blue_10_8'
  | 'blue_10_7'
  | 'even_10_10';

export type ScoreBuckets = Partial<Record<ScoreBucket, number>>;

export interface RoundAggregate {
  round_number: number;
  submission_count: number;
  buckets: ScoreBuckets;
  mean_red: number | null;
  mean_blue: number | null;
  consensus_index: number | null;  // 0 = split, 1 = unanimous
}

// =============================================================================
// SCORECARD DATA
// =============================================================================

export interface BoutInfo {
  id: string;
  event_id: string;
  red_name: string;
  blue_name: string;
  weight_class: string | null;
  status: string;
}

export interface FightScorecard {
  bout: BoutInfo;
  round_state: RoundState;
  aggregates: RoundAggregate[];
  user_scores: RoundScore[];
}

// =============================================================================
// EVENT SCORECARDS OVERVIEW
// =============================================================================

export interface EventScorecardSummary {
  bout_id: string;
  red_name: string;
  blue_name: string;
  order_index: number;
  weight_class: string | null;
  round_state: {
    current_round: number;
    phase: RoundPhase;
    scheduled_rounds: number;
    is_scoring_open: boolean;
  } | null;
  total_scores: {
    red: number;
    blue: number;
    submission_count: number;
  } | null;
  user_total: {
    red: number;
    blue: number;
  } | null;
}

export interface EventScorecards {
  event_id: string;
  scorecards: EventScorecardSummary[];
}

// =============================================================================
// API RESPONSES
// =============================================================================

export interface SubmitScoreResponse {
  success: boolean;
  message: string;
  error?: string;
  idempotent?: boolean;
  score?: RoundScore;
  existing_score?: RoundScore;
}

export interface UpdateRoundStateResponse {
  success: boolean;
  message?: string;
  error?: string;
  state?: {
    current_round: number;
    phase: RoundPhase;
    round_started_at: string | null;
    round_ends_at: string | null;
    scheduled_rounds: number;
  };
}

// =============================================================================
// ADMIN TYPES
// =============================================================================

export type AdminAction =
  | 'START_ROUND'
  | 'END_ROUND'
  | 'START_BREAK'
  | 'CLOSE_SCORING'
  | 'END_FIGHT';

export interface LiveFight {
  bout_id: string;
  event_id: string;
  event_name: string;
  red_name: string;
  blue_name: string;
  current_round: number;
  phase: RoundPhase;
  scheduled_rounds: number;
  round_started_at: string | null;
  round_ends_at: string | null;
  submission_counts: Array<{
    round: number;
    count: number;
  }> | null;
  updated_at: string;
}

// =============================================================================
// UI HELPERS
// =============================================================================

export interface ScoreOption {
  label: string;
  score_red: number;
  score_blue: number;
  description?: string;
}

// Pre-defined score options for UI
export const SCORE_OPTIONS: ScoreOption[] = [
  { label: '10-9', score_red: 10, score_blue: 9, description: 'Clear round win' },
  { label: '10-8', score_red: 10, score_blue: 8, description: 'Dominant round' },
  { label: '10-7', score_red: 10, score_blue: 7, description: 'Complete domination (rare)' },
  { label: '9-10', score_red: 9, score_blue: 10, description: 'Clear round loss' },
  { label: '8-10', score_red: 8, score_blue: 10, description: 'Dominated round' },
  { label: '7-10', score_red: 7, score_blue: 10, description: 'Completely dominated (rare)' },
  { label: '10-10', score_red: 10, score_blue: 10, description: 'Even round (very rare)' },
];

// Helper to get winner from aggregate
export function getRoundWinner(aggregate: RoundAggregate): 'red' | 'blue' | 'even' | null {
  if (!aggregate.mean_red || !aggregate.mean_blue) return null;
  if (aggregate.mean_red > aggregate.mean_blue) return 'red';
  if (aggregate.mean_blue > aggregate.mean_red) return 'blue';
  return 'even';
}

// Helper to format phase for display
export function formatPhase(phase: RoundPhase): string {
  switch (phase) {
    case 'PRE_FIGHT':
      return 'Waiting';
    case 'ROUND_LIVE':
      return 'Round Live';
    case 'ROUND_BREAK':
      return 'Score Now';
    case 'ROUND_CLOSED':
      return 'Scoring Closed';
    case 'FIGHT_ENDED':
      return 'Fight Over';
    default:
      return phase;
  }
}

// Helper to get phase color
export function getPhaseColor(phase: RoundPhase, colors: { success: string; warning: string; danger: string; textSecondary: string }): string {
  switch (phase) {
    case 'ROUND_BREAK':
      return colors.success;
    case 'ROUND_LIVE':
      return colors.warning;
    case 'FIGHT_ENDED':
      return colors.danger;
    default:
      return colors.textSecondary;
  }
}

// Helper to calculate total score from aggregates
export function calculateTotalScore(aggregates: RoundAggregate[]): { red: number; blue: number } {
  return aggregates.reduce(
    (acc, agg) => ({
      red: acc.red + (agg.mean_red || 0),
      blue: acc.blue + (agg.mean_blue || 0),
    }),
    { red: 0, blue: 0 }
  );
}

// Helper to get dominant bucket from aggregate
export function getDominantBucket(buckets: ScoreBuckets): { bucket: ScoreBucket; count: number } | null {
  const entries = Object.entries(buckets) as [ScoreBucket, number][];
  if (entries.length === 0) return null;

  let max: [ScoreBucket, number] = entries[0];
  for (const entry of entries) {
    if (entry[1] > max[1]) max = entry;
  }
  return { bucket: max[0], count: max[1] };
}

// Helper to format bucket for display
export function formatBucket(bucket: ScoreBucket): string {
  const parts = bucket.split('_');
  if (parts[0] === 'even') {
    return `${parts[1]}-${parts[2]}`;
  }
  return `${parts[1]}-${parts[2]} ${parts[0].charAt(0).toUpperCase() + parts[0].slice(1)}`;
}
