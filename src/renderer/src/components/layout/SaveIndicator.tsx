import { useEffect, useRef, useState } from 'react'
import { useIsMutating } from '@tanstack/react-query'
import { Loader2, Check } from 'lucide-react'
import { SAVE_SETTINGS_KEY } from '@/api/hooks'

export function SaveIndicator(): React.JSX.Element {
  const isSaving = useIsMutating({ mutationKey: SAVE_SETTINGS_KEY }) > 0
  const [showSaved, setShowSaved] = useState(false)
  const prevIsSaving = useRef(false)

  useEffect(() => {
    const justFinished = prevIsSaving.current && !isSaving
    prevIsSaving.current = isSaving
    if (justFinished) {
      setShowSaved(true)
      const t = setTimeout(() => setShowSaved(false), 1500)
      return () => clearTimeout(t)
    }
    return undefined
  }, [isSaving])

  // Reserve a fixed slot so the header doesn't shift when the label appears.
  return (
    <span className="inline-flex h-5 min-w-[5.5rem] items-center justify-end text-xs">
      {isSaving ? (
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <Loader2 className="size-3 animate-spin" />
          Saving…
        </span>
      ) : showSaved ? (
        <span className="inline-flex items-center gap-1.5 text-emerald-600">
          <Check className="size-3" />
          Saved
        </span>
      ) : null}
    </span>
  )
}
