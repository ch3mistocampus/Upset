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

const screens = [
  { file: 'home.png', label: 'Home', description: 'Your fight night hub' },
  { file: 'discover-feed.png', label: 'Feed', description: 'See what the community is picking' },
  { file: 'bigfrank-stats.png', label: 'Stats', description: 'Track your prediction accuracy' },
  { file: 'rankings.png', label: 'Rankings', description: 'Climb the leaderboards' },
];

// Floating particle configuration
const particles = [
  { x: 10, delay: 0, size: 4, speed: 0.8 },
  { x: 25, delay: 20, size: 3, speed: 1.0 },
  { x: 40, delay: 10, size: 5, speed: 0.6 },
  { x: 55, delay: 35, size: 3, speed: 0.9 },
  { x: 70, delay: 5, size: 4, speed: 0.7 },
  { x: 85, delay: 25, size: 3, speed: 1.1 },
  { x: 15, delay: 40, size: 2, speed: 0.85 },
  { x: 92, delay: 15, size: 4, speed: 0.75 },
];

export const Scene3AppShowcase: React.FC<SceneProps> = ({ start, end, format, scale }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const localFrame = frame - start;
  const sceneDuration = end - start;

  const isPortrait = format === 'portrait';

  // Each screen gets equal time
  const framesPerScreen = sceneDuration / screens.length;

  // Calculate which screen is currently showing
  const currentScreenIndex = Math.min(
    Math.floor(localFrame / framesPerScreen),
    screens.length - 1
  );

  // Local frame within current screen
  const screenLocalFrame = localFrame - currentScreenIndex * framesPerScreen;

  // Phone mockup dimensions - sized to fit within frame
  const phoneWidth = isPortrait ? width * 0.65 : width * 0.35;
  const aspectRatio = 19.5 / 9; // iPhone aspect ratio
  const phoneHeight = phoneWidth * aspectRatio;
  const borderRadius = scaled(48, scale);
  const bezelWidth = scaled(12, scale);

  // Screen content dimensions
  const screenWidth = phoneWidth - bezelWidth * 2;
  const screenHeight = phoneHeight - bezelWidth * 2;

  // Scrolling animation - slower, gentle scroll down then back
  // Use simple interpolation: scroll down in first half, scroll back in second half
  const scrollProgress = interpolate(
    screenLocalFrame,
    [0, framesPerScreen * 0.5, framesPerScreen],
    [0, -60, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.inOut(Easing.cubic),
    }
  );

  // Phone entrance animation
  const entranceProgress = spring({
    frame: screenLocalFrame,
    fps,
    config: { damping: 18, stiffness: 90 },
  });

  const phoneScale = interpolate(entranceProgress, [0, 1], [0.92, 1]);
  const phoneOpacity = interpolate(screenLocalFrame, [0, 12], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // 3D tilt animation - subtle rotation on entrance
  const tiltX = interpolate(entranceProgress, [0, 1], [8, 0]); // Tilt forward then straighten
  const tiltY = interpolate(
    screenLocalFrame,
    [0, framesPerScreen * 0.3, framesPerScreen * 0.7, framesPerScreen],
    [5, 0, 0, -5],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Background pulse animation
  const pulseProgress = interpolate(
    localFrame % 90, // Cycle every 3 seconds
    [0, 45, 90],
    [0.03, 0.06, 0.03],
    { extrapolateRight: 'clamp' }
  );

  // Tap ripple animation - appears mid-screen
  const rippleStart = 25;
  const rippleOpacity = interpolate(
    screenLocalFrame,
    [rippleStart, rippleStart + 8, rippleStart + 20],
    [0, 0.6, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const rippleScale = interpolate(
    screenLocalFrame,
    [rippleStart, rippleStart + 20],
    [0.3, 1.5],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Label animation
  const labelOpacity = interpolate(screenLocalFrame, [5, 18], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const labelY = interpolate(screenLocalFrame, [5, 18], [15, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  const currentScreen = screens[currentScreenIndex];

  // Shimmer animation - sweeps across phone screen
  const shimmerProgress = interpolate(
    screenLocalFrame,
    [15, 45],
    [-100, 200],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.inOut(Easing.quad),
    }
  );

  return (
    <AbsoluteFill style={{ backgroundColor: theme.colors.bg }}>
      {/* Pulsing background gradient */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at 50% 40%, rgba(209, 27, 42, ${pulseProgress}) 0%, transparent 60%)`,
        }}
      />

      {/* Floating particles */}
      {particles.map((particle, index) => {
        const particleY = interpolate(
          localFrame - particle.delay,
          [0, 150 / particle.speed],
          [height + 20, -20],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
        );
        const particleOpacity = interpolate(
          localFrame - particle.delay,
          [0, 20, 130 / particle.speed, 150 / particle.speed],
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
          padding: scaled(30, scale),
        }}
      >
        {/* Screen label at top with staggered letter animation */}
        <div
          style={{
            marginBottom: scaled(24, scale),
            textAlign: 'center',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            {currentScreen.label.split('').map((letter, index) => {
              const letterDelay = index * 2;
              const letterOpacity = interpolate(
                screenLocalFrame,
                [5 + letterDelay, 12 + letterDelay],
                [0, 1],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
              );
              const letterY = interpolate(
                screenLocalFrame,
                [5 + letterDelay, 12 + letterDelay],
                [20, 0],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.5)) }
              );
              return (
                <span
                  key={index}
                  style={{
                    display: 'inline-block',
                    fontFamily: fontFamily.display,
                    fontSize: scaledFont(48, scale),
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
              fontSize: scaledFont(18, scale),
              color: theme.colors.muted,
              marginTop: scaled(6, scale),
              opacity: labelOpacity,
              transform: `translateY(${labelY}px)`,
            }}
          >
            {currentScreen.description}
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
                src={staticFile(`screenshots/${currentScreen.file}`)}
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
                  top: '45%',
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

        {/* Screen indicator dots */}
        <div
          style={{
            display: 'flex',
            gap: scaled(10, scale),
            marginTop: scaled(24, scale),
          }}
        >
          {screens.map((_, index) => (
            <div
              key={index}
              style={{
                width: scaled(8, scale),
                height: scaled(8, scale),
                borderRadius: '50%',
                backgroundColor:
                  index === currentScreenIndex
                    ? theme.colors.accent
                    : 'rgba(0, 0, 0, 0.12)',
              }}
            />
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
