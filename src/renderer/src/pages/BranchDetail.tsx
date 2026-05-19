import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Loader2,
  RefreshCw,
  ArrowDownToLine,
  ArrowUpFromLine,
  GitCommit,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { useBranchDetail, usePull, usePush, useCommit } from '@/api/hooks'

interface StatusLike {
  current: string | null
  ahead: number
  behind: number
  tracking: string | null
}

export function BranchDetailPage(): React.JSX.Element {
  const params = useParams<{ name: string }>()
  const branchName = decodeURIComponent(params.name ?? '')
  const navigate = useNavigate()

  const detail = useBranchDetail(branchName)
  const pull = usePull()
  const push = usePush()
  const commit = useCommit()

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (detail.error) {
      toast.error(`Could not checkout: ${detail.error.message}`)
      navigate('/', { replace: true })
    }
  }, [detail.error, navigate])

  const status = detail.data?.status as StatusLike | undefined
  const diff = detail.data?.diff ?? []
  const hasChanges = diff.length > 0
  const isLoading = detail.isPending

  const toggleSelected = (path: string): void => {
    const next = new Set(selected)
    next.has(path) ? next.delete(path) : next.add(path)
    setSelected(next)
  }

  const toggleExpanded = (path: string): void => {
    const next = new Set(expanded)
    next.has(path) ? next.delete(path) : next.add(path)
    setExpanded(next)
  }

  const handleCommit = (): void => {
    if (!message.trim()) {
      toast.warning('Commit message is required')
      return
    }
    if (selected.size === 0) {
      toast.warning('Select at least one file to commit')
      return
    }
    commit.mutate(
      { files: [...selected], message },
      {
        onSuccess: (result) => {
          toast.success(
            `Committed ${result.commit.slice(0, 7)} — ${result.changes} change(s) on ${result.branch}`
          )
          setMessage('')
          setSelected(new Set())
        },
        onError: (err) => toast.error(`Commit failed: ${err.message}`)
      }
    )
  }

  const showPull = (status?.behind ?? 0) > 0
  const showPush = !showPull && ((status?.ahead ?? 0) > 0 || !status?.tracking)

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Branch</p>
          <h1 className="font-mono text-2xl font-bold tracking-tight">{branchName}</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => detail.refetch()}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Behind</TableHead>
                <TableHead>Ahead</TableHead>
                <TableHead>Tracking</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-mono">{status?.behind ?? '—'}</TableCell>
                <TableCell className="font-mono">{status?.ahead ?? '—'}</TableCell>
                <TableCell className="font-mono text-xs">{status?.tracking ?? '(no tracking)'}</TableCell>
                <TableCell className="text-right">
                  {showPull && (
                    <Button
                      size="sm"
                      onClick={() =>
                        pull.mutate(branchName, {
                          onSuccess: () => toast.success(`Pulled from origin/${branchName}`),
                          onError: (err) => toast.error(`Pull failed: ${err.message}`)
                        })
                      }
                      disabled={pull.isPending}
                    >
                      {pull.isPending ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <ArrowDownToLine className="size-3.5" />
                      )}
                      Pull
                    </Button>
                  )}
                  {showPush && (
                    <Button
                      size="sm"
                      onClick={() =>
                        push.mutate(branchName, {
                          onSuccess: () => toast.success(`Pushed to origin/${branchName}`),
                          onError: (err) => toast.error(`Push failed: ${err.message}`)
                        })
                      }
                      disabled={push.isPending}
                    >
                      {push.isPending ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <ArrowUpFromLine className="size-3.5" />
                      )}
                      Push
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Changes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading…
            </div>
          ) : !hasChanges ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              There are no local changes.
            </p>
          ) : (
            <div className="divide-y">
              {diff.map((file) => {
                const isExpanded = expanded.has(file.path)
                const isUntracked = file.working_dir === '?'
                return (
                  <div key={file.path}>
                    <div className="flex items-center gap-3 px-4 py-2">
                      <Checkbox
                        checked={selected.has(file.path)}
                        onCheckedChange={() => toggleSelected(file.path)}
                      />
                      <button
                        className="inline-flex flex-1 items-center gap-2 text-left font-mono text-xs hover:text-primary"
                        onClick={() => toggleExpanded(file.path)}
                      >
                        {isExpanded ? (
                          <ChevronDown className="size-3.5" />
                        ) : (
                          <ChevronRight className="size-3.5" />
                        )}
                        {file.path}
                        {isUntracked && <span className="text-emerald-600">(new)</span>}
                      </button>
                    </div>
                    {isExpanded && (
                      <div className="bg-muted/40 px-4 pb-4">
                        {file.fileDiff ? (
                          <DiffView text={file.fileDiff} />
                        ) : isUntracked ? (
                          <p className="font-mono text-xs text-muted-foreground">
                            New file — no diff to show.
                          </p>
                        ) : (
                          <p className="font-mono text-xs text-muted-foreground">
                            (no diff available)
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {hasChanges && (
        <Card>
          <CardHeader>
            <CardTitle>Commit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Commit message (required)"
              rows={3}
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {selected.size} of {diff.length} file(s) selected
              </p>
              <Button onClick={handleCommit} disabled={commit.isPending}>
                {commit.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <GitCommit className="size-4" />
                )}
                Commit
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function DiffView({ text }: { text: string }): React.JSX.Element {
  const lines = text.split('\n')
  return (
    <pre className="overflow-x-auto rounded bg-background p-3 font-mono text-xs leading-relaxed">
      {lines.map((line, i) => (
        <div key={i} className={cn('whitespace-pre', diffLineClass(line))}>
          {line || ' '}
        </div>
      ))}
    </pre>
  )
}

function diffLineClass(line: string): string {
  if (line.startsWith('@@')) return 'text-sky-600 dark:text-sky-400'
  if (line.startsWith('+++') || line.startsWith('---')) return 'text-muted-foreground'
  if (line.startsWith('+')) return 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'
  if (line.startsWith('-')) return 'bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-300'
  return ''
}
