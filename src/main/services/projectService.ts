import { dialog, BrowserWindow } from 'electron'
import fs from 'fs'
import path from 'path'

export interface ProjectFile {
  name: string // This will now represent the RELATIVE path (e.g., "src/App.js")
  content: string
  language: string
}

const IGNORE_DIRS = ['node_modules', '.DS_Store', 'dist', 'out', '.next']

/**
 * Native folder picker
 */
export const selectFolder = async (window: BrowserWindow) => {
  const result = await dialog.showOpenDialog(window, {
    properties: ['openDirectory', 'createDirectory']
  })
  
  if (result.canceled) return null
  return result.filePaths[0]
}

/**
 * Recursively read files from a directory
 */
const walkDir = (basePath: string, currentPath: string, fileList: ProjectFile[] = []) => {
  const items = fs.readdirSync(currentPath)

  for (const item of items) {
    if (IGNORE_DIRS.includes(item)) continue

    const fullPath = path.join(currentPath, item)
    const stats = fs.statSync(fullPath)
    const relativePath = path.relative(basePath, fullPath).replace(/\\/g, '/')

    if (stats.isDirectory()) {
      walkDir(basePath, fullPath, fileList)
    } else if (stats.isFile()) {
      const ext = path.extname(item).toLowerCase()
      
      try {
        // Safety: Don't read files larger than 1MB to avoid memory issues in the IDE
        if (stats.size > 1024 * 1024) continue

        // Basic check for text-likeness or common web files
        const content = fs.readFileSync(fullPath, 'utf-8')
        let language = 'plaintext'
        if (ext === '.html') language = 'html'
        else if (ext === '.css') language = 'css'
        else if (['.js', '.jsx', '.ts', '.tsx'].includes(ext)) language = 'javascript'
        else if (ext === '.md') language = 'markdown'
        else if (ext === '.json') language = 'json'

        fileList.push({ name: relativePath, content, language })
      } catch (err) {
        console.error(`Failed to read file ${fullPath}:`, err)
      }
    }
  }

  return fileList
}

/**
 * Read all relevant web files from a folder recursively
 */
export const readProject = async (projectPath: string): Promise<ProjectFile[]> => {
  if (!fs.existsSync(projectPath)) return []
  return walkDir(projectPath, projectPath)
}

/**
 * Write multiple files to a folder (supporting relative paths)
 */
export const writeProject = async (projectPath: string, files: ProjectFile[]) => {
  if (!fs.existsSync(projectPath)) {
    fs.mkdirSync(projectPath, { recursive: true })
  }

  for (const file of files) {
    const fullPath = path.join(projectPath, file.name)
    const dirPath = path.dirname(fullPath)

    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true })
    }

    // Don't overwrite if it's identical
    if (fs.existsSync(fullPath)) {
      try {
         const existing = fs.readFileSync(fullPath, 'utf-8')
         if (existing === file.content) continue
      } catch (e) {}
    }
    
    fs.writeFileSync(fullPath, file.content, 'utf-8')
  }
}

/**
 * Rename a file or directory
 */
export const renameEntry = async (oldPath: string, newPath: string) => {
   if (fs.existsSync(oldPath)) {
      fs.renameSync(oldPath, newPath)
      return true
   }
   return false
}

/**
 * Remove a file or directory
 */
export const deleteEntry = async (targetPath: string) => {
   if (fs.existsSync(targetPath)) {
      const stats = fs.statSync(targetPath)
      if (stats.isDirectory()) {
         fs.rmSync(targetPath, { recursive: true, force: true })
      } else {
         fs.unlinkSync(targetPath)
      }
      return true
   }
   return false
}

/**
 * Copy a file or directory to a new location
 */
export const copyEntry = async (srcPath: string, destPath: string) => {
   if (!fs.existsSync(srcPath)) return false
   
   const stats = fs.statSync(srcPath)
   if (stats.isDirectory()) {
      fs.cpSync(srcPath, destPath, { recursive: true })
   } else {
      fs.copyFileSync(srcPath, destPath)
   }
   return true
}

/**
 * Write a single file
 */
export const writeFile = async (projectPath: string, fileName: string, content: string) => {
  const fullPath = path.join(projectPath, fileName)
  const dirPath = path.dirname(fullPath)

  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }

  fs.writeFileSync(fullPath, content, 'utf-8')
}

/**
 * Watch project directory for changes
 */
export const watchProject = (projectPath: string, callback: () => void) => {
  if (!fs.existsSync(projectPath)) return null

  const watcher = fs.watch(projectPath, { recursive: true }, (event, filename) => {
    if (filename) {
       // Ignore noisy/temp files
       if (IGNORE_DIRS.some(dir => filename.includes(dir))) return
       callback()
    }
  })

  return watcher
}
