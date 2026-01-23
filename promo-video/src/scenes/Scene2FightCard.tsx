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
import { Card, Pill, Badge, TitleText, BodyText } from '../ui/atoms';
import { CheckIcon } from '../ui/icons';
import { scaled, scaledFont } from '../ui/layout';

export const Scene2FightCard: React.FC<SceneProps> = ({ start, end, format, scale }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const localFrame = frame - start;

  const isPortrait = format === 'portrait';

  // Card slide up animation
  const cardProgress = spring({
    frame: localFrame,
    fps,
    config: { damping: 18, stiffness: 100 },
  });
  const cardY = interpolate(cardProgress, [0, 1], [100, 0]);
  const cardOpacity = interpolate(localFrame, [0, 15], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Fighter names slide in
  const redCornerProgress = spring({
    frame: localFrame - 10,
    fps,
    config: { damping: 15, stiffness: 120 },
  });
  const blueCornerProgress = spring({
    frame: localFrame - 15,
    fps,
    config: { damping: 15, stiffness: 120 },
  });

  const redX = interpolate(redCornerProgress, [0, 1], [-50, 0]);
  const blueX = interpolate(blueCornerProgress, [0, 1], [50, 0]);

  // VS pop animation
  const vsProgress = spring({
    frame: localFrame - 20,
    fps,
    config: { damping: 8, stiffness: 200 },
  });

  // Checkmark animation at frame 45 (mid-scene)
  const checkFrame = 45;
  const checkProgress = spring({
    frame: localFrame - checkFrame,
    fps,
    config: { damping: 12, stiffness: 150 },
  });
  const checkOpacity = interpolate(localFrame, [checkFrame, checkFrame + 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Tap ripple animation
  const rippleProgress = interpolate(
    localFrame,
    [checkFrame - 5, checkFrame + 15],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const rippleScale = interpolate(rippleProgress, [0, 1], [0.5, 2]);
  const rippleOpacity = interpolate(rippleProgress, [0, 0.5, 1], [0, 0.3, 0]);

  // Microcopy fade in
  const microcopyOpacity = interpolate(localFrame, [60, 75], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const cardWidth = isPortrait ? width * 0.85 : width * 0.55;

  return (
    <AbsoluteFill style={{ backgroundColor: theme.colors.bg }}>
      {/* Background pattern */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at 50% 30%, rgba(209, 27, 42, 0.03) 0%, transparent 50%)`,
        }}
      />

      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'column',
        }}
      >
        {/* Header: Make Your Picks */}
        <div
          style={{
            opacity: interpolate(localFrame, [0, 20], [0, 1], { extrapolateRight: 'clamp' }),
            transform: `translateY(${interpolate(localFrame, [0, 20], [-20, 0], { extrapolateRight: 'clamp' })}px)`,
            marginBottom: scaled(40, scale),
            textAlign: 'center',
          }}
        >
          <TitleText size={64} scale={scale} color={theme.colors.accent}>
            Make Your Picks
          </TitleText>
        </div>

        {/* Fight Card */}
        <div
          style={{
            width: cardWidth,
            transform: `translateY(${cardY}px)`,
            opacity: cardOpacity,
          }}
        >
          <Card scale={scale} style={{ padding: 0, overflow: 'hidden' }}>
            {/* Card header */}
            <div
              style={{
                backgroundColor: theme.colors.bg,
                padding: `${scaled(16, scale)}px ${scaled(24, scale)}px`,
                borderBottom: `1px solid rgba(0, 0, 0, 0.06)`,
              }}
            >
              <div
                style={{
                  fontFamily: fontFamily.body,
                  fontSize: scaledFont(13, scale),
                  fontWeight: 600,
                  color: theme.colors.muted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                Fight Card
              </div>
            </div>

            {/* Red corner */}
            <div
              style={{
                padding: scaled(24, scale),
                borderLeft: `5px solid ${theme.colors.accent}`,
                backgroundColor: 'rgba(209, 27, 42, 0.03)',
                transform: `translateX(${redX}px)`,
                opacity: interpolate(redCornerProgress, [0, 1], [0, 1]),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                position: 'relative',
              }}
            >
              {/* Tap ripple */}
              {localFrame >= checkFrame - 5 && (
                <div
                  style={{
                    position: 'absolute',
                    right: scaled(40, scale),
                    top: '50%',
                    width: scaled(60, scale),
                    height: scaled(60, scale),
                    borderRadius: '50%',
                    backgroundColor: theme.colors.accent,
                    transform: `translate(50%, -50%) scale(${rippleScale})`,
                    opacity: rippleOpacity,
                  }}
                />
              )}

              <div>
                <Pill variant="red" scale={scale} style={{ marginBottom: scaled(12, scale) }}>
                  Red Corner
                </Pill>
                <TitleText size={42} scale={scale}>
                  Paddy Pimblett
                </TitleText>
              </div>

              {/* Checkmark */}
              <div
                style={{
                  opacity: checkOpacity,
                  transform: `scale(${checkProgress})`,
                }}
              >
                <div
                  style={{
                    width: scaled(48, scale),
                    height: scaled(48, scale),
                    borderRadius: '50%',
                    backgroundColor: theme.colors.accent,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    boxShadow: '0 4px 12px rgba(209, 27, 42, 0.3)',
                  }}
                >
                  <CheckIcon size={scaled(24, scale)} color="white" />
                </div>
              </div>
            </div>

            {/* VS divider */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: scaled(12, scale),
                backgroundColor: theme.colors.card,
              }}
            >
              <div
                style={{
                  fontFamily: fontFamily.display,
                  fontSize: scaledFont(24, scale),
                  fontWeight: 800,
                  color: theme.colors.muted,
                  transform: `scale(${vsProgress})`,
                  opacity: interpolate(vsProgress, [0, 1], [0, 1]),
                }}
              >
                VS
              </div>
            </div>

            {/* Blue corner */}
            <div
              style={{
                padding: scaled(24, scale),
                borderLeft: `5px solid ${theme.colors.blue}`,
                backgroundColor: 'rgba(29, 78, 216, 0.03)',
                transform: `translateX(${blueX}px)`,
                opacity: interpolate(blueCornerProgress, [0, 1], [0, 1]),
              }}
            >
              <Pill variant="blue" scale={scale} style={{ marginBottom: scaled(12, scale) }}>
                Blue Corner
              </Pill>
              <TitleText size={42} scale={scale}>
                Justin Gaethje
              </TitleText>
            </div>
          </Card>

          {/* Picked badge */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginTop: scaled(16, scale),
              opacity: checkOpacity,
              transform: `scale(${checkProgress})`,
            }}
          >
            <Badge variant="success" scale={scale}>
              Picked
            </Badge>
          </div>

          {/* Microcopy */}
          <div
            style={{
              textAlign: 'center',
              marginTop: scaled(32, scale),
              opacity: microcopyOpacity,
            }}
          >
            <BodyText size={22} scale={scale} color={theme.colors.muted}>
              One tap. Locked in.
            </BodyText>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
