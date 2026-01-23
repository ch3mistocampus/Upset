import React from 'react';
import { Img, staticFile } from 'remotion';
import { theme, shadows } from './theme';
import { scaled } from './layout';

interface PhoneMockupProps {
  screenshot: string;
  scale?: number;
  width?: number;
  style?: React.CSSProperties;
  showNotch?: boolean;
}

export const PhoneMockup: React.FC<PhoneMockupProps> = ({
  screenshot,
  scale = 1,
  width = 280,
  style,
  showNotch = true,
}) => {
  const scaledWidth = scaled(width, scale);
  const aspectRatio = 844 / 390; // iPhone 14 Pro aspect ratio
  const scaledHeight = scaledWidth * aspectRatio;
  const borderRadius = scaled(40, scale);
  const bezelWidth = scaled(8, scale);

  return (
    <div
      style={{
        width: scaledWidth,
        height: scaledHeight,
        position: 'relative',
        ...style,
      }}
    >
      {/* Phone frame (bezel) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius,
          backgroundColor: '#1A1A1C',
          boxShadow: `
            0 ${scaled(25, scale)}px ${scaled(50, scale)}px rgba(0, 0, 0, 0.3),
            0 ${scaled(10, scale)}px ${scaled(20, scale)}px rgba(0, 0, 0, 0.2),
            inset 0 ${scaled(1, scale)}px ${scaled(1, scale)}px rgba(255, 255, 255, 0.1)
          `,
        }}
      />

      {/* Screen area */}
      <div
        style={{
          position: 'absolute',
          top: bezelWidth,
          left: bezelWidth,
          right: bezelWidth,
          bottom: bezelWidth,
          borderRadius: borderRadius - bezelWidth / 2,
          overflow: 'hidden',
          backgroundColor: theme.colors.bg,
        }}
      >
        {/* Screenshot */}
        <Img
          src={staticFile(`screenshots/${screenshot}`)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'top',
          }}
        />
      </div>

      {/* Dynamic Island / Notch */}
      {showNotch && (
        <div
          style={{
            position: 'absolute',
            top: bezelWidth + scaled(10, scale),
            left: '50%',
            transform: 'translateX(-50%)',
            width: scaled(90, scale),
            height: scaled(28, scale),
            backgroundColor: '#000000',
            borderRadius: scaled(14, scale),
          }}
        />
      )}

      {/* Side button (right) */}
      <div
        style={{
          position: 'absolute',
          right: -scaled(2, scale),
          top: scaled(140, scale),
          width: scaled(3, scale),
          height: scaled(50, scale),
          backgroundColor: '#2A2A2C',
          borderRadius: `0 ${scaled(2, scale)}px ${scaled(2, scale)}px 0`,
        }}
      />

      {/* Volume buttons (left) */}
      <div
        style={{
          position: 'absolute',
          left: -scaled(2, scale),
          top: scaled(100, scale),
          width: scaled(3, scale),
          height: scaled(30, scale),
          backgroundColor: '#2A2A2C',
          borderRadius: `${scaled(2, scale)}px 0 0 ${scaled(2, scale)}px`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: -scaled(2, scale),
          top: scaled(140, scale),
          width: scaled(3, scale),
          height: scaled(50, scale),
          backgroundColor: '#2A2A2C',
          borderRadius: `${scaled(2, scale)}px 0 0 ${scaled(2, scale)}px`,
        }}
      />
    </div>
  );
};
