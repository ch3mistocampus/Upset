import React from 'react';
import { Composition } from 'remotion';
import { UpsetPromo } from './compositions/UpsetPromo';
import { VIDEO_CONFIG } from './config/video';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Portrait format (1080x1920) - for TikTok, Instagram Reels, Stories */}
      <Composition
        id="UpsetPromoPortrait"
        component={UpsetPromo as unknown as React.ComponentType<Record<string, unknown>>}
        durationInFrames={VIDEO_CONFIG.durationInFrames}
        fps={VIDEO_CONFIG.fps}
        width={VIDEO_CONFIG.portrait.width}
        height={VIDEO_CONFIG.portrait.height}
        defaultProps={{
          format: 'portrait',
        }}
      />
    </>
  );
};
