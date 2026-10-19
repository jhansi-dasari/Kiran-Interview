import { AlertCircle, CheckCircle, Loader2, Mic, Save, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { AppSettings, useInterviewStore } from '../store/interviewStore'

interface ModelOption {
  id: string
  name: string
}

const DEFAULT_OLLAMA_MODELS: ModelOption[] = [
  { id: 'qwen3-vl:4b', name: 'Qwen3 VL 4B (vision capable)' }
]
const DEFAULT_OPENAI_MODELS: ModelOption[] = [
  { id: 'gpt-4o-mini', name: 'GPT-4o mini' },
  { id: 'gpt-4o', name: 'GPT-4o' }
]

const normalizeSettings = (settings: AppSettings): AppSettings => ({
  ...settings,
  aiProvider: settings.aiProvider || 'ollama',
  ollamaBaseUrl: settings.ollamaBaseUrl || 'http://localhost:11434',
  ollamaModel: settings.ollamaModel || 'qwen3-vl:4b',
  openaiApiKey: settings.openaiApiKey || '',
  openaiModel: settings.openaiModel || 'gpt-4o-mini',
  whisperModel:
    !settings.whisperModel || settings.whisperModel.toLowerCase().endsWith('.en')
      ? 'onnx-community/whisper-tiny'
      : settings.whisperModel,
  resumeDescription: settings.resumeDescription || ''
})

export function SettingsModal(): React.ReactNode | null {
  const { settings, showSettings, setShowSettings, setSettings } = useInterviewStore()
  const [localSettings, setLocalSettings] = useState<AppSettings>(() => normalizeSettings(settings))
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [models, setModels] = useState<ModelOption[]>([])
  const [modelsLoading, setModelsLoading] = useState(false)
  const [modelsError, setModelsError] = useState<string | null>(null)
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const [prevSettings, setPrevSettings] = useState(settings)
  if (settings !== prevSettings) {
    setPrevSettings(settings)
    setLocalSettings(normalizeSettings(settings))
  }

  // Fetch models from the selected provider.
  useEffect(() => {
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current)
    }

    const provider = localSettings.aiProvider
    const baseUrl = localSettings.ollamaBaseUrl.trim()
    const apiKey = localSettings.openaiApiKey.trim()

    fetchTimeoutRef.current = setTimeout(async () => {
      if (provider === 'openai' && !apiKey) {
        setModels([])
        setModelsError('Enter an OpenAI API key to load available models.')
        setModelsLoading(false)
        return
      }
      if (provider === 'ollama' && !baseUrl) {
        setModels([])
        setModelsError('Enter your Ollama server URL.')
        setModelsLoading(false)
        return
      }

      setModelsLoading(true)
      setModelsError(null)

      try {
        const result = await window.api.fetchAiModels(provider, baseUrl, apiKey)
        if (result.success) {
          setModels(result.models)
          setModelsError(
            result.models.length === 0
              ? provider === 'ollama'
                ? 'No models installed. Pull a model with Ollama to continue.'
                : 'No models are available for this OpenAI API key.'
              : null
          )
        } else {
          setModelsError(
            result.error ||
              (provider === 'ollama'
                ? 'Cannot reach Ollama. Start it and check the server URL.'
                : 'Cannot load OpenAI models. Check the API key and network connection.')
          )
          setModels([])
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unable to load models.'
        setModelsError(errorMessage)
        setModels([])
      } finally {
        setModelsLoading(false)
      }
    }, 800)

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current)
      }
    }
  }, [localSettings.aiProvider, localSettings.ollamaBaseUrl, localSettings.openaiApiKey])

  if (!showSettings) return null

  const selectedModel =
    localSettings.aiProvider === 'openai' ? localSettings.openaiModel : localSettings.ollamaModel
  const providerDefaults =
    localSettings.aiProvider === 'openai' ? DEFAULT_OPENAI_MODELS : DEFAULT_OLLAMA_MODELS
  const availableModels = models.length > 0 ? models : providerDefaults
  const displayModels = availableModels.some((model) => model.id === selectedModel)
    ? availableModels
    : [
        ...availableModels,
        { id: selectedModel, name: `${selectedModel} (not listed)` }
      ]

  const handleSave = async (): Promise<void> => {
    try {
      setSaveStatus('saving')
      const updatedLocalSettings = {
        ...localSettings,
        ollamaModel: localSettings.ollamaModel || 'qwen3-vl:4b',
        openaiModel: localSettings.openaiModel || 'gpt-4o-mini'
      }
      const updatedSettings = await window.api.updateSettings(updatedLocalSettings)
      setSettings(updatedSettings as AppSettings)
      setSaveStatus('saved')
      setTimeout(() => {
        setSaveStatus('idle')
        setShowSettings(false)
      }, 1000)
    } catch (err) {
      console.error('Failed to save settings:', err)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }

  const handleOpacityChange = async (value: number): Promise<void> => {
    setLocalSettings({ ...localSettings, windowOpacity: value })
    await window.api.setWindowOpacity(value)
  }

  const handleClose = (): void => {
    setLocalSettings(settings)
    setShowSettings(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-lg border border-dark-700 bg-dark-900 shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-dark-700 px-5 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Mic className="h-5 w-5 text-primary-foreground" />
            </div>
            <h2 className="text-lg font-semibold text-dark-100">Settings</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded hover:bg-dark-700 transition-colors text-dark-400 hover:text-dark-200"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 custom-scrollbar">
          {/* AI provider */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-dark-200">AI Provider</label>
            <div className="flex w-fit gap-1 rounded-md border border-dark-600 bg-dark-800 p-1">
              {(['ollama', 'openai'] as const).map((provider) => (
                <button
                  key={provider}
                  type="button"
                  aria-pressed={localSettings.aiProvider === provider}
                  onClick={() => setLocalSettings({ ...localSettings, aiProvider: provider })}
                  className={`rounded px-3 py-1.5 text-sm capitalize transition-colors ${
                    localSettings.aiProvider === provider
                      ? 'bg-blue-500/15 text-blue-200'
                      : 'text-dark-400 hover:text-dark-100'
                  }`}
                >
                  {provider === 'openai' ? 'ChatGPT' : 'Ollama'}
                </button>
              ))}
            </div>
          </div>

          {localSettings.aiProvider === 'ollama' ? (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-dark-200">Ollama Server URL</label>
              <p className="text-xs text-dark-500">Keep the default for a local Ollama installation.</p>
              <input
                type="url"
                value={localSettings.ollamaBaseUrl}
                onChange={(e) =>
                  setLocalSettings({ ...localSettings, ollamaBaseUrl: e.target.value })
                }
                placeholder="http://localhost:11434"
                className="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-sm text-dark-100 placeholder-dark-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-dark-200">OpenAI API Key</label>
              <input
                type="password"
                autoComplete="off"
                value={localSettings.openaiApiKey}
                onChange={(e) =>
                  setLocalSettings({ ...localSettings, openaiApiKey: e.target.value })
                }
                placeholder="sk-..."
                className="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-sm text-dark-100 placeholder-dark-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
              <p className="text-xs text-dark-500">Stored encrypted when OS key storage is available.</p>
            </div>
          )}

          {/* Provider model */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-dark-200">Chat and Vision Model</label>
            {modelsLoading ? (
              <div className="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg animate-pulse">
                <div className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin text-blue-400" />
                  <span className="text-sm text-dark-400">Loading models...</span>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <select
                  value={selectedModel}
                  onChange={(e) => {
                    setLocalSettings(
                      localSettings.aiProvider === 'openai'
                        ? { ...localSettings, openaiModel: e.target.value }
                        : { ...localSettings, ollamaModel: e.target.value }
                    )
                  }}
                  className={`w-full px-3 py-2 bg-dark-800 border ${
                    modelsError
                      ? 'border-red-500/50 focus:border-red-500'
                      : 'border-dark-600 focus:border-blue-500'
                  } rounded-lg text-sm text-dark-100 focus:outline-none transition-colors`}
                >
                  {displayModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
                {modelsError ? (
                  <div className="flex min-w-0 items-start gap-1.5 text-xs leading-4 text-red-300">
                    <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                    <span className="min-w-0 break-words">{modelsError}</span>
                  </div>
                ) : (
                  <p className="text-xs text-dark-500">
                    {localSettings.aiProvider === 'ollama'
                      ? 'Choose a vision-capable model such as qwen3-vl:4b for screenshot analysis.'
                      : 'Choose a model available to your OpenAI API key.'}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Local speech model */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-dark-200">Local Speech Model</label>
            <input
              value={localSettings.whisperModel}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, whisperModel: e.target.value })
              }
              placeholder="onnx-community/whisper-tiny"
              className="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-sm text-dark-100 placeholder-dark-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
            <p className="text-xs text-dark-500">
              Multilingual model. Transcription and English translation run locally.
            </p>
          </div>

          {/* Resume Description */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-dark-200">Resume Description</label>
            <p className="text-xs text-dark-500">
              Add background details to personalize responses.
            </p>
            <textarea
              value={localSettings.resumeDescription}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, resumeDescription: e.target.value })
              }
              placeholder="Experience, projects, skills, and achievements..."
              rows={5}
              className="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-sm text-dark-100 placeholder-dark-500 focus:outline-none focus:border-blue-500 transition-colors resize-y"
            />
          </div>

          {/* Pause Threshold */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-dark-200">
              Silence Detection
              <span className="ml-2 text-xs text-dark-400">{localSettings.pauseThreshold}ms</span>
            </label>
            <input
              type="range"
              min="500"
              max="3000"
              step="100"
              value={localSettings.pauseThreshold}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, pauseThreshold: Number(e.target.value) })
              }
              className="w-full accent-blue-500"
            />
            <p className="text-xs text-dark-500">
              Wait time before treating a pause as the end of a question.
            </p>
          </div>

          {/* Window Opacity */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-dark-200">
              Window Opacity
              <span className="ml-2 text-xs text-dark-400">
                {Math.round(localSettings.windowOpacity * 100)}%
              </span>
            </label>
            <input
              type="range"
              min="0.3"
              max="1"
              step="0.05"
              value={localSettings.windowOpacity}
              onChange={(e) => handleOpacityChange(Number(e.target.value))}
              className="w-full accent-blue-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between border-t border-dark-700 px-5 py-3">
          <div className="flex items-center gap-3">
            {saveStatus === 'error' && (
              <div className="flex items-center gap-2 text-sm text-red-400">
                <AlertCircle size={16} />
                <span>Failed to save</span>
              </div>
            )}
            {saveStatus === 'saved' && (
              <div className="flex items-center gap-2 text-sm text-green-400">
                <CheckCircle size={16} />
                <span>Saved!</span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-dark-300 hover:text-dark-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              <Save size={16} />
              <span>{saveStatus === 'saving' ? 'Saving...' : 'Save'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
