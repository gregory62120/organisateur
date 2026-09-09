import { Injectable } from '@angular/core';

import { LogLevel, LogEntry } from '../models/log-entry.model';

import { LogSource } from '../models/app-config.model';

interface ReadLogsOptions {
  date: string;
  startTime: string;
  endTime: string;
}

@Injectable({
  providedIn: 'root',
})
export class LogService {
  /**
   * Lecture des logs d'une application dans une source donnée.
   */
  async readApplicationLogs(
    source: LogSource,
    directoryHandle: FileSystemDirectoryHandle,
    application: string,
    options: ReadLogsOptions,
  ): Promise<LogEntry[]> {
    const files = await this.findLogFiles(directoryHandle, application, options.date);

    const results = await Promise.all(
      files.map((file) =>
        this.readLogFile(file, source, application.split('-serveur')[0], options),
      ),
    );

    return results.flat();
  }

  /**
   * Recherche tous les fichiers :
   *
   * NOM_APPLICATION.yyyy-MM-dd-0.log
   * NOM_APPLICATION.yyyy-MM-dd-1.log
   * NOM_APPLICATION.yyyy-MM-dd-2.log
   * ...
   */
  private async findLogFiles(
    directoryHandle: FileSystemDirectoryHandle,
    application: string,
    date: string,
  ): Promise<FileSystemFileHandle[]> {
    const prefix = `${application}.${date}-`;

    const files: FileSystemFileHandle[] = [];

    for await (const entry of directoryHandle.values()) {
      if (entry.kind !== 'file') {
        continue;
      }

      if (!entry.name.startsWith(prefix)) {
        continue;
      }

      if (!entry.name.endsWith('.log')) {
        continue;
      }

      const fileHandle = entry as FileSystemFileHandle;

      files.push(fileHandle);
    }

    files.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, {
        numeric: true,
      }),
    );

    return files;
  }

  /**
   * Lecture d'un fichier.
   */
  private async readLogFile(
    fileHandle: FileSystemFileHandle,
    source: LogSource,
    application: string,
    options: ReadLogsOptions,
  ): Promise<LogEntry[]> {
    const file = await fileHandle.getFile();

    const text = await file.text();

    const lines = text.split(/\r?\n/);

    const entries: LogEntry[] = [];
    let currentLines: string[] = [];

    for (const line of lines) {
      if (this.isLogStart(line)) {
        // On termine l'entrée précédente
        if (currentLines.length > 0) {
          const entry = this.parseLogBlock(currentLines, source, application);

          if (entry && this.isInsideTimeRange(entry.timestamp, options)) {
            entries.push(entry);
          }
        }

        // Nouvelle entrée
        currentLines = [line];
      } else if (currentLines.length > 0) {
        // Suite du message : stacktrace, lignes SQL, etc.
        currentLines.push(line);
      }
    }

    // Dernière entrée
    if (currentLines.length > 0) {
      const entry = this.parseLogBlock(currentLines, source, application);

      if (entry && this.isInsideTimeRange(entry.timestamp, options)) {
        entries.push(entry);
      }
    }

    return entries;
  }

  private isInsideTimeRange(
    timestamp: Date,
    options: {
      startTime?: string;
      endTime?: string;
    },
  ): boolean {
    const hours = timestamp.getHours();
    const minutes = timestamp.getMinutes();

    const timeInMinutes = hours * 60 + minutes;

    if (options.startTime) {
      const [startHours, startMinutes] = options.startTime.split(':').map(Number);

      const startInMinutes = startHours * 60 + startMinutes;

      if (timeInMinutes < startInMinutes) {
        return false;
      }
    }

    if (options.endTime) {
      const [endHours, endMinutes] = options.endTime.split(':').map(Number);

      const endInMinutes = endHours * 60 + endMinutes;

      if (timeInMinutes > endInMinutes) {
        return false;
      }
    }

    return true;
  }

  private isLogStart(line: string): boolean {
    return /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:[.,]\d{1,3})?\|/.test(line);
  }

  private parseLogBlock(lines: string[], source: LogSource, application: string): LogEntry | null {
    if (lines.length === 0) {
      return null;
    }

    const firstLine = lines[0];

    const match = firstLine.match(
      /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2}(?:[.,]\d{1,3})?)\|(TRACE|DEBUG|INFO|WARN|ERROR|FATAL)\|(.+)$/i,
    );

    if (!match) {
      return null;
    }

    const [, date, time, level, rest] = match;

    const timestamp = new Date(`${date}T${time.replace(',', '.')}`);

    if (Number.isNaN(timestamp.getTime())) {
      return null;
    }

    const fields = rest.split('|');

    const applicationIndex = fields.indexOf(application);

    if (applicationIndex === -1) {
      return null;
    }

    if (fields.length <= applicationIndex + 2) {
      return null;
    }

    // Message de la première ligne
    const firstMessage = fields
      .slice(applicationIndex + 2)
      .join('|')
      .trim();

    // Toutes les lignes suivantes sont la continuation
    const continuation = lines.slice(1).join('\n');

    const message = continuation ? `${firstMessage}\n${continuation}` : firstMessage;

    return {
      sourceId: source.id,
      sourceName: source.name,
      application,
      timestamp,
      level: this.normalizeLevel(level),
      message,
      raw: lines.join('\n'),
    };
  }

  private normalizeLevel(level: string): LogLevel {
    const normalized = level.toUpperCase();

    switch (normalized) {
      case 'TRACE':
      case 'DEBUG':
      case 'INFO':
      case 'WARN':
      case 'ERROR':
      case 'FATAL':
        return normalized;

      default:
        return 'UNKNOWN';
    }
  }
}
