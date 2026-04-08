import type { OfficeAgentSnapshot, OfficeBubble, OfficeSessionSnapshot } from '@/lib/office-types';

interface OfficeDetailPanelProps {
  agent: OfficeAgentSnapshot | null;
  agents: OfficeAgentSnapshot[];
  sessions: OfficeSessionSnapshot[];
  bubbles: OfficeBubble[];
  onSelectAgent: (agentId: string) => void;
}

function formatDateTime(value?: string) {
  if (!value) return '—';

  return new Intl.DateTimeFormat('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: 'short',
  }).format(new Date(value));
}

function statusClasses(status: OfficeAgentSnapshot['presence']) {
  if (status === 'working') return 'border-emerald-600/20 bg-emerald-500/10 text-emerald-700';
  if (status === 'idle') return 'border-amber-600/20 bg-amber-500/10 text-amber-700';
  return 'border-slate-500/20 bg-slate-500/10 text-slate-600';
}

export default function OfficeDetailPanel({ agent, agents, sessions, bubbles, onSelectAgent }: OfficeDetailPanelProps) {
  const agentSessions = sessions.filter((session) => session.agentId === agent?.id);
  const agentBubbles = bubbles.filter((bubble) => bubble.agentId === agent?.id).slice(0, 5);

  return (
    <aside className="rounded-[2rem] border border-[#ede9e0]/14 bg-[#f2ede5] p-4 text-[#211f20] shadow-[0_24px_60px_rgba(0,0,0,0.16)] sm:p-5 xl:sticky xl:top-6 xl:h-[calc(100vh-8rem)] xl:overflow-y-auto">
      <div className="mb-5">
        <h3 className="text-sm uppercase tracking-[0.28em] text-[#211f20]/46">Detalle operativo</h3>
        <p className="mt-2 text-sm leading-relaxed text-[#211f20]/62">
          Estado, motivo, sesiones y señales recientes del agente seleccionado.
        </p>
      </div>

      {agent ? (
        <div className="space-y-4">
          <section className="rounded-[1.5rem] border border-[#211f20]/10 bg-white/60 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-2xl text-[#211f20]">{agent.displayName}</h4>
                <p className="mt-1 text-sm text-[#211f20]/55">
                  {agent.provider} / {agent.model}
                </p>
              </div>
              <span className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.22em] ${statusClasses(agent.presence)}`}>
                {agent.statusLabel}
              </span>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-[#211f20]/72">{agent.statusReason}</p>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-[1.25rem] border border-[#211f20]/10 bg-[#fbf8f3] px-3 py-3">
                <div className="text-[11px] uppercase tracking-[0.22em] text-[#211f20]/46">Tokens</div>
                <div className="mt-2 text-[#211f20]">{new Intl.NumberFormat('es-MX').format(agent.tokensUsed)}</div>
              </div>
              <div className="rounded-[1.25rem] border border-[#211f20]/10 bg-[#fbf8f3] px-3 py-3">
                <div className="text-[11px] uppercase tracking-[0.22em] text-[#211f20]/46">Última señal</div>
                <div className="mt-2 text-[#211f20]">{formatDateTime(agent.updatedAt)}</div>
              </div>
            </div>

            <div className="mt-4 rounded-[1.25rem] border border-[#211f20]/10 bg-[#fbf8f3] px-3 py-3">
              <div className="text-[11px] uppercase tracking-[0.22em] text-[#211f20]/46">Último contexto visible</div>
              <p className="mt-2 text-sm leading-relaxed text-[#211f20]/72">{agent.logPreview}</p>
            </div>
          </section>

          <section className="rounded-[1.5rem] border border-[#211f20]/10 bg-white/60 p-4">
            <h4 className="text-sm uppercase tracking-[0.24em] text-[#211f20]/52">Archivos recientes</h4>
            <div className="mt-3 flex flex-wrap gap-2">
              {agent.recentFiles.length ? (
                agent.recentFiles.map((file) => (
                  <span key={file} className="rounded-full border border-[#211f20]/10 bg-[#fbf8f3] px-3 py-1 text-xs text-[#211f20]/64">
                    {file}
                  </span>
                ))
              ) : (
                <span className="text-sm text-[#211f20]/46">No se detectaron archivos recientes.</span>
              )}
            </div>
          </section>

          <section className="rounded-[1.5rem] border border-[#211f20]/10 bg-white/60 p-4">
            <h4 className="text-sm uppercase tracking-[0.24em] text-[#211f20]/52">Sesiones asociadas</h4>
            <div className="mt-3 space-y-3">
              {agentSessions.length ? (
                agentSessions.map((session) => (
                  <article key={session.id} className="rounded-[1.25rem] border border-[#211f20]/10 bg-[#fbf8f3] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm text-[#211f20]">{session.title || session.sessionKey}</div>
                        <div className="mt-1 text-[11px] uppercase tracking-[0.22em] text-[#211f20]/46">
                          {session.channel} · {session.kind}
                        </div>
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] ${statusClasses(session.status)}`}>
                        {session.statusLabel}
                      </span>
                    </div>

                    <p className="mt-3 text-sm leading-relaxed text-[#211f20]/68">{session.statusReason}</p>

                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-[#211f20]/48">
                      <div>
                        <div className="uppercase tracking-[0.22em]">Mensajes</div>
                        <div className="mt-1 text-sm text-[#211f20]">{session.messageCount}</div>
                      </div>
                      <div>
                        <div className="uppercase tracking-[0.22em]">Última señal</div>
                        <div className="mt-1 text-sm text-[#211f20]">{formatDateTime(session.updatedAt)}</div>
                      </div>
                    </div>

                    <div className="mt-3 rounded-[1rem] border border-[#211f20]/10 bg-white/70 px-3 py-2 text-sm text-[#211f20]/70">
                      {session.latestPreview}
                    </div>
                  </article>
                ))
              ) : (
                <p className="text-sm text-[#211f20]/46">No hay sesiones recientes para este agente.</p>
              )}
            </div>
          </section>

          <section className="rounded-[1.5rem] border border-[#211f20]/10 bg-white/60 p-4">
            <h4 className="text-sm uppercase tracking-[0.24em] text-[#211f20]/52">Eventos recientes</h4>
            <div className="mt-3 space-y-3">
              {agentBubbles.length ? (
                agentBubbles.map((bubble) => (
                  <article key={bubble.id} className="rounded-[1.25rem] border border-[#211f20]/10 bg-[#fbf8f3] px-3 py-3">
                    <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.22em] text-[#211f20]/46">
                      <span>{bubble.kind === 'handoff' ? 'Handoff' : 'Actualización'}</span>
                      <span>{formatDateTime(bubble.createdAt)}</span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-[#211f20]/72">{bubble.text}</p>
                    {(bubble.from || bubble.to) && (
                      <p className="mt-2 text-xs text-[#211f20]/46">
                        {bubble.from || 'Origen'} → {bubble.to || 'Destino'}
                      </p>
                    )}
                  </article>
                ))
              ) : (
                <p className="text-sm text-[#211f20]/46">No hay eventos visibles recientes para este agente.</p>
              )}
            </div>
          </section>
        </div>
      ) : (
        <div className="rounded-[1.5rem] border border-dashed border-[#211f20]/12 bg-white/45 p-4 text-sm text-[#211f20]/46">
          Seleccione un agente para ver el detalle.
        </div>
      )}

      <section className="mt-4 rounded-[1.5rem] border border-[#211f20]/10 bg-white/60 p-4">
        <h4 className="text-sm uppercase tracking-[0.24em] text-[#211f20]/52">Cambiar agente</h4>
        <div className="mt-3 space-y-2">
          {agents.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectAgent(item.id)}
              className={`flex w-full items-center justify-between rounded-[1.25rem] border px-3 py-3 text-left transition ${
                agent?.id === item.id
                  ? 'border-[#211f20]/20 bg-[#fbf8f3] text-[#211f20]'
                  : 'border-[#211f20]/10 bg-white/45 text-[#211f20]/72 hover:border-[#211f20]/18 hover:bg-[#fbf8f3]'
              }`}
            >
              <div>
                <div className="text-sm">{item.displayName}</div>
                <div className="mt-1 text-[11px] uppercase tracking-[0.22em] text-[#211f20]/42">{item.model}</div>
              </div>
              <span className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.22em] ${statusClasses(item.presence)}`}>
                {item.statusLabel}
              </span>
            </button>
          ))}
        </div>
      </section>
    </aside>
  );
}
