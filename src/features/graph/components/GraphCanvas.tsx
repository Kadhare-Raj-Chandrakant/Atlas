import { useRef, useEffect, useCallback, useState, useMemo } from 'react'
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  forceX,
  forceY,
  type ForceLink,
  type Simulation,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from 'd3-force'
import type { RelatedEntitiesResponse, RelatedEntity, GlobalGraphResponse } from '../types'

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
const WEIGHT_RANGE = [1.5, 7]
const MAX_NODES = 1000
const LABEL_ZOOM = 0.8
const DIM = 0.18
const FADE_MS = 350

function mapRange(value: number, min: number, max: number, outMin: number, outMax: number): number {
  if (max === min) return (outMin + outMax) / 2
  return outMin + ((value - min) / (max - min)) * (outMax - outMin)
}

interface SimNode extends SimulationNodeDatum {
  id: string
  entityType: string
  value: string
  occurrenceCount: number
  confidence: number
  relationshipCount: number
  radius: number
  opacity: number
  justAdded: boolean
}

interface SimLink extends SimulationLinkDatum<SimNode> {
  weight: number
  opacity: number
  justAdded: boolean
}

type NodeRef = string | number | SimNode
const nodeId = (x: NodeRef): string => (typeof x === 'object' ? x.id : String(x))

interface GraphCanvasProps {
  data?: RelatedEntitiesResponse | null
  globalData?: GlobalGraphResponse | null
  onNodeClick: (entityId: string) => void
  onNodeDoubleClick: (entityId: string) => void
}

