import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';

interface OctagonProps {
  size: number;
  strokeColor?: string;
  strokeWidth?: number;
  fillColor?: string;
  animate?: boolean;
  glowColor?: string;
}

export const Octagon: React.FC<OctagonProps> = ({
  size,
  strokeColor = '#D11B2A',
  strokeWidth = 4,
  fillColor = 'transparent',
  animate = true,
  glowColor = 'rgba(209, 27, 42, 0.3)',
}) => {
  const frame = useCurrentFrame();

  // Calculate octagon points (regular octagon inscribed in a square)
  const center = size / 2;
  const radius = size / 2 - strokeWidth;

  // Octagon vertices (8 points, starting from top-right going clockwise)
  const points: [number, number][] = [];
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI / 8) + (i * Math.PI / 4); // Start at 22.5 degrees
    const x = center + radius * Math.cos(angle);
    const y = center + radius * Math.sin(angle);
    points.push([x, y]);
  }

  // Create SVG path
  const pathD = points
    .map((point, i) => `${i === 0 ? 'M' : 'L'} ${point[0]} ${point[1]}`)
    .join(' ') + ' Z';

  // Animation: draw stroke
  const strokeProgress = animate
    ? interpolate(frame, [0, 30], [0, 1], { extrapolateRight: 'clamp' })
    : 1;

  // Calculate stroke dasharray for animation
  const circumference = 8 * (2 * radius * Math.sin(Math.PI / 8)); // Approximate perimeter
  const strokeDashoffset = circumference * (1 - strokeProgress);

  // Glow pulse animation
  const glowOpacity = animate
    ? interpolate(frame % 60, [0, 30, 60], [0.3, 0.6, 0.3])
    : 0.4;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Glow filter */}
      <defs>
        <filter id="octagon-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Glow layer */}
      <path
        d={pathD}
        fill="none"
        stroke={glowColor}
        strokeWidth={strokeWidth * 3}
        opacity={glowOpacity}
        filter="url(#octagon-glow)"
      />

      {/* Main octagon */}
      <path
        d={pathD}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
      />

      {/* Inner octagon (smaller) */}
      <path
        d={points
          .map((point, i) => {
            const innerRadius = radius * 0.85;
            const angle = (Math.PI / 8) + (i * Math.PI / 4);
            const x = center + innerRadius * Math.cos(angle);
            const y = center + innerRadius * Math.sin(angle);
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
          })
          .join(' ') + ' Z'}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth / 2}
        opacity={0.4}
        strokeDasharray={circumference * 0.85}
        strokeDashoffset={circumference * 0.85 * (1 - strokeProgress)}
      />
    </svg>
  );
};

// Simple static octagon for backgrounds
export const OctagonOutline: React.FC<{
  size: number;
  color?: string;
  opacity?: number;
}> = ({ size, color = '#D11B2A', opacity = 0.1 }) => {
  const center = size / 2;
  const radius = size / 2 - 2;

  const points: string[] = [];
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI / 8) + (i * Math.PI / 4);
    const x = center + radius * Math.cos(angle);
    const y = center + radius * Math.sin(angle);
    points.push(`${x},${y}`);
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <polygon
        points={points.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth={2}
        opacity={opacity}
      />
    </svg>
  );
};
