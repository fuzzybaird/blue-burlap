import { ipcMain } from 'electron'
import type { z } from 'zod'
import { walkContract, type Handlers } from '../shared/contract'

export function registerRouter(handlers: Handlers): void {
  walkContract((channel, namespace, operation, endpoint) => {
    const handler = (handlers[namespace] as Record<string, (input?: unknown) => unknown>)[operation]
    if (typeof handler !== 'function') {
      throw new Error(`Missing handler for channel "${channel}"`)
    }

    ipcMain.handle(channel, async (_event, raw: unknown) => {
      const parsedInput = parseOrThrow(endpoint.input, raw, `${channel} (input)`)
      const result = await Promise.resolve(handler(parsedInput))
      const parsedOutput = parseOrThrow(endpoint.output, result, `${channel} (output)`)
      return parsedOutput
    })
  })
}

function parseOrThrow<T extends z.ZodType>(schema: T, value: unknown, label: string): z.output<T> {
  const result = schema.safeParse(value)
  if (!result.success) {
    const summary = result.error.issues
      .map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
      .join('; ')
    throw new Error(`Contract violation on ${label}: ${summary}`)
  }
  return result.data
}
