import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import SectionRail from '@/components/layout/SectionRail'
import Header from '@/components/layout/Header'
import MobileNav from '@/components/layout/MobileNav'
import GlobalAIWidget from '@/components/ai/GlobalAIWidget'
import TransactionFormModal from '@/components/forms/TransactionFormModal'
import { useAuthStore } from '@/stores/useAuthStore'
import { useBusinessStore } from '@/stores/useBusinessStore'
import { useUIStore } from '@/stores/useUIStore'

export default function DashboardLayout() {
  const { user } = useAuthStore()
  const { activeBusiness, fetchBusiness } = useBusinessStore()
  const queryClient = useQueryClient()
  const txModalOpen = useUIStore((s) => s.txModalOpen)
  const closeTxModal = useUIStore((s) => s.closeTxModal)

  useEffect(() => {
    if (user?.businessId && !activeBusiness) {
      fetchBusiness()
    }
  }, [user?.businessId, activeBusiness, fetchBusiness])

  // After a global "Create" succeeds, refresh everything a new transaction
  // can change so any page reflects it immediately.
  const handleTxSuccess = () => {
    closeTxModal()
    ;['transactions', 'dashboard', 'healthScore', 'healthOutlook', 'financialInsights', 'reports']
      .forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }))
  }

  return (
    <div className="flex h-screen bg-navy overflow-hidden">
      {/* Desktop section rail — the "Vault" launcher (hidden < lg) */}
      <SectionRail />

      {/* Main Container */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />

        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-navy scrollbar-thin">
          {/* pb-24 on small screens leaves room for the fixed MobileNav bottom bar */}
          <div className="mx-auto max-w-7xl px-4 py-8 pb-28 sm:px-6 lg:px-8 lg:pb-8 animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile bottom nav — the only mobile nav surface (< lg) */}
      <MobileNav />

      {/* Global AI Assistant widget — persists across all route changes */}
      <GlobalAIWidget />

      {/* Universal Create modal — openable from the bottom bar on any page */}
      <TransactionFormModal
        isOpen={txModalOpen}
        onClose={closeTxModal}
        onSuccess={handleTxSuccess}
        transaction={null}
      />
    </div>
  )
}
