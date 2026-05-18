import { z } from 'zod'

export const settingsSchema = z.object({
  projectPath: z.string(),
  sfPath: z.string(),
  defaultOrg: z.string(),
  metadata: z.array(z.string())
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
  show: z.boolean()
})

export const retrieveResultSchema = z.object({
  inboundFiles: z.array(
    z.object({
      filePath: z.string(),
      fullName: z.string(),
      type: z.string(),
      state: z.string()
    })
  ),
  warnings: z.array(z.string()).optional()
})

export const commitResultSchema = z.object({
  commit: z.string(),
  changes: z.number(),
  branch: z.string()
})

export const pruneLocalResultSchema = z.object({
  deleted: z.array(z.string())
})

const branchSummarySchema = z.unknown()
const statusResultSchema = z.unknown()
const logResultSchema = z.unknown()

export const branchDetailSchema = z.object({
  diff: z.array(fileDiffSchema),
  status: statusResultSchema
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
    retrieve: { input: z.void(), output: retrieveResultSchema }
  },
  git: {
    log: { input: z.void(), output: logResultSchema },
    branches: { input: z.void(), output: branchSummarySchema },
    detail: { input: z.string(), output: branchDetailSchema },
    createBranch: { input: z.string(), output: z.void() },
    pull: { input: z.string(), output: z.void() },
    push: { input: z.string(), output: z.void() },
    commit: { input: commitInputSchema, output: commitResultSchema },
    pruneRemote: { input: z.void(), output: z.void() },
    pruneLocal: { input: z.void(), output: pruneLocalResultSchema },
    discardLocal: { input: z.void(), output: z.void() },
    discardAll: { input: z.void(), output: z.void() }
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
