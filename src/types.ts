export interface Project {
  id: string
  name: string
  path: string
}

export interface Session {
  id: string
  projectId: string
  type: 'claude-code' | 'terminal'
  name: string
  status: 'running' | 'stopped'
}

export interface AppConfig {
  projects: Project[]
  sessions: Session[]
}

export interface IElectronAPI {
  // Project management
  getProjects: () => Promise<Project[]>
  addProject: (path: string) => Promise<Project>
  removeProject: (id: string) => Promise<void>
  reorderProjects: (fromIndex: number, toIndex: number) => Promise<void>
  selectFolder: () => Promise<string | null>

  // Session management
  getSessions: (projectId: string) => Promise<Session[]>
  createSession: (projectId: string, type: 'claude-code' | 'terminal') => Promise<Session>
  killSession: (sessionId: string) => Promise<void>
  removeSession: (sessionId: string) => Promise<void>

  // Terminal I/O
  terminalInput: (sessionId: string, data: string) => Promise<void>
  terminalResize: (sessionId: string, cols: number, rows: number) => Promise<void>

  // Terminal event listeners
  onTerminalData: (callback: (sessionId: string, data: string) => void) => () => void
  onTerminalExit: (callback: (sessionId: string) => void) => () => void

  // Open in external editor
  openInCursor: (path: string) => Promise<void>
}

declare global {
  interface Window {
    electronAPI: IElectronAPI
  }
}
