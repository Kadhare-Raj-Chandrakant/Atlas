import type { IntentType } from '../types'

const greetingResponses = [
  'Hey. Good to see you.',
  'Hi. I’m glad you’re here.',
  'Hello — whatever’s on your mind, I’m listening.',
  'Hey. Take your time; I’m not going anywhere.',
  'Good to see you. How’s the day treating you?',
  'Hi. Quietly here, ready when you are.',
]

const smallTalkResponses = [
  'I’m just here, keeping you company.',
  'Doing fine — mostly I sit with your words and wait for you.',
  'Not much. I tend to stay quiet unless you need me.',
  'Steady as ever. Your journal’s been keeping itself, same as always.',
  'I’m well, thanks for asking. How about you?',
]

const gratitudeResponses = [
  'Anytime.',
  'Happy to be here.',
  'Of course — that’s what I’m for.',
  'You’re welcome. I mean that.',
  'Glad I could sit with you for it.',
]

const farewellResponses = [
  'Take care.',
  'Rest well. I’ll be here tomorrow.',
  'See you soon.',
  'Go gently. Your words will keep.',
  'Bye for now — I’m not far.',
]

const writingHelpPrompts: string[] = [
  'What made today different from yesterday?',
  'Try starting with one small thing you noticed.',
  'What conversation is still echoing in your head?',
  'If today had a color, what would it be?',
  'You don’t need a grand reason — just begin where you are.',
  'What surprised you, even a little?',
  'Write the first true sentence that comes to mind. The rest tends to follow.',
  'What are you carrying that you haven’t said out loud yet?',
]

const unknownResponses = [
  'I’m not quite following — say it another way?',
  'I’m not sure I understand. You can ask me about your entries, or just tell me what’s on your mind.',
  'Hmm, I didn’t catch that. Want to try again?',
  'I can help you remember things you’ve written, or simply sit with whatever you’re thinking.',
]

const reflectionNoResultsResponses = [
  'I didn’t find any entries mentioning that.',
  'Nothing came up for that. It might not have come up in your writing yet.',
  'No matches found. It could be something you haven’t written about yet.',
]

const knowledgeUnavailableResponses = [
  'That’s a general-knowledge question. To answer it well I need a connected AI model. You can connect a local model (Ollama) from Settings, and I’ll be glad to help.',
  'I’d love to explain that, but general-knowledge answers need a connected AI model. Once a local model is available in Settings, just ask again.',
  'For questions like that I rely on a connected AI model. I can still help you search and recall your own journal anytime.',
]

const counters: Record<string, number> = {}

function pick<T>(arr: T[], key: string): T {
  counters[key] = (counters[key] ?? 0) + 1
  return arr[(counters[key] - 1) % arr.length]
}

export function getResponse(intent: IntentType): string {
  switch (intent) {
    case 'Greeting':
      return pick(greetingResponses, 'greeting')
    case 'SmallTalk':
      return pick(smallTalkResponses, 'smallTalk')
    case 'Gratitude':
      return pick(gratitudeResponses, 'gratitude')
    case 'Farewell':
      return pick(farewellResponses, 'farewell')
    case 'WritingHelp':
      return pick(writingHelpPrompts, 'writingHelp')
    case 'Reflection':
      return pick(reflectionNoResultsResponses, 'reflection')
    default:
      return pick(unknownResponses, 'unknown')
  }
}

export function getWritingPrompts(count = 3): string[] {
  const shuffled = [...writingHelpPrompts].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

export function getKnowledgeUnavailableResponse(): string {
  return pick(knowledgeUnavailableResponses, 'knowledgeUnavailable')
}

export function getHybridUnavailableNote(): string {
  return 'For the general explanation I’d need a connected AI model (you can add a local one in Settings). Here’s what I could find in your journal:'
}
