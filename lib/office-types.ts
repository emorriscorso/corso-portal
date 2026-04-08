export type OfficePresence = 'working' | 'idle' | 'offline';
export type OfficeBubbleKind = 'handoff' | 'update';
export type OfficeTelemetrySource = 'real' | 'mixed' | 'fallback';

export interface OfficeLogEntry {
  id: string;
  role: string;
  createdAt: string;
  preview: string;
  tokenCount: number;
}

export interface OfficeSessionSnapshot {
  id: string;
  agentId: string;
  sessionKey: string;
  sessionId?: string;
  title?: string;
  channel: string;
  kind: 'conversation' | 'subagent-run';
  status: OfficePresence;
  statusLabel: string;
  statusReason: string;
  active: boolean;
  messageCount: number;
  tokenCount: number;
  createdAt: string;
  updatedAt: string;
  latestPreview: string;
  recentMessages: OfficeLogEntry[];
  recentFiles: string[];
  provider: string;
  model: string;
  lastRole?: string;
  controllerSessionKey?: string;
  requesterSessionKey?: string;
}

export interface OfficeAgentSnapshot {
  id: string;
  displayName: string;
  provider: string;
  model: string;
  presence: OfficePresence;
  statusLabel: string;
  statusReason: string;
  tokensUsed: number;
  activeSessions: number;
  recentFiles: string[];
  logPreview: string;
  updatedAt: string;
  sessionIds: string[];
  channel: string;
  telemetry: 'real' | 'fallback';
}

export interface OfficeBubble {
  id: string;
  agentId: string;
  sessionId?: string;
  kind: OfficeBubbleKind;
  text: string;
  createdAt: string;
  from?: string;
  to?: string;
}

export interface OfficeSnapshot {
  generatedAt: string;
  source: OfficeTelemetrySource;
  agents: OfficeAgentSnapshot[];
  sessions: OfficeSessionSnapshot[];
  bubbles: OfficeBubble[];
  stats: {
    totalAgents: number;
    working: number;
    idle: number;
    offline: number;
    activeSessions: number;
    totalTokens: number;
  };
}
