export interface Settings {
  projectPath: string
  sfPath: string
  defaultOrg: string
  metadata: string[]
}

export interface OrgEntry {
  username: string
  alias?: string
  orgId?: string
  instanceUrl?: string
  isDefaultUsername?: boolean
  isDefaultDevHubUsername?: boolean
}

export interface RetrieveResult {
  inboundFiles: Array<{ filePath: string; fullName: string; type: string; state: string }>
  warnings?: string[]
}

export interface FileDiff {
  path: string
  index: string
  working_dir: string
  fileDiff: string | null
  show: boolean
}

export interface SfStatus {
  available: boolean
  version?: string
  error?: string
}

export interface CommitResult {
  commit: string
  changes: number
  branch: string
}

export interface PruneLocalResult {
  deleted: string[]
}
