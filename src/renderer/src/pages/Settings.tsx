import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog'
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

  const updateDraft = (patch: Partial<Settings>): void =>
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev))

  const saveNow = (patch: Partial<Settings>): void => {
    save.mutate(patch, {
      onError: (err) => toast.error(`Save failed: ${err.message}`)
    })
  }

  const updateAndSave = (patch: Partial<Settings>): void => {
    updateDraft(patch)
    saveNow(patch)
  }

  const handleTextBlur = (field: keyof Settings, value: string): void => {
    if (settingsQuery.data?.[field] === value) return
    saveNow({ [field]: value } as Partial<Settings>)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>

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
                  onValueChange={(value) => updateAndSave({ defaultOrg: value })}
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
              <Label>Retrieve format</Label>
              <Select
                value={draft.retrievalFormat}
                onValueChange={(value) =>
                  updateAndSave({ retrievalFormat: value as 'source' | 'metadata' })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="source">Source format (default)</SelectItem>
                  <SelectItem value="metadata">Metadata format</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {draft.retrievalFormat === 'metadata'
                  ? 'Retrieved files are unzipped from sf and merged into your project’s src/ directory.'
                  : 'Retrieved as standard DX source format into your project tree.'}
              </p>
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
                onChange={(e) => updateDraft({ projectPath: e.target.value })}
                onBlur={(e) => handleTextBlur('projectPath', e.target.value)}
                placeholder="/path/to/sfdx-project"
                spellCheck={false}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sfPath">Salesforce CLI path</Label>
              <Input
                id="sfPath"
                value={draft.sfPath}
                onChange={(e) => updateDraft({ sfPath: e.target.value })}
                onBlur={(e) => handleTextBlur('sfPath', e.target.value)}
                placeholder="sf"
                spellCheck={false}
              />
              <p className="text-xs text-muted-foreground">
                Use <code className="rounded bg-muted px-1">sf</code> if it&apos;s on your PATH, or full path to the binary.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="jiraBaseUrl">Jira Issue URL</Label>
              <Input
                id="jiraBaseUrl"
                value={draft.jiraBaseUrl}
                onChange={(e) => updateDraft({ jiraBaseUrl: e.target.value })}
                onBlur={(e) => handleTextBlur('jiraBaseUrl', e.target.value)}
                placeholder="https://your-org.atlassian.net/browse/"
                spellCheck={false}
              />
              <p className="text-xs text-muted-foreground">
                When set, a Jira link appears in the header for branches matching{' '}
                <code className="rounded bg-muted px-1">type/KEY-123-…</code> (e.g. {' '}
                <span className="font-mono">feature/SE-1234-some-feature</span>).
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
        confirm={{
          title: 'Prune remote-tracking branches?',
          description:
            'Removes your local references to branches that no longer exist on origin. This affects only your local view of remotes — actual remote branches are untouched. Safe to run regularly.',
          confirmLabel: 'Prune'
        }}
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
        confirm={{
          title: 'Prune merged local branches?',
          description:
            'Deletes every local branch that is fully merged into master. These branches have no unmerged commits, but if you have local-only references you want to keep, cancel and prune manually.',
          confirmLabel: 'Prune'
        }}
      >
        Prune Local
      </MaintenanceButton>
      <MaintenanceButton
        tooltip="Discards all local changes that haven't been committed"
        pending={discardLocal.isPending}
        variant="outline"
        onClick={() => run(discardLocal, 'Discarded local changes', 'Discard failed')}
        confirm={{
          title: 'Discard local changes?',
          description:
            'Reverts uncommitted changes in tracked files back to HEAD. Untracked files are kept. Any tracked work you haven’t committed will be lost.',
          confirmLabel: 'Discard',
          confirmVariant: 'destructive'
        }}
      >
        Discard Local
      </MaintenanceButton>
      <MaintenanceButton
        tooltip="Discards ALL local changes including untracked files"
        pending={discardAll.isPending}
        variant="destructive"
        onClick={() => run(discardAll, 'Discarded ALL changes', 'Discard failed')}
        confirm={{
          title: 'Discard ALL changes including untracked files?',
          description:
            'Reverts uncommitted tracked changes AND removes all untracked files. This is the most destructive option — anything not committed will be gone permanently.',
          confirmLabel: 'Discard everything',
          confirmVariant: 'destructive'
        }}
      >
        Discard ALL
      </MaintenanceButton>
    </div>
  )
}

interface ConfirmOptions {
  title: string
  description: string
  confirmLabel?: string
  confirmVariant?: 'default' | 'destructive'
}

function MaintenanceButton({
  tooltip,
  pending,
  variant = 'secondary',
  onClick,
  confirm,
  children
}: {
  tooltip: string
  pending: boolean
  variant?: 'secondary' | 'outline' | 'destructive'
  onClick: () => void
  confirm?: ConfirmOptions
  children: React.ReactNode
}): React.JSX.Element {
  if (!confirm) {
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

  return (
    <AlertDialog>
      <Tooltip>
        <TooltipTrigger asChild>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant={variant} disabled={pending}>
              {pending && <Loader2 className="size-3.5 animate-spin" />}
              {children}
            </Button>
          </AlertDialogTrigger>
        </TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{confirm.title}</AlertDialogTitle>
          <AlertDialogDescription>{confirm.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onClick}
            className={
              confirm.confirmVariant === 'destructive'
                ? 'bg-destructive text-white hover:bg-destructive/90'
                : undefined
            }
          >
            {confirm.confirmLabel ?? 'Confirm'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function Separator(): React.JSX.Element {
  return <div className="h-px w-full bg-border" />
}
