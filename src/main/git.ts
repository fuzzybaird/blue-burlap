import simpleGit, { type SimpleGit, type StatusResult, type LogResult, type BranchSummary } from 'simple-git'
import { getSettings } from './settings'
import type { FileDiff, CommitResult, PruneLocalResult } from '../shared/types'

function git(): SimpleGit {
  const cwd = getSettings().projectPath
  if (!cwd) throw new Error('Project path is not configured')
  return simpleGit(cwd)
}

export type { FileDiff, CommitResult, PruneLocalResult }

export interface BranchDetail {
  diff: FileDiff[]
  status: StatusResult
}

export async function getLog(): Promise<LogResult> {
  return git().log()
}

export async function getBranches(): Promise<BranchSummary> {
  const g = git()
  await g.fetch()
  return g.branch()
}

export async function getBranchDetail(branchArg: string): Promise<BranchDetail> {
  const g = git()
  const branch = branchArg.replace(/^remotes\/.*?\//, '')
  await g.checkout(branch)

  const status = await g.status()
  const diff: FileDiff[] = await Promise.all(
    status.files.map(async (file) => {
      const path = file.path.replace(/"/g, '')
      let fileDiff: string | null = null
      if (file.index !== '?') {
        fileDiff = await g.raw(['diff', path])
        if (fileDiff) fileDiff = fileDiff.replace(/^diff.*?(@@)/s, '$1')
      }
      return { path, index: file.index, working_dir: file.working_dir, fileDiff, show: false }
    })
  )

  return { diff, status }
}

export async function createBranch(name: string): Promise<void> {
  await git().checkout(['-b', name])
}

export async function pull(branch: string): Promise<void> {
  await git().pull('origin', branch)
}

export async function push(branch: string): Promise<void> {
  await git().push('origin', branch, ['--set-upstream'])
}

export async function commit(files: string[], message: string): Promise<CommitResult> {
  const g = git()
  await g.add(files)
  const result = await g.commit(message)
  return {
    commit: result.commit,
    changes: result.summary.changes,
    branch: result.branch
  }
}

export async function pruneRemote(): Promise<void> {
  await git().raw(['remote', 'prune', 'origin'])
}

export async function pruneLocal(defaultBranch = 'master'): Promise<PruneLocalResult> {
  const g = git()
  const merged = await g.branch(['--merged', defaultBranch])
  const deleted: string[] = []
  for (const branch of Object.keys(merged.branches)) {
    if (branch === defaultBranch) continue
    await g.branch(['-D', branch])
    deleted.push(branch)
  }
  return { deleted }
}

export async function discardLocal(): Promise<void> {
  await git().checkout(['.'])
}

export async function discardAll(): Promise<void> {
  await git().clean('f', ['-d'])
}
