import type { LucideIcon } from 'lucide-react'
import { cn } from '../lib/utils'
import { useTheme } from '../contexts/ThemeContext'

interface StatCardProps {
  title: string
  value: string | number
  change?: number
  icon: LucideIcon
  iconColor?: string
  glowColor?: string
}

export function StatCard({ title, value, change, icon: Icon, iconColor = 'text-emerald-500', glowColor }: StatCardProps) {
  const { theme } = useTheme()

  return (
    <div className={cn(
      "rounded-xl p-6 transition-all duration-300 hover:scale-[1.02]",
      theme === 'dark' ? 'glass-card' : 'glass-card-light'
    )}>
      <div className="flex items-center justify-between">
        <div>
          <p className={cn(
            "text-sm",
            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
          )}>{title}</p>
          <p className={cn(
            "text-3xl font-bold mt-1",
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          )}>{value}</p>
          {change !== undefined && (
            <p className={cn(
              'text-sm mt-1 font-medium',
              change >= 0 ? 'text-green-500' : 'text-red-500'
            )}>
              {change >= 0 ? '+' : ''}{change}% from last period
            </p>
          )}
        </div>
        <div className={cn(
          'p-3 rounded-xl transition-all duration-300',
          theme === 'dark' ? 'bg-white/5' : 'bg-black/5',
          iconColor,
          glowColor
        )}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  )
}
