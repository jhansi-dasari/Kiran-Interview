import { EventEmitter } from 'events'
import { pipeline } from '@huggingface/transformers'

export interface TranscriptEvent {
  text: string
  translatedText?: string
  translationError?: string
  isFinal: boolean
  confidence: number
}

export interface WhisperConfig {
  apiKey?: string
  model?: string
  language?: string
}

type LocalTranscriber = (
  audio: Float32Array,
  options: { language?: string; task?: string; chunk_length_s?: number; stride_length_s?: number }
) => Promise<{ text: string } | Array<{ text: string }>>

const transcribers = new Map<string, Promise<LocalTranscriber>>()

const getTranscriber = (modelId: string): Promise<LocalTranscriber> => {
  let transcriberPromise = transcribers.get(modelId)
  if (!transcriberPromise) {
    const loading = pipeline('automatic-speech-recognition', modelId, { dtype: 'q8' }).then(
      (transcriber) => transcriber as unknown as LocalTranscriber
    )
    transcribers.set(modelId, loading)
    transcriberPromise = loading
  }

  return transcriberPromise.catch((error) => {
    transcribers.delete(modelId)
    throw error
  })
}

export class WhisperService extends EventEmitter {
  private config: WhisperConfig
  private transcriber: LocalTranscriber | null = null
  private audioBuffer: Buffer[] = []
  private isProcessing = false
  private isRunning = false
  private processInterval: NodeJS.Timeout | null = null
  private lastAudioTime = 0
  private readonly SAMPLE_RATE = 16000
  private readonly BYTES_PER_SAMPLE = 2 // 16-bit audio
  private readonly MIN_AUDIO_DURATION_MS = 1000 // Minimum 1.5 seconds of audio
  private readonly SILENCE_THRESHOLD_MS = 1000 // 1.5 seconds of silence before processing
  private readonly MAX_BUFFER_DURATION_MS = 20000 // Max 30 seconds before forced processing

  constructor(config: WhisperConfig) {
    super()
    this.config = config
  }

  async start(): Promise<void> {
    if (this.isRunning) return

    const modelId = this.config.model || 'onnx-community/whisper-tiny'
    console.log(`Loading local speech model: ${modelId}`)
    this.transcriber = await getTranscriber(modelId)

    this.isRunning = true
    this.audioBuffer = []
    this.lastAudioTime = Date.now()

    // Check for silence every 500ms
    this.processInterval = setInterval(() => {
      this.checkAndProcess()
    }, 300)

    console.log('WhisperService started')
    this.emit('started')
  }

  stop(): void {
    this.isRunning = false

    if (this.processInterval) {
      clearInterval(this.processInterval)
      this.processInterval = null
    }

    // Process any remaining audio
    if (this.audioBuffer.length > 0) {
      this.processAudioBuffer()
    }

    this.audioBuffer = []
    console.log('WhisperService stopped')
    this.emit('stopped')
  }

  addAudioData(audioData: Buffer | ArrayBuffer): void {
    if (!this.isRunning) return

    const buffer = audioData instanceof ArrayBuffer ? Buffer.from(audioData) : audioData

    // Check if this chunk has actual audio (not silence)
    if (this.hasAudio(buffer)) {
      this.audioBuffer.push(buffer)
      this.lastAudioTime = Date.now()
    }
  }

  // Check if audio buffer contains actual sound (not silence)
  private hasAudio(buffer: Buffer): boolean {
    // Calculate RMS (root mean square) to detect if there's actual audio
    let sum = 0
    const samples = buffer.length / this.BYTES_PER_SAMPLE

    for (let i = 0; i < buffer.length; i += 2) {
      const sample = buffer.readInt16LE(i)
      sum += sample * sample
    }

    const rms = Math.sqrt(sum / samples)
    // Threshold for considering it as actual audio vs silence
    return rms > 500
  }

  private getBufferDurationMs(): number {
    const totalBytes = this.audioBuffer.reduce((sum, buf) => sum + buf.length, 0)
    const samples = totalBytes / this.BYTES_PER_SAMPLE
    return (samples / this.SAMPLE_RATE) * 1000
  }

