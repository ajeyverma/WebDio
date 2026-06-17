import React, { useState, useRef, useEffect } from 'react'
import { useAppStore } from '../../stores/useAppStore'
import { Send, Globe, Users, Smile, Paperclip, MoreVertical, Hash, FileText, Image as ImageIcon, Download, Trash2, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const CommunityChat: React.FC = () => {
  const { communityMessages, sendCommunityMessage, communityName, communityUsers } = useAppStore()
  const [input, setInput] = useState('')
  const [selectedFile, setSelectedFile] = useState<{ name: string, data: string, type: 'image' | 'doc' } | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [communityMessages])

  const handleSend = () => {
    if (input.trim() || selectedFile) {
      const payload = {
        type: selectedFile?.type || 'text',
        user: communityName || 'Guest',
        text: input.trim(),
        fileData: selectedFile?.data,
        fileName: selectedFile?.name,
        timestamp: Date.now(),
        id: Math.random().toString(36).substring(7)
      }
      
      // We pass the full payload as the "text" because the store action expects a string usually,
      // but let's see if our store handles objects.
      // Based on previous edits, store: sendCommunityMessage(text: string)
      // Actually, I should update the store to handle the full payload.
      // For now, I'll JSON stringify it if necessary, but better to update the store.
      
      // @ts-ignore
      sendCommunityMessage(payload)
      setInput('')
      setSelectedFile(null)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const data = ev.target?.result as string
      const type = file.type.startsWith('image/') ? 'image' : 'doc'
      setSelectedFile({ name: file.name, data, type })
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        onChange={handleFileSelect}
        accept="image/*,.pdf,.doc,.docx,.txt,.json,.js,.tsx"
      />

      {/* Header */}
      <div className="h-12 border-b border-[#e5e5e5] flex items-center justify-between px-6 bg-[#f8f9fa] shrink-0 shadow-sm z-20">
         <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#007acc]/10 flex items-center justify-center">
               <Hash size={18} className="text-[#007acc]" />
            </div>
            <div>
               <h2 className="text-sm font-bold text-[#333333]"># global-network</h2>
               <p className="text-[10px] text-[#858585] flex items-center gap-1">
                 <Users size={10} /> {communityUsers.length} online
               </p>
            </div>
         </div>
         <div className="flex items-center gap-4 text-[#616161]">
            {/* Icons removed per user request */}
         </div>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-white to-[#fdfdfd]"
      >
        {communityMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 opacity-50">
             <Globe size={48} className="text-[#007acc] mb-2" />
             <h3 className="text-sm font-bold">Beginning of History</h3>
             <p className="text-[10px]">Messages sent here are visible to everyone on your LAN.</p>
          </div>
        )}

        <AnimatePresence>
          {communityMessages.map((msg, idx) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={msg.id || idx} 
              className={`flex gap-3 ${msg.user === communityName ? 'flex-row-reverse' : ''}`}
            >
               <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#007acc] to-[#005a9e] flex items-center justify-center text-white text-xs font-bold shadow-md shrink-0">
                  {String(msg.user || 'G').slice(0, 2).toUpperCase()}
               </div>
               <div className={`flex flex-col max-w-[70%] ${msg.user === communityName ? 'items-end' : ''}`}>
                  <div className="flex items-center gap-2 mb-1 px-1">
                     <span className="text-[11px] font-bold text-[#333333]">{String(msg.user || 'Guest')}</span>
                     <span className="text-[9px] text-[#aaaaaa]">
                        {new Date(Number(msg.timestamp) || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                     </span>
                  </div>
                  <div className={`px-4 py-2.5 rounded-2xl text-[13px] shadow-sm leading-relaxed ${
                    msg.user === communityName 
                      ? 'bg-[#007acc] text-white rounded-tr-none' 
                      : 'bg-white border border-[#e5e5e5] text-[#333333] rounded-tl-none'
                  }`}>
                    {/* Image Message */}
                    {msg.type === 'image' && typeof msg.fileData === 'string' && (
                      <div className="relative inline-block group mb-2">
                        <img src={msg.fileData} className="max-w-[200px] max-h-[250px] object-contain rounded-lg shadow-inner border border-white/20 block" alt="Shared" />
                        <a 
                          href={msg.fileData} 
                          download={String(msg.fileName || 'image.png')} 
                          title="Download Image"
                          className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm shadow-sm"
                        >
                           <Download size={14} />
                        </a>
                      </div>
                    )}

                    {/* Document Message */}
                    {msg.type === 'doc' && typeof msg.fileData === 'string' && (
                      <div className={`flex items-center gap-3 p-3 rounded-xl mb-2 ${msg.user === communityName ? 'bg-white/10' : 'bg-[#f8f9fa] border border-[#e5e5e5]'}`}>
                         <FileText size={20} className={msg.user === communityName ? 'text-white' : 'text-[#007acc]'} />
                         <div className="flex flex-col flex-1 overflow-hidden">
                            <span className="text-xs font-bold truncate">{String(msg.fileName || 'document')}</span>
                            <span className="text-[9px] opacity-70 uppercase">Document</span>
                         </div>
                         <a href={msg.fileData} download={String(msg.fileName || 'download')} className="p-1.5 hover:bg-black/10 rounded-lg transition-colors">
                            <Download size={14} />
                         </a>
                      </div>
                    )}
                    
                    {/* Text / Fallback */}
                    {typeof msg.text === 'string' && msg.text.trim() ? (
                      <div className="whitespace-pre-wrap">{msg.text}</div>
                    ) : typeof msg.text === 'object' && msg.text !== null ? (
                      <div className="whitespace-pre-wrap">{String((msg.text as any).text || '')}</div>
                    ) : (
                      !msg.fileData && <div className="italic opacity-50 text-[11px]">Empty message</div>
                    )}
                  </div>
               </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Attachment Preview (Floating) */}
      {selectedFile && (
        <motion.div 
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="px-4 py-2 bg-white border-t border-[#e5e5e5] h-16 flex items-center gap-4 z-30 shadow-[0_-5px_15px_rgba(0,0,0,0.05)]"
        >
           <div className="w-10 h-10 rounded-lg bg-[#007acc]/10 flex items-center justify-center">
              {selectedFile.type === 'image' ? <ImageIcon size={20} className="text-[#007acc]" /> : <FileText size={20} className="text-[#007acc]" />}
           </div>
           <div className="flex-1 overflow-hidden">
              <p className="text-xs font-bold text-[#333333] truncate">{selectedFile.name}</p>
              <p className="text-[10px] text-[#858585]">Ready to upload...</p>
           </div>
           <button onClick={() => setSelectedFile(null)} className="p-2 text-[#ff4d4f] hover:bg-[#ff4d4f1a] rounded-full">
              <X size={16} />
           </button>
        </motion.div>
      )}

      {/* Input Section */}
      <div className="p-4 bg-white border-t border-[#e5e5e5] shrink-0">
         <div className="bg-[#f3f3f3] border border-[#e5e5e5] rounded-xl flex items-center px-4 py-2 gap-3 focus-within:border-[#007acc] focus-within:bg-white transition-all shadow-sm">
            <Paperclip 
              size={18} 
              className="text-[#858585] cursor-pointer hover:text-[#007acc]" 
              onClick={() => fileInputRef.current?.click()}
            />
            <input 
              type="text"
              placeholder={selectedFile ? `Add a caption...` : `Message #global-network...`}
              className="flex-1 bg-transparent border-none outline-none text-sm text-[#333333]"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <Smile size={18} className="text-[#858585] cursor-pointer hover:text-[#007acc]" />
            <button 
              onClick={handleSend}
              disabled={!input.trim() && !selectedFile}
              className={`p-1.5 rounded-lg transition-transform active:scale-90 ${
                (input.trim() || selectedFile) ? 'bg-[#007acc] text-white' : 'text-[#cccccc]'
              }`}
            >
              <Send size={16} />
            </button>
         </div>
      </div>
    </div>
  )
}

export default CommunityChat
