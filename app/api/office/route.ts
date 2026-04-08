import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { NextResponse } from 'next/server';
import type {
  OfficeAgentSnapshot,
  OfficeBubble,
  OfficeLogEntry,
  OfficePresence,
  OfficeSessionSnapshot,
  OfficeSnapshot,
} from '@/lib/office-types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const OPENCLAW_ROOT = '/Users/enriquemorris/.openclaw';
const WORKSPACE_ROOT = '/Users/enriquemorris/.openclaw/workspace';
const PROJECT_ROOT = '/Users/enriquemorris/Projects/corso-portal';
const LCM_DB_PATH = `${OPENCLAW_ROOT}/lcm.db`;
const RUNS_PATH = `${OPENCLAW_ROOT}/subagents/runs.json`;
const CONFIG_PATH = `${OPENCLAW_ROOT}/openclaw.json`;
const ACTIVE_MINUTES = 5;
const IDLE_MINUTES = 35;

interface ConversationRow {
  conversationId: number;
  sessionId?: string;
  sessionKey: string;
  title?: string;
  createdAt?: string;
  conversationUpdatedAt?: string;
  lastActiveAt?: string;
  messageCount?: number;
  tokensUsed?: number;
  lastRole?: string;
  lastPreview?: string;
}

interface MessageRow {
  conversationId: number;
  messageId: number;
  seq: number;
  role: string;
  tokenCount?: number;
  createdAt: string;
  preview?: string;
}

interface SummaryRow {
  conversationId: number;
  summaryId: string;
  kind: string;
  depth: number;
  tokenCount?: number;
  latestAt?: string;
  preview?: string;
}

interface FileRow {
  conversationId: number;
  fileName?: string;
  storageUri?: string;
  createdAt?: string;
}

interface RunEntry {
  runId: string;
  childSessionKey?: string;
  controllerSessionKey?: string;
  requesterSessionKey?: string;
  requesterDisplayKey?: string;
  task?: string;
  label?: string;
  model?: string;
  createdAt?: number;
  startedAt?: number;
  archiveAtMs?: number;
  completedAt?: number;
  finishedAt?: number;
  exitCode?: number;
}

interface RunsFile {
  runs?: Record<string, RunEntry>;
}

interface OpenClawConfig {
  agents?: {
    defaults?: {
      model?: {
        primary?: string;
      };
    };
  };
}

function readJson<T>(path: string): T | null {
  if (!existsSync(path)) return null;

  try {
    return JSON.parse(readFileSync(path, 'utf8')) as T;
  } catch {
    return null;
  }
}

function runSqlite<T>(databasePath: string, query: string): T[] {
  if (!existsSync(databasePath)) return [];

  try {
    const output = execFileSync('sqlite3', ['-json', databasePath, query], {
      encoding: 'utf8',
      maxBuffer: 12 * 1024 * 1024,
      timeout: 5000,
    }).trim();

    return output ? (JSON.parse(output) as T[]) : [];
  } catch {
    return [];
  }
}

