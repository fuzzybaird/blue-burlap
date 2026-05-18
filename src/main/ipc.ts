import * as settings from './settings'
import * as git from './git'
import * as sf from './sf'
import { registerRouter } from './router'
import type { Handlers } from '../shared/contract'

export function registerIpcHandlers(): void {
  const handlers: Handlers = {
    settings: {
      get: () => settings.getSettings(),
      save: (next) => settings.saveSettings(next),
      isConfigured: () => settings.isConfigured()
    },
    sf: {
      check: () => sf.checkSfAvailable(),
      listOrgs: () => sf.listOrgs(),
      openOrg: (targetOrg) => sf.openOrg(targetOrg),
      retrieve: () => {
        const s = settings.getSettings()
        return sf.retrieveMetadata({
          targetOrg: s.defaultOrg,
          metadata: s.metadata,
          cwd: s.projectPath
        })
      }
    },
    git: {
      log: () => git.getLog(),
      branches: () => git.getBranches(),
      detail: (branch) => git.getBranchDetail(branch),
      createBranch: (name) => git.createBranch(name),
      pull: (branch) => git.pull(branch),
      push: (branch) => git.push(branch),
      commit: (args) => git.commit(args.files, args.message),
      pruneRemote: () => git.pruneRemote(),
      pruneLocal: () => git.pruneLocal(),
      discardLocal: () => git.discardLocal(),
      discardAll: () => git.discardAll()
    }
  }

  registerRouter(handlers)
}
