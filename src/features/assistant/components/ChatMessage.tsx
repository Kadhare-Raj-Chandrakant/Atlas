import type { Message } from '../types'
import { useAppStore } from '@/shared/store/app-store'

function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function shortDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

interface ChatMessageProps {
  message: Message
}

export function ChatMessage({ message }: ChatMessageProps) {
  const navigate = useAppStore((s) => s.navigate)

  const isUser = message.role === 'user'

  if (!isUser && message.isStreaming && !message.content) {
    return (
      <div className="flex items-start">
        <div className="rounded-xl rounded-tl-sm border border-neutral-800/60 bg-neutral-800/50 px-4 py-2.5">
          <div className="flex gap-1.5">
            <span className="h-2 w-2 animate-pulse rounded-full bg-neutral-600" />
            <span className="h-2 w-2 animate-pulse rounded-full bg-neutral-600" style={{ animationDelay: '150ms' }} />
            <span className="h-2 w-2 animate-pulse rounded-full bg-neutral-600" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-medium text-neutral-500">
          {isUser ? 'You' : 'Atlas'}
        </span>
        <span className="text-[10px] text-neutral-700">
          {formatTimestamp(message.timestamp)}
        </span>
      </div>

      <div
        className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'bg-primary-500/15 text-neutral-200 rounded-tr-sm'
            : 'bg-neutral-800/50 text-neutral-300 rounded-tl-sm border border-neutral-800/60'
        }`}
      >
        <div className="whitespace-pre-wrap">
          {message.content}
          {!isUser && message.isStreaming && (
            <span className="ml-0.5 inline-block h-3.5 w-[2px] -translate-y-[1px] animate-pulse bg-neutral-400 align-middle" />
          )}
        </div>

        {message.citations && message.citations.length > 0 && !isUser && (
          <div className="mt-3 pt-2 border-t border-neutral-700/50">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 mb-1.5">
              Sources
            </div>
            <div className="space-y-1">
              {message.citations.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-neutral-400">
                    {shortDate(c.date)}
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate('today', { date: c.date })}
                    className="text-[11px] text-primary-400/80 hover:text-primary-400 transition-colors"
                  >
                    Open Entry
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
