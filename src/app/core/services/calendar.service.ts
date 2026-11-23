import { inject, Injectable } from '@angular/core';

import { EventColor, ProjectEvent } from '../models/event.model';
import { Priority, Task, TaskStatus } from '../models/task.model';
import { taskGroup } from '../models/task-state';
import { GanttService } from './gantt.service';

export type CalendarView = 'month' | 'week' | 'day';

interface BaseCalendarEvent {
  key: string;
  title: string;
  /** Date au format YYYY-MM-DD. */
  date: string;
  done: boolean;
  overdue: boolean;
  assignee?: string;
}

/** Échéance d'une tâche ou d'une de ses sous-tâches. */
export interface TaskCalendarEvent extends BaseCalendarEvent {
  kind: 'task' | 'subtask';
  task: Task;
  subtaskId?: string;
  priority: Priority;
  status: TaskStatus;
}

/** Évènement du calendrier (réunion, jalon…). */
export interface ProjectCalendarEvent extends BaseCalendarEvent {
  kind: 'event';
  projectEvent: ProjectEvent;
  color: EventColor;
  /** « 14:00 » ou « 14:00 – 15:30 » ; absent pour un évènement sur toute la journée. */
  time?: string;
}

/** Créneau de travail prévu sur une tâche (« Prise en charge » posée par le plan du jour). */
export interface WorkCalendarEvent extends BaseCalendarEvent {
  kind: 'work';
  task: Task;
  priority: Priority;
  status: TaskStatus;
  color: EventColor;
  startTime?: string;
  endTime?: string;
  /** « 09:00 – 11:00 » ; absent pour une prise en charge sur toute la journée. */
  time?: string;
}

export type CalendarEvent = TaskCalendarEvent | ProjectCalendarEvent | WorkCalendarEvent;

/** Élément qui occupe un créneau horaire dans la grille. */
export type TimedCalendarEvent = ProjectCalendarEvent | WorkCalendarEvent;

/** Évènement placé dans la grille horaire d'une journée ; top/height en % de la journée. */
export interface TimedSlot {
  event: TimedCalendarEvent;
  top: number;
  height: number;
  /** Colonne parmi les évènements qui se chevauchent, de 0 à `lanes - 1`. */
  lane: number;
  lanes: number;
}

export interface CalendarDay {
  iso: string;
  date: Date;
  day: number;
  inMonth: boolean;
  weekend: boolean;
  today: boolean;
  events: CalendarEvent[];
}

const DAY_MINUTES = 24 * 60;
/** Durée supposée d'un évènement qui n'a qu'une heure de début. */
const DEFAULT_DURATION = 60;
/** Hauteur minimale affichée, pour qu'un évènement très court reste cliquable. */
const MIN_DURATION = 30;

const PRIORITY_RANK: Record<Priority, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

@Injectable({
  providedIn: 'root',
})
export class CalendarService {
  private gantt = inject(GanttService);

