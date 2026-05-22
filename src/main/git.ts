import simpleGit, { type SimpleGit, type LogResult, type BranchSummary } from 'simple-git'
import { getSettings } from './settings'
import type {
  FileDiff,
  CommitResult,
  PruneLocalResult,
  StatusSummary,
  BranchDetail
} from '../shared/contract'

// Cache a single SimpleGit instance per project path so all commands go
// through one task queue. Without this, every call creates a fresh instance
// and concurrent operations (push followed by an invalidation-triggered
// checkout, etc.) race for .git/index.lock and fail.
let cached: { cwd: string; g: SimpleGit } | null = null

function git(): SimpleGit {
  const cwd = getSettings().projectPath
  if (!cwd) throw new Error('Project path is not configured')
  if (!cached || cached.cwd !== cwd) {
    cached = { cwd, g: simpleGit(cwd) }
  }
  return cached.g
}

export type { FileDiff, CommitResult, PruneLocalResult, BranchDetail }

export async function getLog(): Promise<LogResult> {
  return git().log()
}

export async function getBranches(): Promise<BranchSummary> {
  const g = git()
  await g.fetch()
  return g.branch()
}

export async function getCurrentBranch(): Promise<string | null> {
  const status = await git().status()
  return status.current
}

export async function getRemoteUrl(remoteName = 'origin'): Promise<string | null> {
  try {
    const url = await git().raw(['config', '--get', `remote.${remoteName}.url`])
    const trimmed = url.trim()
    return trimmed || null
  } catch {
    return null
  }
}

async function classifyWhitespaceOnly(g: SimpleGit): Promise<Set<string>> {
  // git's --name-only does NOT respect --ignore-all-space/--ignore-blank-lines;
  // it lists every file with any byte-level difference. To classify, we have
  // to look at the actual diff output (which DOES respect those flags) and
  // see which files still produce a real-change signal (hunks, binary marker,
  // mode change, rename).
  const [allRaw, fullDiffRaw] = await Promise.all([
    g.raw(['-c', 'core.quotepath=false', 'diff', 'HEAD', '--name-only']),
    g.raw([
      '-c',
      'core.quotepath=false',
      'diff',
      'HEAD',
      '--ignore-all-space',
      '--ignore-blank-lines'
    ])
  ])

  const allFiles = new Set(allRaw.split('\n').map((p) => p.trim()).filter(Boolean))

  // Split the diff into one chunk per file. Lookahead keeps the "diff --git"
  // line in each chunk so we can extract the path from it.
  const chunks = fullDiffRaw.split(/(?=^diff --git)/m).filter((c) => c.startsWith('diff --git'))

  const realFiles = new Set<string>()
  for (const chunk of chunks) {
    // Prefer the post-image path from +++ b/<path>, fall back to rename
    // target, then to --- a/<path>. Strip any trailing tab/timestamp that
    // some diff flavors append.
    const plus = chunk.match(/^\+\+\+ b\/(.+?)(?:\t.*)?$/m)
    const renameTo = chunk.match(/^rename to (.+?)(?:\t.*)?$/m)
    const minus = chunk.match(/^--- a\/(.+?)(?:\t.*)?$/m)
    const path = (plus?.[1] ?? renameTo?.[1] ?? minus?.[1])?.trim()
    if (!path) continue

    // Multiple signals all indicate this file has a real change under the
    // ignore-whitespace flags. Any of these → not whitespace-only.
    const hasHunks = /^@@/m.test(chunk)
    const isBinary = /^Binary files /m.test(chunk)
    const modeChange = /^(old|new) mode /m.test(chunk)
    const renameOrCopy = /^(rename|copy) (from|to) /m.test(chunk)

    if (hasHunks || isBinary || modeChange || renameOrCopy) {
      realFiles.add(path)
    }
  }

  const whitespaceOnly = new Set<string>()
  for (const path of allFiles) {
    if (!realFiles.has(path)) whitespaceOnly.add(path)
  }

  // Diagnostic: print what got classified so a mis-categorized file is
  // visible. If there are only a handful, print them all so the user can
  // copy/paste back.
  if (whitespaceOnly.size > 0) {
    console.log(
      `[git:detail] classified ${whitespaceOnly.size} of ${allFiles.size} as whitespace-only`
    )
    const sample = [...whitespaceOnly].slice(0, 20)
    for (const path of sample) {
      console.log(`  ws-only: ${path}`)
    }
    if (whitespaceOnly.size > 20) {
      console.log(`  ...and ${whitespaceOnly.size - 20} more`)
    }
  }

  return whitespaceOnly
}

