// Orca plugin worker entry. Runs in the out-of-process plugin worker (plain
// Node, no Electron), forked lazily the first time the command fires.
//
// Why the clipboard: pluginApi 1 has no host method that writes into the
// editor (only `terminal.sendText`), so the snippet is copied and the user
// pastes it with Cmd/Ctrl+V.
import { spawn } from 'node:child_process'

export const SNIPPET = 'import ipdb;ipdb.set_trace()'

/** Clipboard writers per platform, tried in order until one succeeds. */
const CLIPBOARD_COMMANDS = {
  darwin: [['pbcopy', []]],
  win32: [['clip', []]],
  linux: [
    ['wl-copy', []],
    ['xclip', ['-selection', 'clipboard']],
    ['xsel', ['--clipboard', '--input']]
  ]
}

function pipeTo(command, args, text) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['pipe', 'ignore', 'ignore'] })
    child.on('error', reject)
    child.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}`))
    )
    child.stdin.end(text)
  })
}

export async function copyToClipboard(text, platform = process.platform) {
  const candidates = CLIPBOARD_COMMANDS[platform] ?? CLIPBOARD_COMMANDS.linux
  let lastError = null
  for (const [command, args] of candidates) {
    try {
      await pipeTo(command, args, text)
      return command
    } catch (error) {
      lastError = error
    }
  }
  throw lastError ?? new Error(`no clipboard command for ${platform}`)
}

export default function activate(orca) {
  orca.commands.register('ipdb.copy-breakpoint', async () => {
    try {
      const via = await copyToClipboard(SNIPPET)
      orca.log(`copied breakpoint via ${via}`)
      await orca.host.call('notifications.show', {
        title: 'ipdb breakpoint copied',
        body: `${SNIPPET} — paste it with ${process.platform === 'darwin' ? 'Cmd' : 'Ctrl'}+V`
      })
      return { copied: true, snippet: SNIPPET }
    } catch (error) {
      orca.log(`clipboard copy failed: ${error.message}`)
      await orca.host.call('notifications.show', {
        title: 'ipdb breakpoint not copied',
        body: error.message
      })
      return { copied: false, error: error.message }
    }
  })
}
