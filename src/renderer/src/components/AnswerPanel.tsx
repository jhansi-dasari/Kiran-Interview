import { Check, Copy, MessageSquareText } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useInterview } from '../hooks/useInterview'
import { MarkdownRenderer } from './MarkdownRenderer'

export function AnswerPanel(): React.JSX.Element {
  const { answers, currentAnswer, currentQuestion, isGenerating, isCapturing } = useInterview()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [answers, currentAnswer])

  const copyToClipboard = async (text: string, id: string): Promise<void> => {
    try {
      const result = await window.api.writeToClipboard(text)
      if (result.success) {
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 2000)
      } else {
        console.error('Failed to copy:', result.error)
        // Fallback to browser clipboard API
        try {
          await navigator.clipboard.writeText(text)
          setCopiedId(id)
          setTimeout(() => setCopiedId(null), 2000)
        } catch (fallbackErr) {
          console.error('Fallback clipboard copy failed:', fallbackErr)
        }
      }
    } catch (err) {
      console.error('Failed to copy:', err)
      // Fallback to browser clipboard API
      try {
        await navigator.clipboard.writeText(text)
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 2000)
      } catch (fallbackErr) {
        console.error('Fallback clipboard copy failed:', fallbackErr)
      }
    }
  }

  const hasContent = answers.length > 0 || currentAnswer

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-dark-950">
      <div className="flex shrink-0 items-center justify-between border-b border-dark-800 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-dark-100">Suggested answers</h2>
          <p className="mt-0.5 text-xs text-dark-500">Concise responses for the conversation</p>
        </div>
        {answers.length > 0 && (
          <span className="rounded-full border border-dark-700 bg-dark-900 px-2 py-1 text-xs text-dark-400">
            {answers.length} {answers.length === 1 ? 'answer' : 'answers'}
          </span>
        )}
      </div>
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4 custom-scrollbar">
        {!hasContent ? (
          <div className="flex h-full flex-col items-center justify-center px-5 py-8 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-dark-700 bg-dark-900">
              <MessageSquareText className="h-5 w-5 text-blue-300" />
            </div>
            <h3 className="text-base font-semibold text-dark-200">
              {isCapturing ? 'Listening for a question' : 'Ready when you are'}
            </h3>
            <p className="mt-1 max-w-xs text-sm leading-5 text-dark-500">
              {isCapturing
                ? 'A suggested answer will appear here after a question is detected.'
                : 'Start listening or capture a screenshot to get a question-specific answer.'}
            </p>
          </div>
        ) : (
          <>
            {answers.map((answer) => (
              <div
                key={answer.id}
                className="overflow-hidden rounded-md border border-dark-700 bg-dark-900 animate-fade-in"
              >
                <div className="border-b border-dark-700 bg-dark-850 px-4 py-3">
                  <p className="mb-1 text-[11px] font-semibold uppercase text-dark-500">Question</p>
                  <p className="text-sm leading-5 text-dark-200">{answer.question}</p>
                </div>
                <div className="p-4">
                  <MarkdownRenderer content={answer.answer} />
                  <div className="mt-3 flex justify-end border-t border-dark-800 pt-2">
                    <button
                      onClick={() => copyToClipboard(answer.answer, answer.id)}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-dark-400 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors"
                    >
                      {copiedId === answer.id ? (
                        <>
                          <Check className="w-3 h-3" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Current streaming answer */}
            {(currentAnswer || isGenerating) && (
              <div className="overflow-hidden rounded-md border border-blue-400/30 bg-dark-900 animate-fade-in">
                {currentQuestion && (
                  <div className="border-b border-dark-700 bg-dark-850 px-4 py-3">
                    <p className="mb-1 text-[11px] font-semibold uppercase text-blue-300">Question</p>
                    <p className="text-sm leading-5 text-dark-200">{currentQuestion}</p>
                  </div>
                )}
                <div className="p-4">
                  {currentAnswer ? (
                    <p className="text-sm text-dark-100 leading-relaxed whitespace-pre-wrap">
                      {currentAnswer}
                      <span className="ml-1 inline-block h-4 w-0.5 animate-pulse bg-blue-300" />
                    </p>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-blue-300">
                      <div className="flex gap-1">
                        <span
                          className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-300"
                          style={{ animationDelay: '0ms' }}
                        />
                        <span
                          className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-300"
                          style={{ animationDelay: '150ms' }}
                        />
                        <span
                          className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-300"
                          style={{ animationDelay: '300ms' }}
                        />
                      </div>
                      <span>Generating answer...</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
