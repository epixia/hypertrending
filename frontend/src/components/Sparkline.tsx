import { useMemo, useState } from 'react'

interface SparklineProps {
  data: number[]
  timestamps?: string[]
  width?: number
  height?: number
  strokeColor?: string
  fillColor?: string
}

export function Sparkline({
  data,
  timestamps,
  width = 200,
  height = 48,
  strokeColor = '#10b981',
}: SparklineProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })

  const { path, areaPath, points } = useMemo(() => {
    if (!data || data.length === 0) return { path: '', areaPath: '', points: [] }

    const max = Math.max(...data)
    const min = Math.min(...data)
    const range = max - min || 1

    const pts = data.map((value, index) => {
      const x = (index / (data.length - 1)) * width
      const y = height - ((value - min) / range) * height * 0.8 - height * 0.1
      return { x, y, value, index }
    })

    const pathStr = `M${pts.map(p => `${p.x},${p.y}`).join(' L')}`
    const areaPathStr = `M0,${height} L${pts.map(p => `${p.x},${p.y}`).join(' L')} L${width},${height} Z`

    return { path: pathStr, areaPath: areaPathStr, points: pts }
  }, [data, width, height])

  const formatDate = (index: number) => {
    if (timestamps && timestamps[index]) {
      const date = new Date(timestamps[index])
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
    // Fallback: estimate based on 7 days of hourly data
    const hoursAgo = (data.length - 1 - index) * (168 / data.length)
    const date = new Date(Date.now() - hoursAgo * 60 * 60 * 1000)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget
    const rect = svg.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * width

    // Find closest point
    let closestIdx = 0
    let closestDist = Infinity
    points.forEach((p, i) => {
      const dist = Math.abs(p.x - x)
      if (dist < closestDist) {
        closestDist = dist
        closestIdx = i
      }
    })

    setHoveredIndex(closestIdx)
    setTooltipPos({
      x: e.clientX - rect.left,
      y: points[closestIdx]?.y || 0
    })
  }

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">
        No data
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredIndex(null)}
        className="cursor-crosshair"
      >
        <defs>
          <linearGradient id="sparklineGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#sparklineGradient)" />
        <path
          d={path}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Hover indicator */}
        {hoveredIndex !== null && points[hoveredIndex] && (
          <>
            {/* Vertical line */}
            <line
              x1={points[hoveredIndex].x}
              y1={0}
              x2={points[hoveredIndex].x}
              y2={height}
              stroke="#6b7280"
              strokeWidth="1"
              strokeDasharray="2,2"
            />
            {/* Point circle */}
            <circle
              cx={points[hoveredIndex].x}
              cy={points[hoveredIndex].y}
              r="4"
              fill={strokeColor}
              stroke="white"
              strokeWidth="2"
            />
          </>
        )}
      </svg>

      {/* Tooltip */}
      {hoveredIndex !== null && points[hoveredIndex] && (
        <div
          className="absolute z-50 pointer-events-none bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 shadow-lg"
          style={{
            left: tooltipPos.x > width / 2 ? tooltipPos.x - 120 : tooltipPos.x + 10,
            top: -50,
            transform: 'translateY(-50%)'
          }}
        >
          <div className="text-emerald-400 font-bold text-lg">
            {data[hoveredIndex]}
          </div>
          <div className="text-gray-400 text-xs">
            {formatDate(hoveredIndex)}
          </div>
        </div>
      )}
    </div>
  )
}
