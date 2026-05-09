import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { getSettings } from './settings'
import type { OrgEntry, RetrieveResult, SfStatus } from '../shared/types'

const execFileP = promisify(execFile)

export type { OrgEntry, RetrieveResult, SfStatus }

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

export async function retrieveMetadata(opts: {
  targetOrg: string
  metadata: string[]
  cwd: string
}): Promise<RetrieveResult> {
  if (!opts.targetOrg) throw new Error('No target org specified')
  if (!opts.metadata.length) throw new Error('No metadata types specified')
  if (!opts.cwd) throw new Error('Project path is not configured')

  const args = ['project', 'retrieve', 'start', '--target-org', opts.targetOrg, '--json']
  for (const m of opts.metadata) {
    args.push('--metadata', m)
  }

  const sf = getSettings().sfPath || 'sf'
  const { stdout } = await execFileP(sf, args, {
    cwd: opts.cwd,
    maxBuffer: 200 * 1024 * 1024
  })
  const parsed = JSON.parse(stdout) as { result?: { files?: RetrieveResult['inboundFiles']; warnings?: string[] } }
  return {
    inboundFiles: parsed.result?.files ?? [],
    warnings: parsed.result?.warnings
  }
}

export async function checkSfAvailable(): Promise<SfStatus> {
  try {
    const { stdout } = await runSf(['--version'])
    return { available: true, version: stdout.trim() }
  } catch (err) {
    return { available: false, error: (err as Error).message }
  }
}