  /**
   * Éléments du calendrier : échéances des tâches non archivées et de leurs sous-tâches datées,
   * puis évènements du projet.
   */
  events(tasks: Task[], today = new Date(), projectEvents: ProjectEvent[] = []): CalendarEvent[] {
    const todayIso = this.gantt.toIso(today);
    const events: CalendarEvent[] = [];

    const push = (event: Omit<TaskCalendarEvent, 'overdue'>) =>
      events.push({ ...event, overdue: !event.done && event.date < todayIso });

    for (const task of tasks) {
      if (taskGroup(task) === 'archived') {
        continue;
      }
      const common = {
        task,
        priority: task.priority,
        status: task.status,
        assignee: task.assignedTo,
      };

      const due = this.gantt.parseDay(task.dueDate);
      if (due) {
        push({
          ...common,
          key: task.id,
          kind: 'task',
          title: task.title,
          date: this.gantt.toIso(due),
          done: task.status === 'DONE',
        });
      }

      for (const item of task.checklist ?? []) {
        const itemDue = this.gantt.parseDay(item.dueDate);
        if (itemDue) {
          push({
            ...common,
            assignee: item.assignedTo ?? task.assignedTo,
            key: `${task.id}:${item.id}`,
            kind: 'subtask',
            subtaskId: item.id,
            title: item.label,
            date: this.gantt.toIso(itemDue),
            done: item.completed || task.status === 'DONE',
          });
        }
      }
    }

    // Créneaux enregistrés par partie ou par morceau (tâche scindée, ou coupée par une pause).
    for (const task of tasks) {
      if (taskGroup(task) === 'archived' || !task.workSlots?.length) {
        continue;
      }
      for (const slot of task.workSlots) {
        const date = this.gantt.parseDay(slot.date);
        if (!date) {
          continue;
        }
        const sameGroup = task.workSlots.filter((other) => other.part === slot.part);
        const index = sameGroup.indexOf(slot) + 1;
        let suffix = '';
        if (slot.part > 0) {
          const total =
            task.split?.length ?? Math.max(...task.workSlots.map((other) => other.part));
          suffix = ` (${slot.part}/${total})${index > 1 ? ' · suite' : ''}`;
        } else if (sameGroup.length > 1) {
          suffix = ` (${index}/${sameGroup.length})`;
        }
        const span = { startTime: slot.start, endTime: slot.end };
        events.push({
          key: `work:${task.id}:${slot.part}:${index}`,
          kind: 'work',
          title: task.title + suffix,
          date: this.gantt.toIso(date),
          done: task.status === 'DONE',
          overdue: false,
          assignee: task.assignedTo,
          task,
          priority: task.priority,
          status: task.status,
          color: 'violet',
          ...span,
          time: this.timeLabel(span),
        });
      }
    }

    for (const task of tasks) {
      if (taskGroup(task) === 'archived' || !task.workStart || task.workSlots?.length) {
        continue;
      }
      const from = this.gantt.parseDay(task.workStart);
      const to = this.gantt.parseDay(task.workEnd ?? task.workStart) ?? from;
      if (!from || !to) {
        continue;
      }
      const span = { startTime: task.workStartTime, endTime: task.workEndTime };
      // Une période est répétée chaque jour ouvré (une journée unique est gardée même un week-end), dans la limite de 31 jours.
      const single = from.getTime() === to.getTime();
      for (let day = from, count = 0; day <= to && count < 31; day = this.gantt.addDays(day, 1)) {
        if (!single && (day.getDay() === 0 || day.getDay() === 6)) {
          continue;
        }
        count++;
        events.push({
          key: `work:${task.id}:${this.gantt.toIso(day)}`,
          kind: 'work',
          title: task.title,
          date: this.gantt.toIso(day),
          done: task.status === 'DONE',
          overdue: false,
          assignee: task.assignedTo,
          task,
          priority: task.priority,
          status: task.status,
          color: 'violet',
          ...span,
          time: this.timeLabel(span),
        });
      }
    }

    for (const event of projectEvents) {
      const date = this.gantt.parseDay(event.date);
      if (date) {
        events.push({
          key: `event:${event.id}`,
          kind: 'event',
          title: event.title || 'Sans titre',
          date: this.gantt.toIso(date),
          done: false,
          overdue: false,
          projectEvent: event,
          color: event.color,
          time: this.timeLabel(event),
        });
      }
    }
    return events;
  }

  /** Vrai pour un évènement qui a une heure ; tâches et évènements sans heure durent toute la journée. */
  isTimed(event: CalendarEvent): event is TimedCalendarEvent {
    return this.startOf(event) !== undefined;
  }

  /** Heure de début d'un évènement ou d'un créneau de travail. */
  private startOf(event: CalendarEvent): string | undefined {
    if (event.kind === 'event') {
      return event.projectEvent.startTime || undefined;
    }
    return event.kind === 'work' ? event.startTime || undefined : undefined;
  }

  private endOf(event: TimedCalendarEvent): string | undefined {
    return event.kind === 'event' ? event.projectEvent.endTime : event.endTime;
  }

  /**
   * Place les évènements horaires d'une journée. Ceux qui se chevauchent sont mis côte à côte,
   * chacun sur sa colonne ; une fin absente vaut 1 h et une fin avant le début court jusqu'à minuit.
   */
  layoutTimed(events: TimedCalendarEvent[]): TimedSlot[] {
    const items = events.map((event) => {
      const start = Math.min(this.minutes(this.startOf(event)), DAY_MINUTES - MIN_DURATION);
      const endTime = this.endOf(event);
      const rawEnd = endTime ? this.minutes(endTime) : start + DEFAULT_DURATION;
      const end = rawEnd < start ? DAY_MINUTES : rawEnd;
      return { event, start, end: Math.min(Math.max(end, start + MIN_DURATION), DAY_MINUTES) };
    });

    return this.assignLanes(items).map(({ item, lane, lanes }) => ({
      event: item.event,
      top: (item.start / DAY_MINUTES) * 100,
      height: ((item.end - item.start) / DAY_MINUTES) * 100,
      lane,
      lanes,
    }));
  }

  /**
   * Répartit des intervalles (en minutes) sur des colonnes : ceux qui se chevauchent sont côte à côte,
   * une colonne libérée est réutilisée, et deux groupes distincts ne se partagent pas leur largeur.
   * L'ordre du résultat est celui des débuts.
   */
  assignLanes<T extends { start: number; end: number }>(
    items: T[],
  ): { item: T; lane: number; lanes: number }[] {
    const sorted = [...items].sort((a, b) => a.start - b.start || a.end - b.end);
    const result: { item: T; lane: number; lanes: number }[] = [];
    let cluster: typeof result = [];
    let laneEnds: number[] = [];
    let clusterEnd = 0;

    const close = () => {
      cluster.forEach((entry) => (entry.lanes = laneEnds.length));
      result.push(...cluster);
      cluster = [];
      laneEnds = [];
    };

    for (const item of sorted) {
      if (cluster.length && item.start >= clusterEnd) {
        close();
      }
      let lane = laneEnds.findIndex((end) => end <= item.start);
      if (lane === -1) {
        lane = laneEnds.length;
      }
      laneEnds[lane] = item.end;
      clusterEnd = cluster.length ? Math.max(clusterEnd, item.end) : item.end;
      cluster.push({ item, lane, lanes: 1 });
    }
    close();
    return result;
  }

