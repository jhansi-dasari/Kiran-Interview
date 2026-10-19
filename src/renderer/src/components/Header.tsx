import { History, MessageSquare, Mic, Minus, Pin, PinOff, Settings, X } from 'lucide-react'
import { useInterviewStore } from '../store/interviewStore'

export function Header(): React.JSX.Element {
  const { settings, updateSettings, setShowSettings, showHistory, setShowHistory } =
    useInterviewStore()

  const isAlwaysOnTop = settings.alwaysOnTop

  const handleMinimize = (): void => {
    window.api.minimizeWindow()
  }

  const handleClose = (): void => {
    window.api.closeWindow()
  }

  const toggleAlwaysOnTop = async (): Promise<void> => {
    const newValue = !isAlwaysOnTop
    await window.api.setAlwaysOnTop(newValue)
    updateSettings({ alwaysOnTop: newValue })
  }

  return (
    <header className="flex h-11 shrink-0 items-center justify-between px-4 bg-dark-900 border-b border-dark-700 select-none app-drag">
      <div className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
          <Mic className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="text-sm font-semibold text-dark-100">Interview Copilot</span>
      </div>

      <div className="flex items-center gap-1 app-no-drag">
        <button
          onClick={() => setShowHistory(!showHistory)}
          aria-label={showHistory ? 'Back to interview session' : 'Show history'}
          title={showHistory ? 'Back to interview session' : 'Show history'}
          className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-dark-700 ${
            showHistory ? 'bg-blue-500/10 text-blue-300' : 'text-dark-400 hover:text-dark-100'
          }`}
        >
          {showHistory ? <MessageSquare size={16} /> : <History size={16} />}
        </button>

        <button
          onClick={toggleAlwaysOnTop}
          aria-label={isAlwaysOnTop ? 'Unpin window' : 'Pin window on top'}
          title={isAlwaysOnTop ? 'Unpin window' : 'Pin window on top'}
          className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-dark-700 ${
            isAlwaysOnTop ? 'text-blue-300' : 'text-dark-400 hover:text-dark-100'
          }`}
        >
          {isAlwaysOnTop ? <Pin size={16} /> : <PinOff size={16} />}
        </button>

        <button
          onClick={() => setShowSettings(true)}
          aria-label="Settings"
          title="Settings"
          className="flex h-8 w-8 items-center justify-center rounded-md text-dark-400 transition-colors hover:bg-dark-700 hover:text-dark-100"
        >
          <Settings size={16} />
        </button>

        <button
          onClick={handleMinimize}
          aria-label="Minimize"
          title="Minimize"
          className="flex h-8 w-8 items-center justify-center rounded-md text-dark-400 transition-colors hover:bg-dark-700 hover:text-dark-100"
        >
          <Minus size={16} />
        </button>

        <button
          onClick={handleClose}
          aria-label="Close"
          title="Close"
          className="flex h-8 w-8 items-center justify-center rounded-md text-dark-400 transition-colors hover:bg-red-500/15 hover:text-red-300"
        >
          <X size={16} />
        </button>
      </div>
    </header>
  )
}
