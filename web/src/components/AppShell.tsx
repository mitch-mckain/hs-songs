'use client'

import { PlayerProvider } from '@/context/PlayerContext'
import BottomPlayer from '@/components/BottomPlayer'
import ClippyWidget from '@/components/ClippyWidget'
import { ClippyProvider } from '@react95/clippy'

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <PlayerProvider>
      {children}
      <BottomPlayer />
      <ClippyProvider>
        <ClippyWidget />
      </ClippyProvider>
    </PlayerProvider>
  )
}
