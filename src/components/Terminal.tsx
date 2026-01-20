import { useEffect, useRef } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { Unicode11Addon } from '@xterm/addon-unicode11'
import { WebglAddon } from '@xterm/addon-webgl'
import '@xterm/xterm/css/xterm.css'

interface TerminalProps {
  sessionId: string
  isActive: boolean
}

export default function Terminal({ sessionId, isActive }: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<XTerm | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const isActiveRef = useRef(isActive)
  isActiveRef.current = isActive

  useEffect(() => {
    if (!containerRef.current) return

    // Create terminal instance - Gruvbox dark theme
    const terminal = new XTerm({
      cursorBlink: true,
      cursorStyle: 'bar',
      cursorInactiveStyle: 'none',
      fontSize: 14,
      fontFamily: '"JetBrains Mono", "Cascadia Code", "Fira Code", "DejaVu Sans Mono", Consolas, monospace',
      fontWeight: '400',
      fontWeightBold: '700',
      allowProposedApi: true,
      theme: {
        background: '#282828',
        foreground: '#ebdbb2',
        cursor: '#ebdbb2',
        cursorAccent: '#282828',
        selectionBackground: '#504945',
        selectionForeground: '#ebdbb2',
        black: '#282828',
        red: '#cc241d',
        green: '#98971a',
        yellow: '#d79921',
        blue: '#458588',
        magenta: '#b16286',
        cyan: '#689d6a',
        white: '#a89984',
        brightBlack: '#928374',
        brightRed: '#fb4934',
        brightGreen: '#b8bb26',
        brightYellow: '#fabd2f',
        brightBlue: '#83a598',
        brightMagenta: '#d3869b',
        brightCyan: '#8ec07c',
        brightWhite: '#ebdbb2'
      }
    })

    const fitAddon = new FitAddon()
    const unicode11Addon = new Unicode11Addon()

    terminal.loadAddon(fitAddon)
    terminal.loadAddon(unicode11Addon)

    terminal.open(containerRef.current)

    // Activate Unicode 11 for proper block character rendering
    terminal.unicode.activeVersion = '11'

    // Try to load WebGL addon for better rendering (fallback to canvas if not supported)
    try {
      const webglAddon = new WebglAddon()
      webglAddon.onContextLoss(() => {
        webglAddon.dispose()
      })
      terminal.loadAddon(webglAddon)
    } catch {
      // WebGL not supported, continue with canvas renderer
      console.log('WebGL not supported, using canvas renderer')
    }

    fitAddon.fit()

    terminalRef.current = terminal
    fitAddonRef.current = fitAddon

    // Handle Ctrl+V paste and Ctrl+C copy
    terminal.attachCustomKeyEventHandler((event) => {
      if (event.ctrlKey && event.key === 'v' && event.type === 'keydown') {
        event.preventDefault()
        navigator.clipboard.readText().then((text) => {
          if (text) {
            window.electronAPI.terminalInput(sessionId, text)
          }
        })
        return false
      }
      if (event.ctrlKey && event.key === 'c' && event.type === 'keydown') {
        const selection = terminal.getSelection()
        if (selection) {
          event.preventDefault()
          navigator.clipboard.writeText(selection)
          return false
        }
      }
      return true
    })

    // Handle terminal input
    terminal.onData((data) => {
      window.electronAPI.terminalInput(sessionId, data)
    })

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      if (fitAddonRef.current && isActiveRef.current) {
        fitAddonRef.current.fit()
        const dims = fitAddonRef.current.proposeDimensions()
        if (dims) {
          window.electronAPI.terminalResize(sessionId, dims.cols, dims.rows)
        }
      }
    })
    resizeObserver.observe(containerRef.current)

    // Initial resize notification
    const dims = fitAddon.proposeDimensions()
    if (dims) {
      window.electronAPI.terminalResize(sessionId, dims.cols, dims.rows)
    }

    // Listen for terminal data from main process
    const cleanup = window.electronAPI.onTerminalData((sid, data) => {
      if (sid === sessionId && terminalRef.current) {
        terminalRef.current.write(data)
      }
    })

    return () => {
      cleanup()
      resizeObserver.disconnect()
      terminal.dispose()
    }
  }, [sessionId])

  // Refit when becoming active and send correct dimensions
  useEffect(() => {
    if (isActive && fitAddonRef.current) {
      setTimeout(() => {
        fitAddonRef.current?.fit()
        const dims = fitAddonRef.current?.proposeDimensions()
        if (dims) {
          window.electronAPI.terminalResize(sessionId, dims.cols, dims.rows)
        }
        terminalRef.current?.focus()
      }, 50)
    }
  }, [isActive, sessionId])

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        visibility: isActive ? 'visible' : 'hidden',
        position: isActive ? 'relative' : 'absolute'
      }}
    />
  )
}
