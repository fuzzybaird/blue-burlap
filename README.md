# Blue Burlap

> Simplify Salesforce Admin Development with Git.

A desktop app that wraps the `sf` CLI and `git` so Salesforce admins can review, branch, commit, push, and pull metadata changes through a UI instead of the command line.

## What it does

- **Branches** — switch between, create, and search the repo's branches with a fast picker (Local/Remote tabs, substring search). Auto-detects the repo's default branch (`main`/`master`/etc.) for prune operations.
- **Retrieve from a Salesforce org** in three modes:
  - **All items** of selected metadata types
  - **Specific items** picked from the org's metadata listings (with author and last-modified-date subtitles, managed-package filter)
  - **Modified since** a chosen date, computed client-side from the same listings
- **Commit page** — pull/push status, file-level diff viewer, selective staging, and a separate "Whitespace-only changes" bucket for the Salesforce-side reformatting noise (with bulk Discard All).
- **External links** in the header — open the current org in Salesforce, the current branch on GitHub, or the Jira ticket inferred from the branch name pattern `type/KEY-123-…`.
- **Auto-save** on Settings + Retrieve with a small header indicator showing when a save is in flight.

## Status

The `v2` branch is a ground-up rebuild on a modern stack (Electron 39, React 19, TS, Tailwind v4, shadcn/ui). The 6-year-old `master` branch (Vue 2 + Nuxt 2 + Electron 8) is kept intact for reference. Phases 0–3 are done with substantial polish; Phases 4–6 (tests + CI, signing + auto-update, cutover) are outstanding.

See [CLAUDE.md](CLAUDE.md) for the full architecture, conventions, and known gotchas.

## Stack

- **Electron 39** + **[electron-vite](https://electron-vite.org/)** v5
- **React 19** + **TypeScript 5.9** + **Vite 7**
- **Tailwind CSS v4** + **shadcn/ui**
- **`@tanstack/react-query`** v5 for renderer state
- **Zod**-validated IPC contract (custom router, no `electron-trpc` dependency)
- **`electron-store`** v8 (pinned — v10 is ESM-only)
- **`simple-git`** for git operations
- **`sf` CLI** (the modern Salesforce CLI, not legacy `sfdx`)

## Requirements

- Node.js 22+
- Salesforce CLI (`sf`) on your `PATH` (or set its full path in Settings)
- Git 2.40+

## Develop

```bash
npm install
npm run dev          # electron-vite dev with HMR
npm run typecheck    # tsc --noEmit for both node and web configs
```

## Build

```bash
npm run build           # typecheck + production build
npm run build:mac       # macOS bundle
npm run build:win       # Windows installer
npm run build:linux     # Linux AppImage / deb / snap
```

## Settings file

Per-user JSON at:

```
~/Library/Application Support/blue-burlap/blue-burlap-settings.json
```

Delete it to reset to first-run state.

## Modernization phases

- [x] **Phase 0** — scaffold (electron-vite + React + TS + Tailwind + shadcn/ui)
- [x] **Phase 1** — main process port (settings, git, `sf` CLI wrappers)
- [x] **Phase 2** — typed IPC contract layer with Zod + React Query
- [x] **Phase 3** — renderer pages on React + shadcn (Branches, Retrieve, Commit, Settings)
  - [x] **3a** — `sf:listMetadataItems` channel + cache
  - [x] **3b** — Specific Items picker mode with multi-select
  - [x] **3c** — Modified-Since mode with date picker + preview
  - [x] Polish: auto-save with header indicator, GitHub + Jira links, whitespace-only classifier, branch-default detection, destructive-action confirmations, etc.
- [ ] **Phase 4** — Vitest unit tests + Playwright e2e + CI workflow
- [ ] **Phase 5** — Code signing (Mac Developer ID + notarization, Windows) + auto-update
- [ ] **Phase 6** — Cutover (`v2` → `main`)

## Contributing / further reading

- [CLAUDE.md](CLAUDE.md) — full project context: architecture, IPC pattern, conventions, gotchas, where things live.
