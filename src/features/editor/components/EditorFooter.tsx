interface EditorFooterProps {
  charCount: number
  isSaving: boolean
  lastSaved: Date | null
}

function isMac(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Mac|iPod|iPhone|iPad/.test(navigator.platform)
}

const mod = isMac() ? '\u2318' : 'Ctrl+'

const shortcuts = [
  { keys: `${mod}B`, label: 'Bold' },
  { keys: `${mod}I`, label: 'Italic' },
  { keys: `${mod}Shift+7`, label: 'Ordered list' },
  { keys: `${mod}Shift+8`, label: 'Bullet list' },
  { keys: `${mod}Shift+9`, label: 'Checklist' },
  { keys: `${mod}Alt+1\u20133`, label: 'Heading' },
]

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function EditorFooter({
  charCount,
  isSaving,
  lastSaved,
}: EditorFooterProps) {
  return (
    <div className="flex items-center justify-between border-t border-neutral-800 px-1 pt-3">
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {shortcuts.map((shortcut) => (
          <span key={shortcut.keys} className="text-xs text-neutral-600">
            <kbd className="font-mono text-neutral-500">{shortcut.keys}</kbd>{' '}
            {shortcut.label}
          </span>
        ))}
      </div>

      <div className="flex items-center gap-3" role="status" aria-live="polite">
        {isSaving && (
          <span className="text-xs text-neutral-500">Saving...</span>
        )}
        {!isSaving && lastSaved && (
          <span className="text-xs text-neutral-600">
            Saved at {formatTime(lastSaved)}
          </span>
        )}
        <span className="whitespace-nowrap text-xs tabular-nums text-neutral-600">
          {charCount} {charCount === 1 ? 'character' : 'characters'}
        </span>
      </div>
    </div>
  )
}
