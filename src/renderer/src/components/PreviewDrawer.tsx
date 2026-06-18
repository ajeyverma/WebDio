import React, { useState, useMemo, useEffect, useRef } from 'react'
import { X, Code, Eye, Monitor, Tablet, Smartphone, Copy, Check, Download, ExternalLink, Box, FileCode, Braces, ChevronRight, Folder, FileJson, Send, MessageSquare, Loader2, Sparkles, User, Bot } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Editor from '@monaco-editor/react'
import { useAppStore } from '../stores/useAppStore'

interface Message {
  role: 'user' | 'assistant'
  text: string
  timestamp: Date
}

interface PreviewDrawerProps {
  code: string
  image: string | null
  onClose: () => void
  onCodeChange?: (newCode: string) => void
}

interface VirtualFile {
  name: string
  content: string
  language: string
  icon: React.ReactNode
}

const PreviewDrawer: React.FC<PreviewDrawerProps> = ({ code, image, onClose, onCodeChange }) => {
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview')
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [copied, setCopied] = useState(false)
  const [activeFile, setActiveFile] = useState<string>('index.html')
  const [isChatOpen, setIsChatOpen] = useState(true)
  const [chatInput, setChatInput] = useState('')
  const [isRefining, setIsRefining] = useState(false)
  const [editorInst, setEditorInst] = useState<any>(null)
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'assistant', 
      text: "I've generated your initial build! You can ask me to change styles, add features, or explain how it works.", 
      timestamp: new Date() 
    }
  ])
  
  const { setLoading } = useAppStore()
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (editorInst) {
      editorInst.layout()
      const timer = setTimeout(() => {
        editorInst.layout()
      }, 250)
      return () => clearTimeout(timer)
    }
  }, [isChatOpen, viewMode, editorInst])

  // Virtual Filesystem logic
  const files = useMemo<VirtualFile[]>(() => {
    const virtualFiles: VirtualFile[] = []
    const styleMatch = code.match(/<style id="app-styles">([\s\S]*?)<\/style>/) || code.match(/<style>([\s\S]*?)<\/style>/)
    const css = styleMatch ? styleMatch[1].trim() : ''
    const scriptMatch = code.match(/<script id="app-scripts">([\s\S]*?)<\/script>/) || code.match(/<script>([\s\S]*?)<\/script>/)
    const js = scriptMatch ? scriptMatch[1].trim() : ''
    
    let skeleton = code
    if (css) skeleton = skeleton.replace(styleMatch![0], '<link rel="stylesheet" href="styles.css">')
    if (js) skeleton = skeleton.replace(scriptMatch![0], '<script src="main.js"></script>')
    
    virtualFiles.push({ name: 'index.html', content: skeleton, language: 'html', icon: <FileCode size={16} className="text-orange-500" /> })
    if (css) virtualFiles.push({ name: 'styles.css', content: css, language: 'css', icon: <Braces size={16} className="text-sky-500" /> })
    if (js) virtualFiles.push({ name: 'main.js', content: js, language: 'javascript', icon: <FileCode size={16} className="text-yellow-500" /> })
    virtualFiles.push({ name: 'bundle.html', content: code, language: 'html', icon: <Box size={16} className="text-slate-400" /> })
    
    return virtualFiles
  }, [code])

  const activeFileData = useMemo(() => files.find(f => f.name === activeFile) || files[0], [activeFile, files])

  const handleCopy = () => {
    navigator.clipboard.writeText(activeFileData.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleExternalPreview = () => {
    const newWindow = window.open('about:blank', '_blank')
    if (newWindow) {
      newWindow.document.write(code)
      newWindow.document.close()
    }
  }

  const handleRefine = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim() || isRefining) return

    const userText = chatInput
    setChatInput('')
    setMessages(prev => [...prev, { role: 'user', text: userText, timestamp: new Date() }])
    setIsRefining(true)
    setLoading(true)

    try {
      const prompt = `You are an expert AI software agent and design partner. 
The user wants to update their website. Here is the current context:

CURRENT CODE:
${code}

INSTRUCTION:
"${userText}"

Requirements:
1. First, provide a very brief (1-2 sentence) explanation or confirmation of what you are doing (e.g. "Sure! I'll update the navigation bar to be sticky and adjust the colors.").
2. Then, provide the full updated HTML code inside a markdown code block (starting with <!DOCTYPE html>).
3. Do not include any other markdown or text after the code block.
4. Maintain the structure (styles in #app-styles, scripts in #app-scripts).`

      // @ts-ignore
      const response = await window.api.aiChat({ 
        imageB64: null, 
        prompt: prompt 
      })
      
      // Parse response: Extract message and code
      const codeMatch = response.match(/```(?:html|jsx|tsx|javascript|typescript|js|ts)?\n([\s\S]*?)\n```/)
      if (codeMatch) {
        const newCode = codeMatch[1].trim()
        const explanation = response.replace(codeMatch[0], '').trim()
        
        if (onCodeChange) onCodeChange(newCode)
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          text: explanation || "Updated the code for you!", 
          timestamp: new Date() 
        }])
      } else {
        // Fallback if AI didn't return code block properly
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          text: response, 
          timestamp: new Date() 
        }])
      }
    } catch (err) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        text: "Sorry, I ran into an error while updating the code: " + (err as Error).message, 
        timestamp: new Date() 
      }])
    } finally {
      setIsRefining(false)
      setLoading(false)
    }
  }

  const viewportWidths = {
    desktop: '100%',
    tablet: '768px',
    mobile: '375px'
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden rounded-3xl border border-slate-200 shadow-2xl">
      {/* Toolbar */}
      <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between z-10">
        <div className="flex items-center gap-6">
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400 hover:text-slate-600 active:scale-95">
            <X size={20} />
          </button>
          
          <div className="flex p-1 bg-slate-50 rounded-xl border border-slate-100">
            <button 
              onClick={() => setViewMode('preview')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                viewMode === 'preview' ? 'bg-white text-[#007acc] shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Eye size={16} />
              Preview
            </button>
            <button 
              onClick={() => setViewMode('code')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                viewMode === 'code' ? 'bg-white text-[#007acc] shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Code size={16} />
              Editor
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-50 rounded-xl border border-slate-100">
            <ViewportButton active={viewport === 'desktop'} onClick={() => setViewport('desktop')} icon={<Monitor size={18} />} />
            <ViewportButton active={viewport === 'tablet'} onClick={() => setViewport('tablet')} icon={<Tablet size={18} />} />
            <ViewportButton active={viewport === 'mobile'} onClick={() => setViewport('mobile')} icon={<Smartphone size={18} />} />
          </div>

          <button 
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={`p-2.5 rounded-xl transition-all border flex items-center gap-2 ${
              isChatOpen ? 'bg-sky-50 border-sky-200 text-[#007acc]' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Bot size={20} />
            <span className="text-xs font-bold">Agent</span>
          </button>

          <div className="h-6 w-px bg-slate-100 mx-1" />

          <button 
            onClick={handleCopy}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 active:scale-95 transition-all shadow-sm"
          >
            {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 active:scale-95 transition-all shadow-lg">
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Content (Preview/Code) */}
        <div className="flex-1 min-w-0 flex overflow-hidden relative">
          <AnimatePresence mode="wait">
            {viewMode === 'preview' ? (
              <motion.div 
                key="preview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50/50 relative overflow-hidden"
              >
                 <div 
                  className={`bg-white shadow-2xl rounded-2xl overflow-hidden transition-all duration-500 border border-slate-200 flex flex-col h-full relative`}
                  style={{ width: viewportWidths[viewport] }}
                >
                  {isRefining && (
                    <div className="absolute inset-x-0 top-0 bottom-0 bg-white/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center px-12 text-center">
                       <Loader2 className="animate-spin text-[#007acc] mb-6" size={48} />
                       <h4 className="text-xl font-black text-slate-900 mb-2 leading-tight">Updating your build...</h4>
                       <p className="text-sm font-bold text-slate-500">The agent is applying your refinements live.</p>
                    </div>
                  )}
                  <div className="bg-white border-b border-slate-50 px-4 py-3 flex items-center justify-between">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-slate-100 border border-slate-200" />
                      <div className="w-2.5 h-2.5 rounded-full bg-slate-100 border border-slate-200" />
                      <div className="w-2.5 h-2.5 rounded-full bg-slate-100 border border-slate-200" />
                    </div>
                    <div className="h-7 px-4 rounded-lg bg-slate-50 border border-slate-100 flex items-center">
                      <span className="text-[10px] text-slate-400 font-bold tracking-tight uppercase">Live Instance</span>
                    </div>
                    <div className="flex items-center gap-3">
                       <span className={`w-2 h-2 rounded-full ${isRefining ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
                       <button 
                         onClick={handleExternalPreview}
                         className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-[#007acc] rounded-lg transition-all active:scale-95"
                         title="Open in External Browser"
                       >
                         <ExternalLink size={14} />
                       </button>
                    </div>
                  </div>
                  <iframe 
                    srcDoc={code}
                    className="flex-1 w-full border-none"
                    key={code}
                  />
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="editor"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 min-w-0 flex overflow-hidden"
              >
                {/* File Sidebar */}
                <div className="w-64 bg-slate-50 border-r border-slate-100 flex flex-col">
                   <div className="p-6 border-b border-slate-100 bg-white flex items-center justify-between">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Structure</h3>
                      <Folder size={14} className="text-slate-300" />
                   </div>
                   <div className="flex-1 overflow-y-auto p-3 space-y-1">
                      {files.map(file => (
                        <button
                          key={file.name}
                          onClick={() => setActiveFile(file.name)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                            activeFile === file.name 
                            ? 'bg-white text-[#007acc] shadow-sm border border-slate-200/50' 
                            : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-700'
                          }`}
                        >
                          {file.icon}
                          <span className="text-sm font-semibold truncate">{file.name}</span>
                        </button>
                      ))}
                   </div>
                </div>

                <div className="flex-1 min-w-0 bg-white relative">
                   <Editor
                      height="100%"
                      language={activeFileData.language}
                      value={activeFileData.content}
                      theme="vs-light"
                      onMount={(editor) => {
                        setEditorInst(editor)
                      }}
                      options={{
                        automaticLayout: true,
                        fontSize: 14,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        padding: { top: 20 },
                        lineNumbers: 'on',
                        wordWrap: 'off',
                        scrollbar: {
                          vertical: 'visible',
                          horizontal: 'visible',
                          useShadows: false,
                          verticalScrollbarSize: 10,
                          horizontalScrollbarSize: 10
                        }
                      }}
                   />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Agent Chat Sidebar */}
        <AnimatePresence>
          {isChatOpen && (
            <motion.div 
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 340, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              onUpdate={() => {
                if (editorInst) {
                  editorInst.layout()
                }
              }}
              className="bg-white border-l border-slate-100 flex flex-col overflow-hidden relative shadow-[-10px_0_30px_rgba(0,0,0,0.02)]"
            >
              {/* Sidebar Header */}
              <div className="px-6 py-6 border-b border-slate-100 flex items-center justify-between bg-white">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#007acc] flex items-center justify-center text-white shadow-lg shadow-sky-600/20">
                       <Bot size={18} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 leading-none">Instant Agent</h3>
                        <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest mt-1">Online</p>
                    </div>
                 </div>
                 <button onClick={() => setIsChatOpen(false)} className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 transition-colors">
                    <X size={18} />
                 </button>
              </div>

              {/* Chat Thread */}
              <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50/30">
                 {messages.map((msg, idx) => (
                   <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={idx} 
                    className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                   >
                     <div className={`flex gap-3 max-w-[90%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mt-1 ${
                          msg.role === 'user' ? 'bg-slate-900 text-white' : 'bg-sky-100 text-[#007acc]'
                        }`}>
                           {msg.role === 'user' ? <User size={14} /> : <Sparkles size={14} />}
                        </div>
                        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                          msg.role === 'user' 
                          ? 'bg-slate-900 text-white rounded-tr-none' 
                          : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                        }`}>
                           {msg.text}
                        </div>
                     </div>
                     <span className="text-[9px] font-bold text-slate-300 mt-1.5 px-11 uppercase">
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                     </span>
                   </motion.div>
                 ))}
                 
                 {isRefining && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center text-[#007acc] animate-pulse">
                           <Bot size={14} />
                        </div>
                        <div className="flex gap-1.5 bg-white border border-slate-100 px-3 py-2 rounded-2xl shadow-sm">
                           <div className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                           <div className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                           <div className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                    </motion.div>
                 )}
                 <div ref={chatEndRef} />
              </div>

              {/* Chat Input Area */}
              <div className="p-4 bg-white border-t border-slate-100">
                 <form onSubmit={handleRefine} className="relative group">
                    <textarea 
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Ask the agent to update something..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-3xl px-5 py-4 pb-14 text-sm outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all resize-none min-h-[120px] font-medium text-slate-700 active:bg-white"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleRefine(e as any)
                        }
                      }}
                    />
                    <div className="absolute right-3 bottom-3 flex items-center gap-2">
                       <button 
                        type="submit"
                        disabled={!chatInput.trim() || isRefining}
                        className="flex items-center gap-2 px-5 py-2.5 bg-[#007acc] text-white rounded-2xl shadow-lg shadow-sky-600/20 hover:bg-sky-700 disabled:opacity-30 disabled:shadow-none transition-all active:scale-95 group"
                       >
                         <span className="text-xs font-bold">Refine Build</span>
                         <Send size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                       </button>
                    </div>
                 </form>
                 <p className="text-[9px] text-slate-400 text-center mt-4 font-bold uppercase tracking-widest">
                    Enter to send • Shift+Enter for newline
                 </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

const ViewportButton = ({ active, onClick, icon }: { active: boolean, onClick: () => void, icon: React.ReactNode }) => (
  <button 
    onClick={onClick}
    className={`p-2 rounded-lg transition-all active:scale-90 ${
      active ? 'bg-white text-[#007acc] shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
    }`}
  >
    {icon}
  </button>
)

export default PreviewDrawer
