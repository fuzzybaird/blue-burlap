import { ipcMain } from 'electron'
import * as settings from './settings'
import * as git from './git'
import * as sf from './sf'

export function registerIpcHandlers(): void {
  ipcMain.handle('settings:get', () => settings.getSettings())
  ipcMain.handle('settings:save', (_e, next: Partial<settings.Settings>) => settings.saveSettings(next))
  ipcMain.handle('settings:is-configured', () => settings.isConfigured())

  ipcMain.handle('sf:check', () => sf.checkSfAvailable())
  ipcMain.handle('sf:list-orgs', () => sf.listOrgs())
  ipcMain.handle('sf:open-org', (_e, targetOrg: string) => sf.openOrg(targetOrg))
  ipcMain.handle('sf:retrieve', () => {
    const s = settings.getSettings()
    return sf.retrieveMetadata({
      targetOrg: s.defaultOrg,
      metadata: s.metadata,
      cwd: s.projectPath
    })
  })

  ipcMain.handle('git:log', () => git.getLog())
  ipcMain.handle('git:branches', () => git.getBranches())
  ipcMain.handle('git:detail', (_e, branch: string) => git.getBranchDetail(branch))
  ipcMain.handle('git:create-branch', (_e, name: string) => git.createBranch(name))
  ipcMain.handle('git:pull', (_e, branch: string) => git.pull(branch))
  ipcMain.handle('git:push', (_e, branch: string) => git.push(branch))
  ipcMain.handle('git:commit', (_e, args: { files: string[]; message: string }) => git.commit(args.files, args.message))
  ipcMain.handle('git:prune-remote', () => git.pruneRemote())
  ipcMain.handle('git:prune-local', () => git.pruneLocal())
  ipcMain.handle('git:discard-local', () => git.discardLocal())
  ipcMain.handle('git:discard-all', () => git.discardAll())
}
