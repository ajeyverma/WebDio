import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

export type AIProvider = 'gemini'

export interface AISettings {
  activeProvider: AIProvider
  geminiKey: string
  geminiModel: string
  themeColor?: string
  lastProjectPath?: string
  projectData?: Record<string, { plan?: string, task?: string }>
}

const defaultSettings: AISettings = {
  activeProvider: 'gemini',
  geminiKey: '',
  geminiModel: 'gemini-1.5-flash',
  themeColor: '#007acc',
  projectData: {}
}

// Lazy path calculation to ensure 'app' is ready
function getSettingsPath(): string {
  try {
    const userData = app.getPath('userData')
    return path.join(userData, 'settings.json')
  } catch (err) {
    // Fallback for cases where app might not be fully ready yet
    const home = process.env.HOME || process.env.USERPROFILE || '.'
    return path.join(home, '.instantsaas', 'settings.json')
  }
}

export function getSettings(): AISettings {
  const settingsPath = getSettingsPath()
  try {
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf-8')
      const parsed = JSON.parse(data)
      console.log('Main process: Loaded settings from', settingsPath)
      return { ...defaultSettings, ...parsed }
    }
  } catch (err) {
    console.error('Main process: Error reading settings:', err)
  }
  return defaultSettings
}

export function saveSettings(settings: AISettings): void {
  const settingsPath = getSettingsPath()
  try {
    if (!settings) return;
    
    // Basic cleanup
    if (settings.geminiKey) settings.geminiKey = settings.geminiKey.trim()

    fs.mkdirSync(path.dirname(settingsPath), { recursive: true })
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2))
    console.log('Main process: Saved settings to', settingsPath)
  } catch (err) {
    console.error('Main process: Error saving settings:', err)
  }
}
