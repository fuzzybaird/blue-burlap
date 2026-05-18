import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { walkContract, type Client } from '../shared/contract'

function buildClient(): Client {
  const client: Record<string, Record<string, (input?: unknown) => Promise<unknown>>> = {}
  walkContract((channel, namespace, operation) => {
    if (!client[namespace]) client[namespace] = {}
    client[namespace][operation] = (input?: unknown) => ipcRenderer.invoke(channel, input)
  })
  return client as unknown as Client
}

const api = buildClient()

export type Api = Client

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
