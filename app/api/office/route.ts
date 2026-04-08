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

function inferPresence(updatedAt: string, nowMs: number): OfficePresence {
  const deltaMinutes = minutesSince(updatedAt, nowMs);

  if (deltaMinutes <= ACTIVE_MINUTES) return 'working';
  if (deltaMinutes <= IDLE_MINUTES) return 'idle';
  return 'offline';
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

  if (sessionKey === 'agent:main:main') return 'OpenClaw Core';
  if (channel === 'telegram') return `Telegram · ${tail}`;
  if (channel === 'whatsapp') return `WhatsApp · ${tail}`;
  if (channel === 'subagent') return `Subagent · ${tail.slice(0, 8)}`;

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

function buildMockSnapshot(now: Date): OfficeSnapshot {
  const generatedAt = now.toISOString();

  const mockAgents: OfficeAgentSnapshot[] = [
    {
      id: 'fallback-marco',
      displayName: 'Marco',
      provider: 'openai-codex',
      model: 'gpt-5.4',
      presence: 'working',
      tokensUsed: 58214,
      activeSessions: 1,
      recentFiles: ['app/office/page.tsx', 'app/api/office/route.ts', 'components/office/OfficeScene.tsx'],
      logPreview: 'Implementando vista /office con telemetría en vivo y refresco de 30 segundos.',
      updatedAt: generatedAt,
      sessionIds: ['fallback-session-marco'],
      channel: 'subagent',
      telemetry: 'fallback',
    },
    {
      id: 'fallback-core',
      displayName: 'OpenClaw Core',
      provider: 'anthropic',
      model: 'claude-sonnet-4-6',
      presence: 'idle',
      tokensUsed: 214083,
      activeSessions: 1,
      recentFiles: ['openclaw.json', 'subagents/runs.json'],
      logPreview: 'Consolidando mensajes recientes y coordinando handoffs entre sesiones.',
      updatedAt: new Date(now.getTime() - 12 * 60 * 1000).toISOString(),
      sessionIds: ['fallback-session-core'],
      channel: 'main',
      telemetry: 'fallback',
    },
    {
      id: 'fallback-audit',
      displayName: 'Auditor',
      provider: 'openai-codex',
      model: 'gpt-5.4',
      presence: 'offline',
      tokensUsed: 83199,
      activeSessions: 0,
      recentFiles: ['memory/2026-04-07.md', 'logs/observer.log'],
      logPreview: 'Sin actividad reciente; último pase de observación archivado.',
      updatedAt: new Date(now.getTime() - 96 * 60 * 1000).toISOString(),
      sessionIds: ['fallback-session-audit'],
      channel: 'internal',
      telemetry: 'fallback',
    },
  ];

  const mockSessions: OfficeSessionSnapshot[] = mockAgents.map((agent, index) => ({
    id: `fallback-session-${index + 1}`,
    agentId: agent.id,
    sessionKey: agent.id,
    title: agent.displayName,
    channel: agent.channel,
    kind: 'conversation',
    status: agent.presence,
    active: agent.presence !== 'offline',
    messageCount: 12 + index * 4,
    tokenCount: agent.tokensUsed,
    createdAt: new Date(now.getTime() - (index + 1) * 60 * 60 * 1000).toISOString(),
    updatedAt: agent.updatedAt,
    latestPreview: agent.logPreview,
    recentMessages: [
      {
        id: `${agent.id}-log-1`,
        role: 'assistant',
        createdAt: agent.updatedAt,
        preview: agent.logPreview,
        tokenCount: Math.round(agent.tokensUsed / 8),
      },
    ],
    recentFiles: agent.recentFiles,
    provider: agent.provider,
    model: agent.model,
  }));

  const mockBubbles: OfficeBubble[] = [
    {
      id: 'fallback-bubble-1',
      agentId: mockAgents[0].id,
      sessionId: mockSessions[0].id,
      kind: 'handoff',
      text: 'Ingeniero → Marco: levantar primer dashboard /office con telemetría real + fallback.',
      createdAt: generatedAt,
      from: 'Ingeniero',
      to: 'Marco',
    },
    {
      id: 'fallback-bubble-2',
      agentId: mockAgents[1].id,
      sessionId: mockSessions[1].id,
      kind: 'update',
      text: 'Core consolidó sesiones activas y dejó la escena lista para refrescarse sola.',
      createdAt: new Date(now.getTime() - 10 * 60 * 1000).toISOString(),
    },
  ];

  return {
    generatedAt,
    source: 'fallback',
    agents: mockAgents,
    sessions: mockSessions,
    bubbles: mockBubbles,
    stats: summarize(mockAgents),
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
    return NextResponse.json(buildMockSnapshot(now));
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
    const status = inferPresence(updatedAt, nowMs);

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
    const meaningfulMessage = messageEntries.find((entry) => entry.preview && !entry.preview.startsWith('Razonamiento interno'))?.preview;
    const latestPreview = excerpt(bestSummary || meaningfulMessage || run?.task || conversation.lastPreview);

    return {
      id: `session-${conversation.conversationId}`,
      agentId: conversation.sessionKey,
      sessionKey: conversation.sessionKey,
      sessionId: conversation.sessionId,
      title: conversation.title || friendlyName(conversation.sessionKey, run?.label),
      channel: classifyChannel(conversation.sessionKey),
      kind: 'conversation',
      status,
      active: status !== 'offline' || isRunActive(run || { runId: '' }, nowMs),
      messageCount: Number(conversation.messageCount || 0),
      tokenCount: Number(conversation.tokensUsed || 0),
      createdAt: toIso(run?.createdAt || conversation.createdAt || conversation.conversationUpdatedAt),
      updatedAt,
      latestPreview,
      recentMessages: messageEntries,
      recentFiles,
      provider: model.provider,
      model: model.model,
      controllerSessionKey: run?.controllerSessionKey,
      requesterSessionKey: run?.requesterSessionKey,
    };
  });

  const knownAgentIds = new Set(sessions.map((session) => session.agentId));

  Object.values(runs).forEach((run) => {
    if (!run.childSessionKey || knownAgentIds.has(run.childSessionKey)) return;

    const updatedAt = toIso(run.startedAt || run.createdAt);
    const model = parseModel(run.model || defaultModel);
    const status = inferPresence(updatedAt, nowMs);

    sessions.push({
      id: `run-${run.runId}`,
      agentId: run.childSessionKey,
      sessionKey: run.childSessionKey,
      title: friendlyName(run.childSessionKey, run.label),
      channel: classifyChannel(run.childSessionKey),
      kind: 'subagent-run',
      status,
      active: isRunActive(run, nowMs),
      messageCount: 0,
      tokenCount: 0,
      createdAt: toIso(run.createdAt),
      updatedAt,
      latestPreview: excerpt(run.task),
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

  if (agents.length < 4) {
    const fallback = buildMockSnapshot(now);
    source = 'mixed';
    finalAgents = [...agents, ...fallback.agents.filter((agent) => !agents.some((existing) => existing.id === agent.id))];
    finalSessions = [...sessions, ...fallback.sessions.filter((session) => !sessions.some((existing) => existing.id === session.id))];
    finalBubbles = [...sortedBubbles, ...fallback.bubbles].slice(0, 18);
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
