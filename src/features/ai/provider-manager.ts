import type { AIProvider, AIProviderInfo, AIModel, ProviderId } from './types'
import { OllamaProvider, PlaceholderProvider } from './providers'

const providers: Record<ProviderId, AIProvider> = {
  ollama: new OllamaProvider(),
  openai: new PlaceholderProvider('openai', 'OpenAI', false),
  claude: new PlaceholderProvider('claude', 'Claude', false),
  gemini: new PlaceholderProvider('gemini', 'Gemini', false),
  lmstudio: new PlaceholderProvider('lmstudio', 'LM Studio', true),
}

const PROVIDER_ORDER: ProviderId[] = ['ollama', 'lmstudio', 'openai', 'claude', 'gemini']

export class AIProviderManager {
  private activeId: ProviderId = 'ollama'

  listProviders(): AIProviderInfo[] {
    return PROVIDER_ORDER.map((id) => {
      const p = providers[id]
      return { id: p.id, name: p.name, isLocal: p.isLocal, implemented: p.implemented }
    })
  }

  getProvider(id: ProviderId = this.activeId): AIProvider {
    return providers[id]
  }

  get activeProviderId(): ProviderId {
    return this.activeId
  }

  setActiveProvider(id: ProviderId): void {
    this.activeId = id
  }

  async isAvailable(id: ProviderId = this.activeId): Promise<boolean> {
    return providers[id].isAvailable()
  }

  async listModels(id: ProviderId = this.activeId): Promise<AIModel[]> {
    return providers[id].listModels()
  }
}

export const aiManager = new AIProviderManager()
