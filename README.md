# Blue Burlap

> Simplify Salesforce Admin Development with Git.

A desktop app that wraps the `sf` CLI and `git` so Salesforce admins can review, branch, commit, push, and pull metadata changes through a UI instead of the command line.

## Status

`v2` is a ground-up rebuild on a modern stack. The 6-year-old `master` branch (Vue 2 + Nuxt 2 + Electron 8) is kept intact for reference until the rebuild reaches feature parity.

## Stack

- **Electron** + **electron-vite**
- **React 19** + **TypeScript**
- **Tailwind CSS v4** + **shadcn/ui**
- **Vitest** + **Playwright** (Phase 4)
- **electron-builder** (signed Mac/Win/Linux releases, Phase 5)

## Requirements

- Node.js 22+
- Salesforce CLI (`sf`) on your `PATH`
- Git 2.40+

## Develop

```bash
npm install
npm run dev
```

## Build

```bash
npm run build           # typecheck + build
npm run build:mac       # macOS bundle
npm run build:win       # Windows installer
npm run build:linux     # Linux AppImage / deb / snap
```

## Modernization phases

- [x] **Phase 0** — scaffold (electron-vite + React + TS + Tailwind + shadcn/ui)
- [ ] **Phase 1** — main process port (settings, git, `sf` CLI wrappers)
- [ ] **Phase 2** — typed IPC layer
- [ ] **Phase 3** — renderer pages (settings, branch list, branch detail, commit)
- [ ] **Phase 4** — tests + CI
- [ ] **Phase 5** — code signing + auto-update
- [ ] **Phase 6** — cutover (`v2` → `master`)
