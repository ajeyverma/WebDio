import React from 'react'
import { Files, Settings, Globe, Share2 } from 'lucide-react'

interface ActivityBarProps {
  activeTab: string
  setActiveTab: (tab: string) => void
  onOpenSettings: () => void
  isSidebarOpen: boolean
  onToggleSidebar: (tab: string) => void
}

const ActivityBar: React.FC<ActivityBarProps> = ({
  activeTab,
  setActiveTab,
  onOpenSettings,
  isSidebarOpen,
  onToggleSidebar
}) => {
  const handleTabClick = (tab: string) => {
    if (tab === activeTab) {
      // Same icon clicked — toggle sidebar
      onToggleSidebar(tab)
    } else {
      // Different icon — switch tab and ensure sidebar is open
      setActiveTab(tab)
      if (!isSidebarOpen) onToggleSidebar(tab)
    }
  }

  return (
    <div className="w-[48px] bg-[#007acc] flex flex-col items-center py-2 gap-1 z-50 select-none border-r border-[#0062a3]">
      <ActivityIcon
        icon={<Files size={24} strokeWidth={1.5} />}
        active={activeTab === 'home' && isSidebarOpen}
        onClick={() => handleTabClick('home')}
        label="Explorer"
      />
      <ActivityIcon
        icon={<Globe size={24} strokeWidth={1.5} />}
        active={activeTab === 'community' && isSidebarOpen}
        onClick={() => handleTabClick('community')}
        label="Community Network"
      />
      <ActivityIcon
        icon={<Share2 size={24} strokeWidth={1.5} />}
        active={activeTab === 'share' && isSidebarOpen}
        onClick={() => handleTabClick('share')}
        label="Share Project"
      />

      <div className="flex-1" />

      <ActivityIcon
        icon={<Settings size={22} strokeWidth={1.5} />}
        active={false}
        onClick={onOpenSettings}
        label="Manage"
      />
    </div>
  )
}

const ActivityIcon = ({
  icon,
  active,
  onClick,
  label
}: {
  icon: React.ReactNode
  active: boolean
  onClick: () => void
  label: string
}) => (
  <div className="relative flex items-center justify-center w-full h-[48px]">
    <button
      onClick={onClick}
      className={`relative w-full h-full flex items-center justify-center transition-colors group ${
        active ? 'text-white' : 'text-[#ffffffd1] hover:text-white'
      }`}
      title={label}
    >
      {icon}
      {active && <div className="absolute left-0 w-[2px] h-full bg-white" />}
    </button>
  </div>
)

export default ActivityBar
