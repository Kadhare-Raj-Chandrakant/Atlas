import type { RouteResult } from './query-router'
import { getMemoryInsights } from '@/features/insights/services/insights-service'
import type { MemoryInsights, EntityInsightItem } from '@/features/insights/types'

export type GuideAction = 'continue' | 'follow-up' | 'reflect' | 'transition-to-writing'

export interface GuidePlan {
  action: GuideAction
  /** Instruction for the LLM: how/what to ask, grounded in facts. Empty when no follow-up. */
  followUpHint: string
  /** Short, templated follow-up for the no-AI (rule-based) path. Null when none. */
  ruleBasedFollowUp: string | null
  /** Whether Atlas should gently suggest writing today's journal. */
  transitionToWriting: boolean
  /** Grounded facts (only things that exist in memory) the follow-up may draw on. */
  facts: string
}

export interface GuideInput {
  message: string
  route: RouteResult
  history?: { role: 'user' | 'assistant'; content: string }[]
  /** Optional pre-fetched insights (avoids a second fetch when the caller already has them). */
  insights?: MemoryInsights | null
}

const EMOTION_WORDS = [
  'stress', 'stressed', 'anxious', 'anxiety', 'overwhelm', 'overwhelmed',
  'happy', 'sad', 'tired', 'exhausted', 'excited', 'calm', 'grateful',
  'angry', 'frustrat', 'frustrated', 'lonely', 'proud', 'peaceful',
]

