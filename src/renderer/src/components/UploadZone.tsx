import React, { useState, useRef, useEffect } from 'react'
import { Upload, X, Loader2, Image as ImageIcon, Sparkles, Send, FileText, ListChecks, Play, ArrowRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../stores/useAppStore'

interface UploadZoneProps {
  onComplete: (code: string, image: string | null) => void
}

const UploadZone: React.FC<UploadZoneProps> = ({ onComplete }) => {
  const [dragActive, setDragActive] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { setLoading, isPlanMode, setIsPlanMode, currentPlan, setCurrentPlan } = useAppStore()

  const handleFile = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => setPreview(e.target?.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!preview && !prompt.trim()) return
    
    setIsGenerating(true)
    setLoading(true)

    try {
      if (isPlanMode && !currentPlan) {
        // Step 1: Generate Plan
        const planPrompt = `You are a senior software architect. 
Analyze this request: "${prompt}" ${preview ? '(and the attached sketch)' : ''}
Create a detailed implementation plan in Markdown format for building this website.
Include:
- Design Theme (Colors, Typography)
- Structure (Key sections)
- Interactivity (JS features)
- Technologies (Tailwind, Vanilla JS)
Return ONLY the markdown plan. No extra text.`

        // @ts-ignore
        const plan = await window.api.aiChat({ imageB64: preview || null, prompt: planPrompt })
        setCurrentPlan(plan)
        // Transition to IDE with plan.md automatically
        onComplete(plan, preview)
      } else {
        // Step 2: Build from Plan (or direct build)
        const finalPrompt = `You are a world-class senior frontend developer. 
${currentPlan ? 'Following this PLAN: \n' + currentPlan + '\n\n' : ''}
Build a high-fidelity, standalone, single-file HTML document using Tailwind CSS (via CDN) and Vanilla Javascript.
${preview ? 'Use this image as a visual reference for the layout.' : 'Description: ' + prompt}

Requirements:
- Use Lucide HTML/JS for icons.
- Add premium animations.
- Structure: Keep all CSS inside a <style id="app-styles"> block and all JS inside a <script id="app-scripts"> block.
- Return ONLY the full HTML code inside a markdown code block (starting with <!DOCTYPE html>).`

        // @ts-ignore
        const code = await window.api.aiChat({ imageB64: preview || null, prompt: finalPrompt })
        
        // Reset plan mode if we just built the project
        // setCurrentPlan(null) 
        onComplete(code, preview)
      }
    } catch (err) {
      alert('Generation failed: ' + (err as Error).message)
    } finally {
      setIsGenerating(false)
      setLoading(false)
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const item = e.clipboardData.items[0]
    if (item?.type.startsWith('image/')) {
      handleFile(item.getAsFile()!)
    }
  }

  // Clear current plan context when starting a completely new project
  const clearProject = () => {
     setPreview(null)
     setPrompt('')
     setCurrentPlan(null)
  }

  return (
    <div className="w-full max-w-4xl mx-auto" onPaste={handlePaste}>
      <motion.div 
        key="input-form"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col gap-6"
      >
        <div className={`relative transition-all duration-500 rounded-[32px] p-2 bg-white border-2 shadow-2xl ${
          dragActive ? 'border-[#007acc] ring-8 ring-[#007acc]/10' : 'border-slate-100 hover:border-slate-200'
        }`}>
          <div 
            onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFile(e.dataTransfer.files[0]) }}
            className="flex flex-col"
          >
            <form onSubmit={handleGenerate} className="flex items-center gap-3 p-2">
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-[#007acc] transition-all active:scale-95 flex-shrink-0"
              >
                {preview ? <div className="w-9 h-9 rounded-lg overflow-hidden border border-slate-200 shadow-sm"><img src={preview} className="w-full h-full object-cover" /></div> : <ImageIcon size={24} />}
              </button>
              
              <input 
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={currentPlan ? "Refining currently active plan..." : "Describe your vision..."}
                className="flex-1 bg-transparent border-none outline-none text-lg font-medium text-slate-800 placeholder:text-slate-300 px-2 h-12"
              />

              <div className="flex items-center gap-2 pr-2">
                <button 
                  type="button"
                  onClick={() => setIsPlanMode(!isPlanMode)}
                  className={`h-11 px-4 rounded-xl flex items-center gap-2 transition-all font-bold text-xs border ${
                    isPlanMode ? 'bg-sky-50 border-sky-200 text-sky-600' : 'bg-white border-slate-100 text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <ListChecks size={16} />
                  {isPlanMode ? 'Plan Mode ON' : 'Plan Mode'}
                </button>

                <button 
                  type="submit"
                  disabled={isGenerating || (!preview && !prompt.trim() && !currentPlan)}
                  className={`h-12 px-6 rounded-2xl font-bold flex items-center gap-2 transition-all active:scale-95 disabled:opacity-30 ${
                    (preview || prompt.trim() || currentPlan) ? 'bg-[#007acc] text-white shadow-lg shadow-[#007acc]/20 hover:bg-[#0062a3]' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {isGenerating ? <Loader2 className="animate-spin" size={20} /> : 
                    (isPlanMode && !currentPlan ? <ListChecks size={20} /> : <Sparkles size={20} />)}
                  {isGenerating ? 'Analyzing...' : 
                    (isPlanMode && !currentPlan ? 'Create Plan' : 'Generate Build')}
                </button>
                
                {currentPlan && (
                  <button onClick={clearProject} type="button" className="p-3 text-slate-400 hover:text-red-500 transition-colors">
                     <X size={20} />
                  </button>
                )}
              </div>
            </form>
          </div>
          <input type="file" ref={fileInputRef} onChange={(e) => handleFile(e.target.files![0])} className="hidden" accept="image/*" />
        </div>

        <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">
           {currentPlan ? "ACTIVE PLAN LOADED: You can build or refine it below" : "TIP: Enable Plan Mode to refine the structure before building"}
        </p>
      </motion.div>
    </div>
  )
}

export default UploadZone
