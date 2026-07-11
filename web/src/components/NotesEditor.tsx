'use client'

import dynamic from 'next/dynamic'

const NotesEditorTipTap = dynamic(() => import('./NotesEditorTipTap'), {
  ssr: false,
  loading: () => (
    <div style={{
      minHeight: 120,
      border: '1px solid #17181c',
      borderRadius: 2,
      background: '#faf7ee',
    }} />
  ),
})

interface Props {
  value: string
  onChange: (html: string) => void
  onBlur?: () => void
  placeholder?: string
  minHeight?: number
}

export default function NotesEditor(props: Props) {
  return <NotesEditorTipTap {...props} />
}
