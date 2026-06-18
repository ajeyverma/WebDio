import { contextBridge, ipcRenderer } from 'electron'
import { exposeElectronAPI } from '@electron-toolkit/preload'
import path from 'path'

const api = {
  // Add custom IPC methods here
  aiChat: (data: any) => ipcRenderer.invoke('ai:chat', data),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (settings: any) => ipcRenderer.invoke('settings:set', settings),
  fetchGeminiModels: (key: string) => ipcRenderer.invoke('ai:fetch-gemini-models', key),
  
  // Project APIs
  selectFolder: () => ipcRenderer.invoke('project:select-folder'),
  readProject: (path: string) => ipcRenderer.invoke('project:read', path),
  writeProject: (path: string, files: any[]) => ipcRenderer.invoke('project:write', { path, files }),
  writeFile: (path: string, fileName: string, content: string) => ipcRenderer.invoke('project:write-file', { path, fileName, content }),
  createFolder: (path: string, folderName: string) => ipcRenderer.invoke('project:create-folder', { path, folderName }),
  renameEntry: (oldPath: string, newPath: string) => ipcRenderer.invoke('fs:rename', { oldPath, newPath }),
  deleteEntry: (targetPath: string) => ipcRenderer.invoke('fs:delete', targetPath),
  copyEntry: (srcPath: string, destPath: string) => ipcRenderer.invoke('fs:copy', { srcPath, destPath }),
  
  // Path Utilities
  join: (...args: string[]) => path.join(...args),
  dirname: (p: string) => path.dirname(p),
  basename: (p: string) => path.basename(p),

  // Community APIs
  joinCommunity: (name: string) => ipcRenderer.invoke('community:join', name),
  getCommunityInfo: () => ipcRenderer.invoke('community:get-info'),
  refreshCommunity: () => ipcRenderer.invoke('community:refresh'),
  sendCommunityMessage: (payload: any) => ipcRenderer.invoke('community:send', payload),
  onCommunityStatus: (callback: any) => {
    ipcRenderer.removeAllListeners('community:status-update')
    ipcRenderer.on('community:status-update', (_event, status) => callback(status))
  },
  onCommunityPeer: (callback: any) => {
    ipcRenderer.removeAllListeners('community:peer-found')
    ipcRenderer.on('community:peer-found', (_event, peer) => callback(peer))
  },
  onCommunityMessage: (callback: any) => {
    ipcRenderer.removeAllListeners('community:message-received')
    ipcRenderer.on('community:message-received', (_event, msg) => callback(msg))
  },
  openExternal: (url: string) => ipcRenderer.invoke('shell:open-external', url),
  startServer: (path: string) => ipcRenderer.invoke('server:start', path),
  onProjectChanged: (callback: any) => {
    ipcRenderer.removeAllListeners('project:changed')
    ipcRenderer.on('project:changed', () => callback())
  },
}

if (process.contextIsolated) {
  try {
    exposeElectronAPI()
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
