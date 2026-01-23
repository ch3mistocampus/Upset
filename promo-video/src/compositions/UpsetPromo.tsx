import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { UpsetPromoProps, TIMELINE, getScaleFactor } from '../config/video';
import { theme } from '../ui/theme';
import { Scene1Hook } from '../scenes/Scene1Hook';
import { Scene2FightCard } from '../scenes/Scene2FightCard';
import { SceneFighterStats } from '../scenes/SceneFighterStats';
import { Scene3AppShowcase } from '../scenes/Scene3AppShowcase';
import { Scene5WaitlistCTA } from '../scenes/Scene5WaitlistCTA';

// Debug mode - set to true to show scene boundaries and safe margins
const DEV_MODE = false;

export const UpsetPromo: React.FC<UpsetPromoProps> = ({ format }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const scale = getScaleFactor(width);

  // Determine which scene is active
  const isInRange = (start: number, end: number) => frame >= start && frame < end;

  // Scene props helper
  const sceneProps = (start: number, end: number) => ({
    start,
    end,
    format,
    scale,
  });

  return (
    <AbsoluteFill style={{ backgroundColor: theme.colors.bg }}>
      {/* Scene 1: Hook (0-60) */}
      {isInRange(TIMELINE.scene1.start, TIMELINE.scene1.end) && (
        <Scene1Hook {...sceneProps(TIMELINE.scene1.start, TIMELINE.scene1.end)} />
      )}

      {/* Scene 2: Fight Card + "Make Your Picks" (60-150) */}
      {isInRange(TIMELINE.scene2.start, TIMELINE.scene2.end) && (
        <Scene2FightCard {...sceneProps(TIMELINE.scene2.start, TIMELINE.scene2.end)} />
      )}

      {/* Scene: Fighter Stats Comparison (150-240) */}
      {isInRange(TIMELINE.sceneFighterStats.start, TIMELINE.sceneFighterStats.end) && (
        <SceneFighterStats {...sceneProps(TIMELINE.sceneFighterStats.start, TIMELINE.sceneFighterStats.end)} />
      )}

      {/* Scene 3: App Showcase - 4 screens with scrolling (240-390) */}
      {isInRange(TIMELINE.scene3.start, TIMELINE.scene3.end) && (
        <Scene3AppShowcase {...sceneProps(TIMELINE.scene3.start, TIMELINE.scene3.end)} />
      )}

      {/* Scene 4: Waitlist CTA (390-480) */}
      {isInRange(TIMELINE.scene4.start, TIMELINE.scene4.end) && (
        <Scene5WaitlistCTA {...sceneProps(TIMELINE.scene4.start, TIMELINE.scene4.end)} />
      )}

      {/* Debug overlay */}
      {DEV_MODE && (
        <AbsoluteFill style={{ pointerEvents: 'none' }}>
          {/* Safe margin guides */}
          <div
            style={{
              position: 'absolute',
              top: width * 0.06,
              left: width * 0.06,
              right: width * 0.06,
              bottom: width * 0.06,
              border: '2px dashed rgba(255, 0, 0, 0.3)',
              borderRadius: 8,
            }}
          />
          {/* Frame counter */}
          <div
            style={{
              position: 'absolute',
              top: 20,
              right: 20,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              color: 'white',
              padding: '8px 16px',
              borderRadius: 8,
              fontFamily: 'monospace',
              fontSize: 14,
            }}
          >
            Frame: {frame} | Scene: {
              frame < TIMELINE.scene1.end ? '1 (Hook)' :
              frame < TIMELINE.scene2.end ? '2 (Fight Card)' :
              frame < TIMELINE.sceneFighterStats.end ? '3 (Fighter Stats)' :
              frame < TIMELINE.scene3.end ? '4 (App Showcase)' : '5 (CTA)'
            }
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
