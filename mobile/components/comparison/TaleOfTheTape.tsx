/**
 * TaleOfTheTape - Enhanced fighter stat comparison
 * Features:
 * - Background highlighting on winning rows
 * - Mini progress bars for numeric stats
 * - Category-level advantage summaries
 * - Magnitude indicators showing difference amount
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../lib/theme';
import { spacing, radius, fighterColors } from '../../lib/tokens';
import { UFCFighter } from '../../types/database';
import {
  formatHeight,
  formatReach,
  calculateAge,
} from '../../hooks/useFighterStats';
import { StatCategory } from './CategoryToggleRow';

interface AdvantageCount {
  red: number;
  blue: number;
  total: number;
}

interface CategoryAdvantages {
  physical: AdvantageCount;
  record: AdvantageCount;
  striking: AdvantageCount;
  grappling: AdvantageCount;
  finish: AdvantageCount;
}

interface TaleOfTheTapeProps {
  redFighter: UFCFighter | null;
  blueFighter: UFCFighter | null;
  enabledCategories: Set<StatCategory>;
}

interface StatRowProps {
  label: string;
  redValue: string | null;
  blueValue: string | null;
  redAdvantage?: boolean;
  blueAdvantage?: boolean;
  showBar?: boolean;
  redNumeric?: number | null;
  blueNumeric?: number | null;
  advantageDiff?: string;
}

function StatRow({
  label,
  redValue,
  blueValue,
  redAdvantage,
  blueAdvantage,
  showBar = false,
  redNumeric,
  blueNumeric,
  advantageDiff,
}: StatRowProps): React.ReactElement {
  const { colors, isDark } = useTheme();
  const redColor = isDark ? fighterColors.red.solid.dark : fighterColors.red.solid.light;
  const blueColor = isDark ? fighterColors.blue.solid.dark : fighterColors.blue.solid.light;

  // Softer background colors for highlighted rows
  const redBgColor = isDark ? 'rgba(197, 74, 80, 0.12)' : 'rgba(148, 53, 56, 0.08)';
  const blueBgColor = isDark ? 'rgba(74, 111, 165, 0.12)' : 'rgba(30, 58, 95, 0.08)';

  // Calculate bar percentages if showing bars
  const maxVal = Math.max(redNumeric ?? 0, blueNumeric ?? 0, 1);
  const redPct = showBar && redNumeric != null ? (redNumeric / maxVal) * 100 : 0;
  const bluePct = showBar && blueNumeric != null ? (blueNumeric / maxVal) * 100 : 0;

  const hasAdvantage = redAdvantage || blueAdvantage;

  return (
    <View
      style={[
        styles.statRow,
        hasAdvantage && {
          backgroundColor: redAdvantage ? redBgColor : blueBgColor,
        },
      ]}
    >
      {/* Red value column */}
      <View style={styles.valueColumn}>
        <Text
          style={[
            styles.value,
            styles.valueLeft,
            {
              color: redAdvantage ? redColor : colors.text,
              fontWeight: redAdvantage ? '700' : '500',
            },
          ]}
          numberOfLines={1}
        >
          {redValue || '--'}
        </Text>

        {/* Mini bar for red */}
        {showBar && redNumeric != null && (
          <View style={[styles.miniBarTrack, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.miniBar,
                styles.miniBarRed,
                {
                  backgroundColor: redAdvantage ? redColor : colors.textTertiary,
                  width: `${redPct}%`,
                  opacity: redAdvantage ? 1 : 0.4,
                },
              ]}
            />
          </View>
        )}
      </View>

      {/* Center label */}
      <View style={styles.labelContainer}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
        {advantageDiff && hasAdvantage && (
          <Text
            style={[
              styles.diffText,
              { color: redAdvantage ? redColor : blueColor },
            ]}
          >
            {advantageDiff}
          </Text>
        )}
      </View>

      {/* Blue value column */}
      <View style={styles.valueColumn}>
        <Text
          style={[
            styles.value,
            styles.valueRight,
            {
              color: blueAdvantage ? blueColor : colors.text,
              fontWeight: blueAdvantage ? '700' : '500',
            },
          ]}
          numberOfLines={1}
        >
          {blueValue || '--'}
        </Text>

        {/* Mini bar for blue */}
        {showBar && blueNumeric != null && (
          <View style={[styles.miniBarTrack, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.miniBar,
                styles.miniBarBlue,
                {
                  backgroundColor: blueAdvantage ? blueColor : colors.textTertiary,
                  width: `${bluePct}%`,
                  opacity: blueAdvantage ? 1 : 0.4,
                },
              ]}
            />
          </View>
        )}
      </View>
    </View>
  );
}

