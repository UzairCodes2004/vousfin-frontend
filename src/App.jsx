import { useEffect } from 'react'
import { BrowserRouter, useRoutes } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { routes } from './routes'
import SessionBootstrap from '@/components/auth/SessionBootstrap'
import { useThemeStore } from '@/stores/useThemeStore'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
})

function AppRoutes() {
  return useRoutes(routes)
}

export default function App() {
  const theme = useThemeStore((s) => s.theme)
  useEffect(() => {
    document.documentElement.classList.add('dark')
  }, [])
  // Keep <html data-theme> in sync with the persisted store (covers the
  // empty-storage and post-hydration cases; the head script handles first paint).
  useEffect(() => {
    useThemeStore.getState().setTheme(theme)
  }, [theme])

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <SessionBootstrap>
          <AppRoutes />
        </SessionBootstrap>
        <Toaster 
          position="top-right" 
          toastOptions={{ 
            duration: 4000,
            className: '!bg-charcoal !text-text-primary !border !border-glass !shadow-elevated',
            success: {
              iconTheme: {
                primary: 'rgb(var(--c-positive))',
                secondary: 'rgb(var(--c-on-accent))',
              },
            },
            error: {
              iconTheme: {
                primary: 'rgb(var(--c-negative))',
                secondary: 'rgb(var(--c-bg3))',
              },
            },
          }} 
        />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
