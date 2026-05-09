import { useEffect, useState } from 'react'
import { GitBranch, CheckCircle2, XCircle, Loader2 } from 'lucide-react'

interface SmokeState {
  sf: { available: boolean; version?: string; error?: string } | null
  settings: { projectPath: string; sfPath: string; defaultOrg: string; metadata: string[] } | null
  configured: boolean | null
}

function App(): React.JSX.Element {
  const [state, setState] = useState<SmokeState>({ sf: null, settings: null, configured: null })

  useEffect(() => {
    void Promise.all([
      window.api.sf.check(),
      window.api.settings.get(),
      window.api.settings.isConfigured()
    ]).then(([sf, settings, configured]) => setState({ sf, settings, configured }))
  }, [])

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
          <h2 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">Phase 1 smoke check</h2>
          <SmokeRow label="Salesforce CLI">
            {state.sf === null ? (
              <Pending />
            ) : state.sf.available ? (
              <Ok>{state.sf.version}</Ok>
            ) : (
              <Bad>{state.sf.error ?? 'not found'}</Bad>
            )}
          </SmokeRow>
          <SmokeRow label="Settings configured">
            {state.configured === null ? <Pending /> : state.configured ? <Ok>yes</Ok> : <Bad>no</Bad>}
          </SmokeRow>
          <SmokeRow label="Project path">
            {state.settings === null ? <Pending /> : <Mono>{state.settings.projectPath || '(unset)'}</Mono>}
          </SmokeRow>
          <SmokeRow label="Default org">
            {state.settings === null ? <Pending /> : <Mono>{state.settings.defaultOrg || '(unset)'}</Mono>}
          </SmokeRow>
        </div>

        <p className="text-xs text-muted-foreground">
          Phase 1 ports the main process. Phase 3 builds the real UI on top.
        </p>
      </div>
    </div>
  )
}

function SmokeRow({ label, children }: { label: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="flex items-center justify-between border-b py-2 last:border-b-0">
      <span className="text-sm">{label}</span>
      <span className="text-sm">{children}</span>
    </div>
  )
}

function Pending(): React.JSX.Element {
  return <Loader2 className="size-4 animate-spin text-muted-foreground" />
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