interface SectionHeaderProps {
  title: string;
  redCount: number;
  blueCount: number;
}

function SectionHeader({ title, redCount, blueCount }: SectionHeaderProps): React.ReactElement {
  const { colors, isDark } = useTheme();
  const redColor = isDark ? fighterColors.red.solid.dark : fighterColors.red.solid.light;
  const blueColor = isDark ? fighterColors.blue.solid.dark : fighterColors.blue.solid.light;

  const leader = redCount > blueCount ? 'red' : blueCount > redCount ? 'blue' : 'tie';

  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionLine, { backgroundColor: colors.border }]} />
      <View style={[styles.sectionPill, { backgroundColor: colors.surfaceAlt }]}>
        <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>{title}</Text>
        <View style={styles.sectionScore}>
          <Text
            style={[
              styles.sectionScoreText,
              { color: leader === 'red' ? redColor : colors.textTertiary },
            ]}
          >
            {redCount}
          </Text>
          <Text style={[styles.sectionScoreDivider, { color: colors.border }]}>•</Text>
          <Text
            style={[
              styles.sectionScoreText,
              { color: leader === 'blue' ? blueColor : colors.textTertiary },
            ]}
          >
            {blueCount}
          </Text>
        </View>
      </View>
      <View style={[styles.sectionLine, { backgroundColor: colors.border }]} />
    </View>
  );
}

