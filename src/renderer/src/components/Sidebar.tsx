import React, { useState, useMemo, useEffect, useRef } from 'react'
import {
  Files,
  Clock,
  Box,
  ChevronDown,
  ChevronRight,
  FileCode,
  Braces,
  Folder,
  FolderOpen,
  Plus,
  Info,
  RotateCw,
  Eye,
  EyeOff,
  ListChecks,
  FilePlus,
  FolderPlus,
  Trash2,
  Copy,
  MoreVertical,
  Layout,
  File as FileIcon,
  Settings as SettingsIcon,
  Share2,
  Check,
  User,
  Globe,
  X
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../stores/useAppStore'
import CommunityPanel from '../features/Community/CommunityPanel'

interface SidebarProps {
  activeTab: string
  width?: number
  onResizeStart?: (e: React.MouseEvent) => void
}

interface TreeNode {
  name: string
  path: string
  type: 'file' | 'folder'
  children: Record<string, TreeNode>
  color?: string
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, width = 256, onResizeStart }) => {
  const {
    projectPath,
    projectFiles,
    activeFileName,
    setActiveFileName,
    setViewMode,
    showHidden,
    setShowHidden,
    syncProjectFromDisk,
    themeColor,
    openProject,
    createNewFile,
    createNewFolder,
    isCreatingFile,
    setIsCreatingFile,
    isCreatingFolder,
    setIsCreatingFolder,
    shareCurrentProject,
    stopSharingProject,
    sharedProjects,
    openSharedProjects,
    openSharedProject,
    closeSharedProject,
    communityName,
    setCommunityName,
    isJoinedCommunity,
    setActiveTab,
    refreshCommunity,
    selectedExplorerPath,
    setSelectedExplorerPath
  } = useAppStore()

  const isSharing = sharedProjects.some(p => p.nodeId === 'me')

  const [sharePermission, setSharePermission] = useState<'read' | 'write'>('read')

  const isSelectedPathFolder = useMemo(() => {
    if (!selectedExplorerPath) return false
    const file = projectFiles.find(f => f.name === selectedExplorerPath)
    return !!(file && file.isDirectory)
  }, [selectedExplorerPath, projectFiles])
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['root']))
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, path: string, type: 'file' | 'folder' } | null>(null)

  // File Ops State
  const [renamingPath, setRenamingPath] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [copiedEntry, setCopiedEntry] = useState<{ path: string, type: 'file' | 'folder', operation: 'copy' | 'cut' } | null>(null)

  const [newFileName, setNewFileName] = useState('')
  const [newFolderName, setNewFolderName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  const [draggedOverPath, setDraggedOverPath] = useState<string | null>(null)

  const handleDragStart = (e: React.DragEvent, path: string) => {
    e.dataTransfer.setData('text/plain', path)
    e.stopPropagation()
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDragEnter = (e: React.DragEvent, path: string) => {
    e.preventDefault()
    e.stopPropagation()
    setDraggedOverPath(path)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDraggedOverPath(null)
  }

  const handleDropEntry = async (e: React.DragEvent, targetPath: string, targetType: 'file' | 'folder') => {
    e.preventDefault()
    e.stopPropagation()
    setDraggedOverPath(null)

    const srcRelativePath = e.dataTransfer.getData('text/plain')
    if (!srcRelativePath || srcRelativePath === targetPath) return
    if (!projectPath) return

    // @ts-ignore
    const oldFullPath = window.api.join(projectPath, srcRelativePath)
    // @ts-ignore
    const fileName = window.api.basename(oldFullPath)

    let destFolderPath = targetPath
    if (targetType === 'file') {
      const parts = targetPath.split('/')
      parts.pop()
      destFolderPath = parts.join('/')
    }

    if (destFolderPath === srcRelativePath || destFolderPath.startsWith(srcRelativePath + '/')) {
      return
    }

    // @ts-ignore
    const newFullPath = window.api.join(projectPath, destFolderPath, fileName)

    // @ts-ignore
    const success = await window.api.renameEntry(oldFullPath, newFullPath)
    if (success) {
      syncProjectFromDisk()
    }
  }

  useEffect(() => {
    if (isCreatingFile) {
      inputRef.current?.focus()
    }
  }, [isCreatingFile])

  useEffect(() => {
    if (isCreatingFolder) {
      folderInputRef.current?.focus()
    }
  }, [isCreatingFolder])

  useEffect(() => {
    const handleClose = () => setContextMenu(null)
    if (contextMenu) {
      window.addEventListener('click', handleClose)
      window.addEventListener('contextmenu', handleClose)
    }
    return () => {
      window.removeEventListener('click', handleClose)
      window.removeEventListener('contextmenu', handleClose)
    }
  }, [contextMenu])

  const toggleFolder = (path: string) => {
    const newSet = new Set(expandedFolders)
    if (newSet.has(path)) newSet.delete(path)
    else newSet.add(path)
    setExpandedFolders(newSet)
  }

  // Transform flat files into a tree
  const projectTree = useMemo(() => {
    const root: TreeNode = { name: 'root', path: '', type: 'folder', children: {} }

    projectFiles.forEach(file => {
      const parts = file.name.split('/')

      // Completely hide .webdio directory from File Explorer
      if (parts[0] === '.webdio') {
        return
      }

      // Filter out hidden paths if showHidden is false
      if (!showHidden && parts.some((part: string) => part.startsWith('.'))) {
        return
      }

      let current = root
      parts.forEach((part: string, index: number) => {
        const isLast = index === parts.length - 1
        const currentPath = parts.slice(0, index + 1).join('/')

        if (!current.children[part]) {
          current.children[part] = {
            name: part,
            path: currentPath,
            type: (isLast && !file.isDirectory) ? 'file' : 'folder',
            children: {}
          }
        }
        current = current.children[part]
      })
    })

    return root
  }, [projectFiles, showHidden])

  // Process shared projects trees
  const sharedTrees = useMemo(() => {
    return openSharedProjects.map(proj => {
      const root: TreeNode = {
        name: proj.projectName,
        path: `shared-${proj.nodeId}`,
        type: 'folder',
        children: {},
        color: proj.color
      }

      proj.files.forEach((file: any) => {
        const parts = file.name.split('/')
        let current = root
        parts.forEach((part: string, index: number) => {
          const isLast = index === parts.length - 1
          const currentPath = `shared-${proj.nodeId}/${parts.slice(0, index + 1).join('/')}`

          if (!current.children[part]) {
            current.children[part] = {
              name: part,
              path: currentPath,
              type: (isLast && !file.isDirectory) ? 'file' : 'folder',
              children: {},
              color: proj.color
            }
          }
          current = current.children[part]
        })
      })

      return { nodeId: proj.nodeId, projectName: proj.projectName, user: proj.user, tree: root, color: proj.color }
    })
  }, [openSharedProjects, showHidden])

  // Helper to get file icon
  const getFileIcon = (fileName: string, color?: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase()
    if (color) return <Box size={16} style={{ color }} />
    if (ext === 'html') return <FileCode size={16} className="text-[#e34c26]" />
    if (ext === 'css') return <Braces size={16} className="text-[#264de4]" />
    if (['js', 'jsx', 'ts', 'tsx'].includes(ext || '')) return <FileCode size={16} className="text-[#f7df1e]" />
    if (ext === 'md') return <Info size={16} className="text-[#007acc]" />
    if (fileName.startsWith('.')) return <SettingsIcon size={16} className="text-[#616161]" />
    return <Box size={16} className="text-slate-400" />
  }

  const folderName = projectPath ? projectPath.split(/[\\/]/).pop() : 'NO FOLDER OPENED'

  const renderTree = (node: TreeNode, depth = 0) => {
    const sortedChildren = Object.values(node.children).sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
      return a.name.localeCompare(b.name)
    })

    return sortedChildren.map(child => {
      const isActive = selectedExplorerPath === child.path
      const isCut = copiedEntry && copiedEntry.path === child.path && copiedEntry.operation === 'cut'
      return (
        <div key={child.path}>
          {child.type === 'folder' ? (
            <div
              draggable
              onDragStart={(e) => handleDragStart(e, child.path)}
              onDragOver={handleDragOver}
              onDragEnter={(e) => handleDragEnter(e, child.path)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDropEntry(e, child.path, 'folder')}
              className={`flex items-center gap-1 px-4 py-[3px] cursor-pointer ${isActive ? 'bg-[#007acc] text-white' :
                draggedOverPath === child.path ? 'bg-sky-100 border-y border-[#007acc]/30' : 'hover:bg-[#e8e8e8] text-[#616161]'
                }`}
              style={{ paddingLeft: `${(depth * 12) + 12}px`, opacity: isCut ? 0.5 : 1 }}
              onClick={() => {
                setSelectedExplorerPath(child.path)
                toggleFolder(child.path)
              }}
              onContextMenu={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setContextMenu({ path: child.path, x: e.clientX, y: e.clientY, type: 'folder' })
              }}
            >
              {expandedFolders.has(child.path) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              {expandedFolders.has(child.path) ? <FolderOpen size={16} style={{ color: child.color || '#007acc' }} /> : <Folder size={16} style={{ color: child.color || '#007acc' }} />}

              {renamingPath === child.path ? (
                <input
                  autoFocus
                  className="bg-white text-[#333333] border border-[#007acc] outline-none px-1 text-[13px] w-full"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onBlur={() => handleRename(child.path)}
                  onKeyDown={e => e.key === 'Enter' && handleRename(child.path)}
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <div className="flex-1 flex flex-col min-w-0">
                  <span className={`text-[12px] truncate ${isActive ? 'text-white font-semibold' : (child.color ? '' : 'text-[#333333] font-medium')}`} style={{ color: isActive ? 'white' : (child.color || '#333333') }}>
                    {child.name}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <button
              draggable
              onDragStart={(e) => handleDragStart(e, child.path)}
              onDragOver={handleDragOver}
              onDragEnter={(e) => handleDragEnter(e, child.path)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDropEntry(e, child.path, 'file')}
              onContextMenu={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setContextMenu({ path: child.path, x: e.clientX, y: e.clientY, type: 'file' })
              }}
              onClick={() => {
                setActiveFileName(child.path)
                setViewMode('editor')
              }}
              className={`w-full text-left flex items-center justify-start gap-2 py-[3px] transition-none outline-none group ${isActive ? 'bg-[#007acc] text-white' :
                draggedOverPath === child.path ? 'bg-sky-50' : 'text-[#616161] hover:bg-[#e8e8e8]'
                }`}
              style={{ paddingLeft: `${(depth * 12) + 26}px`, opacity: isCut ? 0.5 : 1 }}
            >
              <span className="flex-shrink-0">
                {getFileIcon(child.name, child.color)}
              </span>
              {renamingPath === child.path ? (
                <input
                  autoFocus
                  className="bg-white text-[#333333] border border-[#007acc] outline-none px-1 text-[13px] w-full"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onBlur={() => handleRename(child.path)}
                  onKeyDown={e => e.key === 'Enter' && handleRename(child.path)}
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <div className="flex-1 flex flex-col min-w-0">
                  <span className={`text-[12px] truncate ${isActive ? 'text-white font-semibold' : (child.color ? '' : 'text-[#333333] font-medium')}`} style={{ color: isActive ? 'white' : (child.color || '#333333') }}>
                    {child.name}
                  </span>
                </div>
              )}
            </button>
          )}

          {child.type === 'folder' && expandedFolders.has(child.path) && (
            <div>
              {/* Nested Creation Input if child is selected */}
              {isCreatingFile && selectedExplorerPath === child.path && (
                <div
                  className="flex items-center gap-2 px-6 py-1 bg-white border border-[#007acc] mx-2 my-1 shadow-sm rounded-sm"
                  style={{ marginLeft: `${(depth * 12) + 26}px` }}
                >
                  <FileIcon size={14} className="text-[#616161]" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    onBlur={() => setIsCreatingFile(false)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newFileName.trim()) {
                        createNewFile(`${child.path}/${newFileName}`)
                        setIsCreatingFile(false)
                        setNewFileName('')
                      } else if (e.key === 'Escape') {
                        setIsCreatingFile(false)
                        setNewFileName('')
                      }
                    }}
                    placeholder="File name..."
                    className="flex-1 bg-transparent border-none outline-none text-[12px] text-[#333333] italic"
                  />
                </div>
              )}
              {isCreatingFolder && selectedExplorerPath === child.path && (
                <div
                  className="flex items-center gap-2 px-6 py-1 bg-white border border-[#007acc] mx-2 my-1 shadow-sm rounded-sm"
                  style={{ marginLeft: `${(depth * 12) + 26}px` }}
                >
                  <Folder size={14} className="text-[#007acc]" />
                  <input
                    ref={folderInputRef}
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onBlur={() => setIsCreatingFolder(false)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newFolderName.trim()) {
                        createNewFolder(`${child.path}/${newFolderName}`)
                        setIsCreatingFolder(false)
                        setNewFolderName('')
                      } else if (e.key === 'Escape') {
                        setIsCreatingFolder(false)
                        setNewFolderName('')
                      }
                    }}
                    placeholder="Folder name..."
                    className="flex-1 bg-transparent border-none outline-none text-[12px] text-[#333333] italic"
                  />
                </div>
              )}
              {renderTree(child, depth + 1)}
            </div>
          )}
        </div>
      )
    })
  }

  const handleRename = async (oldRelativePath: string) => {
    if (!newName || newName.trim() === '' || !projectPath) {
      setRenamingPath(null)
      return
    }

    // @ts-ignore
    const oldFullPath = window.api.join(projectPath, oldRelativePath)
    // @ts-ignore
    const parentDir = window.api.dirname(oldFullPath)
    // @ts-ignore
    const newFullPath = window.api.join(parentDir, newName)

    // @ts-ignore
    const success = await window.api.renameEntry(oldFullPath, newFullPath)
    if (success) {
      syncProjectFromDisk()
    }
    setRenamingPath(null)
  }

  const handlePaste = async (targetRelativePath: string, targetType: 'file' | 'folder') => {
    if (!copiedEntry || !projectPath) return

    // @ts-ignore
    const srcFullPath = window.api.join(projectPath, copiedEntry.path)
    // @ts-ignore
    let destDir = window.api.join(projectPath, targetRelativePath)
    if (targetType === 'file') {
      // @ts-ignore
      destDir = window.api.dirname(destDir)
    }

    // @ts-ignore
    const fileName = window.api.basename(srcFullPath)
    // @ts-ignore
    const destFullPath = window.api.join(destDir, fileName)

    if (copiedEntry.operation === 'cut') {
      // @ts-ignore
      const success = await window.api.renameEntry(srcFullPath, destFullPath)
      if (success) {
        syncProjectFromDisk()
        setCopiedEntry(null)
      }
    } else {
      // @ts-ignore
      const success = await window.api.copyEntry(srcFullPath, destFullPath)
      if (success) {
        syncProjectFromDisk()
      }
    }
  }

  return (
    <aside style={{ width: `${width}px` }} className="h-full bg-[#f3f3f3] border-r border-[#e5e5e5] flex flex-col select-none shrink-0 relative">
      <div
        className="absolute top-0 bottom-0 right-0 w-[8px] cursor-col-resize z-50 transform translate-x-1/2 flex justify-center group"
        onMouseDown={onResizeStart}
      >
        <div className="w-[1px] h-full bg-transparent group-hover:bg-[#007acc] transition-none" />
      </div>
      {/* Title Pane */}
      <div className="px-5 h-[35px] flex items-center justify-between border-b border-[#e5e5e5] bg-[#f3f3f3]">
        <h2 className="text-[11px] font-bold text-[#616161] uppercase tracking-wider">
          {activeTab === 'home' ? 'Explorer' : activeTab.toUpperCase()}
        </h2>
        <div className="flex items-center gap-1">
          {activeTab === 'home' ? (
            <>
              <button
                onClick={() => setShowHidden(!showHidden)}
                className={`p-1 rounded transition-none ${showHidden ? 'text-[#007acc] bg-sky-100' : 'text-[#616161] hover:text-[#333333] hover:bg-[#e5e5e5]'}`}
                title={showHidden ? 'Hide Hidden Files' : 'Show Hidden Files'}
              >
                {showHidden ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
              <button
                onClick={syncProjectFromDisk}
                className="p-1 text-[#616161] hover:text-[#333333] hover:bg-[#e5e5e5] rounded transition-none"
                title="Refresh Explorer"
              >
                <RotateCw size={14} />
              </button>
              <button
                onClick={() => {
                  setIsCreatingFile(true)
                  setIsCreatingFolder(false)
                  if (selectedExplorerPath && isSelectedPathFolder) {
                    setExpandedFolders(prev => {
                      const next = new Set(prev)
                      next.add(selectedExplorerPath)
                      return next
                    })
                  }
                }}
                className="p-1 text-[#616161] hover:text-[#333333] hover:bg-[#e5e5e5] rounded transition-none"
                title="New File"
              >
                <FilePlus size={14} />
              </button>
              <button
                onClick={() => {
                  setIsCreatingFolder(true)
                  setIsCreatingFile(false)
                  if (selectedExplorerPath && isSelectedPathFolder) {
                    setExpandedFolders(prev => {
                      const next = new Set(prev)
                      next.add(selectedExplorerPath)
                      return next
                    })
                  }
                }}
                className="p-1 text-[#616161] hover:text-[#333333] hover:bg-[#e5e5e5] rounded transition-none"
                title="New Folder"
              >
                <FolderPlus size={14} />
              </button>
            </>
          ) : activeTab === 'share' ? (
            <button
              onClick={refreshCommunity}
              className="p-1 text-[#616161] hover:text-[#333333] hover:bg-[#e5e5e5] rounded transition-none"
              title="Refresh Discovery"
            >
              <RotateCw size={14} />
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        <AnimatePresence mode="wait">
          {activeTab === 'home' ? (
            <motion.div
              key="explorer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col h-full"
            >
              {/* File Tree Scrollable Area */}
              <div className="flex-1 overflow-y-auto pb-4 doc-scrollbar">
                {/* Project Title Row */}
                <div
                  className={`flex items-center gap-1 px-2 py-1 border-b cursor-pointer ${draggedOverPath === 'root-dir' ? 'bg-sky-100 border-[#007acc]/40' : 'bg-[#e5e5e5]/50 border-[#e5e5e5]'
                    }`}
                  onClick={() => toggleFolder('root')}
                  onDragOver={handleDragOver}
                  onDragEnter={(e) => handleDragEnter(e, 'root-dir')}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDropEntry(e, '', 'folder')}
                >
                  {expandedFolders.has('root') ? <ChevronDown size={14} className="text-[#616161]" /> : <ChevronRight size={14} className="text-[#616161]" />}
                  <span className="text-[11px] font-bold text-[#333333] uppercase truncate">
                    {folderName}
                  </span>
                </div>

                {!projectPath ? (
                  <div className="p-8 text-center flex flex-col items-center">
                    <FolderOpen size={48} strokeWidth={1} className="text-[#cccccc] mb-4" />
                    <p className="text-[11px] font-bold text-[#616161] uppercase tracking-widest leading-relaxed mb-4">
                      No Folder Opened
                    </p>
                    <button
                      onClick={openProject}
                      className="w-full bg-[#007acc] text-white py-2 rounded text-[12px] font-medium hover:bg-[#0062a3] shadow-sm flex items-center justify-center gap-2"
                    >
                      <FolderOpen size={14} />
                      Open Folder
                    </button>
                    <p className="text-[10px] text-[#858585] mt-4 leading-relaxed">
                      Select a local folder to begin the file flow.
                    </p>
                  </div>
                ) : projectFiles.length > 0 || Object.keys(projectTree.children).length > 0 || isCreatingFile || isCreatingFolder ? (
                  <div className="py-1">
                    {isCreatingFile && !isSelectedPathFolder && (
                      <div className="flex items-center gap-2 px-6 py-1 bg-white border border-[#007acc] mx-2 my-1 shadow-sm rounded-sm">
                        <FileIcon size={14} className="text-[#616161]" />
                        <input
                          ref={inputRef}
                          type="text"
                          value={newFileName}
                          onChange={(e) => setNewFileName(e.target.value)}
                          onBlur={() => setIsCreatingFile(false)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && newFileName.trim()) {
                              createNewFile(newFileName)
                              setIsCreatingFile(false)
                              setNewFileName('')
                            } else if (e.key === 'Escape') {
                              setIsCreatingFile(false)
                              setNewFileName('')
                            }
                          }}
                          placeholder="File name..."
                          className="flex-1 bg-transparent border-none outline-none text-[12px] text-[#333333] italic"
                        />
                      </div>
                    )}

                    {isCreatingFolder && !isSelectedPathFolder && (
                      <div className="flex items-center gap-2 px-6 py-1 bg-white border border-[#007acc] mx-2 my-1 shadow-sm rounded-sm">
                        <Folder size={14} className="text-[#007acc]" />
                        <input
                          ref={folderInputRef}
                          type="text"
                          value={newFolderName}
                          onChange={(e) => setNewFolderName(e.target.value)}
                          onBlur={() => setIsCreatingFolder(false)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && newFolderName.trim()) {
                              createNewFolder(newFolderName)
                              setIsCreatingFolder(false)
                              setNewFolderName('')
                            } else if (e.key === 'Escape') {
                              setIsCreatingFolder(false)
                              setNewFolderName('')
                            }
                          }}
                          placeholder="Folder name..."
                          className="flex-1 bg-transparent border-none outline-none text-[12px] text-[#333333] italic"
                        />
                      </div>
                    )}
                    {expandedFolders.has('root') && renderTree(projectTree)}
                  </div>
                ) : (
                  <div className="p-8 text-center flex flex-col items-center">
                    <Box size={40} strokeWidth={1} className="text-[#cccccc] mb-3" />
                    <p className="text-[11px] font-bold text-[#616161] uppercase mb-1">
                      Folder is empty
                    </p>
                    <p className="text-[10px] text-[#858585] leading-relaxed">
                      No matching files found.
                    </p>
                  </div>
                )}

                {/* Render Shared Projects Accordions */}
                {sharedTrees.map(sp => (
                  <div key={sp.nodeId} className="border-t border-[#e5e5e5]" style={{ borderTopColor: sp.color }}>
                    <div
                      className="flex items-center gap-1 px-2 py-1 cursor-pointer transition-colors"
                      style={{ backgroundColor: `${sp.color}10`, borderBottom: `1px solid ${sp.color}30` }}
                      onClick={() => toggleFolder(sp.tree.path)}
                    >
                      {expandedFolders.has(sp.tree.path) ? <ChevronDown size={14} className="text-[#616161]" /> : <ChevronRight size={14} className="text-[#616161]" />}
                      <Globe size={14} style={{ color: sp.color }} />
                      <span className="text-[11px] font-bold uppercase truncate flex-1" style={{ color: sp.color }}>
                        {sp.projectName} <span className="text-[9px] text-[#858585] lowercase opacity-70">@{sp.user}</span>
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          closeSharedProject(sp.nodeId, sp.projectName)
                        }}
                        className="p-1 hover:bg-black/5 rounded group/close"
                        title="Leave Project"
                      >
                        <X size={12} className="text-[#858585] group-hover/close:text-red-500 transition-colors" />
                      </button>
                    </div>
                    {expandedFolders.has(sp.tree.path) && (
                      <div className="py-1">
                        {Object.keys(sp.tree.children).length === 0 ? (
                          <div className="px-8 py-2 text-[10px] text-[#858585] italic">Loading files...</div>
                        ) : (
                          renderTree(sp.tree)
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Walkthrough Virtual Accordion (Sticky Bottom) */}
              <div className="shrink-0 border-t border-[#e5e5e5] bg-[#f3f3f3]">
                <div
                  className="flex items-center gap-1 px-2 py-1.5 bg-[#e5e5e5]/50 border-b border-[#e5e5e5] cursor-pointer"
                  onClick={() => setExpandedFolders(prev => { const s = new Set(prev); if (s.has('walkthrough')) s.delete('walkthrough'); else s.add('walkthrough'); return s; })}
                >
                  {expandedFolders.has('walkthrough') ? <ChevronDown size={14} className="text-[#616161]" /> : <ChevronRight size={14} className="text-[#616161]" />}
                  <span className="text-[11px] font-bold text-[#333333] uppercase tracking-wider">
                    WALKTHROUGH
                  </span>
                </div>

                {expandedFolders.has('walkthrough') && (
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setActiveFileName('Walkthrough: Plan')
                        setViewMode('editor')
                      }}
                      className={`w-full flex items-center gap-2 px-8 py-1.5 text-xs transition-none text-left truncate ${activeFileName === 'Walkthrough: Plan' ? 'bg-[#007acc] text-white font-medium' : 'text-[#616161] hover:bg-[#e8e8e8]'
                        }`}
                    >
                      <Info size={14} className={activeFileName === 'Walkthrough: Plan' ? 'text-white' : 'text-[#007acc]'} />
                      <span className="truncate">Plan Requirements</span>
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ) : activeTab === 'history' ? (
            <motion.div
              key="history"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-4"
            >
              <div className="p-6 text-center bg-white rounded border border-[#e5e5e5]">
                <Clock size={32} className="mx-auto text-[#cccccc] mb-3" />
                <p className="text-[11px] font-bold text-[#333333] uppercase">Build History</p>
                <p className="text-[10px] text-[#858585] mt-1 italic">V1.2.0 Persistent</p>
              </div>
            </motion.div>
          ) : activeTab === 'community' ? (
            <motion.div
              key="community"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full"
            >
              <CommunityPanel />
            </motion.div>
          ) : activeTab === 'share' ? (
            <motion.div
              key="share"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-4"
            >
              <div className="p-6 text-center bg-white rounded border border-[#e5e5e5] mb-4">
                <Share2 size={32} className="mx-auto text-[#cccccc] mb-3" />
                <p className="text-[11px] font-bold text-[#333333] uppercase">Share Project</p>
                <p className="text-[10px] text-[#858585] mt-2 leading-relaxed">
                  Securely share your workspace via P2P.
                </p>
                {projectPath ? (
                  <div className="mt-4 flex flex-col gap-3 text-left">
                    {!isJoinedCommunity && (
                      <div className="flex flex-col gap-1.5 p-2 bg-[#f3f3f3] rounded border border-[#e5e5e5]">
                        <span className="text-[9px] font-bold text-[#616161] uppercase tracking-wider text-left">Display Name</span>
                        <input
                          type="text"
                          placeholder="Collaborator name..."
                          className="bg-white border border-[#e5e5e5] rounded px-2 py-1 text-[11px] outline-none focus:border-[#007acc] transition-all"
                          value={communityName}
                          onChange={(e) => setCommunityName(e.target.value)}
                        />
                      </div>
                    )}

                    <div className="flex flex-col gap-1.5 p-2 bg-[#f3f3f3] rounded border border-[#e5e5e5]">
                      <span className="text-[9px] font-bold text-[#616161] uppercase tracking-wider text-left">Share Mode</span>
                      <div className="flex gap-2.5">
                        <label className={`flex items-center gap-1.5 whitespace-nowrap ${isSharing ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer group'}`}>
                          <input
                            type="radio"
                            name="share-mode"
                            disabled={isSharing}
                            checked={sharePermission === 'read'}
                            onChange={() => setSharePermission('read')}
                            className="accent-[#007acc] w-3 h-3 cursor-inherit"
                          />
                          <span className={`text-[10px] font-medium ${isSharing ? 'text-[#858585]' : 'text-[#333333] group-hover:text-[#007acc]'}`}>Read Only</span>
                        </label>
                        <label className={`flex items-center gap-1.5 whitespace-nowrap ${isSharing ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer group'}`}>
                          <input
                            type="radio"
                            name="share-mode"
                            disabled={isSharing}
                            checked={sharePermission === 'write'}
                            onChange={() => setSharePermission('write')}
                            className="accent-[#007acc] w-3 h-3 cursor-inherit"
                          />
                          <span className={`text-[10px] font-medium ${isSharing ? 'text-[#858585]' : 'text-[#333333] group-hover:text-[#007acc]'}`}>Read & Write</span>
                        </label>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (sharedProjects.some(p => p.nodeId === 'me')) {
                          stopSharingProject()
                        } else {
                          shareCurrentProject(sharePermission)
                        }
                      }}
                      className={`w-full px-3 py-2 rounded text-[11px] font-medium shadow-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${sharedProjects.some(p => p.nodeId === 'me')
                        ? 'bg-rose-500 text-white hover:bg-rose-600 active:scale-95'
                        : 'bg-[#007acc] text-white hover:bg-[#0062a3]'
                        }`}
                    >
                      {sharedProjects.some(p => p.nodeId === 'me') ? (
                        <>
                          <EyeOff size={14} />
                          Stop Sharing
                        </>
                      ) : (
                        <>
                          <Share2 size={14} />
                          Share Folder
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <button className="mt-4 bg-[#e5e5e5] w-full text-[#858585] px-3 py-1.5 rounded text-[11px] font-medium cursor-not-allowed uppercase tracking-wider">
                    Wait for Folder
                  </button>
                )}
              </div>

              {sharedProjects.filter(p => p.nodeId !== 'me').length > 0 && (
                <div>
                  <h3 className="text-[10px] font-bold text-[#858585] uppercase tracking-wider mb-2">Available Shared Projects</h3>
                  <div className="flex flex-col gap-2">
                    {sharedProjects.filter(p => p.nodeId !== 'me').map(proj => (
                      <div key={`${proj.nodeId}-${proj.projectName}`} className="bg-white border border-[#e5e5e5] rounded p-3 flex items-center justify-between shadow-sm">
                        <div className="flex flex-col overflow-hidden text-left">
                          <span className="text-[12px] font-bold text-[#333333] truncate">{proj.projectName}</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <div className="flex items-center gap-1">
                              <User size={10} className="text-[#007acc]" />
                              <span className="text-[10px] text-[#858585] truncate">{proj.user}</span>
                            </div>
                            <div className="w-[3px] h-[3px] rounded-full bg-[#cccccc]" />
                            <span className={`text-[9px] font-bold uppercase tracking-tighter ${proj.permission === 'write' ? 'text-orange-500' : 'text-blue-500'}`}>
                              {proj.permission === 'write' ? 'R/W' : 'READ'}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            openSharedProject(proj.nodeId, proj.projectName, proj.user, proj.permission)
                            setActiveTab('home')
                          }}
                          className="shrink-0 bg-[#f3f3f3] hover:bg-[#e8e8e8] text-[#333333] px-2 py-1.5 rounded text-[10px] font-medium border border-[#e5e5e5] transition-colors"
                        >
                          Open Tree
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Footer Info */}
      {projectPath && (
        <div className="p-3 border-t border-[#e5e5e5] bg-[#f3f3f3] truncate">
          <p className="text-[9px] font-bold text-[#858585] uppercase tracking-tighter overflow-hidden text-ellipsis">
            PATH: {projectPath}
          </p>
        </div>
      )}

      {/* Global Right Click Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-[#f3f3f3] border border-[#e5e5e5] shadow-xl shadow-black/10 rounded py-1 z-[100] min-w-[150px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onContextMenu={e => e.preventDefault()}
        >
          {contextMenu.type === 'folder' && (
            <>
              <button
                onClick={() => {
                  const name = prompt("Enter file name:")
                  if (name && name.trim()) {
                    createNewFile(`${contextMenu.path}/${name}`)
                  }
                  setContextMenu(null)
                }}
                className="w-full text-left px-4 py-1.5 text-[12px] text-[#333333] hover:bg-[#007acc] hover:text-white transition-none"
              >
                New File...
              </button>
              <button
                onClick={() => {
                  const name = prompt("Enter folder name:")
                  if (name && name.trim()) {
                    createNewFolder(`${contextMenu.path}/${name}`)
                  }
                  setContextMenu(null)
                }}
                className="w-full text-left px-4 py-1.5 text-[12px] text-[#333333] hover:bg-[#007acc] hover:text-white transition-none"
              >
                New Folder...
              </button>
              <div className="h-[1px] bg-[#e5e5e5] my-1" />
            </>
          )}
          <button
            onClick={() => {
              navigator.clipboard.writeText(contextMenu.path)
              setContextMenu(null)
            }}
            className="w-full text-left px-4 py-1.5 text-[12px] text-[#333333] hover:bg-[#007acc] hover:text-white transition-none"
          >
            Copy Relative Path
          </button>
          <button
            onClick={() => {
              if (projectPath) {
                // @ts-ignore
                const full = window.api.join(projectPath, contextMenu.path)
                navigator.clipboard.writeText(full)
              }
              setContextMenu(null)
            }}
            className="w-full text-left px-4 py-1.5 text-[12px] text-[#333333] hover:bg-[#007acc] hover:text-white transition-none"
          >
            Copy Absolute Path
          </button>
          <div className="h-[1px] bg-[#e5e5e5] my-1" />
          <button
            onClick={() => {
              setRenamingPath(contextMenu.path)
              // @ts-ignore
              setNewName(window.api.basename(contextMenu.path))
              setContextMenu(null)
            }}
            className="w-full text-left px-4 py-1.5 text-[12px] text-[#333333] hover:bg-[#007acc] hover:text-white transition-none"
          >
            Rename...
          </button>
          <button
            onClick={() => {
              setCopiedEntry({ path: contextMenu.path, type: contextMenu.type, operation: 'cut' })
              setContextMenu(null)
            }}
            className="w-full text-left px-4 py-1.5 text-[12px] text-[#333333] hover:bg-[#007acc] hover:text-white transition-none"
          >
            Cut
          </button>
          <button
            onClick={() => {
              setCopiedEntry({ path: contextMenu.path, type: contextMenu.type, operation: 'copy' })
              setContextMenu(null)
            }}
            className="w-full text-left px-4 py-1.5 text-[12px] text-[#333333] hover:bg-[#007acc] hover:text-white transition-none"
          >
            Copy
          </button>
          <button
            disabled={!copiedEntry}
            onClick={() => {
              handlePaste(contextMenu.path, contextMenu.type)
              setContextMenu(null)
            }}
            className={`w-full text-left px-4 py-1.5 text-[12px] transition-none ${!copiedEntry ? 'text-gray-400' : 'text-[#333333] hover:bg-[#007acc] hover:text-white'}`}
          >
            Paste
          </button>
          <div className="h-[1px] bg-[#e5e5e5] my-1" />
          <button
            onClick={async () => {
              if (projectPath) {
                // @ts-ignore
                const full = window.api.join(projectPath, contextMenu.path)
                // @ts-ignore
                const success = await window.api.deleteEntry(full)
                if (success) syncProjectFromDisk()
              }
              setContextMenu(null)
            }}
            className="w-full text-left px-4 py-1.5 text-[12px] text-red-600 hover:bg-red-600 hover:text-white transition-none"
          >
            Delete
          </button>
        </div>
      )}
    </aside>
  )
}

export default Sidebar
