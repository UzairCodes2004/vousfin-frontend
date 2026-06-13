import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import SectionRail from '@/components/layout/SectionRail'
import Header from '@/components/layout/Header'
import MobileNav from '@/components/layout/MobileNav'
import Drawer from '@/components/ui/Drawer'
import GlobalAIWidget from '@/components/ai/GlobalAIWidget'
import { useAuthStore } from '@/stores/useAuthStore'
import { useBusinessStore } from '@/stores/useBusinessStore'

export default function DashboardLayout() {
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
      {/* Desktop section rail — the "Vault" launcher */}
      <SectionRail />

      {/* Mobile drawer — same section launchers, labeled */}
      <Drawer
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
        position="left"
        className="w-72 p-0"
        title="Sections"
      >
        <SectionRail isMobile closeMobile={() => setIsMobileDrawerOpen(false)} />
      </Drawer>

      {/* Main Container */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header toggleMobileDrawer={() => setIsMobileDrawerOpen(true)} />
        
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-navy scrollbar-thin">
          {/* pb-20 on small screens leaves room for the fixed MobileNav bottom bar */}
          <div className="mx-auto max-w-7xl px-4 py-8 pb-24 sm:px-6 lg:px-8 lg:pb-8 animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile bottom nav — visible on screens < lg */}
      <MobileNav />

      {/* Global AI Assistant widget — persists across all route changes */}
      <GlobalAIWidget />
    </div>
  )
}
