'use client'

import { useState, useEffect } from 'react'
import { PlayerProvider } from '@/context/PlayerContext'
import BottomPlayer from '@/components/BottomPlayer'
import ClippyWidget from '@/components/ClippyWidget'
import { ClippyProvider } from '@react95/clippy'

function ClippyMount() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    setShow(window.innerWidth >= 800)
  }, [])
  if (!show) return null
  return (
    <ClippyProvider>
      <ClippyWidget />
    </ClippyProvider>
  )
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <PlayerProvider>
      {children}
      <BottomPlayer />
      <ClippyMount />
    </PlayerProvider>
  )
}
