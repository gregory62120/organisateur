import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';

import { TaskStatus } from '../../core/models/task.model';
import {
  avatarColor,
  formatDueDate,
  initials,
  PRIORITY_LABELS,
  STATUS_LABELS,
  STATUSES,
} from '../../core/models/task-labels';
import { uniqueAssignees } from '../../core/models/task-state';
import { EventService } from '../../core/services/event.service';
import {
  CalendarDay,
  CalendarEvent,
  CalendarService,
  CalendarView,
  TimedSlot,
} from '../../core/services/calendar.service';
import { GanttService } from '../../core/services/gantt.service';
import { StorageService } from '../../core/services/storage.service';
import { TaskService } from '../../core/services/task.service';
import { TaskDialogService } from '../kanban/services/task-dialog.service';
import { EventDialogService } from './services/event-dialog.service';

/** Nombre d'échéances affichées par jour dans la vue mois avant « +N autres ». */
const MONTH_LIMIT = 3;

/** Hauteur (px) d'une heure dans la grille de la vue semaine. */
const HOUR_PX = 48;

/** Heure à laquelle la grille est positionnée à l'ouverture, si aucun évènement n'est plus tôt. */
const FIRST_VISIBLE_HOUR = 7;

/** Pas (minutes) du créneau choisi par un double-clic dans la grille. */
const SLOT_STEP = 30;

export interface WeekColumn {
  day: CalendarDay;
  /** Tâches et évènements sans heure : valables toute la journée. */
  allDay: CalendarEvent[];
  timed: TimedSlot[];
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [NgTemplateOutlet],
  templateUrl: './calendar.html',
  styleUrl: './calendar.scss',
})
export class CalendarComponent {
  private calendar = inject(CalendarService);

  private gantt = inject(GanttService);

  private dialogs = inject(TaskDialogService);

  private taskService = inject(TaskService);

  private eventService = inject(EventService);

  private eventDialogs = inject(EventDialogService);

  storage = inject(StorageService);

  readonly weekdays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  readonly statuses = STATUSES;

  readonly statusLabels = STATUS_LABELS;

  readonly priorityLabels = PRIORITY_LABELS;

  readonly initials = initials;

  readonly avatarColor = avatarColor;

  readonly formatDate = formatDueDate;

  readonly view = signal<CalendarView>('month');

  /** Un jour du mois ou de la semaine affichés. */
  readonly cursor = signal(this.startOfToday());

  readonly selected = signal(this.gantt.toIso(this.startOfToday()));

  readonly statusFilter = signal<TaskStatus | ''>('');

  readonly assigneeFilter = signal('');

  readonly hideDone = signal(false);

  readonly assignees = computed(() => uniqueAssignees(this.taskService.tasksSignal()));

  /** Les filtres (statut, responsable, terminées) ne concernent que les tâches ; les évènements restent affichés. */
  private readonly events = computed(() =>
    this.calendar
      .events(this.taskService.tasksSignal(), new Date(), this.eventService.eventsSignal())
      .filter(
        (e) =>
          e.kind === 'event' ||
          ((!this.statusFilter() || e.status === this.statusFilter()) &&
            (!this.assigneeFilter() || e.assignee === this.assigneeFilter()) &&
            !(this.hideDone() && e.done)),
      ),
  );

  private readonly byDay = computed(() => this.calendar.byDay(this.events()));

  readonly title = computed(() => this.calendar.title(this.cursor(), this.view()));

  readonly weeks = computed(() =>
    this.view() === 'month'
      ? this.calendar.monthWeeks(this.cursor(), this.byDay())
      : [this.calendar.weekDays(this.cursor(), this.byDay())],
  );

  readonly hours = Array.from({ length: 24 }, (_, hour) => hour);

  readonly hourPx = HOUR_PX;

  /** Vue semaine : une colonne par jour, avec la bande « toute la journée » et les créneaux horaires. */
  readonly weekColumns = computed<WeekColumn[]>(() =>
    this.view() === 'week'
      ? this.weeks()[0].map((day) => ({
          day,
          allDay: day.events.filter((e) => !this.calendar.isTimed(e)),
          timed: this.calendar.layoutTimed(day.events.filter((e) => this.calendar.isTimed(e))),
        }))
      : [],
  );

  private readonly now = signal(new Date());

  /** Position (en % de la journée) du trait « maintenant ». */
  readonly nowPercent = computed(
    () => ((this.now().getHours() * 60 + this.now().getMinutes()) / (24 * 60)) * 100,
  );

  private readonly gridBody = viewChild<ElementRef<HTMLElement>>('gridBody');

  readonly limit = computed(() => (this.view() === 'month' ? MONTH_LIMIT : Infinity));

  readonly selectedDate = computed(() => this.gantt.parseDay(this.selected()) as Date);

  readonly selectedEvents = computed(() => this.byDay().get(this.selected()) ?? []);

  readonly overdueCount = computed(() => this.events().filter((e) => e.overdue).length);

