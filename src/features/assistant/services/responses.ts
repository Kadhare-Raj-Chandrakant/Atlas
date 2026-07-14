import type { IntentType } from '../types'

const greetingResponses = [
  'Hi. Good to see you.',
  'Welcome back.',
  'Hey. What\u2019s on your mind today?',
  'Hello. I\u2019m here when you\u2019re ready to write or remember.',
  'Good to have you here.',
]

const smallTalkResponses = [
  'I\u2019m doing exactly what I was built for\u2014ready whenever you want to write or remember something.',
  'Not much. Your memories are waiting whenever you want to explore them.',
  'Quiet as always. Your journal entries are safe and ready.',
  'Same as ever. Just keeping your memories organized until you need them.',
]

const gratitudeResponses = [
  'You\u2019re welcome.',
  'Happy to help.',
  'Anytime.',
  'Glad I could help.',
  'Of course.',
]

const farewellResponses = [
  'Take care.',
  'See you next time.',
  'Sleep well. Your memories will still be here tomorrow.',
  'Until next time.',
  'Goodbye. I\u2019ll be here when you return.',
]

const writingHelpPrompts: string[] = [
  'What made today different?',
  'What surprised you today?',
  'What conversation stayed with you?',
  'What are you thinking about lately?',
  'What is one thing you noticed today that you almost missed?',
  'What felt meaningful today, even in a small way?',
  'If today had a title, what would it be?',
  'What are you looking forward to?',
]

const unknownResponses = [
  'I\u2019m not quite sure what you\u2019re asking.',
  'Could you tell me a little differently?',
  'I can help you remember things you\u2019ve written or help you start writing.',
  'I\u2019m not sure I understand. You can ask me about your entries, people you\u2019ve mentioned, or projects you\u2019ve worked on.',
]

const reflectionNoResultsResponses = [
  'I didn\u2019t find any entries mentioning that.',
  'Nothing came up for that. It might not have come up in your writing yet.',
  'No matches found. It could be something you haven\u2019t written about yet.',
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
