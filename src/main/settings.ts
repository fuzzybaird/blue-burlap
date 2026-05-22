import Store from 'electron-store'
import type { Settings } from '../shared/contract'

export type { Settings }

const defaults: Settings = {
  projectPath: '',
  sfPath: 'sf',
  defaultOrg: '',
  metadata: [],
  retrievalFormat: 'source',
  retrieveMode: 'all',
  specificItems: {},
  sinceDate: '',
  jiraBaseUrl: ''
}

const store = new Store<Settings>({
  name: 'blue-burlap-settings',
  defaults
})

export function getSettings(): Settings {
  return store.store
}

export function saveSettings(next: Partial<Settings>): Settings {
  store.set({ ...store.store, ...next })
  return store.store
}

export function isConfigured(): boolean {
  const s = store.store
  return Boolean(s.projectPath && s.sfPath)
}
