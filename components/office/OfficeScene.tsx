import type { OfficeAgentSnapshot, OfficeBubble } from '@/lib/office-types';
import OfficeAgentFigure from './OfficeAgentFigure';

interface OfficeSceneProps {
  agents: OfficeAgentSnapshot[];
  bubbles: OfficeBubble[];
  selectedAgentId: string | null;
  loading: boolean;
  onSelectAgent: (agentId: string) => void;
}

const DESKS = [
  { x: 18, y: 30 },
  { x: 36, y: 28 },
  { x: 54, y: 30 },
  { x: 72, y: 28 },
  { x: 24, y: 54 },
  { x: 42, y: 52 },
  { x: 60, y: 54 },
  { x: 78, y: 52 },
];

const WAYPOINTS = [
  { x: 12, y: 22 },
  { x: 24, y: 70 },
  { x: 48, y: 18 },
  { x: 54, y: 72 },
  { x: 84, y: 18 },
  { x: 88, y: 64 },
  { x: 14, y: 48 },
  { x: 70, y: 74 },
];

const REST_AREA = [
  { x: 86, y: 84 },
  { x: 76, y: 86 },
  { x: 66, y: 84 },
  { x: 56, y: 86 },
  { x: 46, y: 84 },
  { x: 36, y: 86 },
];

function buildPosition(index: number, anchors: Array<{ x: number; y: number }>) {
  const base = anchors[index % anchors.length];
  const layer = Math.floor(index / anchors.length);

  return {
    x: base.x + (layer % 3) * 2,
    y: base.y + Math.floor(layer / 3) * 3,
  };
}

function formatBubbleText(text: string) {
  return text.length > 74 ? `${text.slice(0, 71)}...` : text;
}

export default function OfficeScene({ agents, bubbles, selectedAgentId, loading, onSelectAgent }: OfficeSceneProps) {
  const workingAgents = agents.filter((agent) => agent.presence === 'working');
  const idleAgents = agents.filter((agent) => agent.presence === 'idle');
  const offlineAgents = agents.filter((agent) => agent.presence === 'offline');

  const positionMap = new Map<string, { x: number; y: number }>();

  workingAgents.forEach((agent, index) => {
    positionMap.set(agent.id, buildPosition(index, DESKS));
  });

  idleAgents.forEach((agent, index) => {
    positionMap.set(agent.id, buildPosition(index, WAYPOINTS));
  });

  offlineAgents.forEach((agent, index) => {
    positionMap.set(agent.id, buildPosition(index, REST_AREA));
  });

  const visibleBubbles = bubbles
    .filter((bubble) => positionMap.has(bubble.agentId))
    .slice(0, 8);

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#07090d] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.45)] sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm uppercase tracking-[0.35em] text-corso-subtle">Escena operativa</h3>
          <p className="mt-1 text-sm text-corso-subtle">
            Activos en escritorio, pausados en tránsito, offline en quiet bay.
          </p>
        </div>
        {loading && <div className="text-xs uppercase tracking-[0.35em] text-cyan-200">Sincronizando...</div>}
      </div>

      <div className="office-scene relative min-h-[620px] overflow-hidden rounded-[1.75rem] border border-white/5 bg-[radial-gradient(circle_at_top,_rgba(51,65,85,0.45),_transparent_42%),linear-gradient(180deg,_#121826_0%,_#0b1019_30%,_#06080d_100%)]">
        <div className="office-scene__scanlines" />
        <div className="office-scene__vignette" />
        <div className="office-scene__ambient" />

        <div className="absolute inset-x-[10%] top-[12%] h-[16%] rounded-[2rem] border border-cyan-400/10 bg-cyan-400/5 blur-2xl" />
        <div className="absolute left-[5%] top-[18%] text-[10px] uppercase tracking-[0.45em] text-cyan-100/70">Command floor</div>
        <div className="absolute left-[7%] top-[72%] text-[10px] uppercase tracking-[0.45em] text-amber-100/70">Transit lane</div>
        <div className="absolute right-[7%] top-[84%] text-[10px] uppercase tracking-[0.45em] text-slate-200/60">Quiet bay</div>

        <div className="absolute inset-x-[8%] bottom-[12%] top-[18%] rounded-[2.5rem] border border-white/5 bg-[linear-gradient(180deg,rgba(15,23,42,0.1),rgba(6,8,13,0.4)),linear-gradient(120deg,rgba(15,23,42,0.32),transparent_60%)]" />
        <div className="absolute inset-x-[10%] top-[44%] h-px bg-white/10" />
        <div className="absolute inset-x-[10%] top-[66%] h-px bg-white/5" />

        {DESKS.map((desk, index) => {
          const occupant = workingAgents[index] || null;
          return (
            <div
              key={`desk-${index}`}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${desk.x}%`, top: `${desk.y + 7}%` }}
            >
              <div className={`office-desk ${occupant ? 'office-desk--active' : ''}`}>
                <div className="office-desk__monitor" />
                <div className="office-desk__surface" />
                <div className="office-desk__chair" />
              </div>
            </div>
          );
        })}

        <div className="absolute inset-x-[10%] bottom-[8%] flex gap-4 overflow-hidden rounded-[2rem] border border-white/5 bg-white/[0.02] px-6 py-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={`rest-${index}`} className="flex-1 rounded-[1.5rem] border border-white/5 bg-slate-400/[0.04] p-3">
              <div className="mb-2 h-2 w-12 rounded-full bg-white/10" />
              <div className="h-10 rounded-[1rem] bg-white/[0.03]" />
            </div>
          ))}
        </div>

        {agents.map((agent) => {
          const position = positionMap.get(agent.id) || { x: 50, y: 50 };

          return (
            <OfficeAgentFigure
              key={agent.id}
              agent={agent}
              x={position.x}
              y={position.y}
              selected={selectedAgentId === agent.id}
              onSelect={onSelectAgent}
            />
          );
        })}

        {visibleBubbles.map((bubble, index) => {
          const anchor = positionMap.get(bubble.agentId);
          if (!anchor) return null;

          return (
            <div
              key={bubble.id}
              className={`office-bubble ${bubble.kind === 'handoff' ? 'office-bubble--handoff' : 'office-bubble--update'}`}
              style={{
                left: `${Math.min(anchor.x + (index % 2 === 0 ? 5 : -11), 92)}%`,
                top: `${Math.max(anchor.y - 14 - (index % 3) * 3, 10)}%`,
              }}
            >
              <div className="text-[10px] uppercase tracking-[0.32em] text-white/55">{bubble.kind}</div>
              <div className="mt-1 text-xs leading-relaxed text-corso-cream">{formatBubbleText(bubble.text)}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
