import { GitBranch, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { useIsConfigured, useSettings, useSfStatus } from './api/hooks'

function App(): React.JSX.Element {
  const sf = useSfStatus()
  const settings = useSettings()
  const configured = useIsConfigured()

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="flex w-full max-w-xl flex-col gap-6">
        <div className="flex items-center gap-3">
          <GitBranch className="size-10 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Blue Burlap</h1>
            <p className="text-sm text-muted-foreground">
              Simplify Salesforce Admin Development with Git
            </p>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">Phase 2 smoke check</h2>
          <Row label="Salesforce CLI" query={sf}>
            {(data) =>
              data.available ? <Ok>{data.version}</Ok> : <Bad>{data.error ?? 'not found'}</Bad>
            }
          </Row>
          <Row label="Settings configured" query={configured}>
            {(data) => (data ? <Ok>yes</Ok> : <Bad>no</Bad>)}
          </Row>
          <Row label="Project path" query={settings}>
            {(data) => <Mono>{data.projectPath || '(unset)'}</Mono>}
          </Row>
          <Row label="Default org" query={settings}>
            {(data) => <Mono>{data.defaultOrg || '(unset)'}</Mono>}
          </Row>
        </div>

        <p className="text-xs text-muted-foreground">
          Phase 2 wraps the IPC layer in a Zod-validated contract with React Query hooks. Phase 3 builds the real UI on top.
        </p>
      </div>
    </div>
  )
}

interface QueryLike<T> {
  data: T | undefined
  error: Error | null
  isPending: boolean
}

function Row<T>({
  label,
  query,
  children
}: {
  label: string
  query: QueryLike<T>
  children: (data: T) => React.ReactNode
}): React.JSX.Element {
  return (
    <div className="flex items-center justify-between border-b py-2 last:border-b-0">
      <span className="text-sm">{label}</span>
      <span className="text-sm">
        {query.isPending ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        ) : query.error ? (
          <Bad>{query.error.message}</Bad>
        ) : query.data !== undefined ? (
          children(query.data)
        ) : null}
      </span>
    </div>
  )
}

function Ok({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <span className="inline-flex items-center gap-1.5 text-emerald-600">
      <CheckCircle2 className="size-4" />
      <span className="font-mono text-xs">{children}</span>
    </span>
  )
}

function Bad({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <span className="inline-flex items-center gap-1.5 text-destructive">
      <XCircle className="size-4" />
      <span className="font-mono text-xs">{children}</span>
    </span>
  )
}

function Mono({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <span className="font-mono text-xs text-muted-foreground">{children}</span>
}

export default App
