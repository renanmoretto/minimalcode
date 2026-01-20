/* eslint-disable @typescript-eslint/no-var-requires */
const pty = require('node-pty')
import type { Session } from '../../src/types'

interface PtySession {
  pty: typeof pty.IPty
  session: Session
}

const ptySessions = new Map<string, PtySession>()

export function createPtySession(
  session: Session,
  projectPath: string,
  onData: (data: string) => void,
  onExit: () => void
): void {
  const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash'
  const isClaudeCode = session.type === 'claude-code'

  const ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-256color',
    cols: 120,
    rows: 30,
    cwd: projectPath,
    env: process.env as Record<string, string>
  })

  ptyProcess.onData(onData)
  ptyProcess.onExit(onExit)

  ptySessions.set(session.id, { pty: ptyProcess, session })

  // If claude-code, launch claude command after shell starts
  if (isClaudeCode) {
    setTimeout(() => {
      ptyProcess.write('claude\r')
    }, 500)
  }
}

export function writeToPty(sessionId: string, data: string): void {
  const session = ptySessions.get(sessionId)
  if (session) {
    session.pty.write(data)
  }
}

export function resizePty(sessionId: string, cols: number, rows: number): void {
  const session = ptySessions.get(sessionId)
  if (session) {
    session.pty.resize(cols, rows)
  }
}

export function killPty(sessionId: string): void {
  const session = ptySessions.get(sessionId)
  if (session) {
    session.pty.kill()
    ptySessions.delete(sessionId)
  }
}

export function getPtySession(sessionId: string): PtySession | undefined {
  return ptySessions.get(sessionId)
}

export function getAllPtySessions(): Map<string, PtySession> {
  return ptySessions
}
