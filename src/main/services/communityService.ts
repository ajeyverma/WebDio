import dgram from 'dgram'
import net from 'net'
import { ipcMain, BrowserWindow } from 'electron'
import os from 'os'

const UDP_PORT = 41234
const TCP_PORT = 41235
const BROADCAST_ADDR = '255.255.255.255'

class CommunityService {
  private udpSocket: dgram.Socket | null = null
  private tcpServer: net.Server | null = null
  private mainWindow: BrowserWindow | null = null
  private myName: string = ''
  private nodeId: string = Math.random().toString(36).substring(7)
  private activePort: number = 0
  private lastStatus: string = 'Checking UDP...'
  private peers: Map<string, { name: string, port: number, nodeId: string }> = new Map() // IP -> PeerInfo
  private isInitialized: boolean = false

  constructor() {}

  init(window: BrowserWindow) {
    this.mainWindow = window
    if (!this.isInitialized) {
      this.setupIPC()
      this.isInitialized = true
      
      // Auto-start discovery on launch
      this.startDiscovery()
    }
  }

  private setupIPC() {
    ipcMain.handle('community:join', (_event, name: string) => {
       this.myName = name
       return { success: true, localIp: this.getLocalIp() }
    })

    ipcMain.handle('community:get-info', () => {
       return { 
         localIp: this.getLocalIp(), 
         port: this.activePort, 
         status: this.lastStatus,
         nodeId: this.nodeId
       }
    })

    ipcMain.handle('community:send', (_event, payload: any) => {
       this.broadcastMessage(payload)
       return { success: true }
    })

    ipcMain.handle('community:refresh', () => {
       this.broadcastPresence()
       return { success: true }
    })
  }

  private getLocalIp() {
    const interfaces = os.networkInterfaces()
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]!) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address
        }
      }
    }
    return '127.0.0.1'
  }

  private currentServerId: string | null = null

  private startDiscovery() {
    this.udpSocket = dgram.createSocket({ type: 'udp4', reuseAddr: true })
    let serverFound = false

    this.startServer()

    this.udpSocket.on('message', (msg, rinfo) => {
      try {
        const data = JSON.parse(msg.toString())
        if (data.nodeId === this.nodeId) return

        const peerInfo = { 
          name: data.name, 
          port: data.port, 
          nodeId: data.nodeId, 
          ip: rinfo.address,
          lastSeen: Date.now()
        }

        this.peers.set(data.nodeId, peerInfo)

        if (data.type === 'server-active') {
          serverFound = true
          this.currentServerId = data.nodeId
          this.notifyStatus(`Connected@${data.port}`)
          this.mainWindow?.webContents.send('community:peer-found', { ip: rinfo.address, name: data.name })
        }
        
        if (data.type === 'discovery') {
          this.mainWindow?.webContents.send('community:peer-found', { ip: rinfo.address, name: data.name })
        }
      } catch (e) {}
    })

    this.udpSocket.bind(UDP_PORT, () => {
      this.udpSocket?.setBroadcast(true)
      this.notifyStatus('Scanning for active servers...')
      
      const probe = JSON.stringify({ type: 'probe', name: this.myName, nodeId: this.nodeId })
      this.udpSocket?.send(probe, 0, probe.length, UDP_PORT, BROADCAST_ADDR)

      setTimeout(() => {
        if (!serverFound) {
          this.promoteToPrimary()
        }
      }, 3000)
    })

    setInterval(() => this.broadcastPresence(), 2000)
    setInterval(() => this.checkPeerHealth(), 5000)
  }

  private promoteToPrimary() {
    this.currentServerId = this.nodeId
    this.notifyStatus(`Connected@${this.activePort}`)
  }

  private checkPeerHealth() {
    const now = Date.now()
    const timeout = 10000 // 10 seconds

    // If I'm NOT the primary, and I haven't heard from the primary, trigger re-election
    if (this.currentServerId && this.currentServerId !== this.nodeId) {
       const serverPeer = this.peers.get(this.currentServerId)
       if (!serverPeer || (now - serverPeer.lastSeen > timeout)) {
          console.log('Primary Server timed out. Promoting self or re-scanning...')
          this.peers.delete(this.currentServerId)
          this.currentServerId = null
          this.promoteToPrimary()
       }
    }

    // General peer cleanup
    this.peers.forEach((peer, id) => {
      if (now - peer.lastSeen > timeout) {
        this.peers.delete(id)
      }
    })
  }

  private broadcastPresence() {
    if (!this.udpSocket) return
    // Only broadcast 'server-active' if I am the elected leader
    const type = this.currentServerId === this.nodeId ? 'server-active' : 'discovery'
    const msg = JSON.stringify({ 
      type, 
      name: this.myName || 'Guest', 
      port: this.activePort, 
      nodeId: this.nodeId 
    })
    this.udpSocket.send(msg, 0, msg.length, UDP_PORT, BROADCAST_ADDR)
  }

  private startServer() {
    this.tcpServer = net.createServer((socket) => {
      let chunks: Buffer[] = []
      socket.on('data', (data) => {
        chunks.push(data)
      })

      socket.on('end', () => {
        if (chunks.length === 0) return
        try {
          const fullData = Buffer.concat(chunks).toString()
          const msg = JSON.parse(fullData)
          this.mainWindow?.webContents.send('community:message-received', msg)
        } catch (e) {
          console.error('Failed to parse community message:', e)
        }
      })
    })

    this.tcpServer.listen(TCP_PORT, '0.0.0.0', () => {
      this.activePort = TCP_PORT
      this.notifyStatus(`Connected@${TCP_PORT}`)
      
      // Signal others immediately
      this.broadcastPresence()
    })

    this.tcpServer.on('error', (err: any) => {
       console.error(`TCP Server Error on port ${TCP_PORT}:`, err)
       this.notifyStatus(`Error: Port ${TCP_PORT} unavailable`)
    })
  }

  private broadcastMessage(payload: any) {
    const data = JSON.stringify(payload)
    
    if (this.peers.size === 0) {
      console.warn('Community: No peers found yet to broadcast message')
    }

    this.peers.forEach((peer) => {
      const client = new net.Socket()
      client.connect(TCP_PORT, peer.ip, () => {
        // Use a Buffer to avoid string encoding chunk issues for large Base64 media
        const buffer = Buffer.from(data, 'utf-8')
        client.write(buffer, () => {
           client.end()
        })
      })
      
      client.on('error', (err) => {
        console.error(`P2P error with ${peer.name}:`, err.message)
        // Disable aggressive dropping for large file timeouts
      })
    })
  }

  private notifyStatus(status: string) {
    this.lastStatus = status
    this.mainWindow?.webContents.send('community:status-update', status)
  }
}

export const communityService = new CommunityService()
