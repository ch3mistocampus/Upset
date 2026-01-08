/**
 * MMA Glove Icon - Custom SVG icon
 * Matches Heroicons outline style (24x24, 1.5px stroke)
 */

import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface MmaGloveIconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function MmaGloveIcon({
  size = 24,
  color = 'currentColor',
  strokeWidth = 1.5,
}: MmaGloveIconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* MMA glove shape - boxing/MMA style glove outline */}
      <Path d="M7 13.5V8.5C7 7.12 8.12 6 9.5 6h5C15.88 6 17 7.12 17 8.5v5" />
      {/* Glove body/padding */}
      <Path d="M7 13.5C7 16.5 8.5 18 12 18s5-1.5 5-4.5" />
      {/* Wrist wrap */}
      <Path d="M8 18v2c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2" />
      {/* Thumb */}
      <Path d="M7 10.5C5.5 10.5 5 11.5 5 12.5s.5 2 1.5 2H7" />
      {/* Knuckle lines */}
      <Path d="M9.5 6v2M12 6v2M14.5 6v2" />
    </Svg>
  );
}
