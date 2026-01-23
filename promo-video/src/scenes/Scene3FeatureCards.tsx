import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  spring,
  useVideoConfig,
  Easing,
} from 'remotion';
import { SceneProps } from '../config/video';
import { theme, shadows, fontFamily } from '../ui/theme';
import { TitleText, BodyText } from '../ui/atoms';
import { PhoneMockup } from '../ui/PhoneMockup';
import { scaled, scaledFont } from '../ui/layout';

const screenshots = [
  { file: 'home.png', label: 'Home' },
  { file: 'pick.png', label: 'Events' },
  { file: 'stats.png', label: 'Stats' },
  { file: 'leaderboards.png', label: 'Rankings' },
];

export const Scene3FeatureCards: React.FC<SceneProps> = ({ start, end, format, scale }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const localFrame = frame - start;

  const isPortrait = format === 'portrait';

  // Header animation
  const headerProgress = spring({
    frame: localFrame,
    fps,
    config: { damping: 15, stiffness: 100 },
  });
  const headerOpacity = interpolate(localFrame, [0, 15], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const headerY = interpolate(headerProgress, [0, 1], [-30, 0]);

  // Phone mockup size
  const phoneWidth = isPortrait ? 220 : 180;

  // Calculate which phone is "active" based on frame
  const sceneDuration = 90; // frames
  const activeIndex = Math.min(
    Math.floor(localFrame / (sceneDuration / 4)),
    screenshots.length - 1
  );

  return (
    <AbsoluteFill style={{ backgroundColor: theme.colors.bg }}>
      {/* Subtle background gradient */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(135deg, rgba(209, 27, 42, 0.03) 0%, transparent 50%, rgba(29, 78, 216, 0.03) 100%)`,
        }}
      />

      <AbsoluteFill
        style={{
          padding: `${scaled(isPortrait ? 60 : 50, scale)}px ${scaled(width * 0.04, 1)}px`,
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            opacity: headerOpacity,
            transform: `translateY(${headerY}px)`,
            marginBottom: scaled(30, scale),
            textAlign: 'center',
          }}
        >
          <TitleText size={48} scale={scale} style={{ textAlign: 'center' }}>
            Your Fight Night,
          </TitleText>
          <TitleText size={48} scale={scale} color={theme.colors.accent} style={{ textAlign: 'center' }}>
            Upgraded.
          </TitleText>
        </div>

        {/* Phone mockups carousel */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
          }}
        >
          {screenshots.map((screenshot, index) => {
            const delay = 5 + index * 15;

            // Staggered entrance animation
            const entranceProgress = spring({
              frame: localFrame - delay,
              fps,
              config: { damping: 20, stiffness: 80 },
            });

            // Position calculation for fan-out effect
            const baseOffset = (index - 1.5) * scaled(160, scale);
            const xOffset = interpolate(entranceProgress, [0, 1], [0, baseOffset]);
            const yOffset = Math.abs(index - 1.5) * scaled(30, scale) * entranceProgress;

            // Rotation for fan effect
            const baseRotation = (index - 1.5) * 8;
            const rotation = interpolate(entranceProgress, [0, 1], [0, baseRotation]);

            // Scale down side phones
            const isCenter = index === 1 || index === 2;
            const baseScale = isCenter ? 1 : 0.9;
            const phoneScale = interpolate(entranceProgress, [0, 1], [0.5, baseScale]);

            // Opacity
            const opacity = interpolate(entranceProgress, [0, 0.5], [0, 1], {
              extrapolateRight: 'clamp',
            });

            // Z-index based on position (center phones on top)
            const zIndex = isCenter ? 10 : 5;

            // Active indicator pulse
            const isActive = index === activeIndex;
            const activePulse = isActive
              ? interpolate((localFrame % 30), [0, 15, 30], [1, 1.02, 1])
              : 1;

            return (
              <div
                key={index}
                style={{
                  position: 'absolute',
                  transform: `
                    translateX(${xOffset}px)
                    translateY(${yOffset}px)
                    rotate(${rotation}deg)
                    scale(${phoneScale * activePulse})
                  `,
                  opacity,
                  zIndex,
                  transition: 'box-shadow 0.3s',
                }}
              >
                <PhoneMockup
                  screenshot={screenshot.file}
                  scale={scale}
                  width={phoneWidth}
                />

                {/* Label under phone */}
                <div
                  style={{
                    textAlign: 'center',
                    marginTop: scaled(16, scale),
                    opacity: interpolate(entranceProgress, [0.5, 1], [0, 1], {
                      extrapolateLeft: 'clamp',
                    }),
                  }}
                >
                  <BodyText
                    size={16}
                    scale={scale}
                    color={isActive ? theme.colors.accent : theme.colors.muted}
                    style={{
                      fontWeight: isActive ? 700 : 500,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                    }}
                  >
                    {screenshot.label}
                  </BodyText>
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