  readonly weekCount = computed(() => {
    const start = this.gantt.startOfWeek(this.startOfToday());
    const [from, to] = [this.gantt.toIso(start), this.gantt.toIso(this.gantt.addDays(start, 6))];
    return this.events().filter((e) => !e.done && e.date >= from && e.date <= to).length;
  });

  readonly monthCount = computed(() => {
    const today = this.startOfToday();
    const prefix = this.gantt.toIso(today).slice(0, 7);
    return this.events().filter((e) => !e.done && e.date.startsWith(prefix)).length;
  });

  /** Les prochaines échéances à faire, à partir d'aujourd'hui. */
  readonly upcoming = computed(() => {
    const today = this.gantt.toIso(this.startOfToday());
    return this.events()
      .filter((e) => !e.done && e.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title, 'fr'))
      .slice(0, 6);
  });

  readonly hasFilter = computed(
    () => !!(this.statusFilter() || this.assigneeFilter() || this.hideDone()),
  );

  constructor() {
    const timer = setInterval(() => this.now.set(new Date()), 60_000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));

    // La grille s'ouvre sur la matinée, ou sur le premier évènement de la semaine s'il est plus tôt.
    effect(() => {
      const body = this.gridBody();
      if (body) {
        untracked(() => setTimeout(() => (body.nativeElement.scrollTop = this.firstHourPx())));
      }
    });
  }

  move(direction: -1 | 1) {
    this.cursor.set(this.calendar.shift(this.cursor(), this.view(), direction));
  }

  goToday() {
    const today = this.startOfToday();
    this.cursor.set(today);
    this.selected.set(this.gantt.toIso(today));
  }

  setView(view: CalendarView) {
    this.view.set(view);
  }

  select(iso: string) {
    this.selected.set(iso);
  }

  open(event: CalendarEvent, domEvent?: Event) {
    domEvent?.stopPropagation();
    if (event.kind === 'event') {
      this.eventDialogs.edit(event.projectEvent);
    } else if (event.kind === 'subtask' && event.subtaskId) {
      this.dialogs.openSubtask(event.task, event.subtaskId);
    } else {
      this.dialogs.openTask(event.task);
    }
  }

  /** Crée un évènement sur toute la journée, par défaut le jour sélectionné. */
  addEvent(iso = this.selected(), startTime?: string) {
    this.selected.set(iso);
    this.eventDialogs.create(iso, startTime);
  }

  /** Crée un évènement sans horaire, valable toute la journée (bande « Journée » de la vue semaine). */
  addAllDayEvent(iso: string) {
    this.selected.set(iso);
    this.eventDialogs.create(iso, undefined, true);
  }

  /** Double-clic dans la grille horaire : crée un évènement au créneau de 30 min cliqué. */
  addEventAt(iso: string, domEvent: MouseEvent) {
    const column = domEvent.currentTarget as HTMLElement;
    const y = domEvent.clientY - column.getBoundingClientRect().top;
    const minutes = Math.floor(((y / HOUR_PX) * 60) / SLOT_STEP) * SLOT_STEP;
    const clamped = Math.min(Math.max(minutes, 0), 24 * 60 - SLOT_STEP);
    const time = `${String(Math.floor(clamped / 60)).padStart(2, '0')}:${String(clamped % 60).padStart(2, '0')}`;
    this.addEvent(iso, time);
  }

  /** Défilement initial : 7 h, ou une heure avant le premier évènement de la semaine s'il est plus tôt. */
  private firstHourPx(): number {
    const earliest = this.weekColumns()
      .flatMap((c) => c.timed)
      .reduce((min, slot) => Math.min(min, Math.floor((slot.top / 100) * 24)), Infinity);
    return (
      (earliest < FIRST_VISIBLE_HOUR ? Math.max(earliest - 1, 0) : FIRST_VISIBLE_HOUR) * HOUR_PX
    );
  }

  /** Icône d'une puce : état d'abord (terminée, en retard), puis nature de l'élément. */
  chipIcon(event: CalendarEvent): string {
    if (event.done) return 'check_circle';
    if (event.overdue) return 'error';
    if (event.kind === 'event') return event.time ? 'schedule' : 'event';
    return event.kind === 'subtask' ? 'subdirectory_arrow_right' : 'flag';
  }

  /** Date relative lisible : « Aujourd'hui », « Demain », sinon « 15 oct. ». */
  relativeDay(iso: string): string {
    const diff = this.gantt.diffDays(this.startOfToday(), this.gantt.parseDay(iso) as Date);
    if (diff === 0) return "Aujourd'hui";
    if (diff === 1) return 'Demain';
    return (this.gantt.parseDay(iso) as Date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    });
  }

  resetFilters() {
    this.statusFilter.set('');
    this.assigneeFilter.set('');
    this.hideDone.set(false);
  }

  async openProject() {
    try {
      await this.storage.openProject();
    } catch {
      // Sélection de dossier annulée par l'utilisateur.
    }
  }

  private startOfToday(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
}
