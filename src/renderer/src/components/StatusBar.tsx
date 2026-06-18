import React, { useEffect } from 'react'
import { Check, Info, Sparkles, Rss, Layers, Cpu, Bell, MonitorDot, ChevronDown, Wifi, WifiOff, Loader2 } from 'lucide-react'
import { useAppStore } from '../stores/useAppStore'

const StatusBar: React.FC = () => {
  const { settings, communityStatus, serverIp } = useAppStore()

  return (
    <div className="h-[22px] w-full bg-[#007acc] text-white flex items-center justify-between px-3 text-[12px] font-normal select-none z-50 transition-colors">
      {/* Left side: Discovery & Network */}
      <div className="flex items-center h-full gap-3">
        <div className="flex items-center gap-1.5 px-2 hover:bg-white/10 h-full cursor-pointer transition-none border-r border-[#ffffff1a] bg-black/10">
           {communityStatus.includes('Checking') ? (
             <Loader2 size={10} className="animate-spin text-white/70" />
           ) : communityStatus.includes('Connected') ? (
             <Wifi size={11} className="text-[#4ade80]" />
           ) : (
             <MonitorDot size={11} className="text-[#fbbf24]" />
           )}
           <span className="text-[10.5px] font-medium tracking-tight whitespace-nowrap">
              {communityStatus}
           </span>
        </div>
        
        <div className="flex items-center gap-1.5 px-2 h-full opacity-80">
           <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Server IP:</span>
           <span className="text-[10.5px] font-mono">{serverIp}</span>
        </div>
      </div>

      {/* Right side: AI & Editor Settings */}
      <div className="flex items-center h-full gap-0">
        <div className="flex items-center gap-1.5 px-3 hover:bg-white/10 h-full cursor-pointer transition-none">
           <Sparkles size={11} className="text-white/70" />
           <span>{settings.geminiModel}</span>
        </div>
      </div>
    </div>
  )
}

export default StatusBar
