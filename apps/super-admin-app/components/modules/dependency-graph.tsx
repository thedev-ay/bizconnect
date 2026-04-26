'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  ReactFlow, Background, Controls, Handle, Position, MarkerType,
  type Node, type Edge, type NodeProps, type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  ShoppingCart, Percent, Wrench, CalendarDays, ClipboardList,
  Users2, MonitorSmartphone, Receipt, Users, Settings, Building2,
  LayoutDashboard, Star, Boxes, type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const HIGHLIGHT = { bg: '#f0fdfa', border: '#0d9488', text: '#0f766e', accent: '#14b8a6', activeBg: '#ccfbf1', activeBorder: '#0f766e' };

interface ModuleData {
  label: string;
  icon: LucideIcon;
  dimmed: boolean;
  highlighted: boolean;
}

interface ModuleDef {
  id: string;
  label: string;
  icon: LucideIcon;
  x: number;
  y: number;
}

// Each node exposes a source + target handle on all four sides so edges can
// enter and exit from whichever side makes the most sense geometrically.
const HANDLE_CLS = '!opacity-0 !pointer-events-none';

function ModuleNode({ data }: NodeProps) {
  const { label, icon: Icon, dimmed, highlighted } = data as unknown as ModuleData;

  return (
    <>
      <Handle type="source" position={Position.Top}    id="src-top"    className={HANDLE_CLS} />
      <Handle type="source" position={Position.Bottom} id="src-bottom" className={HANDLE_CLS} />
      <Handle type="source" position={Position.Left}   id="src-left"   className={HANDLE_CLS} />
      <Handle type="source" position={Position.Right}  id="src-right"  className={HANDLE_CLS} />
      <Handle type="target" position={Position.Top}    id="tgt-top"    className={HANDLE_CLS} />
      <Handle type="target" position={Position.Bottom} id="tgt-bottom" className={HANDLE_CLS} />
      <Handle type="target" position={Position.Left}   id="tgt-left"   className={HANDLE_CLS} />
      <Handle type="target" position={Position.Right}  id="tgt-right"  className={HANDLE_CLS} />

      <div
        className={cn(
          'flex items-center gap-2 rounded-[10px] border px-3 py-2 transition-all duration-150 select-none cursor-default',
          dimmed && 'opacity-[0.18]',
        )}
        style={{
          background: highlighted ? HIGHLIGHT.activeBg : HIGHLIGHT.bg,
          borderColor: highlighted ? HIGHLIGHT.activeBorder : HIGHLIGHT.border,
          borderWidth: 1.5,
          boxShadow: highlighted
            ? `0 0 0 3px ${HIGHLIGHT.accent}38, 0 2px 10px rgb(0 0 0 / 0.08)`
            : '0 1px 3px rgb(0 0 0 / 0.06)',
        }}
      >
        <div
          className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[7px] transition-colors duration-150"
          style={{ background: highlighted ? `${HIGHLIGHT.accent}33` : `${HIGHLIGHT.accent}22` }}
        >
          <Icon size={13} color={HIGHLIGHT.accent} />
        </div>
        <span
          className="whitespace-nowrap text-[12px] font-semibold leading-none transition-colors duration-150"
          style={{ color: HIGHLIGHT.text }}
        >
          {label}
        </span>
      </div>
    </>
  );
}

const NODE_TYPES = { module: ModuleNode };

const MODULES: ModuleDef[] = [
  { id: 'appointments', label: 'Appointments', icon: CalendarDays,      x: 100,    y: 40  },
  { id: 'pos',          label: 'POS',          icon: ShoppingCart,      x: 450,  y: 40  },
  { id: 'job-orders',   label: 'Job Orders',   icon: ClipboardList,     x: 800,  y: 40  },

  { id: 'loyalty',    label: 'Loyalty',    icon: Star,              x: 350,  y: 150 },
  { id: 'inventory',  label: 'Inventory',  icon: Boxes,             x: 550,  y: 150 },
  { id: 'promotions', label: 'Promotions', icon: Percent,           x: 550,  y: 250 },
  { id: 'services',   label: 'Services',   icon: Wrench,            x: 450,  y: 350 },

  { id: 'crm',     label: 'CRM',     icon: Users2,            x: 900, y: 150 },
  { id: 'assets',  label: 'Assets',  icon: MonitorSmartphone, x: 900, y: 250 },
  { id: 'billing', label: 'Billing', icon: Receipt,           x: 1000, y: 150 },
  { id: 'hr',      label: 'HR',      icon: Users,             x: 0, y: 150 },

  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, x: 0,   y: 500 },
  { id: 'users',     label: 'Users',     icon: Users,           x: 250, y: 500 },
  { id: 'settings',  label: 'Settings',  icon: Settings,        x: 500, y: 500 },
  { id: 'branches',  label: 'Branches',  icon: Building2,       x: 750, y: 500 },
];

