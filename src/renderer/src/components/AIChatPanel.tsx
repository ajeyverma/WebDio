import React, { useState, useRef, useEffect } from 'react'
import { Bot, Send, ListChecks, Loader2, Sparkles, ImagePlus, Link, X, Globe, RotateCw, AlertCircle } from 'lucide-react'
import { useAppStore } from '../stores/useAppStore'
import { parseProjectFiles } from '../utils/fileUtils'

const AIChatPanel: React.FC = () => {
  const { 
    chatHistory, 
    addChatMessage, 
    setLoading, 
    currentPlan, 
    setCurrentPlan, 
    projectFiles,
    setProjectFiles, 
    setActiveFileName, 
    setViewMode,
    isPlanMode,
    setIsPlanMode
  } = useAppStore()
  
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [attachedImage, setAttachedImage] = useState<string | null>(null)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [attachedUrl, setAttachedUrl] = useState<string>('')
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [urlDraft, setUrlDraft] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const lastUserMsgRef = useRef<string>('')
  const lastContextRef = useRef<string>('')
  const lastImageRef = useRef<string | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [chatHistory])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const result = ev.target?.result as string
      setAttachedImage(result)
      setImageBase64(result.split(',')[1])
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleAddUrl = () => {
    if (urlDraft.trim()) {
      setAttachedUrl(urlDraft.trim())
      setUrlDraft('')
      setShowUrlInput(false)
    }
  }

  const buildContextPrefix = () => {
    let ctx = ''
    if (attachedUrl) ctx += `\n\nReference URL: ${attachedUrl}`
    if (imageBase64) ctx += `\n\n[User has attached an image for visual context]`
    
    const currentFiles = useAppStore.getState().projectFiles
    if (currentFiles && currentFiles.length > 0) {
      ctx += `\n\n### Current Project Files (Context) ###\n`
      currentFiles.forEach(f => {
        ctx += `\n=== FILE: ${f.name} ===\n${f.content}\n`
      })
    }
    return ctx
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim() || isGenerating) return

    const userMsg = prompt
    const contextPrefix = buildContextPrefix()
    setPrompt('')

    // Show user message with attachments
    addChatMessage({ 
      role: 'user', 
      content: userMsg + (attachedUrl ? `\n🔗 ${attachedUrl}` : '') + (attachedImage ? '\n🖼️ Image attached' : ''), 
      type: 'text' 
    })

    const snapshot = { image: imageBase64, url: attachedUrl }
    // Save for retry
    lastUserMsgRef.current = userMsg
    lastContextRef.current = contextPrefix
    lastImageRef.current = imageBase64
    setAttachedImage(null)
    setImageBase64(null)
    setAttachedUrl('')
    
    setIsGenerating(true)

    try {
      if (isPlanMode) {
        addChatMessage({ role: 'agent', content: 'Analyzing your project context...', type: 'text' })
        
        const analysisPrompt = `You are a senior software engineer. Analyze the following request based on the current context and project files. 
Provide a brief (max 3 sentences) summary of what changes you are about to make. DO NOT output any code yet.

Request: "${userMsg}"${contextPrefix}`
        
        // @ts-ignore
        const analysis = await window.api.aiChat({ prompt: analysisPrompt, imageBase64: snapshot.image || undefined })
        
        addChatMessage({ role: 'agent', content: `🔍 **Analysis**: ${analysis}`, type: 'text' })
        addChatMessage({ role: 'agent', content: 'Building implementation plan...', type: 'text' })

        const planPrompt = `You are a senior software architect. 
Based on this analysis: "${analysis}"
And this request: "${userMsg}"${contextPrefix}

Create a detailed implementation plan in exactly this Markdown format:

# Implementation Plan - [Specific Title]

[Brief 1-2 sentence intro summarizing the goal]

## User Review Required

> [!IMPORTANT]
> - **[Action/Risk]**: [Detail]
> - **[Action/Risk]**: [Detail]

## Proposed Changes

### [Component/Domain Name]

#### [MODIFY/CREATE/DELETE] [Filename.ext](path/to/file)
- [Action detail]
- [Action detail]

## Verification Plan

### Automated Tests
- None.

### Manual Verification
1. [Step 1]
2. [Step 2]

Ensure you strictly follow this heading and list structure. Return ONLY the markdown plan.`
        
        // @ts-ignore
        const plan = await window.api.aiChat({ prompt: planPrompt, imageBase64: snapshot.image || undefined })
        setCurrentPlan(plan)
        addChatMessage({ role: 'agent', content: plan, type: 'plan' })
        setActiveFileName('Walkthrough: Plan')
        setViewMode('editor')
        
      } else {
        // Step 1: Pre-Analysis
        addChatMessage({ role: 'agent', content: 'Analyzing your project context...', type: 'text' })
        
        const analysisPrompt = `You are a senior software engineer. Analyze the following request based on the current context and project files. 
Provide a brief (max 3 sentences) summary of what changes you are about to make. DO NOT output any code yet.

Request: "${userMsg}"${contextPrefix}`
        
        // @ts-ignore
        const analysis = await window.api.aiChat({ prompt: analysisPrompt, imageBase64: snapshot.image || undefined })
        
        addChatMessage({ role: 'agent', content: `🔍 **Analysis**: ${analysis}`, type: 'text' })
        addChatMessage({ role: 'agent', content: 'Generating files...', type: 'text' })

        // Step 2: Execution
        const finalPrompt = `You are a world-class senior frontend developer. 
${currentPlan ? 'Following this PLAN: \n' + currentPlan + '\n\n' : ''}

Based on this analysis:
"${analysis}"

And this user request:
"${userMsg}"${contextPrefix}

Build or modify the existing code into a complete multi-file website.

OUTPUT FORMAT — YOU MUST USE THIS EXACT FORMAT:
Output each file separated by a file marker like this:

=== FILE: index.html ===
[full html content here]

=== FILE: styles.css ===
[full css content here]

=== FILE: app.js ===
[full javascript content here]

To DELETE a file or folder that is no longer needed, use:
=== DELETE: path/to/file.ext ===
or for a folder:
=== DELETE: path/to/folder ===

STRICT RULES:
1. index.html must link to styles.css via <link rel="stylesheet" href="styles.css"> in the <head>.
2. index.html must link to app.js via <script src="app.js"></script> at the bottom of <body>.
3. styles.css must contain ALL styles. Pure CSS only.
4. app.js must contain ALL JavaScript. Vanilla JS only.
5. The design MUST be PREMIUM, MODERN, and POLISHED.
6. DO NOT use any markdown code blocks for the output, just use the file markers.
7. Use DELETE markers to remove files or folders that are obsolete or replaced.`

        // @ts-ignore
        const code = await window.api.aiChat({ prompt: finalPrompt, imageBase64: snapshot.image || undefined })
        const parsedFiles = parseProjectFiles(code)

        // Parse DELETE markers
        const deleteRegex = /===\s*DELETE:\s*(.+?)\s*===/g
        const toDelete: string[] = []
        let delMatch: RegExpExecArray | null
        while ((delMatch = deleteRegex.exec(code)) !== null) {
          toDelete.push(delMatch[1].trim())
        }
        
        if (parsedFiles.length > 0 || toDelete.length > 0) {
          const { projectPath, syncProjectFromDisk, projectFiles: currFiles } = useAppStore.getState()
          const stateBefore = JSON.parse(JSON.stringify(currFiles || []))
          
          if (projectPath) {
            // Delete obsolete files/folders first
            for (const relPath of toDelete) {
              // @ts-ignore
              const fullPath = window.api.join(projectPath, relPath)
              // @ts-ignore
              await window.api.deleteEntry(fullPath)
            }
            for (const file of parsedFiles) {
              // @ts-ignore
              await window.api.writeFile(projectPath, file.name, file.content)
            }
            await syncProjectFromDisk()
          } else {
            setProjectFiles(parsedFiles)
          }

          const parts: string[] = []
          if (toDelete.length > 0) parts.push(`🗑️ Deleted: ${toDelete.join(', ')}`)
          if (parsedFiles.length > 0) parts.push(`✅ Generated ${parsedFiles.length} file(s): ${parsedFiles.map(f => f.name).join(', ')}`)
          addChatMessage({ role: 'agent', content: parts.join('  •  ') + '  —  Check your workspace!', type: 'code', previousFiles: stateBefore })
          setActiveFileName('index.html')
          setViewMode('preview')
        } else {
          addChatMessage({ role: 'agent', content: "Failed to parse files. Please try again.", type: 'text' })
        }
      }
    } catch (err) {
      addChatMessage({ role: 'agent', content: `Error: ${(err as Error).message}`, type: 'error' })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRetry = async () => {
    if (!lastUserMsgRef.current || isGenerating) return
    const fakeEvent = { preventDefault: () => {} } as React.FormEvent
    // Re-inject the last prompt
    const saved = lastUserMsgRef.current
    const savedCtx = lastContextRef.current
    const savedImg = lastImageRef.current
    setIsGenerating(true)
    try {
      if (isPlanMode) {
        addChatMessage({ role: 'agent', content: 'Analyzing your project context...', type: 'text' })
        
        const analysisPrompt = `You are a senior software engineer. Analyze the following request based on the current context and project files. 
Provide a brief (max 3 sentences) summary of what changes you are about to make. DO NOT output any code yet.

Request: "${saved}"${savedCtx}`
        
        // @ts-ignore
        const analysis = await window.api.aiChat({ prompt: analysisPrompt, imageBase64: savedImg || undefined })
        
        addChatMessage({ role: 'agent', content: `🔍 **Analysis**: ${analysis}`, type: 'text' })
        addChatMessage({ role: 'agent', content: 'Building implementation plan...', type: 'text' })

        const planPrompt = `You are a senior software architect. 
Based on this analysis: "${analysis}"
And this request: "${saved}"${savedCtx}

Create a detailed implementation plan in exactly this Markdown format:

# Implementation Plan - [Specific Title]

[Brief 1-2 sentence intro summarizing the goal]

## User Review Required

> [!IMPORTANT]
> - **[Action/Risk]**: [Detail]
> - **[Action/Risk]**: [Detail]

## Proposed Changes

### [Component/Domain Name]

#### [MODIFY/CREATE/DELETE] [Filename.ext](path/to/file)
- [Action detail]
- [Action detail]

## Verification Plan

### Automated Tests
- None.

### Manual Verification
1. [Step 1]
2. [Step 2]

Ensure you strictly follow this heading and list structure. Return ONLY the markdown plan.`
        // @ts-ignore
        const plan = await window.api.aiChat({ prompt: planPrompt, imageBase64: savedImg || undefined })
        setCurrentPlan(plan)
        addChatMessage({ role: 'agent', content: plan, type: 'plan' })
        setActiveFileName('Walkthrough: Plan')
        setViewMode('editor')
      } else {
        // Step 1: Pre-Analysis
        addChatMessage({ role: 'agent', content: 'Analyzing your project context...', type: 'text' })
        
        const analysisPrompt = `You are a senior software engineer. Analyze the following request based on the current context and project files. 
Provide a brief (max 3 sentences) summary of what changes you are about to make. DO NOT output any code yet.

Request: "${saved}"${savedCtx}`
        
        // @ts-ignore
        const analysis = await window.api.aiChat({ prompt: analysisPrompt, imageBase64: savedImg || undefined })
        
        addChatMessage({ role: 'agent', content: `🔍 **Analysis**: ${analysis}`, type: 'text' })
        addChatMessage({ role: 'agent', content: 'Generating files...', type: 'text' })

        // Step 2: Execution
        const finalPrompt = `You are a world-class senior frontend developer. 
${currentPlan ? 'Following this PLAN: \n' + currentPlan + '\n\n' : ''}

Based on this analysis:
"${analysis}"

And this user request:
"${saved}"${savedCtx}

Build or modify the existing code into a complete multi-file website.

OUTPUT FORMAT — YOU MUST USE THIS EXACT FORMAT:
Output each file separated by a file marker like this:

=== FILE: index.html ===
[full html content here]

=== FILE: styles.css ===
[full css content here]

=== FILE: app.js ===
[full javascript content here]

To DELETE a file or folder that is no longer needed, use:
=== DELETE: path/to/file.ext ===
or for a folder:
=== DELETE: path/to/folder ===

STRICT RULES:
1. index.html must link to styles.css via <link rel="stylesheet" href="styles.css"> in the <head>.
2. index.html must link to app.js via <script src="app.js"></script> at the bottom of <body>.
3. styles.css must contain ALL styles. Pure CSS only.
4. app.js must contain ALL JavaScript. Vanilla JS only.
5. The design MUST be PREMIUM, MODERN, and POLISHED.
6. DO NOT use any markdown code blocks for the output, just use the file markers.
7. Use DELETE markers to remove files or folders that are obsolete or replaced.`

        // @ts-ignore
        const code = await window.api.aiChat({ prompt: finalPrompt, imageBase64: savedImg || undefined })
        const parsedFiles = parseProjectFiles(code)

        // Parse DELETE markers
        const deleteRegex = /===\s*DELETE:\s*(.+?)\s*===/g
        const toDelete: string[] = []
        let delMatch: RegExpExecArray | null
        while ((delMatch = deleteRegex.exec(code)) !== null) {
          toDelete.push(delMatch[1].trim())
        }
        
        if (parsedFiles.length > 0 || toDelete.length > 0) {
          const { projectPath, syncProjectFromDisk, projectFiles: currFiles } = useAppStore.getState()
          const stateBefore = JSON.parse(JSON.stringify(currFiles || []))

          if (projectPath) {
            // Delete obsolete files/folders first
            for (const relPath of toDelete) {
              // @ts-ignore
              const fullPath = window.api.join(projectPath, relPath)
              // @ts-ignore
              await window.api.deleteEntry(fullPath)
            }
            for (const file of parsedFiles) {
              // @ts-ignore
              await window.api.writeFile(projectPath, file.name, file.content)
            }
            await syncProjectFromDisk()
          } else {
            setProjectFiles(parsedFiles)
          }

          const parts: string[] = []
          if (toDelete.length > 0) parts.push(`🗑️ Deleted: ${toDelete.join(', ')}`)
          if (parsedFiles.length > 0) parts.push(`✅ Generated ${parsedFiles.length} file(s): ${parsedFiles.map(f => f.name).join(', ')}`)
          addChatMessage({ role: 'agent', content: 'Retry succeeded!  •  ' + parts.join('  •  '), type: 'code', previousFiles: stateBefore })
          setActiveFileName('index.html')
          setViewMode('preview')
        } else {
          addChatMessage({ role: 'agent', content: "Failed to parse files. Please try again.", type: 'text' })
        }
      }
    } catch (err) {
      addChatMessage({ role: 'agent', content: `Retry failed: ${(err as Error).message}`, type: 'error' })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#f3f3f3] select-text">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 doc-scrollbar">
        {chatHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 text-[#858585]">
            <Sparkles size={40} className="mb-4 text-[#cccccc]" />
            <h3 className="text-sm font-bold text-[#333333] mb-2 uppercase">AI Assistant Ready</h3>
            <p className="text-xs">
              Use <strong className="text-[#007acc]">Plan Mode</strong> to outline changes, then switch it off to <strong className="text-[#007acc]">Execute</strong> and generate code directly into your workspace.
            </p>
          </div>
        ) : (
          chatHistory.map((msg, i) => (
            <div key={i} className={`flex gap-3 w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.type === 'error' ? (
                <div className="w-full">
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 min-w-0">
                    <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-bold text-red-600 uppercase tracking-wide mb-1">Agent Error</p>
                      <p className="text-[13px] text-red-700 leading-relaxed break-words whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                  {i === chatHistory.length - 1 && (
                    <button
                      onClick={handleRetry}
                      disabled={isGenerating}
                      className="mt-2 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-bold text-white bg-red-500 hover:bg-red-600 shadow-sm transition-colors uppercase active:scale-95 disabled:opacity-50"
                    >
                      {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <RotateCw size={12} />}
                      {isGenerating ? 'Retrying...' : 'Retry'}
                    </button>
                  )}
                </div>
              ) : (
              <div className={`text-sm break-words min-w-0 ${
                msg.role === 'user' 
                  ? 'px-4 py-3 rounded-2xl max-w-[85%] bg-[#007acc] text-white shadow-md shadow-[#007acc]/20 rounded-tr-none flex-shrink-0' 
                  : 'w-full text-[#333333] py-2'
              }`}>
                {msg.type === 'plan' ? (
                   <div className="flex flex-col gap-1 w-full min-w-0">
                      <div className="font-bold flex items-center gap-2 text-[12px] uppercase tracking-wider text-[#616161]">
                         <ListChecks size={14} className="text-[#007acc]" />
                         Walkthrough Generated
                      </div>
                      <p className="text-[13px] text-[#333333] leading-relaxed">I have built the implementation plan. Please review it in the active central tab.</p>
                   </div>
                ) : msg.type === 'code' ? (
                   <div className="flex flex-col gap-2 min-w-0">
                       <div className="flex items-start gap-2 min-w-0">
                           <Sparkles size={16} className="text-[#007acc] shrink-0 mt-0.5" />
                           <span className="text-[#333333] font-normal normal-case text-[13px] leading-relaxed break-words min-w-0">{msg.content}</span>
                       </div>
                       {msg.previousFiles && (
                         <button 
                           onClick={() => useAppStore.getState().revertFiles(msg.previousFiles)}
                           className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-[#616161] bg-white border border-[#e5e5e5] hover:bg-[#ffebee] hover:text-[#e84040] hover:border-[#ffcdd2] self-start transition-all shadow-sm active:scale-95"
                         >
                           <RotateCw size={12} /> Revert to Previous State
                         </button>
                       )}
                   </div>
                ) : (
                   <div className="flex items-start gap-2 max-w-full min-w-0">
                       {msg.role === 'agent' && <Bot size={16} className="text-[#007acc] shrink-0 mt-0.5" />}
                       <p className="whitespace-pre-wrap break-words leading-relaxed text-[13px] w-full min-w-0">{msg.content}</p>
                   </div>
                )}
              </div>
              )}
            </div>
          ))
        )}
        {isGenerating && (
          <div className="flex w-full justify-start py-2">
            <div className="flex items-center gap-2 text-[#616161] max-w-[85%]">
              <Loader2 size={14} className="animate-spin text-[#007acc] shrink-0" />
              <span className="text-[13px] font-medium italic">Thinking...</span>
            </div>
          </div>
        )}
        {useAppStore().isCreatingTask && (
          <div className="flex w-full justify-start py-2">
            <div className="flex items-center gap-2 text-[#616161] max-w-[85%]">
              <Sparkles size={14} className="animate-pulse text-[#007acc] shrink-0" />
              <span className="text-[13px] font-bold italic text-[#007acc]">Creating Task...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-[#e5e5e5] bg-[#f3f3f3]">
        {/* Attachment previews */}
        {(attachedImage || attachedUrl) && (
          <div className="flex flex-wrap gap-2 mb-2">
            {attachedImage && (
              <div className="relative group w-14 h-14 rounded-lg overflow-hidden border border-[#e2e8f0] shadow-sm">
                <img src={attachedImage} className="w-full h-full object-cover" />
                <button
                  onClick={() => { setAttachedImage(null); setImageBase64(null) }}
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                >
                  <X size={14} className="text-white" />
                </button>
              </div>
            )}
            {attachedUrl && (
              <div className="flex items-center gap-1.5 bg-white border border-[#e2e8f0] rounded-lg px-3 py-1.5 text-[12px] text-[#333333] shadow-sm max-w-[200px]">
                <Globe size={12} className="text-[#007acc] shrink-0" />
                <span className="truncate">{attachedUrl}</span>
                <button onClick={() => setAttachedUrl('')}>
                  <X size={12} className="text-[#858585] hover:text-[#e84040] transition-colors shrink-0" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* URL input popup */}
        {showUrlInput && (
          <div className="flex gap-2 mb-2">
            <input
              autoFocus
              value={urlDraft}
              onChange={e => setUrlDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddUrl(); if (e.key === 'Escape') setShowUrlInput(false) }}
              placeholder="Paste URL (e.g. https://...)"
              className="flex-1 bg-white border border-[#007acc] rounded-lg px-3 py-1.5 text-[12px] text-[#333333] focus:outline-none"
            />
            <button
              onClick={handleAddUrl}
              className="px-3 py-1.5 bg-[#007acc] text-white text-[11px] font-bold rounded-lg hover:bg-[#0062a3] transition-colors"
            >
              Add
            </button>
            <button
              onClick={() => setShowUrlInput(false)}
              className="p-1.5 text-[#616161] hover:bg-[#e5e5e5] rounded-lg transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Mode toggle and toolbar */}
        <div className="flex items-center gap-2 mb-2">
           <button 
             type="button"
             onClick={() => setIsPlanMode(!isPlanMode)}
             className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all font-bold text-[11px] border ${
               isPlanMode ? 'bg-[#007acc] border-[#007acc] text-white shadow-md' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
             }`}
           >
             <ListChecks size={14} />
             {isPlanMode ? 'PLAN MODE' : 'EXECUTE MODE'}
           </button>

           <div className="flex-1" />

           {/* Image upload */}
           <button
             type="button"
             onClick={() => imageInputRef.current?.click()}
             title="Attach image"
             className="p-1.5 rounded-lg text-[#616161] hover:bg-[#e5e5e5] hover:text-[#007acc] transition-all"
           >
             <ImagePlus size={16} />
           </button>

           {/* URL link */}
           <button
             type="button"
             onClick={() => setShowUrlInput(v => !v)}
             title="Attach URL"
             className={`p-1.5 rounded-lg transition-all ${showUrlInput ? 'bg-[#007acc] text-white' : 'text-[#616161] hover:bg-[#e5e5e5] hover:text-[#007acc]'}`}
           >
             <Link size={16} />
           </button>

           <input 
             ref={imageInputRef} 
             type="file" 
             accept="image/*" 
             className="hidden" 
             onChange={handleImageUpload} 
           />
        </div>

        <form onSubmit={handleSubmit} className="relative flex items-end">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e)
              }
            }}
            placeholder={isPlanMode ? "Describe what to plan..." : "Describe what to build..."}
            className="w-full bg-white border border-[#e2e8f0] rounded-xl py-3 pl-3 pr-12 text-sm text-[#333333] shadow-sm resize-none focus:outline-none focus:border-[#007acc] focus:ring-1 focus:ring-[#007acc] transition-all min-h-[48px] max-h-[200px] doc-scrollbar"
            rows={2}
          />
          <button
            type="submit"
            disabled={!prompt.trim() || isGenerating}
            className="absolute right-2 bottom-2 w-8 h-8 rounded-lg bg-[#007acc] text-white flex items-center justify-center disabled:opacity-50 hover:bg-[#0062a3] transition-colors"
          >
            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Send size={14} />}
          </button>
        </form>
      </div>
    </div>
  )
}

export default AIChatPanel
