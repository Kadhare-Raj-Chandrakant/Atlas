import type { AIProvider, AIModel, ProviderId } from '../types'

const DEFAULT_BASE_URL = 'http://localhost:11434'
const REQUEST_TIMEOUT_MS = 2500

function withTimeout(ms: number): AbortController {
  const controller = new AbortController()
  setTimeout(() => controller.abort(), ms)
  return controller
}

export class OllamaProvider implements AIProvider {
  readonly id: ProviderId = 'ollama'
  readonly name = 'Ollama'
  readonly isLocal = true
  readonly implemented = true

  private baseUrl: string = DEFAULT_BASE_URL
  private selectedModel: string | null = null

  setBaseUrl(url: string): void {
    this.baseUrl = url
  }

  async initialize(): Promise<void> {
    this.selectedModel = null
  }

  async isAvailable(): Promise<boolean> {
    try {
      const controller = withTimeout(REQUEST_TIMEOUT_MS)
      const res = await fetch(`${this.baseUrl}/api/tags`, { signal: controller.signal })
      return res.ok
    } catch {
      return false
    }
  }

  async listModels(): Promise<AIModel[]> {
    try {
      const controller = withTimeout(REQUEST_TIMEOUT_MS)
      const res = await fetch(`${this.baseUrl}/api/tags`, { signal: controller.signal })
      if (!res.ok) return []
      const data = (await res.json()) as { models?: Array<Record<string, unknown>> }
      const models: AIModel[] = (data.models ?? []).map((m) => ({
        name: String(m.name ?? ''),
        size: typeof m.size === 'number' ? m.size : undefined,
        modifiedAt: typeof m.modified_at === 'string' ? m.modified_at : undefined,
        digest: typeof m.digest === 'string' ? m.digest : undefined,
      }))
      return models
    } catch {
      return []
    }
  }

  currentModel(): string | null {
    return this.selectedModel
  }

  setModel(model: string | null): void {
    this.selectedModel = model
  }

  async generate(prompt: string, model?: string): Promise<string> {
    const target = model ?? this.selectedModel
    if (!target) return ''
    const controller = withTimeout(60000)
    const res = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({ model: target, prompt, stream: false }),
    })
    if (!res.ok) return ''
    const data = (await res.json()) as { response?: string }
    return data.response ?? ''
  }

  async streamGenerate(
    prompt: string,
    model: string | undefined,
    onToken: (token: string) => void,
  ): Promise<string> {
    const target = model ?? this.selectedModel
    if (!target) return ''
    const controller = withTimeout(120000)
    const res = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({ model: target, prompt, stream: true }),
    })
    if (!res.ok || !res.body) return ''
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let full = ''
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value, { stream: true })
      for (const line of chunk.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed) continue
        try {
          const data = JSON.parse(trimmed) as { response?: string; done?: boolean }
          if (data.response) {
            full += data.response
            onToken(data.response)
          }
          if (data.done) break
        } catch {
          // ignore malformed stream line
        }
      }
    }
    return full
  }
}
