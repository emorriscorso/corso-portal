import type { OfficeAgentSnapshot } from '@/lib/office-types';

interface OfficeAgentFigureProps {
  agent: OfficeAgentSnapshot;
  selected: boolean;
  onSelect: (agentId: string) => void;
}

const PRESENCE_STYLES = {
  working: {
    dot: 'bg-emerald-500',
    badge: 'border-emerald-600/20 bg-emerald-500/10 text-emerald-700',
    ring: 'border-emerald-600/20',
  },
  idle: {
    dot: 'bg-amber-500',
    badge: 'border-amber-600/20 bg-amber-500/10 text-amber-700',
    ring: 'border-amber-600/20',
  },
  offline: {
    dot: 'bg-slate-400',
    badge: 'border-slate-500/20 bg-slate-500/10 text-slate-600',
    ring: 'border-slate-500/20',
  },
} as const;

function formatRelativeTime(value: string) {
  const deltaMinutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));

  if (deltaMinutes < 1) return 'Justo ahora';
  if (deltaMinutes === 1) return 'Hace 1 min';
  if (deltaMinutes < 60) return `Hace ${deltaMinutes} min`;

  const deltaHours = Math.round(deltaMinutes / 60);
  if (deltaHours === 1) return 'Hace 1 hora';
  if (deltaHours < 24) return `Hace ${deltaHours} horas`;

  const deltaDays = Math.round(deltaHours / 24);
  if (deltaDays === 1) return 'Hace 1 día';
  return `Hace ${deltaDays} días`;
}

export default function OfficeAgentFigure({ agent, selected, onSelect }: OfficeAgentFigureProps) {
  const palette = PRESENCE_STYLES[agent.presence];

  return (
    <button
      type="button"
      onClick={() => onSelect(agent.id)}
      className={`w-full rounded-[1.5rem] border bg-[#f7f3ec] p-4 text-left text-[#211f20] transition hover:border-[#211f20]/18 hover:bg-[#fbf8f3] ${
        selected ? 'border-[#211f20]/22 shadow-[0_18px_44px_rgba(33,31,32,0.10)]' : `border-[#211f20]/10 ${palette.ring}`
      }`}
      aria-label={`Abrir detalle de ${agent.displayName}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm text-[#211f20]">
            <span className={`h-2.5 w-2.5 rounded-full ${palette.dot}`} />
            <span className="truncate">{agent.displayName}</span>
          </div>
          <div className="mt-1 truncate text-xs uppercase tracking-[0.22em] text-[#211f20]/45">{agent.model}</div>
        </div>

        <span className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.22em] ${palette.badge}`}>
          {agent.statusLabel}
        </span>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-[#211f20]/72">{agent.statusReason}</p>

      <div className="mt-4 flex items-center justify-between gap-3 text-xs text-[#211f20]/48">
        <span>{agent.activeSessions} sesión activa</span>
        <span>{formatRelativeTime(agent.updatedAt)}</span>
      </div>
    </button>
  );
}
