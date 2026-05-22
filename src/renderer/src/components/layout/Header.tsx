import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { GitBranch, RefreshCw, ExternalLink, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  useSettings,
  useOpenOrg,
  useRetrieve,
  useCurrentBranch,
  useRemoteUrl,
  type RetrieveOverride
} from '@/api/hooks'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { SaveIndicator } from './SaveIndicator'
import type { MetadataItem } from '@shared/contract'

function toGitHubBranchUrl(remoteUrl: string | null | undefined, branch: string | null | undefined): string | null {
  if (!remoteUrl || !branch) return null
  // HTTPS form: https://github.com/owner/repo[.git]  (optional `user:token@`)
  const https = remoteUrl.match(
    /^https?:\/\/(?:[^@/]+@)?github\.com\/([^/]+)\/([^/?#]+?)(?:\.git)?\/?$/i
  )
  if (https) {
    const [, owner, repo] = https
    return `https://github.com/${owner}/${repo}/tree/${encodeURIComponent(branch)}`
  }
  // SSH form: git@github.com:owner/repo[.git]
  const ssh = remoteUrl.match(/^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/i)
  if (ssh) {
    const [, owner, repo] = ssh
    return `https://github.com/${owner}/${repo}/tree/${encodeURIComponent(branch)}`
  }
  return null
}

function toJiraTicketUrl(
  baseUrl: string | null | undefined,
  branch: string | null | undefined
): string | null {
  if (!baseUrl || !branch) return null
  // Match a Jira ticket key (e.g. SE-1234) that appears immediately after the
  // first slash, optionally followed by `-…` (description text).
  const match = branch.match(/^[^/]+\/([A-Za-z]+-\d+)/)
  if (!match) return null
  const ticket = match[1].toUpperCase()
  const base = baseUrl.replace(/\/+$/, '')
  return `${base}/${ticket}`
}

export function Header(): React.JSX.Element {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const settings = useSettings()
  const openOrg = useOpenOrg()
  const retrieve = useRetrieve()
  const currentBranch = useCurrentBranch()
  const remoteUrl = useRemoteUrl()

  const githubBranchUrl = toGitHubBranchUrl(remoteUrl.data, currentBranch.data)
  const jiraTicketUrl = toJiraTicketUrl(settings.data?.jiraBaseUrl, currentBranch.data)

  const onBranchPage = location.pathname.startsWith('/branch/')

  const goToCurrentBranch = async (): Promise<void> => {
    try {
      const current = await window.api.git.current()
      if (!current) {
        toast.warning('No current branch — HEAD may be detached, or settings need configuring')
        return
      }
      navigate(`/branch/${encodeURIComponent(current)}`)
    } catch (err) {
      toast.error(`Could not get current branch: ${(err as Error).message}`)
    }
  }

  const org = settings.data?.defaultOrg ?? ''
  const hasOrg = Boolean(org)
  const isSyncing = retrieve.isPending

  const runRetrieve = (override?: RetrieveOverride): void => {
    retrieve.mutate(
      { override },
      {
        onSuccess: async (result) => {
          const failures = result.inboundFiles.filter((f) => f.state === 'Failed')
          const retrieved = result.inboundFiles.length - failures.length
          if (failures.length > 0) {
            console.warn('[sync] failed entries:', failures)
            toast.warning(
              `Sync done — ${retrieved} retrieved, ${failures.length} failed (see DevTools console)`
            )
          } else {
            toast.success(`Sync complete — ${retrieved} file(s) retrieved`)
          }
          const current = await window.api.git.current().catch(() => null)
          if (current) navigate(`/branch/${encodeURIComponent(current)}`)
        },
        onError: (err) => toast.error(`Sync failed: ${err.message}`)
      }
    )
  }

  const resolveSinceDateOverride = async (
    metadataTypes: string[],
    sinceDate: string
  ): Promise<RetrieveOverride | null> => {
    const sinceMs = new Date(sinceDate).getTime()
    if (Number.isNaN(sinceMs)) {
      toast.warning('Set a valid "Modified since" date in Retrieve')
      return null
    }

    const overrideMetadata: string[] = []
    const overrideItems: Record<string, string[]> = {}

    for (const type of metadataTypes) {
      let items: MetadataItem[]
      try {
        items = await queryClient.ensureQueryData({
          queryKey: ['org-metadata', type],
          queryFn: () => window.api.sf.listMetadataItems(type),
          staleTime: Infinity,
          gcTime: Infinity
        })
      } catch (err) {
        toast.error(`Could not list ${type}: ${(err as Error).message}`)
        return null
      }
      const filtered = items
        .filter((i) => !i.namespacePrefix)
        .filter((i) => (i.manageableState ?? 'unmanaged') === 'unmanaged')
        .filter((i) => i.lastModifiedDate && new Date(i.lastModifiedDate).getTime() >= sinceMs)
        .map((i) => i.fullName)
      if (filtered.length > 0) {
        overrideMetadata.push(type)
        overrideItems[type] = filtered
      }
    }

    if (overrideMetadata.length === 0) {
      toast.warning(`No items modified since ${sinceDate}`)
      return null
    }

    return { metadata: overrideMetadata, specificItems: overrideItems }
  }

  const handleSync = async (): Promise<void> => {
    if (!hasOrg) {
      toast.warning('Configure an Org in Settings first')
      return
    }
    const s = settings.data
    if (s?.retrieveMode === 'since-date') {
      const override = await resolveSinceDateOverride(s.metadata, s.sinceDate)
      if (!override) return
      runRetrieve(override)
    } else {
      runRetrieve()
    }
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
        <Link to="/" className="flex shrink-0 items-center gap-2 font-semibold whitespace-nowrap">
          <GitBranch className="size-5 text-primary" />
          <span>Blue Burlap</span>
        </Link>

        <nav className="flex items-center gap-1">
          <NavItem to="/">Branches</NavItem>
          <NavItem to="/retrieve">Retrieve</NavItem>
          <button
            onClick={goToCurrentBranch}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              onBranchPage
                ? 'bg-secondary text-secondary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Commit
          </button>
          <NavItem to="/settings">Settings</NavItem>
          <Button variant="ghost" size="sm" onClick={handleOpenOrg} disabled={!hasOrg || openOrg.isPending}>
            Salesforce
            <ExternalLink className="size-3.5" />
          </Button>
          {githubBranchUrl && (
            <Button variant="ghost" size="sm" asChild>
              <a href={githubBranchUrl} target="_blank" rel="noreferrer" title={githubBranchUrl}>
                GitHub
                <ExternalLink className="size-3.5" />
              </a>
            </Button>
          )}
          {jiraTicketUrl && (
            <Button variant="ghost" size="sm" asChild>
              <a href={jiraTicketUrl} target="_blank" rel="noreferrer" title={jiraTicketUrl}>
                Jira
                <ExternalLink className="size-3.5" />
              </a>
            </Button>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <SaveIndicator />
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