  /** Heures lisibles d'un évènement, ou `undefined` s'il dure toute la journée. */
  timeLabel(event: Pick<ProjectEvent, 'startTime' | 'endTime'>): string | undefined {
    if (!event.startTime) {
      return undefined;
    }
    return event.endTime && event.endTime !== event.startTime
      ? `${event.startTime} – ${event.endTime}`
      : event.startTime;
  }

  /**
   * Regroupe par jour. Dans un jour : les évènements d'abord (toute la journée, puis par heure),
   * puis les tâches à faire par priorité, puis les terminées.
   */
  byDay(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      map.set(event.date, [...(map.get(event.date) ?? []), event]);
    }
    for (const list of map.values()) {
      list.sort((a, b) => this.compare(a, b));
    }
    return map;
  }

  private compare(a: CalendarEvent, b: CalendarEvent): number {
    const scheduled = (e: CalendarEvent) => e.kind === 'event' || e.kind === 'work';
    if (scheduled(a) || scheduled(b)) {
      if (!scheduled(a)) return 1;
      if (!scheduled(b)) return -1;
      return (
        (this.startOf(a) ?? '').localeCompare(this.startOf(b) ?? '') ||
        a.title.localeCompare(b.title, 'fr')
      );
    }
    return (
      Number(a.done) - Number(b.done) ||
      PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
      a.title.localeCompare(b.title, 'fr')
    );
  }

  /** Semaines (lundi → dimanche) couvrant le mois de `cursor`. */
  monthWeeks(
    cursor: Date,
    byDay: Map<string, CalendarEvent[]>,
    today = new Date(),
  ): CalendarDay[][] {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const start = this.gantt.startOfWeek(first);
    const weekCount = Math.ceil((this.gantt.diffDays(start, last) + 1) / 7);

    return Array.from({ length: weekCount }, (_, w) =>
      this.days(this.gantt.addDays(start, w * 7), 7, cursor.getMonth(), byDay, today),
    );
  }

  /** Les 7 jours de la semaine de `cursor`. */
  weekDays(cursor: Date, byDay: Map<string, CalendarEvent[]>, today = new Date()): CalendarDay[] {
    return this.days(this.gantt.startOfWeek(cursor), 7, cursor.getMonth(), byDay, today);
  }

  /** Le jour de `cursor`, en une seule colonne (vue jour). */
  dayColumn(cursor: Date, byDay: Map<string, CalendarEvent[]>, today = new Date()): CalendarDay[] {
    return this.days(cursor, 1, cursor.getMonth(), byDay, today);
  }

  /** Date de départ après un déplacement d'un mois, d'une semaine ou d'un jour. */
  shift(cursor: Date, view: CalendarView, direction: -1 | 1): Date {
    if (view === 'month') {
      return new Date(cursor.getFullYear(), cursor.getMonth() + direction, 1);
    }
    return this.gantt.addDays(cursor, (view === 'week' ? 7 : 1) * direction);
  }

  title(cursor: Date, view: CalendarView): string {
    if (view === 'month') {
      return cursor.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    }
    if (view === 'day') {
      return cursor.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    }
    const start = this.gantt.startOfWeek(cursor);
    const end = this.gantt.addDays(start, 6);
    const day = (d: Date, month: boolean) =>
      d.toLocaleDateString(
        'fr-FR',
        month ? { day: 'numeric', month: 'short' } : { day: 'numeric' },
      );
    const sameMonth = start.getMonth() === end.getMonth();
    return `${day(start, !sameMonth)} – ${day(end, true)} ${end.getFullYear()}`;
  }

  private days(
    start: Date,
    count: number,
    month: number,
    byDay: Map<string, CalendarEvent[]>,
    today: Date,
  ): CalendarDay[] {
    const todayIso = this.gantt.toIso(today);
    return Array.from({ length: count }, (_, i) => {
      const date = this.gantt.addDays(start, i);
      const iso = this.gantt.toIso(date);
      return {
        iso,
        date,
        day: date.getDate(),
        inMonth: date.getMonth() === month,
        weekend: date.getDay() === 0 || date.getDay() === 6,
        today: iso === todayIso,
        events: byDay.get(iso) ?? [],
      };
    });
  }

  /** « 14:30 » en minutes depuis minuit. */
  private minutes(time?: string): number {
    const [h, m] = (time ?? '00:00').split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }
}
