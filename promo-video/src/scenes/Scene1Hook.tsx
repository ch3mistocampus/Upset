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
import { theme, fontFamily } from '../ui/theme';
import { Octagon, OctagonOutline } from '../ui/Octagon';
import { scaled, scaledFont } from '../ui/layout';

export const Scene1Hook: React.FC<SceneProps> = ({ start, end, format, scale }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const localFrame = frame - start;

  // Octagon spin and scale animation
  const octagonProgress = spring({
    frame: localFrame,
    fps,
    config: { damping: 20, stiffness: 80, mass: 1 },
  });

  const octagonScale = interpolate(octagonProgress, [0, 1], [0.3, 1]);
  const octagonRotation = interpolate(localFrame, [0, 60], [-90, 0], {
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const octagonOpacity = interpolate(localFrame, [0, 15], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Logo slam animation (delayed after octagon)
  const logoDelay = 15;
  const logoProgress = spring({
    frame: localFrame - logoDelay,
    fps,
    config: { damping: 12, stiffness: 180, mass: 1.2 },
  });

  const logoScale = interpolate(logoProgress, [0, 1], [2.5, 1]);
  const logoOpacity = interpolate(localFrame, [logoDelay, logoDelay + 8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Shake effect after slam
  const shakeX = localFrame > logoDelay + 8 && localFrame < logoDelay + 20
    ? Math.sin(localFrame * 3) * interpolate(localFrame, [logoDelay + 8, logoDelay + 20], [6, 0])
    : 0;

  // Tagline fade in
  const taglineOpacity = interpolate(localFrame, [35, 50], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const taglineY = interpolate(localFrame, [35, 50], [20, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  // Background pulse
  const bgPulse = interpolate(localFrame, [logoDelay + 8, logoDelay + 15, logoDelay + 25], [1, 1.015, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const octagonSize = Math.min(width, height) * 0.7;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.colors.bg,
        transform: `scale(${bgPulse})`,
      }}
    >
      {/* Background octagon outlines (decorative) */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          opacity: 0.05,
        }}
      >
        <OctagonOutline size={octagonSize * 1.5} color={theme.colors.accent} opacity={0.08} />
      </div>

      {/* Radial accent glow */}
      <div
        style={{
          position: 'absolute',
          top: '45%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: width * 0.9,
          height: width * 0.9,
          background: `radial-gradient(circle, rgba(209, 27, 42, 0.06) 0%, transparent 50%)`,
          opacity: interpolate(localFrame, [0, 20], [0, 1]),
        }}
      />

      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {/* Main animated octagon */}
        <div
          style={{
            position: 'absolute',
            transform: `scale(${octagonScale}) rotate(${octagonRotation}deg)`,
            opacity: octagonOpacity,
          }}
        >
          <Octagon
            size={octagonSize}
            strokeColor={theme.colors.accent}
            strokeWidth={scaled(6, scale)}
            animate={true}
            glowColor="rgba(209, 27, 42, 0.25)"
          />
        </div>

        {/* UPSET logo inside octagon */}
        <div
          style={{
            transform: `scale(${logoScale}) translateX(${shakeX}px)`,
            opacity: logoOpacity,
            textAlign: 'center',
            zIndex: 10,
          }}
        >
          <div
            style={{
              fontFamily: fontFamily.display,
              fontSize: scaledFont(130, scale),
              fontWeight: 900,
              color: theme.colors.text,
              letterSpacing: '-0.02em',
              lineHeight: 0.9,
              textTransform: 'uppercase',
            }}
          >
            UPSET
          </div>
        </div>

        {/* Tagline below */}
        <div
          style={{
            position: 'absolute',
            top: '62%',
            opacity: taglineOpacity,
            transform: `translateY(${taglineY}px)`,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontFamily: fontFamily.body,
              fontSize: scaledFont(26, scale),
              fontWeight: 500,
              color: theme.colors.muted,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            Make Your Picks
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
