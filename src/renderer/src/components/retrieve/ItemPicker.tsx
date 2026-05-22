import { useMemo, useState } from 'react'
import { ChevronsUpDown, Check, Loader2, AlertCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command'
import { cn } from '@/lib/utils'
import { useMetadataItems } from '@/api/hooks'
import type { MetadataItem } from '@shared/contract'

interface ItemPickerProps {
  type: string
  typeLabel: string
  selected: string[]
  onChange: (names: string[]) => void
}

export function ItemPicker({ type, typeLabel, selected, onChange }: ItemPickerProps): React.JSX.Element {
  const items = useMetadataItems(type)
  const [open, setOpen] = useState(false)
  const [showManaged, setShowManaged] = useState(false)
  const [search, setSearch] = useState('')

  const isFromManagedPackage = (item: MetadataItem): boolean => {
    if (item.namespacePrefix && item.namespacePrefix !== '') return true
    if (item.manageableState && item.manageableState !== 'unmanaged') return true
    return false
  }

  const { visible, hiddenManagedCount } = useMemo(() => {
    if (!items.data) return { visible: [] as MetadataItem[], hiddenManagedCount: 0 }
    const sorted = [...items.data].sort((a, b) => a.fullName.localeCompare(b.fullName))
    if (showManaged) return { visible: sorted, hiddenManagedCount: 0 }
    let hidden = 0
    const filtered = sorted.filter((item) => {
      if (isFromManagedPackage(item)) {
        hidden += 1
        return false
      }
      return true
    })
    return { visible: filtered, hiddenManagedCount: hidden }
  }, [items.data, showManaged])

  // Plain case-insensitive substring match. cmdk's built-in filter is fuzzy
  // (matches scattered characters and reorders by score), which produced
  // confusing results — typing "Trigger" could surface "CertificationEventManager".
  // We disable shouldFilter on Command below and do our own filter here so
  // the order stays alphabetical and only real substring matches show up.
  const filtered = useMemo(() => {
    if (!search.trim()) return visible
    const q = search.trim().toLowerCase()
    return visible.filter((item) => item.fullName.toLowerCase().includes(q))
  }, [visible, search])

  const selectedSet = new Set(selected)
  const visibleCount = visible.length
  const selectedCount = selected.length

  const toggle = (name: string): void => {
    const next = new Set(selectedSet)
    if (next.has(name)) next.delete(name)
    else next.add(name)
    onChange([...next])
  }

  const clear = (): void => onChange([])

  let triggerLabel: React.ReactNode
  if (items.isPending) {
    triggerLabel = (
      <span className="inline-flex items-center gap-2 text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" />
        Loading {typeLabel} items…
      </span>
    )
  } else if (items.error) {
    triggerLabel = (
      <span className="inline-flex items-center gap-2 text-destructive">
        <AlertCircle className="size-3.5" />
        Failed to load
      </span>
    )
  } else if (selectedCount === 0) {
    triggerLabel = (
      <span className="text-muted-foreground">Pick items ({visibleCount} available)</span>
    )
  } else {
    triggerLabel = (
      <span>
        <span className="font-medium">{selectedCount}</span>
        <span className="text-muted-foreground"> of {visibleCount} selected</span>
      </span>
    )
  }

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className="w-full justify-between"
            disabled={items.isPending || Boolean(items.error)}
            title={items.error?.message}
          >
            <span className="inline-flex min-w-0 flex-1 items-center gap-2 text-left">
              <span className="min-w-0 flex-1 truncate text-xs">{triggerLabel}</span>
            </span>
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(32rem,calc(100vw-2rem))] p-0" align="start">
          <Command shouldFilter={false}>
            <div className="space-y-2 border-b px-2 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {typeLabel}
                </span>
                {selectedCount > 0 && (
                  <Button size="xs" variant="ghost" onClick={clear}>
                    Clear ({selectedCount})
                  </Button>
                )}
              </div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Checkbox
                  checked={showManaged}
                  onCheckedChange={(c) => setShowManaged(c === true)}
                />
                <span>
                  Show managed-package items
                  {!showManaged && hiddenManagedCount > 0 && (
                    <span className="ml-1 text-muted-foreground/70">
                      ({hiddenManagedCount} hidden)
                    </span>
                  )}
                </span>
              </label>
            </div>
            <CommandInput
              value={search}
              onValueChange={setSearch}
              placeholder={`Search ${typeLabel}…`}
            />
            <CommandList className="max-h-[24rem]">
              {items.isPending && (
                <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Loading items from org…
                </div>
              )}
              {items.error && (
                <div className="px-3 py-6 text-center text-xs text-destructive">
                  {items.error.message}
                </div>
              )}
              {!items.isPending && !items.error && (
                <>
                  <CommandEmpty>No matching items.</CommandEmpty>
                  <CommandGroup>
                    {filtered.map((item) => {
                      const isSelected = selectedSet.has(item.fullName)
                      const relative = item.lastModifiedDate
                        ? formatRelative(item.lastModifiedDate)
                        : null
                      const showSubtitle = item.lastModifiedByName || relative
                      return (
                        <CommandItem
                          key={item.fullName}
                          value={item.fullName}
                          onSelect={() => toggle(item.fullName)}
                          className="items-start gap-3"
                        >
                          <Check
                            className={cn(
                              'mt-0.5 size-4 shrink-0',
                              isSelected ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-mono text-xs">{item.fullName}</div>
                            {showSubtitle && (
                              <div className="truncate text-[11px] text-muted-foreground">
                                {item.lastModifiedByName
                                  ? `Modified by ${item.lastModifiedByName}`
                                  : 'Modified'}
                                {relative && <> · {relative}</>}
                              </div>
                            )}
                          </div>
                        </CommandItem>
                      )
                    })}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedCount > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((name) => (
            <Badge key={name} variant="secondary" className="gap-1 pl-2 pr-1 font-mono text-[11px]">
              <span className="max-w-[16rem] truncate" title={name}>
                {name}
              </span>
              <button
                onClick={() => toggle(name)}
                className="rounded-sm p-0.5 hover:bg-background"
                aria-label={`Remove ${name}`}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

function formatRelative(isoDate: string): string | null {
  const ts = new Date(isoDate).getTime()
  if (Number.isNaN(ts)) return null
  // sf returns 1970-01-01 (or similar epoch-y values) as lastModifiedDate for
  // items it doesn't track real modification history on (standard objects out
  // of the box, system metadata). Anything pre-1980 is a sentinel, not real.
  if (ts < new Date('1980-01-01').getTime()) return null
  const diffMs = Date.now() - ts
  const day = 1000 * 60 * 60 * 24
  const diffDays = Math.floor(diffMs / day)
  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7)
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30)
    return months === 1 ? '1 month ago' : `${months} months ago`
  }
  const years = Math.floor(diffDays / 365)
  return years === 1 ? '1 year ago' : `${years} years ago`
}
