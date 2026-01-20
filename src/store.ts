import { create } from 'zustand'
import type { Project, Session } from './types'

interface AppState {
  projects: Project[]
  sessions: Session[]
  activeProjectId: string | null
  activeProject: Project | null
  activeSessionId: string | null

  // Actions
  loadProjects: () => Promise<void>
  addProject: (path: string) => Promise<void>
  removeProject: (id: string) => Promise<void>
  setActiveProject: (id: string | null) => void
  reorderProjects: (fromIndex: number, toIndex: number) => void

  loadSessions: () => Promise<void>
  createSession: (type: 'claude-code' | 'terminal') => Promise<void>
  killSession: (sessionId: string) => Promise<void>
  removeSession: (sessionId: string) => Promise<void>
  setActiveSession: (sessionId: string | null) => void
  markSessionStopped: (sessionId: string) => void
  reorderSessions: (fromIndex: number, toIndex: number) => void
}

export const useStore = create<AppState>((set, get) => ({
  projects: [],
  sessions: [],
  activeProjectId: null,
  activeProject: null,
  activeSessionId: null,

  loadProjects: async () => {
    const projects = await window.electronAPI.getProjects()
    set({ projects })
  },

  addProject: async (path: string) => {
    const project = await window.electronAPI.addProject(path)
    set(state => ({
      projects: [...state.projects, project],
      activeProjectId: project.id,
      activeProject: project,
      sessions: [],
      activeSessionId: null
    }))
  },

  removeProject: async (id: string) => {
    await window.electronAPI.removeProject(id)
    set(state => {
      const projects = state.projects.filter(p => p.id !== id)
      const newActiveId = state.activeProjectId === id
        ? (projects[0]?.id ?? null)
        : state.activeProjectId
      return {
        projects,
        activeProjectId: newActiveId,
        activeProject: projects.find(p => p.id === newActiveId) ?? null,
        sessions: state.activeProjectId === id ? [] : state.sessions,
        activeSessionId: state.activeProjectId === id ? null : state.activeSessionId
      }
    })
    if (get().activeProjectId) {
      get().loadSessions()
    }
  },

  setActiveProject: (id: string | null) => {
    set(state => ({
      activeProjectId: id,
      activeProject: state.projects.find(p => p.id === id) ?? null,
      sessions: [],
      activeSessionId: null
    }))
    if (id) {
      get().loadSessions()
    }
  },

  reorderProjects: (fromIndex: number, toIndex: number) => {
    set(state => {
      const projects = [...state.projects]
      const [moved] = projects.splice(fromIndex, 1)
      projects.splice(toIndex, 0, moved)
      return { projects }
    })
    window.electronAPI.reorderProjects(fromIndex, toIndex)
  },

  loadSessions: async () => {
    const { activeProjectId } = get()
    if (!activeProjectId) return

    const sessions = await window.electronAPI.getSessions(activeProjectId)
    // Only keep running sessions in memory (stopped sessions can be removed)
    const runningSessions = sessions.filter(s => s.status === 'running')
    set({
      sessions: runningSessions,
      activeSessionId: runningSessions[0]?.id ?? null
    })
  },

  createSession: async (type: 'claude-code' | 'terminal') => {
    const { activeProjectId } = get()
    if (!activeProjectId) return

    const session = await window.electronAPI.createSession(activeProjectId, type)
    set(state => {
      const sessions = [...state.sessions]
      if (type === 'claude-code') {
        // Insert after last claude-code session
        const lastClaudeIndex = sessions.map(s => s.type).lastIndexOf('claude-code')
        sessions.splice(lastClaudeIndex + 1, 0, session)
      } else {
        // Terminal goes at the end
        sessions.push(session)
      }
      return { sessions, activeSessionId: session.id }
    })
  },

  killSession: async (sessionId: string) => {
    await window.electronAPI.killSession(sessionId)
    set(state => ({
      sessions: state.sessions.filter(s => s.id !== sessionId),
      activeSessionId: state.activeSessionId === sessionId
        ? (state.sessions.find(s => s.id !== sessionId)?.id ?? null)
        : state.activeSessionId
    }))
  },

  removeSession: async (sessionId: string) => {
    await window.electronAPI.removeSession(sessionId)
    set(state => ({
      sessions: state.sessions.filter(s => s.id !== sessionId),
      activeSessionId: state.activeSessionId === sessionId
        ? (state.sessions.find(s => s.id !== sessionId)?.id ?? null)
        : state.activeSessionId
    }))
  },

  setActiveSession: (sessionId: string | null) => {
    set({ activeSessionId: sessionId })
  },

  markSessionStopped: (sessionId: string) => {
    set(state => ({
      sessions: state.sessions.filter(s => s.id !== sessionId),
      activeSessionId: state.activeSessionId === sessionId
        ? (state.sessions.find(s => s.id !== sessionId)?.id ?? null)
        : state.activeSessionId
    }))
  },

  reorderSessions: (fromIndex: number, toIndex: number) => {
    set(state => {
      const sessions = [...state.sessions]
      const [moved] = sessions.splice(fromIndex, 1)
      sessions.splice(toIndex, 0, moved)
      return { sessions }
    })
  }
}))
