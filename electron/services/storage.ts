import { app } from 'electron'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import type { Project, Session, AppConfig } from '../../src/types'

const getConfigPath = () => {
  const userDataPath = app.getPath('userData')
  return join(userDataPath, 'config.json')
}

const defaultConfig: AppConfig = {
  projects: [],
  sessions: []
}

export function loadConfig(): AppConfig {
  const configPath = getConfigPath()

  if (!existsSync(configPath)) {
    saveConfig(defaultConfig)
    return defaultConfig
  }

  try {
    const data = readFileSync(configPath, 'utf-8')
    return JSON.parse(data) as AppConfig
  } catch {
    return defaultConfig
  }
}

export function saveConfig(config: AppConfig): void {
  const configPath = getConfigPath()
  const dir = join(configPath, '..')

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  writeFileSync(configPath, JSON.stringify(config, null, 2))
}

export function getProjects(): Project[] {
  return loadConfig().projects
}

export function addProject(project: Project): void {
  const config = loadConfig()
  config.projects.push(project)
  saveConfig(config)
}

export function removeProject(id: string): void {
  const config = loadConfig()
  config.projects = config.projects.filter(p => p.id !== id)
  config.sessions = config.sessions.filter(s => s.projectId !== id)
  saveConfig(config)
}

export function reorderProjects(fromIndex: number, toIndex: number): void {
  const config = loadConfig()
  const [moved] = config.projects.splice(fromIndex, 1)
  config.projects.splice(toIndex, 0, moved)
  saveConfig(config)
}

export function getSessions(projectId?: string): Session[] {
  const config = loadConfig()
  if (projectId) {
    return config.sessions.filter(s => s.projectId === projectId)
  }
  return config.sessions
}

export function addSession(session: Session): void {
  const config = loadConfig()
  config.sessions.push(session)
  saveConfig(config)
}

export function updateSession(sessionId: string, updates: Partial<Session>): void {
  const config = loadConfig()
  const index = config.sessions.findIndex(s => s.id === sessionId)
  if (index !== -1) {
    config.sessions[index] = { ...config.sessions[index], ...updates }
    saveConfig(config)
  }
}

export function removeSession(sessionId: string): void {
  const config = loadConfig()
  config.sessions = config.sessions.filter(s => s.id !== sessionId)
  saveConfig(config)
}

export function clearAllSessions(): void {
  const config = loadConfig()
  config.sessions = []
  saveConfig(config)
}