export async function getBranchDetail(branchArg: string): Promise<BranchDetail> {
  const g = git()
  const branch = branchArg.replace(/^remotes\/.*?\//, '')

  // Avoid an unnecessary checkout when we're already on the requested branch.
  // Saves work AND avoids briefly holding the index lock for no reason.
  let status = await g.status()
  if (status.current !== branch) {
    await g.checkout(branch)
    status = await g.status()
  }

  const whitespaceOnlySet = await classifyWhitespaceOnly(g)

  const diff: FileDiff[] = await Promise.all(
    status.files.map(async (file) => {
      const path = file.path.replace(/"/g, '')
      const whitespaceOnly = whitespaceOnlySet.has(path)
      let fileDiff: string | null = null
      // Skip the per-file diff for untracked files (no diff possible) and
      // whitespace-only files (we're going to hide/discard them).
      if (file.index !== '?' && !whitespaceOnly) {
        try {
          // `--` separates revisions from paths; without it, paths that look
          // unusual (special chars, names matching no known ref) cause git
          // to bail with "ambiguous argument".
          fileDiff = await g.raw(['diff', '--', path])
          if (fileDiff) fileDiff = fileDiff.replace(/^diff.*?(@@)/s, '$1')
        } catch (err) {
          // Don't let one bad file kill the whole branch detail load.
          console.warn(`[git:detail] diff failed for "${path}":`, (err as Error).message)
          fileDiff = null
        }
      }
      return {
        path,
        index: file.index,
        working_dir: file.working_dir,
        fileDiff,
        show: false,
        whitespaceOnly
      }
    })
  )

  const statusPlain: StatusSummary = {
    current: status.current,
    ahead: status.ahead,
    behind: status.behind,
    tracking: status.tracking
  }

  return { diff, status: statusPlain }
}

export async function checkoutBranch(branchArg: string): Promise<void> {
  const branch = branchArg.replace(/^remotes\/.*?\//, '')
  await git().checkout(branch)
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

/**
 * Best-effort detection of the repo's "main" branch. Tries (in order):
 *   1. origin's HEAD symbolic ref (the remote's declared default)
 *   2. local 'main' if present
 *   3. local 'master' if present
 *   4. the currently-checked-out branch
 */
async function detectDefaultBranch(g: SimpleGit): Promise<string> {
  try {
    const ref = await g.raw(['symbolic-ref', '--short', 'refs/remotes/origin/HEAD'])
    // Output is like "origin/main"
    const name = ref.trim().replace(/^origin\//, '')
    if (name) return name
  } catch {
    /* fall through */
  }
  try {
    const locals = await g.branchLocal()
    if (locals.all.includes('main')) return 'main'
    if (locals.all.includes('master')) return 'master'
  } catch {
    /* fall through */
  }
  const status = await g.status()
  if (status.current) return status.current
  throw new Error('Could not determine a default branch to compare against')
}

export async function pruneLocal(defaultBranch?: string): Promise<PruneLocalResult> {
  const g = git()
  const baseline = defaultBranch ?? (await detectDefaultBranch(g))
  const merged = await g.branch(['--merged', baseline])
  const current = (await g.status()).current

  const deleted: string[] = []
  for (const branch of Object.keys(merged.branches)) {
    // Never delete the comparison baseline or the branch we're currently on
    // (git refuses the latter anyway; skipping makes the error message
    // unnecessary).
    if (branch === baseline) continue
    if (branch === current) continue
    try {
      await g.branch(['-D', branch])
      deleted.push(branch)
    } catch (err) {
      // Don't let one failed delete abort the whole prune.
      console.warn(`[git:pruneLocal] could not delete "${branch}":`, (err as Error).message)
    }
  }
  return { deleted }
}

export async function discardLocal(): Promise<void> {
  await git().checkout(['.'])
}

export async function discardAll(): Promise<void> {
  await git().clean('f', ['-d'])
}

export async function discardFiles(paths: string[]): Promise<void> {
  if (paths.length === 0) return
  // checkout HEAD -- <paths> reverts both staged and unstaged changes back
  // to the committed state. Using HEAD (not just `--`) is important so the
  // operation is deterministic regardless of staging.
  await git().checkout(['HEAD', '--', ...paths])
}
