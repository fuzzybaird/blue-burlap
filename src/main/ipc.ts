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
      retrieve: (input) => {
        const s = settings.getSettings()

        // The renderer pre-resolves the item list for 'since-date' mode and
        // passes it as an override. When present, treat it as a 'specific'
        // retrieve with the override values.
        if (input.override) {
          return sf.retrieveMetadata({
            targetOrg: s.defaultOrg,
            metadata: input.override.metadata,
            cwd: s.projectPath,
            format: s.retrievalFormat,
            mode: 'specific',
            specificItems: input.override.specificItems
          })
        }

        // Without an override, settings.retrieveMode is the source of truth
        // — but 'since-date' is meaningless on the main side without the
        // resolved list. If we somehow get here in since-date mode, fail
        // loudly rather than silently retrieving everything.
        const mode = s.retrieveMode
        if (mode === 'since-date') {
          throw new Error(
            'since-date mode requires the renderer to resolve and pass the filtered item list'
          )
        }

        return sf.retrieveMetadata({
          targetOrg: s.defaultOrg,
          metadata: s.metadata,
          cwd: s.projectPath,
          format: s.retrievalFormat,
          mode,
          specificItems: s.specificItems
        })
      },
      listMetadataItems: (type) => sf.listMetadataItems(type)
    },
    git: {
      log: () => git.getLog(),
      branches: () => git.getBranches(),
      current: () => git.getCurrentBranch(),
      remoteUrl: () => git.getRemoteUrl(),
      detail: (branch) => git.getBranchDetail(branch),
      checkout: (branch) => git.checkoutBranch(branch),
      createBranch: (name) => git.createBranch(name),
      pull: (branch) => git.pull(branch),
      push: (branch) => git.push(branch),
      commit: (args) => git.commit(args.files, args.message),
      pruneRemote: () => git.pruneRemote(),
      pruneLocal: () => git.pruneLocal(),
      discardLocal: () => git.discardLocal(),
      discardAll: () => git.discardAll(),
      discardFiles: (paths) => git.discardFiles(paths)
    }
  }

  registerRouter(handlers)
}
