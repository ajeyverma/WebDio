import React, { useState, useEffect } from 'react'
import { X, Save, RefreshCw, Cpu, Network, Edit3, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore, AIProvider, AISettings } from '../stores/useAppStore'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

const SparkleIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L14.85 9.15L22 12L14.85 14.85L12 22L9.15 14.85L2 12L9.15 9.15L12 2Z" fill="currentColor" className="text-[#007acc]" />
  </svg>
)

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { settings, setSettings, availableGeminiModels, fetchGeminiModels } = useAppStore()
  
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



  return (
    <AnimatePresence>
      {isOpen && (
        <React.Fragment>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/25 z-50 flex items-center justify-center p-4"
            onClick={onClose}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-white rounded border border-[#e5e5e5] shadow-2xl overflow-hidden relative"
            >
              <div className="flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="px-4 py-2.5 border-b border-[#e5e5e5] flex items-center justify-between bg-[#f3f3f3]">
                  <h2 className="text-[12px] font-bold text-[#616161] uppercase tracking-wider flex items-center gap-2">
                    <SparkleIcon />
                    AI Command Center Settings
                  </h2>
                  <button 
                    onClick={onClose} 
                    className="p-1 hover:bg-[#e5e5e5] rounded transition-colors text-[#616161] -mr-1"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">


                  {/* Gemini Settings */}
                  {draft.activeProvider === 'gemini' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="flex items-center gap-2 text-[11px] font-bold text-[#616161] uppercase tracking-wider">
                          <Network size={14} className="text-[#007acc]" />
                          Gemini API Key
                        </label>
                        <div className="relative flex items-center">
                          <input 
                            type="password"
                            value={draft.geminiKey}
                            onChange={(e) => setDraft({ ...draft, geminiKey: e.target.value })}
                            placeholder="Enter Gemini API key"
                            className="w-full px-3 py-2 pr-10 rounded border border-[#d4d4d4] focus:border-[#007acc] bg-[#ffffff] text-[13px] text-[#333333] transition-all outline-none font-mono"
                          />
                          <button
                            onClick={handleRefreshGeminiModels}
                            disabled={!draft.geminiKey || isFetchingModels}
                            className={`absolute right-2 p-1.5 rounded transition-all ${
                              isFetchingModels 
                                ? 'text-[#007acc] animate-spin' 
                                : 'text-[#616161] hover:text-[#333333] hover:bg-[#e5e5e5]'
                            }`}
                            title="Fetch available models"
                          >
                            <RefreshCw size={14} />
                          </button>
                        </div>
                        <p className="text-[11px] text-[#8c8c8c] pl-0.5">The API key is stored locally on your device.</p>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 text-[11px] font-bold text-[#616161] uppercase tracking-wider">
                            <Cpu size={14} className="text-[#007acc]" />
                            Model Engine
                          </label>
                          <button 
                            onClick={() => setIsCustomModel(!isCustomModel)}
                            className="text-[11px] font-bold text-[#007acc] hover:text-[#0062a3] flex items-center gap-1 uppercase"
                          >
                            <Edit3 size={11} />
                            {isCustomModel ? 'Select From List' : 'Custom Model String'}
                          </button>
                        </div>
                        
                        {isCustomModel ? (
                          <input 
                            type="text"
                            value={draft.geminiModel}
                            onChange={(e) => setDraft({ ...draft, geminiModel: e.target.value })}
                            placeholder="e.g., gemini-1.5-pro"
                            className="w-full px-3 py-2 rounded border border-[#d4d4d4] focus:border-[#007acc] bg-[#ffffff] text-[13px] text-[#333333] transition-all outline-none"
                          />
                        ) : (
                          <div className="relative">
                            <select 
                              value={draft.geminiModel}
                              onChange={(e) => setDraft({ ...draft, geminiModel: e.target.value })}
                              className="w-full px-3 py-2 pr-10 rounded border border-[#d4d4d4] focus:border-[#007acc] bg-[#ffffff] text-[13px] text-[#333333] transition-all outline-none appearance-none"
                              disabled={availableGeminiModels.length === 0}
                            >
                              <option value="" disabled>Select a model...</option>
                              {availableGeminiModels.map(m => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                              {availableGeminiModels.length === 0 && (
                                <option value="" disabled>Refresh models to populate list</option>
                              )}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#8c8c8c]">
                              <ChevronDown size={14} />
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}



                </div>

                {/* Footer */}
                <div className="px-6 py-3.5 bg-[#f3f3f3] border-t border-[#e5e5e5] flex items-center justify-between">
                  <p className="text-[11px] text-[#8c8c8c]">
                    Apply changes to update settings.
                  </p>
                  <button 
                    onClick={handleSave}
                    disabled={saveStatus === 'saving'}
                    className={`px-4 py-2 text-white rounded text-[12px] font-bold flex items-center gap-2 transition-all active:scale-95 ${
                      saveStatus === 'success' ? 'bg-emerald-600' :
                      saveStatus === 'error' ? 'bg-rose-600' :
                      'bg-[#007acc] hover:bg-[#0062a3]'
                    }`}
                  >
                    {saveStatus === 'saving' ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <Save size={14} />
                    )}
                    {saveStatus === 'saving' ? 'Saving...' : 
                     saveStatus === 'success' ? 'Saved' : 
                     saveStatus === 'error' ? 'Error' : 
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
