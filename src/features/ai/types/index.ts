export type ProviderId = 'ollama' | 'openai' | 'claude' | 'gemini' | 'lmstudio'

export interface AIModel {
  name: string
  size?: number
  modifiedAt?: string
  digest?: string
}

export interface AIProviderInfo {
  id: ProviderId
  name: string
  isLocal: boolean
  implemented: boolean
}

export type AIStatus = 'idle' | 'checking' | 'connected' | 'unavailable'

export interface AIProvider {
  readonly id: ProviderId
  readonly name: string
  readonly isLocal: boolean
  readonly implemented: boolean
  initialize(): Promise<void>
  isAvailable(): Promise<boolean>
  listModels(): Promise<AIModel[]>
  currentModel(): string | null
  setModel(model: string | null): void
  generate(prompt: string, model?: string): Promise<string>
  streamGenerate(
    prompt: string,
    model: string | undefined,
    onToken: (token: string) => void,
  ): Promise<string>
}
