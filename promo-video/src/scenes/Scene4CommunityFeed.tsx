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
import { Card, Badge, TitleText, BodyText } from '../ui/atoms';
import { FireIcon, UserIcon } from '../ui/icons';
import { scaled, scaledFont } from '../ui/layout';

const feedPosts = [
  { username: 'ChampPicker', pick: 'Picked Pimblett by submission', correct: true },
  { username: 'UFC_Oracle', pick: 'Picked Gaethje by KO', correct: false },
  { username: 'FightFan23', pick: 'Picked Pimblett by decision', correct: true },
  { username: 'MMAmaster', pick: 'Picked Pimblett by submission', correct: true },
  { username: 'OctagonKing', pick: 'Picked Gaethje by TKO', correct: false },
  { username: 'TapoutTom', pick: 'Picked Pimblett by submission', correct: true },
  { username: 'CageSide', pick: 'Picked Gaethje by decision', correct: false },
];

export const Scene4CommunityFeed: React.FC<SceneProps> = ({ start, end, format, scale }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const localFrame = frame - start;

  const isPortrait = format === 'portrait';

  // Feed scroll animation
  const scrollOffset = interpolate(localFrame, [0, 90], [0, -300], {
    easing: Easing.inOut(Easing.cubic),
  });

  // Overlay text transition
  const text1Opacity = interpolate(localFrame, [0, 15, 40, 50], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const text1Y = interpolate(localFrame, [0, 15], [20, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const text2Opacity = interpolate(localFrame, [45, 60, 85, 90], [0, 1, 1, 0.8], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const text2Y = interpolate(localFrame, [45, 60], [20, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Correct pick highlight at frame 50
  const highlightFrame = 50;
  const highlightProgress = spring({
    frame: localFrame - highlightFrame,
    fps,
    config: { damping: 10, stiffness: 200 },
  });

  const cardWidth = isPortrait ? width * 0.88 : width * 0.5;
  const rowHeight = scaled(72, scale);

  return (
    <AbsoluteFill style={{ backgroundColor: theme.colors.bg }}>
      {/* Feed container */}
      <div
        style={{
          position: 'absolute',
          top: isPortrait ? '20%' : '15%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: cardWidth,
          height: isPortrait ? '50%' : '60%',
          overflow: 'hidden',
          borderRadius: scaled(theme.radii.lg, scale),
          boxShadow: '0 8px 40px rgba(0, 0, 0, 0.08)',
        }}
      >
        {/* Scrolling feed */}
        <div
          style={{
            transform: `translateY(${scrollOffset}px)`,
          }}
        >
          {feedPosts.map((post, index) => {
            // Highlight the 4th post (index 3)
            const isHighlighted = index === 3 && localFrame >= highlightFrame;
            const rowScale = isHighlighted ? highlightProgress : 1;

            return (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: `${scaled(16, scale)}px ${scaled(20, scale)}px`,
                  backgroundColor: theme.colors.card,
                  borderBottom: `1px solid rgba(0, 0, 0, 0.05)`,
                  gap: scaled(14, scale),
                  transform: `scale(${isHighlighted ? interpolate(rowScale, [0, 1], [1, 1.02]) : 1})`,
                  position: 'relative',
                }}
              >
                {/* Highlight glow */}
                {isHighlighted && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundColor: 'rgba(209, 27, 42, 0.05)',
                      opacity: interpolate(highlightProgress, [0, 1], [0, 1]),
                    }}
                  />
                )}

                {/* Avatar */}
                <div
                  style={{
                    width: scaled(40, scale),
                    height: scaled(40, scale),
                    borderRadius: '50%',
                    backgroundColor: theme.colors.bg,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  <UserIcon size={scaled(20, scale)} color={theme.colors.muted} />
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: fontFamily.body,
                      fontSize: scaledFont(14, scale),
                      fontWeight: 600,
                      color: theme.colors.text,
                      marginBottom: scaled(2, scale),
                    }}
                  >
                    {post.username}
                  </div>
                  <div
                    style={{
                      fontFamily: fontFamily.body,
                      fontSize: scaledFont(13, scale),
                      color: theme.colors.muted,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {post.pick}
                  </div>
                </div>

                {/* Status */}
                {post.correct && (
                  <div
                    style={{
                      opacity: isHighlighted
                        ? interpolate(highlightProgress, [0, 1], [1, 1])
                        : 0.7,
                      transform: isHighlighted
                        ? `scale(${interpolate(highlightProgress, [0, 1], [1, 1.1])})`
                        : 'scale(1)',
                    }}
                  >
                    <Badge variant="success" scale={scale * 0.9}>
                      <FireIcon size={scaled(12, scale)} color="white" />
                      Correct
                    </Badge>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Top fade */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: scaled(40, scale),
            background: `linear-gradient(180deg, ${theme.colors.bg} 0%, transparent 100%)`,
            pointerEvents: 'none',
          }}
        />

        {/* Bottom fade */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: scaled(60, scale),
            background: `linear-gradient(0deg, ${theme.colors.bg} 0%, transparent 100%)`,
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Overlay text */}
      <AbsoluteFill
        style={{
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingBottom: isPortrait ? '18%' : '12%',
        }}
      >
        {/* First text */}
        <div
          style={{
            position: 'absolute',
            opacity: text1Opacity,
            transform: `translateY(${text1Y}px)`,
          }}
        >
          <TitleText
            size={isPortrait ? 36 : 32}
            scale={scale}
            style={{ textAlign: 'center' }}
          >
            Fight Fans, Not Casuals.
          </TitleText>
        </div>

        {/* Second text */}
        <div
          style={{
            opacity: text2Opacity,
            transform: `translateY(${text2Y}px)`,
          }}
        >
          <TitleText
            size={isPortrait ? 48 : 40}
            scale={scale}
            color={theme.colors.accent}
            style={{ textAlign: 'center' }}
          >
            Prove It.
          </TitleText>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
