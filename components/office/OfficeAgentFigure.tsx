import type { CSSProperties } from 'react';
import type { OfficeAgentSnapshot } from '@/lib/office-types';

interface OfficeAgentFigureProps {
  agent: OfficeAgentSnapshot;
  x: number;
  y: number;
  selected: boolean;
  onSelect: (agentId: string) => void;
}

const PRESENCE_STYLES = {
  working: {
    glow: 'shadow-[0_0_30px_rgba(94,234,212,0.35)]',
    ring: 'border-emerald-300/45',
    badge: 'bg-emerald-300/20 text-emerald-100',
    animation: 'office-agent office-agent--working',
  },
  idle: {
    glow: 'shadow-[0_0_22px_rgba(251,191,36,0.2)]',
    ring: 'border-amber-300/35',
    badge: 'bg-amber-300/20 text-amber-100',
    animation: 'office-agent office-agent--idle',
  },
  offline: {
    glow: 'shadow-[0_0_18px_rgba(100,116,139,0.2)]',
    ring: 'border-slate-500/30',
    badge: 'bg-slate-500/20 text-slate-200',
    animation: 'office-agent office-agent--offline',
  },
} as const;

export default function OfficeAgentFigure({ agent, x, y, selected, onSelect }: OfficeAgentFigureProps) {
  const style = {
    left: `${x}%`,
    top: `${y}%`,
  } as CSSProperties;

  const palette = PRESENCE_STYLES[agent.presence];

  return (
    <button
      type="button"
      style={style}
      onClick={() => onSelect(agent.id)}
      className={`absolute -translate-x-1/2 -translate-y-1/2 text-left ${palette.animation}`}
      aria-label={`Abrir detalle de ${agent.displayName}`}
    >
      <div
        className={`relative rounded-[1.5rem] border bg-[#0f131a]/90 px-3 py-3 backdrop-blur-sm transition ${palette.ring} ${palette.glow} ${
          selected ? 'scale-[1.04] border-cyan-300/55 bg-[#121923]' : 'hover:scale-[1.02]'
        }`}
      >
        <div className="mb-2 flex items-end gap-3">
          <div className="office-figure">
            <span className="office-figure__head" />
            <span className="office-figure__torso" />
            <span className="office-figure__legs" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm text-corso-cream">{agent.displayName}</div>
            <div className="truncate text-[11px] uppercase tracking-[0.28em] text-corso-subtle">{agent.model}</div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 text-[11px]">
          <span className={`rounded-full px-2 py-1 uppercase tracking-[0.25em] ${palette.badge}`}>{agent.presence}</span>
          <span className="text-corso-subtle">{agent.activeSessions} sesión{agent.activeSessions === 1 ? '' : 'es'}</span>
        </div>
      </div>
    </button>
  );
}
