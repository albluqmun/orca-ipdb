// Orca plugin worker entry. Runs in the out-of-process plugin worker (plain
// Node, no Electron), forked lazily the first time the command fires.
//
// Why clipboard + synthetic paste: pluginApi 1 has no host method that writes
// into the editor (only `terminal.sendText`), so the snippet is copied and, on
// macOS, a Cmd+V keystroke is sent to the focused editor via System Events.
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

// Why wait for modifiers: the command fires on keydown of Ctrl+Shift+0, so the
// user is still holding Ctrl+Shift. Sending Cmd+V then would arrive as
// Cmd+Ctrl+Shift+V, which does not paste.
const MAC_PASTE_SCRIPT = `
ObjC.import('AppKit')
const MODIFIERS = (1 << 17) | (1 << 18) | (1 << 19) | (1 << 20) // shift, control, option, command
const deadline = Date.now() + 2000
while (($.NSEvent.modifierFlags & MODIFIERS) !== 0 && Date.now() < deadline) delay(0.02)
Application('System Events').keystroke('v', { using: 'command down' })
`

function run(command, args, input) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['pipe', 'ignore', 'pipe'] })
    let stderr = ''
    child.stderr.on('data', (chunk) => (stderr += chunk))
    child.on('error', reject)
    child.on('close', (code) =>
      code === 0
        ? resolve()
        : reject(new Error(stderr.trim() || `${command} exited with ${code}`))
    )
    child.stdin.end(input ?? '')
  })
}

export async function copyToClipboard(text, platform = process.platform) {
  const candidates = CLIPBOARD_COMMANDS[platform] ?? CLIPBOARD_COMMANDS.linux
  let lastError = null
  for (const [command, args] of candidates) {
    try {
      await run(command, args, text)
      return command
    } catch (error) {
      lastError = error
    }
  }
  throw lastError ?? new Error(`no clipboard command for ${platform}`)
}

/** Sends Cmd+V to the focused app. Returns false where pasting is unsupported. */
export async function pasteFromClipboard(platform = process.platform) {
  if (platform !== 'darwin') {
    return false
  }
  await run('osascript', ['-l', 'JavaScript', '-e', MAC_PASTE_SCRIPT])
  return true
}

function isAccessibilityDenied(message) {
  return /not allowed|1002|-1719|assistive|accessibility/i.test(message)
}

export default function activate(orca) {
  orca.commands.register('ipdb.copy-breakpoint', async () => {
    try {
      await copyToClipboard(SNIPPET)
    } catch (error) {
      orca.log(`clipboard copy failed: ${error.message}`)
      await orca.host.call('notifications.show', {
        title: 'ipdb breakpoint not copied',
        body: error.message
      })
      return { copied: false, pasted: false, error: error.message }
    }

    try {
      const pasted = await pasteFromClipboard()
      if (!pasted) {
        await orca.host.call('notifications.show', {
          title: 'ipdb breakpoint copied',
          body: `${SNIPPET} — paste it with Ctrl+V`
        })
      }
      return { copied: true, pasted }
    } catch (error) {
      orca.log(`paste failed: ${error.message}`)
      await orca.host.call('notifications.show', {
        title: 'ipdb breakpoint copied, not pasted',
        body: isAccessibilityDenied(error.message)
          ? 'Allow Orca in System Settings → Privacy & Security → Accessibility, then try again. Meanwhile paste with Cmd+V.'
          : `${error.message} — paste it with Cmd+V`
      })
      return { copied: true, pasted: false, error: error.message }
    }
  })
}
