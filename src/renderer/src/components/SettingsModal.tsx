import React, { useState, useEffect } from 'react'
import { X, Save, RefreshCw, Cpu, Network, Edit3 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore, AIProvider, AISettings } from '../stores/useAppStore'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

const SparkleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L14.85 9.15L22 12L14.85 14.85L12 22L9.15 14.85L2 12L9.15 9.15L12 2Z" fill="currentColor" />
  </svg>
)

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { settings, setSettings, isOllamaRunning, availableOllamaModels, availableGeminiModels, refreshOllama, fetchGeminiModels } = useAppStore()
  
  const [draft, setDraft] = useState<AISettings>(settings)
  const [isCustomModel, setIsCustomModel] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [isFetchingModels, setIsFetchingModels] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setDraft(settings)
      setSaveStatus('idle')
      // If we have a key but no models, try to fetch
      if (settings.geminiKey && availableGeminiModels.length === 0) {
        fetchGeminiModels(settings.geminiKey)
      }
    }
  }, [isOpen, settings])

  const handleSave = async () => {
    setSaveStatus('saving')
    try {
      await setSettings(draft)
      setSaveStatus('success')
      setTimeout(() => onClose(), 1200)
    } catch (err) {
      console.error('Renderer: Failed to save settings:', err)
      setSaveStatus('error')
    }
  }

  const handleRefreshGeminiModels = async () => {
    if (!draft.geminiKey) return
    setIsFetchingModels(true)
    await fetchGeminiModels(draft.geminiKey)
    setIsFetchingModels(false)
  }

  const providers: { id: AIProvider; label: string; icon: React.ReactNode }[] = [
    { id: 'gemini', label: 'Google Gemini', icon: <SparkleIcon /> },
    { id: 'ollama', label: 'Ollama (Local)', icon: <Cpu size={18} /> },
  ]

  return (
    <AnimatePresence>
      {isOpen && (
        <React.Fragment>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 relative"
            >
              <div className="flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white/50 backdrop-blur-sm">
                  <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">AI Command Center</h2>
                  <button 
                    onClick={onClose} 
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600 -mr-2"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                  {/* Provider Tabs */}
                  <div className="flex p-1 bg-slate-100/50 rounded-2xl">
                    {providers.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setDraft({ ...draft, activeProvider: p.id })}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all ${
                          draft.activeProvider === p.id 
                          ? 'bg-white text-sky-600 shadow-sm scale-[1.02]' 
                          : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        {p.icon}
                        {p.label}
                      </button>
                    ))}
                  </div>

                  {/* Gemini Settings */}
                  {draft.activeProvider === 'gemini' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                          <Network size={16} className="text-sky-500" />
                          Gemini API Key
                        </label>
                        <div className="relative">
                          <input 
                            type="password"
                            value={draft.geminiKey}
                            onChange={(e) => setDraft({ ...draft, geminiKey: e.target.value })}
                            placeholder="Paste your API key here..."
                            className="w-full px-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 focus:bg-white transition-all outline-none font-mono text-sm pr-20"
                          />
                          <button
                            onClick={handleRefreshGeminiModels}
                            disabled={!draft.geminiKey || isFetchingModels}
                            className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all ${
                              isFetchingModels ? 'bg-sky-50 text-sky-400 animate-spin' : 'bg-white text-sky-600 shadow-sm hover:scale-110 active:scale-95'
                            }`}
                          >
                            <RefreshCw size={14} />
                          </button>
                        </div>
                        <p className="text-xs text-slate-400 pl-1">Key is only used locally. Click the icon to fetch available models.</p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                            <Cpu size={16} className="text-sky-500" />
                            Model Engine
                          </label>
                          <button 
                            onClick={() => setIsCustomModel(!isCustomModel)}
                            className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1"
                          >
                            <Edit3 size={12} />
                            {isCustomModel ? 'Use List' : 'Custom String'}
                          </button>
                        </div>
                        
                        {isCustomModel ? (
                          <input 
                            type="text"
                            value={draft.geminiModel}
                            onChange={(e) => setDraft({ ...draft, geminiModel: e.target.value })}
                            placeholder="e.g., gemini-3.1-flash"
                            className="w-full px-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 focus:bg-white transition-all outline-none"
                          />
                        ) : (
                          <div className="relative">
                            <select 
                              value={draft.geminiModel}
                              onChange={(e) => setDraft({ ...draft, geminiModel: e.target.value })}
                              className="w-full px-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 focus:bg-white transition-all outline-none appearance-none font-medium text-slate-700 disabled:opacity-50"
                              disabled={availableGeminiModels.length === 0}
                            >
                              <option value="" disabled>Select a model...</option>
                              {availableGeminiModels.map(m => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                              {availableGeminiModels.length === 0 && (
                                <option value="" disabled>Enter API key and refresh to see models</option>
                              )}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                              <RefreshCw size={16} />
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* Ollama Settings */}
                  {draft.activeProvider === 'ollama' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                      <div className="flex items-center justify-between p-5 rounded-2xl bg-sky-50 border border-sky-100">
                        <div className="flex items-center gap-4">
                          <div className={`w-3.5 h-3.5 rounded-full shadow-sm ${isOllamaRunning ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                          <div>
                            <p className="font-bold text-sky-900">{isOllamaRunning ? 'Ollama Online' : 'Ollama Offline'}</p>
                            <p className="text-xs text-sky-700/70 font-medium">{draft.ollamaEndpoint}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => refreshOllama()}
                          className="p-2.5 bg-white text-sky-600 rounded-xl hover:shadow-lg transition-all active:scale-95 border border-sky-100"
                        >
                          <RefreshCw size={18} />
                        </button>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 pl-1">Ollama Model</label>
                        <select 
                          value={draft.ollamaModel}
                          onChange={(e) => setDraft({ ...draft, ollamaModel: e.target.value })}
                          className="w-full px-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 focus:bg-white transition-all outline-none font-medium appearance-none"
                        >
                          {availableOllamaModels.map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                          {availableOllamaModels.length === 0 && <option value="">No models found</option>}
                        </select>
                      </div>
                    </motion.div>
                  )}

                </div>

                {/* Footer */}
                <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <p className="text-xs text-slate-400 font-medium max-w-[240px]">
                    Click save to apply changes.
                  </p>
                  <button 
                    onClick={handleSave}
                    disabled={saveStatus === 'saving'}
                    className={`px-8 py-3.5 text-white rounded-2xl font-bold flex items-center gap-3 transition-all active:scale-95 group ${
                      saveStatus === 'success' ? 'bg-emerald-500' :
                      saveStatus === 'error' ? 'bg-rose-500' :
                      'bg-sky-600 hover:bg-sky-700'
                    }`}
                  >
                    {saveStatus === 'saving' ? (
                      <RefreshCw size={20} className="animate-spin" />
                    ) : saveStatus === 'success' ? (
                      <Save size={20} />
                    ) : (
                      <Save size={20} className="group-hover:rotate-12 transition-transform" />
                    )}
                    {saveStatus === 'saving' ? 'Saving...' : 
                     saveStatus === 'success' ? 'Saved!' : 
                     saveStatus === 'error' ? 'Error!' : 
                     'Save Configuration'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </React.Fragment>
      )}
    </AnimatePresence>
  )
}

export default SettingsModal
