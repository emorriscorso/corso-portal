'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { OfficeAgentSnapshot, OfficeSnapshot } from '@/lib/office-types';
import OfficeDetailPanel from './OfficeDetailPanel';
import OfficeScene from './OfficeScene';

function formatNumber(value: number) {
  return new Intl.NumberFormat('es-MX', {
    notation: value > 9999 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(value);
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function sortAgents(agents: OfficeAgentSnapshot[]) {
  const weight = {
    working: 0,
    idle: 1,
    offline: 2,
  } as const;

  return [...agents].sort((left, right) => {
    const presenceDelta = weight[left.presence] - weight[right.presence];
    if (presenceDelta !== 0) return presenceDelta;

    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  });
}

export default function OfficeDashboard() {
  const [snapshot, setSnapshot] = useState<OfficeSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  const loadSnapshot = useCallback(async () => {
    try {
      const response = await fetch('/api/office', {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = (await response.json()) as OfficeSnapshot;
      setSnapshot(payload);
      setError(null);
      setSelectedAgentId((current) => {
        if (current && payload.agents.some((agent) => agent.id === current)) {
          return current;
        }

        return payload.agents.find((agent) => agent.presence === 'working')?.id || payload.agents[0]?.id || null;
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo cargar la oficina.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSnapshot();

    const interval = window.setInterval(loadSnapshot, 30_000);
    const handleFocus = () => loadSnapshot();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadSnapshot();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [loadSnapshot]);

  const agents = useMemo(() => sortAgents(snapshot?.agents || []), [snapshot]);
  const selectedAgent = agents.find((agent) => agent.id === selectedAgentId) || agents[0] || null;

  return (
    <div className="office-shell min-h-[calc(100vh-10rem)] -mx-4 sm:-mx-8 px-4 sm:px-8 py-2 sm:py-4">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
        <section className="rounded-[2rem] border border-white/10 bg-black/30 px-5 py-5 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-3">
                <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.35em] text-cyan-200">
                  Live office
                </span>
                {snapshot && (
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-corso-subtle">
                    Fuente {snapshot.source}
                  </span>
                )}
              </div>
              <h2 className="font-cormorant text-3xl font-normal tracking-[0.08em] text-corso-cream sm:text-5xl">
                Oficina de agentes
              </h2>
              <p className="mt-3 max-w-3xl text-sm text-corso-subtle sm:text-base">
                Telemetría operativa de OpenClaw sobre esta Mac: sesiones, recencia, handoffs y contexto reciente.
                La escena refresca cada 30 segundos y al volver a la pestaña.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={loadSnapshot}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-corso-cream hover:border-cyan-300/40 hover:bg-cyan-400/10"
              >
                Refrescar ahora
              </button>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right">
                <div className="text-[11px] uppercase tracking-[0.35em] text-corso-subtle">Último pulso</div>
                <div className="mt-1 text-sm text-corso-cream">{snapshot ? formatTime(snapshot.generatedAt) : '--:--'}</div>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            {[
              ['Agentes', snapshot?.stats.totalAgents || 0],
              ['Trabajando', snapshot?.stats.working || 0],
              ['En pausa', snapshot?.stats.idle || 0],
              ['Offline', snapshot?.stats.offline || 0],
              ['Sesiones activas', snapshot?.stats.activeSessions || 0],
              ['Tokens', snapshot?.stats.totalTokens || 0],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.3em] text-corso-subtle">{label}</div>
                <div className="mt-2 text-2xl text-corso-cream">{formatNumber(Number(value))}</div>
              </div>
            ))}
          </div>
        </section>

        {error && (
          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
            No pude cargar la telemetría en vivo: {error}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="flex flex-col gap-4">
            <OfficeScene
              loading={loading}
              agents={agents}
              bubbles={snapshot?.bubbles || []}
              selectedAgentId={selectedAgent?.id || null}
              onSelectAgent={setSelectedAgentId}
            />

            <section className="rounded-[1.75rem] border border-white/10 bg-black/25 p-4 backdrop-blur-xl">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm uppercase tracking-[0.35em] text-corso-subtle">Roster</h3>
                  <p className="mt-1 text-sm text-corso-subtle">Selecciona un agente si quieres abrir su panel de detalle.</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {agents.map((agent) => (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => setSelectedAgentId(agent.id)}
                    className={`rounded-full border px-3 py-2 text-left text-sm transition ${
                      selectedAgent?.id === agent.id
                        ? 'border-cyan-300/50 bg-cyan-300/15 text-cyan-100'
                        : 'border-white/10 bg-white/5 text-corso-cream hover:border-white/25 hover:bg-white/10'
                    }`}
                  >
                    <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle">
                      <span
                        className={`block h-2.5 w-2.5 rounded-full ${
                          agent.presence === 'working'
                            ? 'bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.9)]'
                            : agent.presence === 'idle'
                              ? 'bg-amber-300 shadow-[0_0_14px_rgba(252,211,77,0.65)]'
                              : 'bg-slate-500'
                        }`}
                      />
                    </span>
                    {agent.displayName}
                  </button>
                ))}
              </div>
            </section>
          </div>

          <OfficeDetailPanel
            agent={selectedAgent}
            sessions={snapshot?.sessions || []}
            bubbles={snapshot?.bubbles || []}
            agents={agents}
            onSelectAgent={setSelectedAgentId}
          />
        </div>
      </div>
    </div>
  );
}
