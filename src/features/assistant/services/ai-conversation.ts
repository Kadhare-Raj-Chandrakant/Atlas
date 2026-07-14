import type { Citation } from '../types'
import { aiManager } from '../../ai/provider-manager'
import { useAIStore } from '../../ai/hooks/useAIStore'
import { detectIntent } from './intent-service'
import { retrieveMemory } from './memory-retrieval'
import { buildPrompt } from './prompt-builder'

export interface AIConversationInput {
  history: { role: 'user' | 'assistant'; content: string }[]
  question: string
  onToken: (token: string) => void
}

export interface AIConversationResult {
  content: string
  citations: Citation[]
}

export async function runAIConversation(
  input: AIConversationInput,
): Promise<AIConversationResult> {
  const { intent, reflectionKeyword, queryType } = detectIntent(input.question)

  const needsMemory =
    intent === 'MemoryRecall' ||
    intent === 'EntitySearch' ||
    (intent === 'Reflection' && !!reflectionKeyword)

  let citations: Citation[] = []
  let context = ''

  if (needsMemory) {
    const memory = await retrieveMemory({ intent, reflectionKeyword, queryType })
    citations = memory.citations
    context = memory.context
  }

  const prompt = buildPrompt({
    history: input.history,
    context,
    question: input.question,
    currentDate: new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
  })

  const model = useAIStore.getState().model
  if (!model) {
    throw new Error('No AI model selected')
  }

  const provider = aiManager.getProvider()

  try {
    const streamed = await provider.streamGenerate(prompt, model, input.onToken)
    if (streamed) return { content: streamed, citations }
  } catch {
    // streaming failed — fall through to non-streaming generate
  }

  const generated = await provider.generate(prompt, model)
  if (generated) return { content: generated, citations }

  throw new Error('AI provider returned an empty response')
}
