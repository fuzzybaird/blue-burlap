import { Link, NavLink } from 'react-router-dom'
import { GitBranch, RefreshCw, ExternalLink, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useSettings, useOpenOrg, useRetrieve } from '@/api/hooks'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export function Header(): React.JSX.Element {
  const settings = useSettings()
  const openOrg = useOpenOrg()
  const retrieve = useRetrieve()

  const org = settings.data?.defaultOrg ?? ''
  const hasOrg = Boolean(org)
  const isSyncing = retrieve.isPending

  const handleSync = (): void => {
    if (!hasOrg) {
      toast.warning('Configure an Org in Settings first')
      return
    }
    retrieve.mutate(undefined, {
      onSuccess: (result) =>
        toast.success(
          `Sync complete — ${result.inboundFiles.length} file(s) retrieved`
        ),
      onError: (err) => toast.error(`Sync failed: ${err.message}`)
    })
  }

  const handleOpenOrg = (): void => {
    if (!hasOrg) {
      toast.warning('Configure an Org in Settings first')
      return
    }
    openOrg.mutate(org, {
      onError: (err) => toast.error(`Could not open org: ${err.message}`)
    })
  }

  return (
    <header className="sticky top-0 z-10 border-b bg-card">
      <div className="flex items-center gap-6 px-6 py-3">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <GitBranch className="size-5 text-primary" />
          <span>Blue Burlap</span>
        </Link>

        <nav className="flex items-center gap-1">
          <NavItem to="/">Branches</NavItem>
          <NavItem to="/settings">Settings</NavItem>
          <Button variant="ghost" size="sm" onClick={handleOpenOrg} disabled={!hasOrg || openOrg.isPending}>
            Salesforce
            <ExternalLink className="size-3.5" />
          </Button>
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <span className="font-mono text-xs text-muted-foreground">
            {hasOrg ? org : '(no org selected)'}
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button onClick={handleSync} disabled={!hasOrg || isSyncing} size="sm">
                  {isSyncing ? (
                    <>
                      Syncing
                      <Loader2 className="size-3.5 animate-spin" />
                    </>
                  ) : (
                    <>
                      Sync
                      <RefreshCw className="size-3.5" />
                    </>
                  )}
                </Button>
              </span>
            </TooltipTrigger>
            {!hasOrg && (
              <TooltipContent>You cannot Sync until an Org is selected in Settings</TooltipContent>
            )}
          </Tooltip>
        </div>
      </div>
    </header>
  )
}

function NavItem({ to, children }: { to: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        cn(
          'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
          isActive ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:text-foreground'
        )
      }
    >
      {children}
    </NavLink>
  )
}
