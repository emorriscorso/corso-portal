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

        return payload.agents[0]?.id || null;
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

  const sourceLabel = snapshot?.source === 'real' ? 'Telemetría real' : 'Sin telemetría suficiente';

  return (
    <div className="office-shell min-h-[calc(100vh-10rem)] py-2 sm:py-4">
      <div className="mx-auto flex max-w-[1480px] flex-col gap-6">
        <section className="rounded-[2rem] border border-[#ede9e0]/14 bg-[#f2ede5] px-5 py-5 text-[#211f20] shadow-[0_24px_60px_rgba(0,0,0,0.16)] sm:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[#211f20]/10 bg-white/65 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-[#211f20]/55">
                  Live Office
                </span>
                <span className="rounded-full border border-[#211f20]/10 bg-white/65 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-[#211f20]/55">
                  {sourceLabel}
                </span>
              </div>
              <h2 className="text-3xl tracking-[0.04em] text-[#211f20] sm:text-5xl">Oficina de agentes</h2>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#211f20]/68 sm:text-base">
                Vista ejecutiva del estado real de agentes y sesiones en esta Mac mini. La pantalla prioriza claridad:
                menos ruido visual, más contexto útil y sin datos inventados.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={loadSnapshot}
                className="rounded-full border border-[#211f20]/12 bg-white/70 px-4 py-2 text-sm text-[#211f20]/78 hover:border-[#211f20]/20 hover:bg-white"
              >
                Refrescar ahora
              </button>
              <div className="rounded-[1.5rem] border border-[#211f20]/10 bg-white/60 px-4 py-3 text-right">
                <div className="text-[11px] uppercase tracking-[0.28em] text-[#211f20]/46">Último pulso</div>
                <div className="mt-1 text-sm text-[#211f20]">{snapshot ? formatTime(snapshot.generatedAt) : '--:--'}</div>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            {[
              ['Agentes visibles', snapshot?.stats.totalAgents || 0],
              ['Trabajando', snapshot?.stats.working || 0],
              ['En espera', snapshot?.stats.idle || 0],
              ['Sin actividad', snapshot?.stats.offline || 0],
              ['Sesiones activas', snapshot?.stats.activeSessions || 0],
              ['Tokens', snapshot?.stats.totalTokens || 0],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[1.5rem] border border-[#211f20]/10 bg-white/60 px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.24em] text-[#211f20]/46">{label}</div>
                <div className="mt-2 text-2xl text-[#211f20]">{formatNumber(Number(value))}</div>
              </div>
            ))}
          </div>
        </section>

        {error && (
          <div className="rounded-[1.5rem] border border-amber-500/20 bg-amber-100/90 px-4 py-3 text-sm text-amber-900">
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

            <section className="rounded-[2rem] border border-[#ede9e0]/14 bg-[#f2ede5] p-4 text-[#211f20] shadow-[0_24px_60px_rgba(0,0,0,0.16)]">
              <div className="mb-3">
                <h3 className="text-sm uppercase tracking-[0.28em] text-[#211f20]/46">Selector rápido</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#211f20]/62">
                  Cambie el enfoque sin perder el contexto del panel lateral.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {agents.length ? (
                  agents.map((agent) => (
                    <button
                      key={agent.id}
                      type="button"
                      onClick={() => setSelectedAgentId(agent.id)}
                      className={`rounded-full border px-3 py-2 text-left text-sm transition ${
                        selectedAgent?.id === agent.id
                          ? 'border-[#211f20]/20 bg-white text-[#211f20]'
                          : 'border-[#211f20]/10 bg-white/60 text-[#211f20]/72 hover:border-[#211f20]/18 hover:bg-white'
                      }`}
                    >
                      {agent.displayName}
                    </button>
                  ))
                ) : (
                  <div className="rounded-[1.25rem] border border-dashed border-[#211f20]/12 bg-white/45 px-4 py-4 text-sm text-[#211f20]/44">
                    Todavía no hay agentes visibles en la telemetría.
                  </div>
                )}
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
