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
import { Button, TitleText, BodyText } from '../ui/atoms';
import { Octagon, OctagonOutline } from '../ui/Octagon';
import { scaled, scaledFont } from '../ui/layout';

// Confetti particle configuration
const confettiParticles = Array.from({ length: 30 }).map((_, i) => ({
  x: Math.random() * 100, // Percentage across screen
  delay: Math.random() * 10,
  speed: 0.5 + Math.random() * 0.8,
  size: 4 + Math.random() * 6,
  rotation: Math.random() * 360,
  rotationSpeed: (Math.random() - 0.5) * 15,
  color: ['#D11B2A', '#FFD700', '#FFFFFF', '#FF6B6B', '#4ECDC4'][Math.floor(Math.random() * 5)],
  swayAmount: 20 + Math.random() * 40,
  swaySpeed: 2 + Math.random() * 3,
}));

export const Scene5WaitlistCTA: React.FC<SceneProps> = ({ start, end, format, scale }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const localFrame = frame - start;

  const isPortrait = format === 'portrait';

  // Logo entrance - matching opening scene style
  const logoProgress = spring({
    frame: localFrame,
    fps,
    config: { damping: 12, stiffness: 150, mass: 1 },
  });

  const logoScale = interpolate(logoProgress, [0, 1], [1.5, 1]);
  const logoOpacity = interpolate(localFrame, [0, 15], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Octagon animation
  const octagonProgress = spring({
    frame: localFrame,
    fps,
    config: { damping: 20, stiffness: 80 },
  });
  const octagonScale = interpolate(octagonProgress, [0, 1], [0.5, 1]);
  const octagonOpacity = interpolate(localFrame, [0, 20], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Button entrance
  const buttonProgress = spring({
    frame: localFrame - 30,
    fps,
    config: { damping: 15, stiffness: 120 },
  });
  const buttonOpacity = interpolate(localFrame, [30, 45], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const buttonY = interpolate(buttonProgress, [0, 1], [30, 0]);

  // URL footer
  const footerOpacity = interpolate(localFrame, [50, 65], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Expanding rings
  const ringCount = 3;
  const octagonSize = Math.min(width, height) * 0.55;

  return (
    <AbsoluteFill style={{ backgroundColor: theme.colors.bg }}>
      {/* Background octagon outlines */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          opacity: 0.04,
        }}
      >
        <OctagonOutline size={octagonSize * 1.6} color={theme.colors.accent} opacity={0.06} />
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
          background: `radial-gradient(circle, rgba(209, 27, 42, 0.08) 0%, transparent 50%)`,
          opacity: interpolate(localFrame, [0, 30], [0, 1]),
        }}
      />

      {/* Expanding rings */}
      {Array.from({ length: ringCount }).map((_, index) => {
        const ringDelay = 10 + index * 12;
        const ringProgress = interpolate(
          localFrame,
          [ringDelay, ringDelay + 80],
          [0, 1],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
        );
        const ringScale = interpolate(ringProgress, [0, 1], [0.4, 1.2 + index * 0.25]);
        const ringOpacity = interpolate(ringProgress, [0, 0.2, 1], [0, 0.1, 0]);

        return (
          <div
            key={index}
            style={{
              position: 'absolute',
              top: '45%',
              left: '50%',
              width: scaled(500, scale),
              height: scaled(500, scale),
              borderRadius: '50%',
              border: `3px solid ${theme.colors.accent}`,
              transform: `translate(-50%, -50%) scale(${ringScale})`,
              opacity: ringOpacity,
            }}
          />
        );
      })}

      {/* Confetti burst */}
      {confettiParticles.map((particle, index) => {
        const confettiStart = 35; // Starts when button appears
        const particleFrame = localFrame - confettiStart - particle.delay;

        const fallProgress = interpolate(
          particleFrame,
          [0, 60 / particle.speed],
          [0, 1],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
        );

        const particleY = interpolate(
          fallProgress,
          [0, 1],
          [-50, height + 50],
          { easing: Easing.in(Easing.quad) }
        );

        const particleX = particle.x + Math.sin(particleFrame * 0.1 * particle.swaySpeed) * particle.swayAmount * 0.01 * width * 0.01;

        const particleOpacity = interpolate(
          particleFrame,
          [0, 5, 50 / particle.speed, 60 / particle.speed],
          [0, 1, 1, 0],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
        );

        const particleRotation = particle.rotation + particleFrame * particle.rotationSpeed;

        return (
          <div
            key={`confetti-${index}`}
            style={{
              position: 'absolute',
              left: `${particleX}%`,
              top: particleY,
              width: scaled(particle.size, scale),
              height: scaled(particle.size * 0.6, scale),
              backgroundColor: particle.color,
              borderRadius: scaled(2, scale),
              opacity: particleOpacity,
              transform: `rotate(${particleRotation}deg)`,
              pointerEvents: 'none',
            }}
          />
        );
      })}

      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {/* Animated octagon behind logo */}
        <div
          style={{
            position: 'absolute',
            transform: `scale(${octagonScale})`,
            opacity: octagonOpacity * 0.15,
          }}
        >
          <Octagon
            size={octagonSize}
            strokeColor={theme.colors.accent}
            strokeWidth={scaled(4, scale)}
            animate={false}
            glowColor="rgba(209, 27, 42, 0.2)"
          />
        </div>

        {/* Main content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            zIndex: 10,
          }}
        >
          {/* UPSET logo with staggered letter animation */}
          <div
            style={{
              transform: `scale(${logoScale})`,
              marginBottom: scaled(20, scale),
              display: 'flex',
            }}
          >
            {'UPSET'.split('').map((letter, index) => {
              const letterDelay = index * 3;
              const letterOpacity = interpolate(
                localFrame,
                [letterDelay, 12 + letterDelay],
                [0, 1],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
              );
              const letterY = interpolate(
                localFrame,
                [letterDelay, 12 + letterDelay],
                [40, 0],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.8)) }
              );
              const letterScale = interpolate(
                localFrame,
                [letterDelay, 12 + letterDelay],
                [0.5, 1],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
              );
              return (
                <span
                  key={index}
                  style={{
                    display: 'inline-block',
                    fontFamily: fontFamily.display,
                    fontSize: scaledFont(130, scale),
                    fontWeight: 900,
                    color: theme.colors.text,
                    letterSpacing: '-0.02em',
                    lineHeight: 0.9,
                    opacity: letterOpacity,
                    transform: `translateY(${letterY}px) scale(${letterScale})`,
                    textShadow: `0 0 ${scaled(40, scale)}px rgba(209, 27, 42, 0.3)`,
                  }}
                >
                  {letter}
                </span>
              );
            })}
          </div>

          {/* Tagline */}
          <div
            style={{
              opacity: interpolate(localFrame, [15, 30], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }),
              marginBottom: scaled(50, scale),
            }}
          >
            <div
              style={{
                fontFamily: fontFamily.body,
                fontSize: scaledFont(28, scale),
                fontWeight: 500,
                color: theme.colors.muted,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              Make Your Picks
            </div>
          </div>

          {/* CTA Button - larger with pulsing glow */}
          <div
            style={{
              opacity: buttonOpacity,
              transform: `translateY(${buttonY}px)`,
              marginBottom: scaled(30, scale),
              position: 'relative',
            }}
          >
            {/* Glow effect behind button */}
            <div
              style={{
                position: 'absolute',
                inset: scaled(-15, scale),
                background: theme.colors.accent,
                borderRadius: scaled(theme.radii.lg + 15, scale),
                filter: `blur(${scaled(25, scale)}px)`,
                opacity: localFrame > 45 ? interpolate(localFrame % 40, [0, 20, 40], [0.3, 0.6, 0.3]) : 0.3,
              }}
            />
            <div
              style={{
                position: 'relative',
                backgroundColor: theme.colors.accent,
                color: '#FFFFFF',
                borderRadius: scaled(theme.radii.lg, scale),
                padding: `${scaled(28, scale)}px ${scaled(64, scale)}px`,
                fontSize: scaledFont(32, scale),
                fontFamily: fontFamily.display,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.02em',
                boxShadow: `0 8px 32px rgba(209, 27, 42, 0.4)`,
                transform: `scale(${localFrame > 45 ? interpolate(localFrame % 40, [0, 20, 40], [1, 1.05, 1]) : 1})`,
              }}
            >
              Join the Waitlist
            </div>
          </div>
        </div>

        {/* Footer URL */}
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            opacity: footerOpacity,
          }}
        >
          <div
            style={{
              fontFamily: fontFamily.display,
              fontSize: scaledFont(36, scale),
              fontWeight: 700,
              color: theme.colors.accent,
              letterSpacing: '0.02em',
            }}
          >
            upsetmma.app
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
