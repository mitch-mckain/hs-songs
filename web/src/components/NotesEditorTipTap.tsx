'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect } from 'react'

interface Props {
  value: string
  onChange: (html: string) => void
  onBlur?: () => void
  placeholder?: string
  minHeight?: number
}

export default function NotesEditorTipTap({ value, onChange, onBlur, placeholder = 'Add notes…', minHeight = 120 }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    onBlur: () => onBlur?.(),
    editorProps: {
      attributes: {
        style: `min-height: ${minHeight}px; outline: none; padding: 10px 12px; font-size: 14px; line-height: 1.6; color: #4a4850; font-family: inherit;`,
      },
    },
  })

  // Sync external value changes (e.g. initial load)
  useEffect(() => {
    if (!editor) return
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value, false)
    }
  }, [value, editor])

  return (
    <div style={{ border: '1px solid #17181c', borderRadius: 2, background: '#faf7ee', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 2, padding: '6px 8px', borderBottom: '1px solid #e3e0d8', background: '#f5f1e4' }}>
        <ToolBtn
          active={editor?.isActive('bold') ?? false}
          onClick={() => editor?.chain().focus().toggleBold().run()}
          title="Bold"
        ><strong>B</strong></ToolBtn>
        <ToolBtn
          active={editor?.isActive('italic') ?? false}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          title="Italic"
        ><em>I</em></ToolBtn>
        <ToolBtn
          active={editor?.isActive('bulletList') ?? false}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          title="Bullet list"
        >• List</ToolBtn>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}

function ToolBtn({ active, onClick, title, children }: { active: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); onClick() }}
      title={title}
      style={{
        background: active ? '#e3e0d8' : 'none',
        border: '1px solid ' + (active ? '#c7c3ba' : 'transparent'),
        borderRadius: 3,
        padding: '2px 8px',
        cursor: 'pointer',
        fontSize: 13,
        color: '#37352f',
        fontFamily: 'inherit',
      }}
    >
      {children}
    </button>
  )
}
