import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect } from 'react'
import type { Editor as EditorInstance } from '@tiptap/core'
import { useCoWriterStore } from '../store'
import { handleTransaction, LivingInk } from '../services/editor-writing-service'

interface EditorProps {
  content: string
  onUpdate: (html: string, charCount: number) => void
}

function getCharCount(editor: EditorInstance): number {
  return editor.state.doc.textContent.length
}

export function Editor({ content, onUpdate }: EditorProps) {
  const setCoWriterEditor = useCoWriterStore((s) => s.setEditor)
  const mode = useCoWriterStore((s) => s.mode)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Placeholder.configure({
        placeholder: 'Start writing...',
      }),
      LivingInk,
    ],
    content,
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none min-h-[50vh]',
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      const chars = getCharCount(editor)
      onUpdate(html, chars)
    },
    onTransaction: ({ transaction }) => {
      handleTransaction(transaction)
    },
  })

  useEffect(() => {
    // In Shared Notebook mode the store owns the editor content (the live
    // conversation); never let a parent re-render reset it back to the entry.
    if (mode === 'conversation') return
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content)
    }
  }, [editor, content, mode])

  useEffect(() => {
    setCoWriterEditor(editor ?? null)
    return () => setCoWriterEditor(null)
  }, [editor, setCoWriterEditor])

  if (!editor) {
    return null
  }

  return (
    <EditorContent
      editor={editor}
      className="w-full"
      aria-label="Journal editor"
      role="textbox"
      aria-multiline="true"
    />
  )
}
