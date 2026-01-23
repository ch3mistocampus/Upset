import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  spring,
  useVideoConfig,
  Easing,
  Img,
  staticFile,
} from 'remotion';
import { SceneProps } from '../config/video';
import { theme, fontFamily } from '../ui/theme';
import { TitleText } from '../ui/atoms';
import { scaled, scaledFont } from '../ui/layout';

// Floating particle configuration
const particles = [
  { x: 8, delay: 0, size: 4, speed: 0.85 },
  { x: 22, delay: 15, size: 3, speed: 1.0 },
  { x: 38, delay: 8, size: 5, speed: 0.65 },
  { x: 52, delay: 30, size: 3, speed: 0.9 },
  { x: 68, delay: 5, size: 4, speed: 0.75 },
  { x: 82, delay: 20, size: 3, speed: 1.05 },
  { x: 95, delay: 12, size: 4, speed: 0.8 },
];

export const SceneFighterStats: React.FC<SceneProps> = ({ start, end, format, scale }) => {
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

  // Phone mockup dimensions - sized to fit within frame
  const phoneWidth = isPortrait ? width * 0.65 : width * 0.36;
  const aspectRatio = 19.5 / 9; // iPhone aspect ratio
  const phoneHeight = phoneWidth * aspectRatio;
  const borderRadius = scaled(48, scale);
  const bezelWidth = scaled(12, scale);

  // Screen dimensions
  const screenWidth = phoneWidth - bezelWidth * 2;
  const screenHeight = phoneHeight - bezelWidth * 2;

  // Phone entrance animation
  const phoneProgress = spring({
    frame: localFrame - 10,
    fps,
    config: { damping: 18, stiffness: 100 },
  });

  const phoneScale = interpolate(phoneProgress, [0, 1], [0.85, 1]);
  const phoneOpacity = interpolate(localFrame, [10, 25], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Scroll animation for the stats screen - slower
  const scrollProgress = interpolate(
    localFrame,
    [25, 55, 65, 85],
    [0, -80, -80, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.inOut(Easing.cubic),
    }
  );

  // Shimmer animation - sweeps across phone screen
  const shimmerProgress = interpolate(
    localFrame,
    [20, 50],
    [-100, 200],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.inOut(Easing.quad),
    }
  );

  // 3D tilt animation - subtle rotation on entrance
  const tiltX = interpolate(phoneProgress, [0, 1], [10, 0]);
  const tiltY = interpolate(
    localFrame,
    [10, 40, 70, 90],
    [6, 0, 0, -4],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Background pulse animation
  const pulseProgress = interpolate(
    localFrame % 90,
    [0, 45, 90],
    [0.03, 0.07, 0.03],
    { extrapolateRight: 'clamp' }
  );

  // Tap ripple animation
  const rippleStart = 35;
  const rippleOpacity = interpolate(
    localFrame,
    [rippleStart, rippleStart + 8, rippleStart + 20],
    [0, 0.6, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const rippleScale = interpolate(
    localFrame,
    [rippleStart, rippleStart + 20],
    [0.3, 1.5],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <AbsoluteFill style={{ backgroundColor: theme.colors.bg }}>
      {/* Pulsing background gradient */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at 50% 30%, rgba(209, 27, 42, ${pulseProgress}) 0%, transparent 60%)`,
        }}
      />

      {/* Floating particles */}
      {particles.map((particle, index) => {
        const particleY = interpolate(
          localFrame - particle.delay,
          [0, 90 / particle.speed],
          [height + 20, -20],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
        );
        const particleOpacity = interpolate(
          localFrame - particle.delay,
          [0, 15, 75 / particle.speed, 90 / particle.speed],
          [0, 0.4, 0.4, 0],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
        );
        return (
          <div
            key={index}
            style={{
              position: 'absolute',
              left: `${particle.x}%`,
              top: particleY,
              width: scaled(particle.size, scale),
              height: scaled(particle.size, scale),
              borderRadius: '50%',
              backgroundColor: theme.colors.accent,
              opacity: particleOpacity,
              pointerEvents: 'none',
            }}
          />
        );
      })}

      <AbsoluteFill
        style={{
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: scaled(40, scale),
        }}
      >
        {/* Header with staggered letter animation */}
        <div
          style={{
            marginBottom: scaled(30, scale),
            textAlign: 'center',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', whiteSpace: 'nowrap' }}>
            {'Compare Fighter Stats'.split('').map((letter, index) => {
              const letterDelay = index * 1.5;
              const letterOpacity = interpolate(
                localFrame,
                [letterDelay, 8 + letterDelay],
                [0, 1],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
              );
              const letterY = interpolate(
                localFrame,
                [letterDelay, 8 + letterDelay],
                [25, 0],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.5)) }
              );
              return (
                <span
                  key={index}
                  style={{
                    display: 'inline-block',
                    fontFamily: fontFamily.display,
                    fontSize: scaledFont(52, scale),
                    fontWeight: 700,
                    color: theme.colors.accent,
                    textTransform: 'uppercase',
                    opacity: letterOpacity,
                    transform: `translateY(${letterY}px)`,
                  }}
                >
                  {letter === ' ' ? '\u00A0' : letter}
                </span>
              );
            })}
          </div>
          <div
            style={{
              fontFamily: fontFamily.body,
              fontSize: scaledFont(20, scale),
              color: theme.colors.muted,
              marginTop: scaled(8, scale),
              opacity: headerOpacity,
              transform: `translateY(${headerY}px)`,
            }}
          >
            Make informed picks with detailed analytics
          </div>
        </div>

        {/* Phone mockup wrapper - contains both clipping area and buttons */}
        <div
          style={{
            width: phoneWidth,
            height: phoneHeight,
            position: 'relative',
            transform: `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(${phoneScale})`,
            opacity: phoneOpacity,
            overflow: 'hidden',
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Screen glow effect */}
          <div
            style={{
              position: 'absolute',
              top: '10%',
              left: '10%',
              width: '80%',
              height: '80%',
              background: `radial-gradient(ellipse at center, rgba(255, 255, 255, 0.15) 0%, transparent 70%)`,
              filter: `blur(${scaled(40, scale)}px)`,
              pointerEvents: 'none',
            }}
          />

          {/* Dynamic shadow - moves with tilt */}
          <div
            style={{
              position: 'absolute',
              top: scaled(20, scale),
              left: scaled(20, scale),
              width: phoneWidth - scaled(40, scale),
              height: phoneHeight - scaled(40, scale),
              borderRadius,
              background: 'rgba(0, 0, 0, 0.4)',
              filter: `blur(${scaled(30, scale)}px)`,
              transform: `translateX(${tiltY * 3}px) translateY(${scaled(40, scale) + tiltX * 2}px)`,
              zIndex: -1,
            }}
          />

          {/* Phone frame with strict clipping */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: phoneWidth,
              height: phoneHeight,
              borderRadius,
              overflow: 'hidden',
              clipPath: `inset(0 round ${borderRadius}px)`,
              backgroundColor: '#1A1A1C',
              boxShadow: `
                0 ${scaled(10, scale)}px ${scaled(30, scale)}px rgba(0, 0, 0, 0.3)
              `,
            }}
          >
            {/* Screen area with content */}
            <div
              style={{
                position: 'absolute',
                top: bezelWidth,
                left: bezelWidth,
                width: screenWidth,
                height: screenHeight,
                borderRadius: borderRadius - bezelWidth / 2,
                overflow: 'hidden',
                clipPath: `inset(0 round ${borderRadius - bezelWidth / 2}px)`,
                backgroundColor: theme.colors.bg,
              }}
            >
              {/* Screenshot with scroll animation */}
              <Img
                src={staticFile('screenshots/fighter-comparison.png')}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: 'auto',
                  transform: `translateY(${scrollProgress}px)`,
                }}
              />

              {/* Shimmer overlay */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  background: `linear-gradient(
                    105deg,
                    transparent ${shimmerProgress - 30}%,
                    rgba(255, 255, 255, 0.15) ${shimmerProgress - 10}%,
                    rgba(255, 255, 255, 0.25) ${shimmerProgress}%,
                    rgba(255, 255, 255, 0.15) ${shimmerProgress + 10}%,
                    transparent ${shimmerProgress + 30}%
                  )`,
                  pointerEvents: 'none',
                }}
              />

              {/* Tap ripple effect */}
              <div
                style={{
                  position: 'absolute',
                  top: '40%',
                  left: '50%',
                  width: scaled(80, scale),
                  height: scaled(80, scale),
                  borderRadius: '50%',
                  border: `2px solid ${theme.colors.accent}`,
                  transform: `translate(-50%, -50%) scale(${rippleScale})`,
                  opacity: rippleOpacity,
                  pointerEvents: 'none',
                }}
              />
            </div>
          </div>

          {/* Side button (right) - outside clipping container */}
          <div
            style={{
              position: 'absolute',
              right: -scaled(3, scale),
              top: scaled(180, scale),
              width: scaled(4, scale),
              height: scaled(70, scale),
              backgroundColor: '#2A2A2C',
              borderRadius: `0 ${scaled(2, scale)}px ${scaled(2, scale)}px 0`,
            }}
          />
          {/* Volume buttons (left) - outside clipping container */}
          <div
            style={{
              position: 'absolute',
              left: -scaled(3, scale),
              top: scaled(130, scale),
              width: scaled(4, scale),
              height: scaled(40, scale),
              backgroundColor: '#2A2A2C',
              borderRadius: `${scaled(2, scale)}px 0 0 ${scaled(2, scale)}px`,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: -scaled(3, scale),
              top: scaled(180, scale),
              width: scaled(4, scale),
              height: scaled(70, scale),
              backgroundColor: '#2A2A2C',
              borderRadius: `${scaled(2, scale)}px 0 0 ${scaled(2, scale)}px`,
            }}
          />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