function toIso(value?: string | number | null): string {
  if (value === null || value === undefined || value === '') {
    return new Date(0).toISOString();
  }

  if (typeof value === 'number') {
    return new Date(value).toISOString();
  }

  if (/^\d{4}-\d{2}-\d{2} /.test(value)) {
    return new Date(value.replace(' ', 'T') + 'Z').toISOString();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date(0).toISOString() : parsed.toISOString();
}

function minutesSince(timestamp: string, nowMs: number): number {
  return Math.max(0, (nowMs - new Date(timestamp).getTime()) / 60000);
}

function isSilentOrHousekeeping(role?: string, preview?: string) {
  const value = (preview || '').trim();

  if (role === 'system') return true;
  if (!value) return true;
  if (value === 'NO_REPLY' || value === 'HEARTBEAT_OK') return true;
  if (value.startsWith('[{"type":"thinking"')) return true;
  if (value.startsWith('LCM compaction')) return true;
  if (value.includes('Compactación de contexto')) return true;
  if (value.includes('ejecución silenciosa')) return true;

  return false;
}

function describePresence(args: {
  updatedAt: string;
  nowMs: number;
  lastRole?: string;
  lastPreview?: string;
  hasActiveRun: boolean;
}): { presence: OfficePresence; label: string; reason: string } {
  const { updatedAt, nowMs, lastRole, lastPreview, hasActiveRun } = args;
  const deltaMinutes = minutesSince(updatedAt, nowMs);
  const housekeeping = isSilentOrHousekeeping(lastRole, lastPreview);

  if (hasActiveRun) {
    return {
      presence: 'working',
      label: 'Trabajando',
      reason: 'Tiene una ejecución activa en este momento.',
    };
  }

  if (deltaMinutes <= ACTIVE_MINUTES && lastRole === 'assistant' && !housekeeping) {
    return {
      presence: 'working',
      label: 'Trabajando',
      reason: 'Acaba de generar actividad real recientemente.',
    };
  }

  if (deltaMinutes <= ACTIVE_MINUTES && lastRole === 'user') {
    return {
      presence: 'idle',
      label: 'En espera',
      reason: 'Recibió un mensaje reciente y está a la espera del siguiente paso.',
    };
  }

  if (deltaMinutes <= IDLE_MINUTES) {
    return {
      presence: 'idle',
      label: 'En espera',
      reason: housekeeping
        ? 'Solo hubo actividad de control reciente; no hay trabajo largo corriendo.'
        : 'Tiene actividad reciente, pero no un proceso activo en curso.',
    };
  }

  return {
    presence: 'offline',
    label: 'Sin actividad',
    reason: 'No hay actividad reciente detectada en esta sesión.',
  };
}

function parseModel(modelId?: string) {
  const fallback = 'openai-codex/gpt-5.4';
  const raw = modelId || fallback;

  if (!raw.includes('/')) {
    return {
      provider: 'unknown',
      model: raw,
      raw,
    };
  }

  const [provider, ...rest] = raw.split('/');
  return {
    provider,
    model: rest.join('/') || raw,
    raw,
  };
}

function classifyChannel(sessionKey: string): string {
  const parts = sessionKey.split(':');
  return parts[2] || 'internal';
}

function titleCase(value: string) {
  return value
    .replace(/[-_]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function friendlyName(sessionKey: string, label?: string) {
  if (label) return label;

  const parts = sessionKey.split(':');
  const channel = parts[2];
  const tail = parts[parts.length - 1];

  if (sessionKey === 'agent:main:main') return 'Enrique';
  if (channel === 'telegram') return 'Enrique · Telegram';
  if (channel === 'whatsapp') return 'Enrique · WhatsApp';
  if (channel === 'subagent') return `Subagente · ${tail.slice(0, 8)}`;

  return titleCase(channel || tail || sessionKey);
}

function sanitizePreview(text?: string) {
  if (!text) return 'Sin actividad reciente registrada.';

  let value = text.replace(/\s+/g, ' ').trim();

  if (!value) return 'Sin actividad reciente registrada.';
  if (value === 'NO_REPLY') return 'Sin respuesta emitida; ejecución silenciosa.';
  if (value.startsWith('[{"type":"thinking"')) return 'Razonamiento interno y orquestación en curso.';
  if (value.startsWith('LCM compaction')) return 'Compactación de contexto completada.';

  if (value.length > 220) {
    value = `${value.slice(0, 217)}...`;
  }

  return value;
}

function excerpt(text?: string, maxLength = 160) {
  const value = sanitizePreview(text);
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 3)}...`;
}

function compactPath(value: string) {
  let next = value.trim().replace(/[),.;:'"`]+$/g, '');

  if (next.startsWith(PROJECT_ROOT + '/')) next = next.slice(PROJECT_ROOT.length + 1);
  if (next.startsWith(WORKSPACE_ROOT + '/')) next = next.slice(WORKSPACE_ROOT.length + 1);
  if (next.startsWith(OPENCLAW_ROOT + '/')) next = `.openclaw/${next.slice(OPENCLAW_ROOT.length + 1)}`;

  if (next.startsWith('/Users/')) {
    const parts = next.split('/').filter(Boolean);
    next = parts.slice(-4).join('/');
  }

  return next;
}

