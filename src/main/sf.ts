import { execFile } from 'node:child_process'
import { mkdtemp, readdir, rm, cp, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { getSettings } from './settings'
import type { OrgEntry, RetrieveResult, SfStatus, MetadataItem } from '../shared/contract'

const execFileP = promisify(execFile)

export type { OrgEntry, RetrieveResult, SfStatus, MetadataItem }

async function runSf(args: string[]): Promise<{ stdout: string; stderr: string }> {
  const sf = getSettings().sfPath || 'sf'
  return execFileP(sf, args, { maxBuffer: 50 * 1024 * 1024 })
}

export async function listOrgs(): Promise<OrgEntry[]> {
  const { stdout } = await runSf(['org', 'list', '--all', '--json'])
  const parsed = JSON.parse(stdout) as {
    result?: Record<string, OrgEntry[] | undefined>
  }
  const groups = parsed.result ?? {}
  const seen = new Map<string, OrgEntry>()
  for (const list of Object.values(groups)) {
    if (!Array.isArray(list)) continue
    for (const org of list) {
      if (org?.username && !seen.has(org.username)) seen.set(org.username, org)
    }
  }
  return [...seen.values()]
}

export async function openOrg(targetOrg: string): Promise<void> {
  if (!targetOrg) throw new Error('No target org specified')
  await runSf(['org', 'open', '--target-org', targetOrg])
}

/**
 * Lists every metadata item of a given type in the default org, including
 * lastModifiedDate. Used by the renderer for both the "Specific items" picker
 * (3b) and the "Modified since" filter (3c). Listing is much faster than
 * retrieve — no source content is transferred.
 */
export async function listMetadataItems(type: string): Promise<MetadataItem[]> {
  if (!type) throw new Error('No metadata type specified')
  const settings = getSettings()
  if (!settings.defaultOrg) throw new Error('No default org configured')

  const { stdout } = await runSf([
    'org',
    'list',
    'metadata',
    '--metadata-type',
    type,
    '--target-org',
    settings.defaultOrg,
    '--json'
  ])
  const parsed = JSON.parse(stdout) as { result?: MetadataItem[] }
  const items = parsed.result ?? []
  console.log(
    `[sf:listMetadataItems] type=${type}, returned ${items.length} item(s); sample:`,
    JSON.stringify(items[0] ?? null)
  )
  return items
}

export interface RetrieveOpts {
  targetOrg: string
  metadata: string[]
  cwd: string
  format: 'source' | 'metadata'
  /**
   * 'all'      — retrieve every item of each selected type (`--metadata Type`)
   * 'specific' — retrieve only specifically-named items (`--metadata Type:Name`).
   *              Types appearing in `metadata` but absent from `specificItems`
   *              still fall back to "all items of that type".
   */
  mode: 'all' | 'specific'
  specificItems: Record<string, string[]>
}

export async function retrieveMetadata(opts: RetrieveOpts): Promise<RetrieveResult> {
  if (!opts.targetOrg) throw new Error('No target org specified')
  if (!opts.metadata.length) throw new Error('No metadata types specified')
  if (!opts.cwd) throw new Error('Project path is not configured')

  if (opts.mode === 'specific') {
    // In Specific mode, require at least one item picked across the selected
    // types. Otherwise the retrieve would be a no-op and confusingly fast.
    const totalItems = opts.metadata.reduce(
      (sum, type) => sum + (opts.specificItems[type]?.length ?? 0),
      0
    )
    if (totalItems === 0) {
      throw new Error('Specific Items mode requires at least one item to be picked')
    }
  }

  return opts.format === 'metadata' ? retrieveMetadataFormat(opts) : retrieveSourceFormat(opts)
}

/**
 * Builds the list of `--metadata <Type[:Name]>` arg pairs based on retrieve
 * mode and the per-type item selection. Returns a flat list of arg strings
 * ready to be pushed onto the sf command line.
 */
function buildMetadataArgs(opts: RetrieveOpts): string[] {
  const args: string[] = []
  for (const type of opts.metadata) {
    const names = opts.mode === 'specific' ? opts.specificItems[type] ?? [] : []
    if (opts.mode === 'specific' && names.length > 0) {
      for (const name of names) {
        args.push('--metadata', `${type}:${name}`)
      }
    } else {
      args.push('--metadata', type)
    }
  }
  return args
}

async function retrieveSourceFormat(opts: RetrieveOpts): Promise<RetrieveResult> {
  const args = ['project', 'retrieve', 'start', '--target-org', opts.targetOrg, '--json']
  args.push(...buildMetadataArgs(opts))

  const sf = getSettings().sfPath || 'sf'
  const { stdout } = await execFileP(sf, args, {
    cwd: opts.cwd,
    maxBuffer: 200 * 1024 * 1024
  })
  const parsed = JSON.parse(stdout) as {
    result?: { files?: RetrieveResult['inboundFiles']; warnings?: unknown[] }
  }
  const files = parsed.result?.files ?? []
  console.log(
    `[sf:retrieve] (source) ${files.length} file(s); sample:`,
    JSON.stringify(files[0] ?? null)
  )
  return {
    inboundFiles: files,
    warnings: parsed.result?.warnings
  }
}

async function retrieveMetadataFormat(opts: RetrieveOpts): Promise<RetrieveResult> {
  // sf in metadata-format mode unzips into <target-metadata-dir>/unpackaged/.
  // We retrieve into a temp dir, then merge that unpackaged/ tree into the
  // project's src/ folder. Mirrors the old `sfdx force:mdapi:retrieve -r ./src`
  // workflow.
  const tempDir = await mkdtemp(join(tmpdir(), 'blue-burlap-retrieve-'))
  try {
    const args = [
      'project',
      'retrieve',
      'start',
      '--target-org',
      opts.targetOrg,
      '--target-metadata-dir',
      tempDir,
      '--unzip',
      '--json'
    ]
    args.push(...buildMetadataArgs(opts))

    const sf = getSettings().sfPath || 'sf'
    const { stdout } = await execFileP(sf, args, {
      cwd: opts.cwd,
      maxBuffer: 200 * 1024 * 1024
    })
    const parsed = JSON.parse(stdout) as {
      result?: { warnings?: unknown[] }
    }

    const unpackagedDir = join(tempDir, 'unpackaged')
    try {
      await stat(unpackagedDir)
    } catch {
      throw new Error(
        `sf retrieve completed but no unpackaged/ directory was produced at ${unpackagedDir}`
      )
    }

    const projectSrcDir = join(opts.cwd, 'src')
    try {
      await mergeContents(unpackagedDir, projectSrcDir)
    } catch (err) {
      throw new Error(
        `Could not merge retrieved files into ${projectSrcDir}: ${(err as Error).message}`
      )
    }

    // Defensive: if a stale src/unpackaged/ exists (from an older sync that
    // misfired, or a source-format run on this metadata-format project),
    // merge its contents up into src/ and remove it.
    await cleanupStrayUnpackaged(projectSrcDir)

    // sf's JSON output for --target-metadata-dir does not include a per-file
    // result list (that's a source-format-only thing). Walk the unpackaged
    // tree ourselves to count what actually came down so the toast is honest.
    const relPaths = await listFilesRecursive(unpackagedDir)
    const inboundFiles = relPaths.map((relPath) => ({
      filePath: join(projectSrcDir, relPath),
      fullName: relPath,
      type: 'File',
      state: 'Retrieved'
    }))

    console.log(
      `[sf:retrieve] (metadata) ${inboundFiles.length} file(s); merged into ${projectSrcDir}; sample:`,
      JSON.stringify(inboundFiles[0] ?? null)
    )
    return {
      inboundFiles,
      warnings: parsed.result?.warnings
    }
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
}

/**
 * Walk `dir` recursively, returning every file's path relative to `dir`.
 * Used after a metadata-format retrieve to count what arrived, since
 * sf's JSON output in that mode doesn't include a per-file result list.
 */
async function listFilesRecursive(dir: string, base = dir): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const out: string[] = []
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...(await listFilesRecursive(full, base)))
    } else if (entry.isFile()) {
      out.push(full.slice(base.length + 1))
    }
  }
  return out
}