type Side = 'top' | 'bottom' | 'left' | 'right';
interface EdgeDef {
  src: string;
  tgt: string;
  srcHandle?: Side;
  tgtHandle?: Side;
}

const DEPENDENCY_EDGES: EdgeDef[] = [
  { src: 'crm',          tgt: 'assets'    },
  { src: 'pos',          tgt: 'inventory' },
  { src: 'pos',          tgt: 'services'  },
  { src: 'pos',          tgt: 'loyalty'   },
  { src: 'inventory',    tgt: 'promotions'},
  { src: 'job-orders',   tgt: 'crm'       },
  { src: 'job-orders',   tgt: 'services', srcHandle: 'bottom', tgtHandle: 'right' },
  { src: 'job-orders',   tgt: 'billing', srcHandle: 'right', tgtHandle: 'top' },
  { src: 'appointments', tgt: 'services', srcHandle: 'bottom', tgtHandle: 'left' },
  { src: 'appointments', tgt: 'hr'        },
];

// Pick which handle pair to use based on the dominant direction between nodes.
// Horizontal wins when |dx| >= |dy|, vertical otherwise.
function pickHandles(src: ModuleDef, tgt: ModuleDef) {
  const dx = tgt.x - src.x;
  const dy = tgt.y - src.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0
      ? { sourceHandle: 'src-right', targetHandle: 'tgt-left' }
      : { sourceHandle: 'src-left',  targetHandle: 'tgt-right' };
  }
  return dy >= 0
    ? { sourceHandle: 'src-bottom', targetHandle: 'tgt-top' }
    : { sourceHandle: 'src-top',    targetHandle: 'tgt-bottom' };
}

export function ModuleDependencyGraph() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const { connectedIds, highlightedEdgeIds } = useMemo(() => {
    if (!hoveredId) return { connectedIds: new Set<string>(), highlightedEdgeIds: new Set<string>() };
    const edgeIds = new Set<string>();
    const nodeIds = new Set<string>([hoveredId]);
    const queue = [hoveredId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const { src, tgt } of DEPENDENCY_EDGES) {
        if (src === current && !nodeIds.has(tgt)) {
          edgeIds.add(`${src}→${tgt}`);
          nodeIds.add(tgt);
          queue.push(tgt);
        }
      }
    }
    return { connectedIds: nodeIds, highlightedEdgeIds: edgeIds };
  }, [hoveredId]);

  const nodes = useMemo<Node[]>(() =>
    MODULES.map(({ id, label, icon, x, y }) => ({
      id,
      type: 'module',
      position: { x, y },
      data: {
        label, icon,
        dimmed: !!hoveredId && !connectedIds.has(id),
        highlighted: !!hoveredId && connectedIds.has(id),
      } satisfies ModuleData,
      style: { background: 'transparent', border: 'none', padding: 0 },
    })),
  [hoveredId, connectedIds]);

  const edges = useMemo<Edge[]>(() =>
    DEPENDENCY_EDGES.map(({ src: srcId, tgt: tgtId, srcHandle, tgtHandle }) => {
      const id = `${srcId}→${tgtId}`;
      const active = highlightedEdgeIds.has(id);
      const dimmed = !!hoveredId && !active;
      const color = active ? HIGHLIGHT.accent : '#d1d5db';
      const srcMod = MODULES.find(m => m.id === srcId)!;
      const tgtMod = MODULES.find(m => m.id === tgtId)!;
      const handles = srcHandle && tgtHandle
        ? { sourceHandle: `src-${srcHandle}`, targetHandle: `tgt-${tgtHandle}` }
        : pickHandles(srcMod, tgtMod);
      return {
        id,
        source: srcId,
        target: tgtId,
        type: 'smoothstep',
        animated: active,
        ...handles,
        markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12, color },
        style: { stroke: color, strokeWidth: active ? 2 : 1.5, opacity: dimmed ? 0.08 : 1, transition: 'all 0.15s ease' },
      };
    }),
  [hoveredId, highlightedEdgeIds]);

  const onMouseEnter = useCallback<NodeMouseHandler>((_, node) => setHoveredId(node.id), []);
  const onMouseLeave = useCallback<NodeMouseHandler>(() => setHoveredId(null), []);

  return (
    <div className="space-y-3">
      <div className="h-[560px] overflow-hidden rounded-xl border border-border/60 bg-muted/30">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={NODE_TYPES}
          onNodeMouseEnter={onMouseEnter}
          onNodeMouseLeave={onMouseLeave}
          fitView
          fitViewOptions={{ padding: 0.12 }}
          proOptions={{ hideAttribution: true }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag
          zoomOnScroll
          minZoom={0.35}
          maxZoom={2.5}
        >
          <Background color="#e2e8f0" gap={24} size={1} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </div>
  );
}
