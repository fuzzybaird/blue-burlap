import { useMutation, useQuery, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query'
import type {
  Settings,
  SfStatus,
  OrgEntry,
  RetrieveResult,
  CommitResult,
  PruneLocalResult,
  BranchDetail,
  MetadataItem
} from '@shared/contract'
import { queryClient } from './queryClient'

const api = window.api

const keys = {
  settings: ['settings'] as const,
  settingsConfigured: ['settings', 'configured'] as const,
  sfStatus: ['sf', 'status'] as const,
  orgs: ['sf', 'orgs'] as const,
  // Keyed outside the ['sf'] tree so the broad settings-save invalidation
  // doesn't wipe this expensive-to-fetch cache. Org-scoped invalidation is
  // handled explicitly in useSaveSettings.
  metadataItems: (type: string) => ['org-metadata', type] as const,
  metadataItemsAll: ['org-metadata'] as const,
  gitLog: ['git', 'log'] as const,
  branches: ['git', 'branches'] as const,
  branchDetail: (branch: string) => ['git', 'detail', branch] as const,
  currentBranch: ['git', 'current'] as const,
  remoteUrl: ['git', 'remote-url'] as const
}

function invalidateGit(): void {
  void queryClient.invalidateQueries({ queryKey: ['git'] })
}

export function useSettings(): UseQueryResult<Settings> {
  return useQuery({ queryKey: keys.settings, queryFn: () => api.settings.get() })
}

export function useIsConfigured(): UseQueryResult<boolean> {
  return useQuery({ queryKey: keys.settingsConfigured, queryFn: () => api.settings.isConfigured() })
}

export const SAVE_SETTINGS_KEY = ['settings', 'save'] as const

export function useSaveSettings(): UseMutationResult<Settings, Error, Partial<Settings>> {
  return useMutation({
    mutationKey: SAVE_SETTINGS_KEY,
    mutationFn: (next: Partial<Settings>) => api.settings.save(next),
    onSuccess: (_data, variables) => {
      // Settings changes can switch the project path or sf binary, which
      // invalidates everything downstream.
      void queryClient.invalidateQueries({ queryKey: keys.settings })
      void queryClient.invalidateQueries({ queryKey: keys.settingsConfigured })
      void queryClient.invalidateQueries({ queryKey: ['git'] })
      void queryClient.invalidateQueries({ queryKey: ['sf'] })
      // Metadata item listings depend on the target org and the sf binary.
      // Only invalidate them when those specific keys are part of the save —
      // saving e.g. just `specificItems` shouldn't wipe the (expensive) cache.
      if ('defaultOrg' in variables || 'sfPath' in variables) {
        void queryClient.invalidateQueries({ queryKey: keys.metadataItemsAll })
      }
    }
  })
}

export function useSfStatus(): UseQueryResult<SfStatus> {
  return useQuery({ queryKey: keys.sfStatus, queryFn: () => api.sf.check() })
}

export function useOrgs(enabled = true): UseQueryResult<OrgEntry[]> {
  return useQuery({ queryKey: keys.orgs, queryFn: () => api.sf.listOrgs(), enabled })
}

export function useMetadataItems(type: string | null): UseQueryResult<MetadataItem[]> {
  return useQuery({
    queryKey: keys.metadataItems(type ?? ''),
    queryFn: () => api.sf.listMetadataItems(type!),
    enabled: Boolean(type),
    // These listings rarely change and the calls can take several seconds.
    // Hold them for the whole session unless settings change (which clears
    // the entire ['sf'] subtree via useSaveSettings).
    staleTime: Infinity,
    gcTime: Infinity
  })
}

export function useOpenOrg(): UseMutationResult<void, Error, string> {
  return useMutation({ mutationFn: (org: string) => api.sf.openOrg(org) })
}

export interface RetrieveOverride {
  metadata: string[]
  specificItems: Record<string, string[]>
}

export function useRetrieve(): UseMutationResult<
  RetrieveResult,
  Error,
  { override?: RetrieveOverride }
> {
  return useMutation({
    mutationFn: (input: { override?: RetrieveOverride }) => api.sf.retrieve(input),
    onSuccess: invalidateGit
  })
}

export function useGitLog(enabled = true): UseQueryResult<unknown> {
  return useQuery({ queryKey: keys.gitLog, queryFn: () => api.git.log(), enabled })
}

export function useBranches(enabled = true): UseQueryResult<unknown> {
  return useQuery({ queryKey: keys.branches, queryFn: () => api.git.branches(), enabled })
}

export function useCurrentBranch(): UseQueryResult<string | null> {
  return useQuery({ queryKey: keys.currentBranch, queryFn: () => api.git.current() })
}

export function useRemoteUrl(): UseQueryResult<string | null> {
  return useQuery({ queryKey: keys.remoteUrl, queryFn: () => api.git.remoteUrl() })
}

export function useBranchDetail(branch: string | null): UseQueryResult<BranchDetail> {
  return useQuery({
    queryKey: keys.branchDetail(branch ?? ''),
    queryFn: () => api.git.detail(branch!),
    enabled: Boolean(branch)
  })
}

export function useCheckout(): UseMutationResult<void, Error, string> {
  return useMutation({ mutationFn: (branch: string) => api.git.checkout(branch), onSuccess: invalidateGit })
}

export function useCreateBranch(): UseMutationResult<void, Error, string> {
  return useMutation({ mutationFn: (name: string) => api.git.createBranch(name), onSuccess: invalidateGit })
}

export function usePull(): UseMutationResult<void, Error, string> {
  return useMutation({ mutationFn: (branch: string) => api.git.pull(branch), onSuccess: invalidateGit })
}

export function usePush(): UseMutationResult<void, Error, string> {
  return useMutation({ mutationFn: (branch: string) => api.git.push(branch), onSuccess: invalidateGit })
}

export function useCommit(): UseMutationResult<CommitResult, Error, { files: string[]; message: string }> {
  return useMutation({ mutationFn: (args) => api.git.commit(args), onSuccess: invalidateGit })
}

export function usePruneRemote(): UseMutationResult<void, Error, void> {
  return useMutation({ mutationFn: () => api.git.pruneRemote(), onSuccess: invalidateGit })
}

export function usePruneLocal(): UseMutationResult<PruneLocalResult, Error, void> {
  return useMutation({ mutationFn: () => api.git.pruneLocal(), onSuccess: invalidateGit })
}

export function useDiscardLocal(): UseMutationResult<void, Error, void> {
  return useMutation({ mutationFn: () => api.git.discardLocal(), onSuccess: invalidateGit })
}

export function useDiscardAll(): UseMutationResult<void, Error, void> {
  return useMutation({ mutationFn: () => api.git.discardAll(), onSuccess: invalidateGit })
}

export function useDiscardFiles(): UseMutationResult<void, Error, string[]> {
  return useMutation({ mutationFn: (paths: string[]) => api.git.discardFiles(paths), onSuccess: invalidateGit })
}
