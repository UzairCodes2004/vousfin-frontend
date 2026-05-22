import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import Drawer from '@/components/ui/Drawer'
import GlobalAIWidget from '@/components/ai/GlobalAIWidget'
import { useAuthStore } from '@/stores/useAuthStore'
import { useBusinessStore } from '@/stores/useBusinessStore'

export default function DashboardLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false)
  const { user } = useAuthStore()
  const { activeBusiness, fetchBusiness } = useBusinessStore()

  useEffect(() => {
    if (user?.businessId && !activeBusiness) {
      fetchBusiness()
    }
  }, [user?.businessId, activeBusiness, fetchBusiness])

  return (
    <div className="flex h-screen bg-navy overflow-hidden selection:bg-cyan/30 selection:text-white">
      {/* Desktop Sidebar */}
      <Sidebar 
        isCollapsed={isSidebarCollapsed} 
        toggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
      />

      {/* Mobile Drawer Sidebar */}
      <Drawer
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
        position="left"
        className="w-72 p-0"
        title="Menu"
      >
        <Sidebar isMobile closeMobile={() => setIsMobileDrawerOpen(false)} />
      </Drawer>

      {/* Main Container */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header toggleMobileDrawer={() => setIsMobileDrawerOpen(true)} />
        
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-navy scrollbar-thin">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Global AI Assistant widget — persists across all route changes */}
      <GlobalAIWidget />
    </div>
  )
}
