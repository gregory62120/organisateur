export type LogLevel = 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL' | 'UNKNOWN';

export interface LogEntry {
  sourceId: string;
  sourceName: string;

  application: string;

  requestId?: string;

  timestamp: Date;

  level: LogLevel;

  message: string;

  raw: string;
}
