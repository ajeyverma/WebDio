import axios from 'axios'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { getSettings } from './settingsService'

export async function fetchGeminiModels(key: string): Promise<string[]> {
  try {
    const response = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`)
    // Filter for generative models only and remove the 'models/' prefix
    return response.data.models
      .filter((m: any) => m.supportedGenerationMethods.includes('generateContent'))
      .map((m: any) => m.name.replace('models/', ''))
  } catch (err) {
    console.error('Error fetching Gemini models:', err)
    return []
  }
}

export async function detectOllama(): Promise<{ running: boolean; models: string[] }> {
  const settings = getSettings()
  try {
    const endpoint = settings.ollamaEndpoint?.replace(/\/+$/, '') || 'http://localhost:11434'
    const response = await axios.get(`${endpoint}/api/tags`)
    const models = response.data.models.map((m: any) => m.name)
    return { running: true, models }
  } catch (err) {
    return { running: false, models: [] }
  }
}

export async function generateCode(imageB64: string, prompt: string): Promise<string> {
  const settings = getSettings()
  const { activeProvider } = settings
  console.log('Main process: Starting generation with provider:', activeProvider)

  if (activeProvider === 'gemini') {
    if (!settings.geminiKey || settings.geminiKey.trim() === '') {
      throw new Error('Gemini API Key is missing. Please open AI Settings and add your key.')
    }
    console.log('Main process: Using Gemini model:', settings.geminiModel)
    const genAI = new GoogleGenerativeAI(settings.geminiKey)
    const model = genAI.getGenerativeModel({ model: settings.geminiModel })
    
    const parts: any[] = [prompt]
    if (imageB64) {
      parts.push({
        inlineData: {
          data: imageB64.split(',')[1] || imageB64,
          mimeType: 'image/png'
        }
      })
    }
    
    const result = await model.generateContent(parts)
    const text = result.response.text()
    // Strip markdown code blocks if present
    const cleaned = text.replace(/```(?:jsx|tsx|javascript|typescript|js|ts)?\n([\s\S]*?)\n```/g, '$1').trim()
    return cleaned
  }

  if (activeProvider === 'ollama') {
    if (!settings.ollamaModel || settings.ollamaModel.trim() === '') {
      throw new Error('Ollama model is not selected. Please configure it in AI Settings.')
    }
    const endpoint = settings.ollamaEndpoint?.replace(/\/+$/, '') || 'http://localhost:11434'
    const payload: any = {
      model: settings.ollamaModel,
      prompt: prompt,
      stream: false
    }
    if (imageB64) {
      payload.images = [imageB64.split(',')[1] || imageB64]
    }
    const response = await axios.post(`${endpoint}/api/generate`, payload)
    return response.data.response
  }

  throw new Error('Unsupported provider')
}