export function TaleOfTheTape({
  redFighter,
  blueFighter,
  enabledCategories,
}: TaleOfTheTapeProps): React.ReactElement {
  // Helper to compare numeric values
  const compareNumeric = (
    red: number | null | undefined,
    blue: number | null | undefined,
    higherIsBetter = true
  ): { redAdvantage: boolean; blueAdvantage: boolean; diff: number | null } => {
    if (red == null || blue == null || red === blue) {
      return { redAdvantage: false, blueAdvantage: false, diff: null };
    }
    const diff = Math.abs(red - blue);
    if (higherIsBetter) {
      return { redAdvantage: red > blue, blueAdvantage: blue > red, diff };
    }
    return { redAdvantage: red < blue, blueAdvantage: blue < red, diff };
  };

  // Helper to format record
  const formatRecord = (wins: number, losses: number, draws: number): string => {
    let record = `${wins}-${losses}`;
    if (draws > 0) record += `-${draws}`;
    return record;
  };

  // Calculate win percentage
  const getWinPct = (wins: number, losses: number, draws: number): number | null => {
    const total = wins + losses + draws;
    if (total === 0) return null;
    return Math.round((wins / total) * 100);
  };

  const redWinPct = redFighter ? getWinPct(redFighter.record_wins ?? 0, redFighter.record_losses ?? 0, redFighter.record_draws ?? 0) : null;
  const blueWinPct = blueFighter ? getWinPct(blueFighter.record_wins ?? 0, blueFighter.record_losses ?? 0, blueFighter.record_draws ?? 0) : null;

  // Calculate advantages for each category
  const advantages = useMemo<CategoryAdvantages>(() => {
    const countAdvantages = (comparisons: Array<{ redAdvantage: boolean; blueAdvantage: boolean }>): AdvantageCount => {
      const red = comparisons.filter(c => c.redAdvantage).length;
      const blue = comparisons.filter(c => c.blueAdvantage).length;
      return { red, blue, total: comparisons.length };
    };

    return {
      physical: countAdvantages([
        compareNumeric(redFighter?.height_inches, blueFighter?.height_inches),
        compareNumeric(redFighter?.reach_inches, blueFighter?.reach_inches),
        compareNumeric(
          redFighter?.dob ? calculateAge(redFighter.dob) : null,
          blueFighter?.dob ? calculateAge(blueFighter.dob) : null,
          false
        ),
      ]),
      record: countAdvantages([
        compareNumeric(redWinPct, blueWinPct),
        compareNumeric(redFighter?.record_wins, blueFighter?.record_wins),
        compareNumeric(redFighter?.record_losses, blueFighter?.record_losses, false),
      ]),
      striking: countAdvantages([
        compareNumeric(redFighter?.slpm, blueFighter?.slpm),
        compareNumeric(redFighter?.sapm, blueFighter?.sapm, false),
        compareNumeric(redFighter?.str_acc, blueFighter?.str_acc),
        compareNumeric(redFighter?.str_def, blueFighter?.str_def),
      ]),
      grappling: countAdvantages([
        compareNumeric(redFighter?.td_avg, blueFighter?.td_avg),
        compareNumeric(redFighter?.td_acc, blueFighter?.td_acc),
        compareNumeric(redFighter?.td_def, blueFighter?.td_def),
        compareNumeric(redFighter?.sub_avg, blueFighter?.sub_avg),
      ]),
      finish: countAdvantages([
        compareNumeric(redFighter?.ko_percentage, blueFighter?.ko_percentage),
        compareNumeric(redFighter?.sub_percentage, blueFighter?.sub_percentage),
        compareNumeric(redFighter?.ko_tko_wins, blueFighter?.ko_tko_wins),
        compareNumeric(redFighter?.submission_wins, blueFighter?.submission_wins),
        compareNumeric(redFighter?.decision_wins, blueFighter?.decision_wins),
      ]),
    };
  }, [redFighter, blueFighter, redWinPct, blueWinPct]);

  // Format difference for display - shorter format
  const formatDiff = (diff: number | null, unit: string = '', decimals: number = 0): string | undefined => {
    if (diff == null) return undefined;
    const formatted = decimals > 0 ? diff.toFixed(decimals) : Math.round(diff).toString();
    return `+${formatted}${unit}`;
  };

  const heightComparison = compareNumeric(redFighter?.height_inches, blueFighter?.height_inches);
  const reachComparison = compareNumeric(redFighter?.reach_inches, blueFighter?.reach_inches);
  const ageComparison = compareNumeric(
    redFighter?.dob ? calculateAge(redFighter.dob) : null,
    blueFighter?.dob ? calculateAge(blueFighter.dob) : null,
    false
  );

  return (
    <View style={styles.container}>
      {/* Physical */}
      {enabledCategories.has('physical') && (
        <>
          <SectionHeader
            title="PHYSICAL"
            redCount={advantages.physical.red}
            blueCount={advantages.physical.blue}
          />
          <StatRow
            label="HEIGHT"
            redValue={formatHeight(redFighter?.height_inches ?? null)}
            blueValue={formatHeight(blueFighter?.height_inches ?? null)}
            {...heightComparison}
            showBar
            redNumeric={redFighter?.height_inches}
            blueNumeric={blueFighter?.height_inches}
            advantageDiff={formatDiff(heightComparison.diff, '"')}
          />
          <StatRow
            label="REACH"
            redValue={formatReach(redFighter?.reach_inches ?? null)}
            blueValue={formatReach(blueFighter?.reach_inches ?? null)}
            {...reachComparison}
            showBar
            redNumeric={redFighter?.reach_inches}
            blueNumeric={blueFighter?.reach_inches}
            advantageDiff={formatDiff(reachComparison.diff, '"')}
          />
          <StatRow
            label="WEIGHT"
            redValue={redFighter?.weight_lbs ? `${redFighter.weight_lbs} lbs` : null}
            blueValue={blueFighter?.weight_lbs ? `${blueFighter.weight_lbs} lbs` : null}
          />
          <StatRow
            label="STANCE"
            redValue={redFighter?.stance ?? null}
            blueValue={blueFighter?.stance ?? null}
          />
          <StatRow
            label="AGE"
            redValue={redFighter?.dob ? calculateAge(redFighter.dob)?.toString() ?? null : null}
            blueValue={blueFighter?.dob ? calculateAge(blueFighter.dob)?.toString() ?? null : null}
            {...ageComparison}
            advantageDiff={formatDiff(ageComparison.diff, ' yrs')}
          />
        </>
      )}

      {/* Record */}
      {enabledCategories.has('record') && (
        <>
          <SectionHeader
            title="RECORD"
            redCount={advantages.record.red}
            blueCount={advantages.record.blue}
          />
          <StatRow
            label="RECORD"
            redValue={redFighter ? formatRecord(redFighter.record_wins ?? 0, redFighter.record_losses ?? 0, redFighter.record_draws ?? 0) : null}
            blueValue={blueFighter ? formatRecord(blueFighter.record_wins ?? 0, blueFighter.record_losses ?? 0, blueFighter.record_draws ?? 0) : null}
          />
          {(() => {
            const winPctComparison = compareNumeric(redWinPct, blueWinPct);
            return (
              <StatRow
                label="WIN %"
                redValue={redWinPct !== null ? `${redWinPct}%` : null}
                blueValue={blueWinPct !== null ? `${blueWinPct}%` : null}
                {...winPctComparison}
                showBar
                redNumeric={redWinPct}
                blueNumeric={blueWinPct}
                advantageDiff={formatDiff(winPctComparison.diff, '%')}
              />
            );
          })()}
          {(() => {
            const winsComparison = compareNumeric(redFighter?.record_wins, blueFighter?.record_wins);
            return (
              <StatRow
                label="WINS"
                redValue={redFighter?.record_wins?.toString() ?? null}
                blueValue={blueFighter?.record_wins?.toString() ?? null}
                {...winsComparison}
                showBar
                redNumeric={redFighter?.record_wins}
                blueNumeric={blueFighter?.record_wins}
                advantageDiff={formatDiff(winsComparison.diff)}
              />
            );
          })()}
          {(() => {
            const lossesComparison = compareNumeric(redFighter?.record_losses, blueFighter?.record_losses, false);
            return (
              <StatRow
                label="LOSSES"
                redValue={redFighter?.record_losses?.toString() ?? null}
                blueValue={blueFighter?.record_losses?.toString() ?? null}
                {...lossesComparison}
                advantageDiff={formatDiff(lossesComparison.diff)}
              />
            );
          })()}
        </>
      )}

      {/* Striking */}
      {enabledCategories.has('striking') && (
        <>
          <SectionHeader
            title="STRIKING"
            redCount={advantages.striking.red}
            blueCount={advantages.striking.blue}
          />
          {(() => {
            const slpmComparison = compareNumeric(redFighter?.slpm, blueFighter?.slpm);
            return (
              <StatRow
                label="STR. LANDED/MIN"
                redValue={redFighter?.slpm?.toFixed(2) ?? null}
                blueValue={blueFighter?.slpm?.toFixed(2) ?? null}
                {...slpmComparison}
                showBar
                redNumeric={redFighter?.slpm}
                blueNumeric={blueFighter?.slpm}
                advantageDiff={formatDiff(slpmComparison.diff, '', 1)}
              />
            );
          })()}
          {(() => {
            const sapmComparison = compareNumeric(redFighter?.sapm, blueFighter?.sapm, false);
            return (
              <StatRow
                label="STR. ABSORBED/MIN"
                redValue={redFighter?.sapm?.toFixed(2) ?? null}
                blueValue={blueFighter?.sapm?.toFixed(2) ?? null}
                {...sapmComparison}
                showBar
                redNumeric={redFighter?.sapm}
                blueNumeric={blueFighter?.sapm}
                advantageDiff={formatDiff(sapmComparison.diff, '', 1)}
              />
            );
          })()}
          {(() => {
            const strAccComparison = compareNumeric(redFighter?.str_acc, blueFighter?.str_acc);
            return (
              <StatRow
                label="STR. ACCURACY"
                redValue={redFighter?.str_acc ? `${Math.round(redFighter.str_acc)}%` : null}
                blueValue={blueFighter?.str_acc ? `${Math.round(blueFighter.str_acc)}%` : null}
                {...strAccComparison}
                showBar
                redNumeric={redFighter?.str_acc}
                blueNumeric={blueFighter?.str_acc}
                advantageDiff={formatDiff(strAccComparison.diff, '%')}
              />
            );
          })()}
          {(() => {
            const strDefComparison = compareNumeric(redFighter?.str_def, blueFighter?.str_def);
            return (
              <StatRow
                label="STR. DEFENSE"
                redValue={redFighter?.str_def ? `${Math.round(redFighter.str_def)}%` : null}
                blueValue={blueFighter?.str_def ? `${Math.round(blueFighter.str_def)}%` : null}
                {...strDefComparison}
                showBar
                redNumeric={redFighter?.str_def}
                blueNumeric={blueFighter?.str_def}
                advantageDiff={formatDiff(strDefComparison.diff, '%')}
              />
            );
          })()}
        </>
      )}

      {/* Grappling */}
      {enabledCategories.has('grappling') && (
        <>
          <SectionHeader
            title="GRAPPLING"
            redCount={advantages.grappling.red}
            blueCount={advantages.grappling.blue}
          />
          {(() => {
            const tdAvgComparison = compareNumeric(redFighter?.td_avg, blueFighter?.td_avg);
            return (
              <StatRow
                label="TD AVG/15MIN"
                redValue={redFighter?.td_avg?.toFixed(2) ?? null}
                blueValue={blueFighter?.td_avg?.toFixed(2) ?? null}
                {...tdAvgComparison}
                showBar
                redNumeric={redFighter?.td_avg}
                blueNumeric={blueFighter?.td_avg}
                advantageDiff={formatDiff(tdAvgComparison.diff, '', 1)}
              />
            );
          })()}
          {(() => {
            const tdAccComparison = compareNumeric(redFighter?.td_acc, blueFighter?.td_acc);
            return (
              <StatRow
                label="TD ACCURACY"
                redValue={redFighter?.td_acc ? `${Math.round(redFighter.td_acc)}%` : null}
                blueValue={blueFighter?.td_acc ? `${Math.round(blueFighter.td_acc)}%` : null}
                {...tdAccComparison}
                showBar
                redNumeric={redFighter?.td_acc}
                blueNumeric={blueFighter?.td_acc}
                advantageDiff={formatDiff(tdAccComparison.diff, '%')}
              />
            );
          })()}
          {(() => {
            const tdDefComparison = compareNumeric(redFighter?.td_def, blueFighter?.td_def);
            return (
              <StatRow
                label="TD DEFENSE"
                redValue={redFighter?.td_def ? `${Math.round(redFighter.td_def)}%` : null}
                blueValue={blueFighter?.td_def ? `${Math.round(blueFighter.td_def)}%` : null}
                {...tdDefComparison}
                showBar
                redNumeric={redFighter?.td_def}
                blueNumeric={blueFighter?.td_def}
                advantageDiff={formatDiff(tdDefComparison.diff, '%')}
              />
            );
          })()}
          {(() => {
            const subAvgComparison = compareNumeric(redFighter?.sub_avg, blueFighter?.sub_avg);
            return (
              <StatRow
                label="SUB AVG/15MIN"
                redValue={redFighter?.sub_avg?.toFixed(2) ?? null}
                blueValue={blueFighter?.sub_avg?.toFixed(2) ?? null}
                {...subAvgComparison}
                showBar
                redNumeric={redFighter?.sub_avg}
                blueNumeric={blueFighter?.sub_avg}
                advantageDiff={formatDiff(subAvgComparison.diff, '', 1)}
              />
            );
          })()}
        </>
      )}

      {/* Finish Rate */}
      {enabledCategories.has('finish') && (
        <>
          <SectionHeader
            title="FINISH RATE"
            redCount={advantages.finish.red}
            blueCount={advantages.finish.blue}
          />
          {(() => {
            const koComparison = compareNumeric(redFighter?.ko_percentage, blueFighter?.ko_percentage);
            return (
              <StatRow
                label="KO/TKO %"
                redValue={redFighter?.ko_percentage ? `${Math.round(redFighter.ko_percentage)}%` : null}
                blueValue={blueFighter?.ko_percentage ? `${Math.round(blueFighter.ko_percentage)}%` : null}
                {...koComparison}
                showBar
                redNumeric={redFighter?.ko_percentage}
                blueNumeric={blueFighter?.ko_percentage}
                advantageDiff={formatDiff(koComparison.diff, '%')}
              />
            );
          })()}
          {(() => {
            const subPctComparison = compareNumeric(redFighter?.sub_percentage, blueFighter?.sub_percentage);
            return (
              <StatRow
                label="SUB %"
                redValue={redFighter?.sub_percentage ? `${Math.round(redFighter.sub_percentage)}%` : null}
                blueValue={blueFighter?.sub_percentage ? `${Math.round(blueFighter.sub_percentage)}%` : null}
                {...subPctComparison}
                showBar
                redNumeric={redFighter?.sub_percentage}
                blueNumeric={blueFighter?.sub_percentage}
                advantageDiff={formatDiff(subPctComparison.diff, '%')}
              />
            );
          })()}
          {(() => {
            const koWinsComparison = compareNumeric(redFighter?.ko_tko_wins, blueFighter?.ko_tko_wins);
            return (
              <StatRow
                label="KO WINS"
                redValue={redFighter?.ko_tko_wins?.toString() ?? null}
                blueValue={blueFighter?.ko_tko_wins?.toString() ?? null}
                {...koWinsComparison}
                showBar
                redNumeric={redFighter?.ko_tko_wins}
                blueNumeric={blueFighter?.ko_tko_wins}
                advantageDiff={formatDiff(koWinsComparison.diff)}
              />
            );
          })()}
          {(() => {
            const subWinsComparison = compareNumeric(redFighter?.submission_wins, blueFighter?.submission_wins);
            return (
              <StatRow
                label="SUB WINS"
                redValue={redFighter?.submission_wins?.toString() ?? null}
                blueValue={blueFighter?.submission_wins?.toString() ?? null}
                {...subWinsComparison}
                showBar
                redNumeric={redFighter?.submission_wins}
                blueNumeric={blueFighter?.submission_wins}
                advantageDiff={formatDiff(subWinsComparison.diff)}
              />
            );
          })()}
          {(() => {
            const decWinsComparison = compareNumeric(redFighter?.decision_wins, blueFighter?.decision_wins);
            return (
              <StatRow
                label="DEC WINS"
                redValue={redFighter?.decision_wins?.toString() ?? null}
                blueValue={blueFighter?.decision_wins?.toString() ?? null}
                {...decWinsComparison}
                showBar
                redNumeric={redFighter?.decision_wins}
                blueNumeric={blueFighter?.decision_wins}
                advantageDiff={formatDiff(decWinsComparison.diff)}
              />
            );
          })()}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  sectionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  sectionScore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sectionScoreText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sectionScoreDivider: {
    fontSize: 8,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  valueColumn: {
    flex: 1,
  },
  value: {
    fontSize: 16,
  },
  valueLeft: {
    textAlign: 'right',
    paddingRight: spacing.md,
  },
  valueRight: {
    textAlign: 'left',
    paddingLeft: spacing.md,
  },
  labelContainer: {
    minWidth: 120,
    alignItems: 'center',
  },
  label: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  diffText: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  miniBarTrack: {
    height: 3,
    marginTop: 6,
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  miniBar: {
    height: '100%',
    borderRadius: 1.5,
  },
  miniBarRed: {
    alignSelf: 'flex-end',
  },
  miniBarBlue: {
    alignSelf: 'flex-start',
  },
});
