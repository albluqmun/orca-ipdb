# orca-ipdb

Orca plugin: press **Ctrl+Shift+0** and `import ipdb;ipdb.set_trace()` is inserted
at the cursor.

- **macOS:** the snippet is copied to the clipboard and pasted (a synthetic Cmd+V
  sent through System Events once you release the shortcut keys).
- **Linux / Windows:** the snippet is only copied; paste it with Ctrl+V.

> Why the clipboard? Orca's plugin API (`pluginApi: 1`) has no host method that
> writes into the editor — only into terminals.

## macOS permission

Synthetic keystrokes need **Accessibility** access. The first time, macOS asks
for it (or the plugin shows a notification): enable **Orca** in
System Settings → Privacy & Security → Accessibility, then press the shortcut
again. Until then the snippet is still copied, so Cmd+V works.

Note: the snippet replaces whatever was on your clipboard.

## Files

| File | Role |
|---|---|
| `orca-plugin.json` | Manifest: command `ipdb.copy-breakpoint` + keybinding `Ctrl+Shift+0` |
| `main.mjs` | Worker: copies the snippet (`pbcopy` / `clip` / `wl-copy`·`xclip`·`xsel`) and, on macOS, pastes it via `osascript` |

Capabilities requested: `notifications:show` only (used for errors).

The manifest `id` is `ipdb-breakpoint`, not `orca-ipdb`: Orca reserves ids
starting with `orca-` for the stablyai organization.

## Develop locally

1. Orca → **Settings → Plugins → Development → Add path** → this folder.
2. Accept the permission prompt.
3. Put the cursor in a file and press **Ctrl+Shift+0** (or run
   **ipdb: Insert Breakpoint** from the command palette).

Logs (`orca.log`) are visible in the plugin's row under Settings → Plugins.

> On Linux/Windows, `Ctrl+Shift+0` is also Orca's default for *Focus worktree
> list* (`Mod+Shift+0`). On macOS there is no conflict (`Mod` = Cmd there).

## Install from GitHub

Install from `https://github.com/albluqmun/orca-ipdb#<tag>` in
Settings → Plugins (e.g. `#0.2.0`).
