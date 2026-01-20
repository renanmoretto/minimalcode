import { contextBridge, ipcRenderer } from 'electron'

const electronAPI = {
  // Project management
  getProjects: () => ipcRenderer.invoke('get-projects'),
  addProject: (path: string) => ipcRenderer.invoke('add-project', path),
  removeProject: (id: string) => ipcRenderer.invoke('remove-project', id),
  reorderProjects: (fromIndex: number, toIndex: number) => ipcRenderer.invoke('reorder-projects', fromIndex, toIndex),
  selectFolder: () => ipcRenderer.invoke('select-folder'),

  // Session management
  getSessions: (projectId: string) => ipcRenderer.invoke('get-sessions', projectId),
  createSession: (projectId: string, type: 'claude-code' | 'terminal') =>
    ipcRenderer.invoke('create-session', projectId, type),
  killSession: (sessionId: string) => ipcRenderer.invoke('kill-session', sessionId),
  removeSession: (sessionId: string) => ipcRenderer.invoke('remove-session', sessionId),

  // Terminal I/O
  terminalInput: (sessionId: string, data: string) =>
    ipcRenderer.invoke('terminal-input', sessionId, data),
  terminalResize: (sessionId: string, cols: number, rows: number) =>
    ipcRenderer.invoke('terminal-resize', sessionId, cols, rows),

  // Terminal event listeners
  onTerminalData: (callback: (sessionId: string, data: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, sessionId: string, data: string) => {
      callback(sessionId, data)
    }
    ipcRenderer.on('terminal-data', handler)
    return () => ipcRenderer.removeListener('terminal-data', handler)
  },

  onTerminalExit: (callback: (sessionId: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, sessionId: string) => {
      callback(sessionId)
    }
    ipcRenderer.on('terminal-exit', handler)
    return () => ipcRenderer.removeListener('terminal-exit', handler)
  },

  // Open in external editor
  openInCursor: (path: string) => ipcRenderer.invoke('open-in-cursor', path)
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

export type ElectronAPI = typeof electronAPI
