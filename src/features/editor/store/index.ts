import { create } from 'zustand'
import type { Editor as EditorInstance } from '@tiptap/core'
import { runAIConversation, generateJournalEntry, type AIConversationResult } from '@/features/assistant'
import { aiAvailable } from '@/features/ai/hooks/useAIStore'
import {
  beginWriting,
  appendChunk,
  stopWriting as stopWritingService,
  finishWriting,
  prepareInlineResponse,
} from '../services/editor-writing-service'

export interface CoWriterMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
}

const WRITE_OFFER = 'I think I have enough to write today\u2019s journal. Would you like me to?'

const NO_AI_MESSAGE =
  'Writing directly into your journal needs a connected local AI model. You can add one in Settings \u2014 your journal stays fully usable in the meantime.'

const AFFIRMATIVE =
  /^(y|ya|yes|yep|yeah|yup|sure|ok|okay|please|go ahead|do it|sounds good|write it|write|let\u2019s do it|let's do it|go for it|absolutely|definitely)\b/i

let idCounter = 0
function nextId(): string {
  idCounter++
  return `cw-${Date.now()}-${idCounter}`
}

function isReadyToWrite(messages: CoWriterMessage[]): boolean {
  const userMsgs = messages.filter((m) => m.role === 'user')
  const totalChars = userMsgs.reduce((n, m) => n + m.content.trim().length, 0)
  return userMsgs.length >= 2 && totalChars >= 80
}

// Release 22 — Shared Notebook: while Atlas is replying inline, the partial
// reply is accumulated here so an interruption can still capture it as a turn.
let pendingAssistantId: string | null = null
let pendingAssistant = ''

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Render the committed conversation as labelled notebook passages. The trailing
 * empty paragraph is the user's live writing space — the single surface where
 * they write and Atlas replies, with no separate chat input.
 */
function renderTurns(messages: CoWriterMessage[]): string {
  const parts = messages
    .filter((m) => m.content.trim().length > 0)
    .map((m) => {
      const isUser = m.role === 'user'
      const labelCls = isUser ? 'convo-turn-label convo-you' : 'convo-turn-label convo-atlas'
      const label = isUser ? 'You' : 'Atlas'
      const body = escapeHtml(m.content).replace(/\n/g, '<br>')
      return `<p class="${labelCls}">${label}</p><p>${body}</p>`
    })
  return parts.join('')
}

function syncConversationToEditor(editor: EditorInstance, messages: CoWriterMessage[]): void {
  const html = renderTurns(messages) + '<p class="convo-input"></p>'
  editor.commands.setContent(html, false)
  editor.commands.focus('end')
}

export type EditorMode = 'editor' | 'conversation'

interface CoWriterState {
  mode: EditorMode
  messages: CoWriterMessage[]
  isProcessing: boolean
  isWriting: boolean
  awaitingConfirm: boolean
  hasWritten: boolean
  editor: EditorInstance | null
  enterConversation: () => void
  exitConversation: () => void
  setEditor: (editor: EditorInstance | null) => void
  syncConversationSurface: () => void
  sendMessage: (text: string) => Promise<void>
  startWriting: () => Promise<void>
  stopWriting: () => void
}

export const useCoWriterStore = create<CoWriterState>((set, get) => {
  const appendMessage = (msg: CoWriterMessage) =>
    set((state) => ({ messages: [...state.messages, msg] }))

  const updateMessage = (id: string, update: (m: CoWriterMessage) => CoWriterMessage) =>
    set((state) => ({
      messages: state.messages.map((m) => (m.id === id ? update(m) : m)),
    }))

  const appendAssistant = (content: string) =>
    appendMessage({ id: nextId(), role: 'assistant', content })

  return {
    mode: 'editor',
    messages: [],
    isProcessing: false,
    isWriting: false,
    awaitingConfirm: false,
    hasWritten: false,
    editor: null,

    enterConversation: () => set({ mode: 'conversation' }),
    exitConversation: () => set({ mode: 'editor' }),

    setEditor: (editor) => set({ editor }),

    syncConversationSurface: () => {
      const editor = get().editor
      if (editor) syncConversationToEditor(editor, get().messages)
    },

    sendMessage: async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || get().isProcessing || get().isWriting) return

      appendMessage({ id: nextId(), role: 'user', content: trimmed })

      // Confirmation gate: if Atlas offered to write, honor a yes/no here.
      if (get().awaitingConfirm) {
        if (AFFIRMATIVE.test(trimmed)) {
          await get().startWriting()
          return
        }
        set({ awaitingConfirm: false })
        appendAssistant('No problem \u2014 tell me more, and I\u2019ll write when you\u2019re ready.')
        return
      }

      if (!aiAvailable()) {
        appendAssistant(NO_AI_MESSAGE)
        return
      }

      set({ isProcessing: true })
      const assistantId = nextId()
      appendMessage({ id: assistantId, role: 'assistant', content: '', isStreaming: true })

      const history = get()
        .messages.filter((m) => m.role === 'user' || m.role === 'assistant')
        .slice(-12)
        .map((m) => ({ role: m.role, content: m.content }))

      const editor = get().editor
      const inline = !!editor && get().mode === 'conversation'

      if (inline) {
        // Re-render the committed turns (now including the line just sent) so the
        // page reads like a notebook, then open a fresh space for Atlas underneath.
        syncConversationToEditor(editor, get().messages)
        set({ isWriting: true })
        beginWriting(editor, () => get().stopWriting())
        prepareInlineResponse(editor)
        pendingAssistantId = assistantId
        pendingAssistant = ''
      }

      let result: AIConversationResult | undefined
      try {
        result = await runAIConversation({
          history,
          question: trimmed,
          onToken: (token) => {
            if (inline && editor) {
              pendingAssistant += token
              appendChunk(editor, token)
            } else {
              updateMessage(assistantId, (m) => ({ ...m, content: m.content + token }))
            }
          },
        })
        if (inline && editor) {
          finishWriting()
          set({ isWriting: false })
        }
        const finalContent = result?.content ?? pendingAssistant
        updateMessage(assistantId, (m) => ({ ...m, content: finalContent, isStreaming: false }))
      } catch {
        if (inline && editor) {
          finishWriting()
          set({ isWriting: false })
        }
        updateMessage(assistantId, (m) => ({
          ...m,
          content: 'Sorry, something went wrong. Please try again.',
          isStreaming: false,
        }))
        set({ isProcessing: false })
        pendingAssistantId = null
        return
      }

      set({ isProcessing: false })

      // The Conversation Guide may nudge toward writing even before full readiness.
      const guidedToWrite = result?.plan?.transitionToWriting ?? false

      // Offer to write once Atlas has enough context, or when the guide suggests it.
      if (
        !get().hasWritten &&
        !get().awaitingConfirm &&
        (isReadyToWrite(get().messages) || guidedToWrite)
      ) {
        set({ awaitingConfirm: true })
        appendAssistant(WRITE_OFFER)
      }

      if (inline && editor) {
        // Normalize the document so the labels and spacing read cleanly.
        syncConversationToEditor(editor, get().messages)
        pendingAssistantId = null
      }
    },

    startWriting: async () => {
      const editor = get().editor
      if (!editor) {
        appendAssistant('Open today’s journal page first, and I’ll write there.')
        set({ awaitingConfirm: false })
        return
      }

      // When writing into the journal, return to the editor surface so the
      // streaming text is visible to the user. Conversation history is kept.
      if (get().mode === 'conversation') {
        set({ mode: 'editor' })
      }
      if (!aiAvailable()) {
        appendAssistant(NO_AI_MESSAGE)
        set({ awaitingConfirm: false })
        return
      }

      set({ awaitingConfirm: false, isWriting: true, isProcessing: true })
      appendAssistant('Writing into your journal now\u2026 type or press Esc anytime to take over.')

      const history = get()
        .messages.filter((m) => m.role === 'user' || m.role === 'assistant')
        .slice(-12)
        .map((m) => ({ role: m.role, content: m.content }))

      let inserted = 0
      beginWriting(editor, () => get().stopWriting())

      try {
        const full = await generateJournalEntry({
          history,
          onToken: (token) => {
            if (!get().isWriting) return
            appendChunk(editor, token)
            inserted += token.length
          },
        })
        if (get().isWriting && inserted === 0 && full) {
          appendChunk(editor, full)
        }
      } catch {
        if (get().isWriting) {
          finishWriting()
          set({ isWriting: false, isProcessing: false, hasWritten: true })
          appendAssistant('I couldn\u2019t finish writing just now. What I did add is still there for you to edit.')
        } else {
          set({ isProcessing: false })
        }
        return
      }

      if (get().isWriting) {
        finishWriting()
        set({ isWriting: false, isProcessing: false, hasWritten: true })
        appendAssistant('Done \u2014 I\u2019ve written today\u2019s entry. Edit anything you like.')
      } else {
        set({ isProcessing: false })
      }
    },

    stopWriting: () => {
      if (!get().isWriting) return
      stopWritingService()

      const wasInline = get().mode === 'conversation'
      const pid = pendingAssistantId
      const ptext = pendingAssistant
      pendingAssistantId = null
      pendingAssistant = ''

      if (wasInline && pid) {
        // Keep whatever Atlas had streamed as the turn, then re-render the page.
        updateMessage(pid, (m) => ({ ...m, content: ptext, isStreaming: false }))
        set({ isWriting: false, isProcessing: false })
        const editor = get().editor
        if (editor) setTimeout(() => syncConversationToEditor(editor, get().messages), 0)
        return
      }

      set({ isWriting: false, isProcessing: false, hasWritten: true })
      appendAssistant('Stopped \u2014 you have the pen now.')
    },
  }
})
