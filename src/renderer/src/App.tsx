import React, { useEffect, useState, useMemo, useRef } from 'react'
import { useAppStore } from './stores/useAppStore'
import Sidebar from './components/Sidebar'
import ActivityBar from './components/ActivityBar'
import UploadZone from './components/UploadZone'
import PreviewDrawer from './components/PreviewDrawer'
import SettingsModal from './components/SettingsModal'
import TitleBar from './components/TitleBar'
import StatusBar from './components/StatusBar'
import AIChatPanel from './components/AIChatPanel'
import { motion, AnimatePresence } from 'framer-motion'
import Editor from '@monaco-editor/react'
import ReactMarkdown from 'react-markdown'
import { parseProjectFiles } from './utils/fileUtils'
import CommunityChat from './features/Community/CommunityChat'
import { Monitor, Tablet, Smartphone, Copy, Check, Download, ExternalLink, Box, Eye, Code, MessageSquare, Bot, Sparkles, X, Loader2, Play, ListChecks, FolderOpen, AlertTriangle, RotateCw, Search, Terminal } from 'lucide-react'

const App: React.FC = () => {
  const {
    initCommunity,
    loadSettings,
    projectFiles,
    setProjectFiles,
    activeFileName,
    setActiveFileName,
    isLoading,
    viewMode,
    setViewMode,
    currentPlan,
    setIsPlanMode,
    projectPath,
    openProject,
    isRightPanelOpen,
    setRightPanelOpen,
    themeColor,
    openFiles,
    closeFile,
    saveProjectFiles,
    unsavedFiles,
    openSharedProjects,
    activeTab,
    setActiveTab,
    syncProjectFromDisk,
    editorInstance
  } = useAppStore()

  useEffect(() => {
    initCommunity()
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        saveProjectFiles()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [saveProjectFiles])


  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [generatedCode, setGeneratedCode] = useState<string | null>(null)
  const [originalImage, setOriginalImage] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [isEditingPlan, setIsEditingPlan] = useState(false)
  const dragCounter = useRef(0)

  const handleToggleSidebar = (_tab: string) => {
    setIsSidebarOpen(prev => !prev)
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current += 1
    if (e.dataTransfer.types.includes('Files')) {
      setIsDraggingOver(true)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current -= 1
    if (dragCounter.current === 0) {
      setIsDraggingOver(false)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current = 0
    setIsDraggingOver(false)

    let droppedPath: string | null = null

    // Electron extends File with a .path property containing the full OS path
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      droppedPath = (files[0] as any).path ?? null
    }

    // Fallback: try items API (more reliable for folders in some Electron builds)
    if (!droppedPath) {
      const items = Array.from(e.dataTransfer.items)
      for (const item of items) {
        if (item.kind === 'file') {
          const f = item.getAsFile()
          if (f) {
            droppedPath = (f as any).path ?? null
            if (droppedPath) break
          }
        }
      }
    }

    console.log('[Drop] resolved path:', droppedPath)
    if (!droppedPath) return

    // Mirror openProject exactly
    const store = useAppStore.getState()
    store.setProjectPath(droppedPath)
    // @ts-ignore
    const projectFilesList = await window.api.readProject(droppedPath)
    if (projectFilesList) {
      useAppStore.setState({ projectFiles: projectFilesList })
    }

    // Open sidebar on Explorer tab
    setActiveTab('home')
    setIsSidebarOpen(true)
  }

  




  const [sidebarWidth, setSidebarWidth] = useState(256)
  const [aiPanelWidth, setAiPanelWidth] = useState(300)
  const isResizingSidebar = useRef(false)
  const isResizingAiPanel = useRef(false)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingSidebar.current) {
        const newWidth = Math.max(150, Math.min(e.clientX - 48, 800))
        setSidebarWidth(newWidth)
      } else if (isResizingAiPanel.current) {
        const newWidth = Math.max(250, Math.min(window.innerWidth - e.clientX, 800))
        setAiPanelWidth(newWidth)
      }
    }

    const handleMouseUp = () => {
      isResizingSidebar.current = false
      isResizingAiPanel.current = false
      document.body.style.cursor = 'default'
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  useEffect(() => {
    if (editorInstance) {
      editorInstance.layout()
      
      const timer = setTimeout(() => {
        editorInstance.layout()
      }, 250)
      
      return () => clearTimeout(timer)
    }
  }, [isRightPanelOpen, isSidebarOpen, sidebarWidth, aiPanelWidth, editorInstance])

  useEffect(() => {
    loadSettings()
  }, [])

  useEffect(() => {
    if (activeFileName !== 'Walkthrough: Plan') {
      setIsEditingPlan(false)
    }
  }, [activeFileName])

  const handleGenerationComplete = (code: string, image: string | null) => {
    setGeneratedCode(code)
    setOriginalImage(image)

    const isPlan = !/^\s*(<!DOCTYPE|<html)/i.test(code)

    if (isPlan) {
      setActiveFileName('Walkthrough: Plan')
      setViewMode('editor')
    } else {
      const files = parseProjectFiles(code)
      setProjectFiles(files)
      setActiveFileName('index.html')
      setViewMode('preview')
    }
  }

  const activeFile = useMemo(() => {
    if (!activeFileName) return null
    // Local project
    const local = projectFiles.find(f => f.name === activeFileName)
    if (local) return local

    // Shared project
    if (activeFileName.startsWith('shared-')) {
       const parts = activeFileName.split('/')
       const treeId = parts[0]
       const filePath = parts.slice(1).join('/')
       const nodeId = treeId.replace('shared-', '')
       
       const sharedProj = openSharedProjects.find(p => p.nodeId === nodeId)
       if (sharedProj) {
          return sharedProj.files.find(f => f.name === filePath) || null
       }
    }
    return null
  }, [projectFiles, activeFileName, openSharedProjects])

  const viewportWidths = {
    desktop: '100%',
    tablet: '768px',
    mobile: '375px'
  }

  const handleCopy = () => {
    if (activeFile) {
      navigator.clipboard.writeText(activeFile.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } else if (activeFileName === 'Walkthrough: Plan' && currentPlan) {
      navigator.clipboard.writeText(currentPlan)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } else if (activeFileName === 'Walkthrough: Task') {
      const task = useAppStore.getState().currentTask
      if (task) {
        navigator.clipboard.writeText(task)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    }
  }

  const handleBuildFromPlan = () => {
    setGeneratedCode(null)
    setIsPlanMode(false)
  }

  return (
    <div
      className="flex flex-col h-screen bg-[#ffffff] text-[#333333] overflow-hidden select-none font-sans"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {themeColor !== '#007acc' && (
        <style>{`
          .bg-\\[\\#007acc\\] { background-color: ${themeColor} !important; }
          .text-\\[\\#007acc\\] { color: ${themeColor} !important; }
          .border-\\[\\#007acc\\] { border-color: ${themeColor} !important; }
          .from-\\[\\#007acc\\] { --tw-gradient-from: ${themeColor} var(--tw-gradient-from-position) !important; }
        `}</style>
      )}
      <TitleBar />

      {/* Drag-to-open overlay */}
      <AnimatePresence>
        {isDraggingOver && (
          <motion.div
            key="drag-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="absolute inset-0 z-[200] flex flex-col items-center justify-center pointer-events-none"
            style={{
              background: `${themeColor}18`,
              border: `2px dashed ${themeColor}`,
              backdropFilter: 'blur(2px)'
            }}
          >
            <div
              className="flex flex-col items-center gap-4 px-10 py-8 rounded-3xl"
              style={{ background: `${themeColor}22` }}
            >
              <FolderOpen size={64} style={{ color: themeColor }} strokeWidth={1.5} />
              <div className="text-center">
                <p className="text-2xl font-black tracking-tight" style={{ color: themeColor }}>
                  Drop Folder to Open
                </p>
                <p className="text-sm text-[#616161] mt-1 font-medium">
                  Release to load the project into the workspace
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex overflow-hidden">
        <ActivityBar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenSettings={() => setIsSettingsOpen(true)}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={handleToggleSidebar}
        />

        <AnimatePresence initial={false}>
          {isSidebarOpen && (
            <motion.div
              key="sidebar"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: sidebarWidth, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.18, ease: 'easeInOut' }}
              onUpdate={() => {
                if (editorInstance) {
                  editorInstance.layout()
                }
              }}
              style={{ overflow: 'hidden', flexShrink: 0, height: '100%', display: 'flex' }}
            >
              <Sidebar activeTab={activeTab} width={sidebarWidth} onResizeStart={(e) => {
                e.preventDefault()
                isResizingSidebar.current = true
                document.body.style.cursor = 'col-resize'
              }} />
            </motion.div>
          )}
        </AnimatePresence>

        <main className="flex-1 min-w-0 flex flex-col relative overflow-hidden bg-white">
          <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">
            <AnimatePresence mode="wait">
              {(!generatedCode && !activeFileName) ? (
                <motion.div
                  key="launcher"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full max-w-4xl px-8"
                >
                  <div className="text-center mb-16">
                    <h1 className="text-6xl font-black tracking-tight text-[#2c2c2c] mb-6">
                      Imagine it. <span className="text-[#007acc]">Ship it.</span>
                    </h1>
                    <p className="text-[#616161] text-lg max-w-2xl mx-auto font-medium leading-relaxed mb-8">
                      A professional AI workspace for building websites in real-time.
                    </p>

                    {!projectPath && (
                      <div className="max-w-md mx-auto p-8 rounded-[32px] bg-[#f8fafc] border border-[#e2e8f0] border-dashed flex flex-col items-center gap-6 mb-8 group hover:border-[#007acc] hover:bg-[#f0f9ff] transition-all duration-300">
                        <FolderOpen size={48} className="text-[#94a3b8] group-hover:text-[#007acc] transition-colors" />
                        <div className="text-center">
                          <h3 className="text-lg font-bold text-[#1e293b]">Start Your First Project</h3>
                          <p className="text-xs text-[#64748b] mt-1">Select a local folder to begin the file flow</p>
                        </div>
                        <button
                          onClick={openProject}
                          className="bg-[#007acc] text-white px-8 py-3 rounded-2xl font-bold shadow-xl shadow-[#007acc]/20 hover:bg-[#0062a3] transition-all active:scale-95"
                        >
                          Open Folder
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="workspace"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="w-full h-full flex flex-col"
                >
                  {/* Editor Tabs (VS Code Style) */}
                  <div 
                    className="h-[35px] bg-[#f3f3f3] flex items-center border-b border-[#e5e5e5] overflow-x-auto tab-scrollbar"
                    onWheel={(e) => {
                      if (e.deltaY !== 0) {
                        e.currentTarget.scrollLeft += e.deltaY;
                      }
                    }}
                  >
                    {(openFiles.length > 0 ? openFiles : (activeFileName ? [activeFileName] : [])).filter(f => f !== 'Walkthrough: Task').map((fileName) => {
                      const isShared = fileName.startsWith('shared-')
                      const parts = fileName.split('/')
                      const baseName = parts.pop()
                      let projectColor = ''
                      
                      if (isShared) {
                        const nodeId = parts[0].replace('shared-', '')
                        const proj = openSharedProjects.find(p => p.nodeId === nodeId)
                        projectColor = proj?.color || '#007acc'
                      }

                      return (
                        <div 
                          key={fileName}
                          onClick={() => setActiveFileName(fileName)}
                          className={`h-full flex items-center px-4 border-r border-[#e5e5e5] cursor-pointer text-[13px] transition-none w-auto group flex-shrink-0 relative ${
                            activeFileName === fileName 
                            ? `bg-white border-t-2 text-[#333333] font-semibold` 
                            : `${isShared ? 'bg-[#f3f3f3] text-[#616161]' : 'bg-transparent text-[#616161]'} hover:bg-[#ebebeb] font-medium`
                          }`}
                          style={{ 
                             borderTopColor: activeFileName === fileName ? (isShared ? projectColor : themeColor) : 'transparent'
                          }}
                        >
                          {isShared && activeFileName !== fileName && (
                             <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ backgroundColor: projectColor, opacity: 0.5 }} />
                          )}
                          
                          <div className="flex items-center gap-2 mr-3">
                             {isShared && (
                               <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: projectColor }} />
                             )}
                             <span className="whitespace-nowrap">{baseName}</span>
                          </div>
                          
                          <div className="flex items-center justify-center min-w-[20px]">
                            {unsavedFiles.includes(fileName) && activeFileName !== fileName ? (
                              <div className="w-2.5 h-2.5 rounded-full bg-[#616161]/40" />
                            ) : unsavedFiles.includes(fileName) && activeFileName === fileName ? (
                              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: isShared ? projectColor : '#007acc' }} />
                            ) : null}

                            <X 
                              size={16} 
                              strokeWidth={2.5}
                              className={`text-[#616161] hover:bg-[#e5e5e5] rounded p-0.5 transition-all duration-200 ${
                                unsavedFiles.includes(fileName) ? 'hidden group-hover:block' : 'opacity-0 group-hover:opacity-100'
                              } ${activeFileName === fileName && !unsavedFiles.includes(fileName) ? 'opacity-100' : ''}`} 
                              onClick={(e) => {
                                e.stopPropagation()
                                closeFile(fileName)
                              }}
                            />
                          </div>
                        </div>
                      )
                    })}
                    <div className="flex-1" />
                  </div>

                  <div className="flex-1 flex overflow-hidden">
                     {/* Editor View */}
                    <div className="flex-1 min-w-0 bg-white relative flex flex-col">
                      {activeFileName === 'Walkthrough: Plan' ? (
                        <div className="flex-1 flex flex-col bg-[#fdfdfd] overflow-hidden">
                          {/* Walkthrough Header */}
                          <div className="h-12 border-b border-[#e5e5e5] bg-[#f3f3f3]/80 backdrop-blur-md flex items-center justify-between px-6 shrink-0">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-1.5 grayscale opacity-70">
                                <Sparkles size={14} className="text-[#007acc]" />
                                <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#858585]">
                                   AI Canvas
                                </span>
                              </div>
                              <div className="h-3 w-[1px] bg-[#cccccc]" />
                              <div className="flex items-center gap-2">
                                <ListChecks size={16} className="text-[#007acc]" />
                                <span className="text-[11px] font-bold uppercase tracking-wider text-[#333333]">Plan</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={handleCopy}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-bold text-[#616161] hover:text-[#333333] hover:bg-[#f3f3f3] transition-colors border border-transparent hover:border-[#e5e5e5] uppercase"
                              >
                                {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                                {copied ? 'Copied!' : 'Copy'}
                              </button>
                              
                              <button 
                                onClick={() => syncProjectFromDisk()} 
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-bold text-[#616161] hover:text-[#333333] hover:bg-[#f3f3f3] transition-colors border border-transparent hover:border-[#e5e5e5] uppercase"
                              >
                                <Eye size={14} /> Review
                              </button>
                              <button 
                                onClick={() => setIsEditingPlan(!isEditingPlan)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-bold transition-colors border border-transparent hover:border-[#e5e5e5] uppercase ${
                                  isEditingPlan ? 'text-[#007acc] bg-sky-100' : 'text-[#616161] hover:text-[#333333] hover:bg-[#f3f3f3]'
                                }`}
                                title={isEditingPlan ? 'Switch to Preview Mode' : 'Switch to Edit Plan'}
                              >
                                {isEditingPlan ? (
                                  <>
                                    <Eye size={14} /> Preview
                                  </>
                                ) : (
                                  <>
                                    <Code size={14} /> Edit Plan
                                  </>
                                )}
                              </button>
                              <button 
                                onClick={() => useAppStore.getState().executeFromPlan()}
                                disabled={useAppStore.getState().isExecuting}
                                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-bold text-white bg-gradient-to-r from-[#007acc] to-[#005a96] hover:from-[#0062a3] hover:to-[#004e82] shadow-sm transition-colors uppercase ml-2 active:scale-95 disabled:opacity-50"
                              >
                                {useAppStore.getState().isExecuting ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} fill="currentColor" />}
                                {useAppStore.getState().isExecuting ? 'Building...' : 'Execute'}
                              </button>
                            </div>
                          </div>

                          {/* Content Area */}
                          {isEditingPlan ? (
                            <div className="flex-1 bg-white relative">
                              <Editor
                                height="100%"
                                language="markdown"
                                path="WalkthroughPlan.md"
                                value={currentPlan || ''}
                                theme="vs-light"
                                options={{
                                  automaticLayout: true,
                                  fontSize: 14,
                                  minimap: { enabled: false },
                                  scrollBeyondLastLine: false,
                                  wordWrap: 'on',
                                  lineNumbers: 'on',
                                  fontFamily: 'Consolas, "Courier New", monospace',
                                  scrollbar: {
                                    vertical: 'visible',
                                    horizontal: 'visible',
                                    useShadows: false,
                                    verticalScrollbarSize: 10,
                                    horizontalScrollbarSize: 10
                                  }
                                }}
                                onChange={(val) => {
                                  if (val !== undefined) {
                                    useAppStore.getState().setCurrentPlan(val)
                                  }
                                }}
                              />
                            </div>
                          ) : (
                            <div className="flex-1 overflow-y-auto bg-white doc-scrollbar relative">
                              <div className="prose prose-slate prose-sm max-w-none py-8 px-10 min-h-full">
                                <ReactMarkdown
                                  components={{
                                    blockquote: ({ node, children, ...props }) => {
                                      return (
                                        <div className="bg-blue-50/50 border-l-[3px] border-blue-500 p-4 my-6 rounded-r-lg shadow-sm not-prose">
                                          <div className="flex items-center gap-2 text-blue-700 font-bold mb-2 text-[12px] uppercase tracking-wider">
                                            <AlertTriangle size={14} /> 
                                            Important
                                          </div>
                                          <div className="text-blue-900 text-[13px] leading-relaxed [&>p:first-child]:mt-0 [&>p:last-child]:mb-0">
                                            {children}
                                          </div>
                                        </div>
                                      )
                                    }
                                  }}
                                >
                                  {(currentPlan || 'No plan generated yet.').replace(/>\s*\[!IMPORTANT\]\s*\n?/gi, '').replace(/\[!IMPORTANT\]/gi, '')}
                                </ReactMarkdown>

                                {/* Task Result — shown inline below the plan */}
                                {useAppStore.getState().currentTask && (
                                  <div className="mt-10">
                                    <div className="flex items-center gap-2 mb-4">
                                      <Terminal size={15} className="text-[#007acc]" />
                                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#333333]">Generated Task</span>
                                    </div>
                                    <div className="font-mono text-[13px] bg-[#1e1e1e] border border-[#333333] rounded-xl p-8 shadow-2xl text-[#d4d4d4] leading-relaxed whitespace-pre-wrap not-prose">
                                    <div className="flex items-center gap-2 mb-6 pb-4 border-b border-[#333333]">
                                      <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
                                      <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                                      <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
                                      <span className="ml-2 font-bold uppercase tracking-tight text-[10px] text-[#007acc]">TASK · PRIORITY 1</span>
                                    </div>
                                    {useAppStore.getState().currentTask}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      ) : activeFileName === 'Community: Global Chat' ? (
                        <CommunityChat />
                      ) : (
                        <Editor
                          height="100%"
                          language={activeFile?.language || 'html'}
                          path={activeFileName || 'index.html'}
                          value={activeFile?.content || ''}
                          theme="vs-light"
                          onMount={(editor) => {
                            useAppStore.getState().setEditorInstance(editor)
                          }}
                          loading={
                            <div className="h-full w-full flex items-center justify-center bg-white text-[#616161]">
                              <Loader2 className="animate-spin text-[#007acc] mr-3" size={20} />
                              <span className="text-sm font-medium tracking-widest uppercase">Loading editor...</span>
                            </div>
                          }
                          options={{
                            automaticLayout: true,
                            fontSize: 14,
                            minimap: { enabled: true },
                            scrollBeyondLastLine: false,
                            wordWrap: 'off',
                            lineNumbers: 'on',
                            fontFamily: 'Consolas, "Courier New", monospace',
                            renderLineHighlight: 'all',
                            scrollbar: {
                              vertical: 'visible',
                              horizontal: 'visible',
                              useShadows: false,
                              verticalScrollbarSize: 10,
                              horizontalScrollbarSize: 10
                            }
                          }}
                          onChange={(val) => {
                            if (activeFile && val !== undefined) {
                               useAppStore.getState().updateFileContent(activeFile.name, val)
                            }
                          }}
                        />
                      )}

                    </div>

                    </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Global Loader Overlay */}
            <AnimatePresence>
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-[100] bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center"
                >
                  <Loader2 className="animate-spin text-[#007acc] mb-4" size={48} />
                  <p className="text-[11px] font-bold text-[#616161] uppercase tracking-widest">
                    Synchronizing Workspace...
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>

        {/* Right Panel - AI Agent */}
        <AnimatePresence>
          {isRightPanelOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: aiPanelWidth, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onUpdate={() => {
                if (editorInstance) {
                  editorInstance.layout()
                }
              }}
              className="bg-[#f3f3f3] border-l border-[#e5e5e5] h-full flex flex-col overflow-hidden z-20 shrink-0 relative"
            >
              {/* Resize Handle for AI Panel */}
              <div 
                className="absolute top-0 bottom-0 left-0 w-[8px] cursor-col-resize z-50 transform -translate-x-1/2 flex justify-center group"
                onMouseDown={(e) => {
                  e.preventDefault()
                  isResizingAiPanel.current = true
                  document.body.style.cursor = 'col-resize'
                }}
              >
                 <div className="w-[3px] h-full bg-transparent group-hover:bg-[#007acc] transition-none" />
              </div>
              <div className="h-[35px] border-b border-[#e5e5e5] flex items-center px-4 shrink-0 bg-[#f3f3f3]">
                <h2 className="text-[11px] font-bold text-[#616161] uppercase tracking-wider flex items-center gap-2">
                  <Bot size={14} className="text-[#007acc]" />
                  AI AGENT
                </h2>
                <div className="flex-1" />
                <button onClick={() => setRightPanelOpen(false)} className="text-[#616161] hover:text-[#333333] hover:bg-[#e5e5e5] p-1 rounded transition-none">
                  <X size={14} />
                </button>
              </div>
              <div className="flex-1 overflow-hidden bg-[#f3f3f3] flex flex-col">
                <AIChatPanel />
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      <StatusBar />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  )
}



const ArrowRight = ({ className, size }: { className?: string, size?: number }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
)

export default App
