export interface VirtualFile {
  name: string
  content: string
  language: string
}

/**
 * Splits a raw AI-generated string into its constituent virtual files.
 * Supports both HTML projects and Markdown plans.
 */
export const parseProjectFiles = (code: string): VirtualFile[] => {
  const virtualFiles: VirtualFile[] = []

  // Support new multi-file format: === FILE: filename ===
  const fileRegex = /===\s*FILE:\s*(.+?)\s*===\n([\s\S]*?)(?====\s*FILE:|\s*$)/g
  let match: RegExpExecArray | null

  while ((match = fileRegex.exec(code)) !== null) {
    const fileName = match[1].trim()
    const content = match[2].trim()
    const ext = fileName.split('.').pop() || ''
    const language = ext === 'html' ? 'html' : ext === 'css' ? 'css' : ext === 'js' ? 'javascript' : ext === 'json' ? 'json' : 'plaintext'
    virtualFiles.push({ name: fileName, content, language })
  }

  // If new format succeeded, return directly
  if (virtualFiles.length > 0) return virtualFiles

  // Fallback to legacy HTML-only output
  const htmlMatch = code.match(/<!DOCTYPE html>[\s\S]*/i)
  if (htmlMatch) {
    virtualFiles.push({ name: 'index.html', content: htmlMatch[0].trim(), language: 'html' })
  }

  return virtualFiles
}
