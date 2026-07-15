import type { Citation } from '../types'
import { aiManager } from '../../ai/provider-manager'
import { useAIStore } from '../../ai/hooks/useAIStore'
import { routeQuery } from './query-router'
import { retrieveMemory } from './memory-retrieval'
import { buildPrompt, type PromptMode } from './prompt-builder'
import { getResponse, getWritingPrompts } from './responses'
import { planConversationGuide, type GuidePlan } from './conversation-guide'

export interface AIConversationInput {
  history: { role: 'user' | 'assistant'; content: string }[]
  question: string
  onToken: (token: string) => void
}

export interface AIConversationResult {
  content: string
  citations: Citation[]
  plan?: GuidePlan
}

function conversationalReply(intent: ReturnType<typeof routeQuery>['intent']): string {
  if (intent === 'WritingHelp') {
    return getWritingPrompts(3)
      .map((p, i) => `${i + 1}. ${p}`)
      .join('\n\n')
  }
  return getResponse(intent)
}

function ruleBasedFollowUpSuffix(plan: GuidePlan): string {
  return plan.ruleBasedFollowUp ? `\n\n${plan.ruleBasedFollowUp}` : ''
}

export async function runAIConversation(
  input: AIConversationInput,
): Promise<AIConversationResult> {
  const route = routeQuery(input.question)

  // Conversation: reuse the existing conversational responses. No retrieval, no LLM.
  if (route.mode === 'conversation') {
    const plan = await planConversationGuide({
      message: input.question,
      route,
      history: input.history,
    })
    return {
      content: conversationalReply(route.intent) + ruleBasedFollowUpSuffix(plan),
      citations: [],
      plan,
    }
  }

  let citations: Citation[] = []
  let context = ''
  let promptMode: PromptMode = 'memory'

  if (route.mode === 'knowledge') {
    // Pure knowledge: never query the journal.
    promptMode = 'knowledge'
  } else {
    // Memory or hybrid: reuse the existing retrieval layer.
    promptMode = route.mode === 'hybrid' ? 'hybrid' : 'memory'
    const memory = await retrieveMemory({
      intent: route.intent,
      reflectionKeyword: route.reflectionKeyword,
      queryType: route.queryType,
    })
    citations = memory.citations
    context = memory.context
  }

  const plan = await planConversationGuide({
    message: input.question,
    route,
    history: input.history,
  })

  const prompt = buildPrompt({
    mode: promptMode,
    history: input.history,
    context,
    question: input.question,
    currentDate: new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    guide: plan.followUpHint || plan.transitionToWriting
      ? {
          followUpHint: plan.followUpHint,
          transitionToWriting: plan.transitionToWriting,
          facts: plan.facts,
        }
      : undefined,
  })

  const model = useAIStore.getState().model
  if (!model) {
    throw new Error('No AI model selected')
  }

  const provider = aiManager.getProvider()

  try {
    const streamed = await provider.streamGenerate(prompt, model, input.onToken)
    if (streamed) return { content: streamed, citations, plan }
  } catch {
    // streaming failed — fall through to non-streaming generate
  }

  const generated = await provider.generate(prompt, model)
  if (generated) return { content: generated, citations, plan }

  throw new Error('AI provider returned an empty response')
}
