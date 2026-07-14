export interface PromptInput {
  history: { role: 'user' | 'assistant'; content: string }[]
  context: string
  question: string
  currentDate: string
}

const IDENTITY = [
  'You are Atlas, a calm, thoughtful, and supportive memory companion.',
  'You help the user reflect on their own journal entries.',
  'You never invent memories, never fabricate journal entries, and never claim emotions or consciousness.',
  'Answer concisely and warmly, like a trusted thinking partner. Avoid robotic wording and unnecessary verbosity.',
  'Use ONLY the provided memory context to answer questions about the user’s past.',
  'If the context contains no relevant entries, explain naturally that nothing matching was found (for example: "I couldn’t find anything in your journal about that."). Never say "I am an AI model" or "I cannot answer that."',
  'Keep responses brief and clear.',
].join('\n')

function renderHistory(history: PromptInput['history']): string {
  if (history.length === 0) return ''
  return history
    .map((m) => `${m.role === 'user' ? 'User' : 'Atlas'}: ${m.content}`)
    .join('\n')
}

export function buildPrompt(input: PromptInput): string {
  const parts: string[] = [IDENTITY]

  parts.push(`Current date: ${input.currentDate}`)

  if (input.context.trim()) {
    parts.push(`Here are the relevant memories from the user’s journal:\n\n${input.context}`)
  } else {
    parts.push('No relevant memories were found in the user’s journal for this question.')
  }

  const history = renderHistory(input.history)
  if (history) {
    parts.push(`Recent conversation:\n${history}`)
  }

  parts.push(`User: ${input.question}`)
  parts.push('Atlas:')

  return parts.join('\n\n')
}
