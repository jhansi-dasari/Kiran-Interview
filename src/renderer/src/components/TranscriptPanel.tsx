import { MessageSquare } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useInterview } from '../hooks/useInterview'

export function TranscriptPanel(): React.JSX.Element {
  const { transcripts, currentTranscript, isCapturing, isSpeaking } = useInterview()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [transcripts, currentTranscript])

  const hasContent = transcripts.length > 0 || currentTranscript

  return (
    <section className="flex min-h-36 max-h-64 shrink-0 flex-[0_0_32%] flex-col border-t border-dark-700 bg-dark-900">
      <div className="flex items-center justify-between border-b border-dark-800 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-dark-400" />
          <h2 className="text-sm font-semibold text-dark-200">
            Live Transcript
          </h2>
          {transcripts.length > 0 && (
            <span className="rounded-full bg-dark-800 px-2 py-0.5 text-xs text-dark-400">
              {transcripts.length}
            </span>
          )}
        </div>
        <span className={`text-xs ${isSpeaking ? 'text-emerald-300' : 'text-dark-500'}`}>
          {isSpeaking ? 'Speech detected' : isCapturing ? 'Listening' : 'Paused'}
        </span>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 space-y-2 overflow-y-auto px-4 py-3 scroll-smooth custom-scrollbar"
      >
        {!isCapturing && !hasContent ? (
          <p className="text-sm text-dark-500">Start listening to see the live transcript.</p>
        ) : hasContent ? (
          <>
            {/* Finalized transcripts with numbering */}
            {transcripts.map((transcript, index) => (
              <div
                key={transcript.id}
                className="flex gap-3 border-l-2 border-dark-600 py-1 pl-3 text-sm"
              >
                <span className="text-dark-500 font-mono text-xs min-w-[20px]">{index + 1}.</span>
                <div className="min-w-0 flex-1 space-y-1">
                  {transcript.translatedText ? (
                    <p className="text-dark-200 leading-relaxed">{transcript.translatedText}</p>
                  ) : transcript.translationError ? (
                    <p className="text-xs text-amber-300">
                      English translation unavailable: {transcript.translationError}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}

            {/* Current transcript being typed (not yet finalized) */}
            {currentTranscript && (
              <div className="flex gap-3 rounded-r border-l-2 border-blue-400 bg-blue-500/5 py-1.5 pl-3 text-sm">
                <span className="text-blue-400 font-mono text-xs min-w-[20px]">
                  {transcripts.length + 1}.
                </span>
                <p className="text-dark-300 leading-relaxed flex-1">
                  Preparing English transcript
                  <span className="inline-block w-0.5 h-4 bg-blue-400 ml-1 animate-pulse align-middle" />
                </p>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-dark-500 italic">Waiting for speech...</p>
        )}
      </div>
    </section>
  )
}
