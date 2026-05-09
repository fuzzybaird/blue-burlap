import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type {
  Settings,
  OrgEntry,
  RetrieveResult,
  SfStatus,
  CommitResult,
  PruneLocalResult,
  FileDiff
} from '../shared/types'

const api = {
  settings: {
    get: (): Promise<Settings> => ipcRenderer.invoke('settings:get'),
    save: (next: Partial<Settings>): Promise<Settings> => ipcRenderer.invoke('settings:save', next),
    isConfigured: (): Promise<boolean> => ipcRenderer.invoke('settings:is-configured')
  },
  sf: {
    check: (): Promise<SfStatus> => ipcRenderer.invoke('sf:check'),
    listOrgs: (): Promise<OrgEntry[]> => ipcRenderer.invoke('sf:list-orgs'),
    openOrg: (targetOrg: string): Promise<void> => ipcRenderer.invoke('sf:open-org', targetOrg),
    retrieve: (): Promise<RetrieveResult> => ipcRenderer.invoke('sf:retrieve')
  },
  git: {
    log: (): Promise<unknown> => ipcRenderer.invoke('git:log'),
    branches: (): Promise<unknown> => ipcRenderer.invoke('git:branches'),
    detail: (branch: string): Promise<{ diff: FileDiff[]; status: unknown }> =>
      ipcRenderer.invoke('git:detail', branch),
    createBranch: (name: string): Promise<void> => ipcRenderer.invoke('git:create-branch', name),
    pull: (branch: string): Promise<void> => ipcRenderer.invoke('git:pull', branch),
    push: (branch: string): Promise<void> => ipcRenderer.invoke('git:push', branch),
    commit: (args: { files: string[]; message: string }): Promise<CommitResult> =>
      ipcRenderer.invoke('git:commit', args),
    pruneRemote: (): Promise<void> => ipcRenderer.invoke('git:prune-remote'),
    pruneLocal: (): Promise<PruneLocalResult> => ipcRenderer.invoke('git:prune-local'),
    discardLocal: (): Promise<void> => ipcRenderer.invoke('git:discard-local'),
    discardAll: (): Promise<void> => ipcRenderer.invoke('git:discard-all')
  }
}

export type Api = typeof api

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