export function GraphCanvas({ data, globalData, onNodeClick, onNodeDoubleClick }: GraphCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const simRef = useRef<Simulation<SimNode, SimLink> | null>(null)
  const linkForceRef = useRef<ForceLink<SimNode, SimLink> | null>(null)
  const nodesRef = useRef<Map<string, SimNode>>(new Map())
  const linksRef = useRef<Map<string, SimLink>>(new Map())
  const removingNodesRef = useRef<Map<string, SimNode>>(new Map())
  const removingLinksRef = useRef<Map<string, SimLink>>(new Map())
  const focusRef = useRef<string>(data?.center?.id || globalData?.nodes[0]?.id || '')
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingRef = useRef<string | null>(null)

  const [transformState, setTransformState] = useState({ x: 0, y: 0, k: 1 })
  const transformRef = useRef({ x: 0, y: 0, k: 1 })
  const animRef = useRef<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const setTransform = useCallback((tOrFn: { x: number; y: number; k: number } | ((prev: { x: number; y: number; k: number }) => { x: number; y: number; k: number })) => {
    setTransformState((prev) => {
      const next = typeof tOrFn === 'function' ? tOrFn(prev) : tOrFn
      transformRef.current = next
      return next
    })
  }, [])

  const transform = transformState
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; entity: RelatedEntity } | null>(null)
  const [version, setVersion] = useState(0)

  const dimsRef = useRef({ w: 800, h: 600 })

  const bump = useCallback(() => setVersion((v) => v + 1), [])

  // Track viewport size with ResizeObserver.
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const measure = () => {
      if (el.clientWidth && el.clientHeight) {
        dimsRef.current = { w: el.clientWidth, h: el.clientHeight }
      }
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])

  const colorFor = useCallback((type: string) => ENTITY_COLORS[type] || '#737373', [])
  const linkKey = useCallback((a: string, b: string) => [a, b].sort().join('|'), [])

  // ---- Data / neighborhood change: accumulate, morph, re-center, prune ----
  useEffect(() => {
    const allEntities = globalData
      ? globalData.nodes
      : data
        ? [data.center, ...data.related]
        : []
    if (allEntities.length === 0) return

    if (data?.center) {
      focusRef.current = data.center.id
    } else if (globalData?.nodes.length && !focusRef.current) {
      focusRef.current = globalData.nodes[0]?.id || ''
    }

    const occValues = [
      ...[...nodesRef.current.values()].map((n) => n.occurrenceCount),
      ...allEntities.map((e) => e.occurrenceCount),
    ]
    const maxOcc = Math.max(...occValues, 1)
    const minOcc = Math.min(...occValues, 1)
    const wValues = globalData
      ? [...globalData.links.map((l) => l.weight), 1]
      : data
        ? [...data.related.map((e) => e.relationshipWeight), 1]
        : [1]
    const maxW = Math.max(...wValues)

    const ensureNode = (e: RelatedEntity) => {
      let n = nodesRef.current.get(e.id)
      const radius = mapRange(e.occurrenceCount, minOcc, maxOcc, RADIUS_RANGE[0], RADIUS_RANGE[1])
      if (!n) {
        const seed = nodesRef.current.get(focusRef.current)
        const baseX = seed?.x ?? dimsRef.current.w / 2
        const baseY = seed?.y ?? dimsRef.current.h / 2
        n = {
          id: e.id,
          entityType: e.entityType,
          value: e.value,
          occurrenceCount: e.occurrenceCount,
          confidence: e.confidence,
          relationshipCount: e.relationshipCount,
          radius,
          x: baseX + (Math.random() - 0.5) * 80,
          y: baseY + (Math.random() - 0.5) * 80,
          opacity: globalData ? 1 : 0,
          justAdded: true,
        }
        nodesRef.current.set(e.id, n)
      } else {
        n.entityType = e.entityType
        n.value = e.value
        n.occurrenceCount = e.occurrenceCount
        n.confidence = e.confidence
        n.relationshipCount = e.relationshipCount
        n.radius = radius
      }
    }

    if (globalData) {
      for (const n of globalData.nodes) {
        ensureNode(n)
      }
      for (const l of globalData.links) {
        if (nodesRef.current.has(l.source) && nodesRef.current.has(l.target)) {
          const key = linkKey(l.source, l.target)
          if (!linksRef.current.has(key)) {
            linksRef.current.set(key, {
              source: l.source,
              target: l.target,
              weight: l.weight,
              opacity: globalData ? 1 : 0,
              justAdded: true,
            })
          } else {
            const existing = linksRef.current.get(key)!
            existing.weight = l.weight
          }
        }
      }
    } else if (data) {
      const center = data.center
      ensureNode(center)
      for (const r of data.related) {
        ensureNode(r)
        const key = linkKey(center.id, r.id)
        if (!linksRef.current.has(key)) {
          linksRef.current.set(key, {
            source: center.id,
            target: r.id,
            weight: r.relationshipWeight,
            opacity: 0,
            justAdded: true,
          })
        }
      }
    }

    // Prune beyond cap (fade out least-connected, non-focus nodes).
    if (nodesRef.current.size > MAX_NODES) {
      const degree = (id: string) =>
        [...linksRef.current.values()].filter((l) => nodeId(l.source) === id || nodeId(l.target) === id).length
      const sorted = [...nodesRef.current.values()]
        .filter((n) => n.id !== focusRef.current)
        .sort((a, b) => degree(a.id) - degree(b.id))
      const toRemove = sorted.slice(0, nodesRef.current.size - MAX_NODES)
      for (const n of toRemove) {
        n.opacity = 0
        removingNodesRef.current.set(n.id, n)
        nodesRef.current.delete(n.id)
        for (const [k, l] of [...linksRef.current.entries()]) {
          if (nodeId(l.source) === n.id || nodeId(l.target) === n.id) {
            l.opacity = 0
            removingLinksRef.current.set(k, l)
            linksRef.current.delete(k)
          }
        }
      }
    }

    const simNodes = [...nodesRef.current.values(), ...removingNodesRef.current.values()]
    const simLinks = [...linksRef.current.values(), ...removingLinksRef.current.values()]

    if (!simRef.current) {
      const sim = forceSimulation<SimNode>(simNodes)
        .force(
          'link',
          forceLink<SimNode, SimLink>(simLinks)
            .id((d) => d.id)
            .distance(110)
            .strength((l) => 0.2 + (l.weight / Math.max(maxW, 1)) * 0.3),
        )
        .force('charge', forceManyBody<SimNode>().strength(-380))
        .force('center', forceCenter(dimsRef.current.w / 2, dimsRef.current.h / 2).strength(0.05))
        .force('collide', forceCollide<SimNode>().radius((d) => d.radius + 12).strength(0.9))
        .force('x', forceX<SimNode>(dimsRef.current.w / 2).strength(0.03))
        .force('y', forceY<SimNode>(dimsRef.current.h / 2).strength(0.03))
        .alphaDecay(0.045)
        .velocityDecay(0.4)
        .on('tick', bump)
        .on('end', bump)
      simRef.current = sim
      linkForceRef.current = sim.force('link') as ForceLink<SimNode, SimLink>
    } else {
      const sim = simRef.current
      sim.nodes(simNodes)
      linkForceRef.current?.links(simLinks)
      sim.alpha(0.7).restart()
    }

    // Fade in newly added entities/links next frame.
    const raf = requestAnimationFrame(() => {
      for (const n of nodesRef.current.values()) if (n.justAdded) n.opacity = 1
      for (const l of linksRef.current.values()) if (l.justAdded) l.opacity = 1
      bump()
    })
    const t1 = setTimeout(() => {
      for (const n of nodesRef.current.values()) n.justAdded = false
      for (const l of linksRef.current.values()) l.justAdded = false
      bump()
    }, FADE_MS)
    const t2 = setTimeout(() => {
      removingNodesRef.current.clear()
      removingLinksRef.current.clear()
      const sim = simRef.current
      if (sim) {
        sim.nodes([...nodesRef.current.values()])
        linkForceRef.current?.links([...linksRef.current.values()])
        sim.alpha(0.3).restart()
      }
      bump()
    }, FADE_MS)

    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(t1)
      clearTimeout(t2)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, globalData])

  // ---- Click (single = re-center, double = open detail) ----
  const handleNodeClick = useCallback(
    (entityId: string) => {
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current)
        clickTimerRef.current = null
        if (pendingRef.current === entityId) {
          pendingRef.current = null
          onNodeDoubleClick(entityId)
          return
        }
      }
      pendingRef.current = entityId
      clickTimerRef.current = setTimeout(() => {
        clickTimerRef.current = null
        if (pendingRef.current) {
          onNodeClick(pendingRef.current)
          pendingRef.current = null
        }
      }, 300)
    },
    [onNodeClick, onNodeDoubleClick],
  )

  // ---- Animation & Transition Utilities ----
  const cancelAnimation = useCallback(() => {
    if (animRef.current !== null) {
      cancelAnimationFrame(animRef.current)
      animRef.current = null
    }
  }, [])

  const animateTransformTo = useCallback((targetX: number, targetY: number, targetK: number, duration = 450) => {
    cancelAnimation()
    const start = { ...transformRef.current }
    const startTime = performance.now()

    const step = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3)

      const currentX = start.x + (targetX - start.x) * ease
      const currentY = start.y + (targetY - start.y) * ease
      const currentK = start.k + (targetK - start.k) * ease

      setTransform({ x: currentX, y: currentY, k: currentK })

      if (progress < 1) {
        animRef.current = requestAnimationFrame(step)
      } else {
        animRef.current = null
      }
    }

    animRef.current = requestAnimationFrame(step)
  }, [cancelAnimation, setTransform])

  // ---- Controls ----
  const fitGraph = useCallback(() => {
    const ns = [...nodesRef.current.values()]
    if (!ns.length) return
    const xs = ns.map((n) => n.x ?? 0)
    const ys = ns.map((n) => n.y ?? 0)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    const { w, h } = dimsRef.current
    const pad = 60
    const gw = maxX - minX || 1
    const gh = maxY - minY || 1
    const k = Math.min((w - 2 * pad) / gw, (h - 2 * pad) / gh, 4)
    const kk = Math.max(0.2, Math.min(k, 4))
    const cx = (minX + maxX) / 2
    const cy = (minY + maxY) / 2
    animateTransformTo(w / 2 - cx * kk, h / 2 - cy * kk, kk)
  }, [animateTransformTo])

  const resetView = useCallback(() => {
    const f = nodesRef.current.get(focusRef.current)
    const { w, h } = dimsRef.current
    const target = f ? { x: w / 2 - (f.x ?? 0), y: h / 2 - (f.y ?? 0), k: 1 } : { x: w / 2, y: h / 2, k: 1 }
    animateTransformTo(target.x, target.y, target.k)
  }, [animateTransformTo])

  // ---- Zoom ----
  const zoomAt = useCallback((factor: number, clientX?: number, clientY?: number) => {
    cancelAnimation()
    const rect = wrapRef.current?.getBoundingClientRect()
    const { w, h } = dimsRef.current
    const cx = clientX !== undefined && rect ? clientX - rect.left : w / 2
    const cy = clientY !== undefined && rect ? clientY - rect.top : h / 2

    const t = transformRef.current
    const kNew = t.k * factor

    // Automatic smooth recentering and fitting when zoomed all the way out
    if (kNew <= 0.22 || (t.k <= 0.25 && factor < 1)) {
      fitGraph()
      return
    }

    const k = Math.min(kNew, 4)
    // Dynamic coordinate transformation: keep world coordinate exactly under cursor fixed at screen (cx, cy)
    const x = cx - (cx - t.x) * (k / t.k)
    const y = cy - (cy - t.y) * (k / t.k)

    setTransform({ x, y, k })
  }, [cancelAnimation, fitGraph, setTransform])

  const zoomBy = useCallback((factor: number) => {
    zoomAt(factor)
  }, [zoomAt])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const factor = e.deltaY > 0 ? 0.86 : 1.16
    zoomAt(factor, e.clientX, e.clientY)
  }, [zoomAt])

  // ---- Pan ----
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as Element
      if (target.closest('[role="button"]') || target.closest('button')) return
      cancelAnimation()
      setIsDragging(true)
      const startX = e.clientX
      const startY = e.clientY
      const startT = { ...transformRef.current }
      const move = (me: MouseEvent) => {
        setTransform({
          x: startT.x + (me.clientX - startX),
          y: startT.y + (me.clientY - startY),
          k: startT.k,
        })
      }
      const up = () => {
        setIsDragging(false)
        window.removeEventListener('mousemove', move)
        window.removeEventListener('mouseup', up)
      }
      window.addEventListener('mousemove', move)
      window.addEventListener('mouseup', up)
    },
    [cancelAnimation, setTransform],
  )

  // ---- Touch Gestures ----
  const touchStartRef = useRef<{ touches: { x: number; y: number }[]; startT: { x: number; y: number; k: number }; dist?: number; mid?: { x: number; y: number } } | null>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const target = e.target as Element
    if (target.closest('[role="button"]') || target.closest('button')) return
    cancelAnimation()
    const touches = Array.from(e.touches).map((t) => ({ x: t.clientX, y: t.clientY }))
    const startT = { ...transformRef.current }
    if (touches.length === 1) {
      touchStartRef.current = { touches, startT }
    } else if (touches.length === 2) {
      const dx = touches[1].x - touches[0].x
      const dy = touches[1].y - touches[0].y
      const dist = Math.sqrt(dx * dx + dy * dy)
      const mid = { x: (touches[0].x + touches[1].x) / 2, y: (touches[0].y + touches[1].y) / 2 }
      touchStartRef.current = { touches, startT, dist, mid }
    }
  }, [cancelAnimation])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return
    const touches = Array.from(e.touches).map((t) => ({ x: t.clientX, y: t.clientY }))
    const { startT, dist: startDist, mid: startMid, touches: origTouches } = touchStartRef.current

    if (touches.length === 1 && origTouches.length === 1) {
      setTransform({
        x: startT.x + (touches[0].x - origTouches[0].x),
        y: startT.y + (touches[0].y - origTouches[0].y),
        k: startT.k,
      })
    } else if (touches.length === 2 && startDist && startMid) {
      const dx = touches[1].x - touches[0].x
      const dy = touches[1].y - touches[0].y
      const dist = Math.sqrt(dx * dx + dy * dy)
      const mid = { x: (touches[0].x + touches[1].x) / 2, y: (touches[0].y + touches[1].y) / 2 }

      const factor = dist / (startDist || 1)
      const kNew = startT.k * factor

      if (kNew <= 0.22) {
        fitGraph()
        touchStartRef.current = null
        return
      }

      const k = Math.min(kNew, 4)
      const rect = wrapRef.current?.getBoundingClientRect()
      const cx = rect ? startMid.x - rect.left : dimsRef.current.w / 2
      const cy = rect ? startMid.y - rect.top : dimsRef.current.h / 2

      const panX = mid.x - startMid.x
      const panY = mid.y - startMid.y
      const x = cx - (cx - startT.x) * (k / startT.k) + panX
      const y = cy - (cy - startT.y) * (k / startT.k) + panY

      setTransform({ x, y, k })
    }
  }, [fitGraph, setTransform])

  const handleTouchEnd = useCallback(() => {
    touchStartRef.current = null
  }, [])

  // ---- Hover / tooltip ----
  const showTooltip = useCallback((entity: RelatedEntity, clientX: number, clientY: number) => {
    const rect = wrapRef.current?.getBoundingClientRect()
    const x = clientX - (rect?.left ?? 0) + 14
    const y = clientY - (rect?.top ?? 0) + 14
    setTooltip({ x, y, entity })
  }, [])

  const hideTooltip = useCallback(() => setTooltip(null), [])

  // ---- Derived render data ----
  const { nodes, links, adjacency } = useMemo(() => {
    const allNodeMap = new Map<string, SimNode>()
    for (const n of nodesRef.current.values()) allNodeMap.set(n.id, n)
    for (const n of removingNodesRef.current.values()) allNodeMap.set(n.id, n)

    const adj = new Map<string, Set<string>>()
    for (const l of linksRef.current.values()) {
      const a = nodeId(l.source)
      const b = nodeId(l.target)
      if (!adj.has(a)) adj.set(a, new Set())
      if (!adj.has(b)) adj.set(b, new Set())
      adj.get(a)!.add(b)
      adj.get(b)!.add(a)
    }

    return {
      nodes: [...allNodeMap.values()],
      links: [...linksRef.current.values(), ...removingLinksRef.current.values()],
      adjacency: adj,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version])

  const activeId = hoverId ?? focusRef.current
  const activeNeighbors = adjacency.get(activeId) ?? new Set<string>()

  const isVisible = (id: string) => {
    if (hoverId !== null) return id === hoverId || activeNeighbors.has(id)
    if (globalData) return true
    return id === activeId || activeNeighbors.has(id)
  }

  const maxWeight = Math.max(...links.map((l) => l.weight), 1)
  const minWeight = Math.min(...links.map((l) => l.weight), 1)

  return (
    <div ref={wrapRef} className="flex flex-1 h-full w-full relative overflow-hidden">
      {/* Node Count Indicator at Bottom-Left */}
      <div className="absolute bottom-6 left-6 z-20 flex items-center gap-2 rounded-full border border-neutral-800/80 bg-neutral-900/85 px-3.5 py-1.5 text-xs font-medium text-neutral-400 shadow-xl backdrop-blur-md">
        <span className="h-2 w-2 rounded-full bg-primary-500 animate-pulse" />
        <span>{nodes.length} {nodes.length === 1 ? 'dot' : 'dots'} connected</span>
      </div>

      {/* Obsidian-Style Zoom & Navigation Dock at Bottom-Right */}
      <div className="absolute bottom-6 right-6 z-20 flex items-center gap-1.5 rounded-2xl border border-neutral-800/80 bg-neutral-900/90 p-2 shadow-2xl backdrop-blur-md">
        <button
          type="button"
          onClick={() => zoomBy(1.35)}
          title="Zoom In"
          aria-label="Zoom In"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-800/60 text-xl font-bold text-neutral-100 transition-all hover:bg-neutral-700 hover:text-white active:scale-95 shadow-sm"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => zoomBy(0.74)}
          title="Zoom Out"
          aria-label="Zoom Out"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-800/60 text-xl font-bold text-neutral-100 transition-all hover:bg-neutral-700 hover:text-white active:scale-95 shadow-sm"
        >
          −
        </button>
        <div className="mx-1 h-6 w-px bg-neutral-800" />
        <button
          type="button"
          onClick={fitGraph}
          title="Fit Graph to Screen"
          aria-label="Fit Graph to Screen"
          className="rounded-xl px-3.5 py-2 text-xs font-semibold text-neutral-300 transition-all hover:bg-neutral-800 hover:text-white active:scale-95"
        >
          Fit
        </button>
        <button
          type="button"
          onClick={resetView}
          title="Reset Center"
          aria-label="Reset Center"
          className="rounded-xl px-3.5 py-2 text-xs font-semibold text-neutral-300 transition-all hover:bg-neutral-800 hover:text-white active:scale-95"
        >
          Reset
        </button>
      </div>

      {tooltip && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-50 w-60 rounded-xl border border-white/15 bg-neutral-950/70 p-3.5 text-xs shadow-[0_16px_40px_rgba(0,0,0,0.85)] backdrop-blur-xl ring-1 ring-white/15"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <div className="mb-2.5 flex items-center gap-2.5 border-b border-white/10 pb-2">
            <span
              className="inline-block h-3 w-3 shrink-0 rounded-full shadow-sm ring-1 ring-white/20"
              style={{ backgroundColor: colorFor(tooltip.entity.entityType) }}
            />
            <span className="text-sm font-bold tracking-tight text-white">{tooltip.entity.value}</span>
          </div>
          <dl className="space-y-1 text-neutral-300">
            <Row label="Type" value={tooltip.entity.entityType} />
            <Row label="Occurrences" value={String(tooltip.entity.occurrenceCount)} />
            <Row label="Relationships" value={String(tooltip.entity.relationshipCount)} />
            <Row label="Confidence" value={`${Math.round(tooltip.entity.confidence * 100)}%`} />
          </dl>
        </div>
      )}

      <svg
        ref={svgRef}
        className={`h-full w-full ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        role="img"
        aria-label={data?.center ? `Knowledge graph centered on ${data.center.value} with ${data.related.length} related entities` : globalData ? `Global Knowledge Graph with ${globalData.nodes.length} entities` : 'Knowledge graph'}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
          {links.map((link, i) => {
            const a = nodesRef.current.get(nodeId(link.source)) ?? removingNodesRef.current.get(nodeId(link.source))
            const b = nodesRef.current.get(nodeId(link.target)) ?? removingNodesRef.current.get(nodeId(link.target))
            if (!a || !b) return null
            const visible = isVisible(nodeId(link.source)) && isVisible(nodeId(link.target))
            const thickness = mapRange(link.weight, minWeight, maxWeight, WEIGHT_RANGE[0], WEIGHT_RANGE[1])
            return (
              <line
                key={`link-${i}`}
                x1={a.x ?? 0}
                y1={a.y ?? 0}
                x2={b.x ?? 0}
                y2={b.y ?? 0}
                stroke="#525252"
                strokeWidth={thickness}
                strokeOpacity={link.opacity * (visible ? 0.55 : DIM * 0.6)}
                className={link.justAdded ? 'graph-edge--new' : 'transition-[stroke-opacity] duration-300'}
              />
            )
          })}

          {nodes.map((node) => {
            const isCenter = node.id === focusRef.current
            const visible = isVisible(node.id)
            const opacity = node.opacity * (visible ? 1 : DIM)
            const showLabel = transform.k >= LABEL_ZOOM || isCenter
            const highlight = hoverId === node.id || (hoverId !== null && activeNeighbors.has(node.id))
            return (
              <g
                key={node.id}
                transform={`translate(${node.x ?? 0}, ${node.y ?? 0})`}
                tabIndex={0}
                role="button"
                aria-label={`${node.value}, ${node.entityType}, ${node.occurrenceCount} occurrences. Press Enter to focus, double-click for details.`}
                style={{ cursor: 'pointer', opacity, transition: 'opacity 300ms ease' }}
                onClick={() => handleNodeClick(node.id)}
                onMouseEnter={(e) => {
                  setHoverId(node.id)
                  showTooltip(
                    {
                      id: node.id,
                      entityType: node.entityType,
                      value: node.value,
                      occurrenceCount: node.occurrenceCount,
                      confidence: node.confidence,
                      relationshipCount: node.relationshipCount,
                      relationshipWeight: 0,
                    },
                    e.clientX,
                    e.clientY,
                  )
                }}
                onMouseMove={(e) => showTooltip(
                  {
                    id: node.id,
                    entityType: node.entityType,
                    value: node.value,
                    occurrenceCount: node.occurrenceCount,
                    confidence: node.confidence,
                    relationshipCount: node.relationshipCount,
                    relationshipWeight: 0,
                  },
                  e.clientX,
                  e.clientY,
                )}
                onMouseLeave={() => {
                  setHoverId(null)
                  hideTooltip()
                }}
                onFocus={(e) => {
                  setHoverId(node.id)
                  const r = (e.currentTarget as SVGGElement).getBoundingClientRect()
                  showTooltip(
                    {
                      id: node.id,
                      entityType: node.entityType,
                      value: node.value,
                      occurrenceCount: node.occurrenceCount,
                      confidence: node.confidence,
                      relationshipCount: node.relationshipCount,
                      relationshipWeight: 0,
                    },
                    r.left + r.width / 2,
                    r.top,
                  )
                }}
                onBlur={() => {
                  setHoverId(null)
                  hideTooltip()
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleNodeClick(node.id)
                  }
                }}
              >
                <circle
                  r={node.radius}
                  fill={isCenter ? colorFor(node.entityType) : `${colorFor(node.entityType)}66`}
                  stroke={highlight ? '#ffffff' : colorFor(node.entityType)}
                  strokeWidth={isCenter ? 3 : highlight ? 2.5 : 1.5}
                  className="transition-[stroke,stroke-width] duration-200"
                />
                {showLabel && (
                  <text
                    textAnchor="middle"
                    dy={node.radius + 14}
                    fill="#d4d4d4"
                    fontSize={11}
                    className="pointer-events-none select-none"
                  >
                    {node.value}
                  </text>
                )}
              </g>
            )
          })}
        </g>
      </svg>
    </div>
  )
}


function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 py-0.5 border-b border-white/10 last:border-0">
      <dt className="text-neutral-300 font-medium">{label}</dt>
      <dd className="text-white font-semibold">{value}</dd>
    </div>
  )
}
