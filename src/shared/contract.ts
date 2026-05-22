import { z } from 'zod'

export const settingsSchema = z.object({
  projectPath: z.string(),
  sfPath: z.string(),
  defaultOrg: z.string(),
  metadata: z.array(z.string()),
  // No .default() here on purpose — Zod's `.partial()` doesn't drop defaults,
  // so a partial save like `{ defaultOrg }` would inject `retrievalFormat:
  // 'source'` and silently stomp the user's choice. electron-store handles
  // the new-user default at the data layer instead (see main/settings.ts).
  retrievalFormat: z.enum(['source', 'metadata']),
  retrieveMode: z.enum(['all', 'specific', 'since-date']),
  // Per-type specific item names: { ApexClass: ['MyClass1', 'MyClass2'], ... }
  specificItems: z.record(z.string(), z.array(z.string())),
  // ISO date (YYYY-MM-DD) used by 'since-date' mode. Empty string when unset.
  sinceDate: z.string(),
  // Base URL up to and including the ticket-browse path, e.g.
  // "https://yourcompany.atlassian.net/browse/". Empty disables the Jira
  // button.
  jiraBaseUrl: z.string()
})

export const sfStatusSchema = z.object({
  available: z.boolean(),
  version: z.string().optional(),
  error: z.string().optional()
})

export const orgEntrySchema = z
  .object({
    username: z.string(),
    alias: z.string().optional(),
    orgId: z.string().optional(),
    instanceUrl: z.string().optional(),
    isDefaultUsername: z.boolean().optional(),
    isDefaultDevHubUsername: z.boolean().optional()
  })
  .passthrough()

export const fileDiffSchema = z.object({
  path: z.string(),
  index: z.string(),
  working_dir: z.string(),
  fileDiff: z.string().nullable(),
  show: z.boolean(),
  whitespaceOnly: z.boolean()
})

export const retrieveFileSchema = z
  .object({
    fullName: z.string(),
    type: z.string(),
    state: z.string(),
    filePath: z.string().optional(),
    error: z.string().optional(),
    problemType: z.string().optional()
  })
  .passthrough()

export const retrieveResultSchema = z.object({
  inboundFiles: z.array(retrieveFileSchema),
  warnings: z.array(z.unknown()).optional()
})

export const metadataItemSchema = z
  .object({
    fullName: z.string(),
    type: z.string().optional(),
    lastModifiedDate: z.string().optional(),
    lastModifiedByName: z.string().optional(),
    fileName: z.string().optional(),
    namespacePrefix: z.string().optional(),
    manageableState: z.string().optional()
  })
  .passthrough()

export const commitResultSchema = z.object({
  commit: z.string(),
  changes: z.number(),
  branch: z.string()
})

export const pruneLocalResultSchema = z.object({
  deleted: z.array(z.string())
})

const branchSummarySchema = z.unknown()
const logResultSchema = z.unknown()

export const statusSummarySchema = z.object({
  current: z.string().nullable(),
  ahead: z.number(),
  behind: z.number(),
  tracking: z.string().nullable()
})

export const branchDetailSchema = z.object({
  diff: z.array(fileDiffSchema),
  status: statusSummarySchema
})

export const commitInputSchema = z.object({
  files: z.array(z.string()),
  message: z.string()
})

export const contract = {
  settings: {
    get: { input: z.void(), output: settingsSchema },
    save: { input: settingsSchema.partial(), output: settingsSchema },
    isConfigured: { input: z.void(), output: z.boolean() }
  },
  sf: {
    check: { input: z.void(), output: sfStatusSchema },
    listOrgs: { input: z.void(), output: z.array(orgEntrySchema) },
    openOrg: { input: z.string(), output: z.void() },
    retrieve: {
      input: z.object({
        // When provided, completely overrides the metadata + specificItems
        // derived from settings. Used by 'since-date' mode where the renderer
        // has the date-filtered list ready to go.
        override: z
          .object({
            metadata: z.array(z.string()),
            specificItems: z.record(z.string(), z.array(z.string()))
          })
          .optional()
      }),
      output: retrieveResultSchema
    },
    listMetadataItems: { input: z.string(), output: z.array(metadataItemSchema) }
  },
  git: {
    log: { input: z.void(), output: logResultSchema },
    branches: { input: z.void(), output: branchSummarySchema },
    current: { input: z.void(), output: z.string().nullable() },
    remoteUrl: { input: z.void(), output: z.string().nullable() },
    detail: { input: z.string(), output: branchDetailSchema },
    checkout: { input: z.string(), output: z.void() },
    createBranch: { input: z.string(), output: z.void() },
    pull: { input: z.string(), output: z.void() },
    push: { input: z.string(), output: z.void() },
    commit: { input: commitInputSchema, output: commitResultSchema },
    pruneRemote: { input: z.void(), output: z.void() },
    pruneLocal: { input: z.void(), output: pruneLocalResultSchema },
    discardLocal: { input: z.void(), output: z.void() },
    discardAll: { input: z.void(), output: z.void() },
    discardFiles: { input: z.array(z.string()), output: z.void() }
  }
} as const

export type Contract = typeof contract

export type Settings = z.infer<typeof settingsSchema>
export type SfStatus = z.infer<typeof sfStatusSchema>
export type OrgEntry = z.infer<typeof orgEntrySchema>
export type FileDiff = z.infer<typeof fileDiffSchema>
export type RetrieveResult = z.infer<typeof retrieveResultSchema>
export type CommitResult = z.infer<typeof commitResultSchema>
export type PruneLocalResult = z.infer<typeof pruneLocalResultSchema>
export type BranchDetail = z.infer<typeof branchDetailSchema>
export type StatusSummary = z.infer<typeof statusSummarySchema>
export type MetadataItem = z.infer<typeof metadataItemSchema>
type Endpoint = { input: z.ZodType; output: z.ZodType }
type Namespace = Record<string, Endpoint>

type Input<E extends Endpoint> =
  z.input<E['input']> extends void ? void : z.input<E['input']>
type Output<E extends Endpoint> = z.output<E['output']>

export type Client = {
  [N in keyof Contract]: {
    [O in keyof Contract[N]]: Contract[N][O] extends Endpoint
      ? Input<Contract[N][O]> extends void
        ? () => Promise<Output<Contract[N][O]>>
        : (input: Input<Contract[N][O]>) => Promise<Output<Contract[N][O]>>
      : never
  }
}

export type Handlers = {
  [N in keyof Contract]: {
    [O in keyof Contract[N]]: Contract[N][O] extends Endpoint
      ? Input<Contract[N][O]> extends void
        ? () => Output<Contract[N][O]> | Promise<Output<Contract[N][O]>>
        : (input: Input<Contract[N][O]>) => Output<Contract[N][O]> | Promise<Output<Contract[N][O]>>
      : never
  }
}

export function channelName(namespace: string, operation: string): string {
  return `${namespace}:${operation}`
}

export function walkContract(
  cb: (channel: string, namespace: keyof Contract, operation: string, endpoint: Endpoint) => void
): void {
  for (const [namespace, ops] of Object.entries(contract) as [keyof Contract, Namespace][]) {
    for (const [operation, endpoint] of Object.entries(ops)) {
      cb(channelName(namespace, operation), namespace, operation, endpoint)
    }
  }
}
