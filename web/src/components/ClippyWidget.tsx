'use client'

import { useEffect } from 'react'
import { useClippy } from '@react95/clippy'

const ANIMATIONS = [
  'Wave', 'Greeting', 'GetAttention', 'Thinking', 'Writing',
  'LookRight', 'LookLeft', 'LookUp', 'LookDown', 'IdleRopePile',
]

function pinElement(el: HTMLElement) {
  const w = el.offsetWidth || 124
  const h = el.offsetHeight || 93
  el.style.left = (window.innerWidth - w - 16) + 'px'
  el.style.top = (window.innerHeight - h - 16) + 'px'
  el.style.transform = 'scale(0.65)'
  el.style.transformOrigin = 'bottom right'
}

export default function ClippyWidget() {
  const { clippy } = useClippy()

  useEffect(() => {
    if (!clippy) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const el: HTMLElement = (clippy as any)._el
    if (!el) return

    // Silence all sounds
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(clippy as any)._animator._sounds = {}

    clippy.show()
    pinElement(el)
    const t = setTimeout(() => pinElement(el), 300)

    // Watch for library repositioning and correct it
    const observer = new MutationObserver(() => pinElement(el))
    observer.observe(el, { attributes: true, attributeFilter: ['style'] })

    const interval = setInterval(() => {
      const anim = ANIMATIONS[Math.floor(Math.random() * ANIMATIONS.length)]
      clippy.play(anim)
    }, 8000)

    window.addEventListener('resize', () => pinElement(el))

    return () => {
      clearTimeout(t)
      clearInterval(interval)
      observer.disconnect()
    }
  }, [clippy])

  return null
}
