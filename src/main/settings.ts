import Store from 'electron-store'
import type { Settings } from '../shared/types'

export type { Settings }

const defaults: Settings = {
  projectPath: '',
  sfPath: 'sf',
  defaultOrg: '',
  metadata: []
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
