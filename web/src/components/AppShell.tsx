'use client'

import { PlayerProvider } from '@/context/PlayerContext'
import BottomPlayer from '@/components/BottomPlayer'

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <PlayerProvider>
      {children}
      <BottomPlayer />
    </PlayerProvider>
  )
}
