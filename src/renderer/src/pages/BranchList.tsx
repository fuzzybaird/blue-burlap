import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, GitCommit, Plus, ArrowUpDown } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { useBranches, useCreateBranch } from '@/api/hooks'

interface BranchRow {
  name: string
  commit: string
  current: boolean
  remote: boolean
}

interface BranchSummaryLike {
  branches?: Record<string, { name: string; commit: string; current: boolean }>
}

export function BranchListPage(): React.JSX.Element {
  const branches = useBranches()
  const createBranch = useCreateBranch()
  const [newBranch, setNewBranch] = useState('')
  const [sortAsc, setSortAsc] = useState(true)

  const rows = useMemo<BranchRow[]>(() => {
    const data = branches.data as BranchSummaryLike | undefined
    if (!data?.branches) return []
    const list: BranchRow[] = Object.values(data.branches).map((b) => ({
      name: b.name,
      commit: b.commit,
      current: b.current,
      remote: b.name.startsWith('remotes/')
    }))
    list.sort((a, b) => (sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)))
    return list
  }, [branches.data, sortAsc])

  const handleCreate = (): void => {
    const name = newBranch.trim()
    if (!name) {
      toast.warning('Enter a name to create a new branch')
      return
    }
    createBranch.mutate(name, {
      onSuccess: () => {
        setNewBranch('')
        toast.success(`Created branch ${name}`)
      },
      onError: (err) => toast.error(`Could not create branch: ${err.message}`)
    })
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Branches</h1>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60%]">
                  <button
                    onClick={() => setSortAsc((v) => !v)}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    Name
                    <ArrowUpDown className="size-3.5" />
                  </button>
                </TableHead>
                <TableHead>Commit</TableHead>
                <TableHead className="w-[120px] text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {branches.isPending ? (
                <TableRow>
                  <TableCell colSpan={3}>
                    <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" />
                      Loading branches…
                    </div>
                  </TableCell>
                </TableRow>
              ) : branches.error ? (
                <TableRow>
                  <TableCell colSpan={3} className="py-6 text-center text-destructive">
                    {branches.error.message}
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">
                    No branches.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow
                    key={row.name}
                    className={cn(
                      row.current && 'bg-emerald-50 dark:bg-emerald-950/30',
                      row.remote && 'text-muted-foreground'
                    )}
                  >
                    <TableCell className="font-mono text-xs">
                      <span className="inline-flex items-center gap-2">
                        {row.name}
                        {row.current && <Badge variant="default">current</Badge>}
                        {row.remote && <Badge variant="outline">remote</Badge>}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 font-mono text-xs">
                        <GitCommit className="size-3.5" />
                        {row.commit.slice(0, 7)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link to={`/branch/${encodeURIComponent(row.name)}`}>
                        <Button size="sm" variant="secondary">Checkout</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
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
        </CardContent>
      </Card>
    </div>
  )
}
