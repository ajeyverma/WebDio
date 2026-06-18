import { create } from 'zustand'

export type AIProvider = 'gemini'

export interface AISettings {
  activeProvider: AIProvider
  geminiKey: string
  geminiModel: string
}

export interface AppState {
  // --- System & UI State ---
  hasGeminiKey: boolean
  activeProvider: string
  isSettingsOpen: boolean
  isRightPanelOpen: boolean
  projectPath: string
  projectFiles: any[]
  activeFileName: string | null
  openFiles: string[] 
  viewMode: 'editor' | 'preview'
  showHidden: boolean
  themeColor: string
  isLoading: boolean
  isCreatingTask: boolean
  isExecuting: boolean
  unsavedFiles: string[]
  isJoinedCommunity: boolean
  activeTab: string
  
  // --- AI State ---
  chatHistory: any[]
  currentPlan: string | null
  currentTask: string | null
  isPlanMode: boolean
  availableGeminiModels: string[]
  settings: AISettings

  // --- Community State ---
  serverIp: string
  communityStatus: string
  communityName: string
  communityUsers: string[]
  communityMessages: any[]
  sharedProjects: Array<{ nodeId: string, projectName: string, user: string, permission: 'read' | 'write' }>
  openSharedProjects: Array<{ nodeId: string, projectName: string, user: string, files: any[], permission: 'read' | 'write', color: string }>
  nodeId: string | null

  refreshCommunity: () => Promise<void>
  
  // --- Core Actions ---
  setHasGeminiKey: (val: boolean) => void
  setActiveProvider: (provider: string) => void
  setSettingsOpen: (open: boolean) => void
  setRightPanelOpen: (open: boolean) => void
  setProjectPath: (path: string) => void
  setProjectFiles: (files: any[]) => void
  setActiveFileName: (name: string | null) => void
  closeFile: (name: string) => void
  setViewMode: (mode: 'editor' | 'preview') => void
  setShowHidden: (val: boolean) => void
  setThemeColor: (color: string) => void
  setLoading: (loading: boolean) => void
  setActiveTab: (tab: string) => void
  
  // --- AI Actions ---
  addChatMessage: (msg: any) => void
  setCurrentPlan: (plan: string | null) => void
  setIsPlanMode: (val: boolean) => void
  loadSettings: () => Promise<void>
  setSettings: (newSettings: AISettings) => Promise<void>
  fetchGeminiModels: (key: string) => Promise<void>
  saveProjectFiles: () => Promise<void>
  updateFileContent: (path: string, content: string) => void

  // --- Project Actions ---
  syncProjectFromDisk: () => Promise<void>
  openProject: () => Promise<void>
  createNewFile: (name: string) => Promise<void>
  generateTaskFromPlan: () => Promise<void>
  revertFiles: (previousFiles: any[]) => Promise<void>

  // --- Community Actions ---
  setCommunityName: (name: string) => void
  joinCommunity: (name: string) => Promise<void>
  sendCommunityMessage: (payload: any) => void
  setCommunityStatus: (status: string) => void
  setServerIp: (ip: string) => void
  leaveCommunity: () => void
  closeSharedProject: (nodeId: string, projectName: string) => void
  initCommunity: () => Promise<void>
   shareCurrentProject: (permission?: 'read' | 'write') => void
   stopSharingProject: () => void
   openSharedProject: (nodeId: string, projectName: string, user: string, permission: 'read' | 'write') => void
   cycleThemeColor: () => void
   executeFromPlan: () => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  // Defaults
  hasGeminiKey: false,
  activeProvider: 'gemini',
  isSettingsOpen: false,
  isRightPanelOpen: true,
  projectPath: '',
  projectFiles: [],
  activeFileName: null,
  openFiles: [],
  viewMode: 'editor',
  showHidden: false,
  themeColor: '#007acc',
  isLoading: false,
  isCreatingTask: false,
  isExecuting: false,
  unsavedFiles: [],
  isJoinedCommunity: false,
  activeTab: 'home',
  chatHistory: [],
  currentPlan: null,
  currentTask: null,
  isPlanMode: false,
  availableGeminiModels: [],
  settings: {
    activeProvider: 'gemini',
    geminiKey: '',
    geminiModel: 'gemini-1.5-flash'
  },
  serverIp: '127.0.0.1',
  communityStatus: 'Scanning...',
  communityName: '',
  communityUsers: [],
  communityMessages: [],
  sharedProjects: [],
  openSharedProjects: [],
  nodeId: null,

