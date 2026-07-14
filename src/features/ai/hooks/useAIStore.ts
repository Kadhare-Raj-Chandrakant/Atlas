import { create } from 'zustand'
import { aiManager } from '../provider-manager'
import type { AIModel, AIStatus, ProviderId } from '../types'

const PROVIDER_KEY = 'atlas-ai-provider'
const MODEL_KEY = 'atlas-ai-model'

function loadProvider(): ProviderId {
  try {
    const stored = localStorage.getItem(PROVIDER_KEY) as ProviderId | null
    if (stored && stored in aiManager.listProviders().reduce<Record<string, true>>((acc, p) => {
      acc[p.id] = true
      return acc
    }, {})) {
      return stored
    }
  } catch {
    // localStorage unavailable
  }
  return 'ollama'
}

function loadModel(): string | null {
  try {
    return localStorage.getItem(MODEL_KEY)
  } catch {
    return null
  }
}

function saveProvider(id: ProviderId): void {
  try {
    localStorage.setItem(PROVIDER_KEY, id)
  } catch {
    // localStorage unavailable
  }
}

function saveModel(model: string | null): void {
  try {
    if (model) localStorage.setItem(MODEL_KEY, model)
    else localStorage.removeItem(MODEL_KEY)
  } catch {
    // localStorage unavailable
  }
}

interface AIState {
  initialized: boolean
  status: AIStatus
  providerId: ProviderId
  providerName: string
  models: AIModel[]
  model: string | null
  available: boolean
  init: () => Promise<void>
  refresh: () => Promise<void>
  setProvider: (id: ProviderId) => Promise<void>
  setModel: (name: string) => Promise<void>
}

export const useAIStore = create<AIState>((set, get) => ({
  initialized: false,
  status: 'idle',
  providerId: 'ollama',
  providerName: 'Ollama',
  models: [],
  model: null,
  available: false,

  init: async () => {
    if (get().initialized) return

    const providerId = loadProvider()
    const model = loadModel()

    aiManager.setActiveProvider(providerId)
    const provider = aiManager.getProvider(providerId)

    set({ status: 'checking', providerId, providerName: provider.name })

    try {
      const [available, models] = await Promise.all([provider.isAvailable(), provider.listModels()])

      let selected: string | null = model
      if (selected && !models.some((m) => m.name === selected)) {
        selected = null
      }

      provider.setModel(selected)

      set({
        initialized: true,
        available,
        status: available ? 'connected' : 'unavailable',
        models,
        model: selected,
      })
    } catch {
      set({
        initialized: true,
        available: false,
        status: 'unavailable',
        models: [],
        model: null,
      })
    }
  },

  refresh: async () => {
    const { providerId } = get()
    const provider = aiManager.getProvider(providerId)
    set({ status: 'checking' })

    try {
      const [available, models] = await Promise.all([provider.isAvailable(), provider.listModels()])

      let selected = get().model
      if (selected && !models.some((m) => m.name === selected)) {
        selected = null
        provider.setModel(null)
        saveModel(null)
      }

      set({
        available,
        status: available ? 'connected' : 'unavailable',
        models,
        model: selected,
      })
    } catch {
      set({ available: false, status: 'unavailable', models: [], model: null })
    }
  },

  setProvider: async (id: ProviderId) => {
    aiManager.setActiveProvider(id)
    const provider = aiManager.getProvider(id)
    saveProvider(id)
    set({ providerId: id, providerName: provider.name, status: 'checking', models: [], model: null })
    provider.setModel(null)
    saveModel(null)

    try {
      const [available, models] = await Promise.all([provider.isAvailable(), provider.listModels()])
      set({
        available,
        status: available ? 'connected' : 'unavailable',
        models,
        model: null,
      })
    } catch {
      set({ available: false, status: 'unavailable', models: [], model: null })
    }
  },

  setModel: async (name: string) => {
    const { providerId } = get()
    aiManager.getProvider(providerId).setModel(name)
    saveModel(name)
    set({ model: name })
  },
}))

export const aiAvailable = (): boolean => useAIStore.getState().available
export const currentProvider = (): string => useAIStore.getState().providerName
export const currentModel = (): string | null => useAIStore.getState().model