/**
 * Copy the *contents* of `srcDir` into `destDir`, child by child. fs.cp at the
 * directory level can produce a nested folder under some circumstances; doing
 * the loop ourselves is unambiguous: each child of srcDir becomes a sibling
 * inside destDir.
 */
async function mergeContents(srcDir: string, destDir: string): Promise<void> {
  const entries = await readdir(srcDir)
  for (const entry of entries) {
    await cp(join(srcDir, entry), join(destDir, entry), {
      recursive: true,
      force: true
    })
  }
}

/**
 * If `<dir>/unpackaged/` exists, merge its contents up into `<dir>` and
 * remove the now-empty unpackaged folder. Used to clean up stale artifacts
 * from earlier retrieves.
 */
async function cleanupStrayUnpackaged(dir: string): Promise<void> {
  const stray = join(dir, 'unpackaged')
  try {
    await stat(stray)
  } catch {
    return
  }
  console.log(`[sf:retrieve] cleaning up stray ${stray}`)
  await mergeContents(stray, dir)
  await rm(stray, { recursive: true, force: true })
}

export async function checkSfAvailable(): Promise<SfStatus> {
  try {
    const { stdout } = await runSf(['--version'])
    return { available: true, version: stdout.trim() }
  } catch (err) {
    return { available: false, error: (err as Error).message }
  }
}
