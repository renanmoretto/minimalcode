import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import { spawn } from 'child_process'
import { join, basename } from 'path'
import {
  getProjects,
  addProject,
  removeProject,
  reorderProjects,
  getSessions,
  addSession,
  updateSession,
  removeSession,
  clearAllSessions
} from './services/storage'
import {
  createPtySession,
  writeToPty,
  resizePty,
  killPty
} from './services/process'
import type { Project, Session } from '../src/types'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    titleBarStyle: 'default',
    backgroundColor: '#1a1a2e'
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15)
}

function getSessionName(type: 'claude-code' | 'terminal', sessions: Session[]): string {
  const prefix = type === 'claude-code' ? 'Claude' : 'Terminal'
  const existingNumbers = sessions
    .filter(s => s.type === type)
    .map(s => {
      const match = s.name.match(/#(\d+)/)
      return match ? parseInt(match[1]) : 0
    })

  const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1
  return `${prefix} #${nextNumber}`
}

// IPC Handlers
ipcMain.handle('get-projects', () => {
  return getProjects()
})

ipcMain.handle('add-project', (_event, path: string) => {
  const project: Project = {
    id: generateId(),
    name: basename(path),
    path
  }
  addProject(project)
  return project
})

ipcMain.handle('remove-project', (_event, id: string) => {
  removeProject(id)
})

ipcMain.handle('reorder-projects', (_event, fromIndex: number, toIndex: number) => {
  reorderProjects(fromIndex, toIndex)
})

ipcMain.handle('get-sessions', (_event, projectId: string) => {
  return getSessions(projectId)
})

ipcMain.handle(
  'create-session',
  (_event, projectId: string, type: 'claude-code' | 'terminal') => {
    const projects = getProjects()
    const project = projects.find(p => p.id === projectId)

    if (!project) {
      throw new Error('Project not found')
    }

    const existingSessions = getSessions(projectId)
    const session: Session = {
      id: generateId(),
      projectId,
      type,
      name: getSessionName(type, existingSessions),
      status: 'running'
    }

    addSession(session)

    // Create PTY and wire up events
    createPtySession(
      session,
      project.path,
      (data) => {
        // Send terminal output to renderer
        mainWindow?.webContents.send('terminal-data', session.id, data)
      },
      () => {
        // Handle terminal exit
        updateSession(session.id, { status: 'stopped' })
        mainWindow?.webContents.send('terminal-exit', session.id)
      }
    )

    return session
  }
)

ipcMain.handle('terminal-input', (_event, sessionId: string, data: string) => {
  writeToPty(sessionId, data)
})

ipcMain.handle('terminal-resize', (_event, sessionId: string, cols: number, rows: number) => {
  resizePty(sessionId, cols, rows)
})

ipcMain.handle('kill-session', (_event, sessionId: string) => {
  killPty(sessionId)
  updateSession(sessionId, { status: 'stopped' })
})

ipcMain.handle('remove-session', (_event, sessionId: string) => {
  killPty(sessionId)
  removeSession(sessionId)
})

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory']
  })

  if (result.canceled || result.filePaths.length === 0) {
    return null
  }

  return result.filePaths[0]
})

ipcMain.handle('open-in-cursor', (_event, path: string) => {
  // Try to open with cursor command
  const cursor = spawn('cursor', [path], {
    detached: true,
    stdio: 'ignore',
    shell: true
  })
  cursor.unref()
})

app.whenReady().then(() => {
  // Clear old sessions on startup (PTY processes don't persist)
  clearAllSessions()
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
