import React, { useState, useEffect } from 'react'
import { Sparkles, Command, Search, Play, Github, Share2, Bot, Palette, Eye, Code } from 'lucide-react'
import { useAppStore } from '../stores/useAppStore'

type MenuItemType = { label?: string; shortcut?: string; action?: () => void; disabled?: boolean; type?: 'separator' | 'item' }

const MENUS: Record<string, MenuItemType[]> = {
  File: [
    { label: 'New File', shortcut: 'Ctrl+N', action: () => useAppStore.getState().createNewFile() },
    { type: 'separator' },
    { label: 'Open Folder...', shortcut: 'Ctrl+K Ctrl+O', action: () => useAppStore.getState().openProject() },
    { type: 'separator' },
    { label: 'Save', shortcut: 'Ctrl+S', action: () => useAppStore.getState().saveProjectFiles() },
    { type: 'separator' },
    { label: 'Exit', shortcut: 'Alt+F4', action: () => window.close() }
  ],
  Edit: [
    { label: 'Undo', shortcut: 'Ctrl+Z', action: () => document.execCommand('undo') },
    { label: 'Redo', shortcut: 'Ctrl+Y', action: () => document.execCommand('redo') },
    { type: 'separator' },
    { label: 'Cut', shortcut: 'Ctrl+X', action: () => document.execCommand('cut') },
    { label: 'Copy', shortcut: 'Ctrl+C', action: () => document.execCommand('copy') },
    { label: 'Paste', shortcut: 'Ctrl+V', action: async () => {
        try {
           const text = await navigator.clipboard.readText()
           document.execCommand('insertText', false, text)
        } catch (err) {
           document.execCommand('paste')
        }
    }}
  ]
}

const TitleBar: React.FC = () => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const { viewMode, setViewMode, activeFileName, setActiveFileName, projectPath } = useAppStore()

  useEffect(() => {
    const handleClick = () => setActiveMenu(null)
    if (activeMenu) window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [activeMenu])

  return (
    <div className="h-9 w-full drag bg-[#f3f3f3] border-b border-[#e5e5e5] flex items-center justify-between px-3 z-50 select-none">
      {/* Left: VS Code Brand & Menu */}
      <div className="flex items-center gap-1 no-drag">
        <div className="flex items-center gap-2 mr-3 px-1">
           <div className="w-4 h-4 rounded-sm bg-[#007acc] flex items-center justify-center text-white">
              <Sparkles size={10} />
           </div>
        </div>

        <div className="flex items-center relative">
           {Object.keys(MENUS).map(menuName => (
             <div key={menuName} className="relative">
               <button 
                onClick={(e) => {
                  e.stopPropagation()
                  setActiveMenu(activeMenu === menuName ? null : menuName)
                }}
                onMouseEnter={() => {
                  if (activeMenu && activeMenu !== menuName) {
                    setActiveMenu(menuName)
                  }
                }}
                className={`text-[13px] font-medium px-2.5 py-1 rounded transition-none outline-none ${
                   activeMenu === menuName ? 'bg-[#e5e5e5] text-[#333333]' : 'text-[#3b3b3b] hover:bg-[#e5e5e5]'
                }`}
               >
                 {menuName}
               </button>
               
               {activeMenu === menuName && (
                 <div 
                   onMouseDown={e => e.stopPropagation()}
                   className="absolute left-0 top-[100%] min-w-[240px] bg-[#f3f3f3] border border-[#e5e5e5] shadow-lg rounded-md py-1.5 z-50 flex flex-col"
                 >
                    {MENUS[menuName].map((item, idx) => (
                      item.type === 'separator' ? (
                        <div key={idx} className="h-[1px] bg-[#e5e5e5] my-1 w-full" />
                      ) : (
                        <button
                          key={idx}
                          disabled={item.disabled}
                          onClick={() => {
                             if (item.action) item.action()
                             setActiveMenu(null)
                          }}
                          className={`w-full text-left px-6 py-1.5 flex flex-row items-center justify-between text-[13px] transition-none group ${
                             item.disabled ? 'text-[#a1a1aa]' : 'text-[#333333] hover:bg-[#007acc] hover:text-white'
                          }`}
                        >
                           <span>{item.label}</span>
                           {item.shortcut && <span className={`text-[11px] ${item.disabled ? 'text-[#d4d4d8]' : 'text-[#858585] group-hover:text-white/80'}`}>{item.shortcut}</span>}
                        </button>
                      )
                    ))}
                 </div>
               )}
             </div>
           ))}
        </div>
      </div>

      {/* Middle Area */}
      <div className="flex-1 flex justify-center drag">
      </div>

      {/* Right: Actions & Window Controls Padding */}
      <div className="flex items-center gap-3 no-drag mr-[140px]">
         {projectPath && (
           <button
             onClick={async () => {
               const state = useAppStore.getState()
               
               // 1. If we have a local project, start a static server at that location
               if (state.projectPath) {
                 try {
                   // @ts-ignore
                   const url = await window.api.startServer(state.projectPath)
                   // @ts-ignore
                   window.api.openExternal(url)
                   return
                 } catch (err) {
                   console.error("Failed to start server:", err)
                   // Fallback to direct file preview if server fails
                 }
               }

               // 2. Fallback for standalone generated code
               const code = state.generatedCode || 
                            state.projectFiles.find(f => f.name === 'index.html')?.content || 
                            state.projectFiles.find(f => f.name === 'bundle.html')?.content ||
                            state.projectFiles.find(f => f.name.endsWith('.html'))?.content || ''
               
               if (code) {
                 const dataUri = `data:text/html;charset=utf-8,${encodeURIComponent(code)}`
                 // @ts-ignore
                 window.api.openExternal(dataUri)
               } else {
                 alert("No project location or previewable HTML found.")
               }
             }}
             className="flex items-center gap-1.5 px-2.5 py-1 rounded transition-all text-[#616161] hover:text-[#007acc] hover:bg-[#e5e5e5] font-medium text-[11px]"
           >
             <Eye size={13} />
             <span>Preview</span>
           </button>
         )}

         <button onClick={() => useAppStore.getState().cycleThemeColor()} className="text-[#616161] hover:text-[#3b3b3b] p-1 rounded transition-none" title="Cycle Theme Color">
            <Palette size={14} />
         </button>
         
         <button onClick={() => useAppStore.getState().setRightPanelOpen(!useAppStore.getState().isRightPanelOpen)} className="text-[#007acc] hover:bg-[#e5e5e5] p-1 rounded transition-none flex items-center gap-1.5" title="Toggle AI Agent">
            <Bot size={15} />
         </button>
      </div>
    </div>
  )
}

export default TitleBar