function matchEntities(message: string, insights: MemoryInsights): { name: string; type: string }[] {
  const lower = message.toLowerCase()
  const found: { name: string; type: string }[] = []

  const scan = (items: EntityInsightItem[], type: string) => {
    for (const item of items) {
      const value = item.value.toLowerCase()
      if (value.length >= 3 && lower.includes(value)) {
        found.push({ name: item.value, type })
      }
    }
  }

  scan(insights.topPeople, 'person')
  scan(insights.topPlaces, 'place')
  scan(insights.topProjects, 'project')
  scan(insights.topIdeas, 'idea')
  scan(insights.topTopics, 'topic')

  const seen = new Set<string>()
  return found.filter((e) => {
    const key = e.name.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function hasEmotion(message: string): boolean {
  return EMOTION_WORDS.some((w) => new RegExp(`\\b${w}`, 'i').test(message))
}

/** How many of the last `window` assistant turns ended with a question. */
function assistantQuestionCount(history?: GuideInput['history'], window = 3): number {
  const recent = (history ?? []).slice(-window)
  return recent.filter((m) => m.role === 'assistant' && /\?\s*$/.test(m.content.trim())).length
}

/** Entity names Atlas has already asked the user about in this conversation. */
function entitiesAtlasAlreadyAsked(history: GuideInput['history'], insights: MemoryInsights): Set<string> {
  const set = new Set<string>()
  for (const m of (history ?? []).filter((h) => h.role === 'assistant')) {
    for (const e of matchEntities(m.content, insights)) set.add(e.name.toLowerCase())
  }
  return set
}

const REFLECTION_QUESTIONS = [
  'What do you think was underneath that?',
  'What do you suppose brought it on?',
  'How are you sitting with it?',
  'What part of it has stayed with you?',
  'When did you first notice it?',
]

const GREETING_OFFERS = [
  'Want to capture today\u2019s entry while it\u2019s still fresh?',
  'If today feels worth keeping, I can help you write it down.',
  'Whenever you\u2019re ready, we could jot today into your journal.',
]

let reflectIdx = 0
let greetIdx = 0

function nextReflectionQuestion(): string {
  const q = REFLECTION_QUESTIONS[reflectIdx % REFLECTION_QUESTIONS.length]
  reflectIdx++
  return q
}

function nextGreetingOffer(): string {
  const q = GREETING_OFFERS[greetIdx % GREETING_OFFERS.length]
  greetIdx++
  return q
}

function lastAssistantAskedQuestion(history?: GuideInput['history']): boolean {
  if (!history || history.length === 0) return false
  const last = history[history.length - 1]
  return last.role === 'assistant' && /\?\s*$/.test(last.content.trim())
}

function ruleBasedQuestionForEntity(entity: { name: string; type: string }): string {
  switch (entity.type) {
    case 'person':
      return `How did things go with ${entity.name}?`
    case 'project':
      return `How's ${entity.name} coming along?`
    case 'place':
      return `How was ${entity.name}?`
    case 'idea':
      return `What got you thinking about ${entity.name}?`
    case 'topic':
    default:
      return `What made you bring up ${entity.name}?`
  }
}

/**
 * Conversation Guide — sits before response generation and decides whether Atlas should
 * continue normally, ask a single follow-up, encourage reflection, or transition toward
 * writing today's journal. It reuses the Query Router, Memory Insights (top people/places/
 * projects + knowledge-graph relationships + writing streaks), and recent entries. No
 * retrieval or AI/provider logic lives here.
 */
export async function planConversationGuide(input: GuideInput): Promise<GuidePlan> {
  const { message, route, history } = input

  // Pure general-knowledge questions never carry journal context or follow-ups.
  if (route.mode === 'knowledge') {
    return {
      action: 'continue',
      followUpHint: '',
      ruleBasedFollowUp: null,
      transitionToWriting: false,
      facts: '',
    }
  }

  // If Atlas just asked a question and the user gave a short, non-question reply,
  // do not pile on another question — let the conversation breathe.
  const shortReply = message.trim().split(/\s+/).length <= 4 && !/\?\s*$/.test(message.trim())
  if (lastAssistantAskedQuestion(history) && shortReply) {
    return {
      action: 'continue',
      followUpHint: '',
      ruleBasedFollowUp: null,
      transitionToWriting: false,
      facts: '',
    }
  }

  const insights = input.insights ?? (await getMemoryInsights())

  // Greetings are the natural moment to offer writing — calm, never forced.
  if (route.intent === 'Greeting') {
    return {
      action: 'transition-to-writing',
      followUpHint:
        'The user just said hello. If it feels natural, gently suggest capturing today\u2019s journal entry in a single short sentence. Do not also ask a question.',
      ruleBasedFollowUp: nextGreetingOffer(),
      transitionToWriting: true,
      facts: '',
    }
  }

  const entities = matchEntities(message, insights)
  const alreadyAsked = entitiesAtlasAlreadyAsked(history, insights)

  if (entities.length > 0) {
    // Prefer an entity we have not yet asked about; fall back to the first mention.
    const primary = entities.find((e) => !alreadyAsked.has(e.name.toLowerCase())) ?? entities[0]

    // Avoid piling on: if we just asked about this, or we have been asking a lot lately,
    // let the moment breathe instead of repeating a question.
    if (alreadyAsked.has(primary.name.toLowerCase()) || assistantQuestionCount(history, 3) >= 2) {
      return {
        action: 'continue',
        followUpHint: '',
        ruleBasedFollowUp: null,
        transitionToWriting: false,
        facts: '',
      }
    }

    const factLines = entities
      .map((e) => {
        const src = [insights.topPeople, insights.topPlaces, insights.topProjects, insights.topIdeas, insights.topTopics]
          .flat()
          .find((i) => i.value.toLowerCase() === e.name.toLowerCase())
        const count = src ? `mentioned ${src.count} time${src.count === 1 ? '' : 's'} in your journal` : 'in your journal'
        return `- ${e.name} (${e.type}, ${count})`
      })
      .join('\n')

    return {
      action: 'follow-up',
      followUpHint: `The user mentioned ${primary.name} (a ${primary.type}). If it helps the moment, end your reply with at most ONE short, natural follow-up about ${primary.name} — for example how it went or what happened. Base it only on the facts below or the user\u2019s message. If a question doesn\u2019t fit, simply acknowledge and ask nothing.`,
      ruleBasedFollowUp: ruleBasedQuestionForEntity(primary),
      transitionToWriting: false,
      facts: factLines,
    }
  }

  if (hasEmotion(message)) {
    const streakLine =
      insights.currentStreak >= 3
        ? `\n- You've written in your journal ${insights.currentStreak} days in a row.`
        : ''

    // If we have been asking a lot, simply acknowledge the feeling rather than pose
    // another question — silence is sometimes the more thoughtful reply.
    if (assistantQuestionCount(history, 3) >= 2) {
      return {
        action: 'continue',
        followUpHint: '',
        ruleBasedFollowUp: null,
        transitionToWriting: false,
        facts: streakLine.trim(),
      }
    }

    const question = nextReflectionQuestion()
    return {
      action: 'reflect',
      followUpHint: `The user shared an emotional state. Acknowledge the feeling softly first. You may end with at most ONE short, gentle reflection — for example: "${question}". If a question doesn\u2019t fit the moment, simply acknowledge and say nothing more. Do not ask more than one question.`,
      ruleBasedFollowUp: question,
      transitionToWriting: false,
      facts: streakLine.trim(),
    }
  }

  // Nothing specific to ask about — keep the conversation calm and continue.
  return {
    action: 'continue',
    followUpHint: '',
    ruleBasedFollowUp: null,
    transitionToWriting: false,
    facts: '',
  }
}
