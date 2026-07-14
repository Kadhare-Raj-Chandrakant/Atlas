import type { AIProvider, AIModel, ProviderId } from '../types'

export class PlaceholderProvider implements AIProvider {
  readonly id: ProviderId
  readonly name: string
  readonly isLocal: boolean
  readonly implemented = false

  private selectedModel: string | null = null

  constructor(id: ProviderId, name: string, isLocal: boolean) {
    this.id = id
    this.name = name
    this.isLocal = isLocal
  }

  async initialize(): Promise<void> {
    // no-op
  }

  async isAvailable(): Promise<boolean> {
    return false
  }

  async listModels(): Promise<AIModel[]> {
    return []
  }

  currentModel(): string | null {
    return this.selectedModel
  }

  setModel(model: string | null): void {
    this.selectedModel = model
  }

  async generate(): Promise<string> {
    throw new Error(`${this.name} provider is not implemented yet.`)
  }

  async streamGenerate(): Promise<string> {
    throw new Error(`${this.name} provider is not implemented yet.`)
  }
}
