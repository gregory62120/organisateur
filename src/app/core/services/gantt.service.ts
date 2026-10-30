import { Injectable } from '@angular/core';

import { Task } from '../models/task.model';

export type GanttScale = 'day' | 'week' | 'month';

/** Largeur d'un jour en pixels pour chaque échelle. */
export const DAY_WIDTHS: Record<GanttScale, number> = { day: 38, week: 16, month: 5 };

export const SCALE_LABELS: Record<GanttScale, string> = {
  day: 'Semaine',
  week: 'Mois',
  month: 'Trimestre',
};

export interface TaskSpan {
  start: Date;
  end: Date;
}

export interface GanttRange {
  start: Date;
  days: number;
}

export interface GanttTick {
  date: Date;
  /** Position horizontale en nombre de jours depuis le début de la plage. */
  offset: number;
  /** Largeur en nombre de jours. */
  span: number;
  label: string;
}

const MS_PER_DAY = 86_400_000;

@Injectable({
  providedIn: 'root',
})
export class GanttService {
  parseDay(value?: string): Date | null {
    if (!value) {
      return null;
    }
    const [y, m, d] = value.slice(0, 10).split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return isNaN(date.getTime()) || !y || !m || !d ? null : date;
  }

  toIso(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  addDays(date: Date, days: number): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
  }

  /** Nombre de jours entiers entre deux dates (robuste au changement d'heure). */
  diffDays(from: Date, to: Date): number {
    return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
  }

  startOfWeek(date: Date): Date {
    return this.addDays(date, -((date.getDay() + 6) % 7));
  }

  /**
   * Période couverte par une tâche (bornes incluses).
   * Une tâche avec une seule date occupe un jour ; sans aucune date, elle n'est pas planifiée.
   */
  span(task: Pick<Task, 'startDate' | 'dueDate'>): TaskSpan | null {
    const start = this.parseDay(task.startDate);
    const end = this.parseDay(task.dueDate);
    const first = start ?? end;
    const last = end ?? start;
    if (!first || !last) {
      return null;
    }
    return first <= last ? { start: first, end: last } : { start: last, end: first };
  }

  /** Plage affichée : englobe toutes les tâches et aujourd'hui, avec une marge, alignée sur le lundi. */
  range(tasks: Pick<Task, 'startDate' | 'dueDate'>[], today = new Date()): GanttRange {
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    let min = day;
    let max = day;
    for (const task of tasks) {
      const span = this.span(task);
      if (span) {
        min = span.start < min ? span.start : min;
        max = span.end > max ? span.end : max;
      }
    }
    const start = this.startOfWeek(this.addDays(min, -7));
    const end = this.addDays(max, 21);
    return { start, days: Math.max(this.diffDays(start, end) + 1, 42) };
  }

  /** Graduations de l'en-tête : une par jour, par semaine ou par mois selon l'échelle. */
  ticks(range: GanttRange, unit: 'day' | 'week' | 'month'): GanttTick[] {
    const ticks: GanttTick[] = [];
    const end = this.addDays(range.start, range.days);
    let cursor = range.start;

    while (cursor < end) {
      let next: Date;
      let label: string;

      if (unit === 'day') {
        next = this.addDays(cursor, 1);
        label = String(cursor.getDate());
      } else if (unit === 'week') {
        next = this.addDays(cursor, 7 - ((cursor.getDay() + 6) % 7));
        label = String(cursor.getDate());
      } else {
        next = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
        label = cursor.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      }

      const clipped = next > end ? end : next;
      ticks.push({
        date: cursor,
        offset: this.diffDays(range.start, cursor),
        span: this.diffDays(cursor, clipped),
        label,
      });
      cursor = next;
    }
    return ticks;
  }

  /** Avancement : ratio de la checklist si elle existe, sinon 100 % pour une tâche terminée. */
  progress(task: Pick<Task, 'checklist' | 'status'>): number {
    if (task.status === 'DONE') {
      return 100;
    }
    if (task.checklist.length) {
      return Math.round(
        (task.checklist.filter((item) => item.completed).length / task.checklist.length) * 100,
      );
    }
    return 0;
  }
}
