import type { OfficeAgentSnapshot, OfficeBubble } from '@/lib/office-types';
import OfficeAgentFigure from './OfficeAgentFigure';

interface OfficeSceneProps {
  agents: OfficeAgentSnapshot[];
  bubbles: OfficeBubble[];
  selectedAgentId: string | null;
  loading: boolean;
  onSelectAgent: (agentId: string) => void;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function OfficeScene({ agents, bubbles, selectedAgentId, loading, onSelectAgent }: OfficeSceneProps) {
  const groups = [
    {
      key: 'working' as const,
      title: 'Trabajando',
      description: 'Solo se muestra aquí si hay ejecución real o actividad reciente sustantiva.',
      items: agents.filter((agent) => agent.presence === 'working'),
    },
    {
      key: 'idle' as const,
      title: 'En espera',
      description: 'Actividad reciente sin proceso largo activo.',
      items: agents.filter((agent) => agent.presence === 'idle'),
    },
    {
      key: 'offline' as const,
      title: 'Sin actividad',
      description: 'Sin señal reciente en la telemetría.',
      items: agents.filter((agent) => agent.presence === 'offline'),
    },
  ];

  return (
    <section className="rounded-[2rem] border border-[#ede9e0]/14 bg-[#f2ede5] p-4 text-[#211f20] shadow-[0_24px_60px_rgba(0,0,0,0.16)] sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-sm uppercase tracking-[0.28em] text-[#211f20]/46">Estado operativo</h3>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#211f20]/68">
            La vista se organiza por estado real, no por decoración. Si no hay telemetría suficiente, no se inventa actividad.
          </p>
        </div>
        {loading && <div className="text-xs uppercase tracking-[0.28em] text-[#211f20]/48">Actualizando…</div>}
      </div>

      {agents.length ? (
        <div className="mt-5 grid gap-4 xl:grid-cols-3">
          {groups.map((group) => (
            <section key={group.key} className="rounded-[1.5rem] border border-[#211f20]/10 bg-white/55 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-sm uppercase tracking-[0.24em] text-[#211f20]/52">{group.title}</h4>
                  <p className="mt-2 text-sm leading-relaxed text-[#211f20]/62">{group.description}</p>
                </div>
                <span className="rounded-full border border-[#211f20]/10 bg-white/70 px-2.5 py-1 text-xs text-[#211f20]/58">
                  {group.items.length}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {group.items.length ? (
                  group.items.map((agent) => (
                    <OfficeAgentFigure
                      key={agent.id}
                      agent={agent}
                      selected={selectedAgentId === agent.id}
                      onSelect={onSelectAgent}
                    />
                  ))
                ) : (
                  <div className="rounded-[1.25rem] border border-dashed border-[#211f20]/12 bg-white/35 px-4 py-5 text-sm text-[#211f20]/44">
                    No hay agentes en este estado.
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-[1.5rem] border border-dashed border-[#211f20]/14 bg-white/45 px-5 py-6 text-sm leading-relaxed text-[#211f20]/58">
          No hay telemetría disponible en este momento. La pantalla queda vacía antes de inventar agentes o actividad.
        </div>
      )}

      {bubbles.length ? (
        <section className="mt-5 rounded-[1.5rem] border border-[#211f20]/10 bg-white/55 p-4">
          <div>
            <h4 className="text-sm uppercase tracking-[0.24em] text-[#211f20]/52">Actividad reciente</h4>
            <p className="mt-2 text-sm text-[#211f20]/62">Últimos eventos sustantivos visibles en la telemetría.</p>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {bubbles.slice(0, 6).map((bubble) => (
              <article key={bubble.id} className="rounded-[1.25rem] border border-[#211f20]/10 bg-[#fbf8f3] px-4 py-3">
                <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.22em] text-[#211f20]/48">
                  <span>{bubble.kind === 'handoff' ? 'Handoff' : 'Actualización'}</span>
                  <span>{formatTime(bubble.createdAt)}</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-[#211f20]/72">{bubble.text}</p>
                {(bubble.from || bubble.to) && (
                  <p className="mt-2 text-xs text-[#211f20]/46">
                    {bubble.from || 'Origen'} → {bubble.to || 'Destino'}
                  </p>
                )}
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}
