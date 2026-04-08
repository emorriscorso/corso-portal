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
  if (status === 'working') return 'border-emerald-300/35 bg-emerald-300/15 text-emerald-100';
  if (status === 'idle') return 'border-amber-300/35 bg-amber-300/15 text-amber-100';
  return 'border-slate-500/35 bg-slate-500/15 text-slate-200';
}

export default function OfficeDetailPanel({ agent, agents, sessions, bubbles, onSelectAgent }: OfficeDetailPanelProps) {
  const agentSessions = sessions.filter((session) => session.agentId === agent?.id);
  const agentBubbles = bubbles.filter((bubble) => bubble.agentId === agent?.id).slice(0, 5);

  return (
    <aside className="rounded-[2rem] border border-white/10 bg-black/30 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-5 xl:sticky xl:top-6 xl:h-[calc(100vh-8rem)] xl:overflow-y-auto">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm uppercase tracking-[0.35em] text-corso-subtle">Panel de detalle</h3>
          <p className="mt-1 text-sm text-corso-subtle">Modelo, sesiones, archivos recientes y últimas trazas.</p>
        </div>
      </div>

      {agent ? (
        <div className="space-y-4">
          <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-2xl text-corso-cream">{agent.displayName}</h4>
                <p className="mt-1 text-sm text-corso-subtle">
                  {agent.provider} / {agent.model}
                </p>
              </div>
              <span className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.3em] ${statusClasses(agent.presence)}`}>
                {agent.presence}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl border border-white/8 bg-black/20 px-3 py-3">
                <div className="text-[11px] uppercase tracking-[0.3em] text-corso-subtle">Tokens</div>
                <div className="mt-2 text-corso-cream">{new Intl.NumberFormat('es-MX').format(agent.tokensUsed)}</div>
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/20 px-3 py-3">
                <div className="text-[11px] uppercase tracking-[0.3em] text-corso-subtle">Última señal</div>
                <div className="mt-2 text-corso-cream">{formatDateTime(agent.updatedAt)}</div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/8 bg-black/20 px-3 py-3">
              <div className="text-[11px] uppercase tracking-[0.3em] text-corso-subtle">Preview operativo</div>
              <p className="mt-2 text-sm leading-relaxed text-corso-cream/90">{agent.logPreview}</p>
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-4">
            <h4 className="text-sm uppercase tracking-[0.35em] text-corso-subtle">Archivos activos</h4>
            <div className="mt-3 flex flex-wrap gap-2">
              {agent.recentFiles.length ? (
                agent.recentFiles.map((file) => (
                  <span key={file} className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs text-cyan-100">
                    {file}
                  </span>
                ))
              ) : (
                <span className="text-sm text-corso-subtle">No hay archivos detectados en la telemetría reciente.</span>
              )}
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-4">
            <h4 className="text-sm uppercase tracking-[0.35em] text-corso-subtle">Sesiones</h4>
            <div className="mt-3 space-y-3">
              {agentSessions.map((session) => (
                <article key={session.id} className="rounded-2xl border border-white/8 bg-black/20 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm text-corso-cream">{session.title || session.sessionKey}</div>
                      <div className="mt-1 text-[11px] uppercase tracking-[0.28em] text-corso-subtle">
                        {session.channel} · {session.kind}
                      </div>
                    </div>
                    <span className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.3em] ${statusClasses(session.status)}`}>
                      {session.status}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-corso-subtle">
                    <div>
                      <div className="uppercase tracking-[0.28em]">Mensajes</div>
                      <div className="mt-1 text-sm text-corso-cream">{session.messageCount}</div>
                    </div>
                    <div>
                      <div className="uppercase tracking-[0.28em]">Tokens</div>
                      <div className="mt-1 text-sm text-corso-cream">{new Intl.NumberFormat('es-MX').format(session.tokenCount)}</div>
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl border border-white/6 bg-white/[0.03] px-3 py-2 text-sm text-corso-cream/90">
                    {session.latestPreview}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-4">
            <h4 className="text-sm uppercase tracking-[0.35em] text-corso-subtle">Logs recientes</h4>
            <div className="mt-3 space-y-3">
              {agentSessions.flatMap((session) => session.recentMessages).slice(0, 8).map((entry) => (
                <article key={entry.id} className="rounded-2xl border border-white/8 bg-black/20 px-3 py-3">
                  <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.28em] text-corso-subtle">
                    <span>{entry.role}</span>
                    <span>{formatDateTime(entry.createdAt)}</span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-corso-cream/90">{entry.preview}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-4">
            <h4 className="text-sm uppercase tracking-[0.35em] text-corso-subtle">Burbujas recientes</h4>
            <div className="mt-3 space-y-3">
              {agentBubbles.length ? (
                agentBubbles.map((bubble) => (
                  <article key={bubble.id} className="rounded-2xl border border-white/8 bg-black/20 px-3 py-3">
                    <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.28em] text-corso-subtle">
                      <span>{bubble.kind}</span>
                      <span>{formatDateTime(bubble.createdAt)}</span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-corso-cream/90">{bubble.text}</p>
                    {(bubble.from || bubble.to) && (
                      <p className="mt-2 text-xs text-corso-subtle">
                        {bubble.from || 'Origen'} → {bubble.to || 'Destino'}
                      </p>
                    )}
                  </article>
                ))
              ) : (
                <p className="text-sm text-corso-subtle">No hay burbujas recientes para este agente.</p>
              )}
            </div>
          </section>
        </div>
      ) : (
        <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-4 text-sm text-corso-subtle">
          No hay agente seleccionado.
        </div>
      )}

      <section className="mt-4 rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-4">
        <h4 className="text-sm uppercase tracking-[0.35em] text-corso-subtle">Cambiar agente</h4>
        <div className="mt-3 space-y-2">
          {agents.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectAgent(item.id)}
              className={`flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left transition ${
                agent?.id === item.id
                  ? 'border-cyan-300/40 bg-cyan-300/10 text-cyan-100'
                  : 'border-white/8 bg-black/20 text-corso-cream hover:border-white/20 hover:bg-white/[0.06]'
              }`}
            >
              <div>
                <div className="text-sm">{item.displayName}</div>
                <div className="mt-1 text-[11px] uppercase tracking-[0.28em] text-corso-subtle">{item.model}</div>
              </div>
              <span className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.28em] ${statusClasses(item.presence)}`}>
                {item.presence}
              </span>
            </button>
          ))}
        </div>
      </section>
    </aside>
  );
}
