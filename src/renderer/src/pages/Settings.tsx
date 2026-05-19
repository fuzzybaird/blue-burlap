import { useEffect, useState } from 'react'
import { Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  useSettings,
  useSaveSettings,
  useOrgs,
  usePruneRemote,
  usePruneLocal,
  useDiscardLocal,
  useDiscardAll
} from '@/api/hooks'
import type { Settings } from '@shared/contract'

const METADATA_OPTIONS: { value: string; label: string }[] = [
  { value: 'ApexClass', label: 'Apex Classes' },
  { value: 'CustomField', label: 'Custom Fields' },
  { value: 'CustomLabel', label: 'Custom Labels' },
  { value: 'CustomObject', label: 'Custom Objects' },
  { value: 'GlobalValueSet', label: 'Global Value Sets' },
  { value: 'Layout', label: 'Layouts' },
  { value: 'ListView', label: 'List Views' },
  { value: 'ApexComponent', label: 'Visualforce Components' },
  { value: 'ApexPage', label: 'Visualforce Pages' }
]

export function SettingsPage(): React.JSX.Element {
  const settingsQuery = useSettings()
  const save = useSaveSettings()
  const orgs = useOrgs()

  const [draft, setDraft] = useState<Settings | null>(null)

  useEffect(() => {
    if (settingsQuery.data && !draft) setDraft(settingsQuery.data)
  }, [settingsQuery.data, draft])

  if (!draft) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const update = (patch: Partial<Settings>): void => setDraft({ ...draft, ...patch })

  const handleSave = (): void => {
    save.mutate(draft, {
      onSuccess: () => toast.success('Settings saved'),
      onError: (err) => toast.error(`Save failed: ${err.message}`)
    })
  }

  const toggleMetadata = (value: string, checked: boolean): void => {
    const next = checked
      ? [...draft.metadata, value]
      : draft.metadata.filter((m) => m !== value)
    update({ metadata: next })
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <Button onClick={handleSave} disabled={save.isPending}>
          {save.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Salesforce Connection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Default Org</Label>
              {orgs.isPending ? (
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              ) : orgs.error ? (
                <p className="text-xs text-destructive">{orgs.error.message}</p>
              ) : (
                <Select
                  value={draft.defaultOrg}
                  onValueChange={(value) => update({ defaultOrg: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an org" />
                  </SelectTrigger>
                  <SelectContent>
                    {orgs.data?.map((org) => {
                      const value = org.alias || org.username
                      return (
                        <SelectItem key={value} value={value}>
                          <span className="font-medium">{org.alias || org.username}</span>
                          {org.alias && (
                            <span className="ml-2 text-muted-foreground">{org.username}</span>
                          )}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label>Metadata to retrieve</Label>
              <div className="grid grid-cols-2 gap-2 rounded-md border p-3">
                {METADATA_OPTIONS.map((opt) => {
                  const checked = draft.metadata.includes(opt.value)
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Git Repository</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="projectPath">Project Path</Label>
              <Input
                id="projectPath"
                value={draft.projectPath}
                onChange={(e) => update({ projectPath: e.target.value })}
                placeholder="/path/to/sfdx-project"
                spellCheck={false}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sfPath">Salesforce CLI path</Label>
              <Input
                id="sfPath"
                value={draft.sfPath}
                onChange={(e) => update({ sfPath: e.target.value })}
                placeholder="sf"
                spellCheck={false}
              />
              <p className="text-xs text-muted-foreground">
                Use <code className="rounded bg-muted px-1">sf</code> if it&apos;s on your PATH, or full path to the binary.
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Maintenance</Label>
              <MaintenanceButtons />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MaintenanceButtons(): React.JSX.Element {
  const pruneRemote = usePruneRemote()
  const pruneLocal = usePruneLocal()
  const discardLocal = useDiscardLocal()
  const discardAll = useDiscardAll()

  const run = (
    mutation: { mutate: (_: void, opts: { onSuccess: () => void; onError: (e: Error) => void }) => void },
    successMessage: string,
    failureLabel: string
  ): void => {
    mutation.mutate(undefined, {
      onSuccess: () => toast.success(successMessage),
      onError: (err) => toast.error(`${failureLabel}: ${err.message}`)
    })
  }

  return (
    <div className="flex flex-wrap gap-2">
      <MaintenanceButton
        tooltip="Removes references to remote branches that no longer exist"
        pending={pruneRemote.isPending}
        onClick={() => run(pruneRemote, 'Pruned remote branches', 'Prune remote failed')}
      >
        Prune Remote
      </MaintenanceButton>
      <MaintenanceButton
        tooltip="Removes local branches that are merged into master"
        pending={pruneLocal.isPending}
        onClick={() =>
          pruneLocal.mutate(undefined, {
            onSuccess: (r) => toast.success(`Pruned ${r.deleted.length} local branch(es)`),
            onError: (err) => toast.error(`Prune local failed: ${err.message}`)
          })
        }
      >
        Prune Local
      </MaintenanceButton>
      <MaintenanceButton
        tooltip="Discards all local changes that haven't been committed"
        pending={discardLocal.isPending}
        variant="outline"
        onClick={() => run(discardLocal, 'Discarded local changes', 'Discard failed')}
      >
        Discard Local
      </MaintenanceButton>
      <MaintenanceButton
        tooltip="Discards ALL local changes including untracked files"
        pending={discardAll.isPending}
        variant="destructive"
        onClick={() => run(discardAll, 'Discarded ALL changes', 'Discard failed')}
      >
        Discard ALL
      </MaintenanceButton>
    </div>
  )
}

function MaintenanceButton({
  tooltip,
  pending,
  variant = 'secondary',
  onClick,
  children
}: {
  tooltip: string
  pending: boolean
  variant?: 'secondary' | 'outline' | 'destructive'
  onClick: () => void
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button size="sm" variant={variant} onClick={onClick} disabled={pending}>
          {pending && <Loader2 className="size-3.5 animate-spin" />}
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  )
}

function Separator(): React.JSX.Element {
  return <div className="h-px w-full bg-border" />
}
