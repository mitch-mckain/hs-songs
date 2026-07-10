'use client'

import ReactQuill from 'react-quill-new'
import 'react-quill-new/dist/quill.snow.css'

interface Props {
  value: string
  onChange: (html: string) => void
  onBlur?: () => void
  placeholder?: string
  minHeight?: number
}

const MODULES = {
  toolbar: [
    ['bold', 'italic'],
    [{ list: 'bullet' }],
  ],
}

const FORMATS = ['bold', 'italic', 'list']

export default function NotesEditorQuill({ value, onChange, onBlur, placeholder = 'Add notes…', minHeight = 120 }: Props) {
  return (
    <div className="notes-quill-wrap" style={{ '--notes-min-height': `${minHeight}px` } as React.CSSProperties}>
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        modules={MODULES}
        formats={FORMATS}
      />
    </div>
  )
}
