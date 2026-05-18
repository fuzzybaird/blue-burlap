import { useMutation, useQuery, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query'
import type {
  Settings,
  SfStatus,
  OrgEntry,
  RetrieveResult,
  CommitResult,
  PruneLocalResult,
  BranchDetail
} from '@shared/contract'
import { queryClient } from './queryClient'

const api = window.api

const keys = {
  settings: ['settings'] as const,
  settingsConfigured: ['settings', 'configured'] as const,
  sfStatus: ['sf', 'status'] as const,
  orgs: ['sf', 'orgs'] as const,
  gitLog: ['git', 'log'] as const,
  branches: ['git', 'branches'] as const,
  branchDetail: (branch: string) => ['git', 'detail', branch] as const
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

export function useSaveSettings(): UseMutationResult<Settings, Error, Partial<Settings>> {
  return useMutation({
    mutationFn: (next: Partial<Settings>) => api.settings.save(next),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.settings })
      void queryClient.invalidateQueries({ queryKey: keys.settingsConfigured })
    }
  })
}

export function useSfStatus(): UseQueryResult<SfStatus> {
  return useQuery({ queryKey: keys.sfStatus, queryFn: () => api.sf.check() })
}

export function useOrgs(enabled = true): UseQueryResult<OrgEntry[]> {
  return useQuery({ queryKey: keys.orgs, queryFn: () => api.sf.listOrgs(), enabled })
}

export function useOpenOrg(): UseMutationResult<void, Error, string> {
  return useMutation({ mutationFn: (org: string) => api.sf.openOrg(org) })
}

export function useRetrieve(): UseMutationResult<RetrieveResult, Error, void> {
  return useMutation({ mutationFn: () => api.sf.retrieve(), onSuccess: invalidateGit })
}

export function useGitLog(enabled = true): UseQueryResult<unknown> {
  return useQuery({ queryKey: keys.gitLog, queryFn: () => api.git.log(), enabled })
}

export function useBranches(enabled = true): UseQueryResult<unknown> {
  return useQuery({ queryKey: keys.branches, queryFn: () => api.git.branches(), enabled })
}

export function useBranchDetail(branch: string | null): UseQueryResult<BranchDetail> {
  return useQuery({
    queryKey: keys.branchDetail(branch ?? ''),
    queryFn: () => api.git.detail(branch!),
    enabled: Boolean(branch)
  })
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
