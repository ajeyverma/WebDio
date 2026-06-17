import http from 'http'
import fs from 'fs'
import path from 'path'
import url from 'url'

let currentServer: http.Server | null = null
let currentPort: number = 8080

/**
 * Start a static file server on a project directory
 */
export const startStaticServer = async (projectPath: string): Promise<string> => {
  if (currentServer) {
    return new Promise((resolve) => {
      currentServer?.close(() => {
        currentServer = null
        resolve(startStaticServer(projectPath))
      })
    })
  }

  return new Promise((resolve, reject) => {
    currentServer = http.createServer((req, res) => {
      const parsedUrl = url.parse(req.url || '')
      let pathname = parsedUrl.pathname === '/' ? '/index.html' : parsedUrl.pathname || ''
      
      const fullPath = path.join(projectPath, pathname)

      // Support for SPA-style routing (fallback to index.html if file not found)
      if (!fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
         const indexFallback = path.join(projectPath, 'index.html')
         if (fs.existsSync(indexFallback)) {
            fs.readFile(indexFallback, (err, data) => {
               if (err) {
                 res.statusCode = 404
                 res.end(`File not found: ${pathname}`)
                 return
               }
               res.setHeader('Content-type', 'text/html')
               res.end(data)
            })
            return
         }
      }

      fs.readFile(fullPath, (err, data) => {
        if (err) {
          res.statusCode = 404
          res.end(`File not found: ${pathname}`)
          return
        }

        const ext = path.extname(pathname).toLowerCase()
        const mimeTypes: { [key: string]: string } = {
          '.html': 'text/html',
          '.js': 'text/javascript',
          '.css': 'text/css',
          '.json': 'application/json',
          '.png': 'image/png',
          '.jpg': 'image/jpg',
          '.gif': 'image/gif',
          '.svg': 'image/svg+xml',
          '.ico': 'image/x-icon',
        }

        res.setHeader('Content-type', mimeTypes[ext] || 'text/plain')
        res.end(data)
      })
    })

    const tryListen = (port: number) => {
      currentServer?.listen(port, () => {
        currentPort = port
        console.log(`Static server started at http://localhost:${port} for ${projectPath}`)
        resolve(`http://localhost:${port}`)
      })

      currentServer?.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          tryListen(port + 1)
        } else {
          reject(err)
        }
      })
    }

    tryListen(8080)
  })
}

/**
 * Stop the current static server
 */
export const stopStaticServer = () => {
  if (currentServer) {
    currentServer.close()
    currentServer = null
  }
}
