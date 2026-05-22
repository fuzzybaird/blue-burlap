# Blue Burlap — Project Context

This file gives an incoming Claude session (or a human collaborator) the
context to be productive without re-deriving everything from the codebase.

## What it is

Desktop app that wraps `git` and the Salesforce `sf` CLI for Salesforce
admin/developer workflows. Pick metadata to retrieve, sync from an org,
see changes against git, commit/push/pull, etc.

**Origin story.** Started as an Electron + Nuxt 2 + Vue 2 POC in 2020 as a Hackathon project,
then dormant for ~6 years. Modernized in 2026 as a ground-up rebuild — same core idea,
fresh stack.

Original project was: https://github.com/fuzzybaird/blue-burlap 

## Stack

| Layer | Choice | Why |
|---|---|---|
| Shell | Electron 39 via [`electron-vite`](https://electron-vite.org/) | Modern scaffold, TS-first |
| UI | React 19 + TypeScript 5.9 + Vite 7 | Mainstream desktop stack |
| Styling | Tailwind CSS v4 + shadcn/ui | Copy-in components, no runtime lock-in |
| State | `@tanstack/react-query` v5 | Loading/error states, cache, invalidation |
| Forms | None — local component state | Forms are small and auto-save |
| Routing | `react-router-dom` v7 with `createHashRouter` | HashRouter survives the dev `http://` → prod `file://` transition |
| Persistence | `electron-store` **v8** (pinned — v10 is ESM-only and breaks our CJS bundle) | Local settings JSON |
| Git | `simple-git` (latest) | Drops the deprecated `/promise` subpath |
| SF | `sf` CLI shell-outs (NOT legacy `sfdx`) | The supported modern CLI |
| IPC | Our own Zod-validated contract | 17 channels — small enough to roll our own instead of `electron-trpc` |
| Toasts | `sonner` | Single Toaster in root, errors via `toast.error` |
| Icons | `lucide-react` | Inline SVG, tree-shakeable |
| Date input | Native `<input type="date">` | Native picker, no extra dep |

## Project layout

```
src/
├── main/           # Electron main process (Node, has filesystem + child_process)
│   ├── index.ts    # Entry: window creation, IPC registration
│   ├── settings.ts # electron-store wrapper
│   ├── git.ts      # simple-git wrappers
│   ├── sf.ts       # sf CLI wrappers + retrieve modes
│   ├── router.ts   # Generic contract-driven IPC registrar
│   └── ipc.ts      # Wires handlers to contract
├── preload/        # Runs in renderer context, has limited Node access
│   ├── index.ts    # contextBridge exposing window.api built from contract
│   └── index.d.ts  # window typing
├── renderer/src/   # React app (browser)
│   ├── App.tsx, main.tsx
│   ├── pages/      # Route components
│   ├── components/ # UI components (layout/, ui/ from shadcn, retrieve/)
│   ├── api/        # React Query hooks + queryClient + key constants
│   ├── lib/        # utils (cn helper)
│   └── assets/     # CSS, images
└── shared/
    └── contract.ts # The IPC contract — single source of truth
```

## IPC architecture (the heart of the codebase)

[src/shared/contract.ts](src/shared/contract.ts) is the **single source of truth** for every channel.

It declares a nested object where each leaf is `{ input: ZodSchema, output: ZodSchema }`:

```ts
export const contract = {
  settings: {
    get: { input: z.void(), output: settingsSchema },
    save: { input: settingsSchema.partial(), output: settingsSchema },
    ...
  },
  sf: { ... },
  git: { ... }
} as const
```

From this one object:

- [src/main/router.ts](src/main/router.ts) walks the contract and registers each `ipcMain.handle()` with **both input AND output validation**.
- [src/preload/index.ts](src/preload/index.ts) walks the contract and auto-builds a client. Renderer accesses via `window.api.{namespace}.{channel}(input)` returning `Promise<output>`.
- Renderer hooks ([src/renderer/src/api/hooks.ts](src/renderer/src/api/hooks.ts)) wrap each channel in `useQuery` or `useMutation`.

**Why this matters:** add a channel by editing one file (contract.ts) and writing a handler. The router and client adjust automatically. The Zod parse at the IPC boundary catches drift between sides — if main returns the wrong shape, we get a `Contract violation on <channel> (output): <field>: <reason>` error rather than mystery downstream failures.

**Type derivation:** `Settings = z.infer<typeof settingsSchema>`, etc. — no hand-written types that can drift from the schemas.

## Conventions

### Auto-save (Settings, Retrieve pages)
- **Text inputs:** save on blur, only if value changed (`handleTextBlur` in Settings.tsx)
- **Selects/checkboxes:** save immediately on change (`updateAndSave`)
- **Group "Select all" / "Clear":** save immediately
- The header `<SaveIndicator />` shows "Saving…" → "Saved" (1.5s) for any `['settings', 'save']` mutation in flight

### Errors → toasts, not inline
- Mutations have `onError: (err) => toast.error(...)` handlers
- Reserve inline error rendering for query failures that block the whole page

### Cursor styling
- Global rule in [src/renderer/src/assets/main.css](src/renderer/src/assets/main.css): `button:not(:disabled) { cursor: pointer }`. Don't add per-button.

### Search/filter inside Popover+Command pickers
- **Always set `shouldFilter={false}` on `<Command>`.** cmdk's default fuzzy + score-sort reorders items by relevance, which is confusing.
- Control `CommandInput` with local `search` state, filter the items array with case-insensitive substring match, and let items render in their pre-sorted (usually alphabetical) order.
- Pattern is used in both `ItemPicker` and the branch picker on `BranchList`.

### Branch detection
- Never hardcode `master`. Use [`detectDefaultBranch`](src/main/git.ts) in main, which tries `git symbolic-ref --short refs/remotes/origin/HEAD`, then local `main`/`master`, then current branch.

### Singleton SimpleGit instance
- [`git()` in src/main/git.ts](src/main/git.ts) caches one `SimpleGit` per project path. **All operations go through one task queue.** Multiple instances would race for `.git/index.lock` and fail (e.g., `push → onSuccess invalidate → checkout` triggered by re-render).

### Path aliases
- `@/*` and `@renderer/*` → `src/renderer/src/*`
- `@shared/*` → `src/shared/*`
- Set in [tsconfig.web.json](tsconfig.web.json) AND [electron.vite.config.ts](electron.vite.config.ts) — both need updating in lockstep.
- `tsconfig.node.json` must `include: ['src/shared/**/*']` for main/preload to see contract types.

## Salesforce specifics

### Retrieve format (Settings)
- **Source format** (`sf project retrieve start --metadata X --json`): writes to wherever `sfdx-project.json` says (usually `force-app/main/default/...`).
- **Metadata format**: `sf project retrieve start --target-metadata-dir <tempDir> --unzip --json`. Output lands in `<tempDir>/unpackaged/<...>`. We merge those contents *into* `<projectPath>/src/` using `mergeContents()` (explicit child-by-child copy, not `fs.cp` of the directory which has subtle semantics).

### Retrieve modes (Retrieve page)
- **`all`** — `--metadata Type` for each selected type. Retrieves everything of those types.
- **`specific`** — `--metadata Type:Name1 --metadata Type:Name2 ...`. User-picked items per type via `ItemPicker`.
- **`since-date`** — renderer pre-computes filtered items from cached metadata lists + chosen date, then passes as an **override** to the retrieve IPC. Main treats override as a `'specific'` retrieve. Renderer is responsible for resolution because the metadata-items cache lives there.

### Filtering managed-package items
- `sf org list metadata --metadata-type X` returns items including ones installed from managed packages
- Filter them out: `!namespacePrefix && manageableState === 'unmanaged'`
- Done in both `ItemPicker` (with a "Show managed-package items" toggle, default off) and the since-date resolver

### Metadata items cache
- Heavy first fetch per type (5–15 seconds for `ApexClass` on a real org)
- Keyed `['org-metadata', <type>]` — **outside** the `['sf']` tree so general settings saves don't wipe it
- `staleTime: Infinity, gcTime: Infinity` — only invalidate when `defaultOrg` or `sfPath` changes (handled in `useSaveSettings.onSuccess` via inspection of `variables`)

### `sf org list metadata` item shape
Useful fields: `fullName`, `lastModifiedDate`, `lastModifiedByName`, `namespacePrefix`, `manageableState`, `type`, `fileName`. Schema in contract uses `.passthrough()` so unknown fields don't cause drift.

## Known gotchas (read these before you debug)

### 1. IPC structured-clone can't carry functions
Electron uses structured clone for IPC. If main returns an object with **own-property functions**, the clone fails with "An object could not be cloned." Specifically: simple-git's `StatusSummary` has `this.isClean = () => ...` set in the constructor — it's an own property. Always return a plain literal object from main, not the simple-git instance. See [`getBranchDetail`](src/main/git.ts) for the pattern.

### 2. `git diff --name-only` doesn't respect `--ignore-all-space`
The `--name-only` switch lists every file with any byte-level diff, ignoring the content flags. To classify whitespace-only files, you have to **parse the actual diff output** (`git diff HEAD --ignore-all-space --ignore-blank-lines`) and look for real-change signals: `@@` hunks, `Binary files ... differ`, `old/new mode`, `rename from/to`. See [`classifyWhitespaceOnly`](src/main/git.ts).

### 3. Zod `.default()` survives `.partial()`
`z.object({ a: z.string().default('x') }).partial().parse({})` returns `{ a: 'x' }`. The default still injects when the field is undefined. **Never put `.default()` on settings schema fields** — partial saves like `{ defaultOrg }` will silently inject defaults for all the other fields and stomp the user's values. Use `electron-store`'s `defaults` config (data-layer) for new-user defaults instead. We hit this bug once with `retrievalFormat`.

### 4. `--ignore-all-space` is aggressive
Ignores all within-line whitespace including end-of-line. Catches the "no newline at end of file" case (which is the Salesforce papercut driving the whole whitespace-only feature). Doesn't merge or split lines — structural changes still show as hunks.

### 5. Concurrent git operations race for `.git/index.lock`
A `push` mutation that on-success-invalidates the branches query triggers a `git:detail` refetch *which does a checkout*. Without serialization the two `git` subprocesses race for the lock. Fix: the [`git()` singleton](src/main/git.ts) ensures all operations flow through one simple-git instance, which queues them.

### 6. Salesforce returns epoch dates for some items
For items it doesn't track modification history on (standard CustomObjects out of the box, system metadata), `lastModifiedDate` comes back as `1970-01-01T00:00:00.000Z` or similar. [`formatRelative`](src/renderer/src/components/retrieve/ItemPicker.tsx) returns `null` for any date earlier than 1980 as a sentinel. The renderer skips the date suffix when the relative is null.

### 7. Path quoting in `git` output
`git` by default escapes non-ASCII characters in paths (`core.quotepath=true`). Pass `-c core.quotepath=false` for raw, unescaped paths. Salesforce metadata paths are usually ASCII-clean but be defensive.

### 8. `git diff <path>` is ambiguous without `--`
Without `--`, git tries to interpret the argument as a revision first. Paths with unusual names (or in specific working-tree states) trip this. Always use `git diff -- <path>`.

### 9. `git checkout HEAD -- <paths>` for selective revert
Use this for "discard changes to these specific files." Plain `git checkout -- <paths>` reverts to the index (which can hold staged changes); using `HEAD --` reverts to the committed state regardless of staging. See [`discardFiles`](src/main/git.ts).

### 10. `sf` CLI environment quirk
`ELECTRON_RUN_AS_NODE=1` in the environment will cause Electron to run in Node-only mode and `require('electron')` returns a string (the binary path) instead of the API object. This was a Claude Code sandbox issue during initial development. The user's normal terminal won't have this.

## Settings file

```
~/Library/Application Support/blue-burlap/blue-burlap-settings.json
```

Shape (from [src/shared/contract.ts](src/shared/contract.ts)):
```ts
{
  projectPath: string         // absolute path to the SF project
  sfPath: string              // 'sf' or full path to the binary
  defaultOrg: string          // alias or username
  metadata: string[]          // selected metadata types
  retrievalFormat: 'source' | 'metadata'
  retrieveMode: 'all' | 'specific' | 'since-date'
  specificItems: Record<string, string[]>  // type -> [name1, name2, ...]
  sinceDate: string           // YYYY-MM-DD, empty when unset
  jiraBaseUrl: string         // empty disables the Jira header link
}
```

## Commands

```bash
npm install
npm run dev              # electron-vite dev with HMR
npm run typecheck        # tsc --noEmit, both node and web configs
npm run build            # typecheck + electron-vite build
npm run build:mac        # also runs electron-builder for macOS
npm run build:win
npm run build:linux
```

## Phases (modernization plan)

- [x] **Phase 0** — scaffold (electron-vite + React + TS + Tailwind + shadcn)
- [x] **Phase 1** — main process port (electron-store, simple-git, sf CLI)
- [x] **Phase 2** — typed IPC contract with Zod + React Query hooks
- [x] **Phase 3** — renderer pages on React + shadcn (Branches, Retrieve, Commit, Settings)
  - [x] **3a** — `sf:listMetadataItems` channel + cache
  - [x] **3b** — Specific Items picker mode
  - [x] **3c** — Modified-Since mode with date picker + preview
  - [x] Substantial polish: auto-save, save indicator, GitHub link, Jira link, whitespace-only classifier, defaults branch detection, confirmation dialogs on destructive maintenance actions, ItemPicker filtering refinements, etc.
- [ ] **Phase 4** — tests (Vitest unit + Playwright e2e) + CI workflow
- [ ] **Phase 5** — code signing (Mac Developer ID + notarization, Windows signing) + auto-update

## Key features built

- **Branches page** — searchable combobox with Local/Remote tabs, default branch detection, create-branch form. Picker triggers `git:checkout` (not navigate) and stays on the page.
- **Commit page** (= BranchDetail) — pull/push status, file checkboxes for staging, expandable diff per file with simple line-coloring, separate "Whitespace-only changes" card with bulk "Discard All".
- **Retrieve page** — mode selector (all/specific/since-date), grouped metadata-type checkboxes with select-all per group, ItemPicker (showing fullName + lastModifiedByName + relative date + managed-package filter + selected chips below trigger), since-date preview per type.
- **Settings page** — org select, retrieve format, project path, sf path, Jira issue URL, maintenance buttons (Prune Remote/Local, Discard Local/All) with confirmation dialogs.
- **Header** — nav (Branches/Retrieve/Commit/Settings), org name + Sync button (resolves since-date filter when needed), conditional Salesforce/GitHub/Jira external links.

## What's intentionally NOT yet done

- Tests
- CI/release workflow
- Code signing / auto-update

## Tips for working in this codebase

- **Need a new IPC channel?** Add it to `src/shared/contract.ts` (with input/output schemas), implement the handler in `src/main/ipc.ts` (calls into a module in `src/main/`), and consume from the renderer via a hook in `src/renderer/src/api/hooks.ts`. The preload bridge auto-builds; no manual wiring there.
- **New page?** Add a route in `src/renderer/src/App.tsx`, the component under `src/renderer/src/pages/`, and a NavLink in `src/renderer/src/components/layout/Header.tsx`.
- **New shadcn component?** `npx shadcn@latest add <name>`. It will drop into a `@/components/ui/` folder at the repo root (not the alias target) — you'll need to `mv` it into `src/renderer/src/components/ui/`. Known quirk of the shadcn CLI with our electron-vite layout.
- **Need to debug an IPC issue?** Output validation in the router catches most things. Add a `console.log` in main — it shows in the terminal where `npm run dev` is running, not the DevTools console.
- **Need to inspect React Query cache?** Open DevTools in the running app and run `await window.api.<...>` directly in the console.

## Open design questions / future considerations

- **Source-format leftovers** in metadata mode: when switching modes, stale `src/main/default/` or `force-app/` directories can hang around as untracked files. We discussed adding auto-cleanup but deferred — the workflow ambiguity (intentional vs leftover) wasn't worth the destructiveness.
- **Long org aliases** can push header layout. Not solved; truncation would be the fix if it becomes annoying.
- **GitHub Enterprise**: the URL detection only matches `github.com` exactly. Extending to `*.github.com` or custom enterprise hostnames is a single regex change.
- **CustomField listing**: `sf org list metadata --metadata-type CustomField` doesn't work directly. Would need to query via `CustomObject` and walk the fields array. Not implemented; field-level retrieve falls back to "all of type" today.

## Recent commits (as of writing this)

- `4564647` Phase 3: rebuild renderer pages on React + shadcn
- `dd0b32f` Phase 2: typed IPC contract with Zod + React Query hooks
- `aac66be` Phase 1: port main process (electron-store, simple-git, sf CLI)
- `f68950b` Phase 0: scaffold v2 on Electron + React + TS + Tailwind

Everything since `4564647` is uncommitted at the time of this writing (lots of polish from a long working session). Worth squashing into reviewable commits before/after the move.
