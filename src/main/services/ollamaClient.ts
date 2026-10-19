import OpenAI from 'openai'

export type AIProvider = 'ollama' | 'openai'

export interface AIClientConfig {
  provider: AIProvider
  baseUrl?: string
  apiKey?: string
}

export interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface OllamaChatChunk {
  message?: { content?: string }
  error?: string
}

export const normalizeOllamaBaseUrl = (baseUrl?: string): string => {
  const trimmedUrl = (baseUrl || 'http://localhost:11434').trim().replace(/\/+$/, '')
  return (trimmedUrl || 'http://localhost:11434').replace(/\/v1$/i, '')
}

export const createOllamaClient = (baseUrl?: string): OpenAI =>
  new OpenAI({
    apiKey: 'ollama',
    baseURL: `${normalizeOllamaBaseUrl(baseUrl)}/v1`
  })

export const createAIClient = (config: AIClientConfig): OpenAI => {
  if (config.provider === 'openai') {
    if (!config.apiKey?.trim()) throw new Error('OpenAI API key is required.')
    return new OpenAI({ apiKey: config.apiKey.trim() })
  }

  return createOllamaClient(config.baseUrl)
}

export const streamOllamaChat = async (options: {
  baseUrl?: string
  model: string
  messages: OllamaChatMessage[]
  maxTokens: number
  temperature: number
  onToken: (token: string) => void
}): Promise<string> => {
  const response = await fetch(`${normalizeOllamaBaseUrl(options.baseUrl)}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: options.model,
      messages: options.messages,
      stream: true,
      think: false,
      options: {
        num_predict: options.maxTokens,
        temperature: options.temperature
      }
    })
  })

  if (!response.ok) {
    const details = await response.text()
    throw new Error(`Ollama request failed (${response.status}): ${details || response.statusText}`)
  }
  if (!response.body) {
    throw new Error('Ollama returned an empty response stream.')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let fullResponse = ''

  const processLine = (line: string): void => {
    if (!line.trim()) return

    const chunk = JSON.parse(line) as OllamaChatChunk
    if (chunk.error) throw new Error(chunk.error)

    const content = chunk.message?.content || ''
    if (content) {
      fullResponse += content
      options.onToken(content)
    }
  }

  try {
    while (true) {
      const { value, done } = await reader.read()
      buffer += decoder.decode(value, { stream: !done })

      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      lines.forEach(processLine)

      if (done) break
    }
    processLine(buffer)
  } finally {
    reader.releaseLock()
  }

  return fullResponse
}