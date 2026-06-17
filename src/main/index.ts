import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    },
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: 'rgba(0,0,0,0)',
      symbolColor: '#616161',
      height: 36
    }
  })

  mainWindow.on('ready-to-show', () => {
    console.log('ready-to-show fired')
    mainWindow.maximize()
  })
  
  // Call init immediately instead of waiting for ready-to-show to prevent IPC missing handler
  communityService.init(mainWindow)

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.instantsaas.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// IPC Handlers
import { generateCode, detectOllama, fetchGeminiModels } from './services/aiService'
import { getSettings, saveSettings } from './services/settingsService'
import { selectFolder, readProject, writeProject, writeFile, renameEntry, deleteEntry, copyEntry } from './services/projectService'
import { communityService } from './services/communityService'

ipcMain.handle('ai:chat', async (_event, { imageB64, imageBase64, prompt }) => {
  return await generateCode(imageB64 || imageBase64, prompt)
})

ipcMain.handle('ai:detect-ollama', async () => {
  return await detectOllama()
})

ipcMain.handle('ai:fetch-gemini-models', async (_event, key) => {
  return await fetchGeminiModels(key)
})

ipcMain.handle('settings:get', async () => {
  return getSettings()
})

ipcMain.handle('settings:set', async (_event, settings) => {
  if (!settings) {
    console.error('Main process: settings:set received UNDEFINED settings')
    return { success: false, error: 'Settings object is missing' }
  }

  console.log('Main process: settings:set received payload:', {
    hasGeminiKey: !!settings.geminiKey,
    activeProvider: settings.activeProvider
  })
  
  try {
    saveSettings(settings)
    return { success: true }
  } catch (err) {
    console.error('Main process: Failed to save settings:', err)
    return { success: false, error: String(err) }
  }
})

ipcMain.handle('shell:open-external', async (_event, url) => {
  return await shell.openExternal(url)
})

import { startStaticServer } from './services/serverService'

ipcMain.handle('server:start', async (_event, path) => {
  return await startStaticServer(path)
})

ipcMain.handle('project:select-folder', async () => {
  const window = BrowserWindow.getFocusedWindow()
  if (!window) return null
  return await selectFolder(window)
})

import { selectFolder, readProject, writeProject, writeFile, renameEntry, deleteEntry, copyEntry, watchProject } from './services/projectService'

let projectWatcher: any = null

ipcMain.handle('project:read', async (event, path) => {
  if (projectWatcher) {
    projectWatcher.close()
    projectWatcher = null
  }

  projectWatcher = watchProject(path, () => {
    event.sender.send('project:changed')
  })

  return await readProject(path)
})

ipcMain.handle('project:write', async (_event, { path, files }) => {
  return await writeProject(path, files)
})

ipcMain.handle('project:write-file', async (_event, { path, fileName, content }) => {
  return await writeFile(path, fileName, content)
})

ipcMain.handle('fs:rename', async (_event, { oldPath, newPath }) => {
  return await renameEntry(oldPath, newPath)
})

ipcMain.handle('fs:delete', async (_event, targetPath) => {
  return await deleteEntry(targetPath)
})

ipcMain.handle('fs:copy', async (_event, { srcPath, destPath }) => {
  return await copyEntry(srcPath, destPath)
})
