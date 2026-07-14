import { useRef, useCallback, useEffect } from 'react'
import { useAssistantStore } from '../hooks/useAssistantStore'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'

export function AssistantPanel() {
  const { messages, isProcessing, isOpen, panelWidth, toggleOpen, setPanelWidth, sendMessage } =
    useAssistantStore()

  const scrollRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<HTMLDivElement>(null)
  const startXRef = useRef(0)
  const startWidthRef = useRef(0)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      startXRef.current = e.clientX
      startWidthRef.current = panelWidth

      const handleMouseMove = (ev: MouseEvent) => {
        const dx = ev.clientX - startXRef.current
        setPanelWidth(startWidthRef.current - dx)
      }

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }

      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [panelWidth, setPanelWidth],
  )

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={toggleOpen}
          className="flex shrink-0 items-center gap-2 border-l border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-neutral-500 hover:text-primary-400 transition-colors"
          style={{ writingMode: 'vertical-lr' }}
          aria-label="Open Atlas AI"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="rotate-90">
            <path d="M12 2a4 4 0 014 4c0 2-2 4-4 6-2-2-4-4-4-6a4 4 0 014-4z" />
            <path d="M12 22v-6" />
            <path d="M8 22h8" />
          </svg>
          Atlas AI
        </button>
      )}

      {isOpen && (
        <div
          className="flex shrink-0 border-l border-neutral-800 bg-neutral-950/95 backdrop-blur-sm"
          style={{ width: panelWidth }}
        >
          <div
            ref={dragRef}
            onMouseDown={handleMouseDown}
            className="w-1 shrink-0 cursor-col-resize bg-transparent hover:bg-primary-500/30 active:bg-primary-500/50 transition-colors relative -ml-0.5 z-10"
          />

          <div className="flex flex-1 flex-col min-w-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800/60">
              <div className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-400">
                  <path d="M12 2a4 4 0 014 4c0 2-2 4-4 6-2-2-4-4-4-6a4 4 0 014-4z" />
                  <path d="M12 22v-6" />
                  <path d="M8 22h8" />
                </svg>
                <span className="text-sm font-semibold text-neutral-200">
                  Atlas AI
                </span>
              </div>
              <button
                type="button"
                onClick={toggleOpen}
                className="flex h-6 w-6 items-center justify-center rounded-md text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/50 transition-all"
                aria-label="Close panel"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18" />
                  <path d="M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-3 py-4 space-y-4 scroll-smooth"
            >
              {messages.length === 0 && (
                <div className="flex h-full items-center justify-center px-2">
                  <div className="text-center space-y-2">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-neutral-700">
                      <path d="M12 2a4 4 0 014 4c0 2-2 4-4 6-2-2-4-4-4-6a4 4 0 014-4z" />
                      <path d="M12 22v-6" />
                      <path d="M8 22h8" />
                    </svg>
                    <p className="text-sm text-neutral-600">
                      Ask me about your memories.
                    </p>
                    <p className="text-xs text-neutral-700">
                      Try: "What happened yesterday?"
                    </p>
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}

              {isProcessing && !messages.some((m) => m.isStreaming) && (
                <div className="flex items-start">
                  <div className="rounded-xl rounded-tl-sm border border-neutral-800/60 bg-neutral-800/50 px-4 py-2.5">
                    <div className="flex gap-1.5">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-neutral-600" />
                      <span className="h-2 w-2 animate-pulse rounded-full bg-neutral-600" style={{ animationDelay: '150ms' }} />
                      <span className="h-2 w-2 animate-pulse rounded-full bg-neutral-600" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <ChatInput onSend={sendMessage} disabled={isProcessing} />
          </div>
        </div>
      )}
    </>
  )
}
