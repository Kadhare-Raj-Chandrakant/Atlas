import type { Editor as EditorInstance } from '@tiptap/core'
import type { Transaction } from '@tiptap/pm/state'
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

/**
 * Editor Writing Service — "Living Ink" (Release 21).
 *
 * Owns HOW Atlas-generated text appears inside the Tiptap editor:
 *   - beginWriting()  start a streaming session at the current cursor
 *   - appendChunk()   receive a streamed token; buffer it and reveal only
 *                     COMPLETE sentences, never individual characters
 *   - stopWriting()   user took over — stop immediately, discard the buffer
 *   - finishWriting() generation finished cleanly; flush any trailing text
 *
 * The reveal is calm: each completed sentence fades in with a very subtle blur
 * that resolves and a tiny upward movement (see the `ink-reveal` decoration +
 * keyframes in editor.css). The user always has priority: any real user
 * transaction (typing, editing, moving the cursor) or the Escape key interrupts
 * writing at once.
 */

const livingInkKey = new PluginKey('livingInk')

const livingInkPlugin = new Plugin({
  key: livingInkKey,
  state: {
    init: () => DecorationSet.empty,
    apply(tr, old) {
      const meta = tr.getMeta(livingInkKey)
      if (meta && meta.type === 'add') {
        // Decorate only the most recently revealed sentence; the previous one
        // has already finished animating and no longer needs the class.
        return DecorationSet.create(tr.doc, [Decoration.inline(meta.from, meta.to, { class: 'ink-reveal' })])
      }
      if (meta && meta.type === 'clear') {
        return DecorationSet.empty
      }
      return old.map(tr.mapping, tr.doc)
    },
  },
  props: {
    decorations(state) {
      return livingInkKey.getState(state)
    },
  },
})

/** Register on the editor so revealed sentences can be decorated. */
export const LivingInk = Extension.create({
  name: 'livingInk',
  addProseMirrorPlugins() {
    return [livingInkPlugin]
  },
})

let active = false
let inserting = false
let interruptCb: (() => void) | null = null
let keydownHandler: ((e: KeyboardEvent) => void) | null = null
/** Un-revealed streamed text awaiting a sentence boundary. */
let buffer = ''
let currentEditor: EditorInstance | null = null
let clearTimer: ReturnType<typeof setTimeout> | null = null

export function isWriting(): boolean {
  return active
}

export function beginWriting(editor: EditorInstance, onInterrupt: () => void): void {
  active = true
  interruptCb = onInterrupt
  buffer = ''
  currentEditor = editor

  // Focus without tripping the interrupt guard (focus dispatches a selection tx).
  inserting = true
  editor.commands.focus()
  inserting = false

  keydownHandler = (e: KeyboardEvent) => {
    if (!active) return
    if (e.key === 'Escape') {
      e.preventDefault()
      triggerInterrupt()
    }
  }
  document.addEventListener('keydown', keydownHandler, true)
}

/** Insert a completed thought into the editor and mark its range for the ink reveal. */
function insertText(editor: EditorInstance, text: string): void {
  if (!text) return
  inserting = true
  const from = editor.state.selection.from
  const segments = text.split('\n')
  segments.forEach((seg, i) => {
    if (i > 0) editor.chain().splitBlock().run()
    if (seg) editor.chain().insertContent(seg).run()
  })
  const to = editor.state.selection.from
  inserting = false

  if (to > from) {
    try {
      editor.view.dispatch(editor.state.tr.setMeta(livingInkKey, { type: 'add', from, to }))
      if (clearTimer) clearTimeout(clearTimer)
      clearTimer = setTimeout(() => {
        if (!currentEditor) return
        try {
          currentEditor.view.dispatch(currentEditor.state.tr.setMeta(livingInkKey, { type: 'clear' }))
        } catch {
          // editor was torn down — nothing to clear
        }
      }, 850)
    } catch {
      // editor unavailable — text is still in the document
    }
  }
}

/** Reveal every complete sentence currently buffered; keep any trailing fragment. */
function flushSentences(editor: EditorInstance): void {
  // A sentence ends with . ! or ? followed by whitespace or the end of the buffer.
  const sentenceRe = /[.!?](\s|$)/g
  let last = -1
  let m: RegExpExecArray | null
  while ((m = sentenceRe.exec(buffer)) !== null) {
    last = m.index + m[0].length
  }
  if (last > 0) {
    insertText(editor, buffer.slice(0, last))
    buffer = buffer.slice(last)
    return
  }

  // No sentence end yet — but a paragraph break is also a complete thought, so
  // reveal up to and including a newline rather than leaving the user waiting.
  const nl = buffer.lastIndexOf('\n')
  if (nl >= 0) {
    insertText(editor, buffer.slice(0, nl + 1))
    buffer = buffer.slice(nl + 1)
  }
}

export function appendChunk(editor: EditorInstance, text: string): void {
  if (!active || !text) return
  buffer += text
  flushSentences(editor)
}

/**
 * Open a fresh, labelled space for Atlas's reply inside the living document
 * (Release 22 — Shared Notebook). Inserts an "Atlas" label followed by an empty
 * paragraph at the end of the page, then parks the cursor there so streamed
 * tokens land in the right place. Wrapped in the `inserting` guard so the user's
 * own writing transaction handler never mistakes this for an interruption.
 */
export function prepareInlineResponse(editor: EditorInstance): void {
  inserting = true
  const end = editor.state.doc.content.size
  editor
    .chain()
    .insertContentAt(end, '<p class="convo-turn-label convo-atlas">Atlas</p><p></p>')
    .run()
  editor.commands.focus('end')
  inserting = false
}

function flushRemaining(editor: EditorInstance): void {
  if (buffer.trim()) {
    insertText(editor, buffer)
  }
  buffer = ''
}

export function stopWriting(): void {
  cleanup()
}

export function finishWriting(): void {
  if (active && currentEditor) {
    flushRemaining(currentEditor)
  }
  cleanup()
}

/**
 * Wired into the editor's onTransaction. While Atlas is writing, any transaction
 * that is not one of our own programmatic inserts means the user acted — so we
 * hand control straight back to them.
 */
export function handleTransaction(tr: Transaction): void {
  if (!active || inserting) return
  if (tr.docChanged || tr.selectionSet) {
    triggerInterrupt()
  }
}

function triggerInterrupt(): void {
  const cb = interruptCb
  cleanup()
  if (cb) cb()
}

function cleanup(): void {
  active = false
  inserting = false
  interruptCb = null
  buffer = ''
  if (clearTimer) {
    clearTimeout(clearTimer)
    clearTimer = null
  }
  if (keydownHandler) {
    document.removeEventListener('keydown', keydownHandler, true)
    keydownHandler = null
  }
  if (currentEditor) {
    const editor = currentEditor
    currentEditor = null
    // Remove any lingering ink decoration (deferred to avoid dispatching from
    // inside the user's own transaction handler).
    setTimeout(() => {
      try {
        editor.view.dispatch(editor.state.tr.setMeta(livingInkKey, { type: 'clear' }))
      } catch {
        // editor gone
      }
    }, 0)
  }
}
