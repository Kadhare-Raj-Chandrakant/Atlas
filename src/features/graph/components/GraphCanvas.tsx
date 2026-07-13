import { useRef, useEffect, useCallback, useState } from 'react'
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from 'd3-force'
import type { RelatedEntitiesResponse } from '../types'

const ENTITY_COLORS: Record<string, string> = {
  Person: '#60a5fa',
  Place: '#34d399',
  Project: '#a78bfa',
  Idea: '#fbbf24',
  Task: '#fb923c',
  Topic: '#f472b6',
  Date: '#2dd4bf',
}

const RADIUS_RANGE = [18, 48]
const WEIGHT_RANGE = [1, 6]

function mapRange(value: number, min: number, max: number, outMin: number, outMax: number): number {
  if (max === min) return (outMin + outMax) / 2
  return outMin + ((value - min) / (max - min)) * (outMax - outMin)
}

interface SimNode extends SimulationNodeDatum {
  id: string
  entityType: string
  value: string
  occurrenceCount: number
  radius: number
}

interface SimLink extends SimulationLinkDatum<SimNode> {
  weight: number
}

interface GraphCanvasProps {
  data: RelatedEntitiesResponse
  onNodeClick: (entityId: string) => void
  onNodeDoubleClick: (entityId: string) => void
}

export function GraphCanvas({ data, onNodeClick, onNodeDoubleClick }: GraphCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 })
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingClickRef = useRef<string | null>(null)

  const allEntities = [data.center, ...data.related]
  const maxOccurrence = Math.max(...allEntities.map((e) => e.occurrenceCount), 1)
  const minOccurrence = Math.min(...allEntities.map((e) => e.occurrenceCount), 1)
  const maxWeight = Math.max(...data.related.map((e) => e.relationshipWeight), 1)
  const minWeight = Math.min(...data.related.map((e) => e.relationshipWeight), 1)

  const nodes: SimNode[] = allEntities.map((e) => ({
    id: e.id,
    entityType: e.entityType,
    value: e.value,
    occurrenceCount: e.occurrenceCount,
    radius: mapRange(e.occurrenceCount, minOccurrence, maxOccurrence, RADIUS_RANGE[0], RADIUS_RANGE[1]),
  }))

  const links: SimLink[] = data.related.map((e) => ({
    source: data.center.id,
    target: e.id,
    weight: e.relationshipWeight,
  }))

  useEffect(() => {
    const width = svgRef.current?.clientWidth || 800
    const height = svgRef.current?.clientHeight || 600

    const simulation = forceSimulation<SimNode>(nodes)
      .force(
        'link',
        forceLink<SimNode, SimLink>(links)
          .id((d) => d.id)
          .distance(120)
          .strength((d) => d.weight / maxWeight * 0.5),
      )
      .force('charge', forceManyBody().strength(-400))
      .force('center', forceCenter(width / 2, height / 2))
      .force('collide', forceCollide<SimNode>().radius((d) => d.radius + 4))
      .alphaDecay(0.02)
      .on('tick', () => {
        setTransform((t) => ({ ...t }))
      })

    simulation.on('end', () => {
      setTransform((t) => ({ ...t }))
    })

    return () => {
      simulation.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.center.id])

  const handleNodeClick = useCallback(
    (entityId: string) => {
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current)
        clickTimerRef.current = null
        if (pendingClickRef.current === entityId) {
          pendingClickRef.current = null
          onNodeDoubleClick(entityId)
          return
        }
      }
      pendingClickRef.current = entityId
      clickTimerRef.current = setTimeout(() => {
        clickTimerRef.current = null
        if (pendingClickRef.current) {
          onNodeClick(pendingClickRef.current)
          pendingClickRef.current = null
        }
      }, 300)
    },
    [onNodeClick, onNodeDoubleClick],
  )

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setTransform((t) => ({
      ...t,
      k: Math.min(Math.max(t.k * delta, 0.2), 4),
    }))
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target !== svgRef.current && (e.target as Element).tagName !== 'svg') return
    const startX = e.clientX
    const startY = e.clientY
    const startTransform = transform

    const handleMouseMove = (me: MouseEvent) => {
      setTransform({
        ...startTransform,
        x: startTransform.x + (me.clientX - startX) / startTransform.k,
        y: startTransform.y + (me.clientY - startY) / startTransform.k,
      })
    }
    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }, [transform])

  const handleReset = useCallback(() => {
    const width = svgRef.current?.clientWidth || 800
    const height = svgRef.current?.clientHeight || 600
    setTransform({ x: width / 2, y: height / 2, k: 1 })
  }, [])

  const colorForType = (type: string) => ENTITY_COLORS[type] || '#737373'
  const isCenter = (id: string) => id === data.center.id

  return (
    <div className="relative h-full w-full">
      <button
        type="button"
        onClick={handleReset}
        aria-label="Reset graph view"
        className="absolute right-4 top-4 z-10 rounded-md border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs text-neutral-400 transition-colors hover:border-neutral-700 hover:text-neutral-200"
      >
        Reset View
      </button>

      <svg
        ref={svgRef}
        className="h-full w-full cursor-grab"
        role="img"
        aria-label={`Graph centered on ${data.center.value} with ${data.related.length} related entities`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
      >
        <g
          transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}
        >
          {links.map((link, i) => {
            const source = link.source as SimNode
            const target = link.target as SimNode
            const thickness = mapRange(link.weight, minWeight, maxWeight, WEIGHT_RANGE[0], WEIGHT_RANGE[1])
            return (
              <line
                key={`link-${i}`}
                x1={source.x ?? 0}
                y1={source.y ?? 0}
                x2={target.x ?? 0}
                y2={target.y ?? 0}
                stroke="#404040"
                strokeWidth={thickness}
                strokeOpacity={0.5}
              />
            )
          })}

          {nodes.map((node) => (
            <g
              key={node.id}
              transform={`translate(${node.x ?? 0}, ${node.y ?? 0})`}
              style={{ cursor: 'pointer' }}
              onClick={() => handleNodeClick(node.id)}
            >
              <circle
                r={node.radius}
                fill={isCenter(node.id) ? colorForType(node.entityType) : `${colorForType(node.entityType)}40`}
                stroke={colorForType(node.entityType)}
                strokeWidth={isCenter(node.id) ? 3 : 1.5}
                opacity={isCenter(node.id) ? 1 : 0.8}
                className="transition-opacity duration-200"
              />
              <text
                textAnchor="middle"
                dy={node.radius + 14}
                fill="#a3a3a3"
                fontSize={11}
                className="pointer-events-none select-none transition-opacity duration-200"
              >
                {node.value}
              </text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  )
}
