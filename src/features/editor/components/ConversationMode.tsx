/**
 * A calm, centered hint shown only when a conversation has not started yet.
 * It is rendered as a pointer-events-none overlay above the editor, so the user
 * can begin writing immediately without it getting in the way.
 */
export function ConversationEmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-2 text-center">
      <p className="text-[15px] leading-[1.9] text-neutral-500">
        This is your journal — and Atlas is already here.
      </p>
      <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-neutral-600">
        Write as you would in a notebook. Atlas replies right here, in the same
        page. Press Enter to share a thought.
      </p>
    </div>
  )
}
