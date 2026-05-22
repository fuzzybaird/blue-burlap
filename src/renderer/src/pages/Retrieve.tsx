import { useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { ItemPicker } from '@/components/retrieve/ItemPicker'
import { useMetadataItems, useSettings, useSaveSettings } from '@/api/hooks'
import type { Settings } from '@shared/contract'

interface MetadataOption {
  value: string
  label: string
}

interface MetadataGroup {
  name: string
  options: MetadataOption[]
}

const METADATA_GROUPS: MetadataGroup[] = [
  {
    name: 'Code',
    options: [
      { value: 'ApexClass', label: 'Apex Classes' },
      { value: 'ApexTrigger', label: 'Apex Triggers' },
      { value: 'ApexComponent', label: 'Visualforce Components' },
      { value: 'ApexPage', label: 'Visualforce Pages' }
    ]
  },
  {
    name: 'UI',
    options: [
      { value: 'LightningComponentBundle', label: 'Lightning Web Components' },
      { value: 'AuraDefinitionBundle', label: 'Aura Components' },
      { value: 'FlexiPage', label: 'Lightning Pages' },
      { value: 'Layout', label: 'Page Layouts' },
      { value: 'ListView', label: 'List Views' },
      { value: 'CustomApplication', label: 'Apps' },
      { value: 'CustomTab', label: 'Tabs' }
    ]
  },
  {
    name: 'Data Model',
    options: [
      { value: 'CustomObject', label: 'Custom Objects' },
      { value: 'CustomField', label: 'Custom Fields' },
      { value: 'RecordType', label: 'Record Types' },
      { value: 'QuickAction', label: 'Quick Actions' },
      { value: 'GlobalValueSet', label: 'Global Value Sets' },
      { value: 'CustomLabel', label: 'Custom Labels' },
      { value: 'CustomMetadata', label: 'Custom Metadata' }
    ]
  },
  {
    name: 'Automation',
    options: [
      { value: 'Flow', label: 'Flows' },
      { value: 'Workflow', label: 'Workflows (legacy)' },
      { value: 'ApprovalProcess', label: 'Approval Processes' },
      { value: 'EmailTemplate', label: 'Email Templates' }
    ]
  },
  {
    name: 'Security',
    options: [
      { value: 'PermissionSet', label: 'Permission Sets' },
      { value: 'Profile', label: 'Profiles' },
      { value: 'SharingRules', label: 'Sharing Rules' },
      { value: 'Group', label: 'Public Groups' },
      { value: 'NamedCredential', label: 'Named Credentials' }
    ]
  },
  {
    name: 'Other',
    options: [
      { value: 'StaticResource', label: 'Static Resources' },
      { value: 'ReportType', label: 'Report Types' }
    ]
  }
]

// Flat lookup of type-value -> label for the per-type pickers.
const TYPE_LABEL: Record<string, string> = (() => {
  const out: Record<string, string> = {}
  for (const group of METADATA_GROUPS) {
    for (const opt of group.options) out[opt.value] = opt.label
  }
  return out
})()

export function RetrievePage(): React.JSX.Element {
  const settingsQuery = useSettings()
  const save = useSaveSettings()

  const [draft, setDraft] = useState<Settings | null>(null)

  useEffect(() => {
    if (settingsQuery.data && !draft) setDraft(settingsQuery.data)
  }, [settingsQuery.data, draft])

  // Types selected, in the original group order — used to render the picker
  // section when mode === 'specific'.
  const orderedSelectedTypes = useMemo(() => {
    if (!draft) return []
    const selected = new Set(draft.metadata)
    const out: string[] = []
    for (const group of METADATA_GROUPS) {
      for (const opt of group.options) {
        if (selected.has(opt.value)) out.push(opt.value)
      }
    }
    return out
  }, [draft])

  if (!draft) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const saveNow = (patch: Partial<Settings>): void => {
    save.mutate(patch, {
      onError: (err) => toast.error(`Save failed: ${err.message}`)
    })
  }

  const updateAndSave = (patch: Partial<Settings>): void => {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev))
    saveNow(patch)
  }

  const toggleMetadata = (value: string, checked: boolean): void => {
    const current = draft.metadata
    const next = checked ? [...current, value] : current.filter((m) => m !== value)
    updateAndSave({ metadata: next })
  }

  const selectAllInGroup = (values: string[]): void => {
    const merged = new Set([...draft.metadata, ...values])
    updateAndSave({ metadata: [...merged] })
  }

  const clearAllInGroup = (values: string[]): void => {
    const remove = new Set(values)
    updateAndSave({ metadata: draft.metadata.filter((m) => !remove.has(m)) })
  }

  const setSpecificItemsForType = (type: string, names: string[]): void => {
    const next = { ...draft.specificItems, [type]: names }
    updateAndSave({ specificItems: next })
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Retrieve</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose what to retrieve from the org on Sync.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mode</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label>Retrieve mode</Label>
          <Select
            value={draft.retrieveMode}
            onValueChange={(value) =>
              updateAndSave({
                retrieveMode: value as 'all' | 'specific' | 'since-date'
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All items of selected types</SelectItem>
              <SelectItem value="specific">Specific items</SelectItem>
              <SelectItem value="since-date">Items modified since…</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {draft.retrieveMode === 'specific' &&
              'Pick individual items per type below. Only those items will be retrieved on Sync.'}
            {draft.retrieveMode === 'since-date' &&
              'On Sync, only items modified on or after the chosen date will be retrieved.'}
            {draft.retrieveMode === 'all' &&
              'Retrieves every item of each selected metadata type.'}
          </p>

          {draft.retrieveMode === 'since-date' && (
            <div className="mt-3 space-y-2 border-t pt-3">
              <Label htmlFor="sinceDate">Modified on or after</Label>
              <Input
                id="sinceDate"
                type="date"
                value={draft.sinceDate}
                onChange={(e) => updateAndSave({ sinceDate: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Compares against each item&apos;s <span className="font-mono">lastModifiedDate</span>{' '}
                in the org.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {draft.retrieveMode === 'specific' && (
        <Card>
          <CardHeader>
            <CardTitle>Specific items per type</CardTitle>
          </CardHeader>
          <CardContent>
            {orderedSelectedTypes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Select one or more metadata types below to pick individual items.
              </p>
            ) : (
              <div className="space-y-3">
                {orderedSelectedTypes.map((type) => (
                  <div key={type} className="grid grid-cols-[10rem_1fr] items-center gap-3">
                    <span className="truncate text-sm font-medium" title={TYPE_LABEL[type] ?? type}>
                      {TYPE_LABEL[type] ?? type}
                    </span>
                    <ItemPicker
                      type={type}
                      typeLabel={TYPE_LABEL[type] ?? type}
                      selected={draft.specificItems[type] ?? []}
                      onChange={(names) => setSpecificItemsForType(type, names)}
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {draft.retrieveMode === 'since-date' && (
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent>
            {!draft.sinceDate ? (
              <p className="text-sm text-muted-foreground">
                Pick a date above to preview which items would be retrieved.
              </p>
            ) : orderedSelectedTypes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Select one or more metadata types below to preview matching items.
              </p>
            ) : (
              <div className="space-y-1">
                {orderedSelectedTypes.map((type) => (
                  <SinceDateTypePreview
                    key={type}
                    type={type}
                    typeLabel={TYPE_LABEL[type] ?? type}
                    sinceDate={draft.sinceDate}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Metadata types</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 rounded-md border p-3">
            {METADATA_GROUPS.map((group) => {
              const groupValues = group.options.map((o) => o.value)
              const selectedSet = new Set(draft.metadata)
              const allSelected = groupValues.every((v) => selectedSet.has(v))
              const noneSelected = groupValues.every((v) => !selectedSet.has(v))
              const selectedCount = groupValues.filter((v) => selectedSet.has(v)).length

              return (
                <div key={group.name}>
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {group.name}
                      {selectedCount > 0 && (
                        <span className="ml-2 normal-case text-muted-foreground/70">
                          ({selectedCount}/{groupValues.length})
                        </span>
                      )}
                    </h4>
                    <div className="flex gap-1">
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => selectAllInGroup(groupValues)}
                        disabled={allSelected}
                      >
                        Select all
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => clearAllInGroup(groupValues)}
                        disabled={noneSelected}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {group.options.map((opt) => {
                      const checked = selectedSet.has(opt.value)
                      return (
                        <label key={opt.value} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(c) => toggleMetadata(opt.value, c === true)}
                          />
                          <span>{opt.label}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function SinceDateTypePreview({
  type,
  typeLabel,
  sinceDate
}: {
  type: string
  typeLabel: string
  sinceDate: string
}): React.JSX.Element {
  const items = useMetadataItems(type)
  const sinceMs = new Date(sinceDate).getTime()

  let rhs: React.ReactNode
  if (items.isPending) {
    rhs = (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="size-3 animate-spin" />
        Loading…
      </span>
    )
  } else if (items.error) {
    rhs = <span className="text-xs text-destructive">{items.error.message}</span>
  } else {
    const matching = (items.data ?? [])
      .filter((i) => !i.namespacePrefix)
      .filter((i) => (i.manageableState ?? 'unmanaged') === 'unmanaged')
      .filter((i) => i.lastModifiedDate && new Date(i.lastModifiedDate).getTime() >= sinceMs)
    const total = (items.data ?? []).length
    rhs = (
      <span className="text-xs">
        <span className={matching.length === 0 ? 'text-muted-foreground' : 'font-medium'}>
          {matching.length}
        </span>
        <span className="text-muted-foreground"> of {total} match</span>
      </span>
    )
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b py-1.5 last:border-b-0">
      <span className="truncate text-sm" title={typeLabel}>
        {typeLabel}
      </span>
      {rhs}
    </div>
  )
}
