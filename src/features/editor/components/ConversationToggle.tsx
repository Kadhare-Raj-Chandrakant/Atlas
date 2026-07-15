import { useCoWriterStore } from '../store'

function AtlasGlyph({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2a4 4 0 014 4c0 2-2 4-4 6-2-2-4-4-4-6a4 4 0 014-4z" />
      <path d="M12 22v-6" />
      <path d="M8 22h8" />
    </svg>
  )
}

/**
 * A subtle, glass-like circular toggle pinned to the right edge of the editor.
 * It hints that a calmer "conversation" mode exists without breaking immersion.
 * Clicking it transforms the editor into Conversation Mode (and back again).
 */
export function ConversationToggle() {
  const mode = useCoWriterStore((s) => s.mode)
  const enterConversation = useCoWriterStore((s) => s.enterConversation)
  const exitConversation = useCoWriterStore((s) => s.exitConversation)

  const active = mode === 'conversation'

  return (
    <button
      type="button"
      onClick={() => (active ? exitConversation() : enterConversation())}
      aria-label={active ? 'Return to the journal' : 'Talk with Atlas inside your journal'}
      aria-pressed={active}
      className={[
        'group absolute right-0 top-1/2 z-30 -translate-y-1/2',
        'flex h-10 w-10 items-center justify-center rounded-full',
        'border backdrop-blur-xl',
        'transition-[transform,opacity,background-color,border-color,box-shadow,color] duration-500 ease-out',
        'active:scale-90',
        active
          ? 'border-primary-300/25 bg-primary-500/[0.07] text-primary-200/80 shadow-[0_2px_18px_rgba(99,102,241,0.16)] opacity-60 hover:opacity-90'
          : 'border-white/[0.06] bg-white/[0.03] text-neutral-500/70 shadow-[0_1px_14px_rgba(0,0,0,0.16)] opacity-25 hover:scale-105 hover:opacity-70 hover:text-primary-200/80 hover:bg-white/[0.06] hover:border-white/15',
      ].join(' ')}
    >
      <span className="transition-transform duration-500 ease-out group-hover:scale-105">
        <AtlasGlyph size={16} />
      </span>
    </button>
  )
}
