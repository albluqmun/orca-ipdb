# orca-ipdb

Orca plugin: press **Ctrl+Shift+0** and `import ipdb;ipdb.set_trace()` is copied
to the clipboard, ready to paste into your Python code with Cmd+V / Ctrl+V.

> Why not type it straight into the editor? Orca's plugin API (`pluginApi: 1`)
> has no host method that writes into the editor — only into terminals — so the
> clipboard is the closest supported path.

## Files

| File | Role |
|---|---|
| `orca-plugin.json` | Manifest: command `ipdb.copy-breakpoint` + keybinding `Ctrl+Shift+0` |
| `main.mjs` | Worker: copies the snippet (`pbcopy` / `clip` / `wl-copy`·`xclip`·`xsel`) and shows a notification |

Capabilities requested: `notifications:show` only.

## Develop locally

1. Orca → **Settings → Plugins → Development → Add path** → this folder.
2. Accept the permission prompt.
3. Press **Ctrl+Shift+0** (or run **ipdb: Copy Breakpoint** from the command palette) and paste.

Logs (`orca.log`) are visible in the plugin's row under Settings → Plugins.

> On Linux/Windows, `Ctrl+Shift+0` is also Orca's default for *Focus worktree
> list* (`Mod+Shift+0`). On macOS there is no conflict (`Mod` = Cmd there).

## Install from GitHub

Tag a release (`git tag v0.1.0 && git push --tags`) and install from the repo URL
in Settings → Plugins.
