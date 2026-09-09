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
      files.map((file) => this.readLogFile(file, source, application, options)),
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

    const content = await file.text();

    const lines = content.split(/\r?\n/);

    const entries: LogEntry[] = [];

    for (const line of lines) {
      if (!line.trim()) {
        continue;
      }

      const entry = this.parseLine(line, source, application);

      if (!entry) {
        continue;
      }

      if (
        !this.isInsideTimeRange(entry.timestamp, options.date, options.startTime, options.endTime)
      ) {
        continue;
      }

      entries.push(entry);
    }

    return entries;
  }

  /**
   * Parse une ligne de log.
   *
   * Exemple attendu :
   *
   * 2026-09-09 10:15:32.123 INFO Message...
   *
   * ou :
   *
   * 2026-09-09T10:15:32.123 ERROR Message...
   */
  private parseLine(line: string, source: LogSource, application: string): LogEntry | null {
    const match = line.match(
      /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2}(?:[.,]\d{1,3})?)(?:\s+)(TRACE|DEBUG|INFO|WARN|ERROR|FATAL)(?:\s+)(.*)$/i,
    );

    if (!match) {
      return null;
    }

    const date = match[1];
    const time = match[2].replace(',', '.');
    const level = match[3].toUpperCase() as LogLevel;
    const message = match[4];

    const timestamp = new Date(`${date}T${time}`);

    if (Number.isNaN(timestamp.getTime())) {
      return null;
    }

    return {
      sourceId: source.id,
      sourceName: source.name,
      application,
      timestamp,
      level,
      message,
      raw: line,
    };
  }

  /**
   * Vérifie que le log est compris dans
   * l'intervalle sélectionné.
   */
  private isInsideTimeRange(
    timestamp: Date,
    date: string,
    startTime: string,
    endTime: string,
  ): boolean {
    const timestampDate = this.formatDate(timestamp);

    if (timestampDate !== date) {
      return false;
    }

    const time = this.formatTime(timestamp);

    return time >= startTime && time <= endTime;
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();

    const month = String(date.getMonth() + 1).padStart(2, '0');

    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private formatTime(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0');

    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${hours}:${minutes}`;
  }
}
