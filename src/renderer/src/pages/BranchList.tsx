import { useMemo, useState } from 'react'
import { Loader2, Plus, ChevronsUpDown, GitBranch as BranchIcon, Check } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command'
import { cn } from '@/lib/utils'
import { useBranches, useCheckout, useCreateBranch } from '@/api/hooks'

interface BranchRow {
  name: string
  displayName: string
  commit: string
  current: boolean
  remote: boolean
}

interface BranchSummaryLike {
  current?: string | null
  branches?: Record<string, { name: string; commit: string; current: boolean }>
}

export function BranchListPage(): React.JSX.Element {
  const branches = useBranches()
  const checkout = useCheckout()
  const createBranch = useCreateBranch()
  const [newBranch, setNewBranch] = useState('')
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'local' | 'remote'>('local')
  const [search, setSearch] = useState('')

  const { local, remote, currentBranch, total } = useMemo(() => {
    const data = branches.data as BranchSummaryLike | undefined
    const list = data?.branches ? Object.values(data.branches) : []
    const rows: BranchRow[] = list.map((b) => {
      const remoteFlag = b.name.startsWith('remotes/')
      return {
        name: b.name,
        displayName: remoteFlag ? b.name.replace(/^remotes\/[^/]+\//, '') : b.name,
        commit: b.commit,
        current: b.current,
        remote: remoteFlag
      }
    })
    const localRows = rows.filter((r) => !r.remote).sort((a, b) => a.name.localeCompare(b.name))
    const remoteRows = rows.filter((r) => r.remote).sort((a, b) => a.displayName.localeCompare(b.displayName))
    return {
      local: localRows,
      remote: remoteRows,
      currentBranch: rows.find((r) => r.current)?.name ?? data?.current ?? null,
      total: rows.length
    }
  }, [branches.data])

  const activeRows = tab === 'local' ? local : remote
  const filteredRows = useMemo(() => {
    if (!search.trim()) return activeRows
    const q = search.trim().toLowerCase()
    return activeRows.filter((row) => row.displayName.toLowerCase().includes(q))
  }, [activeRows, search])

  const handleSelect = (row: BranchRow): void => {
    setOpen(false)
    if (row.current) return // already on this branch
    checkout.mutate(row.displayName, {
      onSuccess: () => toast.success(`Checked out ${row.displayName}`),
      onError: (err) => toast.error(`Checkout failed: ${err.message}`)
    })
  }

  const handleCreate = (): void => {
    const name = newBranch.trim()
    if (!name) {
      toast.warning('Enter a name to create a new branch')
      return
    }
    createBranch.mutate(name, {
      onSuccess: () => {
        setNewBranch('')
        toast.success(`Created and checked out ${name}`)
      },
      onError: (err) => toast.error(`Could not create branch: ${err.message}`)
    })
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Branches</h1>
        {!branches.isPending && !branches.error && (
          <p className="text-sm text-muted-foreground">
            {local.length} local · {remote.length} remote · {total} total
          </p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Switch to branch</CardTitle>
          </CardHeader>
          <CardContent>
            {branches.isPending ? (
              <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading branches…
              </div>
            ) : branches.error ? (
              <p className="text-sm text-destructive">{branches.error.message}</p>
            ) : (
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                    disabled={checkout.isPending}
                    title={currentBranch ?? undefined}
                  >
                    <span className="inline-flex min-w-0 flex-1 items-center gap-2">
                      {checkout.isPending ? (
                        <Loader2 className="size-4 shrink-0 animate-spin" />
                      ) : (
                        <BranchIcon className="size-4 shrink-0" />
                      )}
                      <span className="min-w-0 flex-1 truncate text-left font-mono text-xs">
                        {checkout.isPending
                          ? 'Switching branches…'
                          : currentBranch ?? 'Select a branch…'}
                      </span>
                      {!checkout.isPending && currentBranch && (
                        <Badge variant="secondary" className="shrink-0">current</Badge>
                      )}
                    </span>
                    <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[min(28rem,calc(100vw-2rem))] p-0"
                  align="start"
                >
                  <Tabs value={tab} onValueChange={(v) => setTab(v as 'local' | 'remote')}>
                    <div className="border-b p-2">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="local">Local ({local.length})</TabsTrigger>
                        <TabsTrigger value="remote">Remote ({remote.length})</TabsTrigger>
                      </TabsList>
                    </div>
                    <Command shouldFilter={false}>
                      <CommandInput
                        value={search}
                        onValueChange={setSearch}
                        placeholder="Search branches…"
                      />
                      <CommandList>
                        <CommandEmpty>No branch matches.</CommandEmpty>
                        <CommandGroup>
                          {filteredRows.map((row) => (
                            <CommandItem
                              key={row.name}
                              value={row.displayName}
                              onSelect={() => handleSelect(row)}
                              className="font-mono text-xs"
                              title={row.displayName}
                            >
                              <Check
                                className={cn(
                                  'size-4 shrink-0',
                                  row.current ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              <span className="min-w-0 flex-1 truncate">{row.displayName}</span>
                              {row.current && (
                                <Badge variant="secondary" className="shrink-0">current</Badge>
                              )}
                              <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                                {row.commit.slice(0, 7)}
                              </span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </Tabs>
                </PopoverContent>
              </Popover>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create new branch</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                handleCreate()
              }}
            >
              <Input
                value={newBranch}
                onChange={(e) => setNewBranch(e.target.value)}
                placeholder="new-branch-name"
                spellCheck={false}
              />
              <Button type="submit" disabled={createBranch.isPending}>
                {createBranch.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                Create
              </Button>
            </form>
            <p className="mt-2 text-xs text-muted-foreground">
              Creates from <span className="font-mono">{currentBranch ?? 'HEAD'}</span>.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
