import { useState } from 'react'
import { useStore } from '../store'

export default function Sidebar() {
  const { projects, activeProjectId, setActiveProject, addProject, removeProject, reorderProjects } = useStore()
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const handleAddProject = async () => {
    const path = await window.electronAPI.selectFolder()
    if (path) {
      addProject(path)
    }
  }

  const handleRemoveProject = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    removeProject(id)
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault()
    if (draggedIndex !== null && draggedIndex !== toIndex) {
      reorderProjects(draggedIndex, toIndex)
    }
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>Projects</h2>
        <button className="btn-icon" onClick={handleAddProject} title="Add Project">
          +
        </button>
      </div>

      <div className="project-list">
        {projects.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', padding: '12px' }}>
            No projects yet. Click + to add one.
          </p>
        ) : (
          projects.map((project, index) => (
            <div
              key={project.id}
              className={`project-item ${activeProjectId === project.id ? 'active' : ''} ${draggedIndex === index ? 'dragging' : ''} ${dragOverIndex === index ? 'drag-over' : ''}`}
              onClick={() => setActiveProject(project.id)}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3>{project.name}</h3>
                  <p>{project.path}</p>
                </div>
                <button
                  className="btn-icon danger"
                  onClick={(e) => handleRemoveProject(e, project.id)}
                  title="Remove Project"
                  style={{ marginLeft: '8px', flexShrink: 0 }}
                >
                  ×
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  )
}