  // --- Basic Setters ---
  setHasGeminiKey: (val) => set({ hasGeminiKey: val }),
  setActiveProvider: (provider) => set({ activeProvider: provider }),
  setSettingsOpen: (open) => set({ isSettingsOpen: open }),
  setRightPanelOpen: (open) => set({ isRightPanelOpen: open }),
  setProjectPath: (path) => {
    set({ projectPath: path })
    const { settings, setSettings } = get()
    const pData = settings.projectData?.[path]
    set({ 
      currentPlan: pData?.plan || null, 
      currentTask: pData?.task || null 
    })
    setSettings({ ...settings, lastProjectPath: path })
  },
  setProjectFiles: (files) => set({ projectFiles: files }),
  setActiveFileName: (name) => {
    if (name && !get().openFiles.includes(name)) {
      set(state => ({ openFiles: [...state.openFiles, name], activeFileName: name }))
    } else {
      set({ activeFileName: name })
    }
  },
  closeFile: (name) => set(state => {
    const newOpenFiles = state.openFiles.filter(f => f !== name)
    const newActive = state.activeFileName === name ? (newOpenFiles[0] || null) : state.activeFileName
    return { openFiles: newOpenFiles, activeFileName: newActive }
  }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setShowHidden: (val) => set({ showHidden: val }),
  setThemeColor: (color) => {
    set({ themeColor: color })
    const { settings, setSettings } = get()
    setSettings({ ...settings, themeColor: color })
  },
  setLoading: (loading) => set({ isLoading: loading }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  
  addChatMessage: (msg) => set(state => ({ chatHistory: [...state.chatHistory, msg] })),
  setCurrentPlan: (plan) => {
    set({ currentPlan: plan })
    const { projectPath, settings, setSettings } = get()
    if (projectPath) {
      const projectData = { ...(settings.projectData || {}) }
      projectData[projectPath] = { ...(projectData[projectPath] || {}), plan: plan || undefined }
      setSettings({ ...settings, projectData })
    }
  },
  setIsPlanMode: (val) => set({ isPlanMode: val }),

  updateFileContent: (path, content) => {
    set(state => {
      const newFiles = state.projectFiles.map(f => f.name === path ? { ...f, content } : f)
      const newUnsaved = new Set(state.unsavedFiles)
      newUnsaved.add(path)
      return { projectFiles: newFiles, unsavedFiles: Array.from(newUnsaved) }
    })
  },

  // --- System Logic ---
  loadSettings: async () => {
    // @ts-ignore
    const settings = await window.api.getSettings()
    if (settings) {
      const lastPath = settings.lastProjectPath || ''
      set({ 
        settings, 
        hasGeminiKey: !!settings.geminiKey,
        themeColor: settings.themeColor || '#007acc',
        projectPath: lastPath,
        currentPlan: (lastPath && settings.projectData?.[lastPath]?.plan) || null,
        currentTask: (lastPath && settings.projectData?.[lastPath]?.task) || null
      })
      
      if (lastPath) {
        // @ts-ignore
        const files = await window.api.readProject(settings.lastProjectPath)
        set({ projectFiles: files })
      }


    }
  },
  setSettings: async (newSettings) => {
    // @ts-ignore
    const success = await window.api.setSettings(newSettings)
    if (success) {
      set({ settings: newSettings, hasGeminiKey: !!newSettings.geminiKey })
    }
  },
  fetchGeminiModels: async (key) => {
     // @ts-ignore
     const models = await window.api.fetchGeminiModels(key)
     if (models) set({ availableGeminiModels: models })
  },

  saveProjectFiles: async () => {
    const { projectPath, projectFiles } = get()
    if (!projectPath) return
    // @ts-ignore
    await window.api.writeProject(projectPath, projectFiles)
    set({ unsavedFiles: [] })
  },

  // --- Project Actions ---
  syncProjectFromDisk: async () => {
    const { projectPath } = get()
    if (!projectPath) return
    // @ts-ignore
    const files = await window.api.readProject(projectPath)
    set({ projectFiles: files })
  },
  openProject: async () => {
    // @ts-ignore
    const path = await window.api.selectFolder()
    if (path) {
      get().setProjectPath(path)
      // @ts-ignore
      const files = await window.api.readProject(path)
      set({ projectFiles: files })
    }
  },
  cycleThemeColor: () => {
    const colors = ['#007acc', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#009688', '#4caf50', '#ff9800', '#ff5722', '#795548', '#607d8b']
    const current = get().themeColor
    const nextIdx = (colors.indexOf(current) + 1) % colors.length
    get().setThemeColor(colors[nextIdx])
  },
  createNewFile: async (name) => {
    const { projectPath, syncProjectFromDisk } = get()
    if (!projectPath) return
    // @ts-ignore
    const success = await window.api.writeFile(projectPath, name, '')
    if (success) {
      await syncProjectFromDisk()
      get().setActiveFileName(name)
      set({ viewMode: 'editor' })
    }
  },
  revertFiles: async (previousFiles: any[]) => {
    const state = get()
    if (state.projectPath) {
       const currentFiles = state.projectFiles
       const filesToDelete = currentFiles.filter(c => !previousFiles.some(p => p.name === c.name))
       
       for (const f of filesToDelete) {
         // @ts-ignore
         const targetPath = await window.api.join(state.projectPath, f.name)
         // @ts-ignore
         await window.api.deleteEntry(targetPath)
       }
       
       // @ts-ignore
       await window.api.writeProject(state.projectPath, previousFiles)
       await get().syncProjectFromDisk()
       get().addChatMessage({ role: 'agent', content: '⏪ Reverted workspace to the state before that generation.', type: 'code' })
    } else {
       set({ projectFiles: previousFiles })
       get().addChatMessage({ role: 'agent', content: '⏪ Reverted memory files to the state before that generation.', type: 'code' })
    }
  },
  generateTaskFromPlan: async () => {
    const { currentPlan } = get()
    if (!currentPlan) return

    set({ isCreatingTask: true })
    try {
      const taskPrompt = `You are Antigravity, a world-class senior AI coding assistant.
Your task is to convert an APPLICATION IMPLEMENTATION PLAN into a single, highly specific CODER TASK.

STRATEGIC CONTEXT (THE PLAN):
${currentPlan}

INSTRUCTIONS:
1. Examine the plan and identify the very first actionable code change required.
2. Formulate a task that points exactly to the file and line number where the work should begin.
3. Your response MUST be formatted EXPLICITLY as follows, using relative paths and code context:

path/to/file.tsx:line:column
line-2| [context]
line-1| [context]
line  | [target line for change]
      | ^ [pointer exactly at the character to start editing]
line+1| [context]
line+2| [context]

[Short, punchy instruction for the human developer to follow]

Example Output:
src/renderer/src/App.tsx:429:18
427|  
428|                      </div>
429|                    </div>
   |                    ^
430|                  </motion.div>
431|                )}

Implement the first logical step from the Plan above.

IMPORTANT:
- DO NOT add conversational filler.
- DO NOT use markdown code blocks (\`\`\`).
- ONLY output the task in the requested format.
- Ensure the line numbers and context are realistic or based on your understanding of the codebase.`

      // @ts-ignore
      const task = await window.api.aiChat({ prompt: taskPrompt })
      set({ currentTask: task, viewMode: 'editor', isPlanMode: false })
      
      const { projectPath, settings: currentSettings, setSettings } = get()
      if (projectPath) {
        const projectData = { ...(currentSettings.projectData || {}) }
        projectData[projectPath] = { ...(projectData[projectPath] || {}), task }
        setSettings({ ...currentSettings, projectData })
      }
    } catch (err) {
      console.error(err)
    } finally {
      set({ isCreatingTask: false })
    }
  },

  executeFromPlan: async () => {
    const { currentPlan, projectPath, setProjectFiles, setActiveFileName, setViewMode, addChatMessage, syncProjectFromDisk } = get()
    if (!currentPlan) return

    set({ isExecuting: true })
    addChatMessage({ role: 'agent', content: '🚀 Building your website from the plan... Generating multi-file project.', type: 'text' })

    try {
      const executePrompt = `You are a world-class senior frontend developer tasked with DIRECTLY BUILDING a complete multi-file website.

You have been given an implementation plan:
${currentPlan}

Your job is to turn this plan into a complete, working, beautiful website split into SEPARATE FILES.

OUTPUT FORMAT — YOU MUST USE THIS EXACT FORMAT:
Output each file separated by a file marker like this:

=== FILE: index.html ===
[full html content here]

=== FILE: styles.css ===
[full css content here]

=== FILE: app.js ===
[full javascript content here]

You may also create additional files if needed (e.g. about.html, data.json) using the same === FILE: filename === marker.

STRICT RULES:
1. index.html must link to styles.css via <link rel="stylesheet" href="styles.css"> in the <head>.
2. index.html must link to app.js via <script src="app.js"></script> at the bottom of <body>.
3. styles.css must contain ALL styles. Pure CSS only — NO Tailwind or CSS frameworks.
4. app.js must contain ALL JavaScript. Vanilla JS only.
5. You MAY use:
   - Google Fonts via <link> in index.html
   - Lucide icons via <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script> in index.html
6. The design MUST be PREMIUM, MODERN, and POLISHED:
   - Use smooth gradients, glassmorphism, dark or vibrant color themes
   - Add micro-animations and hover effects using CSS keyframes and transitions
   - Use a Google Font (e.g., Inter, Outfit, or Roboto) for all typography
   - The result must look like a professional $10,000 agency site — NOT a default browser page
7. All features described in the plan must be FULLY FUNCTIONAL and interactive.
8. DO NOT use any markdown code blocks. Output ONLY the file markers and content.

Build the complete multi-file website now based on the plan above.`

      // @ts-ignore
      const response = await window.api.aiChat({ prompt: executePrompt })

      // Parse multi-file output: === FILE: filename ===
      const fileRegex = /===\s*FILE:\s*(.+?)\s*===\n([\s\S]*?)(?====\s*FILE:|\s*$)/g
      const generatedFiles: { name: string; content: string; language: string }[] = []
      let match: RegExpExecArray | null

      while ((match = fileRegex.exec(response)) !== null) {
        const fileName = match[1].trim()
        const content = match[2].trim()
        const ext = fileName.split('.').pop() || ''
        const language = ext === 'html' ? 'html' : ext === 'css' ? 'css' : ext === 'js' ? 'javascript' : ext === 'json' ? 'json' : 'plaintext'
        generatedFiles.push({ name: fileName, content, language })
      }

      // Fallback: if no markers found, treat response as single index.html
      if (generatedFiles.length === 0) {
        const htmlMatch = response.match(/<!DOCTYPE html>[\s\S]*/i)
        if (htmlMatch) {
          generatedFiles.push({ name: 'index.html', content: htmlMatch[0].trim(), language: 'html' })
        }
      }

      if (generatedFiles.length === 0) {
        addChatMessage({ role: 'agent', content: "Couldn't parse a valid website from the response. Please try again.", type: 'text' })
        return
      }

      const stateBefore = JSON.parse(JSON.stringify(get().projectFiles || []))

      // Write each file to the project folder on disk (if a project is open)
      if (projectPath) {
        for (const file of generatedFiles) {
          // @ts-ignore
          await window.api.writeFile(projectPath, file.name, file.content)
        }
        await syncProjectFromDisk()
        addChatMessage({ role: 'agent', content: `✅ ${generatedFiles.length} files written to project: ${generatedFiles.map(f => f.name).join(', ')}`, type: 'code', previousFiles: stateBefore })
      } else {
        // No project open — load into memory only
        setProjectFiles(generatedFiles)
        addChatMessage({ role: 'agent', content: `✅ ${generatedFiles.length} files generated in workspace: ${generatedFiles.map(f => f.name).join(', ')}`, type: 'code', previousFiles: stateBefore })
      }

      setActiveFileName('index.html')
      setViewMode('preview')

    } catch (err) {
      addChatMessage({ role: 'agent', content: `Execute error: ${(err as Error).message}`, type: 'text' })
    } finally {
      set({ isExecuting: false })
    }
  },

  // --- Community Actions ---
  setCommunityName: (name) => set({ communityName: name }),
  joinCommunity: async (name) => {
    // @ts-ignore
    const res = await window.api.joinCommunity(name)
    if (res.success) {
      set({ communityName: name, serverIp: res.localIp, isJoinedCommunity: true })
    }
  },
  sendCommunityMessage: (payload) => {
    // @ts-ignore
    window.api.sendCommunityMessage(payload)
    if (!get().communityMessages.some(m => m.id === payload.id)) {
      set(state => ({ communityMessages: [...state.communityMessages, payload] }))
    }
  },
  setCommunityStatus: (status) => set({ communityStatus: status }),
  setServerIp: (ip) => set({ serverIp: ip }),
  leaveCommunity: () => {
    // @ts-ignore
    if (window.api.leaveCommunity) window.api.leaveCommunity()
    set({ isJoinedCommunity: false, communityUsers: [], communityMessages: [] })
  },
  closeSharedProject: (nodeId, projectName) => {
     set(state => ({
        openSharedProjects: state.openSharedProjects.filter(p => !(p.nodeId === nodeId && p.projectName === projectName)),
        openFiles: state.openFiles.filter(f => !f.startsWith(`shared-${nodeId}/`)),
        activeFileName: state.activeFileName?.startsWith(`shared-${nodeId}/`) ? (state.openFiles.find(f => !f.startsWith(`shared-${nodeId}/`)) || null) : state.activeFileName
     }))
  },
  initCommunity: async () => {
    // @ts-ignore
    window.api.onProjectChanged(() => {
       get().syncProjectFromDisk()
    })

    // @ts-ignore
    window.api.onCommunityStatus((status) => set({ communityStatus: status }))
    // @ts-ignore
    window.api.onCommunityPeer((peer) => set(state => {
       if (peer.name === 'Guest') return state
       const newUsers = Array.from(new Set([...state.communityUsers, peer.name]))
       return { communityUsers: newUsers }
    }))
    // @ts-ignore
    window.api.onCommunityMessage((msg) => {
       const state = get()
        if (msg.type === 'project-unshare') {
           set(state => ({
              sharedProjects: state.sharedProjects.filter(p => !(p.projectName === msg.projectName && p.nodeId === msg.ownerId)),
              openSharedProjects: state.openSharedProjects.filter(p => !(p.projectName === msg.projectName && p.nodeId === msg.ownerId))
           }))
           return
        }

        if (msg.type === 'project-list-request') {
           const myProj = state.sharedProjects.find(p => p.nodeId === 'me')
           if (myProj) {
              // Re-broadcast my project info
              // @ts-ignore
              window.api.sendCommunityMessage({
                 type: 'project-share',
                 projectName: myProj.projectName,
                 user: state.communityName || 'Guest',
                 ownerId: state.nodeId,
                 permission: myProj.permission,
                 id: Math.random().toString(36).substring(7)
              })
           }
           return
        }

        if (msg.type === 'project-share') {
          const exists = state.sharedProjects.some(p => p.projectName === msg.projectName && p.user === msg.user && p.nodeId === msg.ownerId)
          if (!exists) {
            set({ sharedProjects: [...state.sharedProjects, { 
              nodeId: msg.ownerId, 
              projectName: msg.projectName, 
              user: msg.user, 
              permission: msg.permission || 'read' 
            }] })
          }
          return
        }

       if (msg.type === 'project-request-tree') {
         const currentProjectName = state.projectPath?.split(/[\\/]/).pop()
         // Target check via nodeId
         if (msg.toId === state.nodeId && msg.projectName === currentProjectName) {
           // Respond with our project files
           // @ts-ignore
           window.api.sendCommunityMessage({
             type: 'project-tree',
             projectName: currentProjectName,
             user: state.communityName || 'Guest',
             fromId: state.nodeId,
             requesterId: msg.requesterId, // direct back to requester
             files: state.projectFiles
           })
         }
         return
       }

       if (msg.type === 'project-tree') {
         // Update openSharedProjects if this matches the ownerId we requested
         const targetIdx = state.openSharedProjects.findIndex(p => p.projectName === msg.projectName && p.nodeId === msg.fromId)
         if (targetIdx !== -1) {
            const updated = [...state.openSharedProjects]
            updated[targetIdx] = { ...updated[targetIdx], files: msg.files }
            set({ openSharedProjects: updated })
         }
         return
       }

       const exists = state.communityMessages.some(m => m.id === msg.id)
       if (exists) return
       set({ communityMessages: [...state.communityMessages, msg] })
    })
    // @ts-ignore
    const info = await window.api.getCommunityInfo()
    if (info) {
       set({ serverIp: info.localIp, communityStatus: info.status, nodeId: info.nodeId })
    }
  },
  
  shareCurrentProject: (permission: 'read' | 'write' = 'read') => {
     const state = get()
     const projectPath = state.projectPath
     if (!projectPath) return

     const projectName = projectPath.split(/[\\/]/).pop() || 'Unnamed Project'
     const payload = {
        type: 'project-share',
        projectName,
        user: state.communityName || 'Guest',
        ownerId: state.nodeId,
        permission,
        id: Math.random().toString(36).substring(7)
     }
     
     // @ts-ignore
     window.api.sendCommunityMessage(payload)
     
     set(state => ({
        sharedProjects: [...state.sharedProjects, { nodeId: 'me', projectName, user: state.communityName || 'Guest', permission }]
     }))
  },

  stopSharingProject: () => {
     const state = get()
     const myShared = state.sharedProjects.find(p => p.nodeId === 'me')
     if (!myShared) return

     const payload = {
        type: 'project-unshare',
        projectName: myShared.projectName,
        ownerId: state.nodeId,
        id: Math.random().toString(36).substring(7)
     }

     // @ts-ignore
     window.api.sendCommunityMessage(payload)
     
     set(state => ({
        sharedProjects: state.sharedProjects.filter(p => p.nodeId !== 'me')
     }))
  },

  openSharedProject: (nodeId: string, projectName: string, user: string, permission: 'read' | 'write') => {
     const state = get()
     const exists = state.openSharedProjects.some(p => p.projectName === projectName && p.nodeId === nodeId)
     if (!exists) {
        const requesterId = Math.random().toString(36).substring(7)
        const colors = [
          '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', 
          '#03a9f4', '#00bcd4', '#009688', '#4caf50', '#8bc34a', 
          '#cddc39', '#ffeb3b', '#ffc107', '#ff9800', '#ff5722',
          '#795548', '#607d8b'
        ]
        // Use a more deterministic way to pick a color based on the project name/nodeId 
        // to avoid simple sequential overlaps
        const hash = (projectName + nodeId).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
        const color = colors[hash % colors.length]
        
        set(state => ({
           openSharedProjects: [...state.openSharedProjects, { nodeId, projectName, user, files: [], permission, color }]
        }))
        // Request the project tree
        const payload = { type: 'project-request-tree', toId: nodeId, projectName, requesterId }
        // @ts-ignore
        window.api.sendCommunityMessage(payload)
     }
  },

  refreshCommunity: async () => {
    // @ts-ignore
    await window.api.refreshCommunity()
    
    // Request current shared projects from others
    // @ts-ignore
    window.api.sendCommunityMessage({ type: 'project-list-request' })

    set(state => ({ 
       sharedProjects: state.sharedProjects.filter(p => p.nodeId === 'me'),
       openSharedProjects: [] 
    }))
  }
}))
