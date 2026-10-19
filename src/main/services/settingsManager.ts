import { config } from 'dotenv'
import { app, safeStorage } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

// Load environment variables from .env file
config()

export interface AppSettings {
  aiProvider: 'ollama' | 'openai'
  ollamaBaseUrl: string
  ollamaModel: string
  openaiApiKey: string
  openaiModel: string
  whisperModel: string
  alwaysOnTop: boolean
  windowOpacity: number
  pauseThreshold: number
  autoStart: boolean
  resumeDescription: string
}

const DEFAULT_SETTINGS: AppSettings = {
  aiProvider: process.env.AI_PROVIDER === 'openai' ? 'openai' : 'ollama',
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  ollamaModel: process.env.OLLAMA_MODEL || 'qwen3-vl:4b',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  whisperModel:
    process.env.WHISPER_MODEL && !process.env.WHISPER_MODEL.toLowerCase().endsWith('.en')
      ? process.env.WHISPER_MODEL
      : 'onnx-community/whisper-tiny',
  alwaysOnTop: true,
  windowOpacity: 1.0,
  pauseThreshold: 1500,
  autoStart: false,
  resumeDescription: ''
}

export class SettingsManager {
  private settingsPath: string
  private settings: AppSettings

  constructor() {
    const userDataPath = app.getPath('userData')
    this.settingsPath = path.join(userDataPath, 'settings.json')
    this.settings = this.loadSettings()
  }

  private loadSettings(): AppSettings {
    try {
      if (fs.existsSync(this.settingsPath)) {
        const data = fs.readFileSync(this.settingsPath, 'utf-8')
        const savedSettings = JSON.parse(data)
        if (savedSettings.openaiApiKeyEncrypted) {
          if (safeStorage.isEncryptionAvailable()) {
            try {
              savedSettings.openaiApiKey = safeStorage.decryptString(
                Buffer.from(savedSettings.openaiApiKeyEncrypted, 'base64')
              )
            } catch {
              savedSettings.openaiApiKey = ''
            }
          } else {
            savedSettings.openaiApiKey = ''
          }
          delete savedSettings.openaiApiKeyEncrypted
        }
        if (
          typeof savedSettings.whisperModel !== 'string' ||
          savedSettings.whisperModel.toLowerCase().endsWith('.en')
        ) {
          savedSettings.whisperModel = DEFAULT_SETTINGS.whisperModel
        }

        return { ...DEFAULT_SETTINGS, ...savedSettings }
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
    return { ...DEFAULT_SETTINGS }
  }

  private saveSettings(): void {
    try {
      const settingsToSave = { ...this.settings }
      if (safeStorage.isEncryptionAvailable() && settingsToSave.openaiApiKey) {
        ;(settingsToSave as Record<string, unknown>).openaiApiKeyEncrypted = safeStorage
          .encryptString(settingsToSave.openaiApiKey)
          .toString('base64')
        settingsToSave.openaiApiKey = ''
      }

      fs.writeFileSync(this.settingsPath, JSON.stringify(settingsToSave, null, 2))
    } catch (error) {
      console.error('Failed to save settings:', error)
    }
  }

  getSettings(): AppSettings {
    return { ...this.settings }
  }

  getSetting<K extends keyof AppSettings>(key: K): AppSettings[K] {
    return this.settings[key]
  }

  updateSettings(updates: Partial<AppSettings>): void {
    this.settings = { ...this.settings, ...updates }
    this.saveSettings()
  }

  setSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    this.settings[key] = value
    this.saveSettings()
  }

  resetToDefaults(): void {
    this.settings = { ...DEFAULT_SETTINGS }
    this.saveSettings()
  }
}