  private checkAndProcess(): void {
    if (this.isProcessing || !this.isRunning) return

    const bufferDuration = this.getBufferDurationMs()
    const timeSinceLastAudio = Date.now() - this.lastAudioTime

    // Process if:
    // 1. We have enough audio AND enough silence has passed
    // 2. OR buffer is getting too large (force process)
    const hasEnoughAudio = bufferDuration >= this.MIN_AUDIO_DURATION_MS
    const hasSilence = timeSinceLastAudio >= this.SILENCE_THRESHOLD_MS
    const bufferTooLarge = bufferDuration >= this.MAX_BUFFER_DURATION_MS

    if ((hasEnoughAudio && hasSilence) || bufferTooLarge) {
      console.log(
        `===> Processing: ${(bufferDuration / 1000).toFixed(2)}s audio, ${(timeSinceLastAudio / 1000).toFixed(2)}s since last audio`
      )
      this.processAudioBuffer()
    }
  }

  private async processAudioBuffer(): Promise<void> {
    if (this.audioBuffer.length === 0 || this.isProcessing) return

    this.isProcessing = true

    // Combine all buffers
    const combinedBuffer = Buffer.concat(this.audioBuffer)
    this.audioBuffer = []

    // Skip if audio is too short
    const durationMs = (combinedBuffer.length / this.BYTES_PER_SAMPLE / this.SAMPLE_RATE) * 1000
    if (durationMs < this.MIN_AUDIO_DURATION_MS) {
      console.log(`===> Skipping: audio too short (${(durationMs / 1000).toFixed(2)}s)`)
      this.isProcessing = false
      return
    }

    try {
      console.log(`===> Transcribing ${(durationMs / 1000).toFixed(2)}s locally...`)
      const audio = new Float32Array(combinedBuffer.length / this.BYTES_PER_SAMPLE)
      for (let index = 0; index < audio.length; index += 1) {
        audio[index] = combinedBuffer.readInt16LE(index * this.BYTES_PER_SAMPLE) / 32768
      }

      const modelId = this.config.model || 'onnx-community/whisper-tiny'
      const isEnglishOnlyModel = modelId.toLowerCase().endsWith('.en')
      const chunkOptions = {
        chunk_length_s: 20,
        stride_length_s: 3
      }
      const result = await this.transcriber!(audio, {
        ...chunkOptions,
        ...(!isEnglishOnlyModel && { task: 'transcribe' })
      })
      const text = (Array.isArray(result) ? result[0]?.text : result.text)?.trim()

      if (text && text.length > 0) {
        // Filter out common noise transcriptions
        if (this.isNoise(text)) {
          console.log(`Filtered noise: "${text}"`)
        } else {
          console.log(`Transcription: "${text}"`)

          let translatedText = text
          let translationError: string | undefined

          if (!isEnglishOnlyModel) {
            try {
              const translation = await this.transcriber!(audio, {
                ...chunkOptions,
                task: 'translate'
              })
              translatedText = (Array.isArray(translation)
                ? translation[0]?.text
                : translation.text
              )?.trim() || ''
              if (!translatedText) {
                translationError = 'No English translation was returned.'
              }
            } catch (error) {
              translationError = error instanceof Error ? error.message : 'Translation failed.'
              console.error('Whisper translation error:', error)
            }
          }

          const event: TranscriptEvent = {
            text,
            translatedText,
            translationError,
            isFinal: true,
            confidence: 1.0
          }

          this.emit('transcript', event)
          this.emit('utteranceEnd')
        }
      }
    } catch (error) {
      console.error('Whisper transcription error:', error)
      this.emit('error', error instanceof Error ? error : new Error('Transcription failed'))
    } finally {
      this.isProcessing = false
    }
  }

  // Filter out common noise/hallucination from Whisper
  private isNoise(text: string): boolean {
    const noisePatterns = [
      /^you+\.?$/i,
      /^\.+$/,
      /^[,.\s]+$/,
      /^(um+|uh+|ah+|oh+|hmm+)\.?$/i,
      /^(bye|hi|hello|hey)\.?$/i,
      /^thank(s| you)\.?$/i,
      /^okay\.?$/i,
      /^(yes|no|yeah|yep|nope)\.?$/i,
      /^good\.?$/i,
      /^right\.?$/i,
      /^(subs|subtitles) by/i,
      /^www\./i,
      /^\[.*\]$/, // [Music], [Applause], etc.
      /^♪.*♪$/
    ]

    for (const pattern of noisePatterns) {
      if (pattern.test(text.trim())) {
        return true
      }
    }

    // Filter out very short text (less than 3 words)
    const wordCount = text.split(/\s+/).length
    if (wordCount < 3) {
      return true
    }

    return false
  }

  getIsRunning(): boolean {
    return this.isRunning
  }
}
