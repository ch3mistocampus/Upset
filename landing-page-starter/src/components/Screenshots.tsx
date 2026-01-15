'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { COPY } from '@/lib/copy'

// Map of available real screenshots
const REAL_SCREENSHOTS: Record<string, string> = {
  'Picks': '/screenshots/picks.png',
  'Fighter Profiles': '/screenshots/fighter-profiles.png',
  'Feed': '/screenshots/feed.png',
  'Rankings': '/screenshots/rankings.png',
}

/**
 * Screenshots Section
 *
 * TODO: To add real screenshots:
 * 1. Add screenshot images to /public/screenshots/ directory
 *    - picks.png (iPhone mockup of picks screen)
 *    - fighter-profiles.png (iPhone mockup of fighter profile)
 *    - feed.png (iPhone mockup of social feed)
 *    - rankings.png (iPhone mockup of leaderboard)
 * 2. Replace the ScreenMockup components below with <Image> components:
 *    import Image from 'next/image'
 *    <Image
 *      src="/screenshots/picks.png"
 *      alt="Picks screen showing fight card predictions"
 *      width={280}
 *      height={560}
 *      className="rounded-2xl"
 *    />
 * 3. Consider using device frames (iPhone mockups) around screenshots
 */

export function Screenshots() {
  return (
    <section className="py-24 px-4 bg-gradient-to-b from-transparent via-red-950/10 to-transparent" aria-labelledby="screenshots-title">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 id="screenshots-title" className="text-3xl md:text-5xl font-display tracking-wide mb-4">
            {COPY.screenshots.title}
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            {COPY.screenshots.body}
          </p>
        </motion.div>

        {/* Screenshots Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {COPY.screenshots.placeholders.map((label, index) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="flex flex-col items-center"
            >
              {/* Phone Frame */}
              <div className="relative w-full aspect-[9/19] max-w-[200px] md:max-w-[240px] mx-auto">
                {/* Phone bezel */}
                <div className="absolute inset-0 bg-gray-900 rounded-[2rem] md:rounded-[2.5rem] border-2 border-gold-500/60 shadow-2xl shadow-gold-500/10">
                  {/* Screen area */}
                  <div className="absolute inset-2 md:inset-3 rounded-[1.5rem] md:rounded-[2rem] overflow-hidden">
                    <ScreenMockup type={label} />
                  </div>
                </div>
              </div>
              {/* Label below phone */}
              <p className="mt-4 text-sm text-gray-400 font-medium">{label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// Realistic screen mockups for each type
function ScreenMockup({ type }: { type: string }) {
  // Check if we have a real screenshot for this type
  const realScreenshot = REAL_SCREENSHOTS[type]
  if (realScreenshot) {
    return (
      <Image
        src={realScreenshot}
        alt={`${type} screen`}
        fill
        className="object-cover object-top"
        sizes="(max-width: 768px) 200px, 240px"
      />
    )
  }

  // Fall back to mockups
  switch (type) {
    case 'Picks':
      return <PicksMockup />
    case 'Fighter Profiles':
      return <FighterProfileMockup />
    case 'Rankings':
      return <RankingsMockup />
    default:
      return <DefaultMockup label={type} />
  }
}

// Picks screen mockup
function PicksMockup() {
  return (
    <div className="h-full p-3 pt-8 flex flex-col">
      <div className="text-[10px] text-gray-400 mb-2 font-medium">UPCOMING EVENT</div>
      <div className="text-xs text-white font-bold mb-3">Fight Night 245</div>

      {/* Fight cards */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-gray-800/50 rounded-lg p-2 mb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-red-500 to-red-700" />
              <div className="text-[9px] text-white">Fighter A</div>
            </div>
            <div className="text-[8px] text-gray-500">vs</div>
            <div className="flex items-center gap-1">
              <div className="text-[9px] text-white">Fighter B</div>
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-700" />
            </div>
          </div>
          {i === 1 && (
            <div className="mt-1.5 flex justify-center">
              <div className="bg-red-600/30 text-red-400 text-[8px] px-2 py-0.5 rounded-full">
                Your Pick
              </div>
            </div>
          )}
        </div>
      ))}

      <div className="mt-auto">
        <div className="bg-red-600 text-white text-[10px] py-2 rounded-lg text-center font-medium">
          Submit Picks
        </div>
      </div>
    </div>
  )
}

// Fighter profile mockup
function FighterProfileMockup() {
  return (
    <div className="h-full flex flex-col">
      {/* Header with fighter image placeholder */}
      <div className="h-24 bg-gradient-to-b from-red-900/50 to-transparent flex items-end justify-center pb-2">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 border-2 border-gray-700 flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
      </div>

      <div className="p-3 pt-2 flex-1">
        <div className="text-center mb-3">
          <div className="text-xs text-white font-bold">Fighter Name</div>
          <div className="text-[9px] text-gray-400">Welterweight</div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-1 mb-3">
          {[
            { label: 'Record', value: '15-3' },
            { label: 'KO Rate', value: '67%' },
            { label: 'Streak', value: 'W5' },
          ].map((stat) => (
            <div key={stat.label} className="bg-gray-800/50 rounded p-1.5 text-center">
              <div className="text-[10px] text-white font-bold">{stat.value}</div>
              <div className="text-[7px] text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Community pick bar */}
        <div className="bg-gray-800/50 rounded-lg p-2">
          <div className="text-[8px] text-gray-400 mb-1">Community Picking</div>
          <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full w-3/4 bg-gradient-to-r from-red-600 to-red-500 rounded-full" />
          </div>
          <div className="text-[9px] text-red-400 mt-1">74% of fans</div>
        </div>
      </div>
    </div>
  )
}

// Rankings mockup with avatars
function RankingsMockup() {
  const topUsers = [
    { rank: 1, name: 'champion', accuracy: '89%', color: 'from-yellow-500 to-amber-600' },
    { rank: 2, name: 'predictor', accuracy: '85%', color: 'from-gray-300 to-gray-500' },
    { rank: 3, name: 'analyst', accuracy: '82%', color: 'from-amber-600 to-amber-800' },
    { rank: 4, name: 'fighter_fan', accuracy: '79%', color: 'from-red-500 to-red-700' },
    { rank: 5, name: 'mma_guru', accuracy: '77%', color: 'from-blue-500 to-blue-700' },
  ]

  return (
    <div className="h-full p-3 pt-8">
      <div className="text-xs text-white font-bold mb-1">Global Rankings</div>
      <div className="text-[8px] text-gray-500 mb-3">Top predictors this month</div>

      {/* Leaderboard list */}
      <div className="space-y-1.5">
        {topUsers.map((user) => (
          <div
            key={user.rank}
            className={`flex items-center gap-2 p-1.5 rounded-lg ${
              user.rank === 1 ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-gray-800/50'
            }`}
          >
            {/* Rank */}
            <div className={`w-4 text-[9px] font-bold ${
              user.rank === 1 ? 'text-yellow-500' :
              user.rank === 2 ? 'text-gray-400' :
              user.rank === 3 ? 'text-amber-600' : 'text-gray-500'
            }`}>
              #{user.rank}
            </div>

            {/* Avatar */}
            <div
              className={`w-6 h-6 rounded-full bg-gradient-to-br ${user.color} flex items-center justify-center flex-shrink-0`}
            >
              {user.rank <= 3 ? (
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                </svg>
              ) : (
                <span className="text-[8px] text-white font-bold">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            {/* Name */}
            <div className="flex-1 min-w-0">
              <div className="text-[9px] text-white font-medium truncate">@{user.name}</div>
            </div>

            {/* Accuracy */}
            <div className={`text-[9px] font-bold ${
              user.rank === 1 ? 'text-yellow-500' : 'text-red-400'
            }`}>
              {user.accuracy}
            </div>
          </div>
        ))}
      </div>

      {/* Your position */}
      <div className="mt-3 pt-2 border-t border-gray-700">
        <div className="flex items-center gap-2 p-1.5 bg-red-600/10 border border-red-500/30 rounded-lg">
          <div className="w-4 text-[9px] font-bold text-gray-400">#42</div>
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
            <span className="text-[8px] text-white font-bold">Y</span>
          </div>
          <div className="flex-1 text-[9px] text-white font-medium">You</div>
          <div className="text-[9px] text-red-400 font-bold">71%</div>
        </div>
      </div>
    </div>
  )
}

// Default fallback mockup
function DefaultMockup({ label }: { label: string }) {
  return (
    <div className="h-full flex items-center justify-center p-4">
      <div className="text-center">
        <div className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 rounded-xl bg-red-600/20 flex items-center justify-center">
          <svg className="w-6 h-6 md:w-8 md:h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-gray-500 text-xs md:text-sm font-medium">{label}</p>
      </div>
    </div>
  )
}
