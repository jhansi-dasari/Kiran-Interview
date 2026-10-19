import { AlertCircle, Camera, Loader2, Play, Square, Trash2 } from 'lucide-react'
import { useInterview } from '../hooks/useInterview'

export function StatusBar(): React.JSX.Element {
  const {
    isCapturing,
    isSpeaking,
    isGenerating,
    isProcessingScreenshot,
    error,
    startInterview,
    stopInterview,
    captureAndAnalyzeScreenshot,
    answers,
    currentAnswer,
    clearHistory
  } = useInterview()

  const getStatusText = (): string => {
    if (error) return 'Error'
    if (isProcessingScreenshot) return 'Analyzing screenshot...'
    if (isGenerating) return 'Generating answer...'
    if (isSpeaking) return 'Listening...'
    if (isCapturing) return 'Listening to interviewer (System Audio)'
    return ''
  }

  const getStatusColor = (): string => {
    if (error) return 'text-red-400'
    if (isProcessingScreenshot) return 'text-orange-400'
    if (isGenerating) return 'text-cyan-300'
    if (isSpeaking) return 'text-emerald-300'
    if (isCapturing) return 'text-blue-400'
    return 'text-dark-400'
  }

  const handleStart = (): void => {
    startInterview()
  }

  const hasContent = answers.length > 0 || currentAnswer

  return (
    <div className="shrink-0 border-b border-dark-700 bg-dark-850 px-4 py-3">
      {/* Main Controls Row */}
      <div className="flex min-h-9 items-center justify-between gap-3">
        {/* Status Indicator - Left */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${error ? 'bg-red-400' : isSpeaking ? 'bg-emerald-400 animate-pulse' : isCapturing ? 'bg-blue-400' : 'bg-dark-500'}`}
          />
          <div className="flex min-w-0 flex-col">
            <span className={`truncate text-sm font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </span>
            <span className="truncate text-xs text-dark-500">
              {error
                ? error
                : isCapturing
                  ? 'Waiting for the next question'
                  : 'Ready to start'}
            </span>
          </div>
        </div>

        {/* Action Buttons - Right */}
        <div className="flex shrink-0 items-center gap-2">
          {/* Secondary Action: Screenshot */}
          <button
            onClick={captureAndAnalyzeScreenshot}
            disabled={isProcessingScreenshot || isGenerating}
            className={`
              h-9 px-3 rounded-md text-sm font-medium transition-colors
              flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed
              ${
                isProcessingScreenshot
                  ? 'bg-orange-500/10 text-orange-300 border border-orange-400/30'
                  : 'bg-dark-800 text-dark-200 hover:bg-dark-700 hover:text-white border border-dark-600'
              }
            `}
            title="Capture screenshot and analyze for interview questions"
          >
            {isProcessingScreenshot ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Analyzing</span>
              </>
            ) : (
              <>
                <Camera className="w-3.5 h-3.5" />
                <span>Screenshot</span>
              </>
            )}
          </button>

          {/* Primary Action: Start/Stop */}
          <button
            onClick={isCapturing ? stopInterview : handleStart}
            disabled={isGenerating || isProcessingScreenshot}
            className={`
              h-9 px-3 rounded-md text-sm font-semibold transition-colors
              flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed
              ${
                isCapturing
                  ? 'bg-red-500/10 text-red-300 hover:bg-red-500/20 border border-red-400/30'
                  : 'bg-blue-600 hover:bg-blue-500 text-white border border-blue-400/40'
              }
            `}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Processing</span>
              </>
            ) : isCapturing ? (
              <>
                <Square className="w-3.5 h-3.5" />
                <span>Stop</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Start</span>
              </>
            )}
          </button>

          {hasContent && (
            <button
              onClick={clearHistory}
              aria-label="Clear answers"
              title="Clear all answers"
              className="flex h-9 w-9 items-center justify-center rounded-md text-dark-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-3 flex items-center gap-2 rounded-md border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
