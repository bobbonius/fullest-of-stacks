const SHOW_CURSOR = '\x1b[?25h'
const LEAVE_ALT_SCREEN = '\x1b[?1049l'

/** Prisma (and other clack CLIs) can leave the TTY in raw mode with a
 *  hidden cursor after they print "Done". Later scaffold output then
 *  overwrites one line and looks like a hang. */
export function restoreTerminal() {
  if (process.stdin.isTTY && typeof process.stdin.setRawMode === 'function') {
    try {
      process.stdin.setRawMode(false)
    } catch {
      // Not every stdin handle supports raw mode (piped, already destroyed).
    }
  }

  for (const stream of [process.stdout, process.stderr]) {
    if (!stream.isTTY) continue
    stream.write(`${SHOW_CURSOR}${LEAVE_ALT_SCREEN}`)
  }

  if (process.stderr.isTTY) process.stderr.write('\n')
}
