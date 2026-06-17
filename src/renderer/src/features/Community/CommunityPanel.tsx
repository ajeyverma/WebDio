import React, { useState } from 'react'
import { useAppStore } from '../../stores/useAppStore'
import { Users, UserPlus, Shield, Globe, Send, LogIn, LogOut } from 'lucide-react'
import { motion } from 'framer-motion'

const CommunityPanel: React.FC = () => {
  const { 
    isJoinedCommunity, 
    communityName, 
    setCommunityName, 
    communityUsers, 
    joinCommunity, 
    leaveCommunity,
    setActiveFileName, 
    setViewMode, 
    sharedProjects 
  } = useAppStore()

  const isSharing = sharedProjects.some(p => p.nodeId === 'me')

  const handleJoin = () => {
    if (communityName.trim()) {
      joinCommunity(communityName.trim())
      // Open the global chat tab automatically
      setActiveFileName('Community: Global Chat')
      setViewMode('editor')
    }
  }

  if (!isJoinedCommunity) {
    return (
      <div className="flex flex-col h-full bg-[#f3f3f3] p-4 pt-8">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 bg-[#007acc] rounded-2xl flex items-center justify-center shadow-lg mb-4">
             <Globe size={32} className="text-white animate-pulse" />
          </div>
          <h2 className="text-lg font-bold text-[#333333]">Network Chat</h2>
          <p className="text-xs text-[#858585] mt-2">Connect with other developers on your local network.</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-[#616161] uppercase ml-1">Your Display Name</label>
            <input 
              type="text"
              placeholder="e.g. Ajay_Dev"
              className={`w-full bg-white border border-[#e5e5e5] rounded px-3 py-2 text-sm outline-none focus:border-[#007acc] transition-colors shadow-sm ${isSharing ? 'bg-gray-50 text-gray-500 cursor-not-allowed font-medium' : ''}`}
              value={communityName}
              readOnly={isSharing}
              onChange={(e) => setCommunityName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            />
          </div>

          <button 
            onClick={handleJoin}
            disabled={!communityName.trim()}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded text-sm font-medium transition-all shadow-md active:scale-95 ${
              communityName.trim() 
                ? 'bg-[#007acc] text-white hover:bg-[#0062a3]' 
                : 'bg-[#cccccc] text-[#f3f3f3] cursor-not-allowed'
            }`}
          >
            <LogIn size={16} />
            Join Network
          </button>
        </div>

        <div className="mt-auto border-t border-[#e5e5e5] pt-4">
           <div className="flex items-center gap-2 text-[#858585]">
              <Shield size={14} />
              <span className="text-[10px] font-medium uppercase">Fault-Tolerant P2P</span>
           </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-[#f3f3f3]">
      <div className="p-4 border-b border-[#e5e5e5] bg-white/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-bold text-[#333333] flex items-center gap-2">
            <Users size={16} className="text-[#007acc]" />
            Online Users
          </h3>
          <button 
            onClick={leaveCommunity}
            className="p-1.5 hover:bg-red-50 text-[#858585] hover:text-red-500 rounded-full transition-colors group relative"
            title="Leave Network"
          >
             <LogOut size={14} />
          </button>
        </div>
        <p className="text-[10px] text-[#858585]">Connected as <span className="text-[#007acc] font-bold">{communityName}</span></p>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {communityUsers.map((user, idx) => (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            key={user} 
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white hover:shadow-sm border border-transparent hover:border-[#e5e5e5] transition-all cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#007acc] to-[#005a9e] flex items-center justify-center text-white text-[10px] font-bold shadow-sm group-hover:scale-110 transition-transform">
              {user.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex flex-col flex-1 overflow-hidden">
              <span className="text-xs font-semibold text-[#333333] truncate">{user}</span>
              <span className="text-[10px] text-[#10b981]">Active Now</span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="p-3">
         <button 
           onClick={() => {
             setActiveFileName('Community: Global Chat')
             setViewMode('editor')
           }}
           className="w-full flex items-center justify-center gap-2 py-2 bg-[#007acc] text-white rounded text-xs font-medium hover:bg-[#0062a3] transition-colors shadow-sm"
         >
           <Send size={14} />
           Open Global Chat
         </button>
      </div>
    </div>
  )
}

export default CommunityPanel
