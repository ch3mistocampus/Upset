/**
 * TaleOfTheTape - Classic boxing/MMA style stat comparison
 * Clean symmetrical layout with stats in center column
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../lib/theme';
import { spacing, typography, radius, fighterColors } from '../../lib/tokens';
import { UFCFighter } from '../../types/database';
import {
  formatHeight,
  formatReach,
  calculateAge,
} from '../../hooks/useFighterStats';
import { StatCategory } from './CategoryToggleRow';

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
}

function StatRow({ label, redValue, blueValue, redAdvantage, blueAdvantage }: StatRowProps): React.ReactElement {
  const { colors, isDark } = useTheme();
  const redColor = isDark ? fighterColors.red.solid.dark : fighterColors.red.solid.light;
  const blueColor = isDark ? fighterColors.blue.solid.dark : fighterColors.blue.solid.light;

  return (
    <View style={styles.statRow}>
      <View style={styles.valueContainer}>
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
        {redAdvantage && <View style={[styles.advantageDot, { backgroundColor: redColor }]} />}
      </View>

      <View style={[styles.labelContainer, { backgroundColor: colors.surfaceAlt }]}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      </View>

      <View style={styles.valueContainer}>
        {blueAdvantage && <View style={[styles.advantageDot, { backgroundColor: blueColor }]} />}
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
      </View>
    </View>
  );
}

interface SectionHeaderProps {
  title: string;
}

function SectionHeader({ title }: SectionHeaderProps): React.ReactElement {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionLine, { backgroundColor: colors.border }]} />
      <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>{title}</Text>
      <View style={[styles.sectionLine, { backgroundColor: colors.border }]} />
    </View>
  );
}

export function TaleOfTheTape({
  redFighter,
  blueFighter,
  enabledCategories,
}: TaleOfTheTapeProps): React.ReactElement {
  const { colors } = useTheme();

  // Helper to compare numeric values
  const compareNumeric = (
    red: number | null | undefined,
    blue: number | null | undefined,
    higherIsBetter = true
  ): { redAdvantage: boolean; blueAdvantage: boolean } => {
    if (red == null || blue == null || red === blue) {
      return { redAdvantage: false, blueAdvantage: false };
    }
    if (higherIsBetter) {
      return { redAdvantage: red > blue, blueAdvantage: blue > red };
    }
    return { redAdvantage: red < blue, blueAdvantage: blue < red };
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

  const redWinPct = redFighter ? getWinPct(redFighter.record_wins, redFighter.record_losses, redFighter.record_draws) : null;
  const blueWinPct = blueFighter ? getWinPct(blueFighter.record_wins, blueFighter.record_losses, blueFighter.record_draws) : null;

  return (
    <View style={styles.container}>
      {/* Physical */}
      {enabledCategories.has('physical') && (
        <>
          <SectionHeader title="PHYSICAL" />
          <StatRow
            label="HEIGHT"
            redValue={formatHeight(redFighter?.height_inches ?? null)}
            blueValue={formatHeight(blueFighter?.height_inches ?? null)}
            {...compareNumeric(redFighter?.height_inches, blueFighter?.height_inches)}
          />
          <StatRow
            label="REACH"
            redValue={formatReach(redFighter?.reach_inches ?? null)}
            blueValue={formatReach(blueFighter?.reach_inches ?? null)}
            {...compareNumeric(redFighter?.reach_inches, blueFighter?.reach_inches)}
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
            {...compareNumeric(
              redFighter?.dob ? calculateAge(redFighter.dob) : null,
              blueFighter?.dob ? calculateAge(blueFighter.dob) : null,
              false
            )}
          />
        </>
      )}

      {/* Record */}
      {enabledCategories.has('record') && (
        <>
          <SectionHeader title="RECORD" />
          <StatRow
            label="RECORD"
            redValue={redFighter ? formatRecord(redFighter.record_wins, redFighter.record_losses, redFighter.record_draws) : null}
            blueValue={blueFighter ? formatRecord(blueFighter.record_wins, blueFighter.record_losses, blueFighter.record_draws) : null}
          />
          <StatRow
            label="WIN %"
            redValue={redWinPct !== null ? `${redWinPct}%` : null}
            blueValue={blueWinPct !== null ? `${blueWinPct}%` : null}
            {...compareNumeric(redWinPct, blueWinPct)}
          />
          <StatRow
            label="WINS"
            redValue={redFighter?.record_wins.toString() ?? null}
            blueValue={blueFighter?.record_wins.toString() ?? null}
            {...compareNumeric(redFighter?.record_wins, blueFighter?.record_wins)}
          />
          <StatRow
            label="LOSSES"
            redValue={redFighter?.record_losses.toString() ?? null}
            blueValue={blueFighter?.record_losses.toString() ?? null}
            {...compareNumeric(redFighter?.record_losses, blueFighter?.record_losses, false)}
          />
        </>
      )}

      {/* Striking */}
      {enabledCategories.has('striking') && (
        <>
          <SectionHeader title="STRIKING" />
          <StatRow
            label="SIG. STR. LANDED"
            redValue={redFighter?.slpm?.toFixed(2) ?? null}
            blueValue={blueFighter?.slpm?.toFixed(2) ?? null}
            {...compareNumeric(redFighter?.slpm, blueFighter?.slpm)}
          />
          <StatRow
            label="SIG. STR. ABSORBED"
            redValue={redFighter?.sapm?.toFixed(2) ?? null}
            blueValue={blueFighter?.sapm?.toFixed(2) ?? null}
            {...compareNumeric(redFighter?.sapm, blueFighter?.sapm, false)}
          />
          <StatRow
            label="STR. ACCURACY"
            redValue={redFighter?.str_acc ? `${Math.round(redFighter.str_acc)}%` : null}
            blueValue={blueFighter?.str_acc ? `${Math.round(blueFighter.str_acc)}%` : null}
            {...compareNumeric(redFighter?.str_acc, blueFighter?.str_acc)}
          />
          <StatRow
            label="STR. DEFENSE"
            redValue={redFighter?.str_def ? `${Math.round(redFighter.str_def)}%` : null}
            blueValue={blueFighter?.str_def ? `${Math.round(blueFighter.str_def)}%` : null}
            {...compareNumeric(redFighter?.str_def, blueFighter?.str_def)}
          />
        </>
      )}

      {/* Grappling */}
      {enabledCategories.has('grappling') && (
        <>
          <SectionHeader title="GRAPPLING" />
          <StatRow
            label="TD AVG"
            redValue={redFighter?.td_avg?.toFixed(2) ?? null}
            blueValue={blueFighter?.td_avg?.toFixed(2) ?? null}
            {...compareNumeric(redFighter?.td_avg, blueFighter?.td_avg)}
          />
          <StatRow
            label="TD ACCURACY"
            redValue={redFighter?.td_acc ? `${Math.round(redFighter.td_acc)}%` : null}
            blueValue={blueFighter?.td_acc ? `${Math.round(blueFighter.td_acc)}%` : null}
            {...compareNumeric(redFighter?.td_acc, blueFighter?.td_acc)}
          />
          <StatRow
            label="TD DEFENSE"
            redValue={redFighter?.td_def ? `${Math.round(redFighter.td_def)}%` : null}
            blueValue={blueFighter?.td_def ? `${Math.round(blueFighter.td_def)}%` : null}
            {...compareNumeric(redFighter?.td_def, blueFighter?.td_def)}
          />
          <StatRow
            label="SUB AVG"
            redValue={redFighter?.sub_avg?.toFixed(2) ?? null}
            blueValue={blueFighter?.sub_avg?.toFixed(2) ?? null}
            {...compareNumeric(redFighter?.sub_avg, blueFighter?.sub_avg)}
          />
        </>
      )}

      {/* Finish Rate */}
      {enabledCategories.has('finish') && (
        <>
          <SectionHeader title="FINISH RATE" />
          <StatRow
            label="KO/TKO %"
            redValue={redFighter?.ko_percentage ? `${Math.round(redFighter.ko_percentage)}%` : null}
            blueValue={blueFighter?.ko_percentage ? `${Math.round(blueFighter.ko_percentage)}%` : null}
            {...compareNumeric(redFighter?.ko_percentage, blueFighter?.ko_percentage)}
          />
          <StatRow
            label="SUB %"
            redValue={redFighter?.sub_percentage ? `${Math.round(redFighter.sub_percentage)}%` : null}
            blueValue={blueFighter?.sub_percentage ? `${Math.round(blueFighter.sub_percentage)}%` : null}
            {...compareNumeric(redFighter?.sub_percentage, blueFighter?.sub_percentage)}
          />
          <StatRow
            label="KO WINS"
            redValue={redFighter?.ko_tko_wins?.toString() ?? null}
            blueValue={blueFighter?.ko_tko_wins?.toString() ?? null}
            {...compareNumeric(redFighter?.ko_tko_wins, blueFighter?.ko_tko_wins)}
          />
          <StatRow
            label="SUB WINS"
            redValue={redFighter?.submission_wins?.toString() ?? null}
            blueValue={blueFighter?.submission_wins?.toString() ?? null}
            {...compareNumeric(redFighter?.submission_wins, blueFighter?.submission_wins)}
          />
          <StatRow
            label="DEC WINS"
            redValue={redFighter?.decision_wins?.toString() ?? null}
            blueValue={blueFighter?.decision_wins?.toString() ?? null}
            {...compareNumeric(redFighter?.decision_wins, blueFighter?.decision_wins)}
          />
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
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  sectionLine: {
    flex: 1,
    height: 1,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    paddingHorizontal: spacing.sm,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  valueContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  value: {
    flex: 1,
    fontSize: 15,
  },
  valueLeft: {
    textAlign: 'right',
    paddingRight: spacing.sm,
  },
  valueRight: {
    textAlign: 'left',
    paddingLeft: spacing.sm,
  },
  labelContainer: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    minWidth: 110,
    alignItems: 'center',
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  advantageDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 4,
  },
});
