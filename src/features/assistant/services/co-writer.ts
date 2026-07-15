import { aiManager } from '../../ai/provider-manager'
import { useAIStore } from '../../ai/hooks/useAIStore'
import { buildJournalPrompt } from './prompt-builder'

export interface JournalGenerationInput {
  history: { role: 'user' | 'assistant'; content: string }[]
  onToken: (token: string) => void
}

/**
 * Decides WHAT to write: turns the co-writer conversation into a polished
 * journal entry using the existing Provider Manager + streaming pipeline.
 * It does not touch the editor \u2014 the editor-writing-service owns HOW text appears.
 */
export async function generateJournalEntry(input: JournalGenerationInput): Promise<string> {
  const model = useAIStore.getState().model
  if (!model) {
    throw new Error('No AI model selected')
  }

  const prompt = buildJournalPrompt({
    history: input.history,
    currentDate: new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
  })

  const provider = aiManager.getProvider()

  try {
    const streamed = await provider.streamGenerate(prompt, model, input.onToken)
    if (streamed) return streamed
  } catch {
    // streaming failed — fall through to non-streaming generate
  }

  const generated = await provider.generate(prompt, model)
  if (generated) return generated

  throw new Error('AI provider returned an empty response')
}
