import { create } from 'zustand'
import type { Message, Citation } from '../types'
import { processQuery } from '../services/assistant-service'
import { runAIConversation } from '../services/ai-conversation'
import { useAIStore, aiAvailable } from '../../ai/hooks/useAIStore'

let messageIdCounter = 0

function nextId(): string {
  messageIdCounter++
  return `msg-${Date.now()}-${messageIdCounter}`
}

function createUserMessage(text: string): Message {
  return {
    id: nextId(),
    role: 'user',
    content: text,
    timestamp: new Date().toISOString(),
  }
}

interface AssistantState {
  messages: Message[]
  isProcessing: boolean
  isOpen: boolean
  panelWidth: number
  aiAvailable: boolean
  aiProviderName: string
  aiModel: string | null
  sendMessage: (text: string) => Promise<void>
  toggleOpen: () => void
  setPanelWidth: (width: number) => void
}

const STORAGE_KEY = 'atlas-assistant-panel-width'

function loadWidth(): number {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const w = parseInt(stored, 10)
      if (w >= 320 && w <= window.innerWidth * 0.45) return w
    }
  } catch {
    // localStorage unavailable
  }
  return 380
}

function saveWidth(width: number) {
  try {
    localStorage.setItem(STORAGE_KEY, String(width))
  } catch {
    // localStorage unavailable
  }
}

export const useAssistantStore = create<AssistantState>((set, get) => ({
  messages: [],
  isProcessing: false,
  isOpen: false,
  panelWidth: loadWidth(),
  aiAvailable: false,
  aiProviderName: 'Ollama',
  aiModel: null,

  sendMessage: async (text: string) => {
    if (!text.trim() || get().isProcessing) return

    set({ isProcessing: true })

    const userMessage = createUserMessage(text)
    const assistantId = nextId()

    const history = get()
      .messages.filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }))

    const appendMessage = (msg: Message) =>
      set((state) => ({ messages: [...state.messages, msg] }))

    const updateMessage = (id: string, update: (m: Message) => Message) =>
      set((state) => ({
        messages: state.messages.map((m) => (m.id === id ? update(m) : m)),
      }))

    appendMessage(userMessage)
    appendMessage({
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      isStreaming: true,
    })

    const finalize = (content: string, citations: Citation[]) =>
      updateMessage(assistantId, (m) => ({ ...m, content, citations, isStreaming: false }))

    const replaceWith = (msg: Message) =>
      set((state) => ({
        messages: state.messages.map((m) => (m.id === assistantId ? msg : m)),
      }))

    try {
      if (aiAvailable()) {
        try {
          const result = await runAIConversation({
            history,
            question: text,
            onToken: (token) =>
              updateMessage(assistantId, (m) => ({ ...m, content: m.content + token })),
          })
          finalize(result.content, result.citations)
        } catch {
          const { assistantMessage } = await processQuery(text)
          replaceWith({ ...assistantMessage, isStreaming: false })
        }
      } else {
        const { assistantMessage } = await processQuery(text)
        replaceWith({ ...assistantMessage, isStreaming: false })
      }
      set({ isProcessing: false })
    } catch {
      replaceWith({
        id: assistantId,
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
        timestamp: new Date().toISOString(),
        isStreaming: false,
      })
      set({ isProcessing: false })
    }
  },

  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),

  setPanelWidth: (width: number) => {
    const clamped = Math.max(320, Math.min(width, window.innerWidth * 0.45))
    set({ panelWidth: clamped })
    saveWidth(clamped)
  },
}))

useAIStore.subscribe((state) => {
  const { aiAvailable, aiProviderName, aiModel } = useAssistantStore.getState()
  if (
    aiAvailable !== state.available ||
    aiProviderName !== state.providerName ||
    aiModel !== state.model
  ) {
    useAssistantStore.setState({
      aiAvailable: state.available,
      aiProviderName: state.providerName,
      aiModel: state.model,
    })
  }
})
