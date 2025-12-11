import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { Trending } from './pages/Trending'
import { Markets } from './pages/Markets'
import { Missions } from './pages/Missions'
import { Settings } from './pages/Settings'
import { Saas } from './pages/Saas'
import { SaasDetail } from './pages/SaasDetail'
import { Login } from './pages/Login'
import { useAuth } from './hooks/useAuth'
import { ThemeProvider } from './contexts/ThemeContext'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
})

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  // For demo purposes, allow access without authentication
  // In production, uncomment: if (!user) return <Navigate to="/login" />
  return <>{children}</>
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="trending" element={<Trending />} />
            <Route path="markets" element={<Markets />} />
            <Route path="missions" element={<Missions />} />
            <Route path="saas" element={<Saas />} />
            <Route path="saas/:slug" element={<SaasDetail />} />
            <Route path="settings" element={<Settings />} />
          </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  )
}

export default App
