import React from 'react';

interface IconProps {
  size?: number;
  color?: string;
}

export const CheckIcon: React.FC<IconProps> = ({ size = 24, color = 'white' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export const TargetIcon: React.FC<IconProps> = ({ size = 24, color = '#D11B2A' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
    <circle cx="12" cy="12" r="6" stroke={color} strokeWidth="2" />
    <circle cx="12" cy="12" r="2" fill={color} />
  </svg>
);

export const ChartIcon: React.FC<IconProps> = ({ size = 24, color = '#D11B2A' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="3" y="12" width="4" height="9" rx="1" fill={color} opacity="0.5" />
    <rect x="10" y="8" width="4" height="13" rx="1" fill={color} opacity="0.75" />
    <rect x="17" y="3" width="4" height="18" rx="1" fill={color} />
  </svg>
);

export const TrophyIcon: React.FC<IconProps> = ({ size = 24, color = '#D11B2A' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M6 9H4a2 2 0 01-2-2V5a2 2 0 012-2h2M18 9h2a2 2 0 002-2V5a2 2 0 00-2-2h-2"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M6 3h12v8a6 6 0 01-12 0V3z"
      stroke={color}
      strokeWidth="2"
      fill={color}
      fillOpacity="0.2"
    />
    <path d="M12 17v4M8 21h8" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const FireIcon: React.FC<IconProps> = ({ size = 24, color = '#D11B2A' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M12 2C12 2 8 6 8 10C8 12 9 14 12 16C15 14 16 12 16 10C16 6 12 2 12 2Z"
      fill={color}
      fillOpacity="0.3"
    />
    <path
      d="M12 22C7.58 22 4 18.42 4 14C4 10 7 7 9 5C9 8 11 10 12 10C13 10 15 8 15 5C17 7 20 10 20 14C20 18.42 16.42 22 12 22Z"
      fill={color}
    />
  </svg>
);

export const UserIcon: React.FC<IconProps> = ({ size = 24, color = '#6B6B73' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="8" r="4" fill={color} />
    <path
      d="M4 20C4 16.6863 7.58172 14 12 14C16.4183 14 20 16.6863 20 20"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);
