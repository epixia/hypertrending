import { Link, Outlet, useLocation } from 'react-router-dom'
import { TrendingUp, LayoutDashboard, Target, Settings, LogOut, Menu, Layers, DollarSign } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { cn } from '../lib/utils'
import { ThemeToggle } from './ThemeToggle'
import { useTheme } from '../contexts/ThemeContext'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Trending', href: '/trending', icon: TrendingUp },
  { name: 'Markets', href: '/markets', icon: Layers },
  { name: 'SaaS', href: '/saas', icon: DollarSign },
  { name: 'Missions', href: '/missions', icon: Target },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const { user, signOut } = useAuth()
  const { theme } = useTheme()

  return (
    <div className={cn(
      "min-h-screen transition-colors",
      theme === 'dark' ? 'gradient-bg' : 'gradient-bg-light'
    )}>
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 ease-in-out lg:translate-x-0',
          theme === 'dark' ? 'glass-sidebar' : 'glass-sidebar-light',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className={cn(
          "flex h-16 items-center gap-2 px-6 border-b",
          theme === 'dark' ? 'border-white/5' : 'border-black/5'
        )}>
          <TrendingUp className="h-8 w-8 text-emerald-500 drop-shadow-lg" />
          <span className={cn(
            "text-xl font-bold",
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          )}>HyperTrending</span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-400 shadow-lg shadow-emerald-500/10'
                    : theme === 'dark'
                      ? 'text-gray-400 hover:text-white hover:bg-white/5'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-black/5'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className={cn(
          "border-t p-4",
          theme === 'dark' ? 'border-white/5' : 'border-black/5'
        )}>
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <span className="text-emerald-500 text-sm font-medium">
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn(
                "text-sm font-medium truncate",
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              )}>
                {user?.email || 'Guest'}
              </p>
            </div>
            <button
              onClick={() => signOut()}
              className={cn(
                "p-1",
                theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
              )}
              title="Sign out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className={cn(
          "sticky top-0 z-30 h-16 border-b flex items-center px-4 lg:px-8",
          theme === 'dark' ? 'glass border-white/5' : 'glass-light border-black/5'
        )}>
          <button
            onClick={() => setSidebarOpen(true)}
            className={cn(
              "lg:hidden p-2",
              theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
            )}
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50" />
              <span className="text-sm text-emerald-400 font-medium">Live</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