function extractPaths(...chunks: Array<string | undefined>) {
  const pathPattern = /(?:\/Users\/[^\s'"`]+|(?:[A-Za-z0-9._@~-]+\/)+[A-Za-z0-9._@~-]+\.(?:tsx|ts|jsx|js|json|md|css|py|sh|sql|yaml|yml|txt))/g;
  const filePattern = /\b[A-Za-z0-9._@~-]+\.(?:tsx|ts|jsx|js|json|md|css|py|sh|sql|yaml|yml|txt)\b/g;
  const found = new Set<string>();

  for (const chunk of chunks) {
    if (!chunk) continue;

    const matches = [...chunk.matchAll(pathPattern), ...chunk.matchAll(filePattern)];
    for (const match of matches) {
      const candidate = compactPath(match[0]);
      if (!candidate) continue;
      if (candidate.startsWith('http')) continue;
      if (candidate === 'exec.txt' || candidate === 'Next.js') continue;
      if (candidate.includes('.openclaw/lcm-files/')) continue;
      if (/^file_[a-f0-9]{8,}/i.test(candidate)) continue;
      if (/\/file_[a-f0-9]{8,}/i.test(candidate)) continue;
      if (candidate.startsWith('Users/')) continue;
      found.add(candidate);
    }
  }

  const candidates = Array.from(found);
  const filtered = candidates.filter((candidate) => {
    if (!candidate.includes('/')) {
      return !candidates.some((other) => other !== candidate && other.endsWith(`/${candidate}`));
    }

    return true;
  });

  return filtered.slice(0, 6);
}

function isRunActive(run: RunEntry, nowMs: number) {
  if (run.completedAt || run.finishedAt || typeof run.exitCode === 'number') {
    return false;
  }

  const timestamp = run.startedAt || run.createdAt;
  if (!timestamp) return false;

  return nowMs - timestamp < 3 * 60 * 60 * 1000;
}

function buildEmptySnapshot(now: Date): OfficeSnapshot {
  return {
    generatedAt: now.toISOString(),
    source: 'fallback',
    agents: [],
    sessions: [],
    bubbles: [],
    stats: summarize([]),
  };
}

function summarize(agents: OfficeAgentSnapshot[]) {
  return {
    totalAgents: agents.length,
    working: agents.filter((agent) => agent.presence === 'working').length,
    idle: agents.filter((agent) => agent.presence === 'idle').length,
    offline: agents.filter((agent) => agent.presence === 'offline').length,
    activeSessions: agents.reduce((total, agent) => total + agent.activeSessions, 0),
    totalTokens: agents.reduce((total, agent) => total + agent.tokensUsed, 0),
  };
}

export async function GET() {
  const now = new Date();
  const nowMs = now.getTime();

  const config = readJson<OpenClawConfig>(CONFIG_PATH);
  const defaultModel = config?.agents?.defaults?.model?.primary || 'openai-codex/gpt-5.4';
  const runs = readJson<RunsFile>(RUNS_PATH)?.runs || {};
  const runsBySessionKey = new Map<string, RunEntry>();

  Object.values(runs).forEach((run) => {
    if (run.childSessionKey) {
      runsBySessionKey.set(run.childSessionKey, run);
    }
  });

  const conversations = runSqlite<ConversationRow>(
    LCM_DB_PATH,
    `SELECT
      c.conversation_id AS conversationId,
      c.session_id AS sessionId,
      COALESCE(c.session_key, c.session_id, 'conversation:' || c.conversation_id) AS sessionKey,
      c.title AS title,
      c.created_at AS createdAt,
      c.updated_at AS conversationUpdatedAt,
      COALESCE((SELECT MAX(created_at) FROM messages m WHERE m.conversation_id = c.conversation_id), c.updated_at, c.created_at) AS lastActiveAt,
      COALESCE((SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.conversation_id), 0) AS messageCount,
      COALESCE((SELECT SUM(token_count) FROM messages m WHERE m.conversation_id = c.conversation_id), 0) AS tokensUsed,
      COALESCE((SELECT role FROM messages m WHERE m.conversation_id = c.conversation_id ORDER BY seq DESC LIMIT 1), 'system') AS lastRole,
      COALESCE((SELECT substr(replace(content, char(10), ' '), 1, 320) FROM messages m WHERE m.conversation_id = c.conversation_id ORDER BY seq DESC LIMIT 1), '') AS lastPreview
    FROM conversations c
    ORDER BY lastActiveAt DESC;`,
  );

  const messages = runSqlite<MessageRow>(
    LCM_DB_PATH,
    `SELECT conversation_id AS conversationId, message_id AS messageId, seq, role, token_count AS tokenCount, created_at AS createdAt,
      substr(replace(content, char(10), ' '), 1, 260) AS preview
    FROM (
      SELECT *, ROW_NUMBER() OVER (PARTITION BY conversation_id ORDER BY seq DESC) AS rn
      FROM messages
    ) ranked
    WHERE rn <= 5
    ORDER BY conversationId, seq DESC;`,
  );

  const summaries = runSqlite<SummaryRow>(
    LCM_DB_PATH,
    `SELECT conversation_id AS conversationId, summary_id AS summaryId, kind, depth, token_count AS tokenCount,
      COALESCE(latest_at, created_at) AS latestAt,
      substr(replace(content, char(10), ' '), 1, 260) AS preview
    FROM (
      SELECT *, ROW_NUMBER() OVER (PARTITION BY conversation_id ORDER BY COALESCE(latest_at, created_at) DESC) AS rn
      FROM summaries
    ) ranked
    WHERE rn <= 3
    ORDER BY conversationId, latestAt DESC;`,
  );

  const files = runSqlite<FileRow>(
    LCM_DB_PATH,
    `SELECT conversation_id AS conversationId, file_name AS fileName, storage_uri AS storageUri, created_at AS createdAt
    FROM (
      SELECT *, ROW_NUMBER() OVER (PARTITION BY conversation_id ORDER BY created_at DESC) AS rn
      FROM large_files
    ) ranked
    WHERE rn <= 6
    ORDER BY conversationId, createdAt DESC;`,
  );

  if (!conversations.length) {
    return NextResponse.json(buildEmptySnapshot(now));
  }

  const messagesByConversation = new Map<number, MessageRow[]>();
  messages.forEach((message) => {
    const bucket = messagesByConversation.get(message.conversationId) || [];
    bucket.push(message);
    messagesByConversation.set(message.conversationId, bucket);
  });

  const summariesByConversation = new Map<number, SummaryRow[]>();
  summaries.forEach((summary) => {
    const bucket = summariesByConversation.get(summary.conversationId) || [];
    bucket.push(summary);
    summariesByConversation.set(summary.conversationId, bucket);
  });

  const filesByConversation = new Map<number, FileRow[]>();
  files.forEach((file) => {
    const bucket = filesByConversation.get(file.conversationId) || [];
    bucket.push(file);
    filesByConversation.set(file.conversationId, bucket);
  });

  const sessions: OfficeSessionSnapshot[] = conversations.map((conversation) => {
    const run = runsBySessionKey.get(conversation.sessionKey);
    const rawModel = run?.model || defaultModel;
    const model = parseModel(rawModel);
    const messageEntries = (messagesByConversation.get(conversation.conversationId) || []).map<OfficeLogEntry>((message) => ({
      id: `${conversation.conversationId}-${message.messageId}`,
      role: message.role,
      createdAt: toIso(message.createdAt),
      preview: sanitizePreview(message.preview),
      tokenCount: Number(message.tokenCount || 0),
    }));

    const summaryEntries = summariesByConversation.get(conversation.conversationId) || [];
    const fileEntries = filesByConversation.get(conversation.conversationId) || [];

    const updatedAt = toIso(run?.startedAt && toIso(run.startedAt) > toIso(conversation.lastActiveAt) ? run.startedAt : conversation.lastActiveAt);
    const hasActiveRun = isRunActive(run || { runId: '' }, nowMs);

    const recentFiles = Array.from(
      new Set([
        ...fileEntries.flatMap((file) => extractPaths(file.fileName, file.storageUri)),
        ...extractPaths(
          run?.task,
          conversation.lastPreview,
          ...summaryEntries.map((summary) => summary.preview),
          ...messageEntries.map((entry) => entry.preview),
        ),
      ]),
    ).slice(0, 6);

    const bestSummary = summaryEntries.find((summary) => summary.preview)?.preview;
    const freshestMessage = messageEntries[0];
    const meaningfulMessage = messageEntries.find((entry) => entry.preview && !entry.preview.startsWith('Razonamiento interno'))?.preview;
    const latestPreview = excerpt(bestSummary || meaningfulMessage || run?.task || conversation.lastPreview);
    const statusMeta = describePresence({
      updatedAt,
      nowMs,
      lastRole: freshestMessage?.role || conversation.lastRole,
      lastPreview: freshestMessage?.preview || latestPreview,
      hasActiveRun,
    });

    return {
      id: `session-${conversation.conversationId}`,
      agentId: conversation.sessionKey,
      sessionKey: conversation.sessionKey,
      sessionId: conversation.sessionId,
      title: conversation.title || friendlyName(conversation.sessionKey, run?.label),
      channel: classifyChannel(conversation.sessionKey),
      kind: 'conversation',
      status: statusMeta.presence,
      statusLabel: statusMeta.label,
      statusReason: statusMeta.reason,
      active: statusMeta.presence !== 'offline' || hasActiveRun,
      messageCount: Number(conversation.messageCount || 0),
      tokenCount: Number(conversation.tokensUsed || 0),
      createdAt: toIso(run?.createdAt || conversation.createdAt || conversation.conversationUpdatedAt),
      updatedAt,
      latestPreview,
      recentMessages: messageEntries,
      recentFiles,
      provider: model.provider,
      model: model.model,
      lastRole: freshestMessage?.role || conversation.lastRole,
      controllerSessionKey: run?.controllerSessionKey,
      requesterSessionKey: run?.requesterSessionKey,
    };
  });

  const knownAgentIds = new Set(sessions.map((session) => session.agentId));

  Object.values(runs).forEach((run) => {
    if (!run.childSessionKey || knownAgentIds.has(run.childSessionKey)) return;

    const updatedAt = toIso(run.startedAt || run.createdAt);
    const model = parseModel(run.model || defaultModel);
    const hasActiveRun = isRunActive(run, nowMs);
    const latestPreview = excerpt(run.task);
    const statusMeta = describePresence({
      updatedAt,
      nowMs,
      lastRole: 'handoff',
      lastPreview: latestPreview,
      hasActiveRun,
    });

    sessions.push({
      id: `run-${run.runId}`,
      agentId: run.childSessionKey,
      sessionKey: run.childSessionKey,
      title: friendlyName(run.childSessionKey, run.label),
      channel: classifyChannel(run.childSessionKey),
      kind: 'subagent-run',
      status: statusMeta.presence,
      statusLabel: statusMeta.label,
      statusReason: statusMeta.reason,
      active: hasActiveRun,
      messageCount: 0,
      tokenCount: 0,
      createdAt: toIso(run.createdAt),
      updatedAt,
      latestPreview,
      recentMessages: run.task
        ? [
            {
              id: `${run.runId}-task`,
              role: 'handoff',
              createdAt: updatedAt,
              preview: excerpt(run.task, 220),
              tokenCount: 0,
            },
          ]
        : [],
      recentFiles: extractPaths(run.task),
      provider: model.provider,
      model: model.model,
      lastRole: 'handoff',
      controllerSessionKey: run.controllerSessionKey,
      requesterSessionKey: run.requesterSessionKey,
    });
  });

  const agents: OfficeAgentSnapshot[] = sessions
    .map((session) => {
      const run = runsBySessionKey.get(session.agentId);

      return {
        id: session.agentId,
        displayName: friendlyName(session.agentId, run?.label),
        provider: session.provider,
        model: session.model,
        presence: session.status,
        statusLabel: session.statusLabel,
        statusReason: session.statusReason,
        tokensUsed: session.tokenCount,
        activeSessions: session.active ? 1 : 0,
        recentFiles: session.recentFiles,
        logPreview: session.latestPreview,
        updatedAt: session.updatedAt,
        sessionIds: [session.id],
        channel: session.channel,
        telemetry: 'real' as const,
      };
    })
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());

  const bubbles: OfficeBubble[] = [];

  Object.values(runs)
    .filter((run) => run.childSessionKey && (isRunActive(run, nowMs) || nowMs - (run.startedAt || run.createdAt || 0) < 8 * 60 * 60 * 1000))
    .forEach((run) => {
      const agentId = run.childSessionKey as string;
      bubbles.push({
        id: `handoff-${run.runId}`,
        agentId,
        sessionId: sessions.find((session) => session.agentId === agentId)?.id,
        kind: 'handoff',
        text: excerpt(run.task, 140),
        createdAt: toIso(run.startedAt || run.createdAt),
        from: friendlyName(run.requesterDisplayKey || run.requesterSessionKey || 'agent:main:main'),
        to: friendlyName(agentId, run.label),
      });
    });

  sessions.forEach((session) => {
    const freshestLog = session.recentMessages[0];
    if (!freshestLog) return;
    if (isSilentOrHousekeeping(freshestLog.role, freshestLog.preview)) return;

    bubbles.push({
      id: `update-${session.id}`,
      agentId: session.agentId,
      sessionId: session.id,
      kind: 'update',
      text: excerpt(freshestLog.preview, 140),
      createdAt: freshestLog.createdAt,
    });
  });

  const sortedBubbles = bubbles
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 14);

  let source: OfficeSnapshot['source'] = 'real';
  let finalAgents = agents;
  let finalSessions = sessions;
  let finalBubbles = sortedBubbles;

  if (!agents.length) {
    const fallback = buildEmptySnapshot(now);
    source = 'fallback';
    finalAgents = fallback.agents;
    finalSessions = fallback.sessions;
    finalBubbles = fallback.bubbles;
  }

  const snapshot: OfficeSnapshot = {
    generatedAt: now.toISOString(),
    source,
    agents: finalAgents,
    sessions: finalSessions,
    bubbles: finalBubbles,
    stats: summarize(finalAgents),
  };

  return NextResponse.json(snapshot);
}
