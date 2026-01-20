import { useEffect, useState } from 'react'
import { useStore } from './store'
import Sidebar from './components/Sidebar'
import Terminal from './components/Terminal'

export default function App() {
  const {
    activeProject,
    sessions,
    activeSessionId,
    loadProjects,
    createSession,
    killSession,
    setActiveSession,
    markSessionStopped,
    reorderSessions
  } = useStore()

  const [draggedTabIndex, setDraggedTabIndex] = useState<number | null>(null)
  const [dragOverTabIndex, setDragOverTabIndex] = useState<number | null>(null)

  const handleTabDragStart = (e: React.DragEvent, index: number) => {
    setDraggedTabIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleTabDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverTabIndex(index)
  }

  const handleTabDragLeave = () => {
    setDragOverTabIndex(null)
  }

  const handleTabDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault()
    if (draggedTabIndex !== null && draggedTabIndex !== toIndex) {
      reorderSessions(draggedTabIndex, toIndex)
    }
    setDraggedTabIndex(null)
    setDragOverTabIndex(null)
  }

  const handleTabDragEnd = () => {
    setDraggedTabIndex(null)
    setDragOverTabIndex(null)
  }

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  // Listen for terminal exits
  useEffect(() => {
    const cleanup = window.electronAPI.onTerminalExit((sessionId) => {
      markSessionStopped(sessionId)
    })
    return cleanup
  }, [markSessionStopped])

  return (
    <div className="app">
      <Sidebar />
      <main className="main-content">
        {activeProject ? (
          <>
            <div className="project-header">
              <div>
                <h1>{activeProject.name}</h1>
                <p className="path">{activeProject.path}</p>
              </div>
              <div className="session-actions">
                <button className="btn btn-primary" onClick={() => createSession('claude-code')}>
                  + Claude Code
                </button>
                <button className="btn btn-secondary" onClick={() => createSession('terminal')}>
                  + Terminal
                </button>
                <button
                  className="btn btn-outline"
                  onClick={() => window.electronAPI.openInCursor(activeProject.path)}
                >
                  Open in Cursor
                </button>
              </div>
            </div>

            {sessions.length > 0 ? (
              <div className="terminal-container">
                <div className="session-tabs">
                  {sessions.map((session, index) => (
                    <div
                      key={session.id}
                      className={`session-tab ${activeSessionId === session.id ? 'active' : ''} ${draggedTabIndex === index ? 'dragging' : ''} ${dragOverTabIndex === index ? 'drag-over' : ''}`}
                      onClick={() => setActiveSession(session.id)}
                      draggable
                      onDragStart={(e) => handleTabDragStart(e, index)}
                      onDragOver={(e) => handleTabDragOver(e, index)}
                      onDragLeave={handleTabDragLeave}
                      onDrop={(e) => handleTabDrop(e, index)}
                      onDragEnd={handleTabDragEnd}
                    >
                      <span className={`tab-indicator ${session.type}`} />
                      <span className="tab-name">{session.name}</span>
                      <button
                        className="tab-close"
                        onClick={(e) => {
                          e.stopPropagation()
                          killSession(session.id)
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <div className="terminal-area">
                  {sessions.map(session => (
                    <Terminal
                      key={session.id}
                      sessionId={session.id}
                      isActive={activeSessionId === session.id}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <p>No active sessions. Launch Claude Code or a Terminal above.</p>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state">
            <h2>No Project Selected</h2>
            <p>Select a project from the sidebar or add a new one</p>
          </div>
        )}
      </main>
    </div>
  )
}
