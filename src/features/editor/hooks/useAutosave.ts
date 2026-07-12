import { useRef, useCallback, useState, useEffect } from 'react'

interface UseAutosaveOptions {
  onSave: (content: string) => Promise<void> | void
  delay?: number
}

interface UseAutosaveReturn {
  markDirty: (content: string) => void
  saveNow: () => Promise<void>
  isSaving: boolean
  lastSaved: Date | null
}

export function useAutosave({
  onSave,
  delay = 2000,
}: UseAutosaveOptions): UseAutosaveReturn {
  const onSaveRef = useRef(onSave)
  onSaveRef.current = onSave

  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const contentRef = useRef<string>('')
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  const save = useCallback(async () => {
    setIsSaving(true)
    try {
      await onSaveRef.current(contentRef.current)
      setLastSaved(new Date())
    } finally {
      setIsSaving(false)
    }
  }, [])

  const markDirty = useCallback(
    (content: string) => {
      contentRef.current = content
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(save, delay)
    },
    [save, delay],
  )

  const saveNow = useCallback(async () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    await save()
  }, [save])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  return { markDirty, saveNow, isSaving, lastSaved }
}
